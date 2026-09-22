import { useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import {
  BookHeart,
  Camera,
  Check,
  Clapperboard,
  Gift,
  Home as HomeIcon,
  Mail,
  MapPin,
  MessageCircleQuestion,
  Shirt,
  UtensilsCrossed,
} from 'lucide-react'
import { useSeo } from '@/hooks/useSeo'
import { useLanguage } from '@/i18n/LanguageContext'
import { FadeUp, WordReveal } from '@/components/commerce/Reveal'
import { EASE_EDITORIAL } from '@/components/commerce/motion'
import { formatEuros, getProduct, productSlug, usePricing } from '@/components/commerce/pricing'
import { PRODUCTS } from '@/components/home/productsCatalog'

const HERO_FEATURES = PRODUCTS.find((p) => p.id === 'FAIRE_PART')!.features

/**
 * Page produit dédiée au Faire-part digital — par opposition à /offres, qui
 * compare les deux produits côte à côte, cette page détaille UN seul produit
 * en profondeur (cf. échange du 10/09/2026 : "je souhaite que tu crées des
 * pages produits dédiées"). Réutilise les mêmes briques visuelles que
 * Offres.tsx (FadeUp/WordReveal, palette anthracite/terracotta) pour rester
 * cohérente avec le reste du site plutôt que d'inventer un nouveau langage.
 */

/**
 * Emplacement vidéo "une enveloppe qui s'ouvre" (demandé explicitement) —
 * aucun montage fourni à ce jour : la balise <video> pointe déjà sur le
 * fichier attendu (à déposer dans public/), et retombe automatiquement sur
 * une illustration sobre tant qu'il est absent (`onError`, même principe de
 * repli que HeroScrub.tsx) — aucune modification de code nécessaire le jour
 * où le vrai montage est livré, juste déposer le fichier au bon chemin.
 */
function EnvelopeVideoPlaceholder() {
  const { t } = useLanguage()
  const [failed, setFailed] = useState(false)
  return (
    <div className="relative aspect-[4/5] w-full max-w-sm overflow-hidden rounded-2xl border border-anthracite-700 bg-anthracite-900 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
      {!failed ? (
        <video
          className="h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          onError={() => setFailed(true)}
        >
          {/* À déposer : public/faire-part-enveloppe.mp4 — quelques secondes
              en boucle, une enveloppe qui s'ouvre. */}
          <source src="/faire-part-enveloppe.mp4" type="video/mp4" />
        </video>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-terracotta-500/10">
            <Mail size={28} strokeWidth={1.4} className="text-terracotta-400" aria-hidden />
          </span>
          <p className="text-[13px] leading-relaxed text-white/50">
            {t('fairePartDigital.videoPlaceholder.comingSoon')}
            <br />
            {t('fairePartDigital.videoPlaceholder.description')}
          </p>
        </div>
      )}
    </div>
  )
}

export default function FairePartDigital() {
  const { t } = useLanguage()

  useSeo({
    title: t('fairePartDigital.seo.title'),
    description: t('fairePartDigital.seo.description'),
    path: '/faire-part-digital',
  })

  const { products } = usePricing()
  const fairePart = getProduct(products, 'FAIRE_PART')
  const checkoutHref = `/commander?produit=${productSlug('FAIRE_PART')}`

  // Icônes issues du catalogue partagé (productsCatalog.ts, aussi utilisé
  // par des pages hors-périmètre) mais libellés traduits localement — même
  // repli que Products.tsx : le catalogue reste en français, on superpose
  // la traduction par position plutôt que de toucher un fichier partagé.
  const heroFeatures = HERO_FEATURES.map((f, i) => ({
    icon: f.icon,
    key: `feature${i + 1}`,
    label: t(`fairePartDigital.hero.feature${i + 1}`),
  }))

  const contenu = [
    { key: 'video', icon: Clapperboard, title: t('fairePartDigital.content.item1Title'), text: t('fairePartDigital.content.item1Text') },
    { key: 'story', icon: BookHeart, title: t('fairePartDigital.content.item2Title'), text: t('fairePartDigital.content.item2Text') },
    { key: 'program', icon: MapPin, title: t('fairePartDigital.content.item3Title'), text: t('fairePartDigital.content.item3Text') },
    { key: 'dresscode', icon: Shirt, title: t('fairePartDigital.content.item4Title'), text: t('fairePartDigital.content.item4Text') },
    { key: 'menu', icon: UtensilsCrossed, title: t('fairePartDigital.content.item5Title'), text: t('fairePartDigital.content.item5Text') },
    { key: 'registry', icon: Gift, title: t('fairePartDigital.content.item6Title'), text: t('fairePartDigital.content.item6Text') },
    { key: 'faq', icon: MessageCircleQuestion, title: t('fairePartDigital.content.item7Title'), text: t('fairePartDigital.content.item7Text') },
    { key: 'rsvp', icon: HomeIcon, title: t('fairePartDigital.content.item8Title'), text: t('fairePartDigital.content.item8Text') },
  ]

  const storyPreviews = [
    { key: 'meet', label: t('fairePartDigital.unique.labelMeet'), file: 'rencontre' },
    { key: 'proposal', label: t('fairePartDigital.unique.labelProposal'), file: 'demande' },
    { key: 'trip', label: t('fairePartDigital.unique.labelTrip'), file: 'voyage' },
  ]

  return (
    <div className="bg-anthracite-950">
      {/* ------------------------------------------------------------ */}
      {/* Hero                                                          */}
      {/* ------------------------------------------------------------ */}
      <section className="grain relative px-6 pb-20 pt-16 lg:px-12 lg:pb-28 lg:pt-20">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 bg-[radial-gradient(50%_50%_at_50%_50%,rgba(201,111,90,0.10),transparent_70%)]"
        />
        <div className="relative mx-auto grid max-w-[1440px] items-center gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
          <div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-300"
            >
              {t('fairePartDigital.hero.kicker')}
            </motion.p>
            <h1 className="font-display mt-6 max-w-2xl text-[clamp(2.6rem,6vw,4.6rem)] font-light leading-[1.05] tracking-[-0.02em] text-white">
              <WordReveal
                segments={[
                  { text: t('fairePartDigital.hero.titleLead') },
                  { text: t('fairePartDigital.hero.titleAccent'), accent: true },
                  { text: t('fairePartDigital.hero.titleTail') },
                ]}
              />
            </h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4, ease: EASE_EDITORIAL }}
              className="mt-8 max-w-lg text-[16px] leading-[1.65] text-white/60"
            >
              {t('fairePartDigital.hero.intro')}
            </motion.p>

            <motion.ul
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.48, ease: EASE_EDITORIAL }}
              className="mt-8 flex flex-col gap-3"
            >
              {heroFeatures.map((f) => (
                <li key={f.key} className="flex items-center gap-3 text-[14px] text-white/75">
                  <f.icon size={17} strokeWidth={1.75} className="shrink-0 text-terracotta-500" aria-hidden />
                  {f.label}
                </li>
              ))}
              <li className="flex items-center gap-3 text-[14px] text-white/75">
                <Check size={17} strokeWidth={1.75} className="shrink-0 text-terracotta-500" aria-hidden />
                {t('fairePartDigital.hero.priceUnique')}
              </li>
            </motion.ul>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.55, ease: EASE_EDITORIAL }}
              className="mt-9 flex flex-wrap items-center gap-6"
            >
              <span className="font-display tabular text-[2rem] font-light text-terracotta-300">
                {formatEuros(fairePart.priceCents)}
              </span>
              <div className="flex flex-wrap items-center gap-5">
                <Link
                  to={checkoutHref}
                  className="inline-flex items-center rounded-full bg-terracotta-500 px-8 py-3.5 text-[13px] font-semibold uppercase tracking-[0.1em] text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400 active:scale-[0.97]"
                >
                  {t('fairePartDigital.hero.orderCta')}
                </Link>
                <Link
                  to="/demofairepart"
                  className="group/link relative text-[13px] font-semibold uppercase tracking-[0.1em] text-white/80 transition-colors hover:text-white"
                >
                  {t('fairePartDigital.hero.demoCta')}
                  <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-terracotta-500 transition-transform duration-300 group-hover/link:scale-x-100" />
                </Link>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.3, ease: EASE_EDITORIAL }}
            className="mx-auto lg:mx-0"
          >
            <EnvelopeVideoPlaceholder />
          </motion.div>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Contenu du faire-part                                        */}
      {/* ------------------------------------------------------------ */}
      <section className="bg-anthracite-900 px-6 py-24 lg:px-12 lg:py-32">
        <div className="mx-auto max-w-[1440px]">
          <FadeUp>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-300">{t('fairePartDigital.content.kicker')}</p>
            <h2 className="font-display mt-4 max-w-2xl text-[clamp(2rem,4vw,3.2rem)] font-light leading-[1.05] tracking-[-0.015em] text-white">
              {t('fairePartDigital.content.titleLead')} <em className="italic text-terracotta-300">{t('fairePartDigital.content.titleEm')}</em>.
            </h2>
          </FadeUp>

          <motion.ul
            className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-15%' }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
          >
            {contenu.map((item) => (
              <motion.li
                key={item.key}
                variants={{
                  hidden: { y: 30, opacity: 0 },
                  show: { y: 0, opacity: 1, transition: { duration: 0.6, ease: EASE_EDITORIAL } },
                }}
              >
                <item.icon size={26} strokeWidth={1.4} className="text-terracotta-400" aria-hidden />
                <h3 className="font-display mt-4 text-lg font-medium text-white">{item.title}</h3>
                <p className="mt-2 text-[14px] leading-[1.6] text-white/60">{item.text}</p>
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Unique — pas un template                                     */}
      {/* ------------------------------------------------------------ */}
      <section className="px-6 py-24 lg:px-12 lg:py-36">
        <div className="mx-auto grid max-w-[1440px] items-center gap-14 lg:grid-cols-2 lg:gap-20">
          <FadeUp>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-300">{t('fairePartDigital.unique.kicker')}</p>
            <h2 className="font-display mt-4 text-[clamp(2rem,4vw,3.2rem)] font-light leading-[1.05] tracking-[-0.015em] text-white">
              {t('fairePartDigital.unique.titleLead')} <em className="italic text-terracotta-300">{t('fairePartDigital.unique.titleEm')}</em>.
            </h2>
            <p className="mt-6 max-w-lg text-[15px] leading-[1.7] text-white/65">
              {t('fairePartDigital.unique.body')}
            </p>
          </FadeUp>
          <FadeUp delay={0.15} className="grid gap-4 sm:grid-cols-2">
            {storyPreviews.map((story, i) => (
              <div
                key={story.key}
                className="overflow-hidden rounded-xl border border-anthracite-700 bg-anthracite-900"
                style={i === 2 ? { gridColumn: '1 / -1' } : undefined}
              >
                <img
                  src={`/story-${story.file}.jpg`}
                  alt=""
                  loading="lazy"
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>
            ))}
          </FadeUp>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Clarification — aucune photo du couple dans la vidéo         */}
      {/* ------------------------------------------------------------ */}
      <section className="bg-anthracite-900 px-6 py-24 lg:px-12 lg:py-32">
        <div className="mx-auto max-w-3xl">
          <FadeUp>
            <div className="grain relative overflow-hidden rounded-2xl border border-anthracite-700/60 bg-anthracite-800/40 p-8 lg:p-12">
              <Camera size={28} strokeWidth={1.4} className="text-terracotta-400" aria-hidden />
              <h3 className="font-display mt-5 text-2xl font-medium text-white lg:text-3xl">
                {t('fairePartDigital.photoClarification.title')}
              </h3>
              <p className="mt-4 text-[15px] leading-[1.75] text-white/65">
                {t('fairePartDigital.photoClarification.bodyPrefix')}{' '}
                <strong className="text-white/85">{t('fairePartDigital.photoClarification.bodyBold')}</strong>
                {t('fairePartDigital.photoClarification.bodySuffix')}
              </p>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* CTA final                                                     */}
      {/* ------------------------------------------------------------ */}
      <section className="px-6 py-24 lg:px-12 lg:py-36">
        <div className="mx-auto max-w-5xl">
          <FadeUp className="relative">
            <div className="grain relative overflow-hidden rounded-2xl border border-anthracite-700/60 bg-anthracite-900 px-8 py-16 text-center lg:py-24">
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/2 h-[380px] w-[680px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(50%_50%_at_50%_50%,rgba(201,111,90,0.12),transparent_70%)]"
              />
              <h2 className="font-display relative text-[clamp(2.2rem,5vw,4rem)] font-light leading-[1.05] tracking-[-0.015em] text-white">
                <WordReveal
                  segments={[
                    { text: t('fairePartDigital.finalCta.titleLead') },
                    { text: t('fairePartDigital.finalCta.titleAccent'), accent: true },
                  ]}
                />
              </h2>
              <p className="relative mx-auto mt-6 max-w-md text-[15px] leading-[1.65] text-white/60">
                {t('fairePartDigital.finalCta.intro')}
              </p>
              <div className="relative mt-10">
                <Link
                  to={checkoutHref}
                  className="inline-flex items-center gap-2 rounded-full bg-terracotta-500 px-10 py-4 text-[13px] font-semibold uppercase tracking-[0.1em] text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400 active:scale-[0.97]"
                >
                  <Check size={16} aria-hidden />
                  {t('fairePartDigital.finalCta.orderPrefix')} {formatEuros(fairePart.priceCents)}
                </Link>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>
    </div>
  )
}
