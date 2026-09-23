import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion'
import {
  Check,
  HeartHandshake,
  Infinity as InfinityIcon,
  Minus,
  Plus,
  ShieldCheck,
  Stamp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSeo } from '@/hooks/useSeo'
import { useLanguage } from '@/i18n/LanguageContext'
import { FadeUp, WordReveal } from '@/components/commerce/Reveal'
import { EASE_EDITORIAL } from '@/components/commerce/motion'
import OptionToggle from '@/components/commerce/OptionToggle'
import {
  formatEuros,
  getProduct,
  productSlug,
  usePricing,
  type ProductId,
} from '@/components/commerce/pricing'

/* -------------------------------------------------------------------------- */
/* Helpers locaux                                                             */
/* -------------------------------------------------------------------------- */

/** Parallaxe interne ±20 px au scroll pour les visuels produits. */
function Parallax({
  children,
  range = 20,
  className,
}: {
  children: React.ReactNode
  range?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [range, -range])
  return (
    <div ref={ref} className={className}>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  )
}

/** Vignette dans un cadre navigateur CSS. */
function BrowserFrame({ src, alt, url }: { src: string; alt: string; url: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-anthracite-700 bg-anthracite-950 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
      <div className="flex items-center gap-1.5 border-b border-anthracite-700/70 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-anthracite-700" />
        <span className="h-2.5 w-2.5 rounded-full bg-anthracite-700" />
        <span className="h-2.5 w-2.5 rounded-full bg-terracotta-500/70" />
        <span className="ml-3 truncate rounded-full bg-anthracite-800 px-3 py-1 text-[11px] text-white/50">
          {url}
        </span>
      </div>
      <img src={src} alt={alt} className="aspect-[4/5] w-full object-cover" loading="lazy" />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Section 2 — Card formule                                                   */
/* -------------------------------------------------------------------------- */

interface FormulaCardProps {
  kicker: string
  name: string
  priceCents: number
  tagline: string
  features: string[]
  ctaLabel: string
  ctaHref: string
  visual: React.ReactNode
  reversed?: boolean
  badge?: string
}

function FormulaCard({
  kicker,
  name,
  priceCents,
  tagline,
  features,
  ctaLabel,
  ctaHref,
  visual,
  reversed = false,
  badge,
}: FormulaCardProps) {
  return (
    <motion.article
      variants={{
        hidden: { y: 60, opacity: 0 },
        show: { y: 0, opacity: 1, transition: { duration: 0.9, ease: EASE_EDITORIAL } },
      }}
      className="relative grid items-center gap-10 rounded-2xl border border-anthracite-700/60 bg-anthracite-800/40 p-8 lg:grid-cols-2 lg:gap-14 lg:p-14"
    >
      {badge ? (
        <span className="absolute -top-3.5 left-8 rounded-full bg-terracotta-500 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white lg:left-14">
          {badge}
        </span>
      ) : null}

      <div className={cn(reversed && 'lg:order-2')}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-300">
          {kicker}
        </p>
        <h3 className="font-display mt-4 text-[clamp(1.8rem,3vw,2.6rem)] font-medium leading-[1.1] tracking-[-0.01em] text-white">
          {name}
        </h3>
        <p className="font-display tabular mt-3 text-[2.4rem] font-light text-terracotta-300">
          {formatEuros(priceCents)}
        </p>
        <p className="font-display mt-2 text-xl font-normal italic text-white/85">{tagline}</p>
        <ul className="mt-8 flex flex-col gap-3.5">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-[15px] leading-[1.55] text-white/75">
              <Check size={18} className="mt-0.5 shrink-0 text-terracotta-500" aria-hidden />
              {feature}
            </li>
          ))}
        </ul>
        <Link
          to={ctaHref}
          className="mt-10 inline-flex items-center rounded-full bg-terracotta-500 px-8 py-3.5 text-[13px] font-semibold uppercase tracking-[0.1em] text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400 active:scale-[0.97]"
        >
          {ctaLabel}
        </Link>
      </div>

      <Parallax className={cn(reversed && 'lg:order-1')}>{visual}</Parallax>
    </motion.article>
  )
}

/* -------------------------------------------------------------------------- */
/* Section 3 — Comparatif                                                     */
/* -------------------------------------------------------------------------- */

