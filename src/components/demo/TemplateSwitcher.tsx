import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DemoTemplate } from './templates'
import { TEMPLATES } from './templates'

/**
 * Switcher de templates flottant (bas-droite, pilule anthracite-800).
 * 3 templates de corps : Éditorial (défaut), Cinéma, Minimal.
 * Le choix est mémorisé en localStorage (géré par la page).
 */
export default function TemplateSwitcher({
  value,
  onChange,
}: {
  value: DemoTemplate
  onChange: (t: DemoTemplate) => void
}) {
  const [open, setOpen] = useState(false)
  const active = TEMPLATES.find((t) => t.id === value) ?? TEMPLATES[0]

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-2 rounded-2xl border border-anthracite-700 bg-anthracite-800/95 p-3 shadow-[0_16px_48px_rgba(0,0,0,0.5)] backdrop-blur-md"
          >
            {TEMPLATES.map((t) => {
              const isActive = t.id === value
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => onChange(t.id)}
                    aria-pressed={isActive}
                    className={cn(
                      'group flex w-44 items-center gap-3 rounded-xl border p-2 text-left transition-all',
                      isActive
                        ? 'border-terracotta-500 bg-anthracite-700'
                        : 'border-transparent hover:border-anthracite-700 hover:bg-anthracite-700/60',
                    )}
                  >
                    <img
                      src={t.thumb}
                      alt=""
                      className="h-12 w-10 rounded-[4px] object-cover"
                      loading="lazy"
                    />
                    <span className="flex-1 text-[12px] font-semibold uppercase tracking-[0.1em] text-white">
                      {t.label}
                    </span>
                    {isActive && <Check size={14} className="text-terracotta-300" aria-hidden />}
                  </button>
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        whileTap={{ scale: 0.97 }}
        aria-expanded={open}
        aria-label="Changer de template de faire-part"
        className="flex items-center gap-2.5 rounded-full border border-anthracite-700 bg-anthracite-800/95 py-2.5 pl-3 pr-5 shadow-[0_12px_36px_rgba(0,0,0,0.45)] backdrop-blur-md transition-colors hover:border-terracotta-500/60"
      >
        <img src={active.thumb} alt="" className="h-8 w-6 rounded-[3px] object-cover" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
          Template · <span className="text-terracotta-300">{active.label}</span>
        </span>
      </motion.button>
    </div>
  )
}
