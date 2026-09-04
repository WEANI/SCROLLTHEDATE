import { useEffect } from 'react'
import { Link, useLocation } from 'react-router'
import ScrubHero from '@/components/ScrubHero'
import type { ScrubHeroBeat } from '@/components/ScrubHero'
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
 * Calé sur le contenu réel de home-hero-desktop.mp4 (13,5 s) — 3 plans
 * séparés par des zooms-fondus continus (pas des whip-pans glitchés comme
 * l'ancien clip : pas besoin de `snapWindows` ici, on peut s'arrêter
 * n'importe où dans une transition sans tomber sur une frame moche) :
 *  - 0 → 0.265 : sortie de cérémonie, confettis (plan large, établit l'histoire)
 *  - transition (zoom continu)  0.265 → 0.34
 *  - 0.34 → 0.69 : mains alliées sur le bouquet (plan serré, « les images »)
 *  - transition (zoom continu)  0.69 → 0.75
 *  - 0.75 → 1   : silhouette, échange d'alliance sur fond blanc (plan fixe,
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
    to: 0.24,
    segments: [{ text: 'Votre histoire.' }],
  },
  {
    from: 0.37,
    to: 0.65,
    segments: [{ text: 'Racontée en' }, { text: 'images.', accent: true }],
  },
  {
    from: 0.78,
    to: 0.95,
    segments: [{ text: "Un faire-part que personne n'oublie." }],
  },
]

/**
 * Même découpage sur home-hero-mobile.mp4 (12,13 s) — un montage différent,
 * pas un simple recadrage : ses plans ne tombent pas aux mêmes fractions
 * que la vidéo desktop (~9 % d'écart mesuré sur les 2 transitions) :
 *  - 0 → 0.34 : confettis
 *  - transition  0.34 → 0.45
 *  - 0.45 → 0.79 : bouquet
 *  - transition  0.79 → 0.85
 *  - 0.85 → 1   : silhouette
 */
const HERO_BEATS_MOBILE: ScrubHeroBeat[] = [
  {
    from: 0,
    to: 0.08,
    kicker: 'Scroll The Date — Faire-parts digitaux cinématiques',
  },
  {
    from: 0.08,
    to: 0.3,
    segments: [{ text: 'Votre histoire.' }],
  },
  {
    from: 0.48,
    to: 0.75,
    segments: [{ text: 'Racontée en' }, { text: 'images.', accent: true }],
  },
  {
    from: 0.87,
    to: 0.97,
    segments: [{ text: "Un faire-part que personne n'oublie." }],
  },
]

/** CTA persistant du héros (révélé à 87 % de progression) — dans le plan
 * silhouette pour les deux montages (desktop : 0.75→1 ; mobile, plus
 * court : 0.85→1), le plus calme des deux, cf. commentaires ci-dessus. */
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
        to="/demofairepart"
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
          videoSrc="/home-hero-desktop.mp4"
          mobileSrc="/home-hero-mobile.mp4"
          posterSrc="/home-hero-poster.jpg"
          heading="Votre histoire, racontée en images — le faire-part de mariage digital que vos invités n'oublieront pas"
          beats={HERO_BEATS}
          mobileBeats={HERO_BEATS_MOBILE}
          persistent={<HeroCta />}
          persistentFrom={0.87}
          durationVh={280}
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
