import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { cn } from '@/lib/utils'

gsap.registerPlugin(ScrollTrigger)

export interface ScrubHeroSegment {
  text: string
  /** Fraunces italique terracotta-300 (mot d'émotion) */
  accent?: boolean
}

export interface ScrubHeroBeat {
  /** Fenêtre de progression du scroll (0 → 1) pendant laquelle le beat est visible. */
  from: number
  to: number
  /** Kicker Space Grotesk uppercase affiché au-dessus du titre (optionnel). */
  kicker?: string
  /** Segments du titre ; chaque segment est découpé en mots animés. */
  segments?: ScrubHeroSegment[]
}

export interface ScrubHeroSnapWindow {
  /** Fenêtre de progression vidéo (0 → 1) à traverser vite au scroll — cf. `buildSnapRemap`. */
  from: number
  to: number
  /** Part du scroll total allouée à cette fenêtre (défaut 0.04 = 4 %). */
  scrollShare?: number
}

export interface ScrubHeroProps {
  videoSrc: string
  /**
   * Variante mobile (`<source media="(max-width: 767px)">`, même seuil que
   * `HeroScrub`) — un montage différent, pas juste un fichier redimensionné,
   * n'a aucune raison de garder les mêmes proportions de plans que la
   * variante desktop (vérifié : ~9 % d'écart sur les fenêtres de transition
   * entre les deux exports du hero home). D'où `mobileBeats` ci-dessous.
   */
  mobileSrc?: string
  posterSrc: string
  beats: ScrubHeroBeat[]
  /**
   * Beats spécifiques à `mobileSrc`, sélectionnés au même seuil (max-width:
   * 767px) — sans eux, `beats` (calé sur `videoSrc`) s'applique aussi au
   * scrub mobile même si ses plans tombent à des fractions différentes.
   * Retombe sur `beats` si absent.
   */
  mobileBeats?: ScrubHeroBeat[]
  /** Titre réel, unique, de la page — rendu en `<h1 className="sr-only">`, cf. doc du composant. */
  heading: string
  /** Contenu persistant (CTA…), révélé à partir de `persistentFrom`. */
  persistent?: ReactNode
  persistentFrom?: number
  /** Hauteur de scroll de la section épinglée, en vh (défaut 350). */
  durationVh?: number
  /**
   * Fenêtres de progression vidéo à comprimer dans l'espace de scroll — pensé
   * pour les plans de montage (whip-pan, glitch RGB…) qui ne supportent pas
   * le scrub : figés au milieu de l'effet, ces plans-là montrent une image
   * volontairement moche (flou de mouvement, split RGB) au lieu d'un cut
   * rapide. Sans `snapWindows`, `beat.from/to` = fraction de scroll = fraction
   * vidéo (mapping 1:1) ; avec, la vidéo garde ses fractions (`beats` reste
   * inchangé) mais le scroll nécessaire pour les traverser est réduit à
   * `scrollShare` — l'utilisateur les passe vite plutôt que de s'y arrêter.
   */
  snapWindows?: ScrubHeroSnapWindow[]
  className?: string
}

const LERP = 0.12
const ENTER = 0.055 // durée d'entrée d'un beat (fraction de la progression globale)
const EXIT = 0.045 // durée de sortie
const DEFAULT_SNAP_SCROLL_SHARE = 0.04
// Référence stable : un `[]` littéral en valeur par défaut de paramètre serait
// recréé à chaque appel, invalidant le useMemo(remap) et l'effet qui en
// dépend à chaque rendu (cf. `snapWindows` dans ScrubHeroProps).
const EMPTY_SNAP_WINDOWS: ScrubHeroSnapWindow[] = []

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

/**
 * Construit `remap(s)` : scroll-progress amorti (0→1, linéaire en pixels) →
 * video-progress (0→1, ce que `beats`/`video.currentTime` attendent).
 * Identité si `windows` est vide. Sinon, chaque fenêtre vidéo consomme
 * seulement `scrollShare` de scroll (au lieu de sa largeur naturelle) ; le
 * scroll restant est réparti au prorata sur les segments vidéo hors fenêtres
 * — dilatés d'un facteur `scale` égal partout, donc sans à-coup de vitesse
 * perceptible sur les plans fixes (seul l'écart entre plans fixes et
 * transitions change, c'est le but).
 */
