/**
 * Contenu de « Demo Faire Part 2 » — cf. échange du 13/09/2026. Copié du
 * faire-part « Léa & Olivier » (skill v0.44, instructions-page-lea-
 * olivier.md), qui sert désormais de simple démo publique plutôt que de
 * page client — les deux fichiers d'origine (leaOlivierContent.ts,
 * FairePartLeaOlivier.tsx) ont été retirés à cette occasion.
 *
 * Contenu quasi identique à l'original (photos, dates, programme, dress
 * code, thème, palette rouge/anthracite) — seule différence : plus aucun
 * prénom en dur (BRIDE/GROOM retirés). `buildHeroChapters()` prend les
 * prénoms en paramètre, résolus à l'affichage depuis Réglages → Faire-part
 * démo (site_settings, clé "demoFairePart2") — vide par défaut, cf.
 * DemoFairePart2.tsx.
 *
 * Ambiance couple : Cinéma, palette propre (rouge profond sur fond sombre,
 * cf. CINEMA_ROUGE_THEME ci-dessous) — cf. doc d'origine dans l'historique
 * git pour le détail des choix de palette.
 */

import type { HeroChapter, HeroTheme } from '@/components/hero-scrub/types'
import type { PayloadTheme, RsvpTheme } from './PayloadSection'
import type { ClosingTheme } from './ClosingSection'
import { parseProgrammeItem, type ProgrammeItem } from './DetailsSombre'
import type { BespokePalette } from './edwigeWilfriedEffects'

export const SLUG = 'demo-faire-part-2'

export const WEDDING_DATE_LABEL = '15 août 2027'
/** Forme courte de la date — hero scrub uniquement. */
export const WEDDING_DATE_SHORT = '15 août 27'
export const CEREMONY_TIME = '16h00'
/** Date+heure ISO — source unique pour le bloc date et le compte à rebours. +02:00 = heure d'été en France métropolitaine. */
export const WEDDING_DATETIME = '2027-08-15T16:00:00+02:00'
export const VENUE_NAME = 'Le Caillavet'
export const VENUE_LOCATION = 'Saint-Aubin-de-Médoc'
export const VENUE_ADDRESS = 'Route de Lacanau, Saint-Aubin-de-Médoc, Gironde'
export const DRESS_CODE = 'Rouge et noir'

export const LODGING_OPTIONS = [
  'Hôtel Restaurant Les Bruyères (Saint-Médard-en-Jalles)',
  'Cabot Hotel Bordeaux (Le Pian-Médoc)',
  'Logis Hôtels Le Pont Bernet (Le Pian-Médoc)',
]

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

export const CINEMA_ROUGE_THEME: HeroTheme = {
  id: 'cinema',
  label: 'Cinéma — Demo Faire Part 2',
  colorScheme: 'dark',
  frameBg: '#26201C',
  pageBg: '#26201C',
  vignette:
    'linear-gradient(180deg, rgba(38,32,28,0.20) 0%, rgba(38,32,28,0.05) 40%, rgba(38,32,28,0.82) 100%)',
  accent: '#8B1E28',
  textPrimary: '#F3EAD9',
  textSecondary: '#BBAFA9',
  cardBg: 'rgba(21, 16, 15, 0.55)',
  cardBorder: 'rgba(247, 241, 236, 0.12)',
  cardShadow: '0 24px 60px rgba(0, 0, 0, 0.4)',
  dotInactive: 'rgba(247, 241, 236, 0.10)',
}

export const PAYLOAD_THEME: Partial<PayloadTheme> = {
  sectionBg: '#26201C',
  cardBg: 'rgba(255, 255, 255, 0.05)',
  cardBorder: 'rgba(232, 196, 196, 0.14)',
  accent: '#8B1E28',
  accentHover: '#A32732',
  heading: '#F3EAD9',
  text: '#F3EAD9',
  ctaBg: '#F3EAD9',
  ctaText: '#8B1E28',
}

