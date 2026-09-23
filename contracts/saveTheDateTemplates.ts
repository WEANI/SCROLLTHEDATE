import type { BespokePaletteInput, HeroChapterTiming, HeroCustomCard, HeroVerticalAlign } from './bespokePalette'

/**
 * Bibliothèque de modèles Save the Date « sur un modèle » (99 €, cf.
 * SaveTheDateDigital.tsx) — le client choisit un montage déjà prêt plutôt
 * que de répondre à un questionnaire, ne renseigne que ses prénoms/sa date.
 * Chantier débloqué le 11/09/2026 par l'arrivée du premier vrai montage
 * (« Red Door »).
 *
 * Déplacé de src/data/ vers contracts/ le 12/09/2026 : ce catalogue doit
 * être importable À LA FOIS côté client (bibliothèque, aperçu, admin) ET
 * côté serveur (webhook Stripe, ordersRouter — cf. `buildFulfillmentData`
 * plus bas, qui transforme un modèle en contenu de projet réel une fois
 * une commande payée). `contracts/` est déjà la frontière partagée du
 * projet (cf. bespokePalette.ts, importé des deux côtés) ; `src/` est
 * exclu de la compilation serveur (tsconfig.server.json::include). D'où
 * `HeroTheme`/les chapitres redéfinis localement ci-dessous plutôt
 * qu'importés de src/components/hero-scrub/types.ts — mêmes formes,
 * structurellement compatibles avec les props de HeroScrub côté client.
 *
 * Le thème de chaque modèle est un objet `HeroTheme` autonome, PAS ajouté
 * au catalogue partagé de src/components/hero-scrub/themes.ts : ce
 * catalogue-là nourrit aussi le sélecteur d'ambiance du questionnaire pour
 * les vrais projets sur mesure, sans rapport avec ces modèles figés. Une
 * vraie commande passée sur un modèle n'a d'ailleurs pas besoin de ce
 * thème complet : FairePart.tsx bascule déjà tout seul sur le thème
 * partagé "cinema" (sombre) dès que `palette.bg` est un hex sombre (cf.
 * `hasDarkBespokeBg`) — `buildFulfillmentData` ne pose que `palette.bg` +
 * les couleurs par chapitre, jamais tout `HeroTheme`.
 *
 * Pilotage admin (ajouté le 12/09/2026, cf. échanges "dis-moi où piloter
 * les textes overlay" puis "gérer les couleurs... avec la bibliothèque") :
 * les textes/timings/position/couleurs/décor ci-dessous sont des DÉFAUTS,
 * remplaçables depuis Réglages → Modèles Save the Date sans toucher au
 * code. Stockés dans `site_settings` (clé "saveTheDateTemplates", même
 * mécanisme que products/options, cf. api/miscRouters.ts::settingsRouter)
 * sous la forme d'un tableau de `SaveTheDateTemplateOverride` — un par
 * `slug`. Vidéo/frames/thème restent toujours codés en dur (pas encore
 * d'upload de modèle depuis l'admin).
 */

export interface HeroTheme {
  id: string
  label: string
  colorScheme: 'light' | 'dark'
  frameBg: string
  pageBg: string
  vignette: string
  accent: string
  textPrimary: string
  textSecondary: string
  cardBg: string
  cardBorder: string
  cardShadow: string
  dotInactive: string
}

/**
 * Sous-ensemble de HeroChapter (src/components/hero-scrub/types.ts) —
 * seuls les champs dont un modèle a besoin, structurellement compatible
 * avec le vrai type (aucun champ en trop, aucun type de champ différent),
 * donc assignable tel quel à `HeroScrub`'s `chapters` prop côté client
 * sans jamais importer ce fichier `src/`.
 */
export interface TemplateHeroChapter {
  id: number
  kind: 'text' | 'list' | 'card'
  from: number
  to: number
  lead?: string
  segments?: { text: string; accent?: boolean }[]
  segmentLayout?: 'inline' | 'stack'
  titleSize?: 'sm' | 'md' | 'lg'
  fitOneLine?: boolean
  rule?: boolean
  subLines?: string[]
  subSize?: 'sm' | 'md'
  textColorOverride?: string
  cardBgOverride?: string
  accentColorOverride?: string
  /** cf. doc de HeroChapter.cardFrame (src/components/hero-scrub/types.ts) — ajouté le 21/09/2026. */
  cardFrame?: string
  /** cf. doc de HeroChapter.fontId/textAnimation/bold (src/components/hero-scrub/types.ts) — ajoutés le 21/09/2026 (2e vague). */
  fontId?: string
  textAnimation?: string
  bold?: boolean
  verticalAlign?: HeroVerticalAlign
}

