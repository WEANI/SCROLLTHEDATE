import { useState, type SyntheticEvent } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { Check, Clapperboard, Layout, MessageCircle, PenLine, QrCode, Sparkles } from 'lucide-react'
import { useSeo } from '@/hooks/useSeo'
import { FadeUp, WordReveal } from '@/components/commerce/Reveal'
import { EASE_EDITORIAL } from '@/components/commerce/motion'
import { formatEuros, getProduct, productSlug, usePricing } from '@/components/commerce/pricing'

/**
 * Page produit dédiée au Save the Date digital — cf. doc de FairePartDigital.tsx
 * pour le principe général. Deux formules décrites (cf. échange du
 * 10/09/2026) : "Sur mesure" (149 €, orientée questionnaire, seule
 * commandable aujourd'hui) et "Sur un modèle" (99 €, catalogue de templates)
 * — cette 2e formule n'a PAS de bouton de commande : les modèles restent à
 * fournir avant de pouvoir construire le sélecteur, présentée en "Bientôt
 * disponible" plutôt que promettre un chemin de commande qui n'existe pas
 * encore.
 *
 * Hero remanié le 12/09/2026 : les 2 offres remontent tout en haut de page,
 * côte à côte, chacune avec un aperçu vidéo de 5 s (au lieu d'une simple
 * vignette statique + un unique CTA générique) — la vidéo est l'argument de
 * vente principal du produit, autant la montrer immédiatement. La section
 * "2 façons de l'annoncer" plus bas reste inchangée (choix explicite : cf.
 * échange du 12/09/2026) pour le détail complet de chaque formule ; ce
 * nouveau bloc en haut n'en est qu'un avant-goût visuel.
 */

const CARD_PREVIEW_SECONDS = 5

/**
 * Carte d'aperçu vidéo (5 s en boucle) pour une des 2 offres, en haut de
 * page. Même technique que `TemplateCard` (SaveTheDateTemplates.tsx) :
 * `timeupdate` plutôt que `loop` natif, pour ne jamais montrer la fin du
 * montage — seulement un avant-goût — et retomber sur le poster si la vidéo
 * échoue à charger. Composant local : un seul appelant ici, pas encore de
 * raison de le partager avec `TemplateCard`.
 */
