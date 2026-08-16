import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import type { HeroChapter, HeroTheme, HeroVideoConfig } from './types'
import './hero-scrub.css'

/**
 * Chapitre actif pour une progression donnée, d'après les fenêtres
 * [from, to] de chaque chapitre. Renvoie -1 en dehors de toute fenêtre
 * (avant le premier chapitre, ou dans un éventuel "silence" volontaire
 * entre deux chapitres) : aucun overlay ne s'affiche alors, la vidéo
 * respire seule.
 */
function findActiveChapterIndex(chapters: HeroChapter[], p: number): number {
  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i]
    const isLast = i === chapters.length - 1
    if (p >= ch.from && (p < ch.to || (isLast && p <= ch.to))) return i
  }
  return -1
}

export interface HeroScrubProps {
  theme: HeroTheme
  chapters: HeroChapter[]
  video: HeroVideoConfig
  /** Hauteur de la piste de scroll, en vh — règle la vitesse du scrub. */
  trackHeightVh: number
  ariaLabel: string
  /** Vidéo encodée à ce fps (image clé par frame recommandé, cf. public/*.mp4) — 24 par défaut. */
  fps?: number
  /** Étiquette "Vidéo générée — Ns scrubbable" en coin bas-droit — désactivée par défaut (réservée à /demo). */
  showWatermark?: boolean
}

/**
 * Hero scrub partagé — section épinglée en `position: sticky` (pas de pin
 * GSAP), vidéo scrubbée `video.currentTime` frame-exacte, overlays HTML en
 * crossfade par-dessus (jamais bakés dans la vidéo). Un seul composant pour
 * tous les faire-part (démo comme clients réels) : ce qui change d'un
 * faire-part à l'autre — couleurs, vidéo, chapitres — arrive en props
 * (cf. themes.ts pour les thèmes, demoContent.ts / *Content.ts pour le
 * contenu propre à chaque couple), la mécanique de scroll ne change jamais.
 */
export default function HeroScrub({
  theme,
  chapters,
  video,
  trackHeightVh,
  ariaLabel,
  fps = 24,
  showWatermark = false,
}: HeroScrubProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hasLoadedOnceRef = useRef(false)

  const [reducedMotion, setReducedMotion] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)
  const [videoDuration, setVideoDuration] = useState<number | null>(null)
  const [progressPct, setProgressPct] = useState(0)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [showCue, setShowCue] = useState(true)

  const themeVars = {
    '--hs-frame-bg': theme.frameBg,
    '--hs-vignette': theme.vignette,
    '--hs-accent': theme.accent,
    '--hs-text-primary': theme.textPrimary,
    '--hs-text-secondary': theme.textSecondary,
    '--hs-card-bg': theme.cardBg,
    '--hs-card-border': theme.cardBorder,
    '--hs-card-shadow': theme.cardShadow,
  } as CSSProperties

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (reducedMotion) return
    const track = trackRef.current
    if (!track) return

    const computeProgress = () => {
      const rect = track.getBoundingClientRect()
      const total = track.offsetHeight - window.innerHeight
      if (total <= 0) return 0
      return Math.min(Math.max(-rect.top / total, 0), 1)
    }

    let lastFrameSet = -1

    const applyProgress = (p: number) => {
      setProgressPct(p * 100)
      setShowCue(p < 0.03)
      setActiveIdx(findActiveChapterIndex(chapters, p))

      const vid = videoRef.current
      if (vid && !videoFailed && Number.isFinite(vid.duration) && vid.duration > 0) {
        // Vidéo encodée avec une image clé par frame : on ne resette
        // `currentTime` que quand la frame cible change réellement, pour un
        // scrub exact (pas d'arrondi/lerp qui ferait sauter des morceaux).
        const targetFrame = Math.round(p * vid.duration * fps)
        if (targetFrame !== lastFrameSet) {
          lastFrameSet = targetFrame
          try {
            vid.currentTime = targetFrame / fps
          } catch {
            /* seek non disponible — ignorer */
          }
        }
      }
    }

    const onScroll = () => applyProgress(computeProgress())
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    // Boucle rAF en complément du scroll listener : garantit un scrub
    // fluide y compris pendant le scroll inertiel (momentum), où l'event
    // "scroll" peut être moins fréquent que le rendu.
    let raf = 0
    const tick = () => {
      applyProgress(computeProgress())
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [reducedMotion, videoFailed, chapters, fps])

  /* ---------- Fallback prefers-reduced-motion : poster + chapitres empilés, aucun scroll-jacking ---------- */
  if (reducedMotion) {
    return (
      <section className="relative overflow-hidden" style={{ background: theme.frameBg }} aria-label={ariaLabel}>
        {video.posterSrc && (
          <img src={video.posterSrc} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        )}
        <div className="relative z-10 mx-auto flex max-w-xl flex-col items-center gap-14 px-6 py-28 text-center" style={themeVars}>
          {chapters.map((ch) => (
            <ChapterContent key={ch.id} chapter={ch} className="static opacity-100 visible translate-y-0" />
          ))}
        </div>
      </section>
    )
  }

  return (
    <div ref={trackRef} className="relative" style={{ height: `${trackHeightVh}vh` }}>
      {/* Barre de progression */}
      <div
        className="fixed inset-x-0 top-0 z-50 h-[2px] transition-[width] duration-75 ease-linear"
        style={{ width: `${progressPct}%`, background: theme.accent }}
        aria-hidden
      />

      <div className="hs-frame" style={themeVars}>
        <div className="hs-stage">
          {videoFailed ? (
            video.posterSrc ? (
              <img src={video.posterSrc} alt="" className="hs-video" />
            ) : (
              <div className="hs-video" style={{ background: theme.frameBg }} />
            )
          ) : (
            <video
              ref={videoRef}
              className="hs-video"
              poster={video.posterSrc}
              muted
              playsInline
              preload="auto"
              onLoadedMetadata={(e) => {
                hasLoadedOnceRef.current = true
                setVideoDuration(e.currentTarget.duration)
              }}
              onError={(e) => {
                const vid = e.currentTarget
                // Avec plusieurs <source media="…">, le navigateur peut
                // déclencher un event "error" transitoire pendant son
                // algorithme de sélection de ressource (candidat non
                // retenu, requête relancée après un seek…) sans jamais
                // peupler `video.error` : ce n'est pas un échec réel, on
                // l'ignore. On ne bascule sur le fallback image que si le
                // navigateur a effectivement posé un MediaError.
                if (!vid.error) return
                if (vid.error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED || !hasLoadedOnceRef.current) {
                  setVideoFailed(true)
                }
              }}
            >
              {video.mobileSrc && <source src={video.mobileSrc} media="(max-width: 767px)" />}
              <source src={video.desktopSrc} />
            </video>
          )}

          {chapters.map((ch, i) => (
            <ChapterContent key={ch.id} chapter={ch} className={cn('hs-overlay', i === activeIdx && 'show')} />
          ))}
        </div>

        {/* Points de repère de chapitre — seulement s'il y a plus d'un chapitre à distinguer. */}
        {chapters.length > 1 && (
          <div className="absolute right-[22px] top-1/2 z-[3] flex -translate-y-1/2 flex-col gap-2.5" aria-hidden>
            {chapters.map((ch, i) => (
              <i
                key={ch.id}
                className="block h-[5px] w-[5px] rounded-full transition-[background,transform] duration-300"
                style={{
                  backgroundColor: i === activeIdx ? theme.accent : theme.dotInactive,
                  transform: i === activeIdx ? 'scale(1.4)' : 'scale(1)',
                }}
              />
            ))}
          </div>
        )}

        {/* Invite au scroll */}
        <div
          className="absolute bottom-[26px] left-1/2 z-[3] flex -translate-x-1/2 flex-col items-center gap-2 text-[10px] uppercase tracking-[0.18em] transition-opacity duration-300"
          style={{ opacity: showCue ? 1 : 0, color: theme.textSecondary }}
          aria-hidden
        >
          <span>Scroll</span>
          <div className="hs-chevron" style={themeVars} />
        </div>

        {showWatermark && (
          <div
            className="absolute bottom-[26px] right-[26px] z-[3] text-[10px] uppercase tracking-[0.12em]"
            style={{ color: theme.textPrimary, opacity: 0.4 }}
          >
            Vidéo générée{videoDuration ? ` — ${Math.round(videoDuration)}s scrubbable` : ''}
          </div>
        )}
      </div>
    </div>
  )
}

