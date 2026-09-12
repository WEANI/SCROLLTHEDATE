/**
 * Contenu de « Demo Faire Part 1 » — cf. échange du 13/09/2026. Copié du
 * faire-part « Edwige & Wilfried » (skill v0.38, instructions-page-edwige-
 * wilfried_1.md), qui sert désormais de simple démo publique plutôt que de
 * page client — les deux fichiers d'origine (edwigeWilfriedContent.ts,
 * FairePartEdwigeWilfried.tsx) ont été retirés à cette occasion.
 *
 * Contenu quasi identique à l'original (photos, dates, programme, dress
 * code, thème) — seule différence : plus aucun prénom en dur (BRIDE/GROOM
 * retirés). `buildHeroChapters()` prend les prénoms en paramètre, résolus à
 * l'affichage depuis Réglages → Faire-part démo (site_settings, clé
 * "demoFairePart1") — vide par défaut, cf. DemoFairePart1.tsx.
 *
 * Architecture à deux niveaux (skill Étape 5) : hero scrub quasi muet avec
 * overlays répartis sur des plans précis du film (pas seulement à la fin)
 * + corps de page statique (payload verbatim, photos, clôture).
 */

import type { HeroChapter } from '@/components/hero-scrub/types'
import { parseProgrammeItem, type ProgrammeItem } from './DetailsSombre'

export const SLUG = 'demo-faire-part-1'

export const WEDDING_DATE_LABEL = '21 décembre 2027'
/**
 * Forme courte de la date — hero scrub uniquement (chapitre 1 ci-dessous),
 * où elle porte le gros texte display : demandé plus grande que l'heure, et
 * "décembre" en entier à cette taille dépasse la colonne vidéo étroite.
 * Le bloc payload du corps de page, lui, reste verbatim en
 * WEDDING_DATE_LABEL — cette forme courte n'y est jamais utilisée.
 */
export const WEDDING_DATE_SHORT = '21 déc. 27'
export const CEREMONY_TIME = '16h00'
export const VENUE_NAME = 'One&Only The Palm'
export const VENUE_LOCATION = 'Dubaï'
/** Date+heure ISO — source unique du bloc date et du compte à rebours de DetailsSombre. +04:00 = heure du Golfe (Dubaï). */
export const WEDDING_DATETIME = '2027-12-21T16:00:00+04:00'
export const DRESS_CODE = 'Une tenue élégante est souhaitée pour célébrer ce moment dans une belle ambiance.'

/** Accent pastel — rose poudré, teinte profonde dérivée pour texte/CTA. */
export const ACCENT_PALE = '#E8C9C4'
export const ACCENT_DEEP = '#B9776C'

/**
 * Photo d'ouverture du corps de page — placée AVANT le bloc payload, en
 * transition entre le plan final du film et les informations pratiques.
 * Ratio portrait 520x936 conservé — obligatoire pour PhotoSplitCinematique.
 */
export const OPENING_PHOTO = {
  src: '/edwige-wilfried-photo-1.png',
  alt: 'Un couple, front contre front',
}

/**
 * Vidéo hero (cf. échange du 13/09/2026) — déposée dans public/ par
 * l'utilisateur, découpée en séquence d'images (ffmpeg, même pipeline que
 * public/red-door-frames/) plutôt que servie comme un seul fichier de
 * 95 Mo : un <canvas> qui affiche une image déjà chargée élimine toute la
 * classe de bugs de lecture <video> (cf. api/lib/videoFrames.ts), et
 * limite ce qui est retéléchargé à chaque visite. 760 images / 12 im/s ≈
 * 63,33 s (cf. `ffprobe`, très proche des 63,39 s réels de la vidéo
 * source).
 */
export const HERO_VIDEO = {
  desktopSrc: '/demo-faire-part-1.mp4',
  posterSrc: '/demo-faire-part-1-frames/00001.jpg',
  frames: { baseUrl: '/demo-faire-part-1-frames/', count: 760, fps: 12 },
}

export const GALLERY_PHOTOS = [
  '/edwige-wilfried-gallery-1.png',
  '/edwige-wilfried-gallery-2.png',
  '/edwige-wilfried-gallery-3.png',
]

export const RSVP_CTA_LABEL = 'Répondre à l’invitation'

const PROGRAMME_RAW = [
  '15h30 — Bienvenue — Accueil et bienvenue au domaine',
  '16h00 — La cérémonie — Le moment le plus spéciale de la journée',
  '17h00 — Apéritif — Accueil des invités',
  '19h30 — Dîner — Repas et festivités',
  '23h00 — Decoupe du gateau — Un doux moment',
  '23h30 — La Fête — Nous danserons jusqu’a tard',
  '4h30 — Au revoir — Fin d’une journée inoubliable',
]
export const PROGRAMME: ProgrammeItem[] = PROGRAMME_RAW.map(parseProgrammeItem)

/** Thème du bloc détails (DetailsSombre) — reprend les couleurs de MINIMAL_THEME (hero-scrub/themes.ts). */
export const DETAILS_THEME = {
  ink: '#2E2620',
  inkSoft: '#6B5F53',
  accent: ACCENT_DEEP,
  line: 'rgba(184, 119, 108, 0.22)',
}

/**
 * "Prénom & Prénom" (ou le libellé de repli, cf. DemoFairePart1.tsx) →
 * segments HeroChapter, accent sur le séparateur — même découpage que pour
 * un vrai projet (cf. FairePart.tsx). Repli sur un seul segment si le texte
 * ne contient ni "&" ni "et".
 */
function nameSegments(names: string): { text: string; accent?: boolean }[] {
  const parts = names.split(/\s+(&|et)\s+/i)
  return parts.length === 3 ? [{ text: parts[0] }, { text: parts[1], accent: true }, { text: parts[2] }] : [{ text: names }]
}

/**
 * Overlays répartis sur trois plans du nouveau film (cf. échange du
 * 13/09/2026 : envisagée d'une enveloppe scellée, un diamant sur fond
 * doré, un tunnel de lumière, un survol au soleil couchant, puis le lieu
 * de cérémonie vu du ciel). Fenêtres [from, to] repérées à l'image sur
 * demo-faire-part-1.mp4 (760 images / 12 im/s ≈ 63,33 s, cf. HERO_VIDEO
 * ci-dessus) :
 * - Chapitre 0 « prénoms » : 3-6 s, sur l'enveloppe/le diamant — fond calme.
 * - Chapitre 1 « date » : 20-23 s, sur les particules en survol — fond uni.
 * - Chapitre 2 « clôture » : 60-63,33 s (fin de piste), sur le lieu de
 *   cérémonie vu du ciel, une fois le plan stabilisé.
 */
const VIDEO_DURATION_S = HERO_VIDEO.frames.count / HERO_VIDEO.frames.fps

export function buildHeroChapters(coupleNames: string): HeroChapter[] {
  const segments = nameSegments(coupleNames)
  return [
    {
      id: 0,
      kind: 'text',
      from: 3.0 / VIDEO_DURATION_S,
      to: 6.0 / VIDEO_DURATION_S,
      segments,
      segmentLayout: 'stack',
      titleSize: 'lg',
    },
    {
      id: 1,
      kind: 'text',
      from: 20.0 / VIDEO_DURATION_S,
      to: 23.0 / VIDEO_DURATION_S,
      segments: [{ text: WEDDING_DATE_SHORT }],
    },
    {
      id: 2,
      kind: 'text',
      from: 60.0 / VIDEO_DURATION_S,
      to: 1,
      segments,
    },
  ]
}
