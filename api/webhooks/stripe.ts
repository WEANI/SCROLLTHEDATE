import type { Context } from "hono";
import type Stripe from "stripe";
import { stripe, isStripeConfigured } from "../lib/stripe";
import { env } from "../lib/env";
import {
  findOrdersByStripeRef,
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
      // Pluriel à dessein : un paiement panier (plusieurs produits payés en
      // une fois, cf. api/ordersRouter.ts::createCheckout) associe plusieurs
      // `orders` à ce même PaymentIntent — un paiement à un seul produit
      // reste le cas particulier "tableau à un élément", traité par la même
      // boucle sans distinction.
      const paidOrders = await findOrdersByStripeRef(pi.id);
      if (paidOrders.length === 0) {
        console.warn(`[stripe webhook] payment_intent.succeeded (${pi.id}) sans commande correspondante`);
        break;
      }

      // Toutes les commandes d'un même paiement partagent le même acheteur
      // (résolu UNE fois dans createCheckout) — le compte invité n'est donc
      // provisionné qu'UNE fois ici aussi, pas par commande, pour ne jamais
      // régénérer plusieurs liens "choisir mon mot de passe" pour la même
      // personne.
      const user = await findUserById(paidOrders[0]!.userId);
      const setPasswordUrl = user?.email ? await provisionAccountForGuest(user) : null;

      for (const order of paidOrders) {
        if (order.paymentStatus === "paid") continue; // déjà traitée — idempotence

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

        // Commande "sur un modèle" (cf. contracts/saveTheDateTemplates.ts) :
        // livraison instantanée ICI, au paiement confirmé — jamais avant
        // (cf. échange du 12/09/2026, pour ne jamais exposer une page
        // "prête" pour un paiement abandonné). Une commande "sur mesure"
        // (`templateSlug` absent) n'entre jamais dans ce bloc, comportement
        // inchangé. Lu depuis LA COMMANDE elle-même (plus depuis
        // `pi.metadata.templateSlug`, devenu insuffisant dès qu'un même
        // paiement peut porter plusieurs commandes ayant chacune son propre
        // modèle — ou aucun).
        let publicUrl: string | undefined;
        const templateSlug = order.templateSlug;
        if (project && templateSlug) {
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
            console.warn(`[stripe webhook] templateSlug "${templateSlug}" inconnu (commande ${order.id}) — projet non livré automatiquement`);
          }
        }

        // Un email PAR commande (pas un récapitulatif combiné du panier) —
        // chaque commande a son propre produit/projet/espace de suivi,
        // limite connue acceptée pour ce chantier : un panier à 2 produits
        // envoie 2 emails de confirmation plutôt qu'un seul récap.
        if (user?.email) {
          await sendEmail(
            orderConfirmationEmail({
              to: user.email,
              coupleNames: pi.metadata?.names ?? "",
              orderRef: formatOrderNumber(order.id, order.createdAt),
              amountCents: order.amountCents,
              setPasswordUrl,
              publicUrl,
            }),
          );
        }
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const failedOrders = await findOrdersByStripeRef(pi.id);
      for (const order of failedOrders) {
        if (order.paymentStatus === "paid") continue; // un succès a déjà été traité, ne pas régresser
        await updateOrderPaymentStatus(order.id, "failed");
        const project = order.projects.at(0);
        if (project) {
          await logAudit(project.id, "system", "order.payment_failed", {
            orderId: order.id,
            stripePaymentIntentId: pi.id,
            reason: pi.last_payment_error?.message ?? null,
          });
        }
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
