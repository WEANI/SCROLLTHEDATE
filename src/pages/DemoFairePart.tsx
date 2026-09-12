import { useEffect } from 'react'
import { Link } from 'react-router'

type FairePartLink = {
  slug: string
  names: string
  date: string
  eyebrow: string
  description: string
  /** Filet en tête de carte + accent du CTA — couleur propre à ce couple, pas la charte marketing terracotta. */
  accent: string
  /** 1ère image de la séquence de frames du hero (l'enveloppe) — cf. doc de HERO_VIDEO dans demoFairePart1Content.ts/demoFairePart2Content.ts. */
  poster: string
}

const FAIRE_PARTS: FairePartLink[] = [
  {
    slug: 'demo-faire-part-1',
    names: 'Demo Faire Part 1',
    date: '21 décembre 2027',
    eyebrow: 'Charte claire · Fraunces & filet or',
    description: 'Compte à rebours, loupe magnétique sur la carte du lieu, sceau de cire pressé',
    accent: '#c9a961',
    poster: '/demo-faire-part-1-frames/00001.jpg',
  },
  {
    slug: 'demo-faire-part-2',
    names: 'Demo Faire Part 2',
    date: '15 août 2027',
    eyebrow: 'Charte sombre · Ambiance cinéma',
    description: 'Photo qui se reconstitue au scroll, programme en défilement épinglé, hébergements en cascade',
    accent: '#8B1E28',
    poster: '/demo-faire-part-2-frames/00001.jpg',
  },
]

/**
 * Page démo publique — index des 2 faire-part de démonstration (cf. doc de
 * DemoFairePart1.tsx/DemoFairePart2.tsx), chacun avec sa propre mise en
 * scène bespoke. Reste dans le Layout public (Navbar/Footer, charte
 * marketing anthracite/terracotta) : ce n'est pas un faire-part en
 * lui-même, juste un sommaire qui y renvoie — d'où le filet de couleur
 * PROPRE À CHAQUE MISE EN SCÈNE sur sa carte plutôt qu'une 3e couleur
 * inventée. Les prénoms affichés SUR chaque démo (pas ici, cf. `names`
 * volontairement générique) se règlent depuis Réglages → Faire-part démo.
 */
export default function DemoFairePart() {
  useEffect(() => {
    document.title = 'Demo faire-parts — Scroll The Date'
  }, [])

  return (
    <section className="mx-auto max-w-[960px] px-6 pb-32 pt-16 sm:pt-20">
      <p className="text-center text-[12px] uppercase tracking-[0.18em] text-terracotta-300">Scroll The Date</p>
      <h1 className="mt-4 text-center font-display text-[34px] italic leading-[1.1] sm:text-[54px]">
        Demo faire-parts
      </h1>
      <p className="mx-auto mt-4 max-w-[480px] text-center text-[15px] leading-[1.6] text-neutral-500">
        Deux exemples de faire-parts, chacun avec sa propre mise en scène — parcourez-les comme le feraient vos
        invités.
      </p>

      <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {FAIRE_PARTS.map((fp) => (
          <Link
            key={fp.slug}
            to={`/faire-part/${fp.slug}`}
            className="group relative block overflow-hidden rounded-[20px] border border-anthracite-700 bg-anthracite-900 transition-all duration-300 ease-out hover:-translate-y-1"
            style={{ borderColor: undefined }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = fp.accent)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '')}
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden">
              <img
                src={fp.poster}
                alt=""
                className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                loading="lazy"
              />
              <span
                className="absolute inset-0 bg-gradient-to-t from-anthracite-950/80 via-anthracite-950/10 to-transparent"
                aria-hidden
              />
              <span className="absolute inset-x-0 top-0 h-[3px] opacity-85" style={{ background: fp.accent }} aria-hidden />
            </div>
            <div className="p-8 sm:p-10">
              <p className="text-[11px] uppercase tracking-[0.14em]" style={{ color: fp.accent }}>
                {fp.eyebrow}
              </p>
              <p className="mt-3.5 font-display text-[30px] italic leading-[1.15]">{fp.names}</p>
              <p className="mt-2 text-[14px] text-neutral-500">{fp.date}</p>
              <p className="mt-1 text-[13px] text-neutral-500">{fp.description}</p>
              <span className="mt-7 inline-flex items-center gap-2 text-[13px] font-medium">
                Voir le faire-part
                <span
                  className="transition-transform duration-300 group-hover:translate-x-1"
                  style={{ color: fp.accent }}
                  aria-hidden
                >
                  →
                </span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
