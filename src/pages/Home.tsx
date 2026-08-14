import { useEffect } from 'react'
import { Link, useLocation } from 'react-router'
import ScrubHero from '@/components/ScrubHero'
import type { ScrubHeroBeat } from '@/components/ScrubHero'
import SocialProof from '@/components/home/SocialProof'
import Concept from '@/components/home/Concept'
import HowItWorks from '@/components/home/HowItWorks'
import Advantages from '@/components/home/Advantages'
import Products from '@/components/home/Products'
import Gallery from '@/components/home/Gallery'
import Faq from '@/components/home/Faq'
import FinalCta from '@/components/home/FinalCta'

const HERO_BEATS: ScrubHeroBeat[] = [
  {
    from: 0,
    to: 0.08,
    kicker: 'Félicity — Faire-parts digitaux cinématiques',
  },
  {
    from: 0.08,
    to: 0.38,
    segments: [{ text: 'Votre histoire.' }],
  },
  {
    from: 0.38,
    to: 0.68,
    segments: [{ text: 'Racontée en' }, { text: 'images.', accent: true }],
  },
  {
    from: 0.68,
    to: 0.9,
    segments: [{ text: "Un faire-part que personne n'oublie." }],
  },
]

/** CTA persistant du héros (révélé à 55 % de progression). */
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
          videoSrc="/hero-film.mp4"
          posterSrc="/hero-poster.jpg"
          beats={HERO_BEATS}
          persistent={<HeroCta />}
          persistentFrom={0.55}
          durationVh={350}
        />
      </div>
      <SocialProof />
      <Concept />
      <HowItWorks />
      <Advantages />
      <Products />
      <Gallery />
      <Faq />
      <FinalCta />
    </>
  )
}
