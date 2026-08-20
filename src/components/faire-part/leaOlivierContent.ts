/**
 * Contenu du faire-part « Léa & Olivier » — construit depuis le pipeline
 * SCROLL THE DATE (cf. instructions-page-lea-olivier.md, skill v0.44).
 * Architecture à deux niveaux (skill Étape 5) : hero scrub avec overlays
 * répartis sur des plans précis du film + corps de page statique (payload
 * verbatim, photos, clôture). Ambiance couple : Cinéma, mais palette propre
 * à ce couple (rouge profond sur fond sombre — voir CINEMA_ROUGE_THEME
 * ci-dessous) plutôt que la charte terracotta déjà utilisée par /demo
 * (Anna & Théo) : deux couples en ambiance "Cinéma" n'ont pas forcément la
 * même charte visuelle, cf. instructions §3 ("toute la page dérive du
 * thème du couple — pas une charte de marque figée"). Thème défini ici,
 * pas dans hero-scrub/themes.ts : contrairement à "minimal"/"editorial",
 * ce n'est pas un remplaçant générique de la valeur d'enum "cinema" (qui
 * reste la charte de /demo), seulement la déclinaison propre à cette page
 * câblée en dur.
 */

import type { HeroChapter, HeroTheme } from '@/components/hero-scrub/types'
import type { PayloadTheme } from './PayloadSection'
import type { ClosingTheme } from './ClosingSection'
import { parseProgrammeItem, type ProgrammeItem } from './DetailsSombre'

export const SLUG = 'lea-olivier'

export const COUPLE_INITIALS = 'L & O'
export const BRIDE = 'Léa'
export const GROOM = 'Olivier'
export const WEDDING_DATE_LABEL = '15 août 2026'
/** Forme courte de la date — hero scrub uniquement (cf. edwigeWilfriedContent.ts pour le précédent de ce pattern). */
export const WEDDING_DATE_SHORT = '15 août 26'
export const CEREMONY_TIME = '16h00'
/**
 * Date+heure ISO — source unique pour le bloc date et le compte à rebours
 * de DetailsSombre (cf. FairePartLeaOlivier.tsx). +02:00 = heure d'été en
 * France métropolitaine (le mariage a lieu le 15 août).
 */
export const WEDDING_DATETIME = '2026-08-15T16:00:00+02:00'
export const VENUE_NAME = 'Le Caillavet'
export const VENUE_LOCATION = 'Saint-Aubin-de-Médoc'
export const VENUE_ADDRESS = 'Route de Lacanau, Saint-Aubin-de-Médoc, Gironde'
export const DRESS_CODE = 'Rouge et noir'

export const LODGING_OPTIONS = [
  'Hôtel Restaurant Les Bruyères (Saint-Médard-en-Jalles)',
  'Cabot Hotel Bordeaux (Le Pian-Médoc)',
  'Logis Hôtels Le Pont Bernet (Le Pian-Médoc)',
]

/**
 * Programme de la journée — fourni verbatim par le couple, non reformulé
 * (même règle que le reste du payload, cf. PayloadSection). Stocké au
 * format brut "Horaire — Titre — Détail" puis parsé par
 * `parseProgrammeItem` : c'est exactement le format que produirait la
 * question `jourj.programme` (type "list") une fois ajoutée au
 * questionnaire — cf. le schéma proposé dans DetailsSombre.tsx. En
 * attendant cette question, câblé en dur ici comme le reste du contenu de
 * cette page.
 */
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

/**
 * Rouge profond (sceau de cire / corde de la vidéo) sur fond noir/anthracite
 * — plus dramatique et contrasté que CINEMA_THEME (terracotta chaleureux de
 * /demo), cf. instructions §3. Touche de rose poudré réservée à un détail
 * discret (bordure des cartes du payload, jamais l'accent dominant) —
 * jamais dans le hero, où l'accent reste rouge à 100%.
 */