type Cell = { kind: 'check' } | { kind: 'dash' } | { kind: 'text'; text: string }
const ck: Cell = { kind: 'check' }
const da: Cell = { kind: 'dash' }
const tx = (text: string): Cell => ({ kind: 'text', text })

function CompareCell({ cell, highlight }: { cell: Cell; highlight?: boolean }) {
  if (cell.kind === 'check')
    return <Check size={20} className="mx-auto text-terracotta-500" aria-label="Inclus" />
  if (cell.kind === 'dash')
    return <Minus size={18} className="mx-auto text-neutral-500" aria-label="Non inclus" />
  return (
    <span className={cn('tabular text-sm font-medium', highlight ? 'text-terracotta-300' : 'text-white/75')}>
      {cell.text}
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function Offres() {
  const { t } = useLanguage()

  useSeo({
    title: t('offres.seo.title'),
    description: t('offres.seo.description'),
    path: '/offres',
  })

  const OPTION_DESCRIPTIONS: Record<string, string> = {
    revisions: t('offres.options.descRevisions'),
    'sous-titres': t('offres.options.descSousTitres'),
    'version-courte': t('offres.options.descVersionCourte'),
    'page-infos': t('offres.options.descPageInfos'),
  }

  const GARANTIES = [
    { key: 'human', icon: HeartHandshake, title: t('offres.garanties.title1'), text: t('offres.garanties.text1') },
    { key: 'watermark', icon: Stamp, title: t('offres.garanties.title2'), text: t('offres.garanties.text2') },
    { key: 'link', icon: InfinityIcon, title: t('offres.garanties.title3'), text: t('offres.garanties.text3') },
    { key: 'payment', icon: ShieldCheck, title: t('offres.garanties.title4'), text: t('offres.garanties.text4') },
  ]

  const { products, options } = usePricing()
  const fairePart = getProduct(products, 'FAIRE_PART')
  const saveTheDate = getProduct(products, 'SAVE_THE_DATE')
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])

  const toggleOption = (id: string) =>
    setSelectedOptions((prev) => (prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id]))

  const checkoutHref = (productId: ProductId) =>
    `/commander?produit=${productSlug(productId)}${
      selectedOptions.length ? `&options=${selectedOptions.join(',')}` : ''
    }`

  const compareRows: { key: string; label: string; std: Cell; fp: Cell }[] = [
    { key: 'video', label: t('offres.compare.row1'), std: ck, fp: ck },
    { key: 'duration', label: t('offres.compare.row2'), std: tx('30 s'), fp: tx('60 s') },
    { key: 'page', label: t('offres.compare.row3'), std: tx(t('offres.compare.row3Std')), fp: tx(t('offres.compare.row3Fp')) },
    { key: 'rsvp', label: t('offres.compare.row4'), std: da, fp: ck },
    { key: 'scenarios', label: t('offres.compare.row5'), std: da, fp: ck },
    { key: 'revisions', label: t('offres.compare.row6'), std: tx(t('offres.compare.row6Value')), fp: tx(t('offres.compare.row6Value')) },
    { key: 'link', label: t('offres.compare.row7'), std: ck, fp: ck },
    { key: 'delay', label: t('offres.compare.row8'), std: tx('~72 h'), fp: tx('~72 h') },
    { key: 'price', label: t('offres.compare.row9'), std: tx(formatEuros(saveTheDate.priceCents)), fp: tx(formatEuros(fairePart.priceCents)) },
  ]

  return (
    <div className="bg-anthracite-950">
      {/* ------------------------------------------------------------ */}
      {/* Section 1 — Header                                            */}
      {/* ------------------------------------------------------------ */}
      <section className="grain relative px-6 pb-24 pt-16 lg:px-12 lg:pb-32 lg:pt-20">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 bg-[radial-gradient(50%_50%_at_50%_50%,rgba(201,111,90,0.10),transparent_70%)]"
        />
        <div className="relative mx-auto max-w-[1440px]">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-300"
          >
            {t('offres.hero.kicker')}
          </motion.p>
          <h1 className="font-display mt-6 max-w-4xl text-[clamp(3rem,7vw,6rem)] font-light leading-[1.02] tracking-[-0.02em] text-white">
            <WordReveal
              segments={[{ text: t('offres.hero.titleLead') }, { text: t('offres.hero.titleAccent'), accent: true }]}
            />
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4, ease: EASE_EDITORIAL }}
            className="mt-8 max-w-xl text-[16px] leading-[1.65] text-white/60"
          >
            {t('offres.hero.intro')}
          </motion.p>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Section 2 — Les deux formules                                 */}
      {/* ------------------------------------------------------------ */}
      <section className="bg-anthracite-900 px-6 py-24 lg:px-12 lg:py-36">
        <motion.div
          className="mx-auto flex max-w-[1440px] flex-col gap-10 lg:gap-14"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-10%' }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.2 } } }}
        >
          {/* Card A — Save the Date */}
          <FormulaCard
            kicker={t('offres.saveTheDate.kicker')}
            name={saveTheDate.name}
            priceCents={saveTheDate.priceCents}
            tagline={t('offres.saveTheDate.tagline')}
            features={[
              t('offres.saveTheDate.feature1'),
              t('offres.saveTheDate.feature2'),
              t('offres.saveTheDate.feature3'),
              t('offres.saveTheDate.feature4'),
              t('offres.saveTheDate.feature5'),
            ]}
            ctaLabel={t('offres.saveTheDate.ctaLabel')}
            // Vers la page produit dédiée plutôt que directement
            // /commander — cf. échange du 13/09/2026 : cette carte de
            // comparaison ne suffit pas à elle seule pour commander (pas
            // de choix de formule/vidéo démo), on renvoie donc vers
            // SaveTheDateDigital.tsx, qui a son propre bouton de commande.
            ctaHref="/save-the-date-digital"
            visual={
              <div className="mx-auto max-w-sm transition-transform duration-500 hover:scale-[1.03]">
                <BrowserFrame
                  src="/template-minimal.jpg"
                  alt={t('offres.saveTheDate.visualAlt')}
                  url="scrollthedate.fr/s/anna-theo"
                />
              </div>
            }
          />

          {/* Card B — Faire-part */}
          <FormulaCard
            kicker={t('offres.fairePart.kicker')}
            name={fairePart.name}
            priceCents={fairePart.priceCents}
            badge={t('offres.fairePart.badge')}
            tagline={t('offres.fairePart.tagline')}
            reversed
            features={[
              t('offres.fairePart.feature1'),
              t('offres.fairePart.feature2'),
              t('offres.fairePart.feature3'),
              t('offres.fairePart.feature4'),
              t('offres.fairePart.feature5'),
              t('offres.fairePart.feature6'),
              t('offres.fairePart.feature7'),
            ]}
            ctaLabel={t('offres.fairePart.ctaLabel')}
            // Vers la page produit dédiée plutôt que directement
            // /commander — même correction que la carte Save the Date
            // ci-dessus (cf. échange du 13/09/2026).
            ctaHref="/faire-part-digital"
            visual={
              <div className="group relative mx-auto h-[420px] max-w-md sm:h-[480px]">
                <img
                  src="/template-cinema.jpg"
                  alt={t('offres.fairePart.visualAltCinema')}
                  loading="lazy"
                  className="absolute bottom-0 right-0 w-[58%] rotate-[5deg] rounded-lg border border-anthracite-700 object-cover shadow-[0_24px_80px_rgba(0,0,0,0.5)] transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <img
                  src="/template-editorial.jpg"
                  alt={t('offres.fairePart.visualAltEditorial')}
                  loading="lazy"
                  className="absolute left-0 top-0 w-[58%] -rotate-[4deg] rounded-lg border border-anthracite-700 object-cover shadow-[0_24px_80px_rgba(0,0,0,0.5)] transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
            }
          />
        </motion.div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Section 3 — Tableau comparatif                                */}
      {/* ------------------------------------------------------------ */}
      <section className="px-6 py-24 lg:px-12 lg:py-36">
        <div className="mx-auto max-w-5xl">
          <FadeUp>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-300">
              {t('offres.compare.kicker')}
            </p>
            <h2 className="font-display mt-4 text-[clamp(2rem,4vw,3.2rem)] font-light leading-[1.05] tracking-[-0.015em] text-white">
              {t('offres.compare.titleLead')} <em className="italic text-terracotta-300">{t('offres.compare.titleEm')}</em>.
            </h2>
          </FadeUp>

          <FadeUp delay={0.15} className="mt-12">
            <div className="relative">
              {/* Halo terracotta 6 % sur la colonne Faire-part */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/4 rounded-2xl bg-[radial-gradient(70%_60%_at_50%_40%,rgba(201,111,90,0.08),transparent_75%)] sm:block"
              />
              <div role="table" aria-label={t('offres.compare.kicker')} className="relative">
                <div role="row" className="grid grid-cols-[1.4fr_1fr_1fr] items-end gap-2 border-b border-anthracite-700 pb-5 sm:grid-cols-[2fr_1fr_1fr]">
                  <span role="columnheader" className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                    &nbsp;
                  </span>
                  <span role="columnheader" className="text-center text-[12px] font-semibold uppercase tracking-[0.14em] text-white/70">
                    {t('offres.compare.colStd')}
                  </span>
                  <span role="columnheader" className="text-center text-[12px] font-semibold uppercase tracking-[0.14em] text-terracotta-300">
                    {t('offres.compare.colFp')}
                  </span>
                </div>
                <motion.ul
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: '-30%' }}
                  variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
                >
                  {compareRows.map((row, i) => (
                    <motion.li
                      key={row.key}
                      role="row"
                      variants={{
                        hidden: { opacity: 0, x: -12 },
                        show: { opacity: 1, x: 0, transition: { duration: 0.5, ease: EASE_EDITORIAL } },
                      }}
                      className={cn(
                        'grid grid-cols-[1.4fr_1fr_1fr] items-center gap-2 px-4 py-4 sm:grid-cols-[2fr_1fr_1fr]',
                        i % 2 === 0 && 'rounded-lg bg-anthracite-800/60',
                      )}
                    >
                      <span role="rowheader" className="text-sm font-medium text-white/85">
                        {row.label}
                      </span>
                      <span role="cell" className="text-center">
                        <CompareCell cell={row.std} />
                      </span>
                      <span role="cell" className="text-center">
                        <CompareCell cell={row.fp} highlight />
                      </span>
                    </motion.li>
                  ))}
                </motion.ul>
                <p className="mt-6 text-center text-[13px] text-white/50">
                  {t('offres.compare.footer')}
                </p>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Section 4 — Options                                           */}
      {/* ------------------------------------------------------------ */}
      <section className="bg-anthracite-900 px-6 py-24 lg:px-12 lg:py-36">
        <div className="mx-auto max-w-5xl">
          <FadeUp>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-300">
              {t('offres.options.kicker')}
            </p>
            <h2 className="font-display mt-4 text-[clamp(2rem,4vw,3.2rem)] font-light leading-[1.05] tracking-[-0.015em] text-white">
              {t('offres.options.titleLead')} <em className="italic text-terracotta-300">{t('offres.options.titleEm')}</em>.
            </h2>
          </FadeUp>

          <motion.div
            className="mt-12 grid gap-4 md:grid-cols-3"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-20%' }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
          >
            {options.map((option) => (
              <motion.div
                key={option.id}
                variants={{
                  hidden: { y: 40, opacity: 0 },
                  show: { y: 0, opacity: 1, transition: { duration: 0.7, ease: EASE_EDITORIAL } },
                }}
              >
                <OptionToggle
                  option={option}
                  tone="dark"
                  checked={selectedOptions.includes(option.id)}
                  onToggle={() => toggleOption(option.id)}
                  description={OPTION_DESCRIPTIONS[option.id]}
                />
              </motion.div>
            ))}
          </motion.div>
          <FadeUp delay={0.2}>
            <p className="mt-6 text-[13px] text-white/50">
              {t('offres.options.footerPrefix')}
              {selectedOptions.length > 0 && (
                <>
                  {' '}{t('offres.options.footerLinkPrefix')}{' '}
                  <Link to={checkoutHref('FAIRE_PART')} className="text-terracotta-300 underline-offset-4 hover:underline">
                    {t('offres.options.footerLink')}
                  </Link>
                  .
                </>
              )}
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Section 5 — Garanties                                         */}
      {/* ------------------------------------------------------------ */}
      <section className="grain relative bg-anthracite-800 px-6 py-24 lg:px-12 lg:py-32">
        <div className="relative mx-auto max-w-[1440px]">
          <motion.ul
            className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-30%' }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } } }}
          >
            {GARANTIES.map((garantie) => (
              <motion.li
                key={garantie.key}
                variants={{
                  hidden: { opacity: 0 },
                  show: { opacity: 1, transition: { duration: 0.5 } },
                }}
              >
                <motion.span
                  variants={{
                    hidden: { scale: 0.6, opacity: 0 },
                    show: {
                      scale: 1,
                      opacity: 1,
                      transition: { type: 'spring', stiffness: 260, damping: 18 },
                    },
                  }}
                  className="inline-flex text-terracotta-300"
                >
                  <garantie.icon size={32} strokeWidth={1.6} aria-hidden />
                </motion.span>
                <h3 className="font-display mt-5 text-xl font-medium text-white">{garantie.title}</h3>
                <p className="mt-2 text-[14px] leading-[1.6] text-white/60">{garantie.text}</p>
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Section 6 — Mini FAQ + CTA final                              */}
      {/* ------------------------------------------------------------ */}
      <MiniFaq checkoutHref={checkoutHref('FAIRE_PART')} />
    </div>
  )
}

