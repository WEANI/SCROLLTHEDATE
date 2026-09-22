import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { fr } from './translations/fr'
import { en } from './translations/en'

/**
 * Site bilingue FR/EN — cf. échange du 22/09/2026. Solution maison légère
 * (pas de dépendance type react-i18next) : 2 langues, sans pluralisation
 * complexe, cohérent avec le reste du projet (peu d'abstraction d'état).
 *
 * Portée actuelle (Phase 1) : Navbar/Footer + page d'accueil, cf.
 * translations/fr.ts. Les pages pas encore traduites (Offres, tunnel de
 * commande, espace client…) restent en français quel que soit `lang` — le
 * sélecteur reste visible et fonctionnel partout, mais ces pages n'appellent
 * simplement pas encore `t()`.
 */
export type Lang = 'fr' | 'en'

const DICTIONARIES = { fr, en }
const STORAGE_KEY = 'stdLang'

/**
 * Détection à la 1ère visite — langue du NAVIGATEUR (`navigator.language`),
 * pas de géolocalisation IP (cf. échange du 22/09/2026 : gratuit, sans
 * service tiers, détecte la vraie préférence de la personne plutôt que son
 * pays). Repli `'en'` si aucune langue du navigateur ne commence par `fr`,
 * sinon `'fr'`.
 */
function detectBrowserLang(): Lang {
  if (typeof navigator === 'undefined') return 'fr'
  const langs = navigator.languages && navigator.languages.length > 0 ? navigator.languages : [navigator.language]
  return langs.some((l) => l?.toLowerCase().startsWith('fr')) ? 'fr' : 'en'
}

function initialLang(): Lang {
  if (typeof window === 'undefined') return 'fr'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'fr' || stored === 'en') return stored
  return detectBrowserLang()
}

/** Résolution par chemin à points (`'home.hero.title'`) dans un dictionnaire imbriqué. */
function resolve(dict: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, dict)
}

interface LanguageContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  /**
   * Résolution par chemin à points. Repli sur le dictionnaire FRANÇAIS si la
   * clé est absente côté langue courante (filet de sécurité pour les pages
   * pas encore traduites, cf. doc en tête de fichier) — jamais de texte
   * manquant. Repli ultime sur la clé brute (erreur de frappe visible).
   */
  t: (key: string) => string
  /**
   * Variante de `t()` pour les clés dont la VALEUR est un tableau de chaînes
   * (ex. `home.concept.titleWords`, un titre découpé mot par mot pour une
   * animation GSAP) — même résolution/repli que `t()`, tableau vide en tout
   * dernier recours (jamais `undefined`, sans quoi `.map()` planterait côté
   * appelant).
   */
  tArray: (key: string) => string[]
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  const setLang = (next: Lang) => {
    setLangState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* localStorage indisponible (navigation privée stricte…) — le choix ne survivra pas au rechargement, sans bloquer le changement de langue en cours de session. */
    }
  }

  // Pose `lang` sur `<html>` — accessibilité/SEO, cf. `<html lang="fr">` figé
  // dans index.html jusqu'ici.
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const t = useMemo(() => {
    return (key: string): string => {
      const value = resolve(DICTIONARIES[lang], key)
      if (typeof value === 'string') return value
      const frValue = resolve(DICTIONARIES.fr, key)
      if (typeof frValue === 'string') return frValue
      return key
    }
  }, [lang])

  const tArray = useMemo(() => {
    return (key: string): string[] => {
      const value = resolve(DICTIONARIES[lang], key)
      if (Array.isArray(value)) return value as string[]
      const frValue = resolve(DICTIONARIES.fr, key)
      if (Array.isArray(frValue)) return frValue as string[]
      return []
    }
  }, [lang])

  const value = useMemo<LanguageContextValue>(() => ({ lang, setLang, t, tArray }), [lang, t, tArray])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage() doit être utilisé sous <LanguageProvider>')
  return ctx
}
