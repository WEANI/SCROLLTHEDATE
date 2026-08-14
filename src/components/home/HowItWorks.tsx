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
    text: 'Choisissez votre formule, en quelques minutes. Paiement sécurisé, en 3x sans frais possible.',
    icon: ShoppingBag,
    dark: false,
  },
  {
    num: '02',
    title: 'Racontez',
    text: "Questionnaire guidé, note vocale, vos photos. C'est vous la matière première du film.",
    icon: Mic,
    dark: true,
  },
  {
    num: '03',
    title: 'Validez',
    text: '3 propositions de scénario, vous choisissez. Puis une vidéo en filigrane avant la version finale.',
    icon: ClipboardCheck,
    dark: false,
  },
  {
    num: '04',
    title: 'Recevez & partagez',
    text: 'Faire-part en ligne, lien illimité, QR code et RSVP intégré. Vos invités répondent en un clic.',
    icon: Share2,
    dark: true,
  },
]

/** Comment ça marche — 4 cartes plein écran empilées, section épinglée 300vh. */
export default function HowItWorks() {
  const rootRef = useRef<HTMLElement>(null)
  const [active, setActive] = useState(0)

  useGSAP(
    () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: rootRef.current,
          start: 'top top',
          end: '+=300%',
          pin: true,
          scrub: 1,
          onUpdate: (self) => {
            setActive(Math.min(STEPS.length - 1, Math.floor(self.progress * STEPS.length)))
          },
        },
      })

      for (let i = 1; i < STEPS.length; i++) {
        tl.fromTo(
          `.step-card-${i}`,
          { yPercent: 100 },
          { yPercent: 0, ease: 'none', duration: 1 },
          i - 1,
        ).to(
          `.step-card-${i - 1}`,
          { scale: 0.94, filter: 'brightness(0.6)', ease: 'none', duration: 1 },
          i - 1,
        )
      }
    },
    { scope: rootRef },
  )

  return (
    <section ref={rootRef} id="comment-ca-marche" className="relative">
      <div style={{ height: '100dvh' }} className="relative overflow-hidden">
        {STEPS.map((step, i) => (
          <article
            key={step.num}
            className={cn(
              `step-card-${i} absolute inset-0 flex items-center will-change-transform`,
              step.dark ? 'bg-anthracite-800' : 'bg-anthracite-900',
              i > 0 && 'shadow-[0_-24px_64px_rgba(0,0,0,0.45)]',
            )}
            style={{ zIndex: i + 1, transform: i > 0 ? 'translateY(100%)' : undefined }}
          >
            <div className="grain mx-auto grid w-full max-w-[1440px] items-center gap-12 px-6 lg:grid-cols-2 lg:px-12">
              <div>
                <span className="text-outline-terracotta font-display block text-[8rem] font-light leading-none lg:text-[10rem]">
                  {step.num}
                </span>
                <h2 className="font-display mt-6 text-[clamp(2.4rem,5vw,4.5rem)] font-light tracking-[-0.015em] text-white">
                  {step.title}
                </h2>
                <p className="mt-6 max-w-md text-[16px] leading-[1.65] text-white/70">{step.text}</p>
              </div>
              <div className="hidden justify-center lg:flex">
                <div className="flex h-48 w-48 items-center justify-center rounded-md border border-anthracite-700 bg-anthracite-950/40">
                  <step.icon size={64} strokeWidth={1.25} className="text-terracotta-500" />
                </div>
              </div>
            </div>
          </article>
        ))}

        {/* Progress dots latéraux */}
        <div className="absolute right-6 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-3 lg:right-10">
          {STEPS.map((step, i) => (
            <span
              key={step.num}
              className={cn(
                'h-2 w-2 rounded-full transition-colors duration-300',
                i === active ? 'bg-terracotta-500' : 'bg-white/20',
              )}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
