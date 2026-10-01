import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { ensureGoogleFamilies } from './heroDecor'
import type { HeroScene } from './heroScenes'

/**
 * Rendu des 37 scènes de la bibliothèque (cf. heroScenes.ts) — un seul
 * composant, un `switch` sur l'identifiant de mise en page. Tout est
 * dimensionné en `cqw` (le hero est un conteneur de requête) et toutes les
 * couleurs passent par les variables du thème (`--hs-text-primary`,
 * `--hs-chapter-accent`/`--hs-accent`, `--hs-text-secondary`), jamais en
 * dur : une scène doit s'adapter au thème du modèle et aux couleurs réglées
 * bloc par bloc, exactement comme les autres blocs overlay.
 *
 * Les scènes qui ont besoin de la vraie date (calendrier, décompte, date
 * éclatée…) la lisent dans `s.dateIso`, et retombent proprement sur un
 * repli lisible quand le projet n'a pas encore de date.
 */

const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const DAYS_FR = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

/** Un texte saisi avec des retours à la ligne → des `<br/>` réels. */
function ml(text: string) {
  const lines = text.split('\n')
  return lines.map((l, i) => (
    <span key={i}>
      {l}
      {i < lines.length - 1 ? <br /> : null}
    </span>
  ))
}

/** Prénoms du couple, « & » à l'accent — le motif partagé par une dizaine de scènes. */
function Couple({ s }: { s: HeroScene }) {
  return (
    <>
      {s.a}
      {s.b ? (
        <>
          {' '}
          <span className="sc-amp">&amp;</span> {s.b}
        </>
      ) : null}
    </>
  )
}

