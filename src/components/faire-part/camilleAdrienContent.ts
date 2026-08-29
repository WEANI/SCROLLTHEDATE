/**
 * Contenu du faire-part « Camille & Adrien » — construit depuis le pipeline
 * SCROLL THE DATE (cf. instructions-page-camille-adrien.md). Architecture
 * BESPOKE partagée (cf. TEMPLATE-FAIRE-PART.md) : ce fichier + sa page
 * (FairePartCamilleAdrien.tsx) sont les 2 seuls fichiers propres à ce
 * couple — le moteur (edwigeWilfriedEffects.tsx, DetailsSombre.tsx,
 * PayloadSection.tsx) n'est pas dupliqué.
 *
 * Thème : bord de mer breton, moderne et sobre — bleu marine profond
 * (couleur explicitement demandée par le couple), blanc cassé, gris
 * ardoise, touche de rouille/cuivre patiné. Fond sombre explicitement
 * demandé. **Doré exclu entièrement** (champ explicite du formulaire, pas
 * une déduction) — remplacé partout par du gris/argent/cuivre, y compris
 * sur le sceau RSVP (cf. instructions §3). Plus proche de Léa & Olivier
 * (fond sombre) que d'Edwige & Wilfried (fond clair) — cf. demande client
 * dans le message de livraison.
 */

import type { HeroChapter, HeroTheme } from '@/components/hero-scrub/types'
import type { PayloadTheme, RsvpTheme } from './PayloadSection'
import type { ClosingTheme } from './ClosingSection'
import { parseProgrammeItem, type ProgrammeItem } from './DetailsSombre'
import type { BespokePalette } from './edwigeWilfriedEffects'

export const SLUG = 'camille-adrien'

export const COUPLE_INITIALS = 'C · A'
export const BRIDE = 'Camille'
export const GROOM = 'Adrien'
export const WEDDING_DATE_LABEL = '13 juin 2027'
/** Forme courte — hero scrub uniquement (cf. edwigeWilfriedContent.ts pour ce pattern) : toujours abrégée, jamais "13 juin 2027" en toutes lettres à cette taille — débordement déjà rencontré (cf. instructions §2.A). */
export const WEDDING_DATE_SHORT = '13 juin 27'
export const CEREMONY_TIME = '16h00'
/** +02:00 = heure d'été en France métropolitaine (Saint-Malo, 13 juin). */
export const WEDDING_DATETIME = '2027-06-13T16:00:00+02:00'
export const VENUE_NAME = 'Domaine de Lampan'
export const VENUE_LOCATION = 'Saint-Malo'
export const VENUE_ADDRESS = '12 route du Val, 35400 Saint-Malo'
/** Verbatim formulaire — bloc payload (corps de page). */
export const DRESS_CODE =
  'Élégant mais marchable (herbe et galets) — bleu marine, blanc cassé, lin. Pas de talons aiguilles.'
/** Sous-texte du chapitre 1 du hero — reprend tel quel le libellé donné en instructions §2.A, le plus discret du bloc (jamais agrandi, cf. HeroChapter.sub). */
export const DRESS_CODE_HERO_SUB = 'Élégant, marchable — bleu marine, blanc cassé, lin'

export const LODGING_OPTIONS = [
  'Hôtel Le Nouveau Monde (8 min, lenouveaumonde-saintmalo.fr)',
  'Gîte des Corsaires — groupes (15 min, gitedescorsaires.bzh)',
]

/**
 * Programme de la journée — fourni verbatim par le couple (instructions
 * §2.B, contrairement au test Léa & Olivier où ce bloc était un
 * placeholder). Format brut "Horaire — Titre — Détail" parsé par
 * `parseProgrammeItem`, cf. DetailsSombre.tsx.
 */
const PROGRAMME_RAW = [
  '16h00 — Cérémonie — Sous les pins, face à la mer',
  '17h30 — Vin d’honneur — Huîtres de Cancale et cidre brut',
  '20h00 — Dîner — Sous la grange, tables communes',
  '23h00 — Ouverture du bal — Puis DJ jusqu’à 2h',
]
export const PROGRAMME: ProgrammeItem[] = PROGRAMME_RAW.map(parseProgrammeItem)

