import { trpc } from '@/providers/trpc'
import {
  applyOverride,
  defaultOverrideFor,
  SAVE_THE_DATE_TEMPLATES,
  type SaveTheDateTemplate,
  type SaveTheDateTemplateOverride,
} from '@contracts/saveTheDateTemplates'
import { getHeroFont, resolveDateFormatsInChapters, useGoogleFont, useGoogleFonts } from '@/components/hero-scrub/heroDecor'
import { MINIMAL_THEME } from '@/components/hero-scrub/themes'
import type { HeroChapter, HeroTheme } from '@/components/hero-scrub/types'
import { blankHeroCustomCard } from '@contracts/bespokePalette'
import * as fp1 from '@/components/faire-part/demoFairePart1Content'
import * as fp2 from '@/components/faire-part/demoFairePart2Content'

/**
 * Vidéos démo réglables depuis l'admin (Paramètres → Faire-part démo →
 * « Régler la vidéo et les blocs »), avec EXACTEMENT les mêmes onglets que
 * les Modèles Save the Date (demande du 12/11/2026) : l'écran réutilise
 * StdHeroForm, et la page démo applique le réglage avec le même code que la
 * page d'un modèle (applyOverride + resolveDateFormatsInChapters).
 *
 * Réglage enregistré dans site_settings, clé `settingKey`. Tant que rien
 * n'est enregistré, la démo garde ses blocs d'origine (demoFairePart*Content.ts).
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

const durationOf = (v: DemoVideo) => v.frames.count / v.frames.fps

export interface DemoHeroDef {
  id: 'demo-faire-part-1' | 'demo-faire-part-2'
  label: string
  path: string
  /** Clé site_settings des prénoms (onglet Faire-part démo). */
  namesKey: string
  /** Clé site_settings du réglage vidéo + blocs. */
  settingKey: string
  fallbackNames: string
  theme: HeroTheme
  defaultVideoId: string
  /** Hauteur de défilement d'origine (vh), ajustée à la durée si la vidéo change. */
  trackHeightVh: number
  dateShort: string
  /** Point de départ du réglage, proche des blocs d'origine (1er/2e bloc en secondes). */
  seed: { ch1Text: string; ch1: [number, number]; ch2: [number, number]; patch: Partial<SaveTheDateTemplateOverride> }
  /** Chapitres d'origine, utilisés tant que rien n'est enregistré. */
  defaultChapters: (coupleNames: string) => HeroChapter[]
}

const END_1 = Math.round(durationOf(DEMO_VIDEOS[0]) * 10) / 10
const END_2 = Math.round(durationOf(DEMO_VIDEOS[1]) * 10) / 10

export const DEMO_HEROES: DemoHeroDef[] = [
  {
    id: 'demo-faire-part-1',
    label: 'Demo Faire Part 1',
    path: '/faire-part/demo-faire-part-1',
    namesKey: 'demoFairePart1',
    settingKey: 'demoFairePart1Std',
    fallbackNames: 'Demo Faire Part 1',
    theme: MINIMAL_THEME,
    defaultVideoId: 'demo-faire-part-1',
    trackHeightVh: 800,
    dateShort: fp1.WEDDING_DATE_SHORT,
    seed: {
      ch1Text: 'Nous nous marions',
      ch1: [3, 6],
      ch2: [60, END_1],
      patch: { chapter1Position: 'middle', chapter2Position: 'middle', dateBlockEnabled: true, dateBlockFromSec: 20, dateBlockToSec: 23, dateBlockPosition: 'middle' },
    },
    defaultChapters: fp1.buildHeroChapters,
  },
  {
    id: 'demo-faire-part-2',
    label: 'Demo Faire Part 2',
    path: '/faire-part/demo-faire-part-2',
    namesKey: 'demoFairePart2',
    settingKey: 'demoFairePart2Std',
    fallbackNames: 'Demo Faire Part 2',
    theme: fp2.CINEMA_ROUGE_THEME,
    defaultVideoId: 'demo-faire-part-2',
    trackHeightVh: 1060,
    dateShort: fp2.WEDDING_DATE_SHORT,
    seed: {
      ch1Text: 'Nous nous marions',
      ch1: [3.2, 5],
      ch2: [52.8, END_2],
      patch: {
        chapter1Position: 'middle',
        chapter2Position: 'middle',
        dateBlockEnabled: true,
        dateBlockFromSec: 28.3,
        dateBlockToSec: 31,
        dateBlockPosition: 'top',
        extraCards: [
          {
            ...blankHeroCustomCard('seed-infos', 'text', `${fp2.CEREMONY_TIME} · ${fp2.VENUE_NAME}, ${fp2.VENUE_LOCATION}\nDress code : ${fp2.DRESS_CODE}`),
            fromSec: 28.3,
            toSec: 31,
            position: 'bottom',
            titleSize: 'sm',
          },
          {
            ...blankHeroCustomCard('seed-merci', 'text', 'Nous sommes ravis de partager ce moment avec vous'),
            fromSec: 52.8,
            toSec: END_2,
            position: 'top',
          },
        ],
      },
    },
    defaultChapters: fp2.buildHeroChapters,
  },
]

