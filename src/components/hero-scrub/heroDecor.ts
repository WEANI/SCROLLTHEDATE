import { useEffect } from 'react'
import type { TemplateHeroChapter } from '@contracts/saveTheDateTemplates'
import type { HeroChapter } from './types'

/**
 * Bibliothèque de décors du hero — piochée dans les 2 fichiers de référence
 * fournis le 10/09/2026 (overlays-graphiques.html, polices-overlay.html) :
 * un sous-ensemble curaté plutôt que l'intégralité (~100 polices, formules
 * d'annonce toutes faites, comptes à rebours…) — les formules d'annonce
 * elles-mêmes n'ont pas besoin d'un système dédié, le texte libre des
 * cartes personnalisées (cf. CustomCardsEditor, StudioPanel.tsx) les couvre
 * déjà telles quelles (copier-coller la formule voulue dans une carte).
 *
 * Piloté depuis Studio → Palette & Hero → "Texte overlay du hero" :
 * `heroOverlayGraphic` (décor graphique, cf. HERO_OVERLAY_GRAPHICS) et
 * `heroFontId` (police du titre, cf. HERO_FONTS) sur BespokePalette.
 */

/**
 * Décors graphiques sans texte, superposables au hero — CSS porté de
 * overlays-graphiques.html (classes renommées `hs-ov-*`, préfixe du fichier
 * cf. hero-scrub.css). Exclus volontairement : les indices de scroll
 * (souris, flèche, ligne pointillée) qui feraient doublon avec le "Scroll"
 * déjà affiché par HeroScrub.tsx, et la barre de progression/vague qui ne
 * sont pas des décors mais des éléments d'interface.
 */
export const HERO_OVERLAY_GRAPHICS: { id: string; label: string }[] = [
  { id: 'corners', label: "Crochets d'angle" },
  { id: 'dots', label: 'Grille de points' },
  { id: 'cross', label: 'Croix dispersées' },
  { id: 'ring', label: 'Anneau pointillé rotatif' },
  { id: 'pulse', label: 'Onde sonar' },
  { id: 'orb', label: 'Halos lumineux flous' },
  { id: 'noise', label: 'Grain / texture' },
  { id: 'vignette', label: 'Vignette (assombrit les bords)' },
  { id: 'shapes', label: 'Formes flottantes' },
  { id: 'diagonal', label: 'Lignes diagonales' },
  { id: 'arc', label: 'Arc de cercle en coin' },
  { id: 'sparkle', label: 'Étoiles scintillantes' },
  // Ajoutés le 11/09/2026 — bibliothèque "mariage" (cf. artifact proposé le
  // même jour, tous les identifiants ci-dessous reprennent ceux proposés).
  { id: 'heart-line', label: 'Cœur au trait' },
  { id: 'rings', label: 'Alliances entrelacées' },
  { id: 'dove', label: 'Colombe' },
  { id: 'floral-corner', label: 'Cadre floral' },
  { id: 'petals-fall', label: 'Pétales qui tombent' },
  { id: 'confetti-fall', label: 'Confettis' },
  { id: 'ribbon', label: 'Ruban noué' },
  { id: 'monogram-frame', label: 'Cadre monogramme' },
  { id: 'heart-pulse', label: 'Cœur qui bat' },
  { id: 'calligraphy-swash', label: 'Paraphe calligraphié' },
  { id: 'shooting-stars', label: 'Étoiles filantes' },
  { id: 'laurel', label: 'Branche de laurier' },
  { id: 'infinity', label: 'Symbole infini' },
  { id: 'candles', label: 'Bougies' },
  { id: 'bouquet', label: 'Bouquet' },
  { id: 'birds-pair', label: 'Oiseaux face à face' },
  { id: 'lace-border', label: 'Bordure dentelle' },
  { id: 'butterfly', label: 'Papillon' },
  { id: 'wreath', label: 'Couronne florale' },
  { id: 'moon-stars', label: 'Lune & étoiles' },
]

export interface HeroFontOption {
  id: string
  label: string
  category: string
  /** Valeur CSS complète (famille + repli), posée sur `--hs-font-family`. */
  fontFamily: string
  /** Paramètre `family=` de l'URL Google Fonts (poids/italique inclus si besoin), cf. FairePart.tsx qui charge UNIQUEMENT la police choisie par ce projet, jamais les autres. */
  googleFontsFamily: string
  italic?: boolean
}

/**
 * Polices du TITRE du hero uniquement (segments — prénoms, "Save the
 * date"…) — pas de l'eyebrow/lead/sub, qui restent dans les polices du
 * site : un pairing titre+label complet aurait doublé la complexité pour
 * un gain marginal, cf. doc du champ `heroFontId` dans BespokePalette.
 */
