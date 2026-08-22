import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react'
import { useCountdown, type ProgrammeItem } from './DetailsSombre'

/**
 * Refonte bespoke de 4 sections du faire-part « Edwige & Wilfried » — date
 * (lettres qui se recomposent + compte à rebours en Fraunces variable),
 * programme (défilement horizontal épinglé), lieu (loupe magnétique sur
 * carte SVG à deux calques), RSVP (sceau de cire pressé). Branché via les
 * slots `renderDate`/`renderLieu`/`renderProgramme`/`renderRsvp` de
 * DetailsSombre — cf. ce fichier pour pourquoi ces 4 sections sortent du
 * système de thème générique plutôt que d'être une variation de plus.
 *
 * Palette FIXE, propre à cette redesign — pas les couleurs du thème
 * générique de la page (rose pastel, cf. DETAILS_THEME dans
 * edwigeWilfriedContent.ts). Fond des cases Date/Lieu/Programme repassé en
 * clair sur retour client (c'était sombre au départ) — `EW_BG`/
 * `EW_BG_PROGRAMME` valent la même teinte crème que `EW_CREAM` (pas une 2e
 * couleur inventée), et le texte qui était en crème sur ces 3 cases est
 * passé à `EW_INK` (sombre). La case Date, elle, est passée en blanc pur
 * (`EW_BG_DATE`) sur un 2e retour client — distincte de `EW_BG` pour ne
 * pas aussi blanchir la carte du Lieu, qui garde le crème. Le sceau RSVP
 * n'a pas été redemandé en clair : il garde son fond bordeaux/EW_CREAM
 * d'origine, `EW_CREAM` reste donc utile telle quelle pour lui. Accent
 * bordeaux/doré inchangés (ce sont des accents, pas le « texte blanc » visé).
 */
const EW_BG = '#f3ead9'
const EW_BG_DATE = 'transparent' // sur retour client — la case Date se fond maintenant dans le fond de la page (blanc pur essayé juste avant, non retenu)
const EW_BG_PROGRAMME = '#f3ead9'
const EW_CREAM = '#f3ead9'
const EW_INK = '#2E2620' // texte sombre — repris de DETAILS_THEME.ink (edwigeWilfriedContent.ts), déjà utilisé ailleurs sur cette page
const EW_BORDEAUX = '#b02634'
const EW_GOLD = '#c9a961'

/** Titre de section (« La date », « Le Lieu », « RSVP »…) — même traitement visuel que « Le Programme », factorisé pour ne pas le répéter 4 fois. */
function EwLabel({ children }: { children: string }) {
  return (
    <p className="mb-7 text-center text-[19px] italic" style={{ color: EW_GOLD }}>
      {children}
    </p>
  )
}

/**
 * Styles globaux partagés par les 4 composants (keyframes, `@property --p`
 * pour l'anneau du sceau, CSS scroll-driven du programme) — injectés une
 * seule fois via ce composant, monté une fois par FairePartEdwigeWilfried
 * à côté de DetailsSombre. Un seul `<style>`, pas un par composant qui le
 * consomme (ils sont tous montés simultanément sur la même page).
 */