const RED_DOOR_THEME: HeroTheme = {
  id: 'red-door',
  label: 'Red Door',
  colorScheme: 'dark',
  frameBg: '#1A0A0A',
  pageBg: '#170909',
  vignette: 'linear-gradient(180deg, rgba(26,10,10,0.18) 0%, rgba(26,10,10,0.04) 40%, rgba(26,10,10,0.82) 100%)',
  accent: '#D4AF6A',
  textPrimary: '#F7EFE0',
  textSecondary: '#D8C2A0',
  cardBg: 'rgba(26, 10, 10, 0.55)',
  cardBorder: 'rgba(212, 175, 106, 0.25)',
  cardShadow: '0 24px 60px rgba(0, 0, 0, 0.45)',
  dotInactive: 'rgba(247, 239, 224, 0.12)',
}

/** Parchemin ivoire, sceau cœur doré, satin blanc — ambiance claire, contrairement à Red Door (cf. échange du 13/09/2026). */
const PARCHEMIN_BLANC_THEME: HeroTheme = {
  id: 'parchemin-blanc',
  label: 'Parchemin Blanc',
  colorScheme: 'light',
  frameBg: '#F5EEDE',
  pageBg: '#FAF6EC',
  vignette: 'linear-gradient(180deg, rgba(58,46,31,0.10) 0%, rgba(58,46,31,0.02) 40%, rgba(58,46,31,0.55) 100%)',
  accent: '#B8934A',
  textPrimary: '#3A2E1F',
  textSecondary: '#7A6A50',
  cardBg: 'rgba(250, 246, 236, 0.78)',
  cardBorder: 'rgba(184, 147, 74, 0.28)',
  cardShadow: '0 24px 60px rgba(58, 46, 31, 0.18)',
  dotInactive: 'rgba(58, 46, 31, 0.14)',
}

/** Parchemin sur satin rose poudré, sceau couronne dorée — même famille que Parchemin Blanc, accent rosé plutôt que doré pur. */
const PARCHEMIN_ROSE_THEME: HeroTheme = {
  id: 'parchemin-rose',
  label: 'Parchemin Rose',
  colorScheme: 'light',
  frameBg: '#F7E4DC',
  pageBg: '#FBEFE9',
  vignette: 'linear-gradient(180deg, rgba(74,46,40,0.10) 0%, rgba(74,46,40,0.02) 40%, rgba(74,46,40,0.55) 100%)',
  accent: '#C08769',
  textPrimary: '#4A2E28',
  textSecondary: '#8A6459',
  cardBg: 'rgba(251, 239, 233, 0.78)',
  cardBorder: 'rgba(192, 135, 105, 0.28)',
  cardShadow: '0 24px 60px rgba(74, 46, 40, 0.18)',
  dotInactive: 'rgba(74, 46, 40, 0.14)',
}

export interface SaveTheDateTemplate {
  slug: string
  name: string
  tagline: string
  /** Description longue, page de détail du modèle. */
  description: string
  theme: HeroTheme
  frames: { baseUrl: string; count: number; fps: number }
  /** Vidéo source complète — repli historique requis par HeroScrub même en présence de `frames` (cf. types.ts). */
  desktopSrc: string
  posterSrc: string
  chapters: TemplateHeroChapter[]
  /**
   * Décor/police/animation/filtre — bibliothèque "mariage" ajoutée le
   * 11/09/2026 (cf. src/components/hero-scrub/heroDecor.ts), pilotable
   * depuis le même onglet admin que les textes ci-dessus. `undefined`/id
   * inconnu = comportement par défaut de HeroScrub (aucun décor, police
   * du site, fondu, aucun filtre) — jamais réglés dans le catalogue codé
   * en dur ci-dessous, uniquement via la surcharge admin.
   */
  overlayGraphic?: string
  fontId?: string
  textAnimation?: string
  filter?: string
}