export const getDemoHero = (id: string | undefined) => DEMO_HEROES.find((d) => d.id === id)

const videoById = (def: DemoHeroDef, id: string | undefined) =>
  DEMO_VIDEOS.find((v) => v.id === id) ?? DEMO_VIDEOS.find((v) => v.id === def.defaultVideoId)!

/** « Modèle » fictif d'une démo — même forme qu'un modèle Save the Date, pour réutiliser son écran et son rendu. */
export function demoTemplate(def: DemoHeroDef, videoId?: string): SaveTheDateTemplate {
  const v = videoById(def, videoId)
  const d = durationOf(videoById(def, def.defaultVideoId))
  return {
    slug: def.id,
    name: def.label,
    tagline: '',
    description: '',
    theme: def.theme,
    frames: v.frames,
    desktopSrc: v.desktopSrc,
    posterSrc: v.posterSrc,
    chapters: [
      { id: 0, kind: 'text', from: def.seed.ch1[0] / d, to: def.seed.ch1[1] / d, segments: [{ text: def.seed.ch1Text }], titleSize: 'lg' },
      { id: 1, kind: 'text', from: def.seed.ch2[0] / d, to: Math.min(1, def.seed.ch2[1] / d) },
    ],
  }
}

/** Réglage de départ quand rien n'est encore enregistré. */
export function demoInitialOverride(def: DemoHeroDef, names: string): SaveTheDateTemplateOverride {
  return {
    ...defaultOverrideFor(demoTemplate(def)),
    ...def.seed.patch,
    videoId: def.defaultVideoId,
    exampleNames: names,
    exampleDate: def.dateShort,
  }
}

export function parseDemoOverride(value: unknown): SaveTheDateTemplateOverride | null {
  return value && typeof value === 'object' && typeof (value as { slug?: unknown }).slug === 'string'
    ? (value as SaveTheDateTemplateOverride)
    : null
}

/**
 * Hero d'une page démo : réglage de l'admin s'il existe (rendu comme un
 * modèle Save the Date), sinon blocs et vidéo d'origine. `ready` = faux tant
 * que les réglages ne sont pas chargés.
 */
export function useDemoHero(def: DemoHeroDef) {
  const namesQ = trpc.settings.get.useQuery({ key: def.namesKey })
  const heroQ = trpc.settings.get.useQuery({ key: def.settingKey })
  const coupleNames = (namesQ.data?.value as { coupleNames?: string } | null)?.coupleNames?.trim() || def.fallbackNames
  const override = parseDemoOverride(heroQ.data?.value)
  // Prénoms et date : toujours ceux de la démo (onglet Faire-part démo), comme le reste de la page.
  const applied = override
    ? applyOverride(demoTemplate(def, override.videoId), { ...override, exampleNames: coupleNames, exampleDate: def.dateShort })
    : null
  const font = getHeroFont(applied?.fontId)
  useGoogleFont(applied?.fontId)
  useGoogleFonts((applied?.chapters ?? []).map((c) => c.fontId))
  const video = videoById(def, override?.videoId)
  const defaultVideo = videoById(def, def.defaultVideoId)
  return {
    ready: !namesQ.isLoading && !heroQ.isLoading,
    coupleNames,
    chapters: applied ? resolveDateFormatsInChapters(applied.chapters) : def.defaultChapters(coupleNames),
    trackHeightVh: Math.round(def.trackHeightVh * (durationOf(video) / durationOf(defaultVideo))),
    video: { desktopSrc: video.desktopSrc, posterSrc: video.posterSrc, frames: video.frames },
    overlayGraphic: applied?.overlayGraphic,
    fontFamily: font?.fontFamily,
    textAnimation: applied?.textAnimation,
    filter: applied?.filter,
  }
}
