import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import ScrubHero from '@/components/ScrubHero'
import type { ScrubHeroBeat } from '@/components/ScrubHero'
import DemoBanner from '@/components/demo/DemoBanner'
import OpeningRitual from '@/components/demo/OpeningRitual'
import TemplateSwitcher from '@/components/demo/TemplateSwitcher'
import CountdownSection from '@/components/demo/CountdownSection'
import StoryTimeline from '@/components/demo/StoryTimeline'
import ProgramSection from '@/components/demo/ProgramSection'
import VenueSection from '@/components/demo/VenueSection'
import DressCodeSection from '@/components/demo/DressCodeSection'
import RsvpSection from '@/components/demo/RsvpSection'
import DemoFooterSection from '@/components/demo/DemoFooterSection'
import type { DemoTemplate } from '@/components/demo/templates'
import { loadTemplate, saveTemplate } from '@/components/demo/templates'

/** Beats du héros scrub (fenêtres de progression 0 → 1). */
const HERO_BEATS: ScrubHeroBeat[] = [
  {
    from: 0,
    to: 0.1,
    kicker: 'Anna & Théo — Faire-part',
  },
  {
    from: 0.1,
    to: 0.4,
    segments: [{ text: 'Anna' }, { text: '&', accent: true }, { text: 'Théo' }],
  },
  {
    from: 0.4,
    to: 0.7,
    segments: [{ text: 'Notre histoire,' }, { text: 'en images.', accent: true }],
  },
  {
    from: 0.7,
    to: 0.92,
    segments: [
      { text: 'Samedi 20 juin 2026' },
      { text: '— Domaine de Varenne', accent: true },
    ],
  },
]

/**
 * Page démo — faire-part complet « Anna & Théo » (samedi 20 juin 2026).
 * Rituel d'ouverture → héros vidéo scrub-scroll → corps (compte à rebours,
 * histoire, programme, lieu, dress code, RSVP live, partage) restylé par
 * le switcher de templates. Fonctionne en mode dégradé sans backend :
 * contenu statique + RSVP simulé en local.
 */
export default function Demo() {
  const [ritualDone, setRitualDone] = useState(false)
  const [template, setTemplate] = useState<DemoTemplate>(loadTemplate)

  const closeRitual = useCallback(() => {
    setRitualDone(true)
    // La hauteur de page change quand l'overlay fixed disparaît → recalcul.
    requestAnimationFrame(() => ScrollTrigger.refresh())
  }, [])

  const changeTemplate = useCallback((t: DemoTemplate) => {
    setTemplate(t)
    saveTemplate(t)
  }, [])

  useEffect(() => {
    document.title = 'Anna & Théo — 20 juin 2026 · Félicity (démo)'
    return () => {
      document.title = 'Félicity'
    }
  }, [])

  return (
    <>
      <DemoBanner />

      <AnimatePresence>
        {!ritualDone && <OpeningRitual onDone={closeRitual} />}
      </AnimatePresence>

      {/* Héros plein écran : sort du padding du Layout via -mt-20.
          Identique quel que soit le template — c'est la vidéo du couple. */}
      <div className="-mt-20">
        <ScrubHero
          videoSrc="/demo-film.mp4"
          posterSrc="/demo-poster.jpg"
          beats={HERO_BEATS}
          durationVh={350}
        />
      </div>

      {/* Corps du faire-part — restylé par le template (transition 600ms) */}
      <div className="transition-colors [transition-duration:600ms]">
        <CountdownSection template={template} />
        <StoryTimeline template={template} />
        <ProgramSection template={template} />
        <VenueSection template={template} />
        <DressCodeSection template={template} />
        <RsvpSection template={template} />
        <DemoFooterSection />
      </div>

      <TemplateSwitcher value={template} onChange={changeTemplate} />
    </>
  )
}
