import { motion } from 'framer-motion'
import { CalendarHeart, LayoutDashboard, QrCode, Rss } from 'lucide-react'
import { usePricing, getProduct, formatEuros } from '@/components/commerce/pricing'
import { useLanguage } from '@/i18n/LanguageContext'

/** Compris dans chaque création — 4 cartes calmes, sous « Le concept ». */
export default function Included() {
  const { t } = useLanguage()
  const { products } = usePricing()
  const fairePart = getProduct(products, 'FAIRE_PART')
  const saveTheDate = getProduct(products, 'SAVE_THE_DATE')

  const ITEMS = [
    { key: 'page', icon: CalendarHeart, title: t('home.included.item1Title'), text: t('home.included.item1Text') },
    { key: 'rsvp', icon: Rss, title: t('home.included.item2Title'), text: t('home.included.item2Text') },
    { key: 'dashboard', icon: LayoutDashboard, title: t('home.included.item3Title'), text: t('home.included.item3Text') },
    { key: 'link', icon: QrCode, title: t('home.included.item4Title'), text: t('home.included.item4Text') },
  ]

  return (
    <section className="grain bg-anthracite-900 py-32 lg:py-44">
      <motion.div
        className="mx-auto max-w-[1440px] px-6 lg:px-12"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-15%' }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
      >
        <motion.h2
          variants={{ hidden: { y: 24, opacity: 0 }, show: { y: 0, opacity: 1, transition: { duration: 0.7 } } }}
          className="font-display text-[clamp(2.4rem,5vw,4.5rem)] font-light leading-[1.05] tracking-[-0.015em] text-white"
        >
          {t('home.included.title')}
        </motion.h2>
        <motion.p
          variants={{ hidden: { y: 16, opacity: 0 }, show: { y: 0, opacity: 1, transition: { duration: 0.7 } } }}
          className="mt-4 text-[15px] text-white/55"
        >
          {t('home.included.priceLead')} {formatEuros(fairePart.priceCents)} {t('home.included.priceMid')}{' '}
          {formatEuros(saveTheDate.priceCents)} {t('home.included.priceSuffix')}
        </motion.p>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((item) => (
            <motion.div
              key={item.key}
              variants={{
                hidden: { y: 32, opacity: 0 },
                show: { y: 0, opacity: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
              }}
              className="rounded-lg border border-anthracite-700 bg-anthracite-800 p-6 transition-colors hover:border-terracotta-500/50"
            >
              <item.icon size={22} strokeWidth={1.5} className="text-terracotta-500" />
              <p className="font-display mt-4 text-lg font-medium text-white">{item.title}</p>
              <p className="mt-2 text-[13.5px] leading-[1.6] text-white/55">{item.text}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}
