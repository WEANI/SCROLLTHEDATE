import { CalendarHeart, LayoutDashboard, QrCode, Rss } from 'lucide-react'
import { useLanguage } from '@/i18n/LanguageContext'

/**
 * « Compris dans chaque création » — 4 icônes avec une ligne chacune.
 * Sortie de « Comment ça marche » le 26/10/2026 pour devenir une courte section
 * à part, juste après « Surprenez vos invités » (elle sépare aussi les deux
 * sections épinglées qui se suivent : le téléphone et le cercle des modèles).
 */
export default function IncludedStrip() {
  const { t } = useLanguage()
  // « Compris dans chaque création », en raccourci : une icône et une ligne chacun.
  const INCLUDED = [
    { key: 'page', icon: CalendarHeart, title: t('home.howItWorks.included1Title'), text: t('home.howItWorks.included1Text') },
    { key: 'rsvp', icon: Rss, title: t('home.howItWorks.included2Title'), text: t('home.howItWorks.included2Text') },
    { key: 'dashboard', icon: LayoutDashboard, title: t('home.howItWorks.included3Title'), text: t('home.howItWorks.included3Text') },
    { key: 'link', icon: QrCode, title: t('home.howItWorks.included4Title'), text: t('home.howItWorks.included4Text') },
  ]

  return (
    <section aria-labelledby="included-title" className="bg-anthracite-950 px-6 py-24 lg:px-12 lg:py-28">
      <div className="mx-auto max-w-[1100px]">
        <h2 id="included-title" className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-300">
          {t('home.howItWorks.includedTitle')}
        </h2>
        <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {INCLUDED.map((item) => (
            <li key={item.key} className="flex flex-col items-center text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-terracotta-500/40 text-terracotta-500">
                <item.icon size={20} strokeWidth={1.5} aria-hidden />
              </span>
              <p className="font-display mt-4 text-[17px] font-medium leading-snug text-white">{item.title}</p>
              <p className="mt-1.5 max-w-[15rem] text-[13.5px] leading-[1.55] text-white/55">{item.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
