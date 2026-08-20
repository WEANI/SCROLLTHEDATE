import { useEffect } from 'react'
import { Link } from 'react-router'
import PayloadSection from '@/components/faire-part/PayloadSection'
import PhotosSection from '@/components/faire-part/PhotosSection'
import ClosingSection from '@/components/faire-part/ClosingSection'
import HeroScrub from '@/components/hero-scrub/HeroScrub'
import { MINIMAL_THEME } from '@/components/hero-scrub/themes'
import {
  HERO_CHAPTERS,
  PAYLOAD_FIELDS,
  RSVP_CTA_LABEL,
  SLUG,
} from '@/components/faire-part/edwigeWilfriedContent'

const COUPLE_NAMES = 'Edwige & Wilfried'

/**
 * Faire-part « Edwige & Wilfried » — première page livrée depuis le
 * pipeline SCROLL THE DATE (cf. instructions-page-edwige-wilfried.md). Page
 * client réelle, pas une démo marketing : rendue hors du `Layout` public
 * (pas de Navbar/Footer commerciaux — cf. ClosingSection) avec un en-tête
 * minimal, à la façon de `/login`. `<meta color-scheme>` posé en direct
 * (directive non négociable du skill, anti-inversion dark mode mobile).
 */
export default function FairePartEdwigeWilfried() {
  useEffect(() => {
    document.title = 'Edwige & Wilfried — 21 décembre 2027 · Scroll The Date'

    const meta = document.createElement('meta')
    meta.name = 'color-scheme'
    meta.content = 'only light'
    document.head.appendChild(meta)

    return () => {
      document.title = 'Scroll The Date'
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
          aria-label="Scroll The Date — accueil"
          className="rounded-full bg-black/25 px-4 py-2 backdrop-blur-sm"
        >
          <img src="/logo.svg" alt="Scroll The Date" className="h-6 w-auto brightness-0 invert" />
        </Link>
      </header>

      <HeroScrub
        theme={MINIMAL_THEME}
        chapters={HERO_CHAPTERS}
        video={{
          desktopSrc: '/edwige-wilfried-hero.mp4',
          posterSrc: '/edwige-wilfried-hero-poster.jpg',
        }}
        trackHeightVh={800}
        tailVh={100}
        ariaLabel="Faire-part — Edwige & Wilfried"
      />

      {/* Le corps de page recouvre le plan final au lieu de s'enchaîner en
          dessous : `.hs-frame` (dans HeroScrub) reste épinglé en `position:
          sticky` tant que la piste de scrub (700vh) n'est pas épuisée — en
          tirant ce bloc vers le haut via une marge négative, son bord
          d'attaque entre dans le viewport un peu avant la fin de cette
          piste, pendant que la vidéo est donc encore épinglée dessous.
          Comme ce bloc arrive après le hero dans le DOM (empilement par
          défaut, sans besoin de z-index explicite) et qu'il est opaque, il
          glisse depuis le bas et referme progressivement le cadre vidéo
          plutôt que d'apparaître comme une section classique.
          -100vh (pas -20vh) : le recouvrement doit être COMPLET au moment où
          `.hs-frame` se libère de son épinglage, pas juste entamé — sinon,
          dès que le scroll dépasse la piste, la vidéo (plus épinglée)
          continue de défiler normalement sous un bloc qui n'a comblé qu'une
          fraction de l'écran, laissant un vrai trou visible. Avec une marge
          de -Xvh, ce bloc n'entre dans le viewport que Xvh avant la fin de
          la piste ; pour qu'il ait fini de tout recouvrir pile à ce
          moment-là, il faut X = 100 (une pleine hauteur d'écran), quelle que
          soit la hauteur de la piste (700vh ici). Vérifié par calcul et par
          mesure DOM en production — -20vh ne comblait que 20 % de l'écran
          au moment critique. */}
      <div className="relative z-10 -mt-[100vh] rounded-t-[32px] bg-[#FBF7F1] shadow-[0_-24px_60px_rgba(46,38,32,0.18)]">
        <PayloadSection
          slug={SLUG}
          coupleNames={COUPLE_NAMES}
          fields={PAYLOAD_FIELDS}
          rsvpCtaLabel={RSVP_CTA_LABEL}
        />
        <PhotosSection />
        <ClosingSection coupleNames={COUPLE_NAMES} />
      </div>
    </div>
  )
}