function MiniFaq({ checkoutHref }: { checkoutHref: string }) {
  const { t } = useLanguage()
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const FAQ_ITEMS = [
    { key: 'q1', q: t('offres.miniFaq.q1'), a: t('offres.miniFaq.a1') },
    { key: 'q2', q: t('offres.miniFaq.q2'), a: t('offres.miniFaq.a2') },
    { key: 'q3', q: t('offres.miniFaq.q3'), a: t('offres.miniFaq.a3') },
  ]

  return (
    <section className="px-6 py-24 lg:px-12 lg:py-36">
      <div className="mx-auto max-w-5xl">
        <FadeUp>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-300">
            {t('offres.miniFaq.kicker')}
          </p>
          <h2 className="font-display mt-4 text-[clamp(2rem,4vw,3.2rem)] font-light leading-[1.05] tracking-[-0.015em] text-white">
            {t('offres.miniFaq.titleLead')} <em className="italic text-terracotta-300">{t('offres.miniFaq.titleEm')}</em>.
          </h2>
        </FadeUp>

        <motion.ul
          className="mt-10 flex flex-col"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-15%' }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
        >
          {FAQ_ITEMS.map((item, i) => {
            const open = openIndex === i
            return (
              <motion.li
                key={item.key}
                variants={{
                  hidden: { y: 24, opacity: 0 },
                  show: { y: 0, opacity: 1, transition: { duration: 0.6, ease: EASE_EDITORIAL } },
                }}
                className="border-b border-anthracite-700 first:border-t"
              >
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenIndex(open ? null : i)}
                  className="flex w-full items-center justify-between gap-6 py-6 text-left"
                >
                  <span
                    className={cn(
                      'font-display text-lg font-normal transition-colors lg:text-xl',
                      open ? 'text-terracotta-300' : 'text-white',
                    )}
                  >
                    {item.q}
                  </span>
                  <motion.span
                    animate={{ rotate: open ? 45 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-anthracite-700 text-terracotta-500"
                  >
                    <Plus size={16} />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-2xl pb-7 text-[15px] leading-[1.65] text-white/65">{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            )
          })}
        </motion.ul>

        {/* Bandeau final */}
        <FadeUp delay={0.1} className="relative mt-24">
          <div className="grain relative overflow-hidden rounded-2xl border border-anthracite-700/60 bg-anthracite-900 px-8 py-16 text-center lg:py-24">
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 h-[380px] w-[680px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(50%_50%_at_50%_50%,rgba(201,111,90,0.12),transparent_70%)]"
            />
            <h2 className="font-display relative text-[clamp(2.2rem,5vw,4rem)] font-light leading-[1.05] tracking-[-0.015em] text-white">
              <WordReveal segments={[{ text: t('offres.finalBanner.titleLead') }, { text: t('offres.finalBanner.titleAccent'), accent: true }]} />
            </h2>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.35, ease: EASE_EDITORIAL }}
              className="relative mt-10"
            >
              <Link
                to={checkoutHref}
                className="inline-flex items-center rounded-full bg-terracotta-500 px-10 py-4 text-[13px] font-semibold uppercase tracking-[0.1em] text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400 active:scale-[0.97]"
              >
                {t('offres.finalBanner.cta')}
              </Link>
            </motion.div>
          </div>
        </FadeUp>
      </div>
    </section>
  )
}
