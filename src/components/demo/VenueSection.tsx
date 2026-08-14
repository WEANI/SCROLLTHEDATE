import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { BedDouble, ExternalLink, MapPin, TrainFront } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DemoTemplate } from './templates'
import { MAPS_URL, SECTION_THEMES, VENUE_ADDRESS } from './templates'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const STAYS = [
  {
    name: 'Hôtel du Port',
    distance: '12 km',
    note: 'Double à partir de 110 € — code « ANNA-THEO ».',
    url: 'https://www.google.com/maps/search/?api=1&query=H%C3%B4tel+du+Port',
  },
  {
    name: 'Gîte les Bruyères',
    distance: '4 km',
    note: 'Idéal familles, 6 couchages, réservé jusqu’au lundi.',
    url: 'https://www.google.com/maps/search/?api=1&query=G%C3%AEte+les+Bruy%C3%A8res',
  },
  {
    name: 'Camping municipal',
    distance: '6 km',
    note: 'Emplacements & mobil-homes, navette le soir.',
    url: 'https://www.google.com/maps/search/?api=1&query=Camping+municipal+Saint-R%C3%A9my-de-Provence',
  },
]

/** Section 5 — Lieu & hébergements (split photo/carte + cards). */
export default function VenueSection({ template }: { template: DemoTemplate }) {
  const t = SECTION_THEMES[template]
  const rootRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      // Parallaxes opposées : photo y:-40→40, carte y:40→-40
      gsap.fromTo(
        '.venue-photo',
        { y: -40 },
        {
          y: 40,
          ease: 'none',
          scrollTrigger: { trigger: rootRef.current, start: 'top bottom', end: 'bottom top', scrub: true },
        },
      )
      gsap.fromTo(
        '.venue-map',
        { y: 40 },
        {
          y: -40,
          ease: 'none',
          scrollTrigger: { trigger: rootRef.current, start: 'top bottom', end: 'bottom top', scrub: true },
        },
      )
      // Cards hébergements : reveal stagger 0.1s
      gsap.fromTo(
        '.stay-card',
        { y: 28, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.1,
          duration: 0.7,
          ease: 'power3.out',
          scrollTrigger: { trigger: '.stay-list', start: 'top 80%' },
        },
      )
    },
    { scope: rootRef },
  )

  return (
    <section
      ref={rootRef}
      className={cn(
        'relative overflow-hidden py-28 transition-colors [transition-duration:600ms] lg:py-48',
        t.section,
      )}
      aria-label="Lieu et hébergements"
    >
      <div className="mx-auto grid max-w-[1440px] items-center gap-14 px-6 lg:grid-cols-2 lg:gap-20 lg:px-12">
        {/* Colonne visuels */}
        <div className="flex flex-col gap-6">
          <div className="overflow-hidden rounded-[6px]">
            <img
              src="/venue.jpg"
              alt="Le Domaine de Varenne au crépuscule, guirlandes lumineuses"
              loading="lazy"
              className="venue-photo aspect-[16/10] w-full scale-[1.12] object-cover will-change-transform"
            />
          </div>
          <a
            href={MAPS_URL}
            target="_blank"
            rel="noreferrer"
            className="group relative block overflow-hidden rounded-[6px]"
            aria-label="Ouvrir l'itinéraire dans Google Maps"
          >
            <img
              src="/map-stylized.jpg"
              alt="Carte stylisée du domaine et des alentours"
              loading="lazy"
              className="venue-map aspect-[16/9] w-full scale-[1.12] object-cover will-change-transform"
            />
            <span className="absolute inset-0 flex items-center justify-center gap-2 bg-anthracite-950/0 text-[12px] font-semibold uppercase tracking-[0.14em] text-white opacity-0 transition-all duration-300 group-hover:bg-anthracite-950/45 group-hover:opacity-100">
              <MapPin size={15} aria-hidden /> Ouvrir dans Maps
            </span>
          </a>
        </div>

        {/* Colonne infos */}
        <div>
          <p className={cn('text-[11px] font-semibold uppercase tracking-[0.18em]', t.kicker)}>
            Le lieu
          </p>
          <h2
            className={cn(
              'font-display mt-4 text-[clamp(2.4rem,5vw,4.5rem)] font-light leading-[1.05] tracking-[-0.015em]',
              t.heading,
            )}
          >
            {t.condensed ? (
              "S'y rendre & dormir."
            ) : (
              <>
                S'y rendre <em className="italic text-terracotta-300">&</em> dormir.
              </>
            )}
          </h2>
          <p className={cn('mt-5 flex items-start gap-2.5 text-[15px] leading-[1.65]', t.body)}>
            <MapPin size={17} strokeWidth={1.5} className="mt-0.5 shrink-0 text-terracotta-500" aria-hidden />
            {VENUE_ADDRESS}
          </p>
          <p className={cn('mt-4 flex items-start gap-2.5 text-[14px] leading-[1.6]', t.muted)}>
            <TrainFront size={17} strokeWidth={1.5} className="mt-0.5 shrink-0 text-terracotta-500" aria-hidden />
            Navette depuis la gare de Varenne à 14h30 et 15h00.
          </p>

          <ul className="stay-list mt-10 flex flex-col gap-4">
            {STAYS.map((stay) => (
              <li key={stay.name} className="stay-card">
                <a
                  href={stay.url}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    'group flex items-center gap-4 rounded-[8px] p-5 transition-all duration-300 hover:translate-x-1 hover:border-terracotta-500',
                    t.card,
                  )}
                >
                  <BedDouble size={20} strokeWidth={1.5} className="shrink-0 text-terracotta-500" aria-hidden />
                  <span className="flex-1">
                    <span className={cn('flex flex-wrap items-baseline gap-x-3', t.heading)}>
                      <span className="font-display text-[1.15rem] font-medium">{stay.name}</span>
                      <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-terracotta-400">
                        {stay.distance}
                      </span>
                    </span>
                    <span className={cn('mt-1 block text-[13px] leading-[1.5]', t.muted)}>{stay.note}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-terracotta-400 transition-colors group-hover:text-terracotta-300">
                    Réserver <ExternalLink size={12} aria-hidden />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
