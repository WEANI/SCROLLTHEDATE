import { memo, useRef } from 'react'
import { Link } from 'react-router'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { ArrowRight } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const TITLE = 'Racontons votre histoire.'

/** Halo radial terracotta qui respire — micro-composant mémoïsé (animation perpétuelle). */
const Halo = memo(function Halo() {
  return (
    <div
      aria-hidden
      className="animate-halo absolute left-1/2 top-1/2 h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full will-change-transform"
      style={{
        background: 'radial-gradient(circle, rgba(201,111,90,0.10) 0%, rgba(201,111,90,0) 65%)',
      }}
    />
  )
})

/** CTA final plein viewport. */
export default function FinalCta() {
  const rootRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      gsap.fromTo(
        '.final-char',
        { y: 50, opacity: 0, rotateX: 35 },
        {
          y: 0,
          opacity: 1,
          rotateX: 0,
          stagger: 0.025,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: { trigger: rootRef.current, start: 'top 60%' },
        },
      )
      gsap.fromTo(
        '.final-cta-actions',
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.9,
          delay: 0.4,
          ease: 'power3.out',
          scrollTrigger: { trigger: rootRef.current, start: 'top 60%' },
        },
      )
    },
    { scope: rootRef },
  )

  return (
    <section
      ref={rootRef}
      className="grain relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-anthracite-950"
    >
      <Halo />
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <p className="mb-8 text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-300">
          Prêts ?
        </p>
        <h2 className="font-display max-w-5xl text-[clamp(3rem,8vw,7.5rem)] font-light leading-[1.02] tracking-[-0.02em] text-white [perspective:800px]">
          {TITLE.split(' ').map((word, wi, arr) => (
            <span key={wi} className="inline-block whitespace-pre">
              {word.split('').map((char, ci) => (
                <span
                  key={ci}
                  className={
                    word === 'histoire.'
                      ? 'final-char inline-block italic text-terracotta-300 will-change-transform'
                      : 'final-char inline-block will-change-transform'
                  }
                >
                  {char}
                </span>
              ))}
              {wi < arr.length - 1 ? ' ' : ''}
            </span>
          ))}
        </h2>
        <div className="final-cta-actions mt-14 flex flex-col items-center gap-8">
          <Link
            to="/offres"
            className="rounded-full bg-terracotta-500 px-12 py-5 text-base font-semibold uppercase tracking-[0.1em] text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400 active:scale-[0.97]"
          >
            Créer notre faire-part
          </Link>
          <Link
            to="/demofairepart"
            className="group inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-white/70 transition-colors hover:text-white"
          >
            Voir la démo
            <ArrowRight size={16} className="text-terracotta-500 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  )
}
