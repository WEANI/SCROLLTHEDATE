import type { HeroTheme } from './types'

/**
 * Catalogue de thèmes du hero scrub — un thème par ambiance proposée dans le
 * questionnaire client ("style.ambiance"). Pour ajouter un nouveau thème :
 * ajouter une entrée ici, l'associer à une valeur `style.ambiance`, rien
 * d'autre à modifier dans le composant partagé.
 *
 * "cinema" reprend la charte de /demo (Anna & Théo) ; "minimal" reprend
 * celle du premier faire-part client réel (Edwige & Wilfried, cf.
 * instructions-page-edwige-wilfried.md — ambiance Minimal + pastel).
 * "editorial" n'a pas encore de design validé (aucun couple ne l'a choisi à
 * ce jour) : entrée réservée, à dessiner le jour où le besoin se présente.
 */
export const CINEMA_THEME: HeroTheme = {
  id: 'cinema',
  label: 'Cinéma',
  frameBg: '#17130F',
  vignette:
    'linear-gradient(180deg, rgba(23,19,15,0.15) 0%, rgba(23,19,15,0.05) 40%, rgba(23,19,15,0.85) 100%)',
  accent: '#C97A5C',
  textPrimary: '#F5EEE4',
  textSecondary: '#B8AC9C',
  cardBg: 'rgba(23, 19, 15, 0.55)',
  cardBorder: 'rgba(245, 238, 228, 0.12)',
  cardShadow: '0 24px 60px rgba(0, 0, 0, 0.35)',
  dotInactive: 'rgba(255, 244, 232, 0.10)',
}

export const MINIMAL_THEME: HeroTheme = {
  id: 'minimal',
  label: 'Minimal',
  frameBg: '#F2EDE6',
  vignette:
    'linear-gradient(180deg, rgba(23,19,15,0.08) 0%, rgba(23,19,15,0.02) 40%, rgba(23,19,15,0.55) 100%)',
  accent: '#B9776C',
  textPrimary: '#2E2620',
  textSecondary: '#6B5F53',
  cardBg: 'rgba(255, 251, 246, 0.72)',
  cardBorder: 'rgba(184, 119, 108, 0.22)',
  cardShadow: '0 24px 60px rgba(60, 40, 30, 0.18)',
  dotInactive: 'rgba(46, 38, 32, 0.12)',
}

export const HERO_THEMES = {
  cinema: CINEMA_THEME,
  minimal: MINIMAL_THEME,
} satisfies Record<string, HeroTheme>

export type HeroThemeId = keyof typeof HERO_THEMES
