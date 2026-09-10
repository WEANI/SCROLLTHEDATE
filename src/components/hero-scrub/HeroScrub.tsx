import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { HeroChapter, HeroTheme, HeroVideoConfig } from './types'
import { FrameSequence } from './FrameSequence'
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
    // Fenêtre dégénérée (`to <= from`) — timing pas encore réglé au studio
    // (valeur par défaut {fromSec:0,toSec:0}, cf. BLANK_HERO_CHAPTERS dans
    // StudioPanel.tsx). Sans ce garde-fou, le cas particulier "dernier
    // chapitre" juste en dessous (`p <= ch.to`) matchait à p=0 dès que le
    // DERNIER chapitre du tableau avait ce timing par défaut — le bloc
    // suivant qu'on retirait migrait alors simplement sur celui-ci
    // (constaté en conditions réelles le 06/09/2026 : après avoir retiré
    // le chapitre de clôture, c'est le chapitre "détails pratiques" —
    // devenu le nouveau dernier — qui s'est mis à apparaître au tout début
    // à sa place). Un chapitre non configuré ne doit jamais s'activer.
    if (ch.to <= ch.from) continue
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
  /** Décor graphique posé sur le hero, cf. heroDecor.ts::HERO_OVERLAY_GRAPHICS — `undefined`/id inconnu = aucun (comportement inchangé). */
  overlayGraphic?: string
  /**
   * Police du TITRE du hero (segments — prénoms, "Save the date"…), cf.
   * heroDecor.ts::HERO_FONTS — `undefined` = police du site (Fraunces,
   * comportement inchangé). Ne change QUE le titre, pas l'eyebrow/lead/sub.
   */
  fontFamily?: string
  /**
   * Animation d'apparition des blocs de texte, cf. heroDecor.ts::
   * HERO_TEXT_ANIMATIONS — `undefined`/id inconnu = fondu par défaut
   * (comportement inchangé, `.hs-overlay.show` seul). UNE pour tout le
   * hero (pas par chapitre) — cf. doc du catalogue.
   */
  textAnimation?: string
  /**
   * Filtre visuel de la vidéo/des frames, cf. heroDecor.ts::HERO_FILTERS —
   * `undefined`/id inconnu = aucun filtre (comportement inchangé).
   */
  filter?: string
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
  overlayGraphic,
  fontFamily,
  textAnimation,
  filter: heroFilter,
}: HeroScrubProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const framesRef = useRef<FrameSequence | null>(null)
  const hasLoadedOnceRef = useRef(false)
  const frames = video.frames

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
    // Police du TITRE du hero (segments) — cf. doc de HeroScrubProps.fontFamily
    // et heroDecor.ts::HERO_FONTS. Défaut = police du site (Fraunces),
    // comportement inchangé tant qu'aucune n'est choisie au studio.
    '--hs-font-family': fontFamily || "'Fraunces', Georgia, serif",
  } as CSSProperties

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Mode "frames" (cf. api/lib/videoFrames.ts) — instancié seulement si
  // `video.frames` est fourni, détruit au démontage/changement de source.
  // Recréé si `frames.baseUrl` change (nouvelle version de vidéo livrée) —
  // pas pour un simple re-render, d'où la dépendance ciblée plutôt que
  // l'objet `frames` entier (nouvelle référence à chaque rendu du parent).
  useEffect(() => {
    if (!frames) return
    const seq = new FrameSequence(frames.baseUrl, frames.count)
    framesRef.current = seq
    return () => {
      seq.destroy()
      framesRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frames?.baseUrl, frames?.count])

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

      // Mode "frames" — dessine directement l'image la plus proche de `p`,
      // aucune des subtilités de seek/buffering d'un <video> ci-dessous ne
      // s'applique (cf. doc de FrameSequence.ts).
      if (frames) {
        const seq = framesRef.current
        const canvas = canvasRef.current
        if (seq && canvas) {
          const targetIndex = Math.round(p * (frames.count - 1))
          seq.prioritize(targetIndex)
          seq.draw(canvas, targetIndex)
        }
        return
      }

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
      // Préchargement séquentiel de fond (mode "frames") — même esprit que
      // `preload="auto"` pour une vidéo, indépendant de la position de
      // scroll courante (cf. `prioritize` dans applyProgress ci-dessus
      // pour la fenêtre réactive autour du scroll).
      framesRef.current?.pump()
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
  }, [reducedMotion, videoFailed, chapters, fps, isDebug, tailVh, frames])

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
          className={cn('hs-stage', heroFilter && `hs-filter-${heroFilter}`)}
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
          {frames ? (
            // Mode "frames" — un <canvas> plutôt qu'un <video>, cf. doc de
            // FrameSequence.ts. `aria-hidden` : purement décoratif, comme
            // la vidéo qu'il remplace (le vrai contenu de la page reste
            // dans les chapitres HTML et le <h1> sr-only, cf. plus bas).
            <canvas ref={canvasRef} className="hs-video" aria-hidden />
          ) : videoFailed ? (
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

          {/* Calque de filtre (grain/vignette/halo — cf. doc de HeroFilterLayer
              plus bas) — juste après la vidéo, avant le décor et le texte. */}
          <HeroFilterLayer id={heroFilter} />

          {/* Décor graphique (cf. heroDecor.ts) — après la vidéo, avant les
              cartes de texte dans le DOM : visuellement au-dessus de la
              vidéo, derrière le texte. */}
          <HeroOverlayGraphic id={overlayGraphic} />

          {chapters.map((ch, i) => (
            <ChapterContent
              key={ch.id}
              chapter={ch}
              textAnimation={textAnimation}
              className={cn(
                'hs-overlay',
                i === activeIdx && 'show',
                ch.verticalAlign === 'top' && 'hs-valign-top',
                ch.verticalAlign === 'bottom' && 'hs-valign-bottom',
                textAnimation && `hs-anim-${textAnimation}`,
              )}
            />
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

/**
 * Force `children` sur une seule ligne en réduisant sa taille de police si
 * elle déborde de l'espace disponible — cf. doc de `HeroChapter.fitOneLine`
 * (prénoms du save the date, dont la longueur varie par couple et ne doit
 * jamais se scinder sur 2 lignes). Mesure la largeur réelle du texte
 * (`scrollWidth`) une fois rendu à sa taille CSS naturelle (`clamp(...)`,
 * posée par l'appelant) contre la largeur du conteneur parent
 * (`clientWidth`) ; réduit `fontSize` en proportion si besoin, jamais
 * l'inverse (un texte court garde sa taille normale, pas agrandie).
 * Remesure au redimensionnement (ResizeObserver sur le conteneur, pas la
 * fenêtre — la largeur pertinente est celle de `.hs-stage`, cf. `cqw` dans
 * ChapterContent) et à chaque changement de contenu (nouveau chapitre actif).
 */
/**
 * Décor graphique du hero, cf. heroDecor.ts::HERO_OVERLAY_GRAPHICS pour la
 * liste éditable au studio et hero-scrub.css pour les classes `.hs-ov-*`
 * portées de overlays-graphiques.html (doc fournie le 10/09/2026). `id`
 * inconnu/absent = rien (comportement inchangé) — pas de liste blanche
 * stricte ici, un id qui ne matche aucun `case` retombe simplement sur
 * `null`, jamais une erreur.
 */
function HeroOverlayGraphic({ id }: { id?: string }) {
  switch (id) {
    case 'corners':
      return (
        <div className="hs-ov-corners" aria-hidden>
          <i />
          <i />
          <i />
          <i />
        </div>
      )
    case 'dots':
      return <div className="hs-ov-dots" aria-hidden />
    case 'cross':
      return (
        <div className="hs-ov-cross" aria-hidden>
          <span>+</span>
          <span>+</span>
          <span>+</span>
        </div>
      )
    case 'ring':
      return <div className="hs-ov-ring" aria-hidden />
    case 'pulse':
      return <div className="hs-ov-pulse" aria-hidden />
    case 'orb':
      return (
        <div className="hs-ov-orb" aria-hidden>
          <i />
          <i />
        </div>
      )
    case 'noise':
      return <div className="hs-ov-noise" aria-hidden />
    case 'vignette':
      return <div className="hs-ov-vignette" aria-hidden />
    case 'shapes':
      return (
        <div className="hs-ov-shapes" aria-hidden>
          <i />
          <i />
          <i />
        </div>
      )
    case 'diagonal':
      return <div className="hs-ov-diagonal" aria-hidden />
    case 'arc':
      return <div className="hs-ov-arc" aria-hidden />
    case 'sparkle':
      return (
        <div className="hs-ov-sparkle" aria-hidden>
          <span>✦</span>
          <span>✦</span>
          <span>✦</span>
        </div>
      )
    // Ajoutés le 11/09/2026 — bibliothèque "mariage".
    case 'heart-line':
      return (
        <svg className="hs-ov-heart-line" viewBox="0 0 64 64" aria-hidden>
          <path d="M32 54 C10 38 4 24 14 15 C21 9 30 12 32 20 C34 12 43 9 50 15 C60 24 54 38 32 54 Z" />
        </svg>
      )
    case 'rings':
      return (
        <svg className="hs-ov-rings" viewBox="0 0 64 40" aria-hidden>
          <circle cx="24" cy="20" r="14" />
          <circle cx="40" cy="20" r="14" />
        </svg>
      )
    case 'dove':
      return (
        <svg className="hs-ov-dove" viewBox="0 0 60 60" aria-hidden>
          <path d="M8 34 C16 24 26 22 32 28 C36 20 46 16 54 20 C46 22 42 28 40 32 C44 34 50 34 54 30 C48 42 34 42 26 36 C20 40 12 40 8 34 Z" />
        </svg>
      )
    case 'floral-corner':
      return (
        <div className="hs-ov-floral-corner" aria-hidden>
          {Array.from({ length: 4 }).map((_, i) => (
            <svg key={i} viewBox="0 0 46 46">
              <path d="M2 2 C2 20 10 30 30 30" />
              <circle cx="6" cy="6" r="2.5" />
              <circle cx="13" cy="4" r="1.6" />
            </svg>
          ))}
        </div>
      )
    case 'petals-fall':
      return (
        <div className="hs-ov-petals-fall" aria-hidden>
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      )
    case 'confetti-fall':
      return (
        <div className="hs-ov-confetti-fall" aria-hidden>
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      )
    case 'ribbon':
      return (
        <svg className="hs-ov-ribbon" viewBox="0 0 56 56" aria-hidden>
          <path d="M28 28 C18 14 4 16 4 26 C4 34 16 32 28 28 C40 32 52 34 52 26 C52 16 38 14 28 28 Z" />
          <circle cx="28" cy="28" r="4" />
        </svg>
      )
    case 'monogram-frame':
      return <div className="hs-ov-monogram-frame" aria-hidden />
    case 'heart-pulse':
      return (
        <svg className="hs-ov-heart-pulse" viewBox="0 0 46 46" aria-hidden>
          <path d="M23 40 C6 28 2 16 10 9 C15 5 21 7 23 13 C25 7 31 5 36 9 C44 16 40 28 23 40 Z" />
        </svg>
      )
    case 'calligraphy-swash':
      return (
        <svg className="hs-ov-calligraphy-swash" viewBox="0 0 120 50" aria-hidden>
          <path d="M6 34 C 26 8, 52 8, 60 26 S 96 47, 114 16" />
        </svg>
      )
    case 'shooting-stars':
      return (
        <div className="hs-ov-shooting-stars" aria-hidden>
          <i />
          <i />
          <i />
        </div>
      )
    case 'laurel':
      return (
        <svg className="hs-ov-laurel" viewBox="0 0 130 60" aria-hidden>
          <path d="M65 10 L65 50 M65 50 C 50 45, 40 35, 38 20 M65 50 C 40 46, 28 34, 28 18 M65 50 C 80 45, 90 35, 92 20 M65 50 C 90 46, 102 34, 102 18" />
        </svg>
      )
    case 'infinity':
      return (
        <svg className="hs-ov-infinity" viewBox="0 0 74 40" aria-hidden>
          <path d="M18 20 C18 10 30 10 37 20 C44 30 56 30 56 20 C56 10 44 10 37 20 C30 30 18 30 18 20 Z" />
        </svg>
      )
    case 'candles':
      return (
        <div className="hs-ov-candles" aria-hidden>
          <i />
          <i />
          <i />
        </div>
      )
    case 'bouquet':
      return (
        <svg className="hs-ov-bouquet" viewBox="0 0 60 60" aria-hidden>
          <path d="M30 58 L30 34" />
          <circle cx="22" cy="24" r="8" />
          <circle cx="34" cy="18" r="7" />
          <circle cx="40" cy="30" r="7" />
          <circle cx="26" cy="34" r="6" />
        </svg>
      )
    case 'birds-pair':
      return (
        <svg className="hs-ov-birds-pair" viewBox="0 0 76 38" aria-hidden>
          <path d="M8 24 C14 16 22 16 26 22 C30 16 38 16 42 24" />
          <path d="M34 24 C38 16 46 16 50 22 C54 16 62 16 68 24" />
        </svg>
      )
    case 'lace-border':
      return (
        <div className="hs-ov-lace-border" aria-hidden>
          <svg viewBox="0 0 200 14" preserveAspectRatio="none">
            <path d="M0 2 Q 8 12 16 2 T 32 2 T 48 2 T 64 2 T 80 2 T 96 2 T 112 2 T 128 2 T 144 2 T 160 2 T 176 2 T 192 2" />
          </svg>
          <svg viewBox="0 0 200 14" preserveAspectRatio="none">
            <path d="M0 2 Q 8 12 16 2 T 32 2 T 48 2 T 64 2 T 80 2 T 96 2 T 112 2 T 128 2 T 144 2 T 160 2 T 176 2 T 192 2" />
          </svg>
        </div>
      )
    case 'butterfly':
      return (
        <svg className="hs-ov-butterfly" viewBox="0 0 52 44" aria-hidden>
          <path d="M26 22 C18 4 2 6 4 18 C6 28 18 26 26 22 C34 26 46 28 48 18 C50 6 34 4 26 22 Z" />
        </svg>
      )
    case 'wreath':
      return (
        <div className="hs-ov-wreath" aria-hidden>
          <i />
          <i />
          <i />
          <i />
        </div>
      )
    case 'moon-stars':
      return (
        <svg className="hs-ov-moon-stars" viewBox="0 0 52 52" aria-hidden>
          <path className="hs-moon" d="M30 6 A20 20 0 1 0 30 46 A16 16 0 0 1 30 6 Z" />
          <path className="hs-star" d="M40 10 l1.4 3.4 3.4 1.4 -3.4 1.4 -1.4 3.4 -1.4 -3.4 -3.4 -1.4 3.4 -1.4 Z" />
        </svg>
      )
    default:
      return null
  }
}

/**
 * Calque de filtre visuel (grain/vignette chaude/halo), cf. heroDecor.ts::
 * HERO_FILTERS et doc de `.hs-filter-layer` dans hero-scrub.css — pourquoi
 * un vrai <div> plutôt qu'un `::after` CSS (les pseudo-éléments n'existent
 * pas sur les éléments remplacés <video>/<canvas>). Les filtres qui ne
 * sont qu'un `filter:` CSS simple (sépia, noir & blanc…) n'ont besoin
 * d'aucun DOM supplémentaire — gérés uniquement via la classe posée sur
 * `.hs-stage`, cf. HeroScrub — donc `null` ici pour eux.
 */
function HeroFilterLayer({ id }: { id?: string }) {
  switch (id) {
    case 'grain-cinema':
      return <div className="hs-filter-layer hs-filter-layer-grain" aria-hidden />
    case 'vignette-chaude':
      return <div className="hs-filter-layer hs-filter-layer-vignette" aria-hidden />
    case 'dreamy-glow':
      return <div className="hs-filter-layer hs-filter-layer-glow" aria-hidden />
    default:
      return null
  }
}

function FitOneLineText({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLParagraphElement>(null)

  useLayoutEffect(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return
    const measure = () => {
      inner.style.fontSize = ''
      const available = outer.clientWidth
      const natural = inner.scrollWidth
      if (available > 0 && natural > available) {
        const naturalPx = parseFloat(getComputedStyle(inner).fontSize)
        inner.style.fontSize = `${(naturalPx * available) / natural}px`
      }
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(outer)
    return () => ro.disconnect()
  })

  return (
    <div ref={outerRef} className="w-full overflow-hidden">
      <p ref={innerRef} className={cn(className, 'inline-block whitespace-nowrap')} style={style}>
        {children}
      </p>
    </div>
  )
}

// Animations dont le titre a besoin d'un wrapper `.hs-anim-target` dédié
// (largeur/clip/dégradé animés), cf. hero-scrub.css. Les autres (ink-reveal,
// soft-zoom, bloom, handwrite, et le fondu par défaut) animent directement
// `.hs-overlay.show` — aucun balisage supplémentaire nécessaire. letter-drop
// et petals-in ont chacun leur propre rendu spécial, gérés à part ci-dessous.
const HERO_ANIM_NEEDS_TARGET = new Set(['typewriter', 'curtain', 'underline-draw', 'shimmer', 'unfold'])

function ChapterContent({
  chapter,
  className,
  textAnimation,
}: {
  chapter: HeroChapter
  className?: string
  textAnimation?: string
}) {
  // Redéfinition locale des variables CSS du thème — ne s'applique qu'à CE
  // chapitre (cascade normale), cf. doc de `textColorOverride`/
  // `cardBgOverride`. `undefined` (pas de override) laisse `style` vide
  // pour cette clé : React n'écrit alors rien, la valeur héritée du
  // parent (`themeVars`, thème commun) continue de s'appliquer.
  const overrideVars = {
    ...(chapter.textColorOverride
      ? { '--hs-text-primary': chapter.textColorOverride, '--hs-text-secondary': chapter.textColorOverride }
      : null),
    ...(chapter.cardBgOverride ? { '--hs-card-bg': chapter.cardBgOverride } : null),
  } as CSSProperties
  return (
    <div className={className} style={overrideVars}>
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
              'mb-2 font-normal leading-[1.12]',
              // cqw (largeur de .hs-stage, cf. container-type dans
              // hero-scrub.css) — jamais vw (largeur viewport), qui a déjà
              // fait déborder "décembre" puis "Couleurs" sur desktop, où le
              // viewport est bien plus large que la colonne 9:16 réelle.
              chapter.titleSize === 'lg' ? 'text-[clamp(32px,19cqw,56px)]' : 'text-[clamp(28px,18cqw,46px)]',
            )}
            // `font-display` (classe Tailwind, Fraunces figée) retirée au
            // profit de la variable CSS ci-dessous — pilotable au studio
            // (heroFontId, cf. heroDecor.ts), Fraunces par défaut si aucune
            // n'est choisie (cf. `--hs-font-family` dans themeVars).
            style={{ color: 'var(--hs-text-primary)', fontFamily: 'var(--hs-font-family)' }}
          >
            {textAnimation === 'letter-drop' ? (
              // Rendu spécial : chaque caractère dans son propre
              // `.hs-anim-letter` (cf. hero-scrub.css), indépendamment de
              // segmentLayout/fitOneLine — la retombée lettre par lettre
              // prime sur le layout en pile/une-ligne pour cette animation.
              <p>
                {chapter.segments.map((seg, i) => {
                  let letterIdx = 0
                  for (let k = 0; k < i; k++) letterIdx += chapter.segments![k].text.length + 1
                  return (
                    <span key={i} className={cn(seg.accent && 'italic')} style={seg.accent ? { color: 'var(--hs-accent)' } : undefined}>
                      {seg.text.split('').map((c, j) => (
                        <span key={j} className="hs-anim-letter" style={{ animationDelay: `${(letterIdx + j) * 0.03}s` }}>
                          {c === ' ' ? ' ' : c}
                        </span>
                      ))}
                      {i < chapter.segments!.length - 1 ? ' ' : ''}
                    </span>
                  )
                })}
              </p>
            ) : (
              <MaybeAnimTarget active={HERO_ANIM_NEEDS_TARGET.has(textAnimation ?? '')}>
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
                ) : chapter.fitOneLine ? (
                  <FitOneLineText>
                    {chapter.segments.map((seg, i) => (
                      <span key={i} className={cn(seg.accent && 'italic')} style={seg.accent ? { color: 'var(--hs-accent)' } : undefined}>
                        {seg.text}
                        {i < chapter.segments!.length - 1 ? ' ' : ''}
                      </span>
                    ))}
                  </FitOneLineText>
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
              </MaybeAnimTarget>
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

        {/* Pétales décoratifs de l'animation "petals-in" (cf. heroDecor.ts::
            HERO_TEXT_ANIMATIONS) — positionnés par rapport à `.hs-card`
            (position: relative, cf. sa règle de base), jamais visibles hors
            de cette animation (opacity: 0 par défaut dans le CSS). */}
        {textAnimation === 'petals-in' && (
          <>
            <i className="hs-anim-petal hs-anim-petal-1" aria-hidden />
            <i className="hs-anim-petal hs-anim-petal-2" aria-hidden />
            <i className="hs-anim-petal hs-anim-petal-3" aria-hidden />
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Enveloppe conditionnelle `.hs-anim-target` (cf. HERO_ANIM_NEEDS_TARGET
 * ci-dessus) — évite d'alourdir le DOM d'un span inutile pour les
 * animations qui n'en ont pas besoin (ink-reveal, soft-zoom, bloom,
 * handwrite, fondu par défaut).
 */
function MaybeAnimTarget({ active, children }: { active: boolean; children: ReactNode }) {
  return active ? <span className="hs-anim-target">{children}</span> : <>{children}</>
}