function buildSnapRemap(windows: ScrubHeroSnapWindow[]): (s: number) => number {
  if (windows.length === 0) return (s) => s
  const sorted = [...windows].sort((a, b) => a.from - b.from)
  const totalSnapScroll = sorted.reduce((acc, w) => acc + (w.scrollShare ?? DEFAULT_SNAP_SCROLL_SHARE), 0)
  const totalSnapVideo = sorted.reduce((acc, w) => acc + (w.to - w.from), 0)
  const remainingScroll = Math.max(0, 1 - totalSnapScroll)
  const remainingVideo = Math.max(0.0001, 1 - totalSnapVideo)
  const scale = remainingScroll / remainingVideo

  interface Seg {
    sStart: number
    sEnd: number
    vStart: number
    vEnd: number
  }
  const segs: Seg[] = []
  let vCursor = 0
  let sCursor = 0
  for (const w of sorted) {
    if (w.from > vCursor) {
      const vWidth = w.from - vCursor
      const sWidth = vWidth * scale
      segs.push({ sStart: sCursor, sEnd: sCursor + sWidth, vStart: vCursor, vEnd: w.from })
      sCursor += sWidth
    }
    const sWidth = w.scrollShare ?? DEFAULT_SNAP_SCROLL_SHARE
    segs.push({ sStart: sCursor, sEnd: sCursor + sWidth, vStart: w.from, vEnd: w.to })
    sCursor += sWidth
    vCursor = w.to
  }
  if (vCursor < 1) {
    const vWidth = 1 - vCursor
    const sWidth = vWidth * scale
    segs.push({ sStart: sCursor, sEnd: sCursor + sWidth, vStart: vCursor, vEnd: 1 })
  }

  return (s: number) => {
    const clamped = clamp01(s)
    const seg = segs.find((seg) => clamped <= seg.sEnd + 1e-6) ?? segs[segs.length - 1]
    const span = seg.sEnd - seg.sStart
    const localT = span > 0 ? (clamped - seg.sStart) / span : 0
    return seg.vStart + localT * (seg.vEnd - seg.vStart)
  }
}

interface WordRef {
  el: HTMLSpanElement
  index: number
}

/**
 * ScrubHero — héros vidéo scrub-scroll (pattern signature Scroll The Date),
 * utilisé par la home (`/demo` utilise le composant distinct
 * `hero-scrub/HeroScrub.tsx`, malgré le nom proche). Section épinglée
 * (350vh par défaut) : `video.currentTime` est piloté par la progression du
 * scroll avec amorti lerp 0.12. Beats typographiques découpés en mots
 * (y 60px→0, rotateX 35°→0, stagger) qui s'enchaînent selon la progression.
 * Fallbacks : vidéo indisponible → poster fixe ; prefers-reduced-motion →
 * poster + beats statiques empilés, aucun pin.
 *
 * `heading` — audit SEO du 27/08/2026 : chaque beat rendait son propre
 * `<h1>` (jusqu'à 4 sur la home), dont certains vides (aucun `segments`,
 * juste un kicker) et les autres inertes tant que le scroll n'a pas
 * déclenché leur révélation GSAP (`opacity: 0` posé en style, cf. plus
 * bas) — une page ne doit avoir qu'UN SEUL `<h1>`, toujours présent, pas
 * dépendant du JS/scroll. Les beats restent l'effet visuel (texte dupliqué,
 * `aria-hidden`, tags `<p>` non porteurs de sens document) ; `heading`
 * fournit le vrai titre de page, unique, en `sr-only` (invisible à l'écran,
 * lu par les lecteurs d'écran et les moteurs de recherche).
 */