/**
 * Bleu marine profond (dominante, demande client explicite) sur fond
 * sombre — registre « bord de mer breton, moderne et sobre », distinct du
 * rouge dramatique de Léa & Olivier et du pastel clair d'Edwige & Wilfried.
 * `accent` = le cuivre/rouille patiné (secondaire, cf. instructions §3),
 * pas le bleu marine lui-même : le bleu marine sature déjà tout le fond et
 * les cartes, c'est le cuivre — vu dans la vidéo sur le stylo 4 couleurs et
 * les alliances (or rose) — qui doit « sortir » du cadre pour porter les
 * accroches, la barre de progression et les points de chapitre. Aucun doré
 * nulle part (cf. instructions §3 et §4 — sceau argenté confirmé au
 * visionnage).
 */
export const BRETON_MARINE_THEME: HeroTheme = {
  id: 'cinema',
  label: 'Bord de mer breton — Camille & Adrien',
  colorScheme: 'dark',
  frameBg: '#0E1A2E',
  pageBg: '#0E1A2E',
  vignette:
    'linear-gradient(180deg, rgba(14,26,46,0.20) 0%, rgba(14,26,46,0.05) 40%, rgba(14,26,46,0.82) 100%)',
  accent: '#B5764C',
  textPrimary: '#F0ECE4',
  textSecondary: '#9AA3B0',
  cardBg: 'rgba(14, 20, 33, 0.55)',
  cardBorder: 'rgba(240, 236, 228, 0.12)',
  cardShadow: '0 24px 60px rgba(0, 0, 0, 0.4)',
  dotInactive: 'rgba(240, 236, 228, 0.10)',
}

export const PAYLOAD_THEME: Partial<PayloadTheme> = {
  sectionBg: '#0E1A2E', // aligné sur BRETON_MARINE_THEME.pageBg
  cardBg: 'rgba(255, 255, 255, 0.05)',
  cardBorder: 'rgba(181, 118, 76, 0.16)', // touche de cuivre/rouille discrète — cf. instructions §3
  accent: '#B5764C',
  accentHover: '#C68A5C',
  heading: '#F0ECE4',
  text: '#F0ECE4',
}

/**
 * Dialog RSVP repris en sombre (même logique que Léa & Olivier) plutôt que
 * la modale claire générique — cohérent avec une page qui reste sombre de
 * bout en bout, demande explicite du couple.
 */
export const RSVP_THEME: Partial<RsvpTheme> = {
  modalBg: '#16233C',
  shadow: '0 24px 64px rgba(0, 0, 0, 0.55)',
  heading: '#F0ECE4',
  text: '#F0ECE4',
  textMuted: '#9AA3B0',
  accent: '#B5764C',
  accentHover: '#C68A5C',
  accentSoft: 'rgba(181, 118, 76, 0.18)',
  inputBg: 'rgba(255, 255, 255, 0.05)',
  inputBorder: 'rgba(181, 118, 76, 0.16)',
  inputText: '#F0ECE4',
  inputPlaceholder: 'rgba(154, 163, 176, 0.6)',
}

export const CLOSING_THEME: Partial<ClosingTheme> = {
  bg: '#0E1A2E',
  border: 'rgba(255, 255, 255, 0.10)',
  heading: '#F0ECE4',
  accent: '#B5764C',
  text: '#9AA3B0',
}

/**
 * Photo d'ouverture — reçue après coup (le fichier n'était pas joint à la
 * livraison initiale). Ratio réel du fichier (688×826) — cf.
 * PhotoSplitCinematique, qui stretch les deux moitiés à la taille exacte de
 * leur boîte plutôt que de recadrer : un ratio faux déformerait l'image.
 */
export const OPENING_PHOTO = {
  src: '/camille-adrien-photo-1.jpg',
  alt: 'Camille & Adrien, front contre front sous le voile',
}
export const OPENING_PHOTO_ASPECT_RATIO = '688 / 826'

/**
 * Galerie « Notre histoire » — 2 photos reçues en même temps que la photo
 * d'ouverture (3 photos au total dans l'envoi), demandées par le client
 * dans la galerie horizontale épinglée de `NotreHistoire` (`photos:
 * string[]`, pas la grille de `PhotosSection`, cf. FairePartCamilleAdrien.tsx).
 */
export const GALLERY_PHOTOS = ['/camille-adrien-gallery-1.jpg', '/camille-adrien-gallery-2.jpg']

export const RSVP_CTA_LABEL = 'Répondre à l’invitation'