export const HERO_FONTS: HeroFontOption[] = [
  { id: 'anton', label: 'Anton', category: "Titres d'impact", fontFamily: "'Anton', Impact, sans-serif", googleFontsFamily: 'Anton' },
  { id: 'bebas', label: 'Bebas Neue', category: "Titres d'impact", fontFamily: "'Bebas Neue', sans-serif", googleFontsFamily: 'Bebas+Neue' },
  { id: 'archivo-black', label: 'Archivo Black', category: "Titres d'impact", fontFamily: "'Archivo Black', sans-serif", googleFontsFamily: 'Archivo+Black' },
  { id: 'syne', label: 'Syne', category: "Titres d'impact", fontFamily: "'Syne', sans-serif", googleFontsFamily: 'Syne:wght@800' },
  { id: 'playfair', label: 'Playfair Display', category: 'Serifs éditoriaux', fontFamily: "'Playfair Display', Georgia, serif", googleFontsFamily: 'Playfair+Display:ital@1', italic: true },
  { id: 'cormorant-garamond', label: 'Cormorant Garamond', category: 'Serifs éditoriaux', fontFamily: "'Cormorant Garamond', Georgia, serif", googleFontsFamily: 'Cormorant+Garamond:ital@1', italic: true },
  { id: 'libre-caslon', label: 'Libre Caslon Text', category: 'Serifs éditoriaux', fontFamily: "'Libre Caslon Text', Georgia, serif", googleFontsFamily: 'Libre+Caslon+Text' },
  { id: 'cinzel', label: 'Cinzel', category: 'Luxe & classique', fontFamily: "'Cinzel', Georgia, serif", googleFontsFamily: 'Cinzel' },
  { id: 'marcellus', label: 'Marcellus', category: 'Luxe & classique', fontFamily: "'Marcellus', Georgia, serif", googleFontsFamily: 'Marcellus' },
  { id: 'italiana', label: 'Italiana', category: 'Luxe & classique', fontFamily: "'Italiana', Georgia, serif", googleFontsFamily: 'Italiana' },
  { id: 'great-vibes', label: 'Great Vibes', category: 'Calligraphies mariage', fontFamily: "'Great Vibes', cursive", googleFontsFamily: 'Great+Vibes' },
  { id: 'alex-brush', label: 'Alex Brush', category: 'Calligraphies mariage', fontFamily: "'Alex Brush', cursive", googleFontsFamily: 'Alex+Brush' },
  { id: 'allura', label: 'Allura', category: 'Calligraphies mariage', fontFamily: "'Allura', cursive", googleFontsFamily: 'Allura' },
  { id: 'parisienne', label: 'Parisienne', category: 'Calligraphies mariage', fontFamily: "'Parisienne', cursive", googleFontsFamily: 'Parisienne' },
  { id: 'sacramento', label: 'Sacramento', category: 'Calligraphies mariage', fontFamily: "'Sacramento', cursive", googleFontsFamily: 'Sacramento' },
  { id: 'dancing-script', label: 'Dancing Script', category: 'Calligraphies mariage', fontFamily: "'Dancing Script', cursive", googleFontsFamily: 'Dancing+Script' },
  { id: 'cinzel-decorative', label: 'Cinzel Decorative', category: 'Calligraphies mariage', fontFamily: "'Cinzel Decorative', serif", googleFontsFamily: 'Cinzel+Decorative' },
  { id: 'eb-garamond', label: 'EB Garamond', category: 'Serifs formels', fontFamily: "'EB Garamond', Georgia, serif", googleFontsFamily: 'EB+Garamond:ital@1', italic: true },
  { id: 'cormorant', label: 'Cormorant', category: 'Serifs formels', fontFamily: "'Cormorant', Georgia, serif", googleFontsFamily: 'Cormorant:ital@1', italic: true },
  // Ajoutées le 11/09/2026 — bibliothèque "mariage".
  { id: 'mrs-saint-delafield', label: 'Mrs Saint Delafield', category: 'Calligraphies mariage', fontFamily: "'Mrs Saint Delafield', cursive", googleFontsFamily: 'Mrs+Saint+Delafield' },
  { id: 'yellowtail', label: 'Yellowtail', category: 'Calligraphies mariage', fontFamily: "'Yellowtail', cursive", googleFontsFamily: 'Yellowtail' },
  { id: 'windsong', label: 'WindSong', category: 'Calligraphies mariage', fontFamily: "'WindSong', cursive", googleFontsFamily: 'WindSong' },
  { id: 'playball', label: 'Playball', category: 'Calligraphies mariage', fontFamily: "'Playball', cursive", googleFontsFamily: 'Playball' },
  { id: 'qwigley', label: 'Qwigley', category: 'Calligraphies mariage', fontFamily: "'Qwigley', cursive", googleFontsFamily: 'Qwigley' },
  { id: 'herr-von-muellerhoff', label: 'Herr Von Muellerhoff', category: 'Calligraphies mariage', fontFamily: "'Herr Von Muellerhoff', cursive", googleFontsFamily: 'Herr+Von+Muellerhoff' },
  { id: 'miss-fajardose', label: 'Miss Fajardose', category: 'Calligraphies mariage', fontFamily: "'Miss Fajardose', cursive", googleFontsFamily: 'Miss+Fajardose' },
  { id: 'bonheur-royale', label: 'Bonheur Royale', category: 'Calligraphies mariage', fontFamily: "'Bonheur Royale', cursive", googleFontsFamily: 'Bonheur+Royale' },
  { id: 'beau-rivage', label: 'Beau Rivage', category: 'Calligraphies mariage', fontFamily: "'Beau Rivage', cursive", googleFontsFamily: 'Beau+Rivage' },
  { id: 'whisper', label: 'Whisper', category: 'Calligraphies mariage', fontFamily: "'Whisper', cursive", googleFontsFamily: 'Whisper' },
  { id: 'ballet', label: 'Ballet', category: 'Calligraphies mariage', fontFamily: "'Ballet', cursive", googleFontsFamily: 'Ballet' },
  { id: 'berkshire-swash', label: 'Berkshire Swash', category: 'Calligraphies mariage', fontFamily: "'Berkshire Swash', cursive", googleFontsFamily: 'Berkshire+Swash' },
  { id: 'kristi', label: 'Kristi', category: 'Calligraphies mariage', fontFamily: "'Kristi', cursive", googleFontsFamily: 'Kristi' },
  { id: 'norican', label: 'Norican', category: 'Calligraphies mariage', fontFamily: "'Norican', cursive", googleFontsFamily: 'Norican' },
  { id: 'courgette', label: 'Courgette', category: 'Calligraphies mariage', fontFamily: "'Courgette', cursive", googleFontsFamily: 'Courgette' },
  { id: 'julee', label: 'Julee', category: 'Calligraphies mariage', fontFamily: "'Julee', cursive", googleFontsFamily: 'Julee' },
]

