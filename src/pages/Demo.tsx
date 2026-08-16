import { useEffect } from 'react'
import DemoBanner from '@/components/demo/DemoBanner'
import RsvpSection from '@/components/demo/RsvpSection'
import HeroScrub from '@/components/hero-scrub/HeroScrub'
import { CINEMA_THEME } from '@/components/hero-scrub/themes'
import { HERO_CHAPTERS } from '@/components/demo/demoContent'

/**
 * Page démo — faire-part « Anna & Théo » (20 juin 2026), nouvelle
 * architecture à 2 sections : héros vidéo scrub avec toutes les infos en
 * overlay, puis RSVP sobre à un seul CTA. Plus de rituel d'ouverture, plus
 * de switcher de templates, plus de sections "Notre histoire" / "Dress
 * code" / hébergement — cf. brief-claude-code-nouvelle-architecture.md.
 */
export default function Demo() {
  useEffect(() => {
    document.title = 'Anna & Théo — 20 juin 2026 · Scroll The Date (démo)'
    return () => {
      document.title = 'Scroll The Date'
    }
  }, [])

  return (
    <>
      <DemoBanner />

      {/* Héros plein écran : sort du padding du Layout via -mt-20. */}
      <div className="-mt-20">
        <HeroScrub
          theme={CINEMA_THEME}
          chapters={HERO_CHAPTERS}
          video={{
            desktopSrc: '/demo-scrub-desktop.mp4',
            mobileSrc: '/demo-scrub-mobile.mp4',
            posterSrc: '/demo-scrub-poster.jpg',
          }}
          trackHeightVh={900}
          ariaLabel="Faire-part — Anna & Théo"
          showWatermark
        />
      </div>

      <RsvpSection />
    </>
  )
}