function OfferPreviewCard({
  eyebrow,
  price,
  tagline,
  videoSrc,
  posterSrc,
  ctaLabel,
  ctaHref,
  featured,
}: {
  eyebrow: string
  price: string
  tagline: string
  videoSrc: string
  posterSrc: string
  ctaLabel: string
  ctaHref: string
  featured: boolean
}) {
  const [failed, setFailed] = useState(false)

  function handleTimeUpdate(e: SyntheticEvent<HTMLVideoElement>) {
    if (e.currentTarget.currentTime >= CARD_PREVIEW_SECONDS) {
      e.currentTarget.currentTime = 0
      void e.currentTarget.play()
    }
  }

  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-anthracite-900/60 ${
        featured ? 'border-terracotta-500/40' : 'border-anthracite-700/60'
      }`}
    >
      <div className="relative aspect-[9/16] w-full overflow-hidden bg-anthracite-950">
        {!failed ? (
          <video
            className="h-full w-full object-cover"
            src={videoSrc}
            poster={posterSrc}
            autoPlay
            muted
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onError={() => setFailed(true)}
          />
        ) : (
          <img src={posterSrc} alt="" className="h-full w-full object-cover" loading="lazy" />
        )}
        <span
          className={`absolute inset-x-0 top-0 h-[3px] ${featured ? 'bg-terracotta-500' : 'bg-anthracite-700'}`}
          aria-hidden
        />
      </div>
      <div className="p-6 lg:p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-terracotta-300">{eyebrow}</p>
        <div className="mt-2 flex items-baseline gap-3">
          <span className="font-display tabular text-[1.7rem] font-light text-white">{price}</span>
          <span className="text-[13px] text-white/60">{tagline}</span>
        </div>
        <Link
          to={ctaHref}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-terracotta-500 px-6 py-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400 active:scale-[0.97]"
        >
          {ctaLabel}
        </Link>
      </div>
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
        <div className="relative mx-auto max-w-[820px] text-center">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-300"
          >
            Save the Date digital
          </motion.p>
          <h1 className="font-display mx-auto mt-6 max-w-2xl text-[clamp(2.6rem,6vw,4.6rem)] font-light leading-[1.05] tracking-[-0.02em] text-white">
            <WordReveal segments={[{ text: 'Annoncez la date' }, { text: 'comme au cinéma.', accent: true }]} />
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4, ease: EASE_EDITORIAL }}
            className="mx-auto mt-8 max-w-xl text-[16px] leading-[1.65] text-white/60"
          >
            Une page d'annonce personnalisée, une vidéo courte et élégante — personnalisée ou choisie dans la
            bibliothèque —, des mois avant le jour J. De quoi faire patienter vos invités avec style.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.3, ease: EASE_EDITORIAL }}
          className="relative mx-auto mt-14 grid max-w-[820px] gap-6 sm:grid-cols-2"
        >
          <OfferPreviewCard
            eyebrow="Sur mesure"
            price={formatEuros(saveTheDate.priceCents)}
            tagline="Votre histoire, en 45 secondes."
            videoSrc="/save-the-date-sur-mesure-demo.mp4"
            posterSrc="/save-the-date-sur-mesure-demo-poster.jpg"
            ctaLabel="Commander"
            ctaHref={checkoutHref}
            featured
          />
          <OfferPreviewCard
            eyebrow="Sur un modèle"
            price={formatEuros(9900)}
            tagline="Prêt en quelques minutes."
            videoSrc="/red-door.mp4"
            posterSrc="/red-door-frames/00001.jpg"
            ctaLabel="Voir les modèles"
            ctaHref="/save-the-date-modeles"
            featured={false}
          />
        </motion.div>
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

            {/* Formule template — 99 €, commande directe câblée le
                12/09/2026 (choix du modèle dans la bibliothèque, paiement
                dans /commander?modele=…) — cf. doc de
                contracts/saveTheDateTemplates.ts. Plus de badge "bientôt" :
                le parcours est live, au même titre que "Sur mesure". */}
            <FadeUp delay={0.1} className="relative rounded-2xl border border-anthracite-700/60 bg-anthracite-800/40 p-8 lg:p-10">
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-300">Sur un modèle</p>
              <p className="font-display tabular mt-3 text-[2.2rem] font-light text-terracotta-300">
                {formatEuros(9900)}
              </p>
              <p className="font-display mt-2 text-lg font-normal italic text-white/85">
                Un modèle qui vous plaît, prêt en quelques minutes.
              </p>
              <ul className="mt-7 flex flex-col gap-3.5">
                {[
                  { icon: Layout, text: 'Vous choisissez parmi une sélection de modèles déjà montés' },
                  { icon: PenLine, text: 'Vous renseignez vos prénoms et votre date' },
                  { icon: Sparkles, text: 'Votre page est en ligne dès le paiement confirmé, sans questionnaire' },
                ].map((f) => (
                  <li key={f.text} className="flex items-start gap-3 text-[14px] leading-[1.55] text-white/75">
                    <f.icon size={17} className="mt-0.5 shrink-0 text-terracotta-500" aria-hidden />
                    {f.text}
                  </li>
                ))}
              </ul>
              <Link
                to="/save-the-date-modeles"
                className="mt-9 inline-flex items-center gap-2 rounded-full bg-terracotta-500 px-7 py-3 text-[13px] font-semibold uppercase tracking-[0.1em] text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400 active:scale-[0.97]"
              >
                Voir les modèles
                <span aria-hidden>→</span>
              </Link>
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
