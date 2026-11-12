import { trpc } from '@/providers/trpc'
import { SAVE_THE_DATE_TEMPLATES } from '@contracts/saveTheDateTemplates'
import { blankHeroCustomCard } from '@contracts/bespokePalette'
import { MINIMAL_THEME } from '@/components/hero-scrub/themes'
import { heroCardsToChapters, NAMES_PLACEHOLDER, type HeroCard, type HeroCardsContext } from '@/components/hero-scrub/heroCards'
import type { HeroChapter, HeroTheme } from '@/components/hero-scrub/types'
import * as fp1 from '@/components/faire-part/demoFairePart1Content'
import * as fp2 from '@/components/faire-part/demoFairePart2Content'

/**
 * Vidéos démo réglables depuis l'admin (Paramètres → Faire-part démo →
 * « Régler la vidéo et les blocs », ajouté le 12/11/2026), sur le modèle de
 * l'écran des Modèles Save the Date.
 *
 * Réglage enregistré dans site_settings, clé `<id>Hero` :
 * `{ videoId, cards }`. Tant que rien n'est enregistré, la démo garde
 * exactement ses blocs d'origine (codés dans demoFairePart*Content.ts).
 */

export interface DemoVideo {
  id: string
  label: string
  desktopSrc: string
  posterSrc: string
  frames: { baseUrl: string; count: number; fps: number }
}

/** Vidéos proposées : celles des 2 démos + celles des modèles Save the Date. */
export const DEMO_VIDEOS: DemoVideo[] = [
  { id: 'demo-faire-part-1', label: 'Demo Faire Part 1 (vidéo d’origine)', ...fp1.HERO_VIDEO },
  { id: 'demo-faire-part-2', label: 'Demo Faire Part 2 (vidéo d’origine)', ...fp2.HERO_VIDEO },
  ...SAVE_THE_DATE_TEMPLATES.map((t) => ({
    id: `std:${t.slug}`,
    label: `Modèle Save the Date — ${t.name}`,
    desktopSrc: t.desktopSrc,
    posterSrc: t.posterSrc,
    frames: t.frames,
  })),
]

export const videoDurationSec = (v: DemoVideo) => v.frames.count / v.frames.fps

export interface DemoHeroDef {
  id: 'demo-faire-part-1' | 'demo-faire-part-2'
  label: string
  path: string
  /** Clé site_settings des prénoms (onglet Faire-part démo). */
  namesKey: string
  /** Clé site_settings du réglage vidéo + blocs. */
  heroKey: string
  fallbackNames: string
  theme: HeroTheme
  defaultVideoId: string
  /** Hauteur de défilement d'origine (vh), ajustée à la durée si la vidéo change. */
  trackHeightVh: number
  ctx: Omit<HeroCardsContext, 'coupleNames'>
  /** Blocs d'origine (version « blocs » des chapitres codés en dur). */
  seedCards: () => HeroCard[]
  /** Chapitres d'origine, utilisés tant que rien n'est enregistré. */
  defaultChapters: (coupleNames: string) => HeroChapter[]
}

function card(id: string, kind: HeroCard['kind'], text: string, patch: Partial<HeroCard>): HeroCard {
  return { ...blankHeroCustomCard(id, kind === 'names' ? 'text' : kind, text), kind, ...patch }
}

