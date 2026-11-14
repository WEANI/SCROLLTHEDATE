/**
 * Prix partagés serveur ↔ navigateur.
 *
 * Commande "sur un modèle" (Red Door…) — prix fixe, aucune option add-on,
 * cf. échange du 12/09/2026. Source unique depuis le 14/11/2026 : était
 * dupliqué dans api/ordersRouter.ts et src/components/commerce/pricing.ts.
 */
export const TEMPLATE_PRICE_CENTS = 9900

/** Prix affichés dans les titres et descriptions Google ({std}, {fp}, {modele} dans les textes SEO). */
export type SeoPrices = { std: number; fp: number; modele: number }

function euros(cents: number, lang: 'fr' | 'en'): string {
  const n = cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2)
  return lang === 'fr' ? `${n.replace('.', ',')} €` : `€${n}`
}

/**
 * Remplace {std} (Save the Date sur mesure), {fp} (faire-part) et {modele}
 * (Save the Date sur modèle) par les prix réels — réglés dans l'admin
 * (Réglages → Produits & prix) pour les deux premiers. Ainsi un changement
 * de prix se répercute seul dans ce que Google affiche.
 */
export function fillPrices(text: string, prices: SeoPrices, lang: 'fr' | 'en' = 'fr'): string {
  return text
    .replace(/\{std\}/g, euros(prices.std, lang))
    .replace(/\{fp\}/g, euros(prices.fp, lang))
    .replace(/\{modele\}/g, euros(prices.modele, lang))
}
