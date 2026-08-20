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

export const SLUG = 'lea-olivier'

export const COUPLE_INITIALS = 'L & O'
export const BRIDE = 'Léa'
export const GROOM = 'Olivier'
export const WEDDING_DATE_LABEL = '15 août 2026'
/** Forme courte de la date — hero scrub uniquement (cf. edwigeWilfriedContent.ts pour le précédent de ce pattern). */
export const WEDDING_DATE_SHORT = '15 août 26'
export const CEREMONY_TIME = '16h00'
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

/**
 * Corps de page en fond CLAIR (ivoire), à rebours du hero resté sombre.
 * L'ambiance Cinéma dicte le hero (le film doit se détacher sur du noir) ;
 * le corps de page, lui, porte de l'information à lire — le fond quasi noir
 * initial rendait les cartes peu lisibles. Le rouge profond du thème reste
 * l'accent (labels, CTA RSVP, filets) : c'est lui qui assure la continuité
 * visuelle avec le hero, pas le fond. Le noir/rouge du couple reste donc
 * respecté, réparti autrement.
 */
export const PAYLOAD_THEME: Partial<PayloadTheme> = {
  sectionBg: '#FBF8F5',
  cardBg: '#FFFFFF',
  cardBorder: 'rgba(139, 30, 40, 0.16)', // rouge du thème, très dilué — filet discret
  accent: '#8B1E28',
  accentHover: '#A32732',
  heading: '#1B1512',
  text: '#3A302C',
}

export const CLOSING_THEME: Partial<ClosingTheme> = {
  bg: '#FBF8F5',
  border: 'rgba(139, 30, 40, 0.14)',
  heading: '#1B1512',
  accent: '#8B1E28',
  text: '#6B5D57',
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

/** Bloc payload — texte du formulaire, verbatim, jamais reformulé. */
export const PAYLOAD_FIELDS: { label: string; value: string }[] = [
  { label: 'Date', value: WEDDING_DATE_LABEL },
  { label: 'Heure de cérémonie', value: CEREMONY_TIME },
  { label: 'Lieu', value: `${VENUE_NAME}, ${VENUE_ADDRESS}` },
  { label: 'Dress code', value: DRESS_CODE },
  { label: 'Hébergements recommandés', value: LODGING_OPTIONS.join('\n') },
]

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
