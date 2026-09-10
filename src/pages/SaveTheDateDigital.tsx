import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { Check, Clapperboard, Layout, MessageCircle, PenLine, QrCode, Sparkles } from 'lucide-react'
import { useSeo } from '@/hooks/useSeo'
import { FadeUp, WordReveal } from '@/components/commerce/Reveal'
import { EASE_EDITORIAL } from '@/components/commerce/motion'
import { formatEuros, getProduct, productSlug, usePricing } from '@/components/commerce/pricing'
import { PRODUCTS } from '@/components/home/productsCatalog'

const HERO_FEATURES = PRODUCTS.find((p) => p.id === 'SAVE_THE_DATE')!.features

/**
 * Page produit dédiée au Save the Date digital — cf. doc de FairePartDigital.tsx
 * pour le principe général. Deux formules décrites (cf. échange du
 * 10/09/2026) : "Sur mesure" (149 €, orientée questionnaire, seule
 * commandable aujourd'hui) et "Sur un modèle" (99 €, catalogue de templates)
 * — cette 2e formule n'a PAS de bouton de commande : les modèles restent à
 * fournir avant de pouvoir construire le sélecteur, présentée en "Bientôt
 * disponible" plutôt que promettre un chemin de commande qui n'existe pas
 * encore.
 */

/** Vignette dans un cadre navigateur CSS — même composant que Offres.tsx (dupliqué : pas encore extrait en composant partagé, un seul autre appelant). */
function BrowserFrame({ src, alt, url }: { src: string; alt: string; url: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-anthracite-700 bg-anthracite-950 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
      <div className="flex items-center gap-1.5 border-b border-anthracite-700/70 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-anthracite-700" />
        <span className="h-2.5 w-2.5 rounded-full bg-anthracite-700" />
        <span className="h-2.5 w-2.5 rounded-full bg-terracotta-500/70" />
        <span className="ml-3 truncate rounded-full bg-anthracite-800 px-3 py-1 text-[11px] text-white/50">{url}</span>
      </div>
      <img src={src} alt={alt} className="aspect-[4/5] w-full object-cover" loading="lazy" />
    </div>
  )
}

