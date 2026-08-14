/**
 * Contenu du faire-part démo « Anna & Théo » — nouvelle architecture à 2
 * sections (hero scrub vidéo + RSVP). Remplace l'ancien templates.ts : plus
 * de système de templates (éditorial/cinéma/minimal), une seule charte.
 */

export const DEMO_SLUG = 'anna-theo'

export const COUPLE_INITIALS = 'A&T'
export const WEDDING_DATE_LABEL = 'Samedi 20 juin 2026'
export const VENUE_NAME = 'Domaine de la Baie'
export const VENUE_LOCATION = "Presqu'île de Crozon, Finistère"
export const RSVP_DEADLINE_LABEL = '1er mai 2026'

export interface HeroChapter {
  id: number
  kind: 'text' | 'list' | 'card'
  /** Fenêtre de progression [from, to) du scrub où ce chapitre est affiché. */
  from: number
  to: number
  eyebrow?: string
  /** Segments du titre : texte brut ou accentué (Fraunces italique corail). */
  segments?: { text: string; accent?: boolean }[]
  sub?: string
  rule?: boolean
  items?: string[]
  card?: { mono: string; title: string; sub: string }
}

/**
 * Aucun overlay avant que l'enveloppe ne soit ouverte (cachet qui craque
 * puis pli qui se déplie, ~0 à 2,5s sur les deux montages, cf.
 * contact-sheets) : le tout premier chapitre n'apparaît qu'une fois ce
 * geste terminé.
 */
export const TEXT_START = 0.14

/**
 * Fenêtre de scroll (fraction de progression) volontairement muette : la
 * vidéo montre la bague en gros plan puis la séquence macro du diamant
 * (~9s à ~15s sur les deux montages, cf. contact-sheets), aucun overlay ne
 * doit s'y afficher pour laisser l'image respirer. Les chapitres sont donc
 * répartis avant/après ce silence plutôt qu'uniformément sur tout le scrub.
 */
export const SILENT_FROM = 0.5
export const SILENT_TO = 0.8

/** Les 4 temps forts du scrub — un seul affiché à la fois (crossfade). */
export const HERO_CHAPTERS: HeroChapter[] = [
  {
    id: 0,
    kind: 'text',
    from: TEXT_START,
    to: 0.24,
    eyebrow: 'Se marient',
    segments: [{ text: 'Anna' }, { text: '&', accent: true }, { text: 'Théo' }],
    rule: true,
    sub: 'Un genou à terre, une marée montante',
  },
  {
    // Date, lieu et déroulé réunis dans une seule carte.
    id: 1,
    kind: 'list',
    from: 0.24,
    to: 0.4,
    eyebrow: 'Le grand jour',
    segments: [{ text: '20' }, { text: 'juin', accent: true }, { text: '2026' }],
    rule: true,
    sub: `${VENUE_NAME} — ${VENUE_LOCATION}`,
    items: [
      '16h30 — cérémonie face à la mer',
      '18h00 — cocktail sur la terrasse',
      '20h00 — dîner & soirée',
    ],
  },
  {
    id: 2,
    kind: 'text',
    from: 0.4,
    to: SILENT_FROM,
    eyebrow: 'Dress code',
    segments: [{ text: 'Élégance', accent: true }, { text: 'côtière' }],
    sub: 'Camaïeu terracotta, lin, sable',
  },
  // → silence de SILENT_FROM à SILENT_TO : bague en gros plan puis diamant, aucun texte.
  {
    id: 3,
    kind: 'card',
    from: SILENT_TO,
    to: 1,
    card: {
      mono: COUPLE_INITIALS,
      title: 'Anna & Théo',
      sub: `${WEDDING_DATE_LABEL.replace('Samedi ', '')} · ${VENUE_NAME}`,
    },
  },
]
