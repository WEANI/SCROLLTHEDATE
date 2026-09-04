import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const TITLE_WORDS = ['Un', 'faire-part', 'unique', 'qui', 'raconte', 'votre', 'histoire.']

/** Section concept — split éditorial 55/45, reveal mot-par-mot + parallaxe. */
export default function Concept() {
  const rootRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      // H2 reveal mot-par-mot
      gsap.fromTo(
        '.concept-word',
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.05,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: { trigger: '.concept-title', start: 'top 75%' },
        },
      )
      // Paragraphes fade-up
      gsap.fromTo(
        '.concept-copy',
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.12,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: { trigger: '.concept-copy-wrap', start: 'top 80%' },
        },
      )
      // Parallaxe image y:-60 → 60 scrub
      gsap.fromTo(
        '.concept-img',
        { y: -60 },
        {
          y: 60,
          ease: 'none',
          scrollTrigger: { trigger: rootRef.current, start: 'top bottom', end: 'bottom top', scrub: true },
        },
      )
    },
    { scope: rootRef },
  )

  return (
    <section ref={rootRef} id="concept" className="grain bg-anthracite-950 py-32 lg:py-48">
      <div className="mx-auto grid max-w-[1440px] items-center gap-16 px-6 lg:grid-cols-[55fr_45fr] lg:px-12">
        <div>
          <p className="mb-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-300">
            Le concept
          </p>
          <h2 className="concept-title font-display text-[clamp(2.4rem,5vw,4.5rem)] font-light leading-[1.05] tracking-[-0.015em] text-white">
            {TITLE_WORDS.map((word, i) => (
              <span key={i} className="concept-word inline-block whitespace-pre will-change-transform">
                {word}
                {i < TITLE_WORDS.length - 1 ? ' ' : ''}
              </span>
            ))}
          </h2>
          <div className="concept-copy-wrap mt-10 flex max-w-xl flex-col gap-6">
            <p className="concept-copy text-[16px] leading-[1.65] text-white/70">
              Scroll The Date crée des faire-parts de mariage digitaux uniques. Vous racontez votre
              histoire dans un questionnaire guidé et une note vocale — vos mots, vos photos,
              votre ton.
            </p>
            <p className="concept-copy text-[16px] leading-[1.65] text-white/70">
              Nous en faisons une <em className="font-display italic text-terracotta-300">vidéo cinématique</em> qui
              ouvre votre faire-part : un film court, écrit et monté pour vous, que vos invités
              découvrent en scrollant.
            </p>
            <p className="concept-copy border-l-2 border-terracotta-500 pl-5 text-[15px] font-medium leading-relaxed text-white">
              Accompagnement humain de A à Z — une vraie équipe, pas un générateur.
            </p>
          </div>
        </div>

        {/* Image encadrée d'un liseré terracotta offset 16px */}
        <div className="relative">
          <div aria-hidden className="absolute -right-4 -top-4 h-full w-full rounded-md border border-terracotta-300/60" />
          <div className="relative overflow-hidden rounded-md">
            <img
              src="/gallery-2.jpg"
              alt="Silhouette d'un couple face à la mer au crépuscule"
              className="concept-img aspect-[16/10] w-full scale-110 object-cover will-change-transform"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
