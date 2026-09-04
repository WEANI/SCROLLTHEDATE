import { useEffect } from 'react'
import { Link, useLocation } from 'react-router'
import ScrubHero from '@/components/ScrubHero'
import type { ScrubHeroBeat, ScrubHeroSnapWindow } from '@/components/ScrubHero'
import { useSeo } from '@/hooks/useSeo'
import SocialProof from '@/components/home/SocialProof'
import Concept from '@/components/home/Concept'
import Included from '@/components/home/Included'
import HowItWorks from '@/components/home/HowItWorks'
import Advantages from '@/components/home/Advantages'
import RsvpTeaser from '@/components/home/RsvpTeaser'
import Products from '@/components/home/Products'
import Gallery from '@/components/home/Gallery'
import Faq from '@/components/home/Faq'
import FinalCta from '@/components/home/FinalCta'

/**
 * Calé sur le contenu réel de home-hero-scrub.mp4 (9,13 s, 3 plans séparés
 * par des whip-pans) plutôt que sur un découpage à l'aveugle :
 *  - 0 → 0.28 : sortie de cérémonie, confettis (plan large, établit l'histoire)
 *  - transition whip-pan  0.28 → 0.36
 *  - 0.36 → 0.62 : mains alliées sur le bouquet (plan serré, « les images »)
 *  - transition whip-pan  0.62 → 0.68
 *  - 0.68 → 1   : silhouette, échange d'alliance sur fond blanc (plan fixe,
 *    le plus calme du clip — CTA révélé ici, cf. persistentFrom)
 */
const HERO_BEATS: ScrubHeroBeat[] = [
  {
    from: 0,
    to: 0.08,
    kicker: 'Scroll The Date — Faire-parts digitaux cinématiques',
  },
  {
    from: 0.08,
    to: 0.26,
    segments: [{ text: 'Votre histoire.' }],
  },
  {
    from: 0.36,
    to: 0.6,
    segments: [{ text: 'Racontée en' }, { text: 'images.', accent: true }],
  },
  {
    from: 0.68,
    to: 0.9,
    segments: [{ text: "Un faire-part que personne n'oublie." }],
  },
]

// Cf. commentaire ScrubHeroProps.snapWindows — référence stable (module-level,
// comme HERO_BEATS) : un littéral inline dans le JSX serait recréé à chaque
// rendu de Home et réinitialiserait inutilement le ScrollTrigger du héros.
const HERO_SNAP_WINDOWS: ScrubHeroSnapWindow[] = [
  { from: 0.28, to: 0.36 },
  { from: 0.62, to: 0.68 },
]

/** CTA persistant du héros (révélé à 80 % de progression, sur le plan
 * silhouette fixe — le plus calme du clip, cf. commentaire HERO_BEATS). */
function HeroCta() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-5">
      <Link
        to="/offres"
        className="rounded-full bg-terracotta-500 px-8 py-3.5 text-[13px] font-semibold uppercase tracking-[0.1em] text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400 active:scale-[0.97]"
      >
        Créer notre faire-part
      </Link>
      <Link
        to="/demo"
        className="rounded-full border border-white/25 px-8 py-3.5 text-[13px] font-semibold uppercase tracking-[0.1em] text-white/85 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-white/60 hover:text-white"
      >
        Voir la démo
      </Link>
    </div>
  )
}

export default function Home() {
  const location = useLocation()

  useSeo({
    title: 'Scroll The Date — Faire-parts de mariage digitaux cinématiques',
    description:
      'Scroll The Date — faire-parts de mariage digitaux cinématiques. Racontez votre histoire dans une vidéo personnalisée qui ouvre votre faire-part.',
    path: '/',
  })

  // Deep-links d'ancres (/#concept, /#faq…) depuis les autres pages
  useEffect(() => {
    if (!location.hash) return
    const id = location.hash.slice(1)
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    }, 150)
    return () => window.clearTimeout(timer)
  }, [location.hash])

  return (
    <>
      {/* Héros plein écran : sort du padding du Layout (navbar overlay) via -mt-20 */}
      <div className="-mt-20">
        <ScrubHero
          videoSrc="/home-hero-scrub.mp4"
          posterSrc="/home-hero-poster.jpg"
          heading="Votre histoire, racontée en images — le faire-part de mariage digital que vos invités n'oublieront pas"
          beats={HERO_BEATS}
          persistent={<HeroCta />}
          persistentFrom={0.8}
          durationVh={250}
          // Les deux whip-pans (glitch RGB) ne supportent pas le scrub : figés
          // au milieu, ils montrent une image volontairement floue au lieu
          // d'un cut rapide. On comprime leur part de scroll (4 % chacun,
          // contre ~14 % de la durée vidéo naturellement) pour que
          // l'utilisateur les traverse vite plutôt que de s'y arrêter.
          snapWindows={HERO_SNAP_WINDOWS}
        />
      </div>
      <SocialProof />
      <Concept />
      <Included />
      <HowItWorks />
      <Advantages />
      <RsvpTeaser />
      <Products />
      <Gallery />
      <Faq />
      <FinalCta />
    </>
  )
}