/**
 * Overlays répartis sur trois plans précis du film (skill Étape 5, cf.
 * instructions §2.A), vidéo épinglée (sticky) jusqu'au plan final tenu,
 * puis le corps de page remonte par-dessus (même mécanique que Léa &
 * Olivier / Edwige & Wilfried — cf. FairePartCamilleAdrien.tsx). Fenêtres
 * [from, to] repérées à l'image sur camille-adrien-hero.mp4 (1342 frames /
 * 24 fps ≈ 55,9167 s) :
 *
 * - Chapitre 0 « prénoms » : juste après l'ouverture de l'enveloppe (sceau
 *   argenté « C & A » confirmé), pendant le tunnel de lumière bleu-argenté
 *   qui en jaillit — repéré entre 3,2 s (le flare commence tout juste à
 *   grossir) et 5,0 s (juste avant que la page de grille de mots croisés ne
 *   prenne le relais). Prénoms empilés, "&" seul sur sa ligne — accroche
 *   sous les prénoms (instructions §2.A).
 * - Chapitre 1 « date, heure, lieu » : sur le plan calme où la grille
 *   repose seule sur la tablette de la fenêtre, stylo reposé, juste avant
 *   que le fil de lumière ne s'envole vers la côte (instructions §2.A) —
 *   repéré entre 16,6 s et 17,9 s (le fil s'élève dès 18,0 s). Date seule
 *   en gros texte (WEDDING_DATE_SHORT, jamais la forme longue — débordement
 *   déjà rencontré), heure et lieu agrandis (subLines/subSize "md"), dress
 *   code en sous-texte le plus discret du bloc (sub, toujours en petite
 *   taille).
 * - Chapitre 2 « clôture » : sur le plan final tenu, les deux alliances
 *   nouées l'une à l'autre par le stylo, immobiles en lumière dorée du
 *   soir — repéré entre 51,5 s et la fin (55,9167 s). Le stylo revient dans
 *   le cadre autour de 53,5 s (probable amorce d'une boucle) : fenêtre
 *   arrêtée avant ce retour pour ne montrer que les alliances nouées et
 *   immobiles.
 * Les vides entre chapitres sont intentionnels — même logique de zones
 * silencieuses que sur /demo (cf. findActiveChapterIndex, qui retourne -1
 * hors fenêtre).
 */
const VIDEO_DURATION_S = 1342 / 24

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
    from: 16.6 / VIDEO_DURATION_S,
    to: 17.9 / VIDEO_DURATION_S,
    segments: [{ text: WEDDING_DATE_SHORT }],
    rule: true,
    subLines: [CEREMONY_TIME, `${VENUE_NAME}, ${VENUE_LOCATION}`],
    subSize: 'md',
    sub: DRESS_CODE_HERO_SUB,
  },
  {
    id: 2,
    kind: 'text',
    from: 51.5 / VIDEO_DURATION_S,
    to: 1,
    lead: 'Nous sommes ravis de partager ce moment avec vous',
    segments: [{ text: BRIDE }, { text: '&', accent: true }, { text: GROOM }],
  },
]

/**
 * `CA_PALETTE` — cf. §4 de TEMPLATE-FAIRE-PART.md pour le rôle de chaque
 * champ. Partie de LAO_PALETTE (cartes sombres translucides), avec :
 * - `gold` (accent principal — anneaux, filets) = bleu marine moyen
 *   (#2A3F66, plus clair que le fond #0E1A2E pour rester visible dessus),
 *   PAS du doré — renommage conceptuel assumé, cf. doc du champ dans
 *   edwigeWilfriedEffects.tsx : c'est un rôle ("accent principal"), pas une
 *   teinte figée.
 * - `bordeaux` (accent secondaire — pulse, mots-clés, heure du programme) =
 *   le cuivre/rouille patiné, vu sur le stylo et les alliances de la vidéo.
 * - `seal`/`sealLight`/`sealDark` : gris ardoise/argent — PAS rouge comme
 *   Edwige & Wilfried / Léa & Olivier, PAS doré non plus. Le sceau réel de
 *   l'enveloppe (vidéo, t≈0,3s) est gravé dans une cire GRISE/ARGENTÉE, pas
 *   rouge — repris ici pour que le sceau RSVP interactif corresponde
 *   exactement à celui vu dans le film, plutôt que de réutiliser par
 *   défaut le rouge des couples précédents.
 * - `sectionTitle`/`timelineAccent`/`stepLabel` : mêmes rôles inversés
 *   qu'chez Léa & Olivier (heure en clair, titre d'étape en accent) —
 *   cohérent, aucune couleur nouvelle introduite.
 */
