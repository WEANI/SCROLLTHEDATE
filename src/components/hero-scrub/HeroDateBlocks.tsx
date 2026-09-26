import { useEffect, useId, useState, type CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import {
  ensureGoogleFamilies,
  getHeroFont,
  HERO_COUNTDOWN_STYLES,
  HERO_MONOGRAM_LAYOUTS,
  type HeroDateLayout,
  type HeroMonogram,
} from './heroDecor'

/**
 * Blocs "date multi-lignes" et "compte à rebours" du hero — repris du
 * fichier de référence polices-overlay.html (sections Dates XXL / Dates
 * format américain / Mono & technique / Comptes à rebours), cf. échange du
 * 23/09/2026. Style dans hero-scrub.css (`.hs-dl-*`, `.hs-cd-*`).
 */

export function HeroDateLayoutBlock({ layout }: { layout: HeroDateLayout }) {
  useEffect(() => {
    ensureGoogleFamilies(layout.fonts)
  }, [layout.fonts])
  return (
    <div className={cn('hs-dl', `hs-dl-${layout.id}`)}>
      {layout.lines.map((line, i) => (
        <span key={i} className={cn('hs-dl-line', `hs-dl-${line.cls}`)}>
          {line.text}
        </span>
      ))}
    </div>
  )
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function remaining(targetIso: string, now: number) {
  const t = Math.max(0, new Date(targetIso).getTime() - now)
  return {
    d: Math.floor(t / 86400000),
    h: Math.floor(t / 3600000) % 24,
    m: Math.floor(t / 60000) % 60,
    s: Math.floor(t / 1000) % 60,
  }
}

export function HeroCountdownBlock({ style, targetIso }: { style: string; targetIso: string }) {
  const def = HERO_COUNTDOWN_STYLES.find((s) => s.id === style) ?? HERO_COUNTDOWN_STYLES[0]
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    ensureGoogleFamilies(def.fonts)
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [def.fonts])

  const { d, h, m, s } = remaining(targetIso, now)
  const withSeconds = def.id !== 'serif'
  const short = def.id === 'anton'
  const sep = def.id === 'serif' ? '·' : def.id === 'minimal' ? '—' : ':'
  const units: [number, string][] = [
    [d, short ? 'Jrs' : 'Jours'],
    [h, short ? 'Hrs' : 'Heures'],
    [m, 'Min'],
    ...(withSeconds ? ([[s, 'Sec']] as [number, string][]) : []),
  ]
  return (
    <div className={cn('hs-cd', `hs-cd-${def.id}`)} role="timer" aria-label="Compte à rebours">
      {units.map(([value, label], i) => (
        <span key={label} className="hs-cd-cell">
          {i > 0 && <span className="hs-cd-sep">{sep}</span>}
          <span className="hs-cd-unit">
            <span className="hs-cd-num">{pad(value)}</span>
            <span className="hs-cd-lab">{label}</span>
          </span>
        </span>
      ))}
    </div>
  )
}

/**
 * Monogramme des mariés — logo d'initiales (cf. HERO_MONOGRAM_LAYOUTS,
 * heroDecor.ts). Police = `--hs-font-family` du chapitre (fontId du bloc),
 * lettres = `--hs-text-primary` (couleur du bloc), filets = `m.accent`.
 */
export function HeroMonogramBlock({ m, size, fontId }: { m: HeroMonogram; size?: string; fontId?: string }) {
  const uid = useId().replace(/:/g, '')
  useEffect(() => {
    const f = getHeroFont(fontId)
    if (f) ensureGoogleFamilies(f.googleFontsFamily)
    ensureGoogleFamilies('Playfair+Display:ital@1&family=Montserrat:wght@300;400')
  }, [fontId])
  const A = m.a || 'A'
  const B = m.b || 'B'
  const scale = size === 'sm' ? 0.8 : size === 'lg' ? 1.2 : 1
  const style = {
    '--ms': scale,
    '--macc': m.accent || 'var(--hs-accent)',
    '--mseal': m.sealColor || '#8c1d24',
  } as CSSProperties
  let inner
  switch (m.layout) {
    case 'double':
      inner = (<><span>{A}</span><span className="hs-mono-acc">{B}</span></>)
      break
    case 'amp':
      inner = (<><span>{A}</span><em>&amp;</em><span>{B}</span></>)
      break
    case 'diamond':
      inner = (<div><span>{A}</span><i>·</i><span>{B}</span></div>)
      break
    case 'overlap':
      inner = (<><span className="a">{A}</span><span className="b">{B}</span></>)
      break
    case 'vline':
      inner = (<><div className="row"><span>{A}</span><i /><span>{B}</span></div><small>{m.dateNumeric}</small></>)
      break
    case 'wax':
      inner = (<><span>{A}</span><i>&amp;</i><span>{B}</span></>)
      break
    case 'frame':
      inner = (<><span>{A}</span><i>&amp;</i><span>{B}</span></>)
      break
    case 'stamp': {
      const ring = `SAVE THE DATE · ${m.dateShort.toUpperCase()} · `.repeat(2)
      inner = (
        <svg viewBox="0 0 200 200" aria-hidden="true">
          <defs>
            <path id={`ring-${uid}`} d="M100,100 m-70,0 a70,70 0 1,1 140,0 a70,70 0 1,1 -140,0" />
          </defs>
          <circle cx="100" cy="100" r="92" fill="none" stroke="var(--macc)" strokeWidth="1.2" />
          <circle cx="100" cy="100" r="50" fill="none" stroke="var(--macc)" strokeWidth="0.8" strokeDasharray="2 3" />
          <text className="ring"><textPath href={`#ring-${uid}`}>{ring}</textPath></text>
          <text className="mid" x="100" y="114" textAnchor="middle">{A}&amp;{B}</text>
        </svg>
      )
      break
    }
    default:
      inner = (<><span>{A}</span><i>·</i><span>{B}</span></>)
  }
  return (
    <div className="hs-mono-wrap">
      <div className={cn('hs-mono', `hs-mono-${HERO_MONOGRAM_LAYOUTS.some((l) => l.id === m.layout) ? m.layout : 'circle'}`)} style={style}>
        {inner}
      </div>
    </div>
  )
}