/**
 * Forme éditable depuis l'admin — un sous-ensemble de `SaveTheDateTemplate`
 * en unités "admin-friendly" (secondes plutôt que ratio [0,1], noms
 * d'exemple en texte libre plutôt que `segments` déjà découpés) plutôt que
 * le type interne complet, cf. doc plus haut.
 */
export interface SaveTheDateTemplateOverride {
  slug: string
  name: string
  tagline: string
  description: string
  /** 1er texte affiché ("Save the date" par défaut) — n'affecte QUE la page d'aperçu générique, pas une vraie commande (cf. doc de buildFulfillmentData). Un retour à la ligne = une ligne forcée à l'affichage (1 à 3 lignes typiquement), cf. doc de `splitLines` plus bas. */
  chapter1Text: string
  chapter1FromSec: number
  chapter1ToSec: number
  chapter1Position: HeroVerticalAlign
  /** Vide = couleur/fond par défaut du thème du modèle (jamais un héritage silencieux — même règle que pour un vrai projet). */
  chapter1TextColor: string
  chapter1CardBg: string
  /** 'sm'/'md'/'lg' — vide = 'lg' (comportement historique de ce bloc). */
  chapter1TitleSize: string
  /** cf. doc de TemplateHeroChapter.cardFrame — vide = aucun cadre. Ajouté le 21/09/2026. */
  chapter1CardFrame: string
  /** cf. doc de TemplateHeroChapter.fontId/textAnimation/bold — vide/false = réglage hero-wide (fontId/textAnimation ci-dessous). Ajoutés le 21/09/2026 (2e vague). */
  chapter1FontId: string
  chapter1TextAnimation: string
  chapter1Bold: boolean
  /** Prénoms d'exemple affichés dans la bibliothèque — jamais un vrai client (cf. doc de EXAMPLE_NAMES). */
  exampleNames: string
  exampleDate: string
  chapter2FromSec: number
  chapter2ToSec: number
  chapter2Position: HeroVerticalAlign
  chapter2TextColor: string
  chapter2CardBg: string
  /** Couleur du "&"/"et" entre les 2 prénoms (segment `accent`, cf. nameSegments) — vide = couleur d'accent du thème. */
  chapter2AccentColor: string
  /** cf. doc de TemplateHeroChapter.cardFrame — vide = aucun cadre. Ajouté le 21/09/2026. */
  chapter2CardFrame: string
  /** cf. doc de TemplateHeroChapter.fontId/textAnimation/bold — vide/false = réglage hero-wide. Ajoutés le 21/09/2026 (2e vague). */
  chapter2FontId: string
  chapter2TextAnimation: string
  chapter2Bold: boolean
  /** cf. doc de SaveTheDateTemplate.overlayGraphic — vide = comportement par défaut. */
  overlayGraphic: string
  fontId: string
  textAnimation: string
  filter: string
  /**
   * Blocs de texte supplémentaires, en plus des 2 chapitres fixes ci-dessus
   * — GÉNÉRALISTES (identiques pour tous les clients de ce modèle, jamais
   * personnalisés) mais bien présents sur la vraie vidéo livrée (cf.
   * échange du 21/09/2026 : ajouter un vrai 3e chapitre personnalisable
   * toucherait le webhook Stripe et la structure figée à 2 chapitres de
   * chaque projet — trop risqué pour ce besoin). Réutilise le mécanisme
   * `heroCustomCards` déjà en production pour les faire-part sur mesure
   * (cf. StudioPanel.tsx::CustomCardsEditor, FairePart.tsx `customChapters`
   * — rendu SANS condition sur le produit, donc directement réutilisable
   * ici sans toucher FairePart.tsx).
   */
  extraCards: HeroCustomCard[]
  /**
   * 3e bloc — la date, indépendant du bloc "prénoms" (cf. échange du
   * 21/09/2026 : "je souhaite ajouter un bloc date indépendant"). `false`
   * par défaut = comportement historique STRICTEMENT inchangé (la date
   * reste affichée SOUS les prénoms, cf. `subLines` du chapitre 2) — tant
   * qu'un admin n'active pas explicitement ce bloc pour un modèle donné,
   * aucun projet existant ni nouveau n'est affecté. Une fois activé,
   * `subLines` disparaît du chapitre 2 : la date ne vit plus QUE dans ce
   * nouveau bloc (jamais les deux à la fois, cf. applyOverride/
   * buildFulfillmentData plus bas).
   *
   * Techniquement porté par une carte `heroCustomCards` de type `kind:
   * 'date'` plutôt que par un vrai 3e élément du tuple `heroChapters` — cf.
   * doc de `HeroCustomCard.kind` (bespokePalette.ts) : ce tuple est figé à
   * 2 éléments pour un Save the Date (webhook Stripe, `expectedChapterCount`
   * dans FairePart.tsx) et volontairement jamais retouché, contrairement à
   * `heroCustomCards`, une colonne JSONB flexible déjà réutilisée pour les
   * "blocs supplémentaires" ci-dessus.
   */
  dateBlockEnabled: boolean
  dateBlockFromSec: number
  dateBlockToSec: number
  dateBlockPosition: HeroVerticalAlign
  /** Vide = couleur du thème (même convention que chapter1TextColor/chapter2TextColor). */
  dateBlockTextColor: string
  /** cf. doc de TemplateHeroChapter.fontId/textAnimation/bold — vide/false = réglage hero-wide. Ajoutés le 21/09/2026 (2e vague). */
  dateBlockFontId: string
  dateBlockTextAnimation: string
  dateBlockBold: boolean
  /**
   * Style d'affichage de la date du mariage (jour de la semaine, majuscules,
   * numérique avec points...) — bibliothèque HERO_DATE_FORMATS (cf.
   * src/components/hero-scrub/heroDecor.ts), ajoutée le 23/09/2026. Vide/id
   * inconnu = format historique inchangé ("12 juin 2027"). Un seul réglage
   * par modèle (pas par bloc) : s'applique partout où la vraie date du
   * client est affichée pour une commande passée sur ce modèle (sous les
   * prénoms par défaut, ou dans le 3e bloc si `dateBlockEnabled`) — cf.
   * `buildFulfillmentData` plus bas, qui le pose sur `palette.stdDateFormat`.
   * N'affecte PAS la page d'aperçu générique (`applyOverride`), qui reste
   * pilotée par `exampleDate` en texte libre.
   */
  dateFormat: string
}

