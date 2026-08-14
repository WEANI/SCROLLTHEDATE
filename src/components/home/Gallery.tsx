import { useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { AnimatePresence, motion } from 'framer-motion'
import { Play, X } from 'lucide-react'
import { cn } from '@/lib/utils'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const ITEMS = [
  { src: '/gallery-1.jpg', couple: 'Camille & Romain', large: true },
  { src: '/gallery-2.jpg', couple: 'Inès & Mathis', large: false },
  { src: '/gallery-3.jpg', couple: 'Léa & Hugo', large: false },
  { src: '/gallery-4.jpg', couple: 'Anna & Théo', large: true },
]

/** Galerie / showreel — grille asymétrique + lightbox vidéo (Framer Motion). */
export default function Gallery() {
  const rootRef = useRef<HTMLElement>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)

  useGSAP(
    () => {
      gsap.fromTo(
        '.gallery-item',
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.12,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: { trigger: rootRef.current, start: 'top 80%' },
        },
      )
    },
    { scope: rootRef },
  )

  const active = ITEMS.find((it) => it.couple === lightbox)

  return (
    <section ref={rootRef} className="grain bg-anthracite-950 py-32 lg:py-44">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-12">
        <p className="mb-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-300">
          Ils l'ont fait
        </p>
        <h2 className="font-display max-w-3xl text-[clamp(2.4rem,5vw,4.5rem)] font-light leading-[1.05] tracking-[-0.015em] text-white">
          Des histoires <em className="italic text-terracotta-300">vraies</em>.
        </h2>

        {/* Grille asymétrique : 2 grandes + 2 petites */}
        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {ITEMS.map((item) => (
            <button
              key={item.couple}
              type="button"
              onClick={() => setLightbox(item.couple)}
              className={cn(
                'gallery-item group relative overflow-hidden rounded-md text-left',
                item.large ? 'lg:col-span-2 aspect-[16/9]' : 'aspect-[16/9] lg:aspect-[4/3]',
              )}
            >
              <img
                src={item.src}
                alt={`Extrait du faire-part de ${item.couple}`}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-anthracite-950/30 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                <span className="flex h-16 w-16 items-center justify-center rounded-full border border-terracotta-300/60 bg-anthracite-950/60 backdrop-blur-sm">
                  <Play size={22} className="ml-1 text-terracotta-300" />
                </span>
                <span className="font-display text-2xl font-light italic text-white">{item.couple}</span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-300">
                  Regarder l'extrait
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-anthracite-950/85 p-6 backdrop-blur-md"
            onClick={() => setLightbox(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-4xl overflow-hidden rounded-lg border border-anthracite-700 bg-anthracite-900"
              onClick={(e) => e.stopPropagation()}
            >
              <video
                src="/demo-film.mp4"
                poster="/demo-poster.jpg"
                controls
                autoPlay
                muted
                loop
                className="aspect-video w-full object-cover"
              />
              <div className="flex items-center justify-between px-6 py-4">
                <p className="font-display text-xl font-light italic text-white">{active.couple}</p>
                <button
                  type="button"
                  aria-label="Fermer"
                  onClick={() => setLightbox(null)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-anthracite-700 text-white/70 transition-colors hover:border-terracotta-500 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