export const CA_PALETTE: BespokePalette = {
  bg: 'rgba(255, 255, 255, 0.05)',
  bgDate: 'transparent',
  bgProgramme: 'rgba(255, 255, 255, 0.05)',
  cream: '#F5F3EE',
  ink: '#F0ECE4',
  inkRgb: '240, 236, 228',
  inkOnCard: '#F0ECE4',
  inkOnCardRgb: '240, 236, 228',
  mapLine: '#F0ECE4',
  bordeaux: '#B5764C',
  bordeauxRgb: '181, 118, 76',
  gold: '#2A3F66',
  goldRgb: '42, 63, 102',
  sectionTitle: '#F0ECE4',
  timelineAccent: '#F0ECE4',
  stepLabel: '#B5764C',
  seal: '#7C8698',
  sealLight: '#B7BEC9',
  sealDark: '#454C59',
}

/**
 * Texte « Notre histoire » — comme pour Edwige & Wilfried et Léa & Olivier,
 * PROVISOIRE : aucun champ narratif (déclic/rencontre) dans les
 * instructions de ce couple, uniquement pour porter la mécanique technique
 * (mots qui s'encrent au scroll + galerie photo). À REMPLACER dès que le
 * couple fournit son vrai texte. Mots-clés/tournures tirés de leur propre
 * fil conducteur déjà établi (scénario « Mille petits samedis », instructions
 * §1 — grille de mots croisés + fil aérien jusqu'à la mer), jamais d'un
 * détail biographique inventé (pas de fausse rencontre/déclic) — et pas la
 * même formulation qu'Edwige & Wilfried/Léa & Olivier, pour ne pas
 * dupliquer verbatim l'histoire d'un autre couple.
 */
export const CA_HISTOIRE_TEXT =
  'Nos samedis se sont additionnés, petits et nombreux, jusqu’à former une grille bien à nous — une case, une couleur, un souvenir. Aujourd’hui le fil se déroule jusqu’à la mer, et nous serions heureux de vous y voir arriver avec nous.'
export const CA_HISTOIRE_KEYWORDS = ['samedis', 'grille', 'fil', 'mer']

/**
 * FAQ réelle (2 questions, instructions §2.B) — réponses enrichies avec les
 * infos pratiques additionnelles du même paragraphe (navette/horaires,
 * parking, PMR) : ces faits sont tous des précisions d'arrivée/logistique
 * qui prolongent naturellement la question du parking, DetailsSombre.tsx
 * n'ayant pas de 3e emplacement dédié à des « infos pratiques » distinctes
 * de la FAQ — aucun fait n'est perdu, aucun n'est inventé.
 */
export const CA_FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'Peut-on venir avec les enfants ?',
    a: 'Oui, coin jeux et baby-sitters à partir de 20h.',
  },
  {
    q: 'Y a-t-il un parking ?',
    a: 'Oui, 60 places gratuites sur place. Une navette gratuite est aussi prévue depuis la gare de Saint-Malo à 15h00 (retour à 2h00). Le domaine est accessible PMR — prévenez-nous pour réserver une place au premier rang.',
  },
]

/**
 * Dérivées du dress code textuel — ici 3 teintes RÉELLES nommées par le
 * couple lui-même (bleu marine / blanc cassé / lin), pas 2 comme Léa &
 * Olivier (qui n'en avait donné que 2, "rouge et noir") : aucune couleur
 * inventée, les 3 sont explicitement dans le champ dress code.
 */
export const CA_DRESS_CODE_COLORS = ['#2A3F66', '#F0ECE4', '#C9B79C']

// Pas de photo du lieu fournie — `photoSrc=""` (chaîne vide, PAS
// `undefined`) passé à LieuMagnifier dans FairePartCamilleAdrien.tsx :
// `undefined` explicite déclenche quand même le défaut du paramètre JS
// (la photo d'Edwige & Wilfried), constaté à l'écran avant correction —
// cf. TEMPLATE-FAIRE-PART.md §7, piège à ajouter à la liste.

// Pas de galerie générique (`PhotosSection`) sur cette page — les 2 photos
// reçues vivent dans `GALLERY_PHOTOS` ci-dessus, passées à la galerie
// épinglée de `NotreHistoire` (cf. FairePartCamilleAdrien.tsx), demandée
// explicitement à cet endroit plutôt que dans une grille séparée.
