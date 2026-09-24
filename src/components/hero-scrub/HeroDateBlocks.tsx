import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { ensureGoogleFamilies, HERO_COUNTDOWN_STYLES, type HeroDateLayout } from './heroDecor'

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