export function getHeroFont(id: string | undefined): HeroFontOption | null {
  if (!id) return null
  return HERO_FONTS.find((f) => f.id === id) ?? null
}

/**
 * Animation d'apparition des blocs de texte overlay — réglage HERO-WIDE par
 * défaut (`HeroScrub`'s `textAnimation` prop, cf. FairePart.tsx), mais
 * DÉSORMAIS aussi surchargeable PAR BLOC (`HeroChapter.textAnimation`/
 * `HeroCustomCard.textAnimation`, cf. échange du 21/09/2026 : "je dois
 * pouvoir choisir les animations pour chaque bloc") — vide sur un bloc =
 * retombe sur le réglage hero-wide, comportement historique inchangé pour
 * tout projet qui ne personnalise aucun bloc. 'fade' (identifiant vide) =
 * comportement historique inchangé (le fondu + léger glissement déjà posé
 * par `.hs-overlay`/`.hs-overlay.show` dans hero-scrub.css) — les autres
 * AJOUTENT une classe modificatrice sur ce même conteneur (cf. `.hs-anim-*`).
 */
export const HERO_TEXT_ANIMATIONS: { id: string; label: string }[] = [
  { id: 'typewriter', label: 'Machine à écrire' },
  { id: 'ink-reveal', label: 'Encre qui se fixe' },
  { id: 'curtain', label: 'Rideau' },
  { id: 'soft-zoom', label: 'Zoom doux' },
  { id: 'letter-drop', label: 'Lettres qui tombent' },
  { id: 'underline-draw', label: 'Trait souligné' },
  { id: 'bloom', label: 'Éclosion' },
  { id: 'shimmer', label: 'Reflet doré' },
  { id: 'petals-in', label: 'Pétales dispersés' },
  { id: 'unfold', label: 'Dépliage' },
  { id: 'handwrite', label: 'Écriture manuscrite' },
  // Ajoutées le 21/09/2026 — cf. maquette "Cadres & Animations Texte".
  { id: 'slide', label: 'Glissement latéral' },
  { id: 'glow', label: 'Halo pulsé' },
  { id: 'focus', label: 'Mise au point' },
  { id: 'wave', label: 'Cascade en vague' },
  { id: 'elastic', label: 'Élastique' },
  { id: 'flicker', label: 'Scintillement' },
  { id: 'wipe', label: 'Effacement latéral' },
  { id: 'breathe', label: 'Respiration continue' },
  // Ajoutées le 21/09/2026 (2e vague) — cf. bibliothèque "cadres &
  // animations" fournie le même jour. Les entrées redondantes avec les
  // 19 ci-dessus (machine à écrire en boucle, flou, reflet doré au survol…)
  // n'ont volontairement pas été reprises.
  { id: 'fade-up', label: 'Fondu montant' },
  { id: 'reveal-lines', label: 'Révélation par ligne' },
  { id: 'gradient-shift', label: 'Couleurs en mouvement' },
  { id: 'tracking-breathe', label: 'Respiration des lettres' },
  { id: 'letter-pop', label: 'Rebond lettre par lettre' },
  { id: 'attention-wiggle', label: "Tremblement d'attention" },
]

/**
 * Cadre décoratif autour d'UN bloc de texte (`.hs-card`) — par chapitre,
 * contrairement à `HERO_FILTERS` (un seul réglage pour tout le hero) : un
 * cadre habille un bloc précis, pas la scène entière, même raisonnement que
 * `textColorOverride`/`cardBgOverride`. Ajoutée le 21/09/2026, cf. maquette
 * "Cadres & Animations Texte".
 */
export const HERO_CARD_FRAMES: { id: string; label: string }[] = [
  { id: 'double-rule', label: 'Double liseré doré' },
  { id: 'floral-corners', label: 'Coins fleuris' },
  { id: 'ribbon-flag', label: 'Ruban banderole' },
  { id: 'wax-seal', label: 'Cachet de cire' },
  { id: 'laurel', label: 'Laurier encadrant' },
  { id: 'art-deco', label: 'Pointillés Art déco' },
  { id: 'swash', label: 'Paraphe calligraphié' },
  { id: 'lace', label: 'Cadre ajouré (dentelle)' },
  // Ajoutés le 21/09/2026 (2e vague) — cf. bibliothèque "cadres &
  // animations" fournie le même jour. Adaptés au survol (`:hover`, sans
  // effet sur une vidéo non interactive) en effets déclenchés à
  // l'apparition du bloc ; le cadre circulaire (forme fixe) et les entrées
  // trop proches de "Double liseré doré"/"Coins fleuris" n'ont pas été
  // repris.
  { id: 'offset-frame', label: 'Cadre décalé' },
  { id: 'dashed-march', label: 'Pointillés en marche' },
  { id: 'gradient-frame', label: 'Cadre dégradé animé' },
  { id: 'draw-in', label: 'Cadre qui se dessine' },
  { id: 'notch', label: 'Coins coupés' },
  { id: 'pulse-glow', label: 'Halo de cadre pulsant' },
]

