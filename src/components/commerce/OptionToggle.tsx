import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { CheckboxMark } from './CheckDraw'
import { formatEuros, type CheckoutOption } from './pricing'

/**
 * Card d'option (add-on) cliquable — utilisée sur /offres (sombre) et
 * /commander (clair). Sélection = coche draw + bordure terracotta.
 */
export default function OptionToggle({
  option,
  checked,
  onToggle,
  tone,
  description,
}: {
  option: CheckoutOption
  checked: boolean
  onToggle: () => void
  tone: 'dark' | 'light'
  description?: string
}) {
  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      whileTap={{ scale: 0.97 }}
      className={cn(
        'flex w-full items-center gap-4 rounded-2xl border p-5 text-left transition-all duration-300',
        tone === 'dark'
          ? checked
            ? 'border-terracotta-500 bg-anthracite-800'
            : 'border-anthracite-700 bg-anthracite-800/40 hover:border-anthracite-700/80 hover:bg-anthracite-800'
          : checked
            ? 'border-terracotta-500 bg-white shadow-[0_8px_32px_rgba(27,27,30,.08)]'
            : 'border-neutral-200 bg-white hover:border-neutral-500/50',
      )}
    >
      <CheckboxMark checked={checked} tone={tone} />
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block text-[15px] font-semibold',
            tone === 'dark' ? 'text-white' : 'text-ink',
          )}
        >
          {option.label}
        </span>
        {description ? (
          <span className={cn('mt-0.5 block text-[13px]', tone === 'dark' ? 'text-white/55' : 'text-neutral-500')}>
            {description}
          </span>
        ) : null}
      </span>
      <span className={cn('tabular font-display text-lg font-medium', tone === 'dark' ? 'text-terracotta-300' : 'text-terracotta-500')}>
        +{formatEuros(option.priceCents)}
      </span>
    </motion.button>
  )
}
