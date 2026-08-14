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
  kind: 'seal' | 'text' | 'list' | 'card'
  eyebrow?: string
  /** Segments du titre : texte brut ou accentué (Fraunces italique corail). */
  segments?: { text: string; accent?: boolean }[]
  sub?: string
  rule?: boolean
  items?: string[]
  card?: { mono: string; title: string; sub: string }
}

/** Les 8 temps forts du scrub — un seul affiché à la fois (crossfade). */
export const HERO_CHAPTERS: HeroChapter[] = [
  {
    id: 0,
    kind: 'seal',
    eyebrow: 'Faire-part',
    segments: [{ text: 'Vous avez reçu' }, { text: 'quelque chose', accent: true }],
    sub: "Faites glisser pour découvrir l'histoire d'Anna & Théo",
  },
  {
    id: 1,
    kind: 'text',
    eyebrow: 'Se marient',
    segments: [{ text: 'Anna' }, { text: '&', accent: true }, { text: 'Théo' }],
    rule: true,
    sub: 'Un genou à terre, une marée montante',
  },
  {
    id: 2,
    kind: 'text',
    eyebrow: 'Le jour J',
    segments: [{ text: '20' }, { text: 'juin', accent: true }, { text: '2026' }],
    sub: "Un samedi, à l'heure dorée",
  },
  {
    id: 3,
    kind: 'text',
    eyebrow: 'Le lieu',
    segments: [{ text: 'Domaine' }, { text: 'de la Baie', accent: true }],
    sub: VENUE_LOCATION,
  },
  {
    id: 4,
    kind: 'list',
    eyebrow: 'Déroulé',
    items: [
      '16h30 — cérémonie face à la mer',
      '18h00 — cocktail sur la terrasse',
      '20h00 — dîner & soirée',
    ],
  },
  {
    id: 5,
    kind: 'text',
    eyebrow: 'Dress code',
    segments: [{ text: 'Élégance', accent: true }, { text: 'côtière' }],
    sub: 'Camaïeu terracotta, lin, sable',
  },
  {
    id: 6,
    kind: 'list',
    eyebrow: 'À savoir',
    items: [
      'Domaine accessible en voiture, parking sur place',
      `Réponse souhaitée avant le ${RSVP_DEADLINE_LABEL}`,
    ],
  },
  {
    id: 7,
    kind: 'card',
    card: {
      mono: COUPLE_INITIALS,
      title: 'Anna & Théo',
      sub: `${WEDDING_DATE_LABEL.replace('Samedi ', '')} · ${VENUE_NAME}`,
    },
  },
]
