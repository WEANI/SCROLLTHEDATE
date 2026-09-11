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

// Couple d'exemple repris à l'identique du reste du site (récap /commander,
// URL de démonstration) — jamais un vrai client, toujours "Anna & Théo".
const EXAMPLE_SEGMENTS = [{ text: 'Anna' }, { text: '&', accent: true }, { text: 'Théo' }]
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
        segments: EXAMPLE_SEGMENTS,
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
