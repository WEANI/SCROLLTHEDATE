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
import type { PayloadTheme, RsvpTheme } from './PayloadSection'
import type { ClosingTheme } from './ClosingSection'
import { parseProgrammeItem, type ProgrammeItem } from './DetailsSombre'
import type { BespokePalette } from './edwigeWilfriedEffects'

export const SLUG = 'lea-olivier'

export const COUPLE_INITIALS = 'L & O'
export const BRIDE = 'Léa'
export const GROOM = 'Olivier'
export const WEDDING_DATE_LABEL = '15 août 2027'
/** Forme courte de la date — hero scrub uniquement (cf. edwigeWilfriedContent.ts pour le précédent de ce pattern). */
export const WEDDING_DATE_SHORT = '15 août 27'
export const CEREMONY_TIME = '16h00'
/**
 * Date+heure ISO — source unique pour le bloc date et le compte à rebours
 * de DetailsSombre (cf. FairePartLeaOlivier.tsx). +02:00 = heure d'été en
 * France métropolitaine (le mariage a lieu le 15 août).
 */
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
  // Fond allégé (demande client « moins sombre ») — anthracite chaud
  // choisi parmi 3 propositions (sombre atténué / anthracite chaud /
  // bordeaux profond) prototypées en HTML autonome, après un premier essai
  // en bordeaux profond finalement écarté par la cliente. Neutre chaud,
  // plus proche de la charte marketing du site (anthracite), nettement
  // moins "noir absolu" que l'ancien #0D0A08.
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
  sectionBg: '#26201C', // aligné sur CINEMA_ROUGE_THEME.pageBg, cf. commentaire là-bas
  cardBg: 'rgba(255, 255, 255, 0.05)',
  cardBorder: 'rgba(232, 196, 196, 0.14)', // touche de rose poudré discrète — cf. instructions §3
  accent: '#8B1E28',
  accentHover: '#A32732',
  heading: '#F3EAD9',
  text: '#F3EAD9',
  // Bouton RSVP en blanc (demande client) — distinct d'`accent` (rouge,
  // repris ailleurs : kickers, libellés) pour ne changer QUE le bouton.
  ctaBg: '#F3EAD9',
  ctaText: '#8B1E28',
}

/**
 * Palette du Dialog RSVP — le Dialog est clair par défaut sur tout le
 * projet (cf. PayloadSection), demande explicite de reprendre ici le fond
 * sombre + accent rouge du reste de la page plutôt que la modale claire
 * générique. Valeurs reprises telles quelles de CINEMA_ROUGE_THEME/
 * PAYLOAD_THEME ci-dessus (mêmes rouge, crème, bordure rose poudrée) —
 * aucune nouvelle couleur introduite pour ce Dialog.
 */
export const RSVP_THEME: Partial<RsvpTheme> = {
  modalBg: '#2D2620', // même écart de clarté que vs pageBg avant l'allègement (#14100C vs l'ex-#0D0A08), reporté sur le nouveau fond
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
  // Bouton d'envoi en blanc (demande client) — même logique que ctaBg/
  // ctaText de PAYLOAD_THEME ci-dessus.
  ctaBg: '#F3EAD9',
  ctaText: '#8B1E28',
}

