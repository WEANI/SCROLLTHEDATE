import type { HeroTheme } from './types'

/**
 * Catalogue de thèmes du hero scrub — un thème par ambiance proposée dans le
 * questionnaire client ("style.ambiance"). Pour ajouter un nouveau thème :
 * ajouter une entrée ici, l'associer à une valeur `style.ambiance`, rien
 * d'autre à modifier dans le composant partagé.
 *
 * "cinema" reprend la charte de /demo (Anna & Théo) ; "minimal" reprend
 * celle du premier faire-part client réel (Edwige & Wilfried, cf.
 * instructions-page-edwige-wilfried.md — ambiance Minimal + pastel) ;
 * "editorial" complète le trio proposé dans le questionnaire (« Magazine,
 * typographie, élégance ») — papier froid très contrasté, accent bordeaux
 * d'imprimerie, filets fins, volontairement plus graphique et moins chaud
 * que "minimal" pour que les deux thèmes clairs ne se confondent pas.
 */
export const CINEMA_THEME: HeroTheme = {
  id: 'cinema',
  label: 'Cinéma',
  colorScheme: 'dark',
  frameBg: '#17130F',
  pageBg: '#17130F',
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
  colorScheme: 'light',
  frameBg: '#F2EDE6',
  pageBg: '#FBF7F1',
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

/**
 * Éditorial — « Magazine, typographie, élégance » (libellé du questionnaire).
 * Papier ivoire froid + encre quasi noire : contraste franc de l'imprimé,
 * là où "minimal" joue le camaïeu chaud et doux. Accent bordeaux profond
 * (≈8:1 sur la carte, au-delà du minimum AA même en petit corps) plutôt
 * qu'un terracotta/rose, pour ne se confondre ni avec "cinema" ni avec
 * "minimal". Filets et bordures nets, jamais estompés.
 */
export const EDITORIAL_THEME: HeroTheme = {
  id: 'editorial',
  label: 'Éditorial',
  colorScheme: 'light',
  frameBg: '#F4F3F0',
  pageBg: '#FAF9F6',
  vignette:
    'linear-gradient(180deg, rgba(24,24,28,0.10) 0%, rgba(24,24,28,0.02) 40%, rgba(24,24,28,0.58) 100%)',
  accent: '#7E3341',
  textPrimary: '#1F1F22',
  textSecondary: '#5C5C63',
  cardBg: 'rgba(250, 249, 246, 0.78)',
  cardBorder: 'rgba(31, 31, 34, 0.14)',
  cardShadow: '0 24px 60px rgba(24, 24, 28, 0.20)',
  dotInactive: 'rgba(31, 31, 34, 0.14)',
}

export const HERO_THEMES = {
  editorial: EDITORIAL_THEME,
  cinema: CINEMA_THEME,
  minimal: MINIMAL_THEME,
} satisfies Record<string, HeroTheme>

export type HeroThemeId = keyof typeof HERO_THEMES
