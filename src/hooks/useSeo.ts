import { useEffect } from 'react'

/**
 * Domaine des adresses absolues (balise canonical) : celui par lequel le
 * site est appelé — plus d'adresse Railway figée ici (22/10/2026), qui
 * aurait continué de désigner l'ancien domaine une fois scrollthedate.com
 * branché. Le serveur pose la même balise dès le HTML (api/lib/pageMeta.ts),
 * le sitemap et le robots.txt suivent la même règle (api/lib/seoFiles.ts).
 */
const siteOrigin = () => (typeof window === 'undefined' ? '' : window.location.origin)

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
 * pour construire l'URL absolue de la canonical avec le domaine courant.
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
    upsertCanonical(`${siteOrigin()}${path}`)
  }, [title, description, path])
}
