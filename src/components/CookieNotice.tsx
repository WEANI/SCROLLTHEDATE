import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { X } from 'lucide-react'

const DISMISS_KEY = 'std_cookie_notice_dismissed_v1'

/**
 * Avis cookies — PAS un bandeau de consentement accept/refuse : le site
 * n'utilise aucun traceur non essentiel (aucun script analytics/pub/réseau
 * social, vérifié dans le code — cf. Politique de confidentialité). Le
 * seul mécanisme en jeu est le stockage de session Supabase Auth
 * (localStorage, pas même un cookie HTTP), qui relève de l'exemption
 * CNIL "traceurs strictement nécessaires au service demandé par
 * l'utilisateur" (authentification) — donc PAS de consentement requis par
 * la loi. Proposer un choix accept/refuse ici serait un choix cosmétique
 * sans rien de réel à refuser : exactement le genre d'interface qui
 * affirme une action qu'elle n'exécute pas, ce que ce projet corrige
 * ailleurs (cf. l'audit sur les emails). D'où un simple avis
 * d'information, avec accusé de lecture — pas un dark pattern déguisé en
 * choix.
 *
 * Le jour où un traceur non essentiel est ajouté (analytics, publicité),
 * ce composant devra être remplacé par un vrai recueil de consentement
 * (accept/refuse explicites, refus aussi facile que l'acceptation) —
 * cf. TODO dans Confidentialite.tsx.
 */
export default function CookieNotice() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(DISMISS_KEY)) setVisible(true)
    } catch {
      // Stockage indisponible (navigation privée stricte, etc.) : on
      // affiche quand même l'avis plutôt que de risquer une exception.
      setVisible(true)
    }
  }, [])

  function dismiss() {
    setVisible(false)
    try {
      window.localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* tant pis, l'avis réapparaîtra à la prochaine visite */
    }
  }

  if (!visible) return null

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-xl flex-col gap-3 rounded-2xl border border-anthracite-700 bg-anthracite-900 p-5 shadow-2xl sm:flex-row sm:items-center sm:gap-4"
    >
      <p className="flex-1 text-[13px] leading-[1.6] text-white/70">
        Ce site utilise uniquement des cookies strictement nécessaires à son fonctionnement
        (connexion à votre compte) — aucun traceur publicitaire ou de mesure d'audience.{' '}
        <Link to="/confidentialite#cookies" className="underline underline-offset-2 hover:text-terracotta-300">
          En savoir plus
        </Link>
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-terracotta-500 px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:bg-terracotta-400"
      >
        J'ai compris
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Fermer"
        className="absolute right-3 top-3 text-white/40 hover:text-white/70 sm:hidden"
      >
        <X size={16} />
      </button>
    </div>
  )
}