export const RSVP_THEME: Partial<RsvpTheme> = {
  modalBg: '#2D2620',
  shadow: '0 24px 64px rgba(0, 0, 0, 0.55)',
  heading: '#F3EAD9',
  text: '#F3EAD9',
  textMuted: '#BBAFA9',
  accent: '#8B1E28',
  accentHover: '#A32732',
  accentSoft: 'rgba(139, 30, 40, 0.18)',
  inputBg: 'rgba(255, 255, 255, 0.05)',
  inputBorder: 'rgba(232, 196, 196, 0.14)',
  inputText: '#F3EAD9',
  inputPlaceholder: 'rgba(187, 175, 169, 0.6)',
  ctaBg: '#F3EAD9',
  ctaText: '#8B1E28',
}

export const CLOSING_THEME: Partial<ClosingTheme> = {
  bg: '#26201C',
  border: 'rgba(255, 255, 255, 0.10)',
  heading: '#F3EAD9',
  accent: '#8B1E28',
  text: '#BBAFA9',
}

/** Photo d'ouverture — ratio portrait conservé (1000x1768). */
export const OPENING_PHOTO = {
  src: '/lea-olivier-photo-1.jpg',
  alt: 'Un couple, main dans la main sous les arches',
}

/**
 * Vidéo hero (cf. échange du 13/09/2026) — déposée dans public/ par
 * l'utilisateur, découpée en séquence d'images (ffmpeg, même pipeline que
 * public/red-door-frames/) plutôt que servie comme un seul fichier vidéo —
 * cf. doc de HERO_VIDEO dans demoFairePart1Content.ts pour le
 * raisonnement complet. 651 images / 12 im/s ≈ 54,25 s (cf. `ffprobe`, très
 * proche des 54,21 s réels de la vidéo source).
 */
export const HERO_VIDEO = {
  desktopSrc: '/demo-faire-part-2.mp4',
  posterSrc: '/demo-faire-part-2-frames/00001.jpg',
  frames: { baseUrl: '/demo-faire-part-2-frames/', count: 651, fps: 12 },
}

export const RSVP_CTA_LABEL = 'Répondre à l’invitation'

/**
 * "Prénom & Prénom" (ou le libellé de repli, cf. DemoFairePart2.tsx) →
 * segments HeroChapter, accent sur le séparateur — même découpage que pour
 * un vrai projet (cf. FairePart.tsx). Repli sur un seul segment si le texte
 * ne contient ni "&" ni "et".
 */
function nameSegments(names: string): { text: string; accent?: boolean }[] {
  const parts = names.split(/\s+(&|et)\s+/i)
  return parts.length === 3 ? [{ text: parts[0] }, { text: parts[1], accent: true }, { text: parts[2] }] : [{ text: names }]
}

/**
 * Overlays répartis sur trois plans du nouveau film (enveloppe scellée
 * « L & O », puis arche florale/cérémonie au coucher du soleil, corde
 * rouge nouée en clôture — cf. échange du 13/09/2026). Fenêtres [from, to]
 * repérées à l'image sur demo-faire-part-2.mp4 (651 images / 12 im/s ≈
 * 54,25 s, cf. HERO_VIDEO ci-dessus — durée quasi identique à l'ancienne
 * vidéo, timings d'origine repris tels quels) :
 * - Chapitre 0 « prénoms » : 3,2-5 s, sur l'enveloppe scellée.
 * - Chapitre 1 « date, heure, lieu » : 28,3-31 s.
 * - Chapitre 2 « clôture » : 52,8 s → fin de piste, sur l'arche florale.
 */
const VIDEO_DURATION_S = HERO_VIDEO.frames.count / HERO_VIDEO.frames.fps

