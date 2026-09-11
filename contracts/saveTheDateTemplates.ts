import type { BespokePaletteInput, HeroChapterTiming, HeroVerticalAlign } from './bespokePalette'

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
  segments?: { text: string; accent?: boolean }[]
  titleSize?: 'md' | 'lg'
  fitOneLine?: boolean
  rule?: boolean
  subLines?: string[]
  subSize?: 'sm' | 'md'
  textColorOverride?: string
  cardBgOverride?: string
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
  /** 1er texte affiché ("Save the date" par défaut) — n'affecte QUE la page d'aperçu générique, pas une vraie commande (cf. doc de buildFulfillmentData). */
  chapter1Text: string
  chapter1FromSec: number
  chapter1ToSec: number
  chapter1Position: HeroVerticalAlign
  /** Vide = couleur/fond par défaut du thème du modèle (jamais un héritage silencieux — même règle que pour un vrai projet). */
  chapter1TextColor: string
  chapter1CardBg: string
  /** Prénoms d'exemple affichés dans la bibliothèque — jamais un vrai client (cf. doc de EXAMPLE_NAMES). */
  exampleNames: string
  exampleDate: string
  chapter2FromSec: number
  chapter2ToSec: number
  chapter2Position: HeroVerticalAlign
  chapter2TextColor: string
  chapter2CardBg: string
  /** cf. doc de SaveTheDateTemplate.overlayGraphic — vide = comportement par défaut. */
  overlayGraphic: string
  fontId: string
  textAnimation: string
  filter: string
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
    frames: { baseUrl: '/red-door-frames/', count: 335, fps: 12 },
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
    exampleNames: EXAMPLE_NAMES,
    exampleDate: EXAMPLE_DATE,
    chapter2FromSec: Math.round((ch2?.from ?? 0.9) * duration * 10) / 10,
    chapter2ToSec: Math.round((ch2?.to ?? 1) * duration * 10) / 10,
    chapter2Position: ch2?.verticalAlign ?? 'bottom',
    chapter2TextColor: ch2?.textColorOverride ?? '',
    chapter2CardBg: ch2?.cardBgOverride ?? '',
    overlayGraphic: template.overlayGraphic ?? '',
    fontId: template.fontId ?? '',
    textAnimation: template.textAnimation ?? '',
    filter: template.filter ?? '',
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
        segments: [{ text: override.chapter1Text || 'Save the date' }],
        titleSize: 'lg',
        verticalAlign: override.chapter1Position,
        textColorOverride: override.chapter1TextColor || undefined,
        cardBgOverride: override.chapter1CardBg || undefined,
      },
      {
        id: 1,
        kind: 'text',
        from: ratio(override.chapter2FromSec),
        to: ratio(override.chapter2ToSec),
        segments: nameSegments(override.exampleNames || EXAMPLE_NAMES),
        fitOneLine: true,
        rule: true,
        subLines: [override.exampleDate || EXAMPLE_DATE],
        subSize: 'md',
        verticalAlign: override.chapter2Position,
        textColorOverride: override.chapter2TextColor || undefined,
        cardBgOverride: override.chapter2CardBg || undefined,
      },
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
      stdNamesDateTextColor: o.chapter2TextColor || '',
      stdNamesDateCardBg: o.chapter2CardBg || '',
      heroOverlayGraphic: o.overlayGraphic || '',
      heroFontId: o.fontId || '',
      heroTextAnimation: o.textAnimation || '',
      heroFilter: o.filter || '',
    },
    heroChapters: [
      { fromSec: o.chapter1FromSec, toSec: o.chapter1ToSec, position: o.chapter1Position },
      { fromSec: o.chapter2FromSec, toSec: o.chapter2ToSec, position: o.chapter2Position },
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