// Couple d'exemple repris à l'identique du reste du site (récap /commander,
// URL de démonstration) — jamais un vrai client, toujours "Anna & Théo".
const EXAMPLE_NAMES = 'Anna & Théo'
const EXAMPLE_DATE = '12 juin 2027'

export const SAVE_THE_DATE_TEMPLATES: SaveTheDateTemplate[] = [
  {
    slug: 'red-door',
    name: 'Red Door',
    tagline: 'Grandeur, dorures et pétales de rose.',
    description:
      "Une porte sculptée s'ouvre sur un salon de réception habillé de roses rouges et de lumières chaudes — un montage opulent, pensé pour une annonce qui marque les esprits.",
    theme: RED_DOOR_THEME,
    // Remplacée le 13/09/2026 par un montage V2 (24,53 s, plus court que
    // l'original 27,9 s) — mêmes fractions [0.8,0.9]/[0.9,1] pour les
    // chapitres (indépendantes de la durée, cf. doc de ces champs) :
    // structure du montage inchangée (porte → miroir "Save the Date" à
    // mi-parcours → salon de réception jusqu'à la fin), donc pas de
    // recalage nécessaire.
    frames: { baseUrl: '/red-door-frames/', count: 294, fps: 12 },
    desktopSrc: '/red-door.mp4',
    posterSrc: '/red-door-frames/00001.jpg',
    chapters: [
      {
        id: 0,
        kind: 'text',
        from: 0.8,
        to: 0.9,
        segments: [{ text: 'Save the date' }],
        titleSize: 'lg',
        verticalAlign: 'bottom',
      },
      {
        id: 1,
        kind: 'text',
        from: 0.9,
        to: 1,
        segments: nameSegments(EXAMPLE_NAMES),
        fitOneLine: true,
        rule: true,
        subLines: [EXAMPLE_DATE],
        subSize: 'md',
        verticalAlign: 'bottom',
      },
    ],
  },
  {
    slug: 'parchemin-blanc',
    name: 'Parchemin Blanc',
    tagline: 'Un rouleau scellé, satin blanc et dorures.',
    description:
      "Un parchemin scellé d'un sceau cœur doré se déroule sur satin blanc pour révéler l'annonce, avant de se refermer sur deux alliances parmi les pétales — un montage clair et délicat, tout en dorures.",
    theme: PARCHEMIN_BLANC_THEME,
    frames: { baseUrl: '/parchemin-blanc-frames/', count: 376, fps: 12 },
    desktopSrc: '/parchemin-blanc.mp4',
    posterSrc: '/parchemin-blanc-frames/00001.jpg',
    chapters: [
      {
        id: 0,
        kind: 'text',
        from: 0.8,
        to: 0.9,
        segments: [{ text: 'Save the date' }],
        titleSize: 'lg',
        verticalAlign: 'bottom',
      },
      {
        id: 1,
        kind: 'text',
        from: 0.9,
        to: 1,
        segments: nameSegments(EXAMPLE_NAMES),
        fitOneLine: true,
        rule: true,
        subLines: [EXAMPLE_DATE],
        subSize: 'md',
        verticalAlign: 'bottom',
      },
    ],
  },
  {
    slug: 'parchemin-rose',
    name: 'Parchemin Rose',
    tagline: 'Un rouleau scellé, satin rose poudré et dorures.',
    description:
      "Un parchemin scellé d'un sceau couronne doré se déroule sur satin rose poudré pour révéler l'annonce, avant de se refermer sur des roses crème et deux alliances — même mise en scène que Parchemin Blanc, dans une teinte plus romantique.",
    theme: PARCHEMIN_ROSE_THEME,
    frames: { baseUrl: '/parchemin-rose-frames/', count: 353, fps: 12 },
    desktopSrc: '/parchemin-rose.mp4',
    posterSrc: '/parchemin-rose-frames/00001.jpg',
    chapters: [
      {
        id: 0,
        kind: 'text',
        from: 0.8,
        to: 0.9,
        segments: [{ text: 'Save the date' }],
        titleSize: 'lg',
        verticalAlign: 'bottom',
      },
      {
        id: 1,
        kind: 'text',
        from: 0.9,
        to: 1,
        segments: nameSegments(EXAMPLE_NAMES),
        fitOneLine: true,
        rule: true,
        subLines: [EXAMPLE_DATE],
        subSize: 'md',
        verticalAlign: 'bottom',
      },
    ],
  },
]

