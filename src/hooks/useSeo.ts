import { useEffect } from 'react'

/**
 * Domaine canonique utilisé pour les URLs absolues (balises canonical,
 * sitemap.xml). scrollthedate.fr/.com ne résolvent pas encore en DNS
 * (cf. audit SEO du 27/08/2026, action P0 #1 — brancher un vrai domaine) :
 * pointé sur le sous-domaine Railway actuel, seul domaine qui sert
 * réellement le site aujourd'hui. À mettre à jour ici UNE FOIS le domaine
 * définitif branché — garder synchronisé avec public/robots.txt et
 * public/sitemap.xml (mêmes valeurs, dupliquées côté fichiers statiques
 * faute de pouvoir importer une constante TS dans du XML/texte brut).
 */
export const SITE_URL = 'https://scrollthedate-production.up.railway.app'

function upsertMeta(name: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('name', name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertCanonical(href: string) {
  let el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/**
 * Pose title/meta description/canonical pour une page publique — corrige
 * le constat de l'audit SEO du 27/08/2026 : title et description
 * identiques sur `/` et `/offres` (repli sur les valeurs par défaut
 * d'index.html, jamais surchargées), et aucune balise canonical nulle
 * part sur le site. `path` = chemin de la route (ex. "/offres"), utilisé
 * pour construire l'URL absolue de la canonical avec `SITE_URL`.
 *
 * N'écrase rien au démontage (pas de fonction de nettoyage) : contrairement
 * à FairePart.tsx (page rendue dans un contexte où "revenir à un titre
 * neutre" a du sens), chaque route publique pose ses propres title/
 * description/canonical au montage — la prochaine page visitée les
 * réécrira de toute façon via son propre appel à ce hook.
 */
export function useSeo({ title, description, path }: { title: string; description: string; path: string }) {
  useEffect(() => {
    document.title = title
    upsertMeta('description', description)
    upsertCanonical(`${SITE_URL}${path}`)
  }, [title, description, path])
}