export function EwEffectsStyles() {
  return (
    <style>{`
      @property --p {
        syntax: '<number>';
        inherits: true;
        initial-value: 0;
      }
      @keyframes ew-ping {
        0% { box-shadow: 0 0 0 0 rgba(176, 38, 52, 0.55); }
        100% { box-shadow: 0 0 0 18px rgba(176, 38, 52, 0); }
      }
      @keyframes ew-fade-in {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @supports (view-timeline-name: --x) {
        /* nommée sur le CONTENEUR EXTERNE (230vh), pas sur la piste (100vh,
           épinglée) : c'est lui qui doit fournir toute la plage de scroll
           « contenue », cf. animation-range ci-dessous sur la piste qui la
           référence. */
        .ew-hprog-outer {
          view-timeline-name: --ew-progress;
          view-timeline-axis: block;
        }
        .ew-hprog-track[data-native="1"] {
          animation-name: ew-hprog-scroll;
          animation-duration: 1ms; /* ignorée avec un view-timeline, requise pour une syntaxe valide */
          animation-timing-function: linear;
          animation-fill-mode: both;
          animation-timeline: --ew-progress;
          animation-range: contain 0% contain 100%;
        }
      }
      @keyframes ew-hprog-scroll {
        from { transform: translateX(0); }
        to { transform: translateX(calc(-100% + 100cqw)); }
      }

      /* Notre histoire — chaque mot part à 12% d'opacité et « s'encre »
         (opacité pleine) au fur et à mesure qu'il traverse le viewport, de
         façon réversible (on peut remonter). CSS natif : chaque span porte
         SON PROPRE view-timeline (sujet = lui-même, pas un ancêtre nommé
         comme pour la piste horizontale du programme — ici chaque mot doit
         s'animer selon SA PROPRE traversée, pas celle d'un conteneur
         commun) via animation-timeline: view(), réversible par nature
         (contrairement à une animation classique, la progression suit
         directement le scroll dans les deux sens, rien à gérer en plus). */
      .ew-word-ink {
        opacity: 0.12;
      }
      @supports (animation-timeline: view()) {
        .ew-word-ink {
          animation-name: ew-word-ink-anim;
          animation-duration: 1ms; /* ignorée avec un view-timeline, requise pour une syntaxe valide */
          animation-fill-mode: both;
          animation-timeline: view();
          animation-range: cover 5% cover 42%;
        }
      }
      @keyframes ew-word-ink-anim {
        from { opacity: 0.12; }
        to { opacity: 1; }
      }
      /* Repli JS (cf. NotreHistoire, IntersectionObserver à seuils
         multiples) : bascule discrète d'une classe plutôt qu'un scrub
         continu — suffisant en repli, avec une petite transition pour ne
         pas être un pur « pop ». */
      .ew-word-ink.ew-inked {
        opacity: 1;
        transition: opacity 0.4s ease;
      }
      @media (prefers-reduced-motion: reduce) {
        .ew-word-ink {
          opacity: 1;
          animation: none;
        }
      }
    `}</style>
  )
}

/* ------------------------------------------------------------------ */
/* 1. Date — lettres qui se recomposent + compte à rebours variable    */
/* ------------------------------------------------------------------ */

/**
 * Titre en lettres qui se recomposent — chaque caractère part d'une
 * position/rotation/échelle aléatoire (translate ±120px, rotate ±40°,
 * scale 1.6, blur 14px) et « atterrit » à sa place, delay = index × 40ms,
 * 1,6s, cubic-bezier(.22,1,.36,1). Positions aléatoires calculées UNE FOIS
 * (useMemo, pas à chaque rendu) — sinon l'état "avant révélation" bougerait
 * sous les yeux à chaque re-render (ex. tick du countdown, qui vit dans le
 * même composant parent) au lieu de rester stable jusqu'au déclenchement.
 */
