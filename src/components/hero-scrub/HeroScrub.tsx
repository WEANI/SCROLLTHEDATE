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
  /**
   * Portion finale de `trackHeightVh` (en vh) réservée au recouvrement du
   * corps de page par-dessus le plan final (cf. `-mt-[100vh]` sur les pages
   * faire-part) — 0 par défaut (aucun effet, comportement inchangé pour
   * /demo qui n'a pas ce recouvrement). La progression `p` (qui pilote la
   * vidéo ET les chapitres) atteint 1 et s'y fige `tailVh` avant la fin
   * réelle de la piste : le plan final et le dernier chapitre ont donc le
   * temps d'être pleinement affichés AVANT que le recouvrement (qui, lui,
   * suit le scroll réel, pas `p`) ne commence à les couvrir. Sans ce
   * découplage, combler tout l'écran nécessite ~1 hauteur d'écran de scroll,
   * qui mordait sur la fenêtre du dernier chapitre (souvent bien plus
   * courte) — vérifié en conditions réelles : le recouvrement démarrait
   * avant même que le message de clôture ait fini d'apparaître.
   */
  tailVh?: number
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
  tailVh = 0,
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

  // Overlay de diagnostic (?debug=1 dans l'URL uniquement) — un bug de
  // vidéo figée a été signalé sur mobile réel sans jamais se reproduire en
  // environnement de test : ce panneau visible à l'écran (readyState,
  // networkState, erreurs, évènements du cycle de vie de la vidéo) permet
  // de lire l'état exact du lecteur directement sur l'enregistrement
  // d'écran du client, faute de pouvoir brancher un débogueur sur son
  // téléphone. Retirer une fois le bug confirmé résolu en conditions
  // réelles.
  const isDebug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1'
  const [debugLog, setDebugLog] = useState<string[]>([])
  const [debugState, setDebugState] = useState<Record<string, string | number | boolean>>({})
  const logEvent = (label: string) => {
    if (!isDebug) return
    const vid = videoRef.current
    const detail = vid
      ? ` rs=${vid.readyState} ns=${vid.networkState} t=${vid.currentTime.toFixed(2)} err=${vid.error ? `${vid.error.code}:${vid.error.message}` : '-'}`
      : ''
    setDebugLog((prev) => [...prev.slice(-14), `${new Date().toISOString().slice(11, 23)} ${label}${detail}`])
  }

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
      // `contentTotal` (pas `total`) pilote `p` : voir la doc de `tailVh`
      // ci-dessus. Le recouvrement, lui, se cale sur le scroll réel (marge
      // négative en CSS, hors de ce composant) et profite donc pleinement
      // du `tailVh` restant une fois `p` figé à 1.
      const tailPx = (tailVh / 100) * window.innerHeight
      const contentTotal = total - tailPx
      if (contentTotal <= 0) return 0
      return Math.min(Math.max(-rect.top / contentTotal, 0), 1)
    }

    let lastFrameSet = -1
    let lastSeekAt = 0
    // Sur connexion lente, un seek() toutes les ~16ms (rAF) interrompt le
    // fetch réseau du seek précédent avant qu'il n'ait pu récupérer la
    // moindre donnée : `buffered` reste vide en continu, quelle que soit la
    // durée du scroll (confirmé en conditions réelles via le panneau
    // ?debug=1 — readyState bloqué à 1, buffered=(vide) du premier au
    // dernier tick, des dizaines de "seeking" qui ne font jamais aboutir un
    // seul chargement). Throttle les seeks vers une zone PAS ENCORE
    // bufferisée pour laisser au réseau le temps de finir au moins une
    // requête ; une fois qu'une zone est bufferisée, le seek y redevient
    // libre et instantané (lecture locale, aucun risque réseau).
    const MIN_SEEK_INTERVAL_MS = 200

    const isBuffered = (vid: HTMLVideoElement, t: number) => {
      const ranges = vid.buffered
      for (let i = 0; i < ranges.length; i++) {
        if (t >= ranges.start(i) - 0.5 && t <= ranges.end(i) + 0.5) return true
      }
      return false
    }

    const applyProgress = (p: number) => {
      setProgressPct(p * 100)
      setShowCue(p < 0.03)
      setActiveIdx(findActiveChapterIndex(chapters, p))

      const vid = videoRef.current
      if (vid && !videoFailed && Number.isFinite(vid.duration) && vid.duration > 0) {
        // Filet de sécurité : cette vidéo n'est JAMAIS censée jouer, le
        // scrub la pilote uniquement par `currentTime`. Si elle se retrouve
        // en lecture pour une raison quelconque (déblocage iOS qui démarre
        // tardivement sur connexion lente, quirk navigateur…), la remettre
        // en pause ici — la boucle rAF tourne en continu tant que le
        // composant est monté, donc ce filet s'applique à chaque frame,
        // sans dépendre d'un timing précis ailleurs.
        if (!vid.paused) vid.pause()

        // Vidéo encodée avec une image clé par frame : on ne resette
        // `currentTime` que quand la frame cible change réellement, pour un
        // scrub exact (pas d'arrondi/lerp qui ferait sauter des morceaux).
        const targetFrame = Math.round(p * vid.duration * fps)
        if (targetFrame !== lastFrameSet) {
          const targetTime = targetFrame / fps
          const now = performance.now()
          if (isBuffered(vid, targetTime) || now - lastSeekAt >= MIN_SEEK_INTERVAL_MS) {
            lastFrameSet = targetFrame
            lastSeekAt = now
            try {
              vid.currentTime = targetTime
            } catch {
              /* seek non disponible — ignorer */
            }
          }
          // Sinon : ce tick est ignoré (throttle actif, zone pas encore
          // bufferisée) — `lastFrameSet` n'est pas mis à jour, donc le tick
          // suivant (~16ms plus tard, rAF) retentera avec la position de
          // scroll la plus récente. Les positions intermédiaires manquées
          // pendant le throttle ne sont jamais rattrapées une par une —
          // seule la dernière compte, ce qui est le comportement voulu.
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
    let debugFrameCount = 0
    const tick = () => {
      applyProgress(computeProgress())
      if (isDebug) {
        debugFrameCount++
        // ~4x/s (pas à chaque frame, pour ne pas spammer les re-renders).
        if (debugFrameCount % 15 === 0) {
          const vid = videoRef.current
          if (vid) {
            const buffered = []
            for (let i = 0; i < vid.buffered.length; i++) {
              buffered.push(`${vid.buffered.start(i).toFixed(1)}-${vid.buffered.end(i).toFixed(1)}`)
            }
            setDebugState({
              readyState: vid.readyState,
              networkState: vid.networkState,
              paused: vid.paused,
              currentTime: Number(vid.currentTime.toFixed(2)),
              duration: Number.isFinite(vid.duration) ? Number(vid.duration.toFixed(2)) : NaN,
              buffered: buffered.join(',') || '(vide)',
              error: vid.error ? `${vid.error.code}:${vid.error.message}` : '-',
              videoFailed,
              currentSrc: vid.currentSrc.split('/').pop() || '',
            })
          }
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [reducedMotion, videoFailed, chapters, fps, isDebug, tailVh])

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
        <div
          className="hs-stage"
          style={
            video.posterSrc
              ? { backgroundImage: `url(${video.posterSrc})`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : undefined
          }
        >
          {/* L'affiche est aussi posée en fond CSS de `.hs-stage` juste
              au-dessus (pas seulement en attribut `poster`/fallback `<img>`) :
              elle peint dès le premier rendu, sans dépendre du chargement JS
              ni de l'état de la vidéo — jamais de cadre totalement vide le
              temps que la vidéo (bien plus lourde) arrive sur une connexion
              lente. */}
          {videoFailed ? (
            !video.posterSrc && <div className="hs-video" style={{ background: theme.frameBg }} />
          ) : (
            <video
              ref={videoRef}
              className="hs-video"
              poster={video.posterSrc}
              muted
              playsInline
              preload="auto"
              onLoadStart={() => logEvent('loadstart')}
              onLoadedData={() => logEvent('loadeddata')}
              onCanPlay={() => logEvent('canplay')}
              onCanPlayThrough={() => logEvent('canplaythrough')}
              onWaiting={() => logEvent('waiting')}
              onStalled={() => logEvent('stalled')}
              onSuspend={() => logEvent('suspend')}
              onAbort={() => logEvent('abort')}
              onPlay={() => logEvent('play')}
              onPlaying={() => logEvent('playing(react)')}
              onPause={() => logEvent('pause')}
              onSeeking={() => logEvent('seeking')}
              onSeeked={() => logEvent('seeked')}
              onEnded={() => logEvent('ended')}
              onLoadedMetadata={(e) => {
                logEvent('loadedmetadata')
                hasLoadedOnceRef.current = true
                setVideoDuration(e.currentTarget.duration)
                // Safari iOS peut ignorer les seeks (`currentTime`)
                // programmatiques tant que l'élément vidéo n'a jamais été
                // "activé" par un play() — même silencieux et aussitôt
                // interrompu. Sans ça, la vidéo peut rester bloquée sur son
                // affiche indéfiniment malgré un scrub qui semble fonctionner
                // partout ailleurs (desktop, Android). Muet + immédiatement
                // remis en pause : jamais de lecture visible.
                //
                // Piège identifié en conditions réelles : mettre pause() tout
                // de suite après play() (sans attendre sa promesse) NE SUFFIT
                // PAS. Sur connexion lente, play() reste en attente de
                // données tant que rien n'est encore bufferisé — à cet
                // instant la vidéo n'est pas encore réellement en lecture, et
                // pause() s'applique dans le vide (no-op). Quand assez de
                // données arrivent enfin (des secondes plus tard), la lecture
                // démarre pour de vrai et n'est plus jamais interrompue : la
                // vidéo file jusqu'à sa toute fin et s'y bloque, plus aucun
                // seek n'étant ensuite pris en compte — exactement le
                // symptôme observé (figé sur l'aérien final dès le début du
                // scroll, y compris après un rechargement complet).
                //
                // Fix robuste : ne pas présumer QUAND la lecture démarre
                // réellement — écouter l'évènement "playing" (qui ne se
                // déclenche qu'au tout premier frame effectivement rendu,
                // quel que soit le délai de buffering) et ne mettre en pause
                // qu'à ce moment-là. Le seek se fait alors sur une vidéo dont
                // la lecture a été interrompue pour de vrai, jamais sur une
                // promesse de lecture encore en attente.
                const vid = e.currentTarget
                const onPlaying = () => {
                  vid.pause()
                  vid.currentTime = 0
                  vid.removeEventListener('playing', onPlaying)
                }
                vid.addEventListener('playing', onPlaying)
                try {
                  const p = vid.play()
                  if (p && typeof p.then === 'function') {
                    p.catch(() => {
                      /* lecture bloquée — le scrub par seek reste tenté normalement */
                      vid.removeEventListener('playing', onPlaying)
                    })
                  }
                } catch {
                  vid.removeEventListener('playing', onPlaying)
                  /* play() indisponible — le scrub par seek reste tenté normalement */
                }
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
                logEvent(`error(hasErr=${!!vid.error})`)
                if (!vid.error) return
                if (vid.error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED || !hasLoadedOnceRef.current) {
                  logEvent('→ videoFailed=true')
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

      {isDebug && (
        <div
          className="fixed inset-x-0 bottom-0 z-[999] max-h-[45vh] overflow-y-auto bg-black/85 p-2 font-mono text-[10px] leading-tight text-lime-300"
          style={{ pointerEvents: 'auto' }}
        >
          <div className="mb-1 text-yellow-300">
            {Object.entries(debugState)
              .map(([k, v]) => `${k}=${v}`)
              .join(' | ')}
          </div>
          {debugLog.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}
    </div>
  )
}

function ChapterContent({ chapter, className }: { chapter: HeroChapter; className?: string }) {
  return (
    <div className={className}>
      {/* Encadré flouté : le texte se lit sur n'importe quelle image de la
          vidéo derrière, sans jamais figer le fond en plein cadre. */}
      <div className={cn('hs-card text-center', chapter.kind === 'list' && 'text-left')}>
        {chapter.lead && (
          <p className="mb-4 text-center text-[15px] font-light leading-relaxed" style={{ color: 'var(--hs-text-secondary)' }}>
            {chapter.lead}
          </p>
        )}

        {chapter.eyebrow && (
          <p
            className="mb-4 text-center text-[11px] uppercase tracking-[0.24em]"
            style={{ color: 'var(--hs-accent)' }}
          >
            {chapter.eyebrow}
          </p>
        )}

        {chapter.segments && (
          <div
            className={cn(
              'font-display mb-2 font-normal leading-[1.12]',
              // cqw (largeur de .hs-stage, cf. container-type dans
              // hero-scrub.css) — jamais vw (largeur viewport), qui a déjà
              // fait déborder "décembre" puis "Couleurs" sur desktop, où le
              // viewport est bien plus large que la colonne 9:16 réelle.
              chapter.titleSize === 'lg' ? 'text-[clamp(32px,19cqw,56px)]' : 'text-[clamp(28px,18cqw,46px)]',
            )}
            style={{ color: 'var(--hs-text-primary)' }}
          >
            {chapter.segmentLayout === 'stack' ? (
              <p>
                {chapter.segments.map((seg, i) => (
                  <span key={i}>
                    <span className={cn(seg.accent && 'italic')} style={seg.accent ? { color: 'var(--hs-accent)' } : undefined}>
                      {seg.text}
                    </span>
                    {i < chapter.segments!.length - 1 && <br />}
                  </span>
                ))}
              </p>
            ) : (
              <p>
                {chapter.segments.map((seg, i) => (
                  <span key={i} className={cn(seg.accent && 'italic')} style={seg.accent ? { color: 'var(--hs-accent)' } : undefined}>
                    {seg.text}
                    {i < chapter.segments!.length - 1 ? ' ' : ''}
                  </span>
                ))}
              </p>
            )}
          </div>
        )}

        {chapter.rule && (
          <div className="mx-auto my-[18px] h-px w-9 opacity-70" style={{ background: 'var(--hs-accent)' }} />
        )}

        {chapter.subLines && (
          <div>
            {chapter.subLines.map((line, i) => (
              <div key={i}>
                {i > 0 && (
                  <div className="mx-auto my-[10px] h-px w-9 opacity-70" style={{ background: 'var(--hs-accent)' }} />
                )}
                <p
                  className={cn('text-center font-light', chapter.subSize === 'md' ? 'text-[18px]' : 'text-[14px]')}
                  style={{ color: 'var(--hs-text-secondary)' }}
                >
                  {line}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* `sub` reste TOUJOURS à la taille discrète (14px), même quand
            `subSize: 'md'` agrandit `subLines` juste au-dessus — usage
            attesté : dress code après heure/lieu (Léa & Olivier), le sous-
            texte le plus discret du bloc, jamais celui qu'on agrandit. */}
        {chapter.sub && (
          <p
            className={cn('text-center font-light', chapter.subLines ? 'mt-3' : undefined, 'text-[14px]')}
            style={{ color: 'var(--hs-text-secondary)' }}
          >
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
