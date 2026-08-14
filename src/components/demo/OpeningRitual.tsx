import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

type Phase = 'idle' | 'opening' | 'leaving'

/**
 * Section 0 — Rituel d'ouverture (overlay d'entrée).
 * Enveloppe CSS scellée d'un cachet terracotta « A & T ». Au clic : le cachet
 * se fissure (scale 1→1.15, fondu 300ms), le rabat pivote (rotateX −160°,
 * 700ms power2.inOut), l'enveloppe glisse vers le bas (800ms) puis l'overlay
 * fond pour révéler le héros. Bouton « Passer » disponible à tout moment.
 */
export default function OpeningRitual({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>('idle')

  // Verrouille le scroll pendant le rituel
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  // Orchestration des étapes de l'ouverture
  useEffect(() => {
    if (phase === 'idle') return
    const timers =
      phase === 'opening'
        ? [window.setTimeout(() => setPhase('leaving'), 1250)]
        : [window.setTimeout(() => onDone(), 850)]
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [phase, onDone])

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Invitation — Anna et Théo"
      initial={{ opacity: 1 }}
      animate={{ opacity: phase === 'leaving' ? 0 : 1 }}
      transition={{ duration: 0.5, delay: phase === 'leaving' ? 0.35 : 0 }}
      className="grain fixed inset-0 z-[80] flex flex-col items-center justify-center overflow-hidden bg-anthracite-950 px-6"
    >
      {/* Halo terracotta 8 % */}
      <div
        aria-hidden
        className="animate-halo absolute left-1/2 top-1/2 h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(201,111,90,0.08) 0%, rgba(201,111,90,0) 65%)',
        }}
      />

      <motion.p
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mb-10 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/60"
      >
        Vous avez reçu quelque chose.
      </motion.p>

      {/* Enveloppe */}
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{
          y: phase === 'leaving' ? '110vh' : 0,
          opacity: 1,
        }}
        transition={
          phase === 'leaving'
            ? { duration: 0.8, ease: [0.455, 0.03, 0.515, 0.955] }
            : { duration: 0.8, delay: 0.35, ease: [0.22, 1, 0.36, 1] }
        }
        className="relative z-10 [perspective:1200px]"
      >
        <div className="relative aspect-[8/5] w-[min(84vw,380px)]">
          {/* Lettre à l'intérieur */}
          <motion.div
            animate={{ y: phase !== 'idle' ? '-26%' : '0%' }}
            transition={{ duration: 0.6, delay: 0.95, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-4 top-3 bottom-3 z-10 flex flex-col items-center justify-center gap-2 rounded-[4px] bg-neutral-100 px-6 text-center shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-terracotta-500">
              Faire-part
            </p>
            <p className="font-display text-2xl font-light italic text-ink">
              Anna <span className="not-italic text-terracotta-500">&</span> Théo
            </p>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">
              Samedi 20 juin 2026
            </p>
          </motion.div>

          {/* Corps de l'enveloppe */}
          <div className="absolute inset-0 z-20 rounded-[6px] border border-anthracite-700 bg-gradient-to-b from-anthracite-800 to-anthracite-900" />
          {/* Soufflets latéraux */}
          <div
            aria-hidden
            className="absolute inset-0 z-20 rounded-[6px] border-t border-anthracite-700/60 bg-anthracite-800/40"
            style={{ clipPath: 'polygon(0 0, 50% 52%, 0 100%)' }}
          />
          <div
            aria-hidden
            className="absolute inset-0 z-20 rounded-[6px] border-t border-anthracite-700/60 bg-anthracite-800/40"
            style={{ clipPath: 'polygon(100% 0, 50% 52%, 100% 100%)' }}
          />
          <div
            aria-hidden
            className="absolute inset-0 z-20 rounded-[6px] bg-anthracite-800"
            style={{ clipPath: 'polygon(0 100%, 50% 48%, 100% 100%)' }}
          />

          {/* Rabat animé */}
          <motion.div
            animate={{ rotateX: phase !== 'idle' ? -160 : 0 }}
            transition={{ duration: 0.7, delay: phase === 'idle' ? 0 : 0.3, ease: [0.455, 0.03, 0.515, 0.955] }}
            style={{ transformOrigin: 'top center', transformStyle: 'preserve-3d' }}
            className="absolute inset-0 z-30"
          >
            <div
              className="absolute inset-0 rounded-t-[6px] border border-anthracite-700 bg-gradient-to-b from-anthracite-700 to-anthracite-800"
              style={{ clipPath: 'polygon(0 0, 100% 0, 50% 58%)' }}
            />
            {/* Cachet de cire terracotta */}
            <motion.div
              animate={phase !== 'idle' ? { scale: 1.15, opacity: 0 } : { scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="absolute left-1/2 top-[52%] flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-terracotta-500 shadow-[0_4px_16px_rgba(0,0,0,0.45)]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/30 font-display text-sm italic text-white">
                A&nbsp;&&nbsp;T
              </span>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* CTA */}
      <motion.button
        type="button"
        onClick={() => phase === 'idle' && setPhase('opening')}
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: phase === 'idle' ? 1 : 0 }}
        transition={{ duration: 0.6, delay: phase === 'idle' ? 0.7 : 0 }}
        className="relative z-10 mt-12 rounded-full bg-terracotta-500 px-9 py-3.5 text-[13px] font-semibold uppercase tracking-[0.1em] text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400 active:scale-[0.97]"
      >
        Ouvrir l'invitation
      </motion.button>

      {/* Passer */}
      <button
        type="button"
        onClick={() => setPhase('leaving')}
        className="absolute bottom-8 right-8 z-10 text-[12px] font-medium uppercase tracking-[0.14em] text-white/45 transition-colors hover:text-white"
      >
        Passer →
      </button>
    </motion.div>
  )
}
