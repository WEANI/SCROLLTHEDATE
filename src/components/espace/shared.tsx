import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Petits composants partagés de l'espace client
// (helpers de formatage & libellés : voir ./utils.ts)
// ---------------------------------------------------------------------------

export function SectionCard({
  children,
  className,
  id,
}: {
  children: ReactNode
  className?: string
  id?: string
}) {
  return (
    <section
      id={id}
      className={cn(
        'rounded-2xl bg-white p-6 shadow-[0_8px_32px_rgba(27,27,30,0.08)] sm:p-8',
        className,
      )}
    >
      {children}
    </section>
  )
}

export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        'text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-500',
        className,
      )}
    >
      {children}
    </p>
  )
}

const BADGE_TONES = {
  success: 'bg-[#6FA287]/15 text-[#4d7a62]',
  pending: 'bg-[#C98850]/15 text-[#9a6534]',
  error: 'bg-[#C0524A]/12 text-[#C0524A]',
  info: 'bg-[#7B8FA6]/15 text-[#5b7186]',
  terracotta: 'bg-terracotta-500/12 text-terracotta-500',
  neutral: 'bg-neutral-200/70 text-neutral-500',
} as const

export function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: keyof typeof BADGE_TONES
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium',
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-neutral-200 bg-white/60 px-8 py-14 text-center">
      <span className="font-display text-4xl font-light italic text-terracotta-500">F.</span>
      <p className="font-display text-xl font-medium text-ink">{title}</p>
      {description ? <p className="max-w-md text-sm text-neutral-500">{description}</p> : null}
      {action}
    </div>
  )
}

/** Anneau de progression SVG (terracotta). */
export function ProgressRing({
  pct,
  size = 64,
  stroke = 6,
  className,
}: {
  pct: number
  size?: number
  stroke?: number
  className?: string
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, pct))
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E8E5E1" strokeWidth={stroke} />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#C96F5A"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c - (clamped / 100) * c }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  )
}

/** Skeleton de chargement de page espace. */
export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="h-9 w-72 animate-pulse rounded-lg bg-neutral-200" />
      <div className="h-4 w-96 max-w-full animate-pulse rounded bg-neutral-200" />
      <div className="h-48 animate-pulse rounded-2xl bg-white shadow-[0_8px_32px_rgba(27,27,30,0.06)]" />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-40 animate-pulse rounded-2xl bg-white shadow-[0_8px_32px_rgba(27,27,30,0.06)]" />
        <div className="h-40 animate-pulse rounded-2xl bg-white shadow-[0_8px_32px_rgba(27,27,30,0.06)]" />
      </div>
    </div>
  )
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      title="Une erreur est survenue"
      description="Impossible de charger vos données pour le moment. Réessayez dans un instant."
      action={
        onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 rounded-full bg-terracotta-500 px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400 active:scale-[0.97]"
          >
            Réessayer
          </button>
        ) : undefined
      }
    />
  )
}
