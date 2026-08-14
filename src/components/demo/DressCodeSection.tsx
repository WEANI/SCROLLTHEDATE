import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { DemoTemplate } from './templates'
import { SECTION_THEMES } from './templates'

interface PaletteColor {
  name: string
  hex: string
  examples: string
  /** Pastille claire → ring/texte adaptés */
  light?: boolean
}

const PALETTE: PaletteColor[] = [
  {
    name: 'Anthracite',
    hex: '#26262A',
    examples: 'Costume charbon, robe longue graphite, chemise noire ouverte.',
  },
  {
    name: 'Terracotta',
    hex: '#C96F5A',
    examples: 'Robe midi terracotta, veste en lin brique, accessoires cuivrés.',
  },
  {
    name: 'Terracotta clair',
    hex: '#E8B4A4',
    examples: 'Ensemble poudré, cravate fine, pochette ou boutonnière douce.',
  },
  {
    name: 'Écru',
    hex: '#F4F2F0',
    examples: 'Costume écru, combinaison ivoire cassé, lin froissé chic.',
    light: true,
  },
  {
    name: 'Sauge',
    hex: '#6FA287',
    examples: 'Robe fluide sauge, chemise olive pâle, chapeau de paille.',
  },
]

/** Section 6 — Dress code (palette interactive). */
export default function DressCodeSection({ template }: { template: DemoTemplate }) {
  const t = SECTION_THEMES[template]
  const [selected, setSelected] = useState<PaletteColor | null>(null)

  return (
    <section
      className={cn(
        'relative overflow-hidden py-28 transition-colors [transition-duration:600ms] lg:py-40',
        template === 'minimal' ? 'bg-white' : t.sectionAlt,
      )}
      aria-label="Dress code"
    >
      <div className="relative mx-auto max-w-[1440px] px-6 text-center lg:px-12">
        <p className={cn('text-[11px] font-semibold uppercase tracking-[0.18em]', t.kicker)}>
          Dress code
        </p>
        <h2
          className={cn(
            'font-display mt-4 text-[clamp(2.4rem,5vw,4.5rem)] font-light leading-[1.05] tracking-[-0.015em]',
            t.heading,
          )}
        >
          {t.condensed ? 'Dress code.' : <><em className="italic text-terracotta-300">Dress</em> code.</>}
        </h2>
        <p className={cn('mx-auto mt-5 max-w-xl text-[15px] leading-[1.65]', t.body)}>
          Chic décontracté — et si vous osiez la terracotta ?
        </p>

        {/* Pastilles */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-20%' }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
          className="mt-12 flex flex-wrap items-start justify-center gap-5 sm:gap-7"
        >
          {PALETTE.map((color) => {
            const isSelected = selected?.name === color.name
            return (
              <div key={color.name} className="relative flex flex-col items-center">
                <motion.button
                  type="button"
                  variants={{
                    hidden: { scale: 0, opacity: 0 },
                    show: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 260, damping: 18 } },
                  }}
                  onClick={() => setSelected(isSelected ? null : color)}
                  whileTap={{ scale: 0.92 }}
                  animate={{ scale: isSelected ? 1.25 : 1 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                  aria-pressed={isSelected}
                  aria-label={`Couleur ${color.name}`}
                  className={cn(
                    'relative h-14 w-14 rounded-full border transition-shadow sm:h-16 sm:w-16',
                    color.light ? 'border-neutral-500/40' : 'border-white/10',
                  )}
                  style={{ backgroundColor: color.hex }}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="dresscode-ring"
                      className="absolute -inset-2 rounded-full border-2 border-terracotta-500"
                      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                    />
                  )}
                </motion.button>

                {/* Tooltip card */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ y: 16, opacity: 0, scale: 0.92 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      exit={{ y: 12, opacity: 0, scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                      className="absolute top-full z-10 mt-6 w-60 rounded-xl border border-anthracite-700 bg-anthracite-800 p-4 text-left shadow-[0_16px_48px_rgba(0,0,0,0.45)]"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-terracotta-300">
                        {color.name}
                      </p>
                      <p className="mt-2 text-[13px] leading-[1.55] text-white/80">{color.examples}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </motion.div>

        <p className={cn('mt-16 text-[13px] font-medium tracking-[0.02em]', t.muted)}>
          Évitez le blanc, évidemment.
        </p>
      </div>
    </section>
  )
}