export default function SaveTheDateDigital() {
  useSeo({
    title: 'Save the Date digital 149 € — Annoncez la date en vidéo · Scroll The Date',
    description:
      "Le Save the Date digital Scroll The Date : une vidéo courte de 45 s issue de votre histoire, et une page d'annonce avec votre date et votre lieu. 149 €, prix unique.",
    path: '/save-the-date-digital',
  })

  const { products } = usePricing()
  const saveTheDate = getProduct(products, 'SAVE_THE_DATE')
  const checkoutHref = `/commander?produit=${productSlug('SAVE_THE_DATE')}`

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
              Save the Date digital
            </motion.p>
            <h1 className="font-display mt-6 max-w-2xl text-[clamp(2.6rem,6vw,4.6rem)] font-light leading-[1.05] tracking-[-0.02em] text-white">
              <WordReveal segments={[{ text: 'Annoncez la date' }, { text: 'comme au cinéma.', accent: true }]} />
            </h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4, ease: EASE_EDITORIAL }}
              className="mt-8 max-w-lg text-[16px] leading-[1.65] text-white/60"
            >
              Une courte vidéo personnalisée et une page d'annonce élégante, des mois avant le jour J. De quoi faire
              patienter vos invités avec style.
            </motion.p>

            <motion.ul
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.48, ease: EASE_EDITORIAL }}
              className="mt-8 flex flex-col gap-3"
            >
              {HERO_FEATURES.map((f) => (
                <li key={f.label} className="flex items-center gap-3 text-[14px] text-white/75">
                  <f.icon size={17} strokeWidth={1.75} className="shrink-0 text-terracotta-500" aria-hidden />
                  {f.label}
                </li>
              ))}
              <li className="flex items-center gap-3 text-[14px] text-white/75">
                <Check size={17} strokeWidth={1.75} className="shrink-0 text-terracotta-500" aria-hidden />
                Prix unique — quel que soit le nombre d'invités
              </li>
            </motion.ul>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.55, ease: EASE_EDITORIAL }}
              className="mt-9 flex flex-wrap items-center gap-6"
            >
              <span className="font-display tabular text-[2rem] font-light text-terracotta-300">
                {formatEuros(saveTheDate.priceCents)}
              </span>
              <div className="flex flex-wrap items-center gap-5">
                <Link
                  to={checkoutHref}
                  className="inline-flex items-center rounded-full bg-terracotta-500 px-8 py-3.5 text-[13px] font-semibold uppercase tracking-[0.1em] text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400 active:scale-[0.97]"
                >
                  Commander mon Save the Date
                </Link>
                <Link
                  to="/demofairepart"
                  className="group/link relative text-[13px] font-semibold uppercase tracking-[0.1em] text-white/80 transition-colors hover:text-white"
                >
                  Voir la démo
                  <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-terracotta-500 transition-transform duration-300 group-hover/link:scale-x-100" />
                </Link>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.3, ease: EASE_EDITORIAL }}
            className="mx-auto max-w-sm lg:mx-0"
          >
            <BrowserFrame
              src="/template-minimal.jpg"
              alt="Aperçu d'une page Save the Date digital"
              url="scrollthedate.fr/s/anna-theo"
            />
          </motion.div>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* 2 formules                                                    */}
      {/* ------------------------------------------------------------ */}
      <section className="bg-anthracite-900 px-6 py-24 lg:px-12 lg:py-32">
        <div className="mx-auto max-w-[1440px]">
          <FadeUp>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-300">2 façons de l'annoncer</p>
            <h2 className="font-display mt-4 max-w-2xl text-[clamp(2rem,4vw,3.2rem)] font-light leading-[1.05] tracking-[-0.015em] text-white">
              À votre image, ou <em className="italic text-terracotta-300">prêt en un clin d'œil</em>.
            </h2>
          </FadeUp>

          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            {/* Formule sur mesure — 149 €, live */}
            <FadeUp className="relative rounded-2xl border border-terracotta-500/40 bg-anthracite-800/40 p-8 lg:p-10">
              <span className="absolute -top-3.5 left-8 rounded-full bg-terracotta-500 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
                Disponible aujourd'hui
              </span>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-300">Sur mesure</p>
              <p className="font-display tabular mt-3 text-[2.2rem] font-light text-terracotta-300">
                {formatEuros(saveTheDate.priceCents)}
              </p>
              <p className="font-display mt-2 text-lg font-normal italic text-white/85">
                Votre histoire, en 45 secondes.
              </p>
              <ul className="mt-7 flex flex-col gap-3.5">
                {[
                  { icon: PenLine, text: 'Vous répondez à un court questionnaire — le fil conducteur de votre histoire' },
                  { icon: Clapperboard, text: 'Une vidéo personnalisée de 45 s, montée à partir de vos réponses' },
                  { icon: Sparkles, text: "Une page d'annonce avec vos prénoms, la date et le lieu" },
                  { icon: QrCode, text: 'Lien illimité + QR code pour vos faire-part papier' },
                ].map((f) => (
                  <li key={f.text} className="flex items-start gap-3 text-[14px] leading-[1.55] text-white/75">
                    <f.icon size={17} className="mt-0.5 shrink-0 text-terracotta-500" aria-hidden />
                    {f.text}
                  </li>
                ))}
              </ul>
              <Link
                to={checkoutHref}
                className="mt-9 inline-flex items-center rounded-full bg-terracotta-500 px-7 py-3 text-[13px] font-semibold uppercase tracking-[0.1em] text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400 active:scale-[0.97]"
              >
                Commander
              </Link>
            </FadeUp>

            {/* Formule template — 99 €, bientôt */}
            <FadeUp delay={0.1} className="relative rounded-2xl border border-anthracite-700/60 bg-anthracite-800/20 p-8 opacity-80 lg:p-10">
              <span className="absolute -top-3.5 left-8 rounded-full bg-anthracite-700 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
                Bientôt disponible
              </span>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">Sur un modèle</p>
              <p className="font-display tabular mt-3 text-[2.2rem] font-light text-white/70">
                {formatEuros(9900)}
              </p>
              <p className="font-display mt-2 text-lg font-normal italic text-white/60">
                Un modèle qui vous plaît, prêt en quelques minutes.
              </p>
              <ul className="mt-7 flex flex-col gap-3.5">
                {[
                  { icon: Layout, text: 'Vous choisissez parmi une sélection de modèles déjà montés' },
                  { icon: PenLine, text: 'Vous renseignez vos prénoms, la date et une courte phrase' },
                  { icon: Sparkles, text: 'Votre Save the Date est généré immédiatement, sans questionnaire' },
                ].map((f) => (
                  <li key={f.text} className="flex items-start gap-3 text-[14px] leading-[1.55] text-white/50">
                    <f.icon size={17} className="mt-0.5 shrink-0 text-white/40" aria-hidden />
                    {f.text}
                  </li>
                ))}
              </ul>
              <p className="mt-9 text-[12px] text-white/40">
                Les modèles sont en préparation — écrivez-nous si vous voulez être prévenu·e dès leur sortie.
              </p>
            </FadeUp>
          </div>
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
                <WordReveal segments={[{ text: 'Prévenez vos invités,' }, { text: 'en beauté.', accent: true }]} />
              </h2>
              <p className="relative mx-auto mt-6 max-w-md text-[15px] leading-[1.65] text-white/60">
                Livraison en ~72 h après votre questionnaire complété. Paiement sécurisé, en une fois.
              </p>
              <div className="relative mt-10 flex flex-wrap items-center justify-center gap-4">
                <Link
                  to={checkoutHref}
                  className="inline-flex items-center gap-2 rounded-full bg-terracotta-500 px-10 py-4 text-[13px] font-semibold uppercase tracking-[0.1em] text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400 active:scale-[0.97]"
                >
                  <Check size={16} aria-hidden />
                  Commander — {formatEuros(saveTheDate.priceCents)}
                </Link>
                <a
                  href="https://wa.me/33600000000"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-anthracite-700 px-8 py-4 text-[13px] font-semibold uppercase tracking-[0.1em] text-white/80 transition-colors hover:border-terracotta-500 hover:text-terracotta-300"
                >
                  <MessageCircle size={16} className="text-terracotta-500" aria-hidden />
                  Une question ?
                </a>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>
    </div>
  )
}
