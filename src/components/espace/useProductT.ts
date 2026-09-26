import { useCallback } from 'react'
import { useLanguage } from '@/i18n/LanguageContext'
import { useSelectedProject } from '@/components/espace/ProjectSelection'

/**
 * `t` sensible au produit du projet sélectionné : pour un Save the Date,
 * `espace.<section>.<clé>` est remplacé par `espace.std.<section>_<clé>` si
 * cette variante existe (les textes d'origine parlent de « faire-part »),
 * sinon texte d'origine — cf. bloc `std` de fr.ts/en.ts. Ajouté le
 * 26/09/2026 : un client Save the Date lisait « Votre faire-part est
 * approuvé ! ».
 */
export function useProductT() {
  const { t } = useLanguage()
  const { current } = useSelectedProject()
  const isStd = current?.product === 'SAVE_THE_DATE'
  return useCallback(
    (key: string) => {
      if (isStd) {
        const m = key.match(/^espace\.([^.]+)\.(.+)$/)
        if (m) {
          const alt = `espace.std.${m[1]}_${m[2]}`
          const v = t(alt)
          if (v !== alt) return v
        }
      }
      return t(key)
    },
    [t, isStd],
  )
}