export interface HeroDateFormatOption {
  id: string
  label: string
  /** Exemple affiché dans le sélecteur admin — date fixe (12 juin 2027, même convention que EXAMPLE_DATE dans contracts/saveTheDateTemplates.ts), indépendante de la date réellement en cours d'édition. */
  example: string
  /** Texte sur UNE ligne — seul rendu possible sous les prénoms (`subLines`) ; sert aussi de repli quand `layout` est défini. */
  format: (d: Date) => string
  /**
   * Mise en page multi-lignes (jusqu'à 4 lignes, chacune avec sa
   * taille/police, cf. `.hs-dl-*` dans hero-scrub.css) — rendue à la place
   * du texte simple dans un bloc "date" indépendant uniquement. Repris du
   * fichier de référence polices-overlay.html (Dates XXL, Dates format
   * américain, Mono & technique), cf. échange du 23/09/2026.
   */
  layout?: { fonts: string; lines: (d: Date) => HeroDateLine[] }
}

/** Une ligne d'une mise en page de date : `cls` = rôle ('l1'…'l4') stylé par `.hs-dl-<id> .hs-dl-<cls>`. */
export interface HeroDateLine {
  cls: 'l1' | 'l2' | 'l3' | 'l4'
  text: string
}

/** Mise en page de date prête à afficher — cf. `HeroChapter.dateLayout` (types.ts). */
export interface HeroDateLayout {
  id: string
  lines: HeroDateLine[]
  /** Paramètres `family=` Google Fonts, séparés par `&family=` déjà formatés — chargés à l'affichage par HeroDateBlocks.tsx. */
  fonts: string
}

const capitalizeFirst = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

// ---- nombres en toutes lettres (français) — jour (1-31) + reste de
// l'année (0-99), cf. `yearWordsFr`/format 'spelled-out' plus bas. Couvre
// les 100 cas 0-99 (irrégularités "soixante-dix"/"quatre-vingt(s)"
// incluses) ; limité à ce dont un jour/une année de mariage a besoin.
const UNITS_FR = [
  'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
  'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
]
const TENS_FR: Record<number, string> = { 20: 'vingt', 30: 'trente', 40: 'quarante', 50: 'cinquante', 60: 'soixante' }

function numberWordsFr(n: number): string {
  if (n <= 16) return UNITS_FR[n]
  if (n < 20) return `dix-${UNITS_FR[n - 10]}`
  if (n < 70) {
    const tensBase = Math.floor(n / 10) * 10
    const unit = n % 10
    const tensWord = TENS_FR[tensBase]
    if (unit === 0) return tensWord
    if (unit === 1) return `${tensWord} et un`
    return `${tensWord}-${UNITS_FR[unit]}`
  }
  if (n < 80) {
    // 70-79 : "soixante" + dix..dix-neuf (pas de mot dédié pour 70+).
    const unit = n - 60
    return unit === 11 ? 'soixante et onze' : `soixante-${numberWordsFr(unit)}`
  }
  if (n === 80) return 'quatre-vingts'
  if (n < 90) return `quatre-vingt-${UNITS_FR[n - 80]}`
  // 90-99 : "quatre-vingt" + dix..dix-neuf, même irrégularité que 70-79.
  return `quatre-vingt-${numberWordsFr(n - 80)}`
}

/** Vide (mariage réaliste : 2000-2099) — repli numérique au-delà plutôt qu'un algorithme non couvert. */
function yearWordsFr(year: number): string {
  if (year < 2000 || year > 2099) return String(year)
  const rest = year - 2000
  return rest === 0 ? 'deux mille' : `deux mille ${numberWordsFr(rest)}`
}

// ---- chiffres romains (jour/mois/année) — cf. formats 'roman-numerals'/
// 'roman-year' plus bas.
const ROMAN_VALUES: [number, string][] = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
]
function toRoman(n: number): string {
  let out = ''
  let rest = n
  for (const [value, symbol] of ROMAN_VALUES) {
    while (rest >= value) {
      out += symbol
      rest -= value
    }
  }
  return out
}

function ordinalSuffixEn(n: number): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return 'th'
  switch (n % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
}

/**
 * Styles d'affichage de la date du mariage dans le hero d'un Save the Date
 * "sur un modèle" — bibliothèque ajoutée le 23/09/2026 (cf. échange
 * "bibliothèque des formats de date"), même principe que HERO_FONTS/
 * HERO_CARD_FRAMES/etc. ci-dessus : id vide/inconnu = format historique
 * inchangé (repli codé en dur dans FairePart.tsx — cf. `getHeroDateFormat`
 * plus bas — jamais dupliqué ici). Reprend les formats de date du fichier
 * de référence `polices-overlay.html` (sections "Dates mariage"/"Dates
 * format américain"/"Dates XXL", fourni le 23/09/2026) — chaque entrée
 * ci-dessous cite la classe CSS d'origine dont elle reprend le texte, à
 * l'exception des traitements purement typographiques/décoratifs
 * (calligraphie géante, ornements, multi-lignes) déjà couverts par les
 * réglages Police/Cadre/Taille de chaque bloc, pas par un "format" de
 * texte. Volontairement mêlé français/anglais (le fichier de référence
 * propose les deux, cf. sa section "Annonces de mariage — versions
 * anglaises") — jamais lié à la langue de l'interface (`useLanguage`),
 * choisi une fois pour toutes par l'admin comme les autres réglages de ce
 * modèle.
 */
