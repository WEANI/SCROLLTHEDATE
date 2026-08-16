import { Link } from 'react-router'

/**
 * Clôture — skill Étape 5.B.3 : signature Scroll The Date. Page « faire-part »
 * livrée au couple, pas une page marketing du site public : pas de footer
 * commercial (offres/tarifs), une signature discrète suffit.
 */
export default function ClosingSection({ coupleNames }: { coupleNames: string }) {
  return (
    <footer className="border-t border-[#E8C9C4]/50 bg-[#FBF7F1] px-6 py-14 text-center">
      <Link to="/" className="inline-flex items-center gap-2" aria-label="Scroll The Date — accueil">
        <span className="font-display text-[15px] italic tracking-[0.02em] text-[#2E2620]">
          SCROLL THE
          <span className="text-[#B9776C]"> DATE</span>
        </span>
      </Link>
      <p className="mx-auto mt-3 max-w-xs text-[12px] font-light leading-[1.6] text-[#8A7D6D]">
        Créé avec soin par Scroll The Date pour {coupleNames}.
      </p>
    </footer>
  )
}