export function getSaveTheDateTemplate(slug: string | undefined): SaveTheDateTemplate | undefined {
  return SAVE_THE_DATE_TEMPLATES.find((t) => t.slug === slug)
}

/** Durée totale du montage, en secondes — dérivée de la séquence de frames (count/fps), jamais stockée séparément (une seule source de vérité). */
export function templateDurationSec(template: SaveTheDateTemplate): number {
  return template.frames.count / template.frames.fps
}

/**
 * "Anna & Théo" → segments HeroChapter, accent sur le séparateur — même
 * découpage que pour un vrai projet (cf. FairePart.tsx). Repli sur un seul
 * segment si le texte ne contient ni "&" ni "et".
 */
function nameSegments(names: string): { text: string; accent?: boolean }[] {
  const parts = names.split(/\s+(&|et)\s+/i)
  return parts.length === 3 ? [{ text: parts[0] }, { text: parts[1], accent: true }, { text: parts[2] }] : [{ text: names }]
}

/**
 * Texte libre de l'admin (chapter1Text) → segments + segmentLayout — un
 * retour à la ligne tapé dans le champ = une ligne forcée à l'affichage
 * (cf. échange du 21/09/2026, "texte écrit sur 1, 2 ou 3 lignes"). 1 seule
 * ligne restante = comportement historique inchangé (un seul segment, pas
 * de `segmentLayout`, le texte s'enchaîne/retombe naturellement selon la
 * largeur). Lignes vides filtrées (un admin qui appuie sur Entrée deux fois
 * par erreur ne doit pas se retrouver avec une ligne fantôme).
 */
function splitLines(text: string): Pick<TemplateHeroChapter, 'segments' | 'segmentLayout'> {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length <= 1) return { segments: [{ text: lines[0] ?? text }] }
  return { segments: lines.map((l) => ({ text: l })), segmentLayout: 'stack' }
}