export const CINEMA_ROUGE_THEME: HeroTheme = {
  id: 'cinema',
  label: 'Cinéma — Léa & Olivier',
  colorScheme: 'dark',
  frameBg: '#15100F',
  pageBg: '#15100F',
  vignette:
    'linear-gradient(180deg, rgba(10,7,7,0.20) 0%, rgba(10,7,7,0.05) 40%, rgba(10,7,7,0.82) 100%)',
  accent: '#8B1E28',
  textPrimary: '#F5EFEA',
  textSecondary: '#BBAFA9',
  cardBg: 'rgba(21, 16, 15, 0.55)',
  cardBorder: 'rgba(247, 241, 236, 0.12)',
  cardShadow: '0 24px 60px rgba(0, 0, 0, 0.4)',
  dotInactive: 'rgba(247, 241, 236, 0.10)',
}

export const PAYLOAD_THEME: Partial<PayloadTheme> = {
  sectionBg: '#15100F',
  cardBg: 'rgba(255, 255, 255, 0.05)',
  cardBorder: 'rgba(232, 196, 196, 0.14)', // touche de rose poudré discrète — cf. instructions §3
  accent: '#8B1E28',
  accentHover: '#A32732',
  heading: '#F5EFEA',
  text: '#E7DED9',
}

export const CLOSING_THEME: Partial<ClosingTheme> = {
  bg: '#15100F',
  border: 'rgba(255, 255, 255, 0.10)',
  heading: '#F5EFEA',
  accent: '#8B1E28',
  text: '#BBAFA9',
}

/**
 * Photo d'ouverture du corps de page — placée AVANT le bloc payload, en
 * transition entre le plan final du film et les informations pratiques.
 * Ratio portrait conservé (1000x1768) : cadrage vertical cohérent avec la
 * colonne 9:16 du hero juste au-dessus.
 */
export const OPENING_PHOTO = {
  src: '/lea-olivier-photo-1.jpg',
  alt: 'Léa & Olivier, main dans la main sous les arches',
}

export const RSVP_CTA_LABEL = 'Répondre à l’invitation'

/**
 * Overlays répartis sur trois plans précis du film (skill v0.40), vidéo
 * épinglée (sticky) jusqu'au plan final tenu, puis le corps de page
 * remonte par-dessus (skill v0.41 — cf. FairePartLeaOlivier.tsx). Fenêtres
 * [from, to] repérées à l'image sur lea-olivier-hero.mp4 (1301 frames /
 * 24 fps ≈ 54,2083 s) :
 *
 * - Chapitre 0 « prénoms » : juste après l'ouverture du sceau de cire,
 *   pendant le tunnel de lumière rouge qui en jaillit — repéré entre 3,2 s
 *   (le faisceau commence tout juste à grossir) et 5,0 s (juste avant que
 *   les pétales ne prennent le relais). Prénoms empilés, "&" seul sur sa
 *   ligne — accroche sous les prénoms.
 * - Chapitre 1 « date, heure, lieu » : sur le plan calme du carnet/partition
 *   (leurs études), au moment précis où « L&O » apparaît en toutes lettres
 *   sur la partition, net et lisible — repéré entre 28,3 s et 31,0 s (la
 *   scène bascule vers le couloir/fenêtre juste après). Heure et lieu en
 *   plus grande taille (subLines/subSize) ; dress code en sous-texte le
 *   plus discret du bloc (sub, toujours en petite taille).
 * - Chapitre 2 « clôture » : sur le plan final tenu, la corde rouge déjà
 *   nouée et immobile autour des deux alliances — repéré entre 52,8 s et la
 *   fin (54,2083 s). Les frames 53,0 et 53,5 sont visuellement identiques :
 *   le nœud est fixé, plus aucun mouvement dans le plan à partir de là.
 * Les vides entre chapitres sont intentionnels — même logique de zones
 * silencieuses que sur /demo (cf. findActiveChapterIndex, qui retourne -1
 * hors fenêtre).
 */
const VIDEO_DURATION_S = 1301 / 24

export const HERO_CHAPTERS: HeroChapter[] = [
  {
    id: 0,
    kind: 'text',
    from: 3.2 / VIDEO_DURATION_S,
    to: 5.0 / VIDEO_DURATION_S,
    segments: [{ text: BRIDE }, { text: '&', accent: true }, { text: GROOM }],
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
    segments: [{ text: BRIDE }, { text: '&', accent: true }, { text: GROOM }],
  },
]