function ScatterTitle({ text, revealed, reducedMotion }: { text: string; revealed: boolean; reducedMotion: boolean }) {
  const chars = useMemo(() => text.split(''), [text])
  const offsets = useMemo(
    () => chars.map(() => ({ dx: (Math.random() * 2 - 1) * 120, dy: (Math.random() * 2 - 1) * 120, rot: (Math.random() * 2 - 1) * 40 })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [text],
  )

  return (
    <p className="font-display whitespace-nowrap text-[22px] italic leading-[1.2] sm:text-[28px]" aria-label={text}>
      {chars.map((ch, i) => (
        <span
          key={i}
          aria-hidden
          className="inline-block"
          style={
            reducedMotion
              ? { color: EW_INK }
              : {
                  color: EW_INK,
                  transform: revealed
                    ? 'translate(0, 0) rotate(0deg) scale(1)'
                    : `translate(${offsets[i].dx}px, ${offsets[i].dy}px) rotate(${offsets[i].rot}deg) scale(1.6)`,
                  filter: revealed ? 'blur(0px)' : 'blur(14px)',
                  opacity: revealed ? 1 : 0,
                  transition: 'transform 1.6s cubic-bezier(.22,1,.36,1), filter 1.6s cubic-bezier(.22,1,.36,1), opacity 1.6s cubic-bezier(.22,1,.36,1)',
                  transitionDelay: `${i * 40}ms`,
                }
          }
        >
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </p>
  )
}

/**
 * Un chiffre du compte à rebours, en Fraunces variable — au changement de
 * valeur, la graisse « gonfle » (wght 300→800, SOFT 100→0) et vire bordeaux
 * pendant 450ms avant de revenir. Nécessite Fraunces chargée en variable
 * complète, pas en coupes statiques fixes (cf. index.html). Chiffres
 * tabulaires (largeur fixe) pour que le compteur ne « saute » pas
 * horizontalement à chaque tick.
 */
function PulseDigit({ value, label }: { value: number; label: string }) {
  const [pulsing, setPulsing] = useState(false)
  const prev = useRef(value)

  useEffect(() => {
    if (prev.current === value) return
    prev.current = value
    setPulsing(true)
    const id = window.setTimeout(() => setPulsing(false), 450)
    return () => window.clearTimeout(id)
  }, [value])

  return (
    <div className="flex flex-col items-center gap-2">
      <span
        className="font-display tabular-nums"
        style={{
          fontSize: 28,
          color: pulsing ? EW_BORDEAUX : EW_INK,
          fontVariationSettings: pulsing ? "'wght' 800, 'SOFT' 0" : "'wght' 300, 'SOFT' 100",
          transition: 'font-variation-settings 450ms ease, color 450ms ease',
        }}
      >
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-[10px] uppercase tracking-[0.22em]" style={{ color: 'rgba(46, 38, 32, 0.55)' }}>
        {label}
      </span>
    </div>
  )
}

export function ScatterDateCard({
  weddingDateTime,
  revealed,
  reducedMotion,
}: {
  weddingDateTime: string
  revealed: boolean
  reducedMotion: boolean
}) {
  const targetMs = new Date(weddingDateTime).getTime()
  const date = new Date(weddingDateTime)
  const month = date.toLocaleDateString('fr-FR', { month: 'long' })
  const day = date.getDate()
  const year = date.getFullYear()
  // Jour en chiffres + année, sans le jour de la semaine (retiré sur
  // retour client — "Mardi 21 décembre 2027" → "21 décembre 2027").
  const title = `${day} ${month} ${year}`
  const { d, h, m, s } = useCountdown(targetMs)

  return (
    <>
      <EwLabel>La date</EwLabel>
      <div className="rounded-2xl px-6 py-9 text-center" style={{ background: EW_BG_DATE }}>
        <ScatterTitle text={title} revealed={revealed} reducedMotion={reducedMotion} />

        {/* filet doré dégradé — s'étire sous le titre une fois les lettres posées */}
        <div
          className="mx-auto mt-5 h-px w-32"
          style={{
            background: `linear-gradient(90deg, transparent, ${EW_GOLD}, transparent)`,
            transform: reducedMotion || revealed ? 'scaleX(1)' : 'scaleX(0)',
            transition: reducedMotion ? 'none' : 'transform 0.8s cubic-bezier(.22,1,.36,1)',
            transitionDelay: reducedMotion ? '0ms' : `${title.length * 40 + 300}ms`,
          }}
          aria-hidden
        />

        <div className="mt-8 flex justify-center gap-5" aria-label={`Compte à rebours jusqu'au ${title}`}>
          <PulseDigit value={d} label="Jours" />
          <PulseDigit value={h} label="Heures" />
          <PulseDigit value={m} label="Min" />
          <PulseDigit value={s} label="Sec" />
        </div>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* 2. Programme — défilement horizontal épinglé                        */
/* ------------------------------------------------------------------ */

function StepCard({ item }: { item: ProgrammeItem }) {
  return (
    <div className="flex h-full flex-col justify-center px-2" style={{ width: 'min(400px, 74cqw)', flex: '0 0 auto' }}>
      <div className="mb-5 h-px w-10" style={{ background: 'rgba(46, 38, 32, 0.15)' }} aria-hidden />
      <p className="font-display mt-3 text-[52px] leading-none" style={{ color: EW_BORDEAUX, fontVariationSettings: "'wght' 200" }}>
        {item.time}
      </p>
      <p className="font-display mt-3 text-[20px] italic" style={{ color: EW_INK }}>
        {item.label}
      </p>
      {item.sub && (
        <p className="mt-2 text-[14px]" style={{ color: 'rgba(46, 38, 32, 0.55)' }}>
          {item.sub}
        </p>
      )}
    </div>
  )
}

/**
 * Piste horizontale épinglée — conteneur externe de 230vh, section sticky
 * top:0 de 100vh à l'intérieur (`container-type: inline-size` pour que les
 * étapes en `cqw` se dimensionnent sur SA largeur, `clip-path: inset(0)`
 * pour rogner la piste sans casser le sticky, cf. demande). Deux moteurs :
 *
 * - CSS natif (`animation-timeline`) quand `@supports` le confirme — pris
 *   en charge par `data-native="1"` + la classe `.ew-hprog-track` définie
 *   dans `EwEffectsStyles` : le navigateur pilote seul le `translateX` en
 *   fonction du scroll, aucun JS après le montage.
 * - Fallback JS (écouteur de scroll + rAF) sinon : progression calculée
 *   depuis la position du conteneur externe (230vh − 100vh de piste utile),
 *   appliquée en mutation directe de `style.transform` (pas de re-render
 *   React à 60fps).
 *
 * `prefers-reduced-motion` : aucun des deux — la piste redevient un simple
 * scroll horizontal natif avec `scroll-snap`, sans épinglage.
 */
export function HorizontalProgramme({
  programme,
  revealed,
  reducedMotion,
}: {
  programme: ProgrammeItem[]
  revealed: boolean
  reducedMotion: boolean
}) {
  const outerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [nativeSupported, setNativeSupported] = useState(false)

  useEffect(() => {
    setNativeSupported(typeof CSS !== 'undefined' && !!CSS.supports && CSS.supports('view-timeline-name: --x'))
  }, [])

  useEffect(() => {
    if (reducedMotion || nativeSupported) return
    const outer = outerRef.current
    const track = trackRef.current
    if (!outer || !track) return

    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const rect = outer.getBoundingClientRect()
        const total = rect.height - window.innerHeight
        const progress = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0
        const maxShift = track.scrollWidth - track.clientWidth
        track.style.transform = `translateX(${-progress * maxShift}px)`
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [nativeSupported, reducedMotion])

  const label = (
    <div style={reducedMotion ? undefined : { opacity: revealed ? 1 : 0, transform: revealed ? 'translateY(0)' : 'translateY(14px)', transition: 'opacity 0.6s cubic-bezier(.22,1,.36,1), transform 0.6s cubic-bezier(.22,1,.36,1)' }}>
      <p className="mb-7 text-center text-[19px] italic" style={{ color: EW_GOLD }}>
        Le Programme
      </p>
    </div>
  )

  if (reducedMotion) {
    return (
      <section>
        {label}
        <div
          className="-mx-6 flex gap-6 overflow-x-auto px-6 pb-4 sm:mx-0 sm:px-0"
          style={{ background: EW_BG_PROGRAMME, scrollSnapType: 'x mandatory', containerType: 'inline-size', borderRadius: 16, paddingTop: 24, paddingBottom: 24 }}
        >
          {programme.map((item, i) => (
            <div key={i} style={{ scrollSnapAlign: 'start' }}>
              <StepCard item={item} />
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section>
      {label}
      {/* rupture de la colonne étroite (max-w-420 hérité de DetailsSombre) pour un vrai plein-large, cf. demande */}
      <div ref={outerRef} className="ew-hprog-outer relative ml-[calc(50%-50vw)] w-screen" style={{ height: '230vh' }}>
        <div className="sticky top-0 h-screen overflow-hidden" style={{ containerType: 'inline-size', clipPath: 'inset(0)', background: EW_BG_PROGRAMME }}>
          <div
            ref={trackRef}
            className="ew-hprog-track flex h-full items-center gap-10 px-[8cqw]"
            data-native={nativeSupported ? '1' : '0'}
            style={{ width: 'max-content', willChange: 'transform' }}
          >
            {programme.map((item, i) => (
              <StepCard key={i} item={item} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 3. Lieu — loupe magnétique sur carte SVG à deux calques              */
/* ------------------------------------------------------------------ */

/**
 * Carte stylisée : routes brunes organiques, rivière dorée en courbe de
 * Bézier, hachures de vignes fines — jamais un vrai plan.
 * `brightness(0.5)` du calque flouté (assombrir un fond déjà sombre)
 * retenu au départ ; devenu `brightness(1.08)` (léger délavage plutôt
 * qu'un assombrissement) une fois le fond de la carte passé en clair —
 * `brightness(0.5)` aurait viré la carte au gris boueux hors de la loupe.
 */
function StyledMapSvg({ blurred }: { blurred: boolean }) {
  return (
    <svg
      viewBox="0 0 240 200"
      className="absolute inset-0 h-full w-full"
      style={blurred ? { filter: 'blur(14px) saturate(0.3) brightness(1.08)' } : undefined}
      aria-hidden
    >
      <rect width="240" height="200" fill={EW_BG} />
      <path d="M-10,150 Q50,120 82,155 T180,118 T260,138" stroke="#5C4A3A" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.65" />
      <path d="M-10,58 Q60,90 102,54 T220,68" stroke="#4A3A2E" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5" />
      {/* rivière dorée, courbe de Bézier */}
      <path d="M0,168 C60,140 110,190 170,150 C200,128 220,110 240,96" stroke={EW_GOLD} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.75" />
      {/* hachures de vignes — parcelles en traits fins parallèles */}
      {Array.from({ length: 16 }).map((_, i) => {
        const x = 26 + (i % 8) * 11
        const y = 10 + Math.floor(i / 8) * 8
        return <line key={i} x1={x} y1={y} x2={x + 6} y2={y + 14} stroke="#4A3A2E" strokeWidth="1" opacity="0.4" />
      })}
    </svg>
  )
}

/**
 * Loupe magnétique — deux calques identiques de la même carte SVG
 * empilés : le dessous flouté/désaturé en permanence, le dessus net mais
 * masqué par un `radial-gradient` de 150px centré sur `--mx`/`--my` (vraies
 * variables CSS, mises à jour en mutation directe — pas de re-render React
 * à chaque pointermove). Un anneau doré matérialise la loupe et suit le
 * curseur ; le curseur système est masqué dans la section. Sans pointeur
 * (mobile, jamais de pointermove), la loupe dérive seule sur une
 * trajectoire de Lissajous jusqu'au premier toucher.
 */
export function LieuMagnifier({
  venueName,
  venueAddress,
  mapsUrl,
}: {
  venueName: string
  venueAddress: string
  mapsUrl: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const maskRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const setPos = (xPct: number, yPct: number) => {
      el.style.setProperty('--mx', `${xPct}%`)
      el.style.setProperty('--my', `${yPct}%`)
      if (ringRef.current) {
        ringRef.current.style.left = `${xPct}%`
        ringRef.current.style.top = `${yPct}%`
      }
    }

    let usingPointer = false
    let driftT = 0
    let driftRAF = 0

    const drift = () => {
      if (usingPointer) return
      driftT += 0.006
      setPos(50 + 30 * Math.sin(driftT * 1.3), 50 + 24 * Math.sin(driftT * 2.1 + 1))
      driftRAF = requestAnimationFrame(drift)
    }

    const onPointerMove = (e: globalThis.PointerEvent) => {
      usingPointer = true
      cancelAnimationFrame(driftRAF)
      const rect = el.getBoundingClientRect()
      const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100))
      const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100))
      setPos(x, y)
    }

    setPos(50, 46)
    if (!reducedMotion) {
      el.addEventListener('pointermove', onPointerMove)
      driftRAF = requestAnimationFrame(drift)
    }
    return () => {
      el.removeEventListener('pointermove', onPointerMove)
      cancelAnimationFrame(driftRAF)
    }
  }, [])

  return (
    <>
      <EwLabel>Le Lieu</EwLabel>
      <div
        ref={containerRef}
        className="relative aspect-[6/5] w-full overflow-hidden rounded-2xl [cursor:none]"
        style={{ background: EW_BG, ['--mx' as string]: '50%', ['--my' as string]: '46%' } as CSSProperties}
      >
        <StyledMapSvg blurred />
        <div
          ref={maskRef}
          className="absolute inset-0 [-webkit-mask-image:radial-gradient(circle_150px_at_var(--mx)_var(--my),black_60%,transparent_100%)] [mask-image:radial-gradient(circle_150px_at_var(--mx)_var(--my),black_60%,transparent_100%)]"
        >
          <StyledMapSvg blurred={false} />
        </div>

        {/* anneau doré — matérialise la loupe, suit --mx/--my */}
        <div
          ref={ringRef}
          className="pointer-events-none absolute h-[150px] w-[150px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
          style={{ borderColor: EW_GOLD, boxShadow: '0 0 24px rgba(201,169,97,0.25)' }}
          aria-hidden
        />

        {/* point bordeaux — pulse en boucle (box-shadow ping) à l'emplacement du lieu */}
        <div
          className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ left: '50%', top: '46%', background: EW_BORDEAUX, animation: 'ew-ping 2.2s cubic-bezier(0,0,0.2,1) infinite' }}
          aria-hidden
        />

        <div className="absolute left-5 top-5 max-w-[70%]">
          <p className="font-display text-[24px] italic leading-[1.15]" style={{ color: EW_INK }}>
            {venueName}
          </p>
          <p className="mt-1 text-[13px]" style={{ color: 'rgba(46, 38, 32, 0.65)' }}>
            {venueAddress}
          </p>
        </div>

        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-5 left-5 inline-flex items-center gap-1.5 text-[12.5px] font-semibold underline underline-offset-4"
          style={{ color: EW_GOLD, textDecorationColor: EW_GOLD }}
        >
          Voir sur la carte <span aria-hidden>→</span>
        </a>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* 4. Notre histoire — mots qui s'encrent au scroll                     */
/* ------------------------------------------------------------------ */

/**
 * Texte fourni ni par le couple ni par l'utilisateur — cette section a été
 * demandée uniquement par sa mécanique (mots qui s'encrent au scroll),
 * sans texte réel. Paragraphe générique écrit pour satisfaire la demande
 * technique (26ch de large, mots-clés « oui »/« verres »/« chandelles »/
 * « aube » intégrés naturellement pour qu'ils s'encrent en bordeaux comme
 * spécifié) — À REMPLACER par la vraie histoire du couple dès qu'elle est
 * fournie, ce n'est pas un texte définitif.
 */
const EW_HISTOIRE_TEXT =
  'Un jour, nos regards se sont trouvés. Nous avons dit oui à cette évidence, entre deux verres levés à la légèreté du monde. Depuis, chaque soir ressemble à une promesse — chandelles allumées, mots murmurés jusqu’à l’aube.'

const EW_HISTOIRE_KEYWORDS = new Set(['oui', 'verres', 'chandelles', 'aube'])

const normalizeWord = (w: string) => w.toLowerCase().replace(/[.,;:!?—«»"'’]/g, '')

/**
 * Paragraphe en Cormorant Garamond dans la demande d'origine — cette police
 * n'est chargée nulle part sur ce projet (uniquement Fraunces/Jost/Space
 * Grotesk, cf. index.html) ; en ajouter une 3e serif juste pour ce
 * paragraphe aurait cassé la cohérence typographique du reste de la page
 * pour un rendu très proche. Fraunces (`font-display`, déjà la police
 * serif du site) reprise à la place.
 *
 * Chaque mot dans son propre `<span className="ew-word-ink">` (cf.
 * EwEffectsStyles pour l'animation) — crème à 12% d'opacité par défaut,
 * bordeaux pour les mots-clés (même logique de couleur statique + seule
 * l'opacité anime, cf. doc de la classe CSS). `useEffect` : repli JS
 * seulement si le CSS natif (`animation-timeline: view()`) n'est pas
 * supporté — sinon rien à faire, le CSS pilote seul.
 */
export function NotreHistoire() {
  const pRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const nativeSupported = typeof CSS !== 'undefined' && !!CSS.supports && CSS.supports('animation-timeline: view()')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (nativeSupported || reducedMotion) return

    const p = pRef.current
    if (!p) return
    const spans = Array.from(p.querySelectorAll<HTMLElement>('.ew-word-ink'))

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle('ew-inked', entry.intersectionRatio > 0.15)
        })
      },
      // seuils multiples : l'observer doit re-déclencher à chaque petite
      // variation du ratio de recouvrement (pas juste 0/1) pour un effet
      // réversible qui suit le scroll, pas un simple aller simple.
      { threshold: Array.from({ length: 21 }, (_, i) => i / 20) },
    )
    spans.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [])

  const words = EW_HISTOIRE_TEXT.split(' ')

  return (
    // plein cadre (sort de la colonne étroite max-w-420 héritée de
    // DetailsSombre), même technique que la piste du programme (cf.
    // HorizontalProgramme). Fond transparent (et non plus #0d0a08) sur
    // retour client : la section doit se fondre dans le fond clair de la
    // page (même mécanisme que EW_BG_DATE), pas trancher comme une bande
    // sombre. Positionnée juste avant RSVP via le slot `renderBeforeRsvp`
    // (cf. FairePartEdwigeWilfried.tsx) — déplacée depuis avant Le
    // Programme sur retour client.
    <section className="relative ml-[calc(50%-50vw)] w-screen py-20" style={{ background: 'transparent' }}>
      <EwLabel>Notre histoire</EwLabel>
      <p
        ref={pRef}
        className="font-display mx-auto max-w-[26ch] text-center italic"
        style={{ fontSize: 'clamp(1.6rem, 4vw, 2.8rem)', lineHeight: 1.6 }}
      >
        {words.map((raw, i) => (
          <span
            key={i}
            className="ew-word-ink inline"
            style={{ color: EW_HISTOIRE_KEYWORDS.has(normalizeWord(raw)) ? EW_BORDEAUX : EW_INK }}
          >
            {raw}{' '}
          </span>
        ))}
      </p>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 5. RSVP — sceau de cire pressé                                       */
/* ------------------------------------------------------------------ */

/** Éclaboussure de 8 gouttelettes de cire — même technique que spawnConfetti dans DetailsSombre.tsx (nœuds DOM hors React, physique simple en JS), particules plus petites/rondes, trajet plus court. */
function spawnDroplets(originEl: HTMLElement) {
  const rect = originEl.getBoundingClientRect()
  const originX = rect.left + rect.width / 2
  const originY = rect.top + rect.height / 2
  const COUNT = 8
  const DURATION = 700
  const GRAVITY = 700
  const colors = [EW_BORDEAUX, EW_GOLD]

  const container = document.createElement('div')
  container.style.cssText = 'position:fixed; inset:0; pointer-events:none; z-index:9999; overflow:hidden;'
  document.body.appendChild(container)

  const particles = Array.from({ length: COUNT }, (_, i) => {
    const angle = (i / COUNT) * Math.PI * 2 + Math.random() * 0.4
    const speed = 140 + Math.random() * 160
    const size = 4 + Math.random() * 4
    const el = document.createElement('div')
    el.style.cssText = `position:absolute; width:${size}px; height:${size}px; border-radius:50%; background:${
      colors[i % colors.length]
    }; left:${originX}px; top:${originY}px;`
    container.appendChild(el)
    return { x: 0, y: 0, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 60, el }
  })

  const start = performance.now()
  let last = start
  function frame(now: number) {
    const dt = Math.min(0.032, (now - last) / 1000)
    last = now
    const t = (now - start) / DURATION
    if (t >= 1) {
      container.remove()
      return
    }
    for (const p of particles) {
      p.vy += GRAVITY * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.el.style.transform = `translate(${p.x}px, ${p.y}px)`
      p.el.style.opacity = String(Math.max(0, 1 - t))
    }
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

const HOLD_MS = 1400

/**
 * Bouton sceau de cire — appui maintenu 1,4s (pointerdown→pointerup,
 * `setPointerCapture` pour continuer à recevoir les événements même si le
 * doigt/curseur dérive hors du bouton). L'anneau (`conic-gradient` piloté
 * par la variable CSS `--p`, `@property`-déclarée dans EwEffectsStyles pour
 * être proprement interpolable en transition) est mis à jour en mutation
 * directe du DOM à chaque frame — pas de re-render React pendant l'appui,
 * seul du CSS anime à 60fps. Relâché trop tôt : `--p` retombe à 0 avec un
 * easing ressort. Complété : le sceau s'écrase (scale ressort),
 * `spawnDroplets` gicle, vibration longue, message doré en fondu.
 * Accessible clavier (Espace maintenu = même logique que pointerdown/up).
 */
export function WaxSealRsvp({
  label,
  weddingDateLabel,
  onClick,
}: {
  label: string
  weddingDateLabel: string
  onClick: () => void
}) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const sealRef = useRef<HTMLSpanElement>(null)
  const [holding, setHolding] = useState(false)
  const [sealed, setSealed] = useState(false)
  const [squash, setSquash] = useState(false)
  const rafRef = useRef(0)
  const startRef = useRef(0)
  const lastQuarter = useRef(-1)

  const setRingProgress = (p: number) => {
    btnRef.current?.style.setProperty('--p', String(p))
    if (sealRef.current) sealRef.current.style.transform = `scale(${1 + p * 0.06})`
  }

  const tick = (now: number) => {
    const p = Math.min(1, (now - startRef.current) / HOLD_MS)
    setRingProgress(p)
    const quarter = Math.floor(p * 4)
    if (quarter > lastQuarter.current) {
      lastQuarter.current = quarter
      if (navigator.vibrate) navigator.vibrate(10)
    }
    if (p >= 1) {
      complete()
      return
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  const startHold = () => {
    if (sealed) return
    setHolding(true)
    if (btnRef.current) btnRef.current.style.transition = 'none'
    startRef.current = performance.now()
    lastQuarter.current = -1
    rafRef.current = requestAnimationFrame(tick)
  }

  const cancelHold = () => {
    cancelAnimationFrame(rafRef.current)
    setHolding(false)
    if (btnRef.current) {
      btnRef.current.style.transition = '--p 0.6s cubic-bezier(.34,1.56,.64,1)'
    }
    setRingProgress(0)
    if (sealRef.current) sealRef.current.style.transform = 'scale(1)'
  }

  const complete = () => {
    cancelAnimationFrame(rafRef.current)
    setHolding(false)
    setSealed(true)
    setSquash(true)
    if (navigator.vibrate) navigator.vibrate(40)
    if (btnRef.current) spawnDroplets(btnRef.current)
    window.setTimeout(() => setSquash(false), 500)
    onClick()
  }

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    startHold()
  }
  const onPointerUp = () => {
    if (!sealed) cancelHold()
  }
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.code === 'Space' && !holding && !sealed) {
      e.preventDefault()
      startHold()
    }
  }
  const onKeyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.code === 'Space' && !sealed) cancelHold()
  }

  return (
    <>
      <EwLabel>RSVP</EwLabel>
      <p className="mb-6 text-center text-[15px] leading-[1.6]" style={{ color: 'rgba(46, 38, 32, 0.75)' }}>
        Nous serions honorés de vous compter parmi nous pour partager ce moment unique de notre vie.
      </p>
      <div className="flex flex-col items-center gap-5">
        <button
          ref={btnRef}
          type="button"
          aria-label={sealed ? 'Réponse scellée' : `${label} — maintenir l'appui`}
          disabled={sealed}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          className="relative flex h-[150px] w-[150px] select-none items-center justify-center rounded-full outline-none"
          style={
            {
              ['--p' as string]: 0,
              background: `conic-gradient(${EW_GOLD} calc(var(--p) * 360deg), rgba(201,169,97,0.18) calc(var(--p) * 360deg))`,
            } as CSSProperties
          }
        >
          <span
            ref={sealRef}
            className="flex h-[128px] w-[128px] items-center justify-center"
            style={{
              borderRadius: '47% 53% 50% 50% / 52% 48% 52% 48%',
              background: `radial-gradient(circle at 35% 30%, #c8394a, ${EW_BORDEAUX} 60%, #7c1a26 100%)`,
              boxShadow: 'inset 0 6px 14px rgba(0,0,0,0.45), inset 0 -4px 10px rgba(255,255,255,0.08)',
              transform: squash ? 'scale(0.94)' : holding ? undefined : 'scale(1)',
              transition: squash ? 'transform 0.5s cubic-bezier(.34,1.56,.64,1)' : holding ? 'none' : 'transform 0.6s cubic-bezier(.34,1.56,.64,1)',
            }}
          >
            <span className="font-display italic text-[22px]" style={{ color: EW_CREAM }}>
              É · W
            </span>
          </span>
        </button>

        <p
          className="min-h-[1.6em] text-center text-[13.5px]"
          style={
            sealed
              ? { color: EW_GOLD, fontStyle: 'italic', animation: 'ew-fade-in 0.8s ease forwards' }
              : { color: 'rgba(46, 38, 32, 0.55)', textTransform: 'uppercase', letterSpacing: '0.16em', fontSize: 12 }
          }
        >
          {sealed ? `Scellé. On vous attend le ${weddingDateLabel}.` : 'Maintenir pour sceller'}
        </p>
      </div>
    </>
  )
}