export const CLOSING_THEME: Partial<ClosingTheme> = {
  bg: '#26201C', // aligné sur CINEMA_ROUGE_THEME.pageBg, cf. commentaire là-bas
  border: 'rgba(255, 255, 255, 0.10)',
  heading: '#F3EAD9',
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

/**
 * Refonte bespoke portée depuis Edwige & Wilfried (cf. edwigeWilfriedEffects.tsx
 * pour le détail des mécaniques — lettres qui se recomposent, anneaux du
 * compte à rebours, loupe magnétique, programme en défilement horizontal
 * épinglé, sceau de cire, Notre histoire, Foire aux questions, Dress code
 * animé) : mêmes composants, palette et contenu propres à ce couple.
 *
 * `LAO_PALETTE` — cartes Lieu/Programme/FAQ EN CLAIR (crème, comme chez
 * Edwige & Wilfried) d'abord essayées, jugées trop tranchées sur le fond
 * sombre de cette page (îlots clairs qui détonnent) : `bg`/`bgProgramme`
 * repassés en carte sombre (`rgba(255, 255, 255, 0.05)`, déjà établi comme
 * fond de carte dans PAYLOAD_THEME.cardBg — pas une couleur inventée),
 * `inkOnCard` en crème (plus du sombre, illisible sur une carte sombre) —
 * contrairement à Edwige & Wilfried où ces cartes claires posées sur une
 * page claire n'ont jamais posé ce problème. Texte posé DIRECTEMENT sur le
 * fond de la page (`ink`) déjà en crème : la page de Léa & Olivier reste
 * sombre (CINEMA_ROUGE_THEME.pageBg, anthracite chaud), contrairement à
 * celle d'Edwige & Wilfried. `mapLine` (traits de la carte SVG du Lieu) en crème
 * aussi, pour rester visible sur la carte désormais sombre. `gold` (accent
 * principal) devient leur rouge déjà établi (CINEMA_ROUGE_THEME.accent)
 * plutôt que du doré inventé ; `bordeaux` (accent secondaire, pulse/
 * mots-clés) devient leur rose poudré déjà établi
 * (PAYLOAD_THEME.cardBorder) — un rose sur un rouge se distingue mieux
 * qu'un rouge sur un rouge. Le sceau RSVP, lui, doit rester visuellement
 * un sceau de cire ROUGE (pas rose) : `seal` reprend donc l'accent
 * principal, pas `bordeaux` — cf. doc de `seal` dans BespokePalette pour
 * pourquoi ce rôle est séparé des deux autres.
 */
export const LAO_PALETTE: BespokePalette = {
  bg: 'rgba(255, 255, 255, 0.05)',
  bgDate: 'transparent',
  bgProgramme: 'rgba(255, 255, 255, 0.05)',
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
  // Titres de section en blanc (demande client) — pas leur rouge
  // (`gold`), déjà très présent ailleurs sur cette page.
  sectionTitle: '#F3EAD9',
  // Chiffre de l'heure dans la piste du Programme : blanc/crème (demande
  // client « l'heure en blanc, le titre en rouge » — inverse du réglage
  // précédent, qui mettait le rouge sur l'heure). Le titre de l'étape
  // (« La cérémonie »…) passe donc au rouge via `stepLabel` ci-dessous.
  timelineAccent: '#F3EAD9',
  stepLabel: '#8B1E28',
  seal: '#8B1E28',
  sealLight: '#A32732', // accentHover déjà établi dans PAYLOAD_THEME, pas une teinte inventée
  sealDark: '#5C1018',
}

/**
 * Texte non fourni ni par le couple ni par l'utilisateur — comme pour
 * Edwige & Wilfried, purement pour satisfaire la mécanique technique
 * (mots qui s'encrent au scroll). À REMPLACER dès que la vraie histoire du
 * couple est fournie. Mots-clés choisis pour rester cohérents avec
 * l'ambiance Cinéma/rouge de cette page (pas les mêmes que Edwige &
 * Wilfried, pour ne pas dupliquer verbatim la même histoire pour deux
 * couples différents).
 */
export const LAO_HISTOIRE_TEXT =
  'Comme dans un film, tout a commencé par un regard qui s’attarde un peu trop longtemps. Puis une scène, une autre, et cette certitude tranquille : c’est cette histoire-là que nous voulions vivre. Aujourd’hui le rideau se lève sur le plus beau des chapitres.'
export const LAO_HISTOIRE_KEYWORDS = ['regard', 'certitude', 'histoire', 'rideau']

/**
 * Mêmes 3 questions génériques que pour Edwige & Wilfried (logistique
 * couple-agnostique, cf. edwigeWilfriedEffects.tsx pour la même remarque),
 * réponses adaptées au lieu de ce couple (Le Caillavet). Provisoire —
 * à ajuster dès que le couple confirme le contenu réel.
 */
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

/**
 * Dérivées du dress code textuel « Rouge et noir » (DRESS_CODE ci-dessus)
 * — 2 teintes, pas 3 : pas de 3e couleur inventée juste pour matcher la
 * mise en page à 3 pastilles d'Edwige & Wilfried. Rouge = leur accent déjà
 * établi (CINEMA_ROUGE_THEME.accent), noir = teinte neutre proche de leur
 * fond de page plutôt qu'un noir pur qui aurait disparu dessus.
 */
export const LAO_DRESS_CODE_COLORS = ['#8B1E28', '#1A1512']

/** Photo du lieu (Le Caillavet) au-dessus de la carte dynamique dans « Le Lieu » — fournie par le couple. */
export const VENUE_PHOTO = '/lea-olivier-lieu-photo.jpg'

/**
 * Galerie de « Notre histoire » — 3 photos fournies par le couple.
 * Résolution modeste (~283px de large, capture de vignette) — image un
 * peu douce à l'affichage plein cadre (jusqu'à 72vh) sur grand écran,
 * cf. remarque faite au couple ; à remplacer par des fichiers en plus
 * haute résolution si disponibles.
 */
export const GALLERY_PHOTOS = ['/lea-olivier-gallery-1.jpg', '/lea-olivier-gallery-2.jpg', '/lea-olivier-gallery-3.jpg']
