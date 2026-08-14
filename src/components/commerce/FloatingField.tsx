import { motion } from 'framer-motion'
import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface FloatingFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  helper?: string
  /** Incrémenté à chaque soumission invalide → rejoue le shake. */
  bump?: number
  /** Label toujours en position haute (ex. input date). */
  alwaysFloat?: boolean
}

/**
 * Champ à label flottant (focus ring terracotta, erreur #C0524A + shake).
 * Surface claire du checkout.
 */
export default function FloatingField({
  label,
  error,
  helper,
  bump = 0,
  alwaysFloat = false,
  className,
  id,
  ...inputProps
}: FloatingFieldProps) {
  const inputId = id ?? inputProps.name ?? label
  return (
    <motion.div
      key={bump}
      animate={error ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
      transition={{ duration: 0.4 }}
      className={className}
    >
      <div className="relative">
        <input
          id={inputId}
          placeholder=" "
          aria-invalid={!!error}
          {...inputProps}
          className={cn(
            'peer w-full rounded-xl border bg-white px-4 pb-2.5 pt-6 text-[15px] text-ink outline-none transition-colors placeholder:text-transparent',
            error
              ? 'border-error focus:border-error focus:ring-2 focus:ring-error/15'
              : 'border-neutral-200 focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-500/20',
          )}
        />
        <label
          htmlFor={inputId}
          className={cn(
            'pointer-events-none absolute left-4 text-neutral-500 transition-all duration-200',
            alwaysFloat
              ? 'top-2 text-[11px] font-medium uppercase tracking-[0.08em]'
              : 'top-1/2 -translate-y-1/2 text-[15px] peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[11px] peer-focus:font-medium peer-focus:uppercase peer-focus:tracking-[0.08em] peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-[0.08em]',
            error ? 'text-error' : 'peer-focus:text-terracotta-500',
          )}
        >
          {label}
        </label>
      </div>
      {error ? (
        <p className="mt-1.5 text-[13px] font-medium text-error">{error}</p>
      ) : helper ? (
        <p className="mt-1.5 text-[13px] text-neutral-500">{helper}</p>
      ) : null}
    </motion.div>
  )
}
