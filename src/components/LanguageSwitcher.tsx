import { cn } from '@/lib/utils'
import { useLanguage, type Lang } from '@/i18n/LanguageContext'

const OPTIONS: { value: Lang; label: string }[] = [
  { value: 'fr', label: 'FR' },
  { value: 'en', label: 'EN' },
]

/**
 * Sélecteur FR/EN — toggle à 2 états, cf. échange du 22/09/2026. Réutilisé
 * dans Navbar.tsx (public, sur fond sombre) et ClientShell.tsx (espace
 * client, sur fond clair) : `variant` adapte le contraste plutôt que de
 * dupliquer le composant.
 */
export default function LanguageSwitcher({
  variant = 'dark',
  className,
}: {
  /** 'dark' = pour un fond sombre (Navbar) ; 'light' = pour un fond clair (ClientShell). */
  variant?: 'dark' | 'light'
  className?: string
}) {
  const { lang, setLang } = useLanguage()

  return (
    <div
      role="group"
      aria-label="Langue du site"
      className={cn(
        'inline-flex items-center rounded-full border p-0.5 text-[11px] font-semibold uppercase tracking-[0.08em]',
        variant === 'dark' ? 'border-white/20' : 'border-neutral-200',
        className,
      )}
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={lang === opt.value}
          onClick={() => setLang(opt.value)}
          className={cn(
            'rounded-full px-2.5 py-1 transition-colors',
            lang === opt.value
              ? 'bg-terracotta-500 text-white'
              : variant === 'dark'
                ? 'text-white/60 hover:text-white'
                : 'text-neutral-500 hover:text-ink',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
