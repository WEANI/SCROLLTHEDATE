import type { HeroCustomCard } from '@contracts/bespokePalette'
import { monogramInitials, splitCoupleNames } from './heroDecor'
import type { HeroChapter } from './types'

/**
 * Bloc overlay réglé depuis l'admin — même forme que `HeroCustomCard`
 * (blocs supplémentaires des modèles et des projets clients), plus un type
 * « prénoms » réservé aux vidéos démo (ajouté le 12/11/2026).
 */
export type HeroCard = Omit<HeroCustomCard, 'kind'> & { kind: HeroCustomCard['kind'] | 'names' }

/** Valeur de `text` d'un bloc « prénoms » sans phrase dessous (le schéma impose un texte non vide). */
export const NAMES_PLACEHOLDER = 'Prénoms'

/** « Anna & Théo » → Anna / & (couleur d'accent) / Théo. */
export function namesSegments(names: string): { text: string; accent?: boolean }[] {
  const parts = names.split(/\s+(&|et)\s+/i)
  return parts.length === 3 ? [{ text: parts[0] }, { text: parts[1], accent: true }, { text: parts[2] }] : [{ text: names }]
}

/** Ce que les blocs affichent : prénoms, date, heure, lieu du couple (réel ou fictif). */
export interface HeroCardsContext {
  coupleNames: string
  /** Date courte affichée par un bloc « date » et par {date}. */
  dateShort: string
  /** Date+heure ISO visée par le compte à rebours. */
  dateIso: string
  time?: string
  venue?: string
}

/** Remplace {prénoms}, {date}, {heure}, {lieu} dans le texte d'un bloc. */
export function fillTokens(text: string, ctx: HeroCardsContext): string {
  return text
    .replace(/\{pr[ée]noms\}/gi, ctx.coupleNames)
    .replace(/\{date\}/gi, ctx.dateShort)
    .replace(/\{heure\}/gi, ctx.time ?? '')
    .replace(/\{lieu\}/gi, ctx.venue ?? '')
}

/**
 * Blocs (en secondes) → chapitres du hero (fenêtres [0,1]). Même conversion
 * que les blocs supplémentaires d'un projet client (cf. `customChapters`
 * dans FairePart.tsx), plus le bloc « prénoms ».
 */
export function heroCardsToChapters(cards: HeroCard[], durationSec: number, ctx: HeroCardsContext, idBase = 1000): HeroChapter[] {
  if (!durationSec) return []
  const ratio = (sec: number) => Math.min(1, Math.max(0, sec / durationSec))
  const [a, b] = splitCoupleNames(ctx.coupleNames)
  const dateNumeric = ctx.dateIso
    ? new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(ctx.dateIso)).replace(/\//g, ' · ')
    : ''
  return cards.map((card, i) => {
    const common = {
      id: idBase + i,
      kind: 'text' as const,
      from: ratio(card.fromSec),
      to: ratio(card.toSec),
      verticalAlign: card.position,
      textColorOverride: card.textColor || undefined,
      cardBgOverride: card.cardBg || undefined,
      cardFrame: card.cardFrame || undefined,
      fontId: card.fontId || undefined,
      textAnimation: card.textAnimation || undefined,
    }
    const size = (card.titleSize || undefined) as HeroChapter['titleSize']
    switch (card.kind) {
      case 'names':
        return {
          ...common,
          segments: namesSegments(ctx.coupleNames),
          segmentLayout: 'stack',
          sub: card.text && card.text !== NAMES_PLACEHOLDER ? fillTokens(card.text, ctx) : undefined,
          titleSize: size,
          bold: card.bold,
        }
      case 'date':
        return { ...common, segments: [{ text: ctx.dateShort }], titleSize: size || 'md', bold: card.bold }
      case 'countdown':
        return { ...common, fontId: undefined, countdown: { style: card.countdownStyle || 'boxes', targetIso: ctx.dateIso } }
      case 'programme':
        return {
          ...common,
          programme: { layout: card.programmeLayout || 'rail', items: card.programmeItems, animation: card.programmeAnimation, speed: card.programmeSpeed },
        }
      case 'monogram': {
        const [ia, ib] = monogramInitials(ctx.coupleNames)
        return {
          ...common,
          titleSize: size,
          monogram: {
            layout: card.monogramLayout || 'circle',
            a: ia,
            b: ib,
            accent: card.monogramAccent,
            sealColor: card.sealColor,
            sealShape: card.sealShape || 'classic',
            sealColor2: card.sealColor2,
            dateShort: ctx.dateShort,
            dateNumeric,
          },
        }
      }
      case 'scene':
        return {
          ...common,
          scene: {
            id: card.sceneId,
            kicker: card.sceneKicker,
            title: card.sceneTitle,
            subtitle: card.sceneSubtitle,
            extra: card.sceneExtra,
            items: card.sceneItems,
            colors: card.sceneColors,
            image: card.sceneImage,
            a,
            b,
            initials: monogramInitials(ctx.coupleNames).join(''),
            dateShort: ctx.dateShort,
            dateNumeric,
            dateIso: ctx.dateIso ? new Date(ctx.dateIso).toISOString() : '',
          },
        }
      default:
        return { ...common, lead: fillTokens(card.text, ctx), titleSize: size, bold: card.bold }
    }
  })
}
