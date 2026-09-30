import { Fragment, useEffect, useId, useState, type CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import {
  ensureGoogleFamilies,
  getHeroFont,
  HERO_COUNTDOWN_STYLES,
  HERO_MONOGRAM_LAYOUTS,
  HERO_NAMES_LAYOUTS,
  HERO_PROGRAMME_LAYOUTS,
  type HeroDateLayout,
  type HeroMonogram,
  type HeroNames,
  type HeroProgramme,
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
    '--mseal2': m.sealColor2 || m.sealColor || 'var(--hs-accent)',
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
    case 'rings':
      inner = (<><span className="hs-mono-ring ring-a" /><span className="hs-mono-ring ring-b" /><span className="a">{A}</span><span className="b hs-mono-acc">{B}</span></>)
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
          <text className="hs-mono-ring"><textPath href={`#ring-${uid}`}>{ring}</textPath></text>
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
      <div
        className={cn(
          'hs-mono',
          `hs-mono-${HERO_MONOGRAM_LAYOUTS.some((l) => l.id === m.layout) ? m.layout : 'circle'}`,
          // Forme du sceau (cf. HERO_SEAL_SHAPES) — uniquement pertinente
          // pour layout 'wax', ignorée sinon (classe sans effet ailleurs).
          m.layout === 'wax' && m.sealShape === 'double' && 'hs-mono-wax-double',
        )}
        style={style}
      >
        {inner}
      </div>
    </div>
  )
}

const ROMAN_STEPS = ['I', 'II', 'III', 'IV', 'V', 'VI']

/**
 * Programme du jour J — timeline overlay (cf. HERO_PROGRAMME_LAYOUTS /
 * HERO_PROGRAMME_ANIMATIONS, heroDecor.ts). Chaque étape porte `--i` : les
 * animations décalent leur départ avec (cf. `.hs-tlan-*` dans
 * hero-scrub.css), et `--hs-tl-dur` multiplie toutes les durées (réglage
 * de vitesse). Les libellés prennent la police du bloc
 * (`--hs-font-family`), les heures une mono, comme la maquette du
 * 29/09/2026.
 */
