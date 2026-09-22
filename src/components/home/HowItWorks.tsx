import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { useLanguage } from '@/i18n/LanguageContext'

gsap.registerPlugin(ScrollTrigger, useGSAP)

// Offset du 1er panneau — juste sous la navbar fixe (h-20 = 80px, cf.
// Navbar.tsx) + un peu de respiration. Chaque carte suivante ajoute
// STICKY_STEP pour l'effet d'empilement (cf. doc du composant).
const STICKY_TOP = 96
const STICKY_STEP = 18

/**
 * Comment ça marche — recette « step-stack » (cf. maquette comparative des 6
 * recettes d'animation aux couleurs du site, 13/09/2026) : des cartes en
 * `position: sticky`, un `top` légèrement croissant d'une carte à l'autre —
 * chacune se fige un peu plus bas que la précédente et la recouvre au
 * scroll (z-index croissant + ombre), donnant un effet de pile de fiches.
 * Remplace la recette « focus-sequence » précédente.
 *
 * Contrairement aux autres sections de la home, aucun pin GSAP ici :
 * l'empilement fonctionne nativement en CSS (sticky), aussi bien sur
 * desktop que sur mobile, sans recalcul de hauteur ni piège d'épinglage.
 * GSAP n'intervient que pour l'effet de réduction (`scale`) qui accentue
 * la profondeur d'une carte au moment où la suivante la recouvre.
 */
export default function HowItWorks() {
  const { t } = useLanguage()
  const rootRef = useRef<HTMLElement>(null)

  const STEPS = [
    { key: '01', num: '01', title: t('home.howItWorks.step1Title'), text: t('home.howItWorks.step1Text') },
    { key: '02', num: '02', title: t('home.howItWorks.step2Title'), text: t('home.howItWorks.step2Text') },
    { key: '03', num: '03', title: t('home.howItWorks.step3Title'), text: t('home.howItWorks.step3Text') },
    { key: '04', num: '04', title: t('home.howItWorks.step4Title'), text: t('home.howItWorks.step4Text') },
  ]

  useGSAP(
    () => {
      const cards = gsap.utils.toArray<HTMLElement>('.stack-card')
      cards.forEach((card, i) => {
        gsap.to(card, {
          scale: 0.955,
          ease: 'none',
          scrollTrigger: {
            trigger: card,
            // Le point où la carte se fige (son propre `top` sticky) —
            // au-delà, on la réduit progressivement sur 220px de scroll,
            // pendant que la carte suivante vient la recouvrir.
            start: `top top+=${STICKY_TOP + i * STICKY_STEP}`,
            end: '+=220',
            scrub: true,
          },
        })
      })
    },
    { scope: rootRef },
  )

  return (
    <section ref={rootRef} id="comment-ca-marche" className="relative bg-anthracite-950 px-6 py-32 lg:px-12 lg:py-44">
      <div className="mx-auto max-w-[660px] text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-300">{t('home.howItWorks.kicker')}</p>
        <h2 className="font-display mt-4 text-[clamp(2rem,4vw,3.2rem)] font-light leading-[1.05] tracking-[-0.015em] text-white">
          {t('home.howItWorks.titleLead')} <em className="italic text-terracotta-300">{t('home.howItWorks.titleEm')}</em>.
        </h2>
      </div>

      <div className="relative mx-auto mt-16 max-w-[660px] pb-[20vh]">
        {STEPS.map((step, i) => (
          <article
            key={step.key}
            className="stack-card sticky mb-7 rounded-xl border border-anthracite-700 bg-anthracite-800 p-10 shadow-[0_-20px_40px_-30px_rgba(0,0,0,0.8)] lg:p-11"
            style={{ top: `${STICKY_TOP + i * STICKY_STEP}px`, zIndex: i + 1 }}
          >
            <p className="font-display text-[2.6rem] font-light leading-none text-terracotta-500">{step.num}</p>
            <h3 className="font-display mt-3 text-2xl font-light tracking-[-0.01em] text-white">{step.title}</h3>
            <p className="mt-3 max-w-md text-[15px] leading-[1.65] text-white/70">{step.text}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
