import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { HERO_CHAPTERS } from './demoContent'
import './demo-hero.css'

const TRACK_HEIGHT_VH = 900

/**
 * Chapitre actif pour une progression donnée, d'après les fenêtres
 * [from, to) de chaque chapitre (cf. demoContent.ts). Renvoie -1 entre deux
 * fenêtres (le "silence" volontaire pendant la bague/le diamant) : aucun
 * overlay ne s'affiche alors, la vidéo respire seule.
 */
function findActiveChapterIndex(p: number): number {
  for (let i = 0; i < HERO_CHAPTERS.length; i++) {
    const ch = HERO_CHAPTERS[i]
    const isLast = i === HERO_CHAPTERS.length - 1
    if (p >= ch.from && (p < ch.to || (isLast && p <= ch.to))) return i
  }
  return -1
}

/**
 * Hero scrub — nouvelle architecture (brief « 2 sections »). Section
 * épinglée en `position: sticky` (pas de pin GSAP : plus simple, pas de
 * pin-spacer à mesurer/désynchroniser). Toutes les informations du
 * faire-part apparaissent en overlay HTML par-dessus la vidéo, un chapitre
 * à la fois (crossfade), jamais bakées dans la vidéo. `video.currentTime`
 * suit la progression du scroll de façon directe et frame-exacte (pas de
 * lerp/amorti — les vidéos sont encodées avec une image clé par frame,
 * cf. `public/demo-scrub-*.mp4`, donc chaque seek tombe pile sur la bonne
 * image sans figer ni sauter de morceau).
 */
export default function DemoHeroScrub() {
  const trackRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hasLoadedOnceRef = useRef(false)

  const [reducedMotion, setReducedMotion] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)
  const [videoDuration, setVideoDuration] = useState<number | null>(null)
  const [progressPct, setProgressPct] = useState(0)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [showCue, setShowCue] = useState(true)

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
      setActiveIdx(findActiveChapterIndex(p))

      const video = videoRef.current
      if (video && !videoFailed && Number.isFinite(video.duration) && video.duration > 0) {
        // Vidéo encodée à 24 fps, une image clé par frame : on ne resette
        // `currentTime` que quand la frame cible change réellement, pour un
        // scrub exact (pas d'arrondi/lerp qui ferait sauter des morceaux).
        const fps = 24
        const targetFrame = Math.round(p * video.duration * fps)
        if (targetFrame !== lastFrameSet) {
          lastFrameSet = targetFrame
          try {
            video.currentTime = targetFrame / fps
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
  }, [reducedMotion, videoFailed])

  /* ---------- Fallback prefers-reduced-motion : poster + chapitres empilés, aucun scroll-jacking ---------- */
  if (reducedMotion) {
    return (
      <section className="relative overflow-hidden bg-[#17130F]" aria-label="Faire-part — Anna & Théo">
        <img src="/demo-scrub-poster.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="relative z-10 mx-auto flex max-w-xl flex-col items-center gap-14 px-6 py-28 text-center">
          {HERO_CHAPTERS.map((ch) => (
            <ChapterContent key={ch.id} chapter={ch} className="static opacity-100 visible translate-y-0" />
          ))}
        </div>
      </section>
    )
  }

  return (
    <div ref={trackRef} className="relative" style={{ height: `${TRACK_HEIGHT_VH}vh` }}>
      {/* Barre de progression */}
      <div
        className="fixed inset-x-0 top-0 z-50 h-[2px] bg-[#C97A5C] transition-[width] duration-75 ease-linear"
        style={{ width: `${progressPct}%` }}
        aria-hidden
      />

      <div className="dhx-frame">
        <div className="dhx-stage">
          {videoFailed ? (
            <img src="/demo-scrub-poster.jpg" alt="" className="dhx-video" />
          ) : (
            <video
              ref={videoRef}
              className="dhx-video"
              poster="/demo-scrub-poster.jpg"
              muted
              playsInline
              preload="auto"
              onLoadedMetadata={(e) => {
                hasLoadedOnceRef.current = true
                setVideoDuration(e.currentTarget.duration)
              }}
              onError={(e) => {
                const video = e.currentTarget
                // Avec plusieurs <source media="…">, le navigateur peut
                // déclencher un event "error" transitoire pendant son
                // algorithme de sélection de ressource (candidat non
                // retenu, requête relancée après un seek…) sans jamais
                // peupler `video.error` : ce n'est pas un échec réel, on
                // l'ignore. On ne bascule sur le fallback image que si le
                // navigateur a effectivement posé un MediaError.
                if (!video.error) return
                if (video.error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED || !hasLoadedOnceRef.current) {
                  setVideoFailed(true)
                }
              }}
            >
              <source src="/demo-scrub-mobile.mp4" media="(max-width: 767px)" />
              <source src="/demo-scrub-desktop.mp4" />
            </video>
          )}

          {HERO_CHAPTERS.map((ch, i) => (
            <ChapterContent key={ch.id} chapter={ch} className={cn('dhx-overlay', i === activeIdx && 'show')} />
          ))}
        </div>

        {/* Points de repère de chapitre */}
        <div className="absolute right-[22px] top-1/2 z-[3] flex -translate-y-1/2 flex-col gap-2.5" aria-hidden>
          {HERO_CHAPTERS.map((ch, i) => (
            <i
              key={ch.id}
              className={cn(
                'block h-[5px] w-[5px] rounded-full transition-[background,transform] duration-300',
                i === activeIdx ? 'scale-[1.4] bg-[#C97A5C]' : 'bg-[rgba(255,244,232,0.10)]',
              )}
            />
          ))}
        </div>

        {/* Invite au scroll */}
        <div
          className="absolute bottom-[26px] left-1/2 z-[3] flex -translate-x-1/2 flex-col items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[#B8AC9C] transition-opacity duration-300"
          style={{ opacity: showCue ? 1 : 0 }}
          aria-hidden
        >
          <span>Scroll</span>
          <div className="dhx-chevron" />
        </div>

        <div className="absolute bottom-[26px] right-[26px] z-[3] text-[10px] uppercase tracking-[0.12em] text-[rgba(245,238,228,0.4)]">
          Vidéo générée{videoDuration ? ` — ${Math.round(videoDuration)}s scrubbable` : ''}
        </div>
      </div>
    </div>
  )
}

