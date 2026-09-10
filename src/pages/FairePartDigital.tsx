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
import { FadeUp, WordReveal } from '@/components/commerce/Reveal'
import { EASE_EDITORIAL } from '@/components/commerce/motion'
import { formatEuros, getProduct, productSlug, usePricing } from '@/components/commerce/pricing'

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
            Vidéo à venir
            <br />
            une enveloppe qui s'ouvre
          </p>
        </div>
      )}
    </div>
  )
}

const CONTENU = [
  {
    icon: Clapperboard,
    title: 'Une vidéo cinématique en héros',
    text: "60 secondes en scrub-scroll — l'invité fait défiler la page, la vidéo avance avec lui. Montage personnalisé, jamais un template rejoué.",
  },
  {
    icon: BookHeart,
    title: 'Votre histoire',
    text: "Le fil conducteur du montage vient de vos réponses au questionnaire — rencontre, demande, ce qui vous ressemble. Racontée avec vos mots.",
  },
  {
    icon: MapPin,
    title: 'Programme, lieu & hébergements',
    text: 'Horaires de la journée, adresse de la cérémonie avec carte, suggestions de logements pour vos invités venus de loin.',
  },
  {
    icon: Shirt,
    title: 'Dress code',
    text: "L'ambiance vestimentaire souhaitée, avec les teintes de votre choix si vous en avez en tête.",
  },
  {
    icon: UtensilsCrossed,
    title: 'Menu du dîner',
    text: 'Cocktail, entrée, plat, dessert — si vous voulez donner un avant-goût de la soirée.',
  },
  {
    icon: Gift,
    title: 'Liste de mariage',
    text: 'Un lien vers votre cagnotte ou liste en ligne, présenté avec le même soin que le reste de la page.',
  },
  {
    icon: MessageCircleQuestion,
    title: 'Foire aux questions',
    text: "Les questions pratiques que vos invités se posent — enfants, parking, tenue — réunies au même endroit.",
  },
  {
    icon: HomeIcon,
    title: 'RSVP intégré',
    text: 'Vos invités répondent directement depuis la page. Vous suivez les réponses en temps réel depuis votre tableau de bord.',
  },
]

export default function FairePartDigital() {
  useSeo({
    title: 'Faire-part digital 299 € — Vidéo cinématique & page complète · Scroll The Date',
    description:
      "Le faire-part digital Scroll The Date : une vidéo cinématique qui raconte VOTRE histoire, et une page complète avec programme, lieu, dress code et RSVP intégré. 299 €, prix unique.",
    path: '/faire-part-digital',
  })

  const { products } = usePricing()
  const fairePart = getProduct(products, 'FAIRE_PART')
  const checkoutHref = `/commander?produit=${productSlug('FAIRE_PART')}`

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
              Faire-part digital
            </motion.p>
            <h1 className="font-display mt-6 max-w-2xl text-[clamp(2.6rem,6vw,4.6rem)] font-light leading-[1.05] tracking-[-0.02em] text-white">
              <WordReveal segments={[{ text: 'Une invitation qui' }, { text: 'raconte', accent: true }, { text: 'votre histoire.' }]} />
            </h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4, ease: EASE_EDITORIAL }}
              className="mt-8 max-w-lg text-[16px] leading-[1.65] text-white/60"
            >
              Une vidéo cinématique en héros, une page complète pour tout organiser — programme, lieu, RSVP. Prix
              unique, quel que soit le nombre d'invités.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.55, ease: EASE_EDITORIAL }}
              className="mt-9 flex items-center gap-6"
            >
              <span className="font-display tabular text-[2rem] font-light text-terracotta-300">
                {formatEuros(fairePart.priceCents)}
              </span>
              <Link
                to={checkoutHref}
                className="inline-flex items-center rounded-full bg-terracotta-500 px-8 py-3.5 text-[13px] font-semibold uppercase tracking-[0.1em] text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400 active:scale-[0.97]"
              >
                Commander mon faire-part
              </Link>
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-300">Le contenu</p>
            <h2 className="font-display mt-4 max-w-2xl text-[clamp(2rem,4vw,3.2rem)] font-light leading-[1.05] tracking-[-0.015em] text-white">
              Tout ce qu'il faut, <em className="italic text-terracotta-300">rien de plus</em>.
            </h2>
          </FadeUp>

          <motion.ul
            className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-15%' }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
          >
            {CONTENU.map((item) => (
              <motion.li
                key={item.title}
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-300">Sur mesure</p>
            <h2 className="font-display mt-4 text-[clamp(2rem,4vw,3.2rem)] font-light leading-[1.05] tracking-[-0.015em] text-white">
              Chaque faire-part est <em className="italic text-terracotta-300">unique</em>.
            </h2>
            <p className="mt-6 max-w-lg text-[15px] leading-[1.7] text-white/65">
              Pas de montage générique repeint à vos couleurs. Une fois votre questionnaire complété — votre
              rencontre, ce qui vous ressemble, l'ambiance que vous voulez — nous proposons plusieurs scénarios de
              montage. Vous choisissez celui qui vous parle, et c'est celui-là qui devient votre faire-part.
            </p>
          </FadeUp>
          <FadeUp delay={0.15} className="grid gap-4 sm:grid-cols-2">
            {['Rencontre', 'Demande', 'Voyage'].map((label, i) => (
              <div
                key={label}
                className="overflow-hidden rounded-xl border border-anthracite-700 bg-anthracite-900"
                style={i === 2 ? { gridColumn: '1 / -1' } : undefined}
              >
                <img
                  src={`/story-${label === 'Rencontre' ? 'rencontre' : label === 'Demande' ? 'demande' : 'voyage'}.jpg`}
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
                Aucune photo de vous dans la vidéo
              </h3>
              <p className="mt-4 text-[15px] leading-[1.75] text-white/65">
                Le montage vidéo est une composition cinématique — jamais un montage de vos photos personnelles. Si
                vous souhaitez tout de même montrer des photos à vos invités, téléchargez-les dans le questionnaire :
                elles apparaîtront dans le <strong className="text-white/85">corps de votre faire-part</strong>, dans
                votre galerie et votre section "Notre histoire", pas dans la vidéo elle-même.
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
                <WordReveal segments={[{ text: 'Racontez votre' }, { text: 'histoire.', accent: true }]} />
              </h2>
              <p className="relative mx-auto mt-6 max-w-md text-[15px] leading-[1.65] text-white/60">
                Livraison en ~72 h après votre questionnaire complété. Paiement sécurisé, en une fois.
              </p>
              <div className="relative mt-10">
                <Link
                  to={checkoutHref}
                  className="inline-flex items-center gap-2 rounded-full bg-terracotta-500 px-10 py-4 text-[13px] font-semibold uppercase tracking-[0.1em] text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400 active:scale-[0.97]"
                >
                  <Check size={16} aria-hidden />
                  Commander mon faire-part — {formatEuros(fairePart.priceCents)}
                </Link>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>
    </div>
  )
}