/** `extraCards` (admin, généraliste) → chapitres additionnels, même conversion que `customChapters` dans FairePart.tsx (secondes → ratio [0,1], `lead` = paragraphe libre). Id décalé à 1000+ pour ne jamais entrer en collision avec les chapitres fixes 0/1, même règle que FairePart.tsx. */
function extraCardsToChapters(cards: HeroCustomCard[], duration: number): TemplateHeroChapter[] {
  const ratio = (sec: number) => Math.min(1, Math.max(0, sec / duration))
  return cards.map((card, i) => ({
    id: 1000 + i,
    kind: 'text' as const,
    from: ratio(card.fromSec),
    to: ratio(card.toSec),
    lead: card.text,
    verticalAlign: card.position,
    fontId: card.fontId || undefined,
    textAnimation: card.textAnimation || undefined,
    bold: card.bold,
  }))
}

/** Override "vide" (mêmes valeurs que les défauts codés en dur ci-dessus) — état initial du formulaire admin pour un modèle sans surcharge enregistrée. */
export function defaultOverrideFor(template: SaveTheDateTemplate): SaveTheDateTemplateOverride {
  const duration = templateDurationSec(template)
  const [ch1, ch2] = template.chapters
  return {
    slug: template.slug,
    name: template.name,
    tagline: template.tagline,
    description: template.description,
    chapter1Text: ch1?.segments?.[0]?.text ?? 'Save the date',
    chapter1FromSec: Math.round((ch1?.from ?? 0.8) * duration * 10) / 10,
    chapter1ToSec: Math.round((ch1?.to ?? 0.9) * duration * 10) / 10,
    chapter1Position: ch1?.verticalAlign ?? 'bottom',
    chapter1TextColor: ch1?.textColorOverride ?? '',
    chapter1CardBg: ch1?.cardBgOverride ?? '',
    chapter1TitleSize: ch1?.titleSize ?? 'lg',
    chapter1CardFrame: ch1?.cardFrame ?? '',
    chapter1FontId: ch1?.fontId ?? '',
    chapter1TextAnimation: ch1?.textAnimation ?? '',
    chapter1Bold: ch1?.bold ?? false,
    exampleNames: EXAMPLE_NAMES,
    exampleDate: EXAMPLE_DATE,
    chapter2FromSec: Math.round((ch2?.from ?? 0.9) * duration * 10) / 10,
    chapter2ToSec: Math.round((ch2?.to ?? 1) * duration * 10) / 10,
    chapter2Position: ch2?.verticalAlign ?? 'bottom',
    chapter2TextColor: ch2?.textColorOverride ?? '',
    chapter2CardBg: ch2?.cardBgOverride ?? '',
    chapter2AccentColor: ch2?.accentColorOverride ?? '',
    chapter2CardFrame: ch2?.cardFrame ?? '',
    chapter2FontId: ch2?.fontId ?? '',
    chapter2TextAnimation: ch2?.textAnimation ?? '',
    chapter2Bold: ch2?.bold ?? false,
    overlayGraphic: template.overlayGraphic ?? '',
    fontId: template.fontId ?? '',
    textAnimation: template.textAnimation ?? '',
    filter: template.filter ?? '',
    extraCards: [],
    // Désactivé par défaut — cf. doc du champ sur SaveTheDateTemplateOverride.
    dateBlockEnabled: false,
    dateBlockFromSec: Math.round((ch2?.to ?? 1) * duration * 10) / 10,
    dateBlockToSec: Math.round(duration * 10) / 10,
    dateBlockPosition: 'bottom',
    dateBlockTextColor: '',
    dateBlockFontId: '',
    dateBlockTextAnimation: '',
    dateBlockBold: false,
    dateFormat: '',
  }
}