export function HeroSceneBlock({ s }: { s: HeroScene }) {
  // Les scènes « décompte en mois » et « J−… » se comptent depuis
  // maintenant : `Date.now()` ne peut pas être appelé pendant le rendu
  // (fonction impure), même motif que HeroCountdownBlock — rafraîchi une
  // fois par minute, une granularité au jour n'a pas besoin de plus.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (s.id !== 'mois' && s.id !== 'jmoins') return
    const id = window.setInterval(() => setNow(Date.now()), 60000)
    return () => window.clearInterval(id)
  }, [s.id])
  useEffect(() => {
    ensureGoogleFamilies(
      'Montserrat:wght@300;400;500&family=JetBrains+Mono:wght@300;400&family=Anton&family=Bebas+Neue&family=Great+Vibes',
    )
  }, [])

  const d = s.dateIso ? new Date(s.dateIso) : null
  const kick = s.kicker ? <div className="sc-kick">{s.kicker}</div> : null
  const rule = <div className="sc-rule" />
  const items = s.items ?? []

  let inner: React.ReactNode = null
  switch (s.id) {
    // ---- Ouverture ----
    case 'formule':
      inner = (
        <>
          <div className="sc-f1">{ml(s.kicker)}</div>
          <div className="sc-f2">
            <Couple s={s} />
          </div>
          <div className="sc-f3">{s.extra || s.dateShort}</div>
        </>
      )
      break
    case 'citation':
      inner = (
        <>
          <div className="sc-q">{s.title}</div>
          <div className="sc-who">
            {s.a}
            {s.b ? ` & ${s.b}` : ''}
          </div>
        </>
      )
      break

    // ---- Le couple ----
    case 'photo-polaroid':
      inner = (
        <div className="sc-ph">
          <div className="sc-im" style={s.image ? { backgroundImage: `url(${s.image})` } : undefined}>
            {s.image ? null : <span>photo du couple</span>}
          </div>
          <div className="sc-cap">
            {s.a}
            {s.b ? ` & ${s.b}` : ''}
          </div>
        </div>
      )
      break
    case 'photo-medaillon':
      inner = (
        <>
          <div className="sc-ph" style={s.image ? { backgroundImage: `url(${s.image})` } : undefined}>
            {s.image ? null : <span>photo du couple</span>}
          </div>
          {rule}
          <div className="sc-sm">
            {s.a}
            {s.b ? ` & ${s.b}` : ''}
          </div>
        </>
      )
      break
    case 'temoins':
      inner = (
        <>
          {kick}
          <div className="sc-cols">
            {items.slice(0, 2).map((it, i) => (
              <div key={i} className="sc-col">
                <div className="sc-h">{it.a}</div>
                <div className="sc-n">
                  {it.b
                    .split(/\s*,\s*/)
                    .filter(Boolean)
                    .map((n, j) => (
                      <span key={j}>
                        {n}
                        <br />
                      </span>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )
      break

    // ---- Notre histoire ----
    case 'jalons':
      inner = (
        <>
          {items.map((it, i) => (
            <div key={i} className="sc-it">
              <span className="sc-yr">{it.a}</span>
              <span className="sc-lb">{it.b}</span>
              {i < items.length - 1 ? <span className="sc-sep" /> : null}
            </div>
          ))}
        </>
      )
      break
    case 'millesimes':
      inner = (
        <>
          {items.map((it, i) => (
            <div key={i}>
              {i > 0 ? rule : null}
              <div className="sc-it">
                <div className="sc-yr">{it.a}</div>
                <div className="sc-lb">{it.b}</div>
              </div>
            </div>
          ))}
        </>
      )
      break

    // ---- Le lieu & le jour ----
    case 'lieu':
      inner = (
        <>
          <div className="sc-pin">✦</div>
          {kick}
          <div className="sc-nm">{ml(s.title)}</div>
          {rule}
          <div className="sc-ad">{ml(s.subtitle)}</div>
        </>
      )
      break
    case 'dresscode':
      inner = (
        <>
          {kick}
          <div className="sc-nm">{ml(s.title)}</div>
          <div className="sc-dots">
            {(s.colors ?? []).filter(Boolean).map((c, i) => (
              <i key={i} style={{ background: c }} />
            ))}
          </div>
        </>
      )
      break
    case 'infos':
      inner = (
        <>
          {items.map((it, i) => (
            <div key={i} className="sc-it">
              <span className="sc-k">{it.a}</span>
              <span className="sc-v">{it.b}</span>
            </div>
          ))}
        </>
      )
      break

    // ---- Clôture ----
    case 'rsvp':
      inner = (
        <>
          <div className="sc-box">
            {kick}
            <div className="sc-dt">{s.title}</div>
          </div>
          <div className="sc-lk">{s.subtitle}</div>
        </>
      )
      break
    case 'suite-fp':
      inner = (
        <>
          <div className="sc-t">{ml(s.title)}</div>
          {rule}
          <div className="sc-s">{s.subtitle}</div>
        </>
      )
      break

    // ---- L'annonce ----
    case 'hold':
      inner = (
        <>
          {kick}
          <div className="sc-t">{ml(s.title)}</div>
          <div className="sc-d sc-mono">{s.extra || (d ? String(d.getFullYear()) : '')}</div>
        </>
      )
      break
    case 'bilingue':
      inner = (
        <>
          <div className="sc-en">{s.kicker}</div>
          <div className="sc-fr">{ml(s.title)}</div>
          <div className="sc-d sc-mono">{s.extra || s.dateNumeric}</div>
        </>
      )
      break
    case 'tampon':
      inner = (
        <div className="sc-box">
          <div className="sc-t1">{s.title}</div>
          <div className="sc-t2">{s.extra || s.dateNumeric}</div>
          <div className="sc-t3">{s.subtitle}</div>
        </div>
      )
      break
    case 'billet':
      inner = (
        <div className="sc-box">
          <div className="sc-t1">{s.kicker}</div>
          <div className="sc-t2">{(s.title || s.dateShort).toLocaleUpperCase('fr-FR')}</div>
          <div className="sc-t3">
            {s.initials}
            {s.subtitle ? ` · ${s.subtitle.toLocaleUpperCase('fr-FR')}` : ''}
          </div>
        </div>
      )
      break

    // ---- La date, autrement ----
    case 'saison':
      inner = (
        <>
          {kick}
          <div className="sc-s">{ml(s.title)}</div>
          <div className="sc-y">{s.extra || (d ? String(d.getFullYear()) : '')}</div>
        </>
      )
      break
    case 'jour-semaine':
      inner = (
        <>
          <div className="sc-j">{s.title || (d ? DAYS_FR[d.getDay()] : '')}</div>
          <div className="sc-d">{s.subtitle || s.dateShort}</div>
        </>
      )
      break
    case 'mois': {
      const months = d ? Math.max(0, Math.round((d.getTime() - now) / 2629800000)) : 0
      inner = (
        <>
          <div className="sc-kick sc-k">{s.kicker}</div>
          <div className="sc-n">{months}</div>
          <div className="sc-u">{s.subtitle}</div>
        </>
      )
      break
    }

    // ---- Le lieu, sans l'adresse ----
    case 'region':
      inner = (
        <>
          {kick}
          <div className="sc-r">{ml(s.title)}</div>
          <div className="sc-p">{s.subtitle}</div>
        </>
      )
      break
    case 'repere':
      inner = (
        <>
          <div className="sc-pin">
            <svg viewBox="0 0 60 60" aria-hidden="true">
              <circle cx="30" cy="30" r="27" fill="none" stroke="currentColor" strokeWidth="1" opacity=".5" />
              <circle cx="30" cy="30" r="20" fill="none" stroke="currentColor" strokeWidth=".7" strokeDasharray="2 4" opacity=".7" />
              <path d="M30 16 C24 16 20 20.6 20 26 C20 33 30 44 30 44 C30 44 40 33 40 26 C40 20.6 36 16 30 16 Z" fill="currentColor" />
              <circle cx="30" cy="26" r="3.4" fill="var(--hs-frame-bg, #1b0c0c)" />
            </svg>
          </div>
          <div className="sc-r">{ml(s.title)}</div>
          <div className="sc-c">{s.extra}</div>
        </>
      )
      break

    // ---- Ce qu'on attend d'eux ----
    case 'conges':
      inner = (
        <>
          <div className="sc-t">{ml(s.title)}</div>
          <div className="sc-s">{s.subtitle}</div>
        </>
      )
      break
    case 'hashtag': {
      const tag = s.title || `#${s.a.replace(/\s/g, '')}Et${s.b.replace(/\s/g, '')}${d ? d.getFullYear() : ''}`
      inner = (
        <>
          {kick}
          <div className="sc-h">{tag}</div>
          <div className="sc-s">{s.subtitle}</div>
        </>
      )
      break
    }
    case 'suite-std':
      inner = (
        <>
          <div className="sc-t">{ml(s.title)}</div>
          {rule}
          <div className="sc-s">
            <Couple s={s} />
          </div>
        </>
      )
      break

    // ---- Comme au cinéma ----
    case 'bande':
      inner = (
        <>
          <div className="sc-soon">{s.kicker}</div>
          <div className="sc-t">
            <Couple s={s} />
          </div>
          <div className="sc-d">{s.extra || (d ? `${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}` : '')}</div>
        </>
      )
      break
    case 'generique':
      inner = (
        <>
          {items.map((it, i) => (
            <div key={i}>
              <div className="sc-r">{it.a}</div>
              <div className={cn('sc-n', i > 1 && 'sc-small')}>{it.b || (i === 0 ? s.a : i === 1 ? s.b : '')}</div>
            </div>
          ))}
        </>
      )
      break
    case 'affiche':
      inner = (
        <>
          <div className="sc-top">
            {s.kicker || (
              <>
                Un mariage de {s.a}
                {s.b ? ` & ${s.b}` : ''}
              </>
            )}
          </div>
          <div className="sc-t">{ml(s.title)}</div>
          <div className="sc-cast">{s.subtitle || s.dateShort}</div>
          <div className="sc-fine">{ml(s.extra)}</div>
        </>
      )
      break
    case 'clap':
      inner = (
        <div className="sc-board">
          <div className="sc-stripe" />
          <div className="sc-body">
            <div>
              <i>PROD.</i> {s.initials}
            </div>
            <div>
              <i>SCÈNE</i> <span className="sc-big">01</span> · <i>PRISE</i> 01
            </div>
            <div>
              <i>DATE</i> {s.extra || s.dateNumeric.replace(/ · /g, '.')}
            </div>
          </div>
        </div>
      )
      break

    // ---- Le calendrier ----
    case 'calendrier': {
      // Grille du vrai mois du mariage — 1re colonne = lundi (usage FR).
      const ref = d ?? new Date()
      const first = new Date(ref.getFullYear(), ref.getMonth(), 1)
      const blanks = (first.getDay() + 6) % 7
      const nbDays = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate()
      inner = (
        <div className="sc-sheet">
          <div className="sc-hd">
            {MONTHS_FR[ref.getMonth()]} {ref.getFullYear()}
          </div>
          <div className="sc-grid7">
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((x, i) => (
              <span key={`dow${i}`} className="sc-dow">
                {x}
              </span>
            ))}
            {Array.from({ length: blanks }, (_, i) => (
              <span key={`b${i}`} />
            ))}
            {Array.from({ length: nbDays }, (_, i) => (
              <span key={i} className={cn(d && i + 1 === d.getDate() && 'sc-on')}>
                {i + 1}
              </span>
            ))}
          </div>
        </div>
      )
      break
    }
    case 'eclat': {
      const pad = (n: number) => String(n).padStart(2, '0')
      inner = (
        <>
          <div className="sc-l">{d ? pad(d.getDate()) : '12'}</div>
          <div className="sc-l">{d ? pad(d.getMonth() + 1) : '06'}</div>
          <div className="sc-l">{d ? pad(d.getFullYear() % 100) : '27'}</div>
          <div className="sc-s">{s.subtitle}</div>
        </>
      )
      break
    }
    case 'jmoins': {
      const days = d ? Math.max(0, Math.ceil((d.getTime() - now) / 86400000)) : 0
      inner = (
        <>
          {kick}
          <div className="sc-n">J−{days}</div>
          <div className="sc-s">{s.subtitle}</div>
        </>
      )
      break
    }

    // ---- Objets du voyage ----
    case 'timbre':
      inner = (
        <div className="sc-st">
          <div className="sc-in">
            <div className="sc-mn">{s.initials}</div>
            <div className="sc-dt">{s.extra || s.dateNumeric.replace(/ · /g, '.')}</div>
          </div>
          <div className="sc-val">{s.subtitle}</div>
        </div>
      )
      break
    case 'etiquette':
      inner = (
        <div className="sc-tg">
          <div className="sc-to">{s.kicker}</div>
          <div className="sc-pl">{ml(s.title)}</div>
          <div className="sc-dt">{s.extra || s.dateNumeric}</div>
        </div>
      )
      break
    case 'rose':
      inner = (
        <>
          <div className="sc-cmp">
            <svg viewBox="0 0 60 60" aria-hidden="true">
              <circle cx="30" cy="30" r="27" fill="none" stroke="currentColor" strokeWidth="1" opacity=".6" />
              <circle cx="30" cy="30" r="21" fill="none" stroke="currentColor" strokeWidth=".5" strokeDasharray="1 3" opacity=".8" />
              <path d="M30 9 L34 28 L30 51 L26 28 Z" fill="currentColor" />
              <path d="M9 30 L28 26 L51 30 L28 34 Z" fill="currentColor" opacity=".35" />
              <circle cx="30" cy="30" r="2.4" fill="currentColor" />
            </svg>
          </div>
          <div className="sc-pl">{ml(s.title)}</div>
          <div className="sc-km">{s.extra}</div>
        </>
      )
      break

    // ---- Fiançailles & histoire ----
    case 'oui':
      inner = (
        <>
          <div className="sc-t">{ml(s.title)}</div>
          <div className="sc-s">{s.subtitle}</div>
        </>
      )
      break
    case 'villes':
      inner = (
        <>
          {items.map((it, i) => (
            <div key={i}>
              {i > 0 ? <div className="sc-ar">↓</div> : null}
              <div className="sc-k">{it.a}</div>
              <div className="sc-v">{it.b}</div>
            </div>
          ))}
        </>
      )
      break
    case 'ans':
      inner = (
        <>
          {kick}
          <div className="sc-n">{s.title}</div>
          <div className="sc-t">{ml(s.subtitle)}</div>
        </>
      )
      break

    default:
      return null
  }

  return <div className={cn('hs-sc', `hs-sc-${s.id}`)}>{inner}</div>
}
