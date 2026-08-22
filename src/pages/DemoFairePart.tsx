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
}

const FAIRE_PARTS: FairePartLink[] = [
  {
    slug: 'edwige-wilfried',
    names: 'Edwige & Wilfried',
    date: '21 décembre 2027',
    eyebrow: 'Charte claire · Fraunces & filet or',
    description: 'Compte à rebours, loupe magnétique sur la carte du lieu, sceau de cire pressé',
    accent: '#c9a961',
  },
  {
    slug: 'lea-olivier',
    names: 'Léa & Olivier',
    date: '15 août 2027',
    eyebrow: 'Charte sombre · Ambiance cinéma',
    description: 'Photo qui se reconstitue au scroll, programme en défilement épinglé, hébergements en cascade',
    accent: '#8B1E28',
  },
]

/**
 * Page démo publique — index des faire-part clients livrés, chacun avec sa
 * propre mise en scène bespoke (cf. FairePartEdwigeWilfried.tsx et
 * FairePartLeaOlivier.tsx). Reste dans le Layout public (Navbar/Footer,
 * charte marketing anthracite/terracotta) : ce n'est pas un faire-part en
 * lui-même, juste un sommaire qui y renvoie — d'où le filet de couleur
 * PROPRE À CHAQUE COUPLE sur sa carte plutôt qu'une 3e couleur inventée.
 * Prototypée en HTML autonome puis validée par la cliente avant ce portage.
 */
export default function DemoFairePart() {
  useEffect(() => {
    document.title = 'Faire-parts livrés — Scroll The Date'
  }, [])

  return (
    <section className="mx-auto max-w-[960px] px-6 pb-32 pt-16 sm:pt-20">
      <p className="text-center text-[12px] uppercase tracking-[0.18em] text-terracotta-300">Scroll The Date</p>
      <h1 className="mt-4 text-center font-display text-[34px] italic leading-[1.1] sm:text-[54px]">
        Faire-parts livrés
      </h1>
      <p className="mx-auto mt-4 max-w-[480px] text-center text-[15px] leading-[1.6] text-neutral-500">
        Deux réalisations récentes, chacune avec sa propre mise en scène — parcourez-les comme le feraient vos
        invités.
      </p>

      <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {FAIRE_PARTS.map((fp) => (
          <Link
            key={fp.slug}
            to={`/faire-part/${fp.slug}`}
            className="group relative block overflow-hidden rounded-[20px] border border-anthracite-700 bg-anthracite-900 p-8 transition-all duration-300 ease-out hover:-translate-y-1 sm:p-10"
            style={{ borderColor: undefined }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = fp.accent)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '')}
          >
            <span className="absolute inset-x-0 top-0 h-[3px] opacity-85" style={{ background: fp.accent }} aria-hidden />
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
          </Link>
        ))}
      </div>
    </section>
  )
}
