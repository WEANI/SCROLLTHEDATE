import { useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { ShoppingBag, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/i18n/LanguageContext'
import { useCart } from '@/cart/CartContext'
import { formatEuros, getProduct, lineAmountCents, usePricing } from '@/components/commerce/pricing'
import { getSaveTheDateTemplate } from '@contracts/saveTheDateTemplates'

/**
 * Icône panier — cf. échange du 22/09/2026 ("un vrai panier"). Visible et
 * consultable à tout moment (badge = nombre de lignes), pas seulement au
 * moment de cliquer "Commander" : Navbar.tsx la monte à côté de
 * `LanguageSwitcher`, desktop et menu mobile. Le contenu réel (édition des
 * options, formulaire, paiement) reste sur `/commander` — ce menu n'est
 * qu'un aperçu + lien, même répartition que `NotificationsBell`
 * (ClientShell.tsx) entre aperçu rapide et page dédiée.
 */
export default function CartMenu({
  variant = 'dark',
  className,
}: {
  /** 'dark' = pour un fond sombre (Navbar) ; 'light' = pour un fond clair. */
  variant?: 'dark' | 'light'
  className?: string
}) {
  const { t } = useLanguage()
  const { items } = useCart()
  const { products, options } = usePricing()
  const [open, setOpen] = useState(false)

  const totalCents = items.reduce((sum, line) => sum + lineAmountCents(line, products, options), 0)

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        aria-label={`${t('cart.ariaLabel')}${items.length > 0 ? ` (${items.length})` : ''}`}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'relative flex h-9 w-9 items-center justify-center rounded-full transition-colors',
          variant === 'dark' ? 'text-white/80 hover:text-white' : 'text-neutral-500 hover:text-ink',
        )}
      >
        <ShoppingBag size={19} />
        {items.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-terracotta-500 px-1 text-[10px] font-semibold text-white">
            {items.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <button
              type="button"
              aria-label={t('cart.closeAria')}
              className="fixed inset-0 z-30 cursor-default"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-2xl border border-neutral-200 bg-white text-ink shadow-[0_8px_32px_rgba(27,27,30,0.16)]"
            >
              <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
                <p className="text-[13px] font-semibold text-ink">{t('cart.title')}</p>
                <button
                  type="button"
                  aria-label={t('cart.closeAria')}
                  onClick={() => setOpen(false)}
                  className="text-neutral-500 hover:text-ink"
                >
                  <X size={16} />
                </button>
              </div>

              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-[13px] text-neutral-500">{t('cart.empty')}</p>
              ) : (
                <>
                  <ul className="max-h-72 overflow-y-auto">
                    {items.map((line) => {
                      const template = line.templateSlug ? getSaveTheDateTemplate(line.templateSlug) : undefined
                      const name = template ? `${t('commander.templateNamePrefix')} ${template.name}` : getProduct(products, line.product).name
                      const cents = lineAmountCents(line, products, options)
                      return (
                        <li
                          key={line.product}
                          className="flex items-baseline justify-between gap-3 border-b border-neutral-200/60 px-4 py-3 last:border-0"
                        >
                          <span className="min-w-0 truncate text-[13px] font-medium text-ink">{name}</span>
                          <span className="shrink-0 tabular-nums text-[13px] font-medium text-ink">{formatEuros(cents)}</span>
                        </li>
                      )
                    })}
                  </ul>
                  <div className="flex items-center justify-between gap-3 border-t border-neutral-200 px-4 py-3">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-neutral-500">{t('cart.total')}</span>
                    <span className="tabular-nums text-[15px] font-semibold text-terracotta-500">{formatEuros(totalCents)}</span>
                  </div>
                </>
              )}

              <Link
                to="/commander"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center bg-terracotta-500 px-4 py-3 text-[13px] font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-terracotta-400"
              >
                {t('cart.viewCart')}
              </Link>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
