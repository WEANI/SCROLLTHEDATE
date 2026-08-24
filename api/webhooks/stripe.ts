import type { Context } from "hono";
import type Stripe from "stripe";
import { stripe, isStripeConfigured } from "../lib/stripe";
import { env } from "../lib/env";
import {
  findOrderByStripeRef,
  findUserById,
  updateOrderPaymentStatus,
} from "../queries/orders";
import { logAudit, notifyUser } from "../queries/helpers";
import { sendEmail } from "../lib/email";
import { orderConfirmationEmail } from "../lib/emailTemplates";

/** Même format que formatOrderNumber côté client (src/components/commerce/pricing.ts) — dupliqué à dessein, ce fichier reste pur frontend. */
function formatOrderNumber(orderId: number, date: Date): string {
  return `FL-${date.getFullYear()}-${String(orderId).padStart(4, "0")}`;
}

/**
 * Webhook Stripe (`POST /api/webhooks/stripe`, câblé en dur dans boot.ts —
 * une route Hono brute, pas une procédure tRPC : la vérification de
 * signature exige le corps BRUT de la requête, incompatible avec le parsing
 * JSON automatique de tRPC). C'est ICI, et nulle part ailleurs, que la
 * commande passe réellement "paid" — `orders.createCheckout` ne fait que
 * préparer le paiement (cf. ce fichier), jamais le confirmer.
 *
 * Idempotent : Stripe peut renvoyer le même événement plusieurs fois (retry
 * réseau, etc.) — `order.paymentStatus === "paid"` déjà vrai fait sortir
 * sans rien rejouer (email, audit) une seconde fois.
 */
export async function handleStripeWebhook(c: Context): Promise<Response> {
  if (!isStripeConfigured() || !stripe || !env.stripeWebhookSecret) {
    console.warn("[stripe webhook] reçu alors que Stripe n'est pas configuré côté serveur");
    return c.json({ error: "Stripe not configured" }, 503);
  }

  const signature = c.req.header("stripe-signature");
  if (!signature) {
    return c.json({ error: "Missing stripe-signature header" }, 400);
  }

  const rawBody = await c.req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.stripeWebhookSecret);
  } catch (err) {
    console.error("[stripe webhook] signature invalide:", err instanceof Error ? err.message : err);
    return c.json({ error: "Invalid signature" }, 400);
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const order = await findOrderByStripeRef(pi.id);
      if (!order) {
        console.warn(`[stripe webhook] payment_intent.succeeded (${pi.id}) sans commande correspondante`);
        break;
      }
      if (order.paymentStatus === "paid") break; // déjà traité — idempotence

      await updateOrderPaymentStatus(order.id, "paid");
      const project = order.projects.at(0);
      if (project) {
        await logAudit(project.id, "system", "order.paid", {
          orderId: order.id,
          amountCents: order.amountCents,
          stripePaymentIntentId: pi.id,
        });
        await notifyUser(order.userId, "order.confirmed", {
          orderId: order.id,
          projectId: project.id,
        });
      }

      const user = await findUserById(order.userId);
      if (user?.email) {
        await sendEmail(
          orderConfirmationEmail({
            to: user.email,
            coupleNames: pi.metadata?.names ?? "",
            orderRef: formatOrderNumber(order.id, order.createdAt),
            amountCents: order.amountCents,
          }),
        );
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const order = await findOrderByStripeRef(pi.id);
      if (!order) break;
      if (order.paymentStatus === "paid") break; // un succès a déjà été traité, ne pas régresser
      await updateOrderPaymentStatus(order.id, "failed");
      const project = order.projects.at(0);
      if (project) {
        await logAudit(project.id, "system", "order.payment_failed", {
          orderId: order.id,
          stripePaymentIntentId: pi.id,
          reason: pi.last_payment_error?.message ?? null,
        });
      }
      break;
    }

    default:
      // Autres événements Stripe non traités pour l'instant (remboursements,
      // litiges…) — ignorés sans erreur, Stripe attend un 2xx quel que soit
      // le type d'événement envoyé sur cet endpoint.
      break;
  }

  return c.json({ received: true });
}
