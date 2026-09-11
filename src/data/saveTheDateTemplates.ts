import type { HeroChapter, HeroTheme } from '@/components/hero-scrub/types'

/**
 * Bibliothèque de modèles Save the Date « sur un modèle » (99 €, cf.
 * SaveTheDateDigital.tsx) — le client choisit un montage déjà prêt plutôt
 * que de répondre à un questionnaire, ne renseigne que ses prénoms/sa date.
 * Chantier débloqué le 11/09/2026 par l'arrivée du premier vrai montage
 * (« Red Door »), jusque-là bloqué faute de modèles réels à afficher.
 *
 * Étape volontairement limitée à la bibliothèque de consultation (cf.
 * échange du 11/09/2026) : pas encore de bouton de commande fonctionnel
 * pour cette formule — viendra une fois plusieurs modèles réunis et le
 * parcours de commande (choix du modèle dans /commander) défini.
 *
 * Le thème de chaque modèle est un objet `HeroTheme` autonome, PAS ajouté
 * au catalogue partagé de src/components/hero-scrub/themes.ts : ce
 * catalogue-là nourrit aussi le sélecteur d'ambiance du questionnaire pour
 * les vrais projets sur mesure, sans rapport avec ces modèles figés.
 *
 * Pilotage admin (ajouté le 12/09/2026, cf. échange "dis-moi où piloter
 * les textes overlay") : les textes/timings/position ci-dessous sont des
 * DÉFAUTS, remplaçables depuis Réglages → Modèles Save the Date sans
 * toucher au code. Stockés dans `site_settings` (clé "saveTheDateTemplates",
 * même mécanisme que products/options, cf. api/miscRouters.ts::
 * settingsRouter) sous la forme d'un tableau de `SaveTheDateTemplateOverride`
 * — un par `slug`. `resolveSaveTheDateTemplate(s)` fusionne cette
 * surcharge avec les défauts ci-dessous ; vidéo/frames/thème restent
 * toujours codés en dur (pas encore d'upload de modèle depuis l'admin).
 */

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
  chapters: HeroChapter[]
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
  /** 1er texte affiché ("Save the date" par défaut). */
  chapter1Text: string
  chapter1FromSec: number
  chapter1ToSec: number
  chapter1Position: 'top' | 'middle' | 'bottom'
  /** Prénoms d'exemple affichés dans la bibliothèque — jamais un vrai client (cf. doc de EXAMPLE_NAMES). */
  exampleNames: string
  exampleDate: string
  chapter2FromSec: number
  chapter2ToSec: number
  chapter2Position: 'top' | 'middle' | 'bottom'
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
    exampleNames: EXAMPLE_NAMES,
    exampleDate: EXAMPLE_DATE,
    chapter2FromSec: Math.round((ch2?.from ?? 0.9) * duration * 10) / 10,
    chapter2ToSec: Math.round((ch2?.to ?? 1) * duration * 10) / 10,
    chapter2Position: ch2?.verticalAlign ?? 'bottom',
  }
}

/** Fusionne le modèle codé en dur avec sa surcharge admin (si présente) — vidéo/frames/thème ne viennent jamais de la surcharge. */
export function applyOverride(template: SaveTheDateTemplate, override: SaveTheDateTemplateOverride | undefined): SaveTheDateTemplate {
  if (!override) return template
  const duration = templateDurationSec(template)
  const ratio = (sec: number) => Math.min(1, Math.max(0, sec / duration))
  return {
    ...template,
    name: override.name || template.name,
    tagline: override.tagline || template.tagline,
    description: override.description || template.description,
    chapters: [
      {
        id: 0,
        kind: 'text',
        from: ratio(override.chapter1FromSec),
        to: ratio(override.chapter1ToSec),
        segments: [{ text: override.chapter1Text || 'Save the date' }],
        titleSize: 'lg',
        verticalAlign: override.chapter1Position,
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

/** Modèle unique, surcharge admin appliquée si présente pour ce slug. */
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
