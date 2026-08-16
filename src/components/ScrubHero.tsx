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

export interface ScrubHeroProps {
  videoSrc: string
  posterSrc: string
  beats: ScrubHeroBeat[]
  /** Contenu persistant (CTA…), révélé à partir de `persistentFrom`. */
  persistent?: ReactNode
  persistentFrom?: number
  /** Hauteur de scroll de la section épinglée, en vh (défaut 350). */
  durationVh?: number
  className?: string
}

const LERP = 0.12
const ENTER = 0.055 // durée d'entrée d'un beat (fraction de la progression globale)
const EXIT = 0.045 // durée de sortie

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

interface WordRef {
  el: HTMLSpanElement
  index: number
}

/**
 * ScrubHero — héros vidéo scrub-scroll (pattern signature Scroll The Date).
 * Section épinglée (350vh par défaut) : `video.currentTime` est piloté par la
 * progression du scroll avec amorti lerp 0.12. Beats typographiques découpés
 * en mots (y 60px→0, rotateX 35°→0, stagger) qui s'enchaînent selon la
 * progression. Fallbacks : vidéo indisponible → poster fixe ;
 * prefers-reduced-motion → poster + beats statiques empilés, aucun pin.
 * Réutilisé par la home et la page démo.
 */
export default function ScrubHero({
  videoSrc,
  posterSrc,
  beats,
  persistent,
  persistentFrom = 0.55,
  durationVh = 350,
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

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Découpage des beats en mots (stable)
  const beatWords = useMemo(
    () =>
      beats.map((beat) => {
        const words: { text: string; accent: boolean }[] = []
        beat.segments?.forEach((seg) => {
          seg.text
            .split(/\s+/)
            .filter(Boolean)
            .forEach((w) => words.push({ text: w, accent: !!seg.accent }))
        })
        return words
      }),
    [beats],
  )

  useEffect(() => {
    if (reducedMotion) return
    const section = sectionRef.current
    const stage = stageRef.current
    const video = videoRef.current
    if (!section || !stage) return

    const state = { target: 0, current: 0 }

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
      // Amorti du scrub
      state.current += (state.target - state.current) * LERP
      const p = clamp01(state.current)

      // Vidéo scrubbée
      if (video && !videoFailed && Number.isFinite(video.duration) && video.duration > 0) {
        const t = p * video.duration
        if (Math.abs(video.currentTime - t) > 0.03) {
          try {
            video.currentTime = t
          } catch {
            /* seek non disponible — ignorer */
          }
        }
      }

      // Beats typographiques
      beats.forEach((beat, bi) => {
        const beatEl = beatRefs.current[bi]
        if (!beatEl) return
        const isLast = bi === beats.length - 1
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
  }, [reducedMotion, videoFailed, beats, durationVh, persistentFrom])

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
          {beats.map((beat, i) => (
            <div key={i} className="flex flex-col items-center gap-4">
              {beat.kicker && (
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-300">
                  {beat.kicker}
                </p>
              )}
              {beat.segments && (
                <h1 className="font-display text-[clamp(3.5rem,9vw,8.5rem)] font-light leading-[1.02] tracking-[-0.02em] text-white">
                  {beat.segments.map((seg, si) => (
                    <span
                      key={si}
                      className={seg.accent ? 'italic text-terracotta-300' : undefined}
                    >
                      {seg.text}{' '}
                    </span>
                  ))}
                </h1>
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
            src={videoSrc}
            poster={posterSrc}
            muted
            playsInline
            preload="auto"
            onError={() => setVideoFailed(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        {/* Overlay lisibilité */}
        <div className="absolute inset-0 bg-gradient-to-t from-anthracite-950/60 via-anthracite-950/25 to-anthracite-950/20" />

        {/* Beats typographiques */}
        <div className="absolute inset-0 z-10 flex items-center justify-center px-6">
          {beats.map((beat, bi) => (
            <div
              key={bi}
              ref={(el) => {
                if (el) beatRefs.current[bi] = el
              }}
              style={{ opacity: 0, visibility: 'hidden' }}
              className="absolute inset-x-0 flex flex-col items-center gap-6 text-center [perspective:800px]"
            >
              {beat.kicker && (
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-300">
                  {beat.kicker}
                </p>
              )}
              <h1 className="font-display max-w-6xl text-[clamp(3.5rem,9vw,8.5rem)] font-light leading-[1.02] tracking-[-0.02em] text-white">
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
              </h1>
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
