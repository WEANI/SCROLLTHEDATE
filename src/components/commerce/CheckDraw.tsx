import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

/** Coche animée (stroke draw 300 ms) pour les cases à cocher / radios du commerce. */
export default function CheckDraw({
  checked,
  className,
}: {
  checked: boolean
  className?: string
}) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <motion.path
        d="M4 10.5 8.5 15 16 5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={false}
        animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
    </svg>
  )
}

/** Case à cocher stylisée : carré bord neutral → fond terracotta + coche draw. */
export function CheckboxMark({
  checked,
  tone,
}: {
  checked: boolean
  tone: 'dark' | 'light'
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors duration-300',
        checked
          ? 'border-terracotta-500 bg-terracotta-500 text-white'
          : tone === 'dark'
            ? 'border-anthracite-700 bg-transparent text-transparent'
            : 'border-neutral-200 bg-white text-transparent',
      )}
    >
      <CheckDraw checked={checked} className="h-4 w-4" />
    </span>
  )
}
