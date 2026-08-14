import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { AnimatePresence, motion } from 'framer-motion'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const COUNTERS = [
  { value: 128, label: 'mariages racontés', format: (v: number) => String(Math.round(v)) },
  { value: 4.9, label: 'note moyenne', format: (v: number) => `${v.toFixed(1).replace('.', ',')}/5` },
  { value: 21, label: 'jours — délai moyen de production', format: (v: number) => String(Math.round(v)) },
]

const REVIEWS = [
  { quote: 'Nos invités nous en parlent encore.', author: 'Camille & Romain', date: 'juin 2025', avatar: '/avatar-1.jpg' },
  { quote: 'On a pleuré en découvrant la vidéo. Nos familles aussi.', author: 'Inès & Mathis', date: 'septembre 2025', avatar: '/avatar-2.jpg' },
  { quote: 'Le faire-part le plus original que nos amis aient jamais reçu.', author: 'Léa & Hugo', date: 'mai 2025', avatar: '/avatar-3.jpg' },
]

/** Bandeau preuve sociale : compteurs count-up + avis rotatif. */
export default function SocialProof() {
  const rootRef = useRef<HTMLElement>(null)
  const valueRefs = useRef<HTMLSpanElement[]>([])
  const [reviewIndex, setReviewIndex] = useState(0)

  // Compteurs — GSAP count-up, trigger 30 % viewport, stagger 0.15s
  useGSAP(
    () => {
      COUNTERS.forEach((counter, i) => {
        const el = valueRefs.current[i]
        if (!el) return
        const state = { v: 0 }
        gsap.to(state, {
          v: counter.value,
          duration: 1.6,
          delay: i * 0.15,
          ease: 'power2.out',
          scrollTrigger: { trigger: rootRef.current, start: 'top 70%' },
          onUpdate: () => {
            el.textContent = counter.format(state.v)
          },
        })
      })
    },
    { scope: rootRef },
  )

  // Avis rotatif — crossfade toutes les 5 s
  useEffect(() => {
    const id = window.setInterval(() => setReviewIndex((i) => (i + 1) % REVIEWS.length), 5000)
    return () => window.clearInterval(id)
  }, [])

  const review = REVIEWS[reviewIndex]

  return (
    <section ref={rootRef} className="bg-anthracite-900 py-16">
      <div className="mx-auto grid max-w-[1440px] gap-12 px-6 sm:grid-cols-2 lg:grid-cols-4 lg:px-12">
        {COUNTERS.map((counter, i) => (
          <div key={counter.label} className="flex flex-col gap-2">
            <span
              ref={(el) => {
                if (el) valueRefs.current[i] = el
              }}
              className="tabular font-display text-6xl font-light text-terracotta-300"
            >
              {counter.format(0)}
            </span>
            <span className="text-[13px] font-medium uppercase tracking-[0.12em] text-white/60">
              {counter.label}
            </span>
          </div>
        ))}

        {/* Avis rotatif */}
        <div className="relative flex min-h-28 items-center">
          <AnimatePresence mode="wait">
            <motion.figure
              key={reviewIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-start gap-4"
            >
              <img
                src={review.avatar}
                alt={review.author}
                className="h-14 w-14 shrink-0 rounded-full border border-anthracite-700 object-cover"
                loading="lazy"
              />
              <figcaption>
                <blockquote className="font-display text-lg font-light italic leading-snug text-white">
                  « {review.quote} »
                </blockquote>
                <p className="mt-2 text-xs font-medium uppercase tracking-[0.1em] text-white/50">
                  {review.author} — {review.date}
                </p>
              </figcaption>
            </motion.figure>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