/** Fusionne le modèle codé en dur avec sa surcharge admin (si présente) — vidéo/frames/thème ne viennent jamais de la surcharge. Pour la page d'aperçu générique (couple d'exemple), PAS pour une vraie commande (cf. buildFulfillmentData). */
export function applyOverride(template: SaveTheDateTemplate, override: SaveTheDateTemplateOverride | undefined): SaveTheDateTemplate {
  if (!override) return template
  const duration = templateDurationSec(template)
  const ratio = (sec: number) => Math.min(1, Math.max(0, sec / duration))
  return {
    ...template,
    name: override.name || template.name,
    tagline: override.tagline || template.tagline,
    description: override.description || template.description,
    overlayGraphic: override.overlayGraphic || undefined,
    fontId: override.fontId || undefined,
    textAnimation: override.textAnimation || undefined,
    filter: override.filter || undefined,
    chapters: [
      {
        id: 0,
        kind: 'text',
        from: ratio(override.chapter1FromSec),
        to: ratio(override.chapter1ToSec),
        ...splitLines(override.chapter1Text || 'Save the date'),
        titleSize: (override.chapter1TitleSize || 'lg') as TemplateHeroChapter['titleSize'],
        verticalAlign: override.chapter1Position,
        textColorOverride: override.chapter1TextColor || undefined,
        cardBgOverride: override.chapter1CardBg || undefined,
        cardFrame: override.chapter1CardFrame || undefined,
        fontId: override.chapter1FontId || undefined,
        textAnimation: override.chapter1TextAnimation || undefined,
        bold: override.chapter1Bold,
      },
      {
        id: 1,
        kind: 'text',
        from: ratio(override.chapter2FromSec),
        to: ratio(override.chapter2ToSec),
        segments: nameSegments(override.exampleNames || EXAMPLE_NAMES),
        fitOneLine: true,
        rule: true,
        // La date ne vit sous les prénoms QUE si le bloc indépendant n'est
        // pas activé — jamais les deux à la fois, cf. doc de
        // dateBlockEnabled sur SaveTheDateTemplateOverride.
        subLines: override.dateBlockEnabled ? undefined : [override.exampleDate || EXAMPLE_DATE],
        subSize: 'md',
        verticalAlign: override.chapter2Position,
        textColorOverride: override.chapter2TextColor || undefined,
        cardBgOverride: override.chapter2CardBg || undefined,
        accentColorOverride: override.chapter2AccentColor || undefined,
        cardFrame: override.chapter2CardFrame || undefined,
        fontId: override.chapter2FontId || undefined,
        textAnimation: override.chapter2TextAnimation || undefined,
        bold: override.chapter2Bold,
      },
      ...(override.dateBlockEnabled
        ? [
            {
              id: 2,
              kind: 'text' as const,
              from: ratio(override.dateBlockFromSec),
              to: ratio(override.dateBlockToSec),
              segments: [{ text: override.exampleDate || EXAMPLE_DATE }],
              titleSize: 'md' as const,
              verticalAlign: override.dateBlockPosition,
              textColorOverride: override.dateBlockTextColor || undefined,
              fontId: override.dateBlockFontId || undefined,
              textAnimation: override.dateBlockTextAnimation || undefined,
              bold: override.dateBlockBold,
            },
          ]
        : []),
      ...extraCardsToChapters(override.extraCards ?? [], duration),
    ],
  }
}

/** Tableau brut (`site_settings` value) → overrides valides indexés par slug — tolère un JSON mal formé (règle "sans casser l'affichage public" déjà appliquée ailleurs dans le projet aux réglages venant de la base). */
export function parseTemplateOverrides(raw: unknown): Record<string, SaveTheDateTemplateOverride> {
  if (!Array.isArray(raw)) return {}
  const out: Record<string, SaveTheDateTemplateOverride> = {}
  for (const item of raw) {
    if (item && typeof item === 'object' && typeof (item as { slug?: unknown }).slug === 'string') {
      out[(item as SaveTheDateTemplateOverride).slug] = item as SaveTheDateTemplateOverride
    }
  }
  return out
}

/** Modèle unique, surcharge admin appliquée si présente pour ce slug — page d'aperçu générique. */
export function resolveSaveTheDateTemplate(
  slug: string | undefined,
  overrides: Record<string, SaveTheDateTemplateOverride>,
): SaveTheDateTemplate | undefined {
  const base = getSaveTheDateTemplate(slug)
  if (!base) return undefined
  return applyOverride(base, overrides[base.slug])
}

/** Tous les modèles, surcharges admin appliquées — pour la bibliothèque. */
export function resolveSaveTheDateTemplates(overrides: Record<string, SaveTheDateTemplateOverride>): SaveTheDateTemplate[] {
  return SAVE_THE_DATE_TEMPLATES.map((t) => applyOverride(t, overrides[t.slug]))
}