export function buildHeroChapters(coupleNames: string): HeroChapter[] {
  const segments = nameSegments(coupleNames)
  return [
    {
      id: 0,
      kind: 'text',
      from: 3.2 / VIDEO_DURATION_S,
      to: 5.0 / VIDEO_DURATION_S,
      segments,
      segmentLayout: 'stack',
      titleSize: 'lg',
      sub: 'vous invite à leur mariage',
    },
    {
      id: 1,
      kind: 'text',
      from: 28.3 / VIDEO_DURATION_S,
      to: 31.0 / VIDEO_DURATION_S,
      segments: [{ text: WEDDING_DATE_SHORT }],
      rule: true,
      subLines: [CEREMONY_TIME, `${VENUE_NAME}, ${VENUE_LOCATION}`],
      subSize: 'md',
      sub: DRESS_CODE,
    },
    {
      id: 2,
      kind: 'text',
      from: 52.8 / VIDEO_DURATION_S,
      to: 1,
      lead: 'Nous sommes ravis de partager ce moment avec vous',
      segments,
    },
  ]
}

/** Cartes Lieu/Programme/FAQ sombres (cf. doc d'origine dans l'historique git pour le détail des choix). */
export const LAO_PALETTE: BespokePalette = {
  bg: 'rgba(255, 255, 255, 0.05)',
  bgDate: 'transparent',
  bgProgramme: 'rgba(255, 255, 255, 0.05)',
  bgLieu: '',
  bgDressCode: '',
  bgMenu: '',
  bgHistoire: '',
  bgFaq: '',
  bgHebergements: '',
  bgListeMariage: '',
  cream: '#F3EAD9',
  ink: '#F3EAD9',
  inkRgb: '243, 234, 217',
  inkOnCard: '#F3EAD9',
  inkOnCardRgb: '243, 234, 217',
  mapLine: '#F3EAD9',
  bordeaux: '#E8C4C4',
  bordeauxRgb: '232, 196, 196',
  gold: '#8B1E28',
  goldRgb: '139, 30, 40',
  sectionTitle: '#F3EAD9',
  timelineAccent: '#F3EAD9',
  stepLabel: '#8B1E28',
  seal: '#8B1E28',
  sealLight: '#A32732',
  sealDark: '#5C1018',
  dressCode1: '#8B1E28',
  dressCode2: '#1A1512',
  dressCode3: '',
  heroTextColor: '',
  heroCardBg: '',
  heroInviteText: '',
  heroClosingEnabled: true,
  stdSaveTheDateTextColor: '',
  stdSaveTheDateCardBg: '',
  stdNamesDateTextColor: '',
  stdNamesDateCardBg: '',
  heroOverlayGraphic: '',
  heroFontId: '',
  heroTextAnimation: '',
  heroFilter: '',
}

export const LAO_HISTOIRE_TEXT =
  'Comme dans un film, tout a commencé par un regard qui s’attarde un peu trop longtemps. Puis une scène, une autre, et cette certitude tranquille : c’est cette histoire-là que nous voulions vivre. Aujourd’hui le rideau se lève sur le plus beau des chapitres.'
export const LAO_HISTOIRE_KEYWORDS = ['regard', 'certitude', 'histoire', 'rideau']

export const LAO_FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'Y a-t-il un parking disponible ?',
    a: 'Un parking est disponible sur place, au domaine du Caillavet. Nous vous communiquerons les modalités précises avant le jour J.',
  },
  {
    q: 'Puis-je venir accompagné(e) ?',
    a: "Le nombre de places étant compté, merci de vous en tenir aux personnes indiquées sur votre invitation. N'hésitez pas à nous contacter pour toute question.",
  },
  {
    q: 'À quelle heure faut-il arriver ?',
    a: 'Nous vous recommandons d\'arriver un peu avant le début de la cérémonie, à 16h00, afin de vous installer tranquillement.',
  },
]

export const LAO_DRESS_CODE_COLORS = ['#8B1E28', '#1A1512']

/** Photo du lieu (Le Caillavet) au-dessus de la carte dynamique dans « Le Lieu ». */
export const VENUE_PHOTO = '/lea-olivier-lieu-photo.jpg'

export const GALLERY_PHOTOS = ['/lea-olivier-gallery-1.jpg', '/lea-olivier-gallery-2.jpg', '/lea-olivier-gallery-3.jpg']
