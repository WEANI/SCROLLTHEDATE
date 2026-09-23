import type { Context } from "hono";
import type Stripe from "stripe";
import { stripe, isStripeConfigured } from "../lib/stripe";
import { env } from "../lib/env";
import {
  findOrderByStripeRef,
  findUserById,
  getSiteSetting,
  updateOrderPaymentStatus,
} from "../queries/orders";
import {
  updateProjectStatus,
  updateProjectPalette,
  updateProjectHeroChapters,
  updateProjectHeroCustomCards,
} from "../queries/projects";
import { addVideoVersion } from "../queries/domain";
import { upsertQuestionnaire, markQuestionnaireSubmitted } from "../queries/questionnaire";
import { logAudit, notifyUser } from "../queries/helpers";
import { sendEmail } from "../lib/email";
import { orderConfirmationEmail } from "../lib/emailTemplates";
import { provisionAccountForGuest } from "../lib/guestAccount";
import {
  getSaveTheDateTemplate,
  buildFulfillmentData,
  parseTemplateOverrides,
} from "../../contracts/saveTheDateTemplates";

/** Même format que formatOrderNumber côté client (src/components/commerce/pricing.ts) — dupliqué à dessein, ce fichier reste pur frontend. */
function formatOrderNumber(orderId: number, date: Date): string {
  return `FL-${date.getFullYear()}-${String(orderId).padStart(4, "0")}`;
}

/** Libellé produit pour l'email de confirmation — toujours en français (email transactionnel, pas de i18n ici, cf. le reste de emailTemplates.ts). */
const PRODUCT_LABEL: Record<string, string> = {
  FAIRE_PART: "Faire-part digital",
  SAVE_THE_DATE: "Save the Date digital",
};

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
      // Une commande = un paiement, quel que soit le nombre de produits
      // achetés ensemble (panier, cf. échange du 23/09/2026) — `order.projects`
      // porte déjà TOUTES les lignes de ce panier, un paiement à un seul
      // produit restant le cas particulier "un seul projet".
      const order = await findOrderByStripeRef(pi.id);
      if (!order) {
        console.warn(`[stripe webhook] payment_intent.succeeded (${pi.id}) sans commande correspondante`);
        break;
      }
      if (order.paymentStatus === "paid") break; // déjà traitée — idempotence

      await updateOrderPaymentStatus(order.id, "paid");

      const user = await findUserById(order.userId);
      // Checkout invité : le compte n'est créé qu'ici, une fois le paiement
      // réellement encaissé. `setPasswordUrl` est null pour un client déjà
      // connecté au moment de la commande. Résolu UNE fois pour toute la
      // commande (pas par projet), pour ne jamais régénérer plusieurs liens
      // "choisir mon mot de passe" pour la même personne.
      const setPasswordUrl = user?.email ? await provisionAccountForGuest(user) : null;

      const emailItems: { label: string; amountCents: number; publicUrl?: string }[] = [];

      for (const project of order.projects) {
        await logAudit(project.id, "system", "order.paid", {
          orderId: order.id,
          amountCents: project.amountCents,
          stripePaymentIntentId: pi.id,
        });
        await notifyUser(order.userId, "order.confirmed", {
          orderId: order.id,
          projectId: project.id,
        });

        // Commande "sur un modèle" (cf. contracts/saveTheDateTemplates.ts) :
        // livraison instantanée ICI, au paiement confirmé — jamais avant
        // (cf. échange du 12/09/2026, pour ne jamais exposer une page
        // "prête" pour un paiement abandonné). Un projet "sur mesure"
        // (`templateSlug` absent) n'entre jamais dans ce bloc, comportement
        // inchangé. Lu depuis LE PROJET lui-même — un même panier peut
        // mêler un produit "sur un modèle" et un produit sur-mesure, chacun
        // avec son propre `templateSlug` (ou aucun).
        let publicUrl: string | undefined;
        const templateSlug = project.templateSlug;
        if (templateSlug) {
          const template = getSaveTheDateTemplate(templateSlug);
          if (template) {
            const overrides = parseTemplateOverrides(await getSiteSetting<unknown>("saveTheDateTemplates"));
            const { palette, heroChapters, heroCustomCards, video } = buildFulfillmentData(template, overrides[template.slug]);
            await updateProjectPalette(project.id, palette as Record<string, string | boolean>);
            await updateProjectHeroChapters(project.id, heroChapters);
            // Blocs supplémentaires généralistes du modèle (cf. doc de
            // `extraCards`, contracts/saveTheDateTemplates.ts) — réutilise le
            // même mécanisme que les cartes libres du Studio, vide si le
            // modèle n'en a aucun de configuré (comportement inchangé).
            if (heroCustomCards.length > 0) await updateProjectHeroCustomCards(project.id, heroCustomCards);
            await upsertQuestionnaire(project.id, { "couple.prenoms": pi.metadata?.names ?? "" }, 100);
            await markQuestionnaireSubmitted(project.id);
            await addVideoVersion({
              projectId: project.id,
              version: 1,
              url: video.url,
              posterUrl: video.posterUrl,
              kind: "frames",
              frameBaseUrl: video.frameBaseUrl,
              frameCount: video.frameCount,
              frameFps: video.frameFps,
              watermark: false,
              status: "final",
            });
            // Statut en dernier : une fois palette/chapitres/vidéo/questionnaire
            // posés, pour qu'un visiteur qui rafraîchirait la page pendant ces
            // quelques requêtes ne tombe jamais sur un "DELIVERED" incomplet.
            await updateProjectStatus(project.id, "DELIVERED");
            await logAudit(project.id, "system", "template.delivered", { templateSlug });
            publicUrl = `${env.appUrl}/faire-part/${project.slug}`;
          } else {
            console.warn(`[stripe webhook] templateSlug "${templateSlug}" inconnu (projet ${project.id}) — projet non livré automatiquement`);
          }
        }

        emailItems.push({
          label: `${PRODUCT_LABEL[project.product]}${templateSlug ? " — Sur un modèle" : ""}`,
          amountCents: project.amountCents,
          publicUrl,
        });
      }

      // UN SEUL email pour toute la commande, listant chaque produit acheté
      // (cf. échange du 23/09/2026 — "1 seul mail").
      if (user?.email) {
        await sendEmail(
          orderConfirmationEmail({
            to: user.email,
            coupleNames: pi.metadata?.names ?? "",
            orderRef: formatOrderNumber(order.id, order.createdAt),
            amountCents: order.amountCents,
            items: emailItems,
            setPasswordUrl,
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
      for (const project of order.projects) {
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