export const DEMO_HEROES: DemoHeroDef[] = [
  {
    id: 'demo-faire-part-1',
    label: 'Demo Faire Part 1',
    path: '/faire-part/demo-faire-part-1',
    namesKey: 'demoFairePart1',
    heroKey: 'demoFairePart1Hero',
    fallbackNames: 'Demo Faire Part 1',
    theme: MINIMAL_THEME,
    defaultVideoId: 'demo-faire-part-1',
    trackHeightVh: 800,
    ctx: {
      dateShort: fp1.WEDDING_DATE_SHORT,
      dateIso: fp1.WEDDING_DATETIME,
      time: fp1.CEREMONY_TIME,
      venue: `${fp1.VENUE_NAME}, ${fp1.VENUE_LOCATION}`,
    },
    seedCards: () => [
      card('seed-1', 'names', NAMES_PLACEHOLDER, { fromSec: 3, toSec: 6, titleSize: 'lg' }),
      card('seed-2', 'date', 'Date', { fromSec: 20, toSec: 23 }),
      card('seed-3', 'names', NAMES_PLACEHOLDER, { fromSec: 60, toSec: videoDurationSec(DEMO_VIDEOS[0]) }),
    ],
    defaultChapters: fp1.buildHeroChapters,
  },
  {
    id: 'demo-faire-part-2',
    label: 'Demo Faire Part 2',
    path: '/faire-part/demo-faire-part-2',
    namesKey: 'demoFairePart2',
    heroKey: 'demoFairePart2Hero',
    fallbackNames: 'Demo Faire Part 2',
    theme: fp2.CINEMA_ROUGE_THEME,
    defaultVideoId: 'demo-faire-part-2',
    trackHeightVh: 1060,
    ctx: {
      dateShort: fp2.WEDDING_DATE_SHORT,
      dateIso: fp2.WEDDING_DATETIME,
      time: fp2.CEREMONY_TIME,
      venue: `${fp2.VENUE_NAME}, ${fp2.VENUE_LOCATION}`,
    },
    seedCards: () => [
      card('seed-1', 'names', 'vous invite à leur mariage', { fromSec: 3.2, toSec: 5, titleSize: 'lg' }),
      card('seed-2', 'date', 'Date', { fromSec: 28.3, toSec: 31, position: 'top' }),
      card('seed-3', 'text', `{heure}\n{lieu}\n${fp2.DRESS_CODE}`, { fromSec: 28.3, toSec: 31, position: 'bottom', titleSize: 'sm' }),
      card('seed-4', 'text', 'Nous sommes ravis de partager ce moment avec vous', { fromSec: 52.8, toSec: videoDurationSec(DEMO_VIDEOS[1]), position: 'top' }),
      card('seed-5', 'names', NAMES_PLACEHOLDER, { fromSec: 52.8, toSec: videoDurationSec(DEMO_VIDEOS[1]) }),
    ],
    defaultChapters: fp2.buildHeroChapters,
  },
]

export const getDemoHero = (id: string | undefined) => DEMO_HEROES.find((d) => d.id === id)

export interface DemoHeroSetting {
  videoId: string
  cards: HeroCard[]
}

export function parseDemoHeroSetting(value: unknown): DemoHeroSetting | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Partial<DemoHeroSetting>
  if (!Array.isArray(v.cards)) return null
  return { videoId: typeof v.videoId === 'string' ? v.videoId : '', cards: v.cards }
}

/**
 * Hero d'une page démo : réglage de l'admin s'il existe, sinon blocs et
 * vidéo d'origine. `ready` = faux tant que les réglages ne sont pas chargés
 * (évite d'afficher un instant les blocs d'origine puis les nouveaux).
 */
export function useDemoHero(def: DemoHeroDef) {
  const namesQ = trpc.settings.get.useQuery({ key: def.namesKey })
  const heroQ = trpc.settings.get.useQuery({ key: def.heroKey })
  const coupleNames = (namesQ.data?.value as { coupleNames?: string } | null)?.coupleNames?.trim() || def.fallbackNames
  const setting = parseDemoHeroSetting(heroQ.data?.value)
  const defaultVideo = DEMO_VIDEOS.find((v) => v.id === def.defaultVideoId)!
  const video = (setting && DEMO_VIDEOS.find((v) => v.id === setting.videoId)) || defaultVideo
  const chapters = setting
    ? heroCardsToChapters(setting.cards, videoDurationSec(video), { ...def.ctx, coupleNames })
    : def.defaultChapters(coupleNames)
  const trackHeightVh = Math.round(def.trackHeightVh * (videoDurationSec(video) / videoDurationSec(defaultVideo)))
  return {
    ready: !namesQ.isLoading && !heroQ.isLoading,
    coupleNames,
    chapters,
    trackHeightVh,
    video: { desktopSrc: video.desktopSrc, posterSrc: video.posterSrc, frames: video.frames },
  }
}