export function HeroProgrammeBlock({ p }: { p: HeroProgramme }) {
  useEffect(() => {
    ensureGoogleFamilies('JetBrains+Mono:wght@300&family=Montserrat:wght@300&family=Cinzel+Decorative')
  }, [])
  const items = p.items.filter((it) => (it.h || '').trim() || (it.l || '').trim())
  if (items.length === 0) return null
  const layout = HERO_PROGRAMME_LAYOUTS.some((l) => l.id === p.layout) ? p.layout : 'rail'
  const style = { '--hs-tl-dur': String(p.speed || 1) } as CSSProperties

  // 'arc' : points répartis sur une voûte, libellés posés dessus — mêmes
  // coordonnées que la maquette (repère 100×100, rayon 62).
  const arcPoints = items.map((it, i) => {
    const a = 200 + (i / Math.max(1, items.length - 1)) * 100
    const rad = (a * Math.PI) / 180
    return { it, cx: 50 + 62 * Math.cos(rad), cy: 96 + 62 * Math.sin(rad) }
  })

  const body = () => {
    switch (layout) {
      case 'horiz':
        return (
          <div className="hs-tl-track">
            {items.map((it, i) => (
              <span key={i} className="hs-tl-it" style={{ '--i': i } as CSSProperties}>
                <span className="hs-tl-h">{it.h}</span>
                <span className="hs-tl-dot" />
                <span className="hs-tl-l">{it.l}</span>
              </span>
            ))}
          </div>
        )
      case 'cols':
        return (
          <>
            <span className="hs-tl-rule" />
            {items.map((it, i) => (
              <Fragment key={i}>
                <span className="hs-tl-h" style={{ '--i': i } as CSSProperties}>{it.h}</span>
                <span className="hs-tl-l" style={{ '--i': i } as CSSProperties}>{it.l}</span>
              </Fragment>
            ))}
          </>
        )
      case 'dots':
        return (
          <>
            {items.map((it, i) => (
              <div key={i} className="hs-tl-it" style={{ '--i': i } as CSSProperties}>
                <span className="hs-tl-l">{it.l}</span>
                <span className="hs-tl-lead" />
                <span className="hs-tl-h">{it.h}</span>
              </div>
            ))}
          </>
        )
      case 'roman':
        return (
          <>
            {items.map((it, i) => (
              <div key={i} className="hs-tl-it" style={{ '--i': i } as CSSProperties}>
                <span className="hs-tl-r">{ROMAN_STEPS[i] ?? String(i + 1)}</span>
                <span className="hs-tl-l">{it.l}</span>
                <span className="hs-tl-h">{it.h}</span>
              </div>
            ))}
          </>
        )
      case 'num':
        return (
          <>
            {items.map((it, i) => (
              <div key={i} className="hs-tl-it" style={{ '--i': i } as CSSProperties}>
                <span className="hs-tl-n">{String(i + 1).padStart(2, '0')}</span>
                <span className="hs-tl-tx">
                  <span className="hs-tl-h">{it.h}</span>
                  <span className="hs-tl-l">{it.l}</span>
                </span>
              </div>
            ))}
          </>
        )
      case 'arc':
        return (
          <>
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <path d="M -8 38 A 62 62 0 0 1 108 38" fill="none" stroke="currentColor" strokeWidth="0.7" opacity="0.55" />
              {arcPoints.map((pt, i) => (
                <circle key={i} cx={pt.cx.toFixed(1)} cy={pt.cy.toFixed(1)} r="1.5" fill="currentColor" />
              ))}
            </svg>
            {arcPoints.map((pt, i) => (
              <span
                key={i}
                className="hs-tl-it"
                style={{ '--i': i, left: `${pt.cx.toFixed(1)}%`, top: `${(pt.cy - 13).toFixed(1)}%` } as CSSProperties}
              >
                <span className="hs-tl-h">{pt.it.h}</span>
                <span className="hs-tl-l">{pt.it.l}</span>
              </span>
            ))}
          </>
        )
      default:
        // rail / big / chips / min — même structure (heure + libellé), le
        // CSS de chaque mise en page fait le reste.
        return (
          <>
            {layout === 'rail' && <span className="hs-tl-rail-line" />}
            {layout === 'rail' && p.animation === 'travel' && <span className="hs-tl-runner" />}
            {items.map((it, i) => (
              <div key={i} className="hs-tl-it" style={{ '--i': i } as CSSProperties}>
                {layout === 'rail' && <span className="hs-tl-dot" />}
                <span className="hs-tl-h">{it.h}</span>
                <span className="hs-tl-l">{it.l}</span>
              </div>
            ))}
          </>
        )
    }
  }

  return (
    <div
      className={cn('hs-tl', `hs-tl-${layout}`, p.animation && `hs-tlan-${p.animation}`)}
      style={style}
    >
      {body()}
    </div>
  )
}

/**
 * Prénoms des mariés — 12 mises en page (cf. HERO_NAMES_LAYOUTS,
 * heroDecor.ts). N'est JAMAIS rendu pour `layout: 'ligne'` : ce cas
 * continue de passer par `segments`/`fitOneLine` dans ChapterContent, donc
 * un projet qui ne choisit rien garde exactement son rendu d'avant.
 */