const TEXT_DATE_FORMATS: HeroDateFormatOption[] = [
  {
    // .a-date / .date-wed-lines (jour de la semaine complet)
    id: 'weekday-full',
    label: 'Jour complet',
    example: 'Samedi 12 juin 2027',
    format: (d) =>
      capitalizeFirst(
        new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d),
      ),
  },
  {
    // .date-wed-lines / .a-letdate / .a-mots ("douze juin deux mille vingt-sept")
    id: 'spelled-out',
    label: 'En toutes lettres',
    example: 'Samedi douze juin deux mille vingt-sept',
    format: (d) => {
      const weekday = capitalizeFirst(new Intl.DateTimeFormat('fr-FR', { weekday: 'long' }).format(d))
      const day = numberWordsFr(d.getDate())
      const month = new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(d)
      const year = yearWordsFr(d.getFullYear())
      return `${weekday} ${day} ${month} ${year}`
    },
  },
  {
    // "date romaine mixte" (XII · VI) — année en romain plutôt qu'en toutes lettres, pour rester sur une seule ligne.
    id: 'roman-numerals',
    label: 'Chiffres romains',
    example: 'XII · VI · MMXXVII',
    format: (d) => `${toRoman(d.getDate())} · ${toRoman(d.getMonth() + 1)} · ${toRoman(d.getFullYear())}`,
  },
  {
    // .date-roman ("MMXXVI") — année seule, en romain.
    id: 'roman-year',
    label: 'Année en chiffres romains',
    example: 'MMXXVII',
    format: (d) => toRoman(d.getFullYear()),
  },
  {
    // .ticket .t-date ("12 JUIN 2027")
    id: 'caps-month',
    label: 'Mois en majuscules',
    example: '12 JUIN 2027',
    format: (d) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(d).toUpperCase(),
  },
  {
    // .stamp .s-date / .date-wed-spaced (esprit "12 · JUIN · 2027")
    id: 'spaced-caps',
    label: 'Espacé & majuscules',
    example: '12 · JUIN · 2027',
    format: (d) => {
      const day = new Intl.DateTimeFormat('fr-FR', { day: 'numeric' }).format(d)
      const month = new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(d).toUpperCase()
      const year = new Intl.DateTimeFormat('fr-FR', { year: 'numeric' }).format(d)
      return `${day} · ${month} · ${year}`
    },
  },
  {
    // .date-serif ("12.10.26"), ici sur 4 chiffres — cf. 'compact-year2' pour la variante courte.
    id: 'numeric-dot',
    label: 'Numérique (.)',
    example: '12.06.2027',
    format: (d) =>
      new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d).replace(/\//g, '.'),
  },
  {
    // .date-serif ("12.10.26") — année sur 2 chiffres, forme la plus compacte du fichier de référence.
    id: 'compact-year2',
    label: 'Compact, année courte',
    example: '12.06.27',
    format: (d) =>
      new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(d).replace(/\//g, '.'),
  },
  {
    // Ordre français (jour/mois/année) — le fichier de référence ne montre que l'ordre américain (cf. 'us-slash'), ajouté pour l'ordre attendu en France.
    id: 'numeric-slash-fr',
    label: 'Numérique (/), ordre FR',
    example: '12/06/2027',
    format: (d) => new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d),
  },
  {
    // .date-us-serif ("June 12th, 2027")
    id: 'us-ordinal',
    label: 'Anglais, avec ordinal',
    example: 'June 12th, 2027',
    format: (d) => {
      const month = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(d)
      const day = d.getDate()
      return `${month} ${day}${ordinalSuffixEn(day)}, ${d.getFullYear()}`
    },
  },
  {
    // .date-us-slash ("06/12/2027") — ordre américain (mois/jour/année).
    id: 'us-slash',
    label: 'Numérique (/), ordre US',
    example: '06/12/2027',
    format: (d) => `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`,
  },
]

const pad2 = (n: number) => String(n).padStart(2, '0')
const monthFr = (d: Date) => new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(d)
const weekdayFr = (d: Date) => capitalizeFirst(new Intl.DateTimeFormat('fr-FR', { weekday: 'long' }).format(d))
const monthEn = (d: Date) => new Intl.DateTimeFormat('en-US', { month: 'long' }).format(d)
const weekdayEn = (d: Date) => new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(d)

