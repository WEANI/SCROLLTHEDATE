import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { DemoTemplate } from './templates'
import { SECTION_THEMES, WEDDING_DATE } from './templates'

interface Parts {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function computeParts(): Parts {
  const diff = Math.max(0, WEDDING_DATE.getTime() - Date.now())
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor(diff / 3_600_000) % 24,
    minutes: Math.floor(diff / 60_000) % 60,
    seconds: Math.floor(diff / 1_000) % 60,
  }
}

const UNITS: { key: keyof Parts; label: string }[] = [
  { key: 'days', label: 'jours' },
  { key: 'hours', label: 'heures' },
  { key: 'minutes', label: 'min' },
  { key: 'seconds', label: 'sec' },
]

/** Bloc chiffre avec flip vertical (y:−100 %→0, 400ms) à chaque changement. */
function FlipDigit({ value, label, theme }: { value: number; label: string; theme: DemoTemplate }) {
  const t = SECTION_THEMES[theme]
  const text = String(value).padStart(2, '0')
  return (
    <div className="flex flex-col items-center gap-3 px-4 sm:px-8">
      <div className="relative h-[4.5rem] overflow-hidden sm:h-[5.5rem]">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={text}
            initial={{ y: '-100%', opacity: 0 }}
            animate={{ y: '0%', opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'font-display tabular block text-[4.5rem] font-light leading-none sm:text-[5.5rem]',
              t.heading,
            )}
          >
            {text}
          </motion.span>
        </AnimatePresence>
      </div>
      <span
        className={cn(
          'text-[11px] font-semibold uppercase tracking-[0.24em]',
          theme === 'minimal' ? 'text-terracotta-500' : 'text-terracotta-300',
        )}
      >
        {label}
      </span>
    </div>
  )
}

/** Section 2 — Compte à rebours live. */
export default function CountdownSection({ template }: { template: DemoTemplate }) {
  const t = SECTION_THEMES[template]
  const [parts, setParts] = useState<Parts>(computeParts)

  useEffect(() => {
    const id = window.setInterval(() => setParts(computeParts()), 1000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <section
      className={cn('relative overflow-hidden py-28 transition-colors [transition-duration:600ms] lg:py-40', t.section)}
      aria-label="Compte à rebours"
    >
      {t.photoBg && (
        <>
          <img
            src="/demo-poster.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-30"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-anthracite-950/70" />
        </>
      )}
      <div className="relative mx-auto max-w-[1440px] px-6 text-center lg:px-12">
        <motion.p
          initial={{ y: 24, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, margin: '-30%' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            'font-display text-[clamp(1.8rem,3.6vw,3rem)] font-light italic tracking-[-0.01em]',
            t.heading,
          )}
        >
          On se marie dans
        </motion.p>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-30%' }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
          className="mt-12 flex items-start justify-center"
        >
          {UNITS.map((unit, i) => (
            <motion.div
              key={unit.key}
              variants={{
                hidden: { y: 32, opacity: 0 },
                show: { y: 0, opacity: 1, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
              }}
              className="flex items-center"
            >
              {i > 0 && (
                <span aria-hidden className="h-16 w-px bg-terracotta-300/50 sm:h-20" />
              )}
              <FlipDigit value={parts[unit.key]} label={unit.label} theme={template} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
