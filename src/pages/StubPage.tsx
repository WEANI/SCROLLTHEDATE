import { Link } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StubPageProps {
  kicker: string
  title: string
  description?: string
  /** Clair pour les shells /espace, sombre par défaut (public & admin). */
  variant?: 'dark' | 'light'
}

/**
 * Placeholder stylé pour les routes implémentées par les agents de pages.
 */
export default function StubPage({ kicker, title, description, variant = 'dark' }: StubPageProps) {
  const light = variant === 'light'
  return (
    <div
      className={cn(
        'flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center',
        light ? 'bg-neutral-100 text-ink' : 'grain bg-anthracite-950 text-white',
      )}
    >
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-500">
        {kicker}
      </p>
      <h1 className="font-display max-w-3xl text-[clamp(2.4rem,5vw,4.5rem)] font-light leading-tight tracking-[-0.015em]">
        {title}
      </h1>
      <p className={cn('mt-6 max-w-md text-[15px] leading-relaxed', light ? 'text-neutral-500' : 'text-white/60')}>
        {description ?? 'Cette page est en cours de construction. Revenez très vite.'}
      </p>
      <Link
        to="/"
        className={cn(
          'mt-10 inline-flex items-center gap-2 rounded-full border px-6 py-3 text-[13px] font-semibold uppercase tracking-[0.1em] transition-all hover:-translate-y-0.5',
          light
            ? 'border-neutral-200 text-ink hover:border-terracotta-500'
            : 'border-anthracite-700 text-white/80 hover:border-terracotta-500 hover:text-white',
        )}
      >
        <ArrowLeft size={14} />
        Retour à l'accueil
      </Link>
    </div>
  )
}
