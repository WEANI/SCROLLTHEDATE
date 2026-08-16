import { useEffect } from 'react'
import { Link } from 'react-router'
import PayloadSection from '@/components/faire-part/PayloadSection'
import PhotosSection from '@/components/faire-part/PhotosSection'
import ClosingSection from '@/components/faire-part/ClosingSection'
import HeroScrub from '@/components/hero-scrub/HeroScrub'
import { MINIMAL_THEME } from '@/components/hero-scrub/themes'
import { HERO_CHAPTERS } from '@/components/faire-part/edwigeWilfriedContent'

/**
 * Faire-part « Edwige & Wilfried » — première page livrée depuis le
 * pipeline FELICITI (cf. instructions-page-edwige-wilfried.md). Page
 * client réelle, pas une démo marketing : rendue hors du `Layout` public
 * (pas de Navbar/Footer commerciaux — cf. ClosingSection) avec un en-tête
 * minimal, à la façon de `/login`. `<meta color-scheme>` posé en direct
 * (directive non négociable du skill, anti-inversion dark mode mobile).
 */
export default function FairePartEdwigeWilfried() {
  useEffect(() => {
    document.title = 'Edwige & Wilfried — 21 décembre 2027 · Félicity'

    const meta = document.createElement('meta')
    meta.name = 'color-scheme'
    meta.content = 'only light'
    document.head.appendChild(meta)

    return () => {
      document.title = 'Félicity'
      document.head.removeChild(meta)
    }
  }, [])

  return (
    <div className="bg-[#FBF7F1]">
      {/* En-tête minimal — pas le Navbar marketing du site public. Pastille
          sombre translucide pour rester lisible quelle que soit l'image du
          scrub derrière (l'enveloppe claire comme la scène dorée). */}
      <header className="absolute inset-x-0 top-0 z-40 flex items-center justify-center px-6 py-5">
        <Link
          to="/"
          aria-label="Félicity — accueil"
          className="rounded-full bg-black/25 px-4 py-2 backdrop-blur-sm"
        >
          <img src="/logo.svg" alt="Félicity" className="h-6 w-auto brightness-0 invert" />
        </Link>
      </header>

      <HeroScrub
        theme={MINIMAL_THEME}
        chapters={HERO_CHAPTERS}
        video={{
          desktopSrc: '/edwige-wilfried-hero.mp4',
          posterSrc: '/edwige-wilfried-hero-poster.jpg',
        }}
        trackHeightVh={700}
        ariaLabel="Faire-part — Edwige & Wilfried"
      />
      <PayloadSection />
      <PhotosSection />
      <ClosingSection />
    </div>
  )
}
