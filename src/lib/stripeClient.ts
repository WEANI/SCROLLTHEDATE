import { loadStripe } from '@stripe/stripe-js'

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined

if (!publishableKey) {
  console.warn(
    '[stripe] VITE_STRIPE_PUBLISHABLE_KEY manquante — le paiement en ligne ne fonctionnera pas.',
  )
}

/** `loadStripe` retourne toujours la même promesse mise en cache — appeler ce module plusieurs fois ne recharge pas Stripe.js. Clé publique (pk_test_/pk_live_) : safe à exposer côté client, contrairement à la clé secrète (jamais dans ce bundle). */
export const stripePromise = publishableKey ? loadStripe(publishableKey) : null
