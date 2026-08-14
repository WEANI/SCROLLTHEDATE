import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { cn } from '@/lib/utils'
import type { DemoTemplate } from './templates'
import { SECTION_THEMES } from './templates'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const CHAPTERS = [
  {
    num: '01',
    year: '2019',
    title: 'La rencontre',
    text: "Un café renversé, deux rires. Le reste appartient à l'histoire.",
    img: '/story-rencontre.jpg',
    alt: 'Un café parisien sous la pluie, deux tasses sur une table',
  },
  {
    num: '02',
    year: '2022',
    title: 'Le voyage',
    text: "Trois semaines, un van, zéro plan. On a su qu'on ne se quitterait plus.",
    img: '/story-voyage.jpg',
    alt: 'Un van au bord d’une falaise en fin de journée',
  },
  {
    num: '03',
    year: '2025',
    title: 'La demande',
    text: 'Un genou à terre, une marée montante, un oui avant la fin de la phrase.',
    img: '/story-demande.jpg',
    alt: 'Une main avec une bague minimaliste, pétales terracotta sur la pierre',
  },
]

/** Section 3 — Notre histoire : timeline verticale « chapitres » (GSAP scrub). */
export default function StoryTimeline({ template }: { template: DemoTemplate }) {
  const t = SECTION_THEMES[template]
  const rootRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      // La ligne se dessine au scroll (scaleY scrub)
      gsap.fromTo(
        '.story-line',
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: 'none',
          transformOrigin: 'top center',
          scrollTrigger: {
            trigger: '.story-track',
            start: 'top 70%',
            end: 'bottom 60%',
            scrub: true,
          },
        },
      )
      // Chapitres : fade-up + numéro scale 0.8→1 + parallaxe image
      gsap.utils.toArray<HTMLElement>('.story-chapter').forEach((chapter) => {
        gsap.fromTo(
          chapter.querySelectorAll('.story-reveal'),
          { y: 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            stagger: 0.1,
            duration: 0.9,
            ease: 'power3.out',
            scrollTrigger: { trigger: chapter, start: 'top 75%' },
          },
        )
        gsap.fromTo(
          chapter.querySelector('.story-num'),
          { scale: 0.8, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: { trigger: chapter, start: 'top 70%' },
          },
        )
        gsap.fromTo(
          chapter.querySelector('.story-img'),
          { y: -30 },
          {
            y: 30,
            ease: 'none',
            scrollTrigger: { trigger: chapter, start: 'top bottom', end: 'bottom top', scrub: true },
          },
        )
      })
    },
    { scope: rootRef },
  )

  return (
    <section
      ref={rootRef}
      className={cn(
        'relative overflow-hidden py-28 transition-colors [transition-duration:600ms] lg:py-48',
        template === 'minimal' ? 'bg-white' : t.section,
      )}
      aria-label="Notre histoire"
    >
      <div className="mx-auto max-w-[1440px] px-6 lg:px-12">
        <div className="text-center">
          <p className={cn('text-[11px] font-semibold uppercase tracking-[0.18em]', t.kicker)}>
            Chapitre par chapitre
          </p>
          <h2
            className={cn(
              'font-display mt-4 text-[clamp(2.4rem,5vw,4.5rem)] font-light leading-[1.05] tracking-[-0.015em]',
              t.heading,
            )}
          >
            Notre <em className={t.condensed ? 'not-italic text-terracotta-400' : 'italic text-terracotta-300'}>histoire.</em>
          </h2>
        </div>

        {/* Timeline */}
        <div className="story-track relative mx-auto mt-20 max-w-5xl lg:mt-28">
          {/* Ligne centrale terracotta */}
          <div
            aria-hidden
            className="story-line absolute left-4 top-0 h-full w-px bg-terracotta-300/60 md:left-1/2 md:-translate-x-1/2"
          />
          <div className="flex flex-col gap-20 md:gap-28">
            {CHAPTERS.map((chapter, i) => {
              const left = i % 2 === 0
              return (
                <article
                  key={chapter.num}
                  className={cn(
                    'story-chapter relative grid items-center gap-8 pl-12 md:grid-cols-2 md:gap-16 md:pl-0',
                  )}
                >
                  {/* Pastille sur la ligne */}
                  <span
                    aria-hidden
                    className="absolute left-4 top-2 z-10 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-terracotta-500 ring-4 ring-terracotta-500/20 md:left-1/2 md:top-1/2 md:-translate-y-1/2"
                  />
                  {/* Texte */}
                  <div className={cn('md:col-start-1', !left && 'md:col-start-2 md:text-left', left && 'md:text-right')}>
                    <span
                      aria-hidden
                      className={cn(
                        'story-num font-display block text-[4.5rem] font-light leading-none md:text-[6rem]',
                        'text-outline-terracotta',
                      )}
                    >
                      {chapter.num}
                    </span>
                    <p className={cn('story-reveal mt-4 text-[11px] font-semibold uppercase tracking-[0.18em]', t.kicker)}>
                      {chapter.year}
                    </p>
                    <h3 className={cn('story-reveal font-display mt-2 text-[1.8rem] font-medium tracking-[-0.01em] md:text-[2.2rem]', t.heading)}>
                      {chapter.title}
                    </h3>
                    <p className={cn('story-reveal mt-4 text-[15px] leading-[1.65] md:text-[16px]', t.body, left && 'md:ml-auto md:max-w-md', !left && 'md:max-w-md')}>
                      {chapter.text}
                    </p>
                  </div>
                  {/* Image */}
                  <div className={cn('md:col-start-2', !left && 'md:col-start-1 md:row-start-1')}>
                    <div className="story-reveal overflow-hidden rounded-[6px]">
                      <img
                        src={chapter.img}
                        alt={chapter.alt}
                        loading="lazy"
                        className="story-img aspect-[4/5] w-full scale-[1.12] object-cover will-change-transform"
                      />
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
