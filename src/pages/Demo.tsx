import { useEffect } from 'react'
import DemoBanner from '@/components/demo/DemoBanner'
import DemoHeroScrub from '@/components/demo/DemoHeroScrub'
import RsvpSection from '@/components/demo/RsvpSection'

/**
 * Page démo — faire-part « Anna & Théo » (20 juin 2026), nouvelle
 * architecture à 2 sections : héros vidéo scrub avec toutes les infos en
 * overlay, puis RSVP sobre à un seul CTA. Plus de rituel d'ouverture, plus
 * de switcher de templates, plus de sections "Notre histoire" / "Dress
 * code" / hébergement — cf. brief-claude-code-nouvelle-architecture.md.
 */
export default function Demo() {
  useEffect(() => {
    document.title = 'Anna & Théo — 20 juin 2026 · Félicity (démo)'
    return () => {
      document.title = 'Félicity'
    }
  }, [])

  return (
    <>
      <DemoBanner />

      {/* Héros plein écran : sort du padding du Layout via -mt-20. */}
      <div className="-mt-20">
        <DemoHeroScrub />
      </div>

      <RsvpSection />
    </>
  )
}