/** Mises en page multi-lignes — ajoutées à HERO_DATE_FORMATS ci-dessous. */
const DATE_LAYOUT_FORMATS: HeroDateFormatOption[] = [
  {
    id: 'xxl',
    label: 'Chiffre géant (3 lignes)',
    example: '12 / OCTOBRE / 2026',
    format: (d) => `${d.getDate()} ${monthFr(d).toUpperCase()} ${d.getFullYear()}`,
    layout: {
      fonts: 'Anton&family=Oswald:wght@300&family=JetBrains+Mono:wght@300',
      lines: (d) => [
        { cls: 'l1', text: String(d.getDate()) },
        { cls: 'l2', text: monthFr(d) },
        { cls: 'l3', text: String(d.getFullYear()) },
      ],
    },
  },
  {
    id: 'stack',
    label: 'Empilé massif (3 lignes)',
    example: '12 / OCTOBRE / 2026',
    format: (d) => `${d.getDate()} ${monthFr(d).toUpperCase()} ${d.getFullYear()}`,
    layout: {
      fonts: 'Anton&family=JetBrains+Mono:wght@300',
      lines: (d) => [
        { cls: 'l1', text: String(d.getDate()) },
        { cls: 'l2', text: monthFr(d) },
        { cls: 'l3', text: String(d.getFullYear()) },
      ],
    },
  },
  {
    id: 'bebas',
    label: 'Condensé + année en lettres (2 lignes)',
    example: '12 Octobre / Deux mille vingt-six',
    format: (d) => `${d.getDate()} ${capitalizeFirst(monthFr(d))} ${d.getFullYear()}`,
    layout: {
      fonts: 'Bebas+Neue&family=Space+Mono',
      lines: (d) => [
        { cls: 'l1', text: `${d.getDate()} ${capitalizeFirst(monthFr(d))}` },
        { cls: 'l2', text: capitalizeFirst(yearWordsFr(d.getFullYear())) },
      ],
    },
  },
  {
    id: 'roman-mixed',
    label: 'Romain mixte (3 lignes)',
    example: 'Samedi / XII · VI / deux mille vingt-sept',
    format: (d) => `${toRoman(d.getDate())} · ${toRoman(d.getMonth() + 1)} · ${toRoman(d.getFullYear())}`,
    layout: {
      fonts: 'EB+Garamond:ital@1&family=Cinzel+Decorative&family=Montserrat:wght@300',
      lines: (d) => [
        { cls: 'l1', text: weekdayFr(d) },
        { cls: 'l2', text: `${toRoman(d.getDate())} · ${toRoman(d.getMonth() + 1)}` },
        { cls: 'l3', text: yearWordsFr(d.getFullYear()) },
      ],
    },
  },
  {
    id: 'wed-lines',
    label: 'Toutes lettres, italique (2 lignes)',
    example: 'Samedi douze juin / deux mille vingt-sept',
    format: (d) => `${weekdayFr(d)} ${numberWordsFr(d.getDate())} ${monthFr(d)} ${yearWordsFr(d.getFullYear())}`,
    layout: {
      fonts: 'Cormorant:ital,wght@1,300',
      lines: (d) => [
        { cls: 'l1', text: `${weekdayFr(d)} ${numberWordsFr(d.getDate())} ${monthFr(d)}` },
        { cls: 'l2', text: yearWordsFr(d.getFullYear()) },
      ],
    },
  },
  {
    id: 'us-stack',
    label: 'Américain empilé (3 lignes)',
    example: '06 · 12 / JUNE / 2027',
    format: (d) => `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}/${d.getFullYear()}`,
    layout: {
      fonts: 'Anton&family=JetBrains+Mono:wght@300',
      lines: (d) => [
        { cls: 'l1', text: `${pad2(d.getMonth() + 1)} · ${pad2(d.getDate())}` },
        { cls: 'l2', text: monthEn(d) },
        { cls: 'l3', text: String(d.getFullYear()) },
      ],
    },
  },
  {
    id: 'us-card',
    label: 'Américain carte verticale (4 lignes)',
    example: 'Saturday / June / 12th / 2027',
    format: (d) => `${monthEn(d)} ${d.getDate()}${ordinalSuffixEn(d.getDate())}, ${d.getFullYear()}`,
    layout: {
      fonts: 'Montserrat:wght@300&family=Cinzel&family=Anton&family=JetBrains+Mono:wght@300',
      lines: (d) => [
        { cls: 'l1', text: weekdayEn(d) },
        { cls: 'l2', text: monthEn(d) },
        { cls: 'l3', text: `${d.getDate()}${ordinalSuffixEn(d.getDate())}` },
        { cls: 'l4', text: String(d.getFullYear()) },
      ],
    },
  },
  {
    id: 'us-slash-big',
    label: 'Américain massif + jour (2 lignes)',
    example: '06/12/2027 / Saturday',
    format: (d) => `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}/${d.getFullYear()}`,
    layout: {
      fonts: 'Anton&family=Montserrat:wght@300',
      lines: (d) => [
        { cls: 'l1', text: `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}/${d.getFullYear()}` },
        { cls: 'l2', text: weekdayEn(d) },
      ],
    },
  },
  {
    id: 'us-mono',
    label: 'Américain mono (1 ligne)',
    example: '06 · 12 · 2027',
    format: (d) => `${pad2(d.getMonth() + 1)} · ${pad2(d.getDate())} · ${d.getFullYear()}`,
    layout: {
      fonts: 'Space+Mono',
      lines: (d) => [{ cls: 'l1', text: `${pad2(d.getMonth() + 1)} · ${pad2(d.getDate())} · ${d.getFullYear()}` }],
    },
  },
  {
    id: 'us-mini',
    label: 'Américain court, événement (1 ligne)',
    example: 'SAT · 06 / 12 / 27',
    format: (d) => `${weekdayEn(d).slice(0, 3)} · ${pad2(d.getMonth() + 1)} / ${pad2(d.getDate())} / ${pad2(d.getFullYear() % 100)}`,
    layout: {
      fonts: 'Oswald:wght@300;500',
      lines: (d) => [
        { cls: 'l1', text: `${weekdayEn(d).slice(0, 3)} · ${pad2(d.getMonth() + 1)} / ${pad2(d.getDate())} / ${pad2(d.getFullYear() % 100)}` },
      ],
    },
  },
  // Mono & technique — même date, 6 polices du fichier de référence, avec
  // filet de chaque côté (eyebrow) — cf. `.hs-dl-mono-*` dans hero-scrub.css.
  ...(
    [
      ['mono-space', 'Mono — Space Mono', 'Space+Mono'],
      ['mono-jb', 'Mono — JetBrains Mono Light', 'JetBrains+Mono:wght@300'],
      ['mono-plex', 'Mono — IBM Plex Mono', 'IBM+Plex+Mono:wght@300'],
      ['mono-grotesk', 'Technique — Space Grotesk Light', 'Space+Grotesk:wght@300'],
      ['mono-outfit', 'Technique — Outfit ExtraLight', 'Outfit:wght@200'],
      ['mono-sora', 'Technique — Sora ExtraLight', 'Sora:wght@200'],
    ] as const
  ).map(
    ([id, label, fonts]): HeroDateFormatOption => ({
      id,
      label,
      example: '12 · JUIN · 2027',
      format: (d) => `${d.getDate()} · ${monthFr(d).toUpperCase()} · ${d.getFullYear()}`,
      layout: {
        fonts,
        lines: (d) => [{ cls: 'l1', text: `${d.getDate()} · ${monthFr(d).toUpperCase()} · ${d.getFullYear()}` }],
      },
    }),
  ),
]

