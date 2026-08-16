/**
 * Contenu du faire-part démo « Anna & Théo » — nouvelle architecture à 2
 * sections (hero scrub vidéo + RSVP). Rendu par le composant partagé
 * HeroScrub (cf. src/components/hero-scrub/) avec le thème "cinema".
 */

import type { HeroChapter } from '@/components/hero-scrub/types'

export const DEMO_SLUG = 'anna-theo'

export const COUPLE_INITIALS = 'A&T'
export const WEDDING_DATE_LABEL = 'Samedi 20 juin 2026'
export const VENUE_NAME = 'Domaine de la Baie'
export const VENUE_LOCATION = "Presqu'île de Crozon, Finistère"
export const VENUE_ADDRESS = '14 chemin des Embruns, 29160 Crozon'
export const RSVP_DEADLINE_LABEL = '1er mai 2026'

/** Déroulé — partagé entre l'overlay "Le grand jour" du hero et la page infos. */
export const SCHEDULE_ITEMS = [
  { time: '16h30', label: 'Cérémonie face à la mer' },
  { time: '18h00', label: 'Cocktail sur la terrasse' },
  { time: '20h00', label: 'Dîner & soirée' },
]

export const DRESS_CODE = {
  title: 'Élégance côtière',
  sub: 'Camaïeu terracotta, lin, sable',
  detail:
    "On évite le blanc (réservé à la mariée) et les talons fins — la cérémonie se déroule sur le sable. Une touche de lin ou de lumière dorée est toujours bienvenue.",
}

/** Hébergements suggérés — page infos complètes uniquement (option payante). */
export const LODGING_OPTIONS = [
  { name: 'Hôtel de la Pointe', distance: '5 min du domaine', note: 'Vue mer, chambres doubles dès 140€' },
  { name: 'Gîte du Phare', distance: '10 min du domaine', note: 'Idéal pour les groupes, jusqu’à 8 personnes' },
  { name: 'Camping des Dunes', distance: '15 min du domaine', note: 'Emplacements & mobil-homes, option économique' },
]

export const PRACTICAL_INFO = [
  'Parking gratuit sur place, arrivée conseillée 20 min avant la cérémonie.',
  'Navette depuis la gare de Brest sur demande — précisez-le en répondant au RSVP.',
  'Les enfants sont les bienvenus ; un espace leur est dédié pendant le dîner.',
  'Cérémonie en extérieur : une allée abritée est prévue en cas de pluie.',
]

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
    items: SCHEDULE_ITEMS.map((s) => `${s.time} — ${s.label}`),
  },
  {
    id: 2,
    kind: 'text',
    from: 0.4,
    to: SILENT_FROM,
    eyebrow: 'Dress code',
    segments: [{ text: 'Élégance', accent: true }, { text: 'côtière' }],
    sub: DRESS_CODE.sub,
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
