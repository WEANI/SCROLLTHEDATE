/**
 * Types partagés du hero scrub — utilisés aussi bien par le catalogue de
 * thèmes (cf. themes.ts) que par le contenu propre à chaque faire-part
 * (cf. src/components/demo/demoContent.ts, .../faire-part/*Content.ts).
 */

export interface HeroChapter {
  id: number
  kind: 'text' | 'list' | 'card'
  /** Fenêtre de progression [from, to] du scrub où ce chapitre est affiché. */
  from: number
  to: number
  eyebrow?: string
  /** Segments du titre : texte brut ou accentué (couleur d'accent du thème). */
  segments?: { text: string; accent?: boolean }[]
  sub?: string
  rule?: boolean
  items?: string[]
  card?: { mono: string; title: string; sub: string }
}

/**
 * Un thème = une charte complète du hero scrub (fond, vignette, accent,
 * texte, carte) — cf. themes.ts pour le catalogue. Ajouter un thème n'exige
 * de toucher ni HeroScrub.tsx ni hero-scrub.css, seulement themes.ts.
 */
export interface HeroTheme {
  id: string
  /** Nom affiché (ex. dans le questionnaire "Ambiance souhaitée"). */
  label: string
  frameBg: string
  /** Valeur CSS complète du gradient de vignette du cadre. */
  vignette: string
  accent: string
  textPrimary: string
  textSecondary: string
  /** Fond flouté de la carte (rgba avec alpha). */
  cardBg: string
  cardBorder: string
  cardShadow: string
  /** Points de repère de chapitre à l'état inactif. */
  dotInactive: string
}

export interface HeroVideoConfig {
  desktopSrc: string
  /** Optionnel — si absent, `desktopSrc` sert aussi sur mobile (un seul montage livré). */
  mobileSrc?: string
  posterSrc: string
}