/** Bibliothèque complète (formats texte sur une ligne + mises en page multi-lignes) — cf. `layout` sur HeroDateFormatOption. */
export const HERO_DATE_FORMATS: HeroDateFormatOption[] = [...TEXT_DATE_FORMATS, ...DATE_LAYOUT_FORMATS]

/** Styles de compte à rebours du hero — repris du fichier de référence polices-overlay.html ("Comptes à rebours"). */
export const HERO_COUNTDOWN_STYLES: { id: string; label: string; fonts: string }[] = [
  { id: 'boxes', label: 'Boîtes avec liseré (le plus lisible)', fonts: 'JetBrains+Mono:wght@300' },
  { id: 'anton', label: 'Impact maximum', fonts: 'Anton' },
  { id: 'serif', label: 'Éditorial, sans secondes', fonts: 'Playfair+Display:ital@1' },
  { id: 'minimal', label: 'Ligne fine, mariage/luxe', fonts: 'JetBrains+Mono:wght@300' },
]

/**
 * Applique le format de date choisi (`dateFormatId`, posé par applyOverride)
 * aux chapitres d'un modèle pour la page d'aperçu générique — date d'exemple
 * fixe (12 juin 2027). Bloc "date" : mise en page multi-lignes si le format
 * en a une, sinon texte formaté ; sous les prénoms : texte formaté (une
 * ligne). Sans `dateFormatId`, chapitre inchangé (date d'exemple libre).
 */
export function resolveDateFormatsInChapters(chapters: TemplateHeroChapter[]): HeroChapter[] {
  const example = new Date(2027, 5, 12)
  return chapters.map((ch) => {
    const fmt = getHeroDateFormat(ch.dateFormatId)
    if (!fmt) return ch as HeroChapter
    if (ch.dateSlot === 'block') {
      return fmt.layout
        ? ({ ...ch, segments: undefined, dateLayout: { id: fmt.id, fonts: fmt.layout.fonts, lines: fmt.layout.lines(example) } } as HeroChapter)
        : ({ ...ch, segments: [{ text: fmt.format(example) }] } as HeroChapter)
    }
    if (ch.dateSlot === 'sub' && ch.subLines) return { ...ch, subLines: [fmt.format(example)] } as HeroChapter
    return ch as HeroChapter
  })
}

