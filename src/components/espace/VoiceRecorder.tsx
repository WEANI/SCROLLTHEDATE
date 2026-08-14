import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Mic, Pause, Play, RotateCcw, Send, Square } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDuration, WHATSAPP_URL } from '@/components/espace/utils'

// ---------------------------------------------------------------------------
// VoiceRecorder — enregistrement navigateur (MediaRecorder) avec waveform
// canvas temps réel, réécoute, ré-enregistrement et envoi en dataURI.
// Fallback WhatsApp affiché si le micro est indisponible.
// ---------------------------------------------------------------------------

export interface VoiceNoteResult {
  dataUri: string
  durationSec: number
  mimeType: string
}

type Phase = 'idle' | 'recording' | 'paused' | 'review' | 'sending' | 'sent' | 'denied'

function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
  return candidates.find((c) => MediaRecorder.isTypeSupported(c)) ?? ''
}

export default function VoiceRecorder({
  onSend,
  compact = false,
}: {
  /** Appelé avec le dataURI audio quand l'utilisateur clique « Envoyer ». Doit throw en cas d'échec. */
  onSend: (result: VoiceNoteResult) => Promise<void>
  /** Version compacte (popover du composer messages). */
  compact?: boolean
}) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [result, setResult] = useState<VoiceNoteResult | null>(null)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const rafRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAtRef = useRef(0)
  const accumulatedRef = useRef(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    analyserRef.current = null
    void audioCtxRef.current?.close().catch(() => undefined)
    audioCtxRef.current = null
  }, [])

  useEffect(() => cleanup, [cleanup])

  // -------------------------------------------------------------------------
  // Waveform canvas (barres terracotta réactives au volume)
  // -------------------------------------------------------------------------
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current
    const analyser = analyserRef.current
    if (!canvas || !analyser) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const data = new Uint8Array(analyser.frequencyBinCount)
    const draw = () => {
      analyser.getByteFrequencyData(data)
      const { width, height } = canvas
      ctx.clearRect(0, 0, width, height)
      const bars = 48
      const step = Math.floor(data.length / bars)
      const barW = width / bars
      for (let i = 0; i < bars; i++) {
        const v = data[i * step] / 255
        const h = Math.max(3, v * height * 0.9)
        ctx.fillStyle = '#C96F5A'
        ctx.beginPath()
        ctx.roundRect(i * barW + barW * 0.2, (height - h) / 2, barW * 0.6, h, 2)
        ctx.fill()
      }
      rafRef.current = requestAnimationFrame(draw)
    }
    draw()
  }, [])

  // -------------------------------------------------------------------------
  // Enregistrement
  // -------------------------------------------------------------------------
  const start = async () => {
    setError(null)
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setPhase('denied')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = pickMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      recorderRef.current = recorder
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        const reader = new FileReader()
        reader.onloadend = () => {
          setResult({
            dataUri: String(reader.result),
            durationSec: Math.round(elapsedRef.current),
            mimeType: blob.type,
          })
          setPhase('review')
        }
        reader.readAsDataURL(blob)
      }

      // Analyseur pour la waveform
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (Ctx) {
        const audioCtx = new Ctx()
        audioCtxRef.current = audioCtx
        const source = audioCtx.createMediaStreamSource(stream)
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 256
        source.connect(analyser)
        analyserRef.current = analyser
      }

      recorder.start(250)
      startedAtRef.current = Date.now()
      accumulatedRef.current = 0
      setElapsed(0)
      setPhase('recording')
      timerRef.current = setInterval(() => {
        setElapsed(accumulatedRef.current + (Date.now() - startedAtRef.current) / 1000)
      }, 200)
      drawWaveform()
    } catch {
      setPhase('denied')
    }
  }

  const elapsedRef = useRef(0)
  useEffect(() => {
    elapsedRef.current = elapsed
  }, [elapsed])

  const pause = () => {
    recorderRef.current?.pause()
    accumulatedRef.current += Date.now() - startedAtRef.current
    if (timerRef.current) clearInterval(timerRef.current)
    setPhase('paused')
  }

  const resume = () => {
    recorderRef.current?.resume()
    startedAtRef.current = Date.now()
    timerRef.current = setInterval(() => {
      setElapsed(accumulatedRef.current + (Date.now() - startedAtRef.current) / 1000)
    }, 200)
    setPhase('recording')
  }

  const stop = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    cancelAnimationFrame(rafRef.current)
    recorderRef.current?.stop()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  const reset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null)
    setResult(null)
    setElapsed(0)
    setPlaying(false)
    setPhase('idle')
  }

  const send = async () => {
    if (!result) return
    setPhase('sending')
    setError(null)
    try {
      await onSend(result)
      setPhase('sent')
    } catch {
      setError("L'envoi a échoué — réessayez ou passez par WhatsApp.")
      setPhase('review')
    }
  }

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
    } else {
      void audio.play()
    }
  }

  const recording = phase === 'recording' || phase === 'paused'

  return (
    <div className={cn('flex flex-col gap-4', compact && 'gap-3')}>
      {/* Canvas waveform (visible pendant l'enregistrement) */}
      <AnimatePresence>
        {recording && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <canvas
              ref={canvasRef}
              width={520}
              height={72}
              style={{ width: '100%', height: 72 }}
              className="rounded-xl bg-neutral-100"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contrôles */}
      <div className="flex flex-wrap items-center gap-3">
        {phase === 'idle' || phase === 'denied' ? (
          <button
            type="button"
            onClick={() => void start()}
            aria-label="Démarrer l'enregistrement"
            className={cn(
              'flex items-center justify-center rounded-full bg-terracotta-500 text-white transition-all hover:bg-terracotta-400 active:scale-95',
              compact ? 'h-11 w-11' : 'h-16 w-16',
            )}
          >
            <Mic size={compact ? 18 : 24} />
          </button>
        ) : recording ? (
          <>
            <motion.button
              type="button"
              animate={{ scale: phase === 'recording' ? [1, 1.08, 1] : 1 }}
              transition={{ duration: 1, repeat: phase === 'recording' ? Infinity : 0 }}
              onClick={stop}
              aria-label="Arrêter"
              className={cn(
                'flex items-center justify-center rounded-full bg-terracotta-500 text-white',
                compact ? 'h-11 w-11' : 'h-16 w-16',
              )}
            >
              <Square size={compact ? 16 : 20} fill="currentColor" />
            </motion.button>
            <button
              type="button"
              onClick={phase === 'recording' ? pause : resume}
              aria-label={phase === 'recording' ? 'Pause' : 'Reprendre'}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 text-ink transition-colors hover:bg-neutral-100"
            >
              {phase === 'recording' ? <Pause size={16} /> : <Play size={16} />}
            </button>
          </>
        ) : null}

        {/* Timer tabulaire */}
        {(recording || phase === 'review' || phase === 'sending' || phase === 'sent') && (
          <span className="font-mono text-sm tabular-nums text-ink">
            {formatDuration(elapsed)}
          </span>
        )}

        {phase === 'idle' && !compact && (
          <p className="text-[13px] text-neutral-500">
            Appuyez pour enregistrer — 2 à 5 minutes, parlez comme à un ami.
          </p>
        )}
      </div>

      {/* Réécoute + actions */}
      <AnimatePresence>
        {(phase === 'review' || phase === 'sending' || phase === 'sent') && audioUrl && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="flex flex-col gap-3"
          >
            <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-100/60 px-3 py-2.5">
              <button
                type="button"
                onClick={togglePlay}
                aria-label={playing ? 'Pause' : 'Réécouter'}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-anthracite-800 text-white transition-colors hover:bg-anthracite-700"
              >
                {playing ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <audio
                ref={audioRef}
                src={audioUrl}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
                className="hidden"
              />
              <span className="text-[13px] text-neutral-500">
                Réécoutez votre message avant l'envoi
              </span>
            </div>

            {phase === 'sent' ? (
              <motion.p
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-2 text-[13px] font-medium text-[#4d7a62]"
              >
                <Check size={16} />
                Note vocale envoyée — merci !
              </motion.p>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-4 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-neutral-100"
                >
                  <RotateCcw size={14} />
                  Ré-enregistrer
                </button>
                <button
                  type="button"
                  onClick={() => void send()}
                  disabled={phase === 'sending'}
                  className="inline-flex items-center gap-2 rounded-full bg-terracotta-500 px-5 py-2 text-[13px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400 active:scale-[0.97] disabled:opacity-60"
                >
                  {phase === 'sending' ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Envoi…
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      Envoyer
                    </>
                  )}
                </button>
              </div>
            )}
            {error && <p className="text-[12.5px] font-medium text-error">{error}</p>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fallback WhatsApp (micro refusé / non supporté) */}
      {phase === 'denied' && (
        <div className="rounded-xl border border-neutral-200 bg-neutral-100/60 p-4 text-[13px] text-neutral-500">
          <p className="font-medium text-ink">Le micro n'est pas accessible.</p>
          <p className="mt-1">
            Autorisez le micro dans votre navigateur, ou envoyez votre vocal via WhatsApp :
          </p>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-anthracite-800 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-anthracite-700"
          >
            Ouvrir WhatsApp
          </a>
        </div>
      )}
    </div>
  )
}
