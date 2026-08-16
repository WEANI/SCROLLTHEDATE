/**
 * Contenu du faire-part « Edwige & Wilfried » — première page réelle
 * construite depuis le pipeline FELICITI (cf. instructions-page-edwige-
 * wilfried.md). Architecture à deux niveaux (skill Étape 5) : hero scrub
 * quasi muet en overlay (un seul chapitre, sur le plan tenu final) + corps
 * de page statique (payload verbatim, photos, clôture) — à distinguer du
 * gabarit `/demo` (Anna & Théo) qui, lui, empile toutes les infos en
 * overlays vidéo. Ambiance couple : Minimal + pastel (cf. section 3 des
 * instructions) → thème "minimal" (cf. src/components/hero-scrub/themes.ts),
 * pas "cinema" (réservé aux couples en ambiance Cinéma comme /demo).
 */

import type { HeroChapter } from '@/components/hero-scrub/types'

export const SLUG = 'edwige-wilfried'

export const COUPLE_INITIALS = 'E & W'
export const BRIDE = 'Edwige'
export const GROOM = 'Wilfried'
export const WEDDING_DATE_LABEL = '21 décembre 2027'
export const CEREMONY_TIME = '16h00'
export const VENUE_NAME = 'One&Only The Palm'
export const VENUE_LOCATION = 'Dubaï'

/**
 * Accent pastel — proposition, pas une donnée client (aucun hex fourni par
 * le couple). Rose poudré retenu par défaut parmi les deux candidats du
 * brief ; teinte profonde dérivée pour les usages texte/CTA (contraste AA
 * sur fond clair). À valider avec le couple avant mise en production
 * définitive (cf. points ouverts, section 4 des instructions).
 */
export const ACCENT_PALE = '#E8C9C4' // rose poudré — fonds, filets, puces
export const ACCENT_DEEP = '#B9776C' // même teinte, assombrie — texte, CTA, icônes

/** Bloc payload — texte du formulaire, verbatim, jamais reformulé. */
export const PAYLOAD_FIELDS: { label: string; value: string }[] = [
  { label: 'Date', value: WEDDING_DATE_LABEL },
  { label: 'Lieu', value: `${VENUE_NAME}, ${VENUE_LOCATION}` },
  { label: 'Heure de cérémonie', value: CEREMONY_TIME },
  { label: 'Dress code', value: 'Couleurs pastel' },
]

export const RSVP_CTA_LABEL = 'Répondre à l’invitation'

/**
 * Aucun overlay avant la métamorphose finale (cf. instructions §2.A) : le
 * film hero (40 s, muet) reste pur jusqu'au tout dernier plan tenu — la vue
 * aérienne du lieu de cérémonie, verrouillée à partir de ~36 s / 39,4 s.
 * Un seul chapitre, donc, positionné sur ce plan — prénoms + date, même
 * structure de contenu que les chapitres de /demo (cf. HeroChapter).
 */
export const HERO_CHAPTERS: HeroChapter[] = [
  {
    id: 0,
    kind: 'text',
    from: 0.9,
    to: 1,
    eyebrow: COUPLE_INITIALS,
    segments: [{ text: BRIDE }, { text: '&', accent: true }, { text: GROOM }],
    rule: true,
    sub: WEDDING_DATE_LABEL,
  },
]
