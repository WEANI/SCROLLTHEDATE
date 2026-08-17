import { Link } from 'react-router'

/**
 * Palette de la clôture — mêmes clés/valeurs par défaut que
 * PayloadSection.PayloadTheme (cf. ce fichier pour le contexte : dérivée du
 * thème du couple, défauts = charte claire d'Edwige & Wilfried).
 */
export interface ClosingTheme {
  bg: string
  border: string
  heading: string
  accent: string
  text: string
}

const DEFAULT_CLOSING_THEME: ClosingTheme = {
  bg: '#FBF7F1',
  border: 'rgba(232, 201, 196, 0.5)',
  heading: '#2E2620',
  accent: '#B9776C',
  text: '#8A7D6D',
}

/**
 * Clôture — skill Étape 5.B.3 : signature Scroll The Date. Page « faire-part »
 * livrée au couple, pas une page marketing du site public : pas de footer
 * commercial (offres/tarifs), une signature discrète suffit.
 */
export default function ClosingSection({
  coupleNames,
  theme,
}: {
  coupleNames: string
  theme?: Partial<ClosingTheme>
}) {
  const t = { ...DEFAULT_CLOSING_THEME, ...theme }
  return (
    <footer className="border-t px-6 py-14 text-center" style={{ borderColor: t.border, background: t.bg }}>
      <Link to="/" className="inline-flex items-center gap-2" aria-label="Scroll The Date — accueil">
        <span className="font-display text-[15px] italic tracking-[0.02em]" style={{ color: t.heading }}>
          SCROLL THE
          <span style={{ color: t.accent }}> DATE</span>
        </span>
      </Link>
      <p className="mx-auto mt-3 max-w-xs text-[12px] font-light leading-[1.6]" style={{ color: t.text }}>
        Créé avec soin par Scroll The Date pour {coupleNames}.
      </p>
    </footer>
  )
}
