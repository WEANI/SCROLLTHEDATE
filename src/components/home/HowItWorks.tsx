import { useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { ClipboardCheck, Mic, Share2, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const STEPS = [
  {
    num: '01',
    title: 'Commandez',
    text: 'Choisissez votre formule, en quelques minutes. Paiement sécurisé.',
    icon: ShoppingBag,
  },
  {
    num: '02',
    title: 'Racontez',
    text: "Questionnaire guidé, note vocale, vos photos. C'est vous la matière première du film.",
    icon: Mic,
  },
  {
    num: '03',
    title: 'Validez',
    text: 'Des propositions de scénario, vous choisissez. Puis une vidéo en filigrane avant la version finale.',
    icon: ClipboardCheck,
  },
  {
    num: '04',
    title: 'Recevez & partagez',
    text: 'Faire-part en ligne, lien illimité, QR code et RSVP intégré. Vos invités répondent en un clic.',
    icon: Share2,
  },
]

/**
 * Comment ça marche — recette « focus-sequence » (cf. maquette comparative
 * du 13/09/2026, 6 recettes d'animation aux couleurs du site) : une étape à
 * la fois, plein écran, avec son numéro en grand filigrane derrière le
 * titre. Remplace l'ancien empilement de cartes qui glissaient les unes sur
 * les autres — mêmes 4 étapes, même épinglage GSAP (300 → 400vh, cf.
 * `end` ci-dessous), transition pilotée par l'état React `active` plutôt que
 * par un timeline GSAP (plus simple : un simple fondu + zoom léger par
 * étape, pas de déplacement à synchroniser).
 */
export default function HowItWorks() {
  const rootRef = useRef<HTMLElement>(null)
  const [active, setActive] = useState(0)

  useGSAP(
    () => {
      ScrollTrigger.create({
        trigger: rootRef.current,
        start: 'top top',
        end: '+=400%',
        pin: true,
        scrub: 1,
        // Cf. ScrubHero : force le recalcul des sections épinglées de haut
        // en bas (héros = 3, ici = 2, Advantages = 1).
        refreshPriority: 2,
        onUpdate: (self) => {
          setActive(Math.min(STEPS.length - 1, Math.floor(self.progress * STEPS.length)))
        },
      })
    },
    { scope: rootRef },
  )

  return (
    <section ref={rootRef} id="comment-ca-marche" className="relative">
      <div className="grain relative overflow-hidden bg-anthracite-950" style={{ height: '100dvh' }}>
        {STEPS.map((step, i) => (
          <div
            key={step.num}
            className={cn(
              'absolute inset-0 flex items-center justify-center px-6 transition-all duration-500 ease-out',
              i === active ? 'opacity-100 scale-100' : 'opacity-0 scale-[1.04]',
            )}
          >
            {/* Numéro en filigrane, plein écran derrière le contenu */}
            <span
              aria-hidden
              className="text-outline-terracotta font-display pointer-events-none absolute inset-0 flex select-none items-center justify-center text-[42vh] font-light leading-none opacity-30"
            >
              {step.num}
            </span>
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full border border-anthracite-700 bg-anthracite-950/60 backdrop-blur-sm">
                <step.icon size={32} strokeWidth={1.25} className="text-terracotta-500" />
              </div>
              <h2 className="font-display text-[clamp(2.4rem,5vw,4.5rem)] font-light tracking-[-0.015em] text-white">
                {step.title}
              </h2>
              <p className="mx-auto mt-6 max-w-md text-[16px] leading-[1.65] text-white/70">{step.text}</p>
            </div>
          </div>
        ))}

        {/* Barres de progression — cf. .bars de la maquette focus-sequence */}
        <div className="absolute inset-x-0 bottom-12 z-20 flex items-center justify-center gap-2.5">
          {STEPS.map((step, i) => (
            <span
              key={step.num}
              className={cn(
                'h-[2px] w-9 rounded-full transition-colors duration-300',
                i <= active ? 'bg-terracotta-500' : 'bg-white/15',
              )}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
