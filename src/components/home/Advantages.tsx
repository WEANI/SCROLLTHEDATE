import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { cn } from '@/lib/utils'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const PANELS = [
  {
    image: '/gallery-1.jpg',
    title: ['La', 'surprise'],
    accentLast: false,
    tagline: "Vos invités s'attendent à du papier. Ils reçoivent un film.",
  },
  {
    image: '/gallery-3.jpg',
    title: ["L'originalité"],
    accentLast: false,
    tagline: 'Votre histoire, votre ton, vos images. Rien de générique.',
  },
  {
    image: '/gallery-4.jpg',
    title: ["L'unique"],
    accentLast: true,
    tagline: 'Chaque faire-part est créé à la main, pour un seul couple : vous.',
  },
]

/** Avantages — 3 panneaux horizontaux pleine hauteur, section épinglée 250vh. */
export default function Advantages() {
  const rootRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const track = trackRef.current
      if (!track) return

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: rootRef.current,
          start: 'top top',
          end: '+=250%',
          pin: true,
          scrub: 1,
          // Cf. ScrubHero : force le recalcul des sections épinglées de haut
          // en bas (héros = 3, HowItWorks = 2, ici = 1).
          refreshPriority: 1,
        },
      })

      // Défilement horizontal : -200vw
      tl.to(track, { x: () => -window.innerWidth * (PANELS.length - 1), ease: 'none', duration: PANELS.length }, 0)

      PANELS.forEach((_, i) => {
        // Reveal caractères quand le panneau atteint ~50 % du viewport
        tl.fromTo(
          `.panel-${i} .adv-char`,
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, stagger: 0.03, duration: 0.5, ease: 'power3.out' },
          i === 0 ? 0 : i + 0.35,
        )
        tl.fromTo(
          `.panel-${i} .adv-tagline`,
          { y: 24, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' },
          i === 0 ? 0.15 : i + 0.5,
        )
        // Contre-parallaxe interne de l'image
        tl.fromTo(
          `.panel-${i} .adv-img`,
          { x: i % 2 === 0 ? -40 : 40 },
          { x: i % 2 === 0 ? 40 : -40, ease: 'none', duration: 1.4 },
          Math.max(0, i - 0.4),
        )
      })
    },
    { scope: rootRef },
  )

  return (
    <section ref={rootRef} className="relative">
      <div style={{ height: '100dvh' }} className="overflow-hidden">
        <div ref={trackRef} className="flex h-full will-change-transform" style={{ width: `${PANELS.length * 100}vw` }}>
          {PANELS.map((panel, i) => (
            <article key={panel.tagline} className={cn(`panel-${i} relative h-full w-screen shrink-0 overflow-hidden`)}>
              <img
                src={panel.image}
                alt=""
                loading="lazy"
                className="adv-img absolute inset-0 h-full w-full scale-110 object-cover will-change-transform"
              />
              <div className="absolute inset-0 bg-anthracite-950/55" />
              <div className="grain relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
                <h2 className="font-display text-[clamp(3rem,8vw,7rem)] font-light leading-none tracking-[-0.02em] text-white [perspective:800px]">
                  {panel.title.map((word, wi) => (
                    <span key={wi} className="inline-block whitespace-pre">
                      {word.split('').map((char, ci) => (
                        <span
                          key={ci}
                          className={cn(
                            'adv-char inline-block will-change-transform',
                            panel.accentLast && wi === panel.title.length - 1 && 'italic text-terracotta-300',
                          )}
                        >
                          {char}
                        </span>
                      ))}
                      {wi < panel.title.length - 1 ? ' ' : ''}
                    </span>
                  ))}
                </h2>
                <p className="adv-tagline mt-8 max-w-lg text-[17px] leading-[1.65] text-white/85">
                  {panel.tagline}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
