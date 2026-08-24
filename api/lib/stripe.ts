import Stripe from "stripe";
import { env } from "./env";

/**
 * Client Stripe (mode test tant que STRIPE_SECRET_KEY est une clé sk_test_).
 * Remplace l'ancienne simulation de paiement (`stripeRef: test_${nanoid()}`
 * posé directement sans jamais appeler Stripe, cf. ordersRouter.ts avant
 * cette intégration) par de vrais PaymentIntents.
 *
 * `stripe` est `null` tant que la clé n'est pas configurée — jamais
 * d'exception au chargement du module (romprait tout le serveur pour un
 * problème qui ne concerne que le paiement, cf. la même logique que
 * api/lib/email.ts). Les appelants doivent vérifier `isStripeConfigured()`
 * et renvoyer une erreur explicite au client si absent, PLUTÔT QUE de
 * simuler un paiement réussi.
 */
export const stripe = env.stripeSecretKey
  ? new Stripe(env.stripeSecretKey, { apiVersion: "2026-07-29.dahlia" })
  : null;

export function isStripeConfigured(): boolean {
  return stripe !== null;
}

/**
 * Avertissement unique au démarrage — même logique que
 * warnIfEmailMisconfigured (api/lib/email.ts) : signale l'anomalie en
 * production sans empêcher le serveur de démarrer.
 */
export function warnIfStripeMisconfigured(): void {
  if (isStripeConfigured()) return;
  if (env.isProduction) {
    console.warn(
      "[stripe] STRIPE_SECRET_KEY manquante en production : AUCUN paiement " +
        "ne peut être traité (createCheckout renverra une erreur explicite " +
        "aux clients plutôt que de simuler un paiement réussi).",
    );
  }
}