/** Charge (une seule fois par jeu de familles) des polices Google Fonts — cf. HeroDateBlocks.tsx. */
export function ensureGoogleFamilies(families: string) {
  const key = families
  if (document.querySelector(`link[data-hero-families="${key}"]`)) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${families}&display=swap`
  link.dataset.heroFamilies = key
  document.head.appendChild(link)
}

export function getHeroDateFormat(id: string | undefined): HeroDateFormatOption | null {
  if (!id) return null
  return HERO_DATE_FORMATS.find((f) => f.id === id) ?? null
}

/**
 * Cadres pour une PHOTO CLIENT (9:16) — ajoutée le 22/09/2026, cf. CSS
 * `.hs-photo-frame-*` dans hero-scrub.css pour le détail de chaque classe.
 *
 * PAS ENCORE BRANCHÉE : préparée en avance pour un futur template Save the
 * Date permettant au client d'uploader sa propre photo (cf. échanges des
 * 11/09 et 21/09/2026 — ce chantier n'est pas lancé). Aucun champ
 * `photoUrl`/`photoFrame` n'existe encore sur HeroChapter/
 * TemplateHeroChapter/HeroCustomCard, donc ce catalogue n'est référencé
 * dans aucun sélecteur admin pour l'instant — contrairement à
 * HERO_CARD_FRAMES ci-dessus (cadres de CARTE DE TEXTE, déjà en
 * production), qu'il ne faut pas confondre : un `hs-frame-*` habille du
 * texte, un `hs-photo-frame-*` habillera une image.
 *
 * Toutes ces entrées attendent UNE photo, sauf `stack` (cf. sa doc dans
 * hero-scrub.css) qui en attend TROIS — un template proposant ce cadre
 * devra donc demander 3 clichés au client au lieu d'un seul (à prévoir le
 * jour de l'intégration, cf. échange du 22/09/2026).
 */
export const HERO_PHOTO_FRAMES: { id: string; label: string }[] = [
  { id: 'polaroid', label: 'Polaroid incliné' },
  { id: 'mat', label: 'Passe-partout double' },
  { id: 'museum', label: 'Cadre doré musée' },
  { id: 'crop', label: 'Repères de détourage' },
  { id: 'arch', label: 'Arche pleine' },
  { id: 'oval', label: 'Médaillon ovale' },
  { id: 'cut', label: 'Coin coupé en diagonale' },
  { id: 'ribbon', label: 'Accent de coin' },
  { id: 'tape', label: 'Scotch aux coins' },
  { id: 'film', label: 'Pellicule verticale' },
  { id: 'story', label: 'Anneau dégradé (story)' },
  { id: 'grad', label: 'Bordure dégradée animée' },
  { id: 'line', label: 'Filet fin + marge' },
  { id: 'vintage', label: 'Sépia + cadre crème' },
  { id: 'duotone-reveal', label: 'Noir & blanc vers couleur' },
  { id: 'curtain-reveal', label: 'Rideau de révélation' },
  { id: 'frame-reveal', label: 'Cadre blanc qui apparaît' },
  { id: 'float', label: 'Lévitation douce' },
  // Seule entrée à 3 photos plutôt qu'une (cf. doc plus haut) — ajoutée le
  // 22/09/2026 sur demande explicite malgré cette contrainte.
  { id: 'stack', label: 'Éventail de 3 photos' },
]

/**
 * Filtre visuel appliqué à la vidéo/aux frames du hero (`.hs-video`) — UN
 * pour tout le hero, cf. même raisonnement que HERO_TEXT_ANIMATIONS.
 * Aucun filtre par défaut (identifiant vide) = vidéo telle que livrée,
 * comportement inchangé.
 */
export const HERO_FILTERS: { id: string; label: string }[] = [
  { id: 'sepia', label: 'Sépia romantique' },
  { id: 'noir-blanc', label: 'Noir & blanc élégant' },
  { id: 'grain-cinema', label: 'Grain cinéma' },
  { id: 'vignette-chaude', label: 'Vignette chaude' },
  { id: 'flou-bordure', label: 'Flou de bordure' },
  { id: 'pastel-wash', label: 'Lavis pastel' },
  { id: 'heure-doree', label: 'Heure dorée' },
  { id: 'froid-romantique', label: 'Froid romantique' },
  { id: 'dreamy-glow', label: 'Halo lumineux' },
  { id: 'polaroid', label: 'Polaroid' },
  { id: 'moody-dark', label: 'Sombre & dramatique' },
  { id: 'champagne-tone', label: 'Ton champagne' },
]

/**
 * Charge dynamiquement la police choisie (Google Fonts) — UNIQUEMENT celle-
 * là, jamais les ~19 autres du catalogue (coût réseau nul pour tout projet
 * qui n'en utilise aucune). Utilisé à la fois par FairePart.tsx (page
 * publique) et StudioPanel.tsx (aperçu du champ au studio) — même chemin de
 * chargement, pas de risque de divergence entre ce que voit le studio et
 * ce que voit l'invité. Pas de nettoyage au démontage : un <link> déjà posé
 * ne coûte rien de plus (cache HTTP), et un autre endroit de la page peut
 * en avoir besoin en même temps (déduplication par `data-hero-font`).
 */
export function useGoogleFont(id: string | undefined) {
  useEffect(() => {
    const font = getHeroFont(id)
    if (!font) return
    if (document.querySelector(`link[data-hero-font="${font.id}"]`)) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${font.googleFontsFamily}&display=swap`
    link.dataset.heroFont = font.id
    document.head.appendChild(link)
  }, [id])
}

/**
 * Variante multi-polices de `useGoogleFont` ci-dessus — nécessaire depuis
 * que la police est surchargeable PAR BLOC (`HeroChapter.fontId`, cf.
 * échange du 21/09/2026) : un même hero peut désormais charger la police
 * hero-wide ET une police différente par bloc. Un seul effet pour toute la
 * liste (plutôt qu'un `useGoogleFont` par bloc, impossible côté React — le
 * nombre de blocs varie d'un projet à l'autre, hooks appelés en boucle
 * interdits) ; déduplication identique (attribut `data-hero-font`), un
 * `id` répété ou vide est ignoré sans coût.
 */
export function useGoogleFonts(ids: (string | undefined)[]) {
  // Clé de dépendance stable — un tableau de nouvelle référence à chaque
  // rendu ferait rejouer l'effet en boucle sans ce join.
  const key = ids.filter(Boolean).join(',')
  useEffect(() => {
    for (const id of key ? key.split(',') : []) {
      const font = getHeroFont(id)
      if (!font) continue
      if (document.querySelector(`link[data-hero-font="${font.id}"]`)) continue
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = `https://fonts.googleapis.com/css2?family=${font.googleFontsFamily}&display=swap`
      link.dataset.heroFont = font.id
      document.head.appendChild(link)
    }
  }, [key])
}