export default function ScrubHero({
  videoSrc,
  mobileSrc,
  posterSrc,
  beats,
  mobileBeats,
  heading,
  persistent,
  persistentFrom = 0.55,
  durationVh = 350,
  snapWindows = EMPTY_SNAP_WINDOWS,
  className,
}: ScrubHeroProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fillRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)
  const persistentRef = useRef<HTMLDivElement>(null)
  const beatRefs = useRef<HTMLDivElement[]>([])
  const wordRefs = useRef<WordRef[][]>([])
  const [videoFailed, setVideoFailed] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Même seuil que le <source media="…"> ci-dessous — pour choisir le bon
  // jeu de beats en cohérence avec la vidéo effectivement chargée.
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setIsMobile(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const effectiveBeats = isMobile && mobileBeats ? mobileBeats : beats

  // Découpage des beats en mots (stable)
  const beatWords = useMemo(
    () =>
      effectiveBeats.map((beat) => {
        const words: { text: string; accent: boolean }[] = []
        beat.segments?.forEach((seg) => {
          seg.text
            .split(/\s+/)
            .filter(Boolean)
            .forEach((w) => words.push({ text: w, accent: !!seg.accent }))
        })
        return words
      }),
    [effectiveBeats],
  )

  // Scroll amorti → progression vidéo : identité si `snapWindows` est vide,
  // sinon compresse ces fenêtres dans l'espace de scroll (cf. buildSnapRemap).
  const remap = useMemo(() => buildSnapRemap(snapWindows), [snapWindows])

  useEffect(() => {
    if (reducedMotion) return
    const section = sectionRef.current
    const stage = stageRef.current
    const video = videoRef.current
    if (!section || !stage) return

    const state = { target: 0, current: 0 }

    // Throttle des seeks vers une zone PAS ENCORE bufferisée — même bug/fix
    // que hero-scrub/HeroScrub.tsx : sur connexion lente, un seek() à
    // chaque tick (~16ms) interrompt le fetch réseau du seek précédent
    // avant qu'il n'ait pu récupérer la moindre donnée, donc `buffered`
    // reste vide en continu quelle que soit la durée du scroll — le clamp
    // `video.buffered.end(...)` juste en dessous ne sert alors à rien
    // puisque `buffered.length` ne quitte jamais 0 (constaté : « image
    // figée puis écran noir » persistant malgré ce clamp seul). Une fois
    // qu'une zone est bufferisée, le seek y redevient libre et instantané
    // (lecture locale, aucun risque réseau) : le throttle ne s'applique
    // QUE quand la cible n'est pas encore chargée.
    let lastSeekAt = 0
    const MIN_SEEK_INTERVAL_MS = 200
    const isBuffered = (vid: HTMLVideoElement, time: number) => {
      const ranges = vid.buffered
      for (let i = 0; i < ranges.length; i++) {
        if (time >= ranges.start(i) - 0.5 && time <= ranges.end(i) + 0.5) return true
      }
      return false
    }

    const st = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: () => `+=${window.innerHeight * ((durationVh - 100) / 100)}`,
      pin: stage,
      pinSpacing: true,
      // Les sections épinglées de la home (ce héros, HowItWorks, Advantages)
      // ne sont pas créées dans l'ordre de la page : ce composant utilise
      // `useEffect` alors que les suivants utilisent `useGSAP`
      // (= useLayoutEffect, qui s'exécute AVANT). Les triggers d'en dessous
      // calculaient donc leurs start/end avant que le pin-spacer de ce héros
      // n'existe, et se retrouvaient décalés d'une hauteur de pin vers le
      // haut — la section suivante s'épinglait trop tôt et recouvrait la
      // précédente. `refreshPriority` force le recalcul de haut en bas :
      // valeur la plus haute = le plus haut dans la page.
      refreshPriority: 3,
      onUpdate: (self) => {
        state.target = self.progress
      },
    })

    const render = () => {
      // Amorti du scrub, puis compression éventuelle des `snapWindows`
      // (identité si aucune) — `p` ci-dessous est la progression VIDÉO,
      // celle qu'attendent `beats`/`video.currentTime`/`persistentFrom`.
      state.current += (state.target - state.current) * LERP
      const p = remap(clamp01(state.current))

      // Vidéo scrubbée
      if (video && !videoFailed && Number.isFinite(video.duration) && video.duration > 0) {
        let t = p * video.duration
        // Safari iOS affiche une frame NOIRE en cherchant au-delà de ce qui
        // est déjà téléchargé (les navigateurs desktop gardent la dernière
        // frame affichée à la place) — sensible sur mobile quand l'utilisateur
        // scrolle plus vite que le fichier ne se bufferise. On plafonne la
        // cible au buffer disponible : la vidéo s'immobilise sur sa dernière
        // frame chargée plutôt que de clignoter en noir, et rattrape dès que
        // le téléchargement progresse.
        if (video.buffered.length > 0) {
          const bufferedEnd = video.buffered.end(video.buffered.length - 1)
          t = Math.min(t, bufferedEnd)
        }
        if (Math.abs(video.currentTime - t) > 0.03) {
          const now = performance.now()
          if (isBuffered(video, t) || now - lastSeekAt >= MIN_SEEK_INTERVAL_MS) {
            lastSeekAt = now
            try {
              video.currentTime = t
            } catch {
              /* seek non disponible — ignorer */
            }
          }
          // Sinon : ce tick est ignoré (throttle actif, zone pas encore
          // bufferisée) — le tick suivant retentera avec la position de
          // scroll la plus récente, cf. commentaire plus haut.
        }
      }

      // Beats typographiques
      effectiveBeats.forEach((beat, bi) => {
        const beatEl = beatRefs.current[bi]
        if (!beatEl) return
        const isLast = bi === effectiveBeats.length - 1
        // Le premier beat (kicker) est visible dès le chargement
        const enterT = bi === 0 ? 1 : easeOut(clamp01((p - beat.from) / ENTER))
        const exitT = isLast ? 0 : easeOut(clamp01((p - (beat.to - EXIT)) / EXIT))
        const visible = p >= beat.from - 0.001 && p <= (isLast ? 1.001 : beat.to + 0.001)

        if (!visible || enterT <= 0) {
          beatEl.style.opacity = '0'
          beatEl.style.visibility = 'hidden'
          return
        }
        beatEl.style.visibility = 'visible'
        beatEl.style.opacity = String(1 - exitT)
        beatEl.style.transform = `translate3d(0, ${-40 * exitT}px, 0)`

        const words = wordRefs.current[bi] ?? []
        words.forEach(({ el, index }) => {
          const local = easeOut(clamp01((enterT - index * 0.06) / 0.55))
          el.style.opacity = String(local)
          el.style.transform = `translate3d(0, ${(1 - local) * 60}px, 0) rotateX(${(1 - local) * 35}deg)`
        })
      })

      // CTA persistant
      const cta = persistentRef.current
      if (cta) {
        const t = easeOut(clamp01((p - persistentFrom) / 0.07))
        cta.style.opacity = String(t)
        cta.style.transform = `scale(${0.9 + 0.1 * t})`
        cta.style.pointerEvents = t > 0.5 ? 'auto' : 'none'
      }

      // Indicateur scroll — masqué dès que le CTA persistant apparaît (sinon
      // les deux se chevauchent, tous deux centrés en bas de la section
      // épinglée). Sans CTA (ex. page Démo), il reste visible jusqu'à 97 %.
      if (fillRef.current) fillRef.current.style.transform = `scaleY(${p})`
      if (indicatorRef.current) {
        const upperBound = persistent ? persistentFrom : 0.97
        indicatorRef.current.style.opacity = p > 0.02 && p < upperBound ? '1' : '0'
      }
    }

    gsap.ticker.add(render)
    // Premier rendu
    render()

    return () => {
      gsap.ticker.remove(render)
      st.kill()
    }
  }, [reducedMotion, videoFailed, effectiveBeats, durationVh, persistentFrom, remap])

  /* ---------- Fallback reduced-motion : poster + beats statiques ---------- */
  if (reducedMotion) {
    return (
      <section
        className={cn('grain relative overflow-hidden bg-anthracite-950', className)}
        aria-label="Introduction"
      >
        <img
          src={posterSrc}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-anthracite-950/60 to-anthracite-950/20" />
        <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-5xl flex-col items-center justify-center gap-10 px-6 py-32 text-center">
          <h1 className="sr-only">{heading}</h1>
          {effectiveBeats.map((beat, i) => (
            <div key={i} className="flex flex-col items-center gap-4" aria-hidden="true">
              {beat.kicker && (
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-300">
                  {beat.kicker}
                </p>
              )}
              {beat.segments && (
                <p className="font-display text-[clamp(3.5rem,9vw,8.5rem)] font-light leading-[1.02] tracking-[-0.02em] text-white">
                  {beat.segments.map((seg, si) => (
                    <span
                      key={si}
                      className={seg.accent ? 'italic text-terracotta-300' : undefined}
                    >
                      {seg.text}{' '}
                    </span>
                  ))}
                </p>
              )}
            </div>
          ))}
          {persistent && <div className="mt-4">{persistent}</div>}
        </div>
      </section>
    )
  }

  /* ---------- Version scrub-scroll épinglée ---------- */
  return (
    <section ref={sectionRef} className={cn('relative', className)} aria-label="Introduction">
      <div ref={stageRef} style={{ height: '100dvh' }} className="grain relative overflow-hidden bg-anthracite-950">
        {/* Média de fond : vidéo scrubbée ou poster en fallback */}
        {videoFailed ? (
          <img src={posterSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <video
            ref={videoRef}
            poster={posterSrc}
            muted
            playsInline
            preload="auto"
            onError={(e) => {
              // Un <source> dont le `media` ne correspond pas (ex. mobileSrc
              // évalué sur un viewport desktop) peut déclencher un événement
              // `error` qui remonte jusqu'ici sans jamais avoir été la source
              // réellement chargée — reproduit en isolant exactement cette
              // structure (mobileSrc + source par défaut) : le navigateur
              // laisse `video.error` à `null` dans ce cas, contrairement à un
              // vrai échec de la source active. Ne basculer sur le poster
              // fixe que si `video.error` est réellement renseigné, sous
              // peine de perdre le scrub pour une erreur non fatale.
              if (!e.currentTarget.error) return
              setVideoFailed(true)
            }}
            className="absolute inset-0 h-full w-full object-cover"
          >
            {mobileSrc && <source src={mobileSrc} media="(max-width: 767px)" />}
            <source src={videoSrc} />
          </video>
        )}
        {/* Overlay lisibilité */}
        <div className="absolute inset-0 bg-gradient-to-t from-anthracite-950/60 via-anthracite-950/25 to-anthracite-950/20" />

        {/* Beats typographiques */}
        <div className="absolute inset-0 z-10 flex items-center justify-center px-6">
          <h1 className="sr-only">{heading}</h1>
          {effectiveBeats.map((beat, bi) => (
            <div
              key={bi}
              ref={(el) => {
                if (el) beatRefs.current[bi] = el
              }}
              style={{ opacity: 0, visibility: 'hidden' }}
              className="absolute inset-x-0 flex flex-col items-center gap-6 text-center [perspective:800px]"
              aria-hidden="true"
            >
              {beat.kicker && (
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-300">
                  {beat.kicker}
                </p>
              )}
              <p className="font-display max-w-6xl text-[clamp(3.5rem,9vw,8.5rem)] font-light leading-[1.02] tracking-[-0.02em] text-white">
                {beatWords[bi].map((word, wi) => (
                  <span key={wi} className="inline-block overflow-visible whitespace-pre">
                    <span
                      ref={(el) => {
                        if (!el) return
                        const arr = (wordRefs.current[bi] ??= [])
                        if (!arr.some((w) => w.el === el)) arr.push({ el, index: wi })
                      }}
                      style={{ opacity: 0, transformOrigin: '50% 100%' }}
                      className={cn(
                        'inline-block will-change-transform',
                        word.accent && 'italic text-terracotta-300',
                      )}
                    >
                      {word.text}
                    </span>
                    {wi < beatWords[bi].length - 1 ? ' ' : ''}
                  </span>
                ))}
              </p>
            </div>
          ))}
        </div>

        {/* CTA persistant */}
        {persistent && (
          <div
            ref={persistentRef}
            style={{ opacity: 0 }}
            className="absolute inset-x-0 bottom-[12vh] z-20 flex justify-center px-6 will-change-transform"
          >
            {persistent}
          </div>
        )}

        {/* Indicateur scroll */}
        <div
          ref={indicatorRef}
          style={{ opacity: 0 }}
          className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-3 transition-opacity duration-500"
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/60">
            scroll
          </span>
          <div className="relative h-12 w-px overflow-hidden bg-white/15">
            <div
              ref={fillRef}
              style={{ transform: 'scaleY(0)' }}
              className="absolute inset-0 origin-top bg-terracotta-300"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