function ChapterContent({ chapter, className }: { chapter: HeroChapter; className?: string }) {
  return (
    <div className={className}>
      {/* Encadré flouté : le texte se lit sur n'importe quelle image de la
          vidéo derrière, sans jamais figer le fond en plein cadre. */}
      <div className={cn('hs-card text-center', chapter.kind === 'list' && 'text-left')}>
        {chapter.eyebrow && (
          <p
            className="mb-4 text-center text-[11px] uppercase tracking-[0.24em]"
            style={{ color: 'var(--hs-accent)' }}
          >
            {chapter.eyebrow}
          </p>
        )}

        {chapter.segments && (
          <p
            className="font-display mb-2 text-[clamp(30px,6vw,46px)] font-normal leading-[1.12]"
            style={{ color: 'var(--hs-text-primary)' }}
          >
            {chapter.segments.map((seg, i) => (
              <span key={i} className={cn(seg.accent && 'italic')} style={seg.accent ? { color: 'var(--hs-accent)' } : undefined}>
                {seg.text}
                {i < chapter.segments!.length - 1 ? ' ' : ''}
              </span>
            ))}
          </p>
        )}

        {chapter.rule && (
          <div className="mx-auto my-[18px] h-px w-9 opacity-70" style={{ background: 'var(--hs-accent)' }} />
        )}

        {chapter.sub && (
          <p className="text-center text-[14px] font-light" style={{ color: 'var(--hs-text-secondary)' }}>
            {chapter.sub}
          </p>
        )}

        {chapter.kind === 'list' && (
          <div className="text-[14px] font-light leading-[2.1]" style={{ color: 'var(--hs-text-primary)' }}>
            {chapter.items?.map((item) => (
              <div key={item}>{item}</div>
            ))}
          </div>
        )}

        {chapter.kind === 'card' && chapter.card && (
          <>
            <p className="mb-3 text-[11px] uppercase tracking-[0.3em]" style={{ color: 'var(--hs-accent)' }}>
              {chapter.card.mono}
            </p>
            <h2
              className="font-display mb-2 text-[32px] font-normal italic"
              style={{ color: 'var(--hs-text-primary)' }}
            >
              {chapter.card.title}
            </h2>
            <p className="text-[13px] font-light" style={{ color: 'var(--hs-text-secondary)' }}>
              {chapter.card.sub}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
