import { useEffect, useRef, useState } from 'react'
import { animate, motion, useInView } from 'framer-motion'
import { Flower2, GlassWater, MoonStar, Music4, UtensilsCrossed } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DemoTemplate } from './templates'
import { SECTION_THEMES, WEDDING_DATE_LABEL } from './templates'

interface Slot {
  minutes: number
  label: string
  detail: string
  icon: LucideIcon
}

const SCHEDULE: Slot[] = [
  { minutes: 15 * 60, label: 'Cérémonie', detail: 'Dans les jardins du domaine, face au couchant.', icon: Flower2 },
  { minutes: 16 * 60 + 30, label: 'Cocktail', detail: 'Vins de la vallée & pièces salées sur la terrasse.', icon: GlassWater },
  { minutes: 19 * 60 + 30, label: 'Dîner', detail: 'Dîner assis sous la verrière, menu du terroir.', icon: UtensilsCrossed },
  { minutes: 22 * 60, label: 'Soirée dansante', detail: 'Ouverture de bal, puis DJ jusqu’au bout de la nuit.', icon: Music4 },
  { minutes: 24 * 60, label: 'Finale', detail: 'Dernier slow, dernier verre, premiers souvenirs.', icon: MoonStar },
]

function formatMinutes(total: number): string {
  const h = Math.floor(total / 60) % 24
  const m = total % 60
  return `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}`
}

/** Heure qui compte depuis 00h00 jusqu'à sa valeur (600ms) à l'entrée viewport. */
function CountUpTime({ minutes, delay }: { minutes: number; delay: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-20%' })
  const [display, setDisplay] = useState('00h00')

  useEffect(() => {
    if (!inView) return
    const controls = animate(0, minutes, {
      duration: 0.6,
      delay,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(formatMinutes(Math.round(v))),
    })
    return () => controls.stop()
  }, [inView, minutes, delay])

  return (
    <span ref={ref} className="tabular">
      {display}
    </span>
  )
}

/** Section 4 — Le programme du jour J (timeline horaire). */
export default function ProgramSection({ template }: { template: DemoTemplate }) {
  const t = SECTION_THEMES[template]

  return (
    <section
      className={cn(
        'relative overflow-hidden py-28 transition-colors [transition-duration:600ms] lg:py-40',
        t.sectionAlt,
        template !== 'minimal' && 'grain',
      )}
      aria-label="Le programme"
    >
      {t.photoBg && (
        <>
          <img
            src="/gallery-2.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-25"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-anthracite-950/75" />
        </>
      )}
      <div className="relative mx-auto max-w-[1440px] px-6 lg:px-12">
        <div className="max-w-2xl">
          <p className={cn('text-[11px] font-semibold uppercase tracking-[0.18em]', t.kicker)}>
            Le programme
          </p>
          <h2
            className={cn(
              'font-display mt-4 text-[clamp(2.4rem,5vw,4.5rem)] font-light leading-[1.05] tracking-[-0.015em]',
              t.heading,
            )}
          >
            {t.condensed ? 'Le 20 juin 2026.' : <>Le <em className="italic text-terracotta-300">20 juin</em> 2026.</>}
          </h2>
          <p className={cn('mt-5 text-[15px] leading-[1.65]', t.body)}>
            {WEDDING_DATE_LABEL} — tout se passe au Domaine de Varenne, du premier
            « oui » au dernier slow.
          </p>
        </div>

        <ul className="mt-16 flex flex-col">
          {SCHEDULE.map((slot, i) => (
            <motion.li
              key={slot.label}
              initial={{ x: -20, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true, margin: '-15%' }}
              transition={{ duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                'grid grid-cols-[auto_1fr] items-baseline gap-x-6 border-t py-7 sm:grid-cols-[140px_auto_1fr] sm:gap-x-10',
                t.border,
              )}
            >
              <span
                className={cn(
                  'font-display text-[1.6rem] font-light sm:text-[2rem]',
                  template === 'minimal' ? 'text-terracotta-500' : 'text-terracotta-300',
                )}
              >
                <CountUpTime minutes={slot.minutes} delay={i * 0.12} />
              </span>
              <span className={cn('flex items-center gap-3 self-center', t.heading)}>
                <slot.icon size={18} strokeWidth={1.5} className={template === 'minimal' ? 'text-terracotta-500' : 'text-terracotta-300'} aria-hidden />
                <span className={cn('text-[15px] font-semibold', t.condensed && 'uppercase tracking-[0.08em]')}>
                  {slot.label}
                </span>
              </span>
              <span className={cn('col-span-2 mt-1 text-[14px] leading-[1.6] sm:col-span-1 sm:mt-0 sm:self-center', t.muted)}>
                {slot.detail}
              </span>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  )
}
