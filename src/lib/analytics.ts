/**
 * Mesure d'audience — Plausible Analytics, sans cookie (aucun identifiant
 * déposé chez le visiteur, aucun suivi d'un site à l'autre).
 *
 * ÉTEINTE tant que `VITE_PLAUSIBLE_DOMAIN` n'est pas renseignée dans les
 * variables de Railway (valeur : le domaine déclaré dans Plausible, par
 * exemple `scrollthedate.com`). Raison : aucune donnée ne doit partir vers
 * Plausible avant que le compte existe, et la politique de confidentialité
 * et l'avis cookies doivent dire la vérité dans les deux états — ils lisent
 * `analyticsEnabled` pour choisir leur texte (cf. Confidentialite.tsx,
 * CookieNotice.tsx).
 *
 * Plausible lit tout seul les liens suivis (`?utm_source=instagram…`) et
 * suit les changements de page de l'application. À régler dans Plausible :
 * exclure /admin et /espace des statistiques.
 */
export const PLAUSIBLE_DOMAIN = (import.meta.env.VITE_PLAUSIBLE_DOMAIN as string | undefined)?.trim() || ''
export const analyticsEnabled = PLAUSIBLE_DOMAIN !== ''

export function loadAnalytics() {
  if (!analyticsEnabled || typeof document === 'undefined') return
  if (document.querySelector('script[data-domain]')) return
  const s = document.createElement('script')
  s.defer = true
  s.dataset.domain = PLAUSIBLE_DOMAIN
  s.src = 'https://plausible.io/js/script.js'
  document.head.appendChild(s)
}