export function HeroNamesBlock({ n }: { n: HeroNames }) {
  const uid = useId().replace(/:/g, '')
  useEffect(() => {
    ensureGoogleFamilies('Playfair+Display:ital@1&family=Cinzel&family=Cinzel+Decorative&family=Great+Vibes&family=Montserrat:wght@300')
  }, [])
  const A = n.a || 'Prénom'
  const B = n.b || ''
  const layout = HERO_NAMES_LAYOUTS.some((l) => l.id === n.layout) ? n.layout : 'ligne'
  const [famA, famB] = n.family ? n.family.split(/\s+(?:&|et)\s+/i).map((x) => x.trim()) : ['', '']
  const date = n.dateShort ? <span className="hs-nm-dt">{n.dateShort}</span> : null
  const rule = <span className="hs-nm-rule" />

  let inner
  switch (layout) {
    case 'stack':
      inner = (<><span className="hs-nm-n">{A}<span className="hs-nm-amp">&amp;</span>{B}</span>{rule}{date}</>)
      break
    case 'side':
      inner = (
        <>
          <span className="hs-nm-row">
            <span className="hs-nm-n">{A}</span>
            <span className="hs-nm-vr" />
            <span className="hs-nm-n">{B}</span>
          </span>
          {rule}
          {date}
        </>
      )
      break
    case 'caps':
      inner = (<><span className="hs-nm-n">{A.toLocaleUpperCase('fr-FR')}<span className="hs-nm-amp">&amp;</span>{B.toLocaleUpperCase('fr-FR')}</span>{rule}{date}</>)
      break
    case 'amp':
      inner = (
        <>
          <span className="hs-nm-ghost" aria-hidden="true">&amp;</span>
          <span className="hs-nm-over">
            <span className="hs-nm-n">{A}</span>
            <span className="hs-nm-n">{B}</span>
          </span>
        </>
      )
      break
    case 'filigree': {
      const ini = `${A.charAt(0)}${B.charAt(0)}`.toLocaleUpperCase('fr-FR')
      inner = (
        <>
          <span className="hs-nm-ghost" aria-hidden="true">{ini}</span>
          <span className="hs-nm-over">
            <span className="hs-nm-n">{A} &amp; {B}</span>
            {date}
          </span>
        </>
      )
      break
    }
    case 'arc':
      inner = (
        <>
          <svg viewBox="0 0 200 120" aria-hidden="true">
            <defs>
              <path id={`nm-arc-${uid}`} d="M 14 108 A 92 92 0 0 1 186 108" />
            </defs>
            <text textAnchor="middle">
              <textPath href={`#nm-arc-${uid}`} startOffset="50%">
                {A} <tspan className="hs-nm-a">&amp;</tspan> {B}
              </textPath>
            </text>
          </svg>
          {rule}
          {date}
        </>
      )
      break
    case 'cartouche':
      inner = (
        <span className="hs-nm-box">
          <span className="hs-nm-n">{A}<span className="hs-nm-amp"> &amp; </span>{B}</span>
        </span>
      )
      break
    case 'mix':
      inner = (<><span className="hs-nm-a1">{A}</span><span className="hs-nm-amp">&amp;</span><span className="hs-nm-b1">{B.toLocaleUpperCase('fr-FR')}</span>{rule}{date}</>)
      break
    case 'calli':
      inner = (<><span className="hs-nm-n">{A} <span className="hs-nm-amp">&amp;</span> {B}</span>{date}</>)
      break
    case 'full':
      inner = (
        <>
          <span className="hs-nm-n">{A}{famA && <span className="hs-nm-fam">{famA.toLocaleUpperCase('fr-FR')}</span>}</span>
          <span className="hs-nm-amp">&amp;</span>
          <span className="hs-nm-n">{B}{famB && <span className="hs-nm-fam">{famB.toLocaleUpperCase('fr-FR')}</span>}</span>
        </>
      )
      break
    case 'verbe':
      inner = (
        <>
          <span className="hs-nm-n">{A} <span className="hs-nm-amp">&amp;</span> {B}</span>
          <span className="hs-nm-v">{n.verb || 'se disent oui'}</span>
          {rule}
          {date}
        </>
      )
      break
    default:
      inner = (<><span className="hs-nm-n">{A}<span className="hs-nm-amp">&amp;</span>{B}</span>{rule}{date}</>)
  }

  return <div className={cn('hs-nm', `hs-nm-${layout}`)}>{inner}</div>
}
