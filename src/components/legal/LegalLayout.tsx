import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowLeft } from 'lucide-react'

/**
 * Habillage commun aux 3 pages légales (Mentions légales, CGV,
 * Confidentialité) — reste dans le Layout public (Navbar/Footer), charte
 * identique au reste du site (anthracite/terracotta, Fraunces), mais en
 * lecture de texte long : colonne étroite, typographie de prose plutôt que
 * la mise en page marketing du reste des pages publiques.
 */
export default function LegalLayout({
  kicker,
  title,
  lastUpdated,
  children,
}: {
  kicker: string
  title: string
  /** Format libre, ex. "24 août 2026" — affiché tel quel, pas de calcul de date ici. */
  lastUpdated: string
  children: ReactNode
}) {
  return (
    <div className="grain bg-anthracite-950">
      <div className="mx-auto max-w-[720px] px-6 py-20 lg:px-0 lg:py-28">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[13px] font-medium text-white/50 transition-colors hover:text-terracotta-300"
        >
          <ArrowLeft size={14} aria-hidden />
          Retour à l'accueil
        </Link>

        <p className="mt-10 text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-300">
          {kicker}
        </p>
        <h1 className="font-display mt-3 text-[clamp(2rem,5vw,3.2rem)] font-light leading-[1.08] tracking-[-0.015em] text-white">
          {title}
        </h1>
        <p className="mt-4 text-[13px] text-white/40">Dernière mise à jour : {lastUpdated}</p>

        {/* Prose : titres de section discrets, paragraphes lisibles, listes
            avec puce terracotta — pas de composant "prose" générique du
            projet, ces 3 pages sont les seules à avoir besoin de ce
            gabarit de texte long. */}
        <div
          className="mt-14 space-y-8 text-[15px] leading-[1.75] text-white/70
            [&_h2]:font-display [&_h2]:mt-12 [&_h2]:mb-3 [&_h2]:text-[19px] [&_h2]:font-medium [&_h2]:text-white [&_h2]:first:mt-0
            [&_p]:mb-4
            [&_ul]:my-4 [&_ul]:list-none [&_ul]:space-y-2
            [&_li]:relative [&_li]:pl-5
            [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-[0.6em] [&_li]:before:h-1 [&_li]:before:w-1 [&_li]:before:rounded-full [&_li]:before:bg-terracotta-500
            [&_a]:text-terracotta-300 [&_a]:underline [&_a]:underline-offset-2 [&_a]:transition-colors hover:[&_a]:text-terracotta-200
            [&_strong]:font-semibold [&_strong]:text-white/90"
        >
          {children}
        </div>
      </div>
    </div>
  )
}

/** Bloc d'alerte visible — utilisé pour marquer les champs d'identité légale encore en attente (SIRET, RCS…), jamais de valeur inventée à la place. */
export function TodoBlock({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-terracotta-500/30 bg-terracotta-500/10 px-4 py-3 text-[13px] text-terracotta-200">
      ⚠️ {children}
    </p>
  )
}