/**
 * Modèle + surcharge admin → contenu d'un VRAI projet (cf. doc en tête de
 * fichier) — appelée UNIQUEMENT côté serveur (webhook Stripe), une fois
 * une commande "sur un modèle" payée. Volontairement distincte
 * d'`applyOverride` : ne construit ni texte d'exemple ni HeroTheme complet
 * — seulement ce que project.palette/project.heroChapters attendent
 * réellement (cf. FairePart.tsx, `hasDarkBespokeBg`/`effectiveHeroTheme`).
 * Les vrais prénoms/la vraie date du client n'entrent PAS ici : ils vont
 * dans `questionnaires.answers["couple.prenoms"]`/`projects.weddingDate`,
 * lus par FairePart.tsx exactement comme pour un projet sur mesure.
 */
export function buildFulfillmentData(
  template: SaveTheDateTemplate,
  override: SaveTheDateTemplateOverride | undefined,
): {
  palette: Partial<BespokePaletteInput>
  heroChapters: [HeroChapterTiming, HeroChapterTiming]
  /** Blocs supplémentaires généralistes (cf. doc de `extraCards` sur SaveTheDateTemplateOverride) — réutilise heroCustomCards tel quel, aucun changement de FairePart.tsx nécessaire pour les rendre. */
  heroCustomCards: HeroCustomCard[]
  video: { url: string; posterUrl: string; frameBaseUrl: string; frameCount: number; frameFps: number }
} {
  const o = override ?? defaultOverrideFor(template)
  return {
    palette: {
      // Déclenche `hasDarkBespokeBg` dans FairePart.tsx → bascule
      // automatique sur le thème partagé "cinema" (sombre) + fond de page
      // — sans jamais toucher au catalogue de thèmes partagé.
      bg: template.theme.frameBg,
      stdSaveTheDateTextColor: o.chapter1TextColor || '',
      stdSaveTheDateCardBg: o.chapter1CardBg || '',
      stdSaveTheDateTitleSize: o.chapter1TitleSize || '',
      stdSaveTheDateCardFrame: o.chapter1CardFrame || '',
      stdNamesDateTextColor: o.chapter2TextColor || '',
      stdNamesDateCardBg: o.chapter2CardBg || '',
      stdNamesDateAccentColor: o.chapter2AccentColor || '',
      stdNamesDateCardFrame: o.chapter2CardFrame || '',
      stdSaveTheDateFontId: o.chapter1FontId || '',
      stdSaveTheDateTextAnimation: o.chapter1TextAnimation || '',
      stdSaveTheDateBold: o.chapter1Bold,
      stdNamesDateFontId: o.chapter2FontId || '',
      stdNamesDateTextAnimation: o.chapter2TextAnimation || '',
      stdNamesDateBold: o.chapter2Bold,
      heroOverlayGraphic: o.overlayGraphic || '',
      heroFontId: o.fontId || '',
      heroTextAnimation: o.textAnimation || '',
      heroFilter: o.filter || '',
      stdDateFormat: o.dateFormat || '',
    },
    heroChapters: [
      { fromSec: o.chapter1FromSec, toSec: o.chapter1ToSec, position: o.chapter1Position },
      { fromSec: o.chapter2FromSec, toSec: o.chapter2ToSec, position: o.chapter2Position },
    ],
    // Bloc "date" indépendant (cf. doc de dateBlockEnabled) : une carte
    // heroCustomCards de plus, marquée kind:'date' — FairePart.tsx la
    // reconnaît pour (a) afficher la vraie date du client à sa place et
    // (b) ne plus la répéter sous les prénoms (chapitre 2). `text`
    // n'est qu'un placeholder, jamais affiché pour ce kind (cf. doc de
    // heroCustomCardSchema, bespokePalette.ts).
    heroCustomCards: [
      ...(o.extraCards ?? []),
      ...(o.dateBlockEnabled
        ? [
            {
              id: 'date-block',
              kind: 'date' as const,
              text: 'Date',
              fromSec: o.dateBlockFromSec,
              toSec: o.dateBlockToSec,
              position: o.dateBlockPosition,
              textColor: o.dateBlockTextColor || '',
              fontId: o.dateBlockFontId || '',
              textAnimation: o.dateBlockTextAnimation || '',
              bold: o.dateBlockBold,
            },
          ]
        : []),
    ],
    video: {
      url: template.desktopSrc,
      posterUrl: template.posterSrc,
      frameBaseUrl: template.frames.baseUrl,
      frameCount: template.frames.count,
      frameFps: template.frames.fps,
    },
  }
}