function ChapterContent({ chapter, className }: { chapter: (typeof HERO_CHAPTERS)[number]; className?: string }) {
  return (
    <div className={className}>
      {/* Encadré flouté : le texte se lit sur n'importe quelle image de la
          vidéo derrière, sans jamais figer le fond en plein cadre. */}
      <div className={cn('dhx-card text-center', chapter.kind === 'list' && 'text-left')}>
        {chapter.eyebrow && (
          <p className="mb-4 text-center text-[11px] uppercase tracking-[0.24em] text-[#C97A5C]">
            {chapter.eyebrow}
          </p>
        )}

        {chapter.segments && (
          <p className="font-display mb-2 text-[clamp(30px,6vw,46px)] font-normal leading-[1.12] text-[#F5EEE4]">
            {chapter.segments.map((seg, i) => (
              <span key={i} className={cn(seg.accent && 'italic text-[#C97A5C]')}>
                {seg.text}
                {i < chapter.segments!.length - 1 ? ' ' : ''}
              </span>
            ))}
          </p>
        )}

        {chapter.rule && <div className="mx-auto my-[18px] h-px w-9 bg-[#C97A5C] opacity-70" />}

        {chapter.sub && <p className="text-center text-[14px] font-light text-[#B8AC9C]">{chapter.sub}</p>}

        {chapter.kind === 'list' && (
          <div className="text-[14px] font-light leading-[2.1] text-[#F5EEE4]">
            {chapter.items?.map((item) => (
              <div key={item}>{item}</div>
            ))}
          </div>
        )}

        {chapter.kind === 'card' && chapter.card && (
          <>
            <p className="mb-3 text-[11px] uppercase tracking-[0.3em] text-[#C97A5C]">{chapter.card.mono}</p>
            <h2 className="font-display mb-2 text-[32px] font-normal italic text-[#F5EEE4]">{chapter.card.title}</h2>
            <p className="text-[13px] font-light text-[#B8AC9C]">{chapter.card.sub}</p>
          </>
        )}
      </div>
    </div>
  )
}
