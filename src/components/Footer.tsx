import { Link } from 'react-router'
import { Flag, HeartHandshake, Infinity as InfinityIcon, MessageCircle, ShieldCheck } from 'lucide-react'

const NAVIGATION = [
  { label: 'Concept', href: '/#concept' },
  { label: 'Comment ça marche', href: '/#comment-ca-marche' },
  { label: 'FAQ', href: '/#faq' },
  { label: 'Se connecter', href: '/login' },
]

const OFFRES = [
  { label: 'Faire-part digital — 349 €', href: '/offres' },
  { label: 'Save the Date digital — 149 €', href: '/offres' },
  { label: 'Voir la démo', href: '/demo' },
]

const REASSURANCE = [
  { icon: ShieldCheck, label: 'Paiement sécurisé' },
  { icon: InfinityIcon, label: 'Lien illimité' },
  { icon: HeartHandshake, label: 'Accompagnement humain' },
  { icon: Flag, label: 'Fabriqué en France' },
]

export default function Footer() {
  return (
    <footer className="grain bg-anthracite-950">
      <div className="mx-auto grid max-w-[1440px] gap-12 px-6 py-20 sm:grid-cols-2 lg:grid-cols-4 lg:px-12">
        {/* Wordmark + baseline */}
        <div className="flex flex-col gap-5">
          <Link to="/" aria-label="Félicity — accueil">
            <img src="/logo.svg" alt="Félicity" className="h-9 w-auto" />
          </Link>
          <p className="font-display text-lg font-light italic text-white/70">
            Votre histoire, racontée en images.
          </p>
          <a
            href="https://wa.me/33600000000"
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-anthracite-700 px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] text-white/80 transition-colors hover:border-terracotta-500 hover:text-terracotta-300"
          >
            <MessageCircle size={14} className="text-terracotta-500" />
            Nous écrire sur WhatsApp
          </a>
        </div>

        {/* Navigation */}
        <nav aria-label="Navigation pied de page">
          <h3 className="mb-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-300">
            Navigation
          </h3>
          <ul className="flex flex-col gap-3">
            {NAVIGATION.map((item) => (
              <li key={item.label}>
                <Link
                  to={item.href}
                  className="text-sm text-white/70 transition-colors hover:text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Offres */}
        <nav aria-label="Nos offres">
          <h3 className="mb-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-300">
            Offres
          </h3>
          <ul className="flex flex-col gap-3">
            {OFFRES.map((item) => (
              <li key={item.label}>
                <Link
                  to={item.href}
                  className="text-sm text-white/70 transition-colors hover:text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Réassurance */}
        <div>
          <h3 className="mb-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-300">
            Réassurance
          </h3>
          <ul className="flex flex-col gap-3">
            {REASSURANCE.map((item) => (
              <li key={item.label} className="flex items-center gap-3 text-sm text-white/70">
                <item.icon size={16} className="shrink-0 text-terracotta-500" />
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-anthracite-700/50">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-4 px-6 py-6 text-xs text-white/50 sm:flex-row lg:px-12">
          <p>© {new Date().getFullYear()} Félicity — félicity.fr</p>
          <div className="flex gap-6">
            <Link to="/mentions-legales" className="transition-colors hover:text-white/80">
              Mentions légales
            </Link>
            <Link to="/cgv" className="transition-colors hover:text-white/80">
              CGV
            </Link>
            <Link to="/confidentialite" className="transition-colors hover:text-white/80">
              Confidentialité
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
