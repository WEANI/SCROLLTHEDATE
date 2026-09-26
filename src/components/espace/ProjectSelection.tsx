import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronsUpDown, Check } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { trpc } from '@/providers/trpc'
import { useLanguage } from '@/i18n/LanguageContext'
import { projectStatusLabel, productLabel, productPath } from '@/components/espace/utils'

/**
 * Sélecteur de projet — l'espace client supposait un seul projet actif par
 * compte (`findCurrentProject` = le plus récent, côté serveur) : correct
 * pour un vrai client (un mariage, une commande), mais un même compte peut
 * réellement accumuler plusieurs projets (plusieurs commandes au fil du
 * temps, Save the Date puis Faire-part…) — cas rencontré en test le
 * 06/09/2026, où les scénarios envoyés sur un projet plus ancien restaient
 * invisibles, le dashboard résolvant toujours vers le plus récent des trois.
 *
 * `projectId` = `undefined` tant qu'aucun choix n'est résolu (liste pas
 * encore chargée, ou compte à un seul projet) : chaque appel tRPC qui
 * l'accepte en option retombe alors sur le plus récent côté serveur — même
 * résultat qu'avant ce composant pour l'immense majorité des comptes.
 */

export interface ProjectSummary {
  id: number
  slug: string
  status: string
  product: string | null
  /** Renseigné = Save the Date « sur un modèle » (99 €) ; null = « sur mesure » (149 €, questionnaire + scénarios). */
  templateSlug: string | null
  coupleNames: string | null
  createdAt: string | Date
}

interface ProjectSelectionValue {
  projectId: number | undefined
  setProjectId: (id: number) => void
  projects: ProjectSummary[]
  current: ProjectSummary | undefined
  /** Liste des projets pas encore chargée — distingue « aucun projet » de « pas encore su ». */
  isLoading: boolean
}

const ProjectSelectionContext = createContext<ProjectSelectionValue>({
  projectId: undefined,
  setProjectId: () => {},
  projects: [],
  current: undefined,
  isLoading: false,
})

function storageKey(userId: number) {
  return `scrollthedate-espace-project-${userId}`
}

export function ProjectSelectionProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  const { data, isLoading } = trpc.projects.myProjects.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 60_000,
  })
  const projects = useMemo(() => data ?? [], [data])
  // Choix explicite de l'utilisateur pour CETTE session (via le switcher) —
  // `null` tant qu'il n'a rien choisi, auquel cas on retombe sur le choix
  // mémorisé (localStorage) puis sur le plus récent. Dérivé (`useMemo`),
  // pas un `useEffect` + `setState` : la lecture de localStorage est
  // synchrone et sans effet de bord réel, pas besoin d'un aller-retour de
  // rendu supplémentaire pour la prendre en compte.
  const [override, setOverride] = useState<number | null>(null)

  const stored = useMemo<number | null>(() => {
    if (!user) return null
    try {
      const raw = window.localStorage.getItem(storageKey(user.id))
      return raw ? Number(raw) : null
    } catch {
      return null
    }
  }, [user])

  // Le choix mémorisé/explicite ne s'applique que s'il correspond encore à
  // un projet de CE compte (localStorage est partagé par navigateur, pas
  // par compte) — sinon le plus récent (déjà en tête, l'API trie par date
  // décroissante).
  const selected = useMemo(() => {
    if (override != null && projects.some((p) => p.id === override)) return override
    if (stored != null && projects.some((p) => p.id === stored)) return stored
    return projects[0]?.id
  }, [override, stored, projects])

  const setProjectId = useCallback(
    (id: number) => {
      setOverride(id)
      if (!user) return
      try {
        window.localStorage.setItem(storageKey(user.id), String(id))
      } catch {
        /* stockage indisponible — ignorer */
      }
    },
    [user],
  )

  const value = useMemo<ProjectSelectionValue>(
    () => ({
      projectId: selected,
      setProjectId,
      projects,
      current: projects.find((p) => p.id === selected),
      isLoading,
    }),
    [selected, setProjectId, projects, isLoading],
  )

  return <ProjectSelectionContext.Provider value={value}>{children}</ProjectSelectionContext.Provider>
}

export function useSelectedProject() {
  return useContext(ProjectSelectionContext)
}

function projectLabel(p: ProjectSummary, t: (key: string) => string) {
  const name = p.coupleNames ?? p.slug
  const product = p.product ? productLabel(p.product, t) : null
  return product ? `${name} · ${product}` : name
}

/**
 * Carte « projet sélectionné » en haut de la sidebar — toujours visible (même
 * avec un seul projet) et volontairement très marquée (fond terracotta) : le
 * client doit voir d'un coup d'œil sur quel projet il travaille (cf. échange
 * du 26/09/2026). À partir de 2 projets, la carte ouvre la liste de choix ;
 * choisir un projet depuis une page produit emmène sur la page de SON produit.
 */
export function ProjectSwitcher() {
  const { t } = useLanguage()
  const { projectId, setProjectId, projects, current } = useSelectedProject()
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  if (!current) return null
  const canSwitch = projects.length > 1

  const card = (
    <>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
          {t('espace.projectSwitcher.selected')}
        </p>
        <p className="mt-0.5 truncate text-[15px] font-semibold text-white">{current.coupleNames ?? current.slug}</p>
        <p className="mt-0.5 truncate text-[11.5px] text-white/85">
          {current.product ? productLabel(current.product, t) : ''} · {projectStatusLabel(current.status, t)}
        </p>
      </div>
      {canSwitch && <ChevronsUpDown size={16} className="shrink-0 text-white/80" />}
    </>
  )

  return (
    <div className="relative px-3 pb-1">
      {canSwitch ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-2 rounded-2xl bg-terracotta-500 px-4 py-3 text-left shadow-[0_6px_18px_rgba(200,90,60,0.28)] transition-colors hover:bg-terracotta-400"
        >
          {card}
        </button>
      ) : (
        <div className="flex w-full items-center gap-2 rounded-2xl bg-terracotta-500 px-4 py-3 shadow-[0_6px_18px_rgba(200,90,60,0.28)]">
          {card}
        </div>
      )}

      <AnimatePresence>
        {open && canSwitch && (
          <>
            <button
              type="button"
              aria-label={t('espace.projectSwitcher.closeAria')}
              className="fixed inset-0 z-30 cursor-default"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-x-3 top-full z-40 mt-1.5 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-[0_8px_32px_rgba(27,27,30,0.12)]"
            >
              {projects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setProjectId(p.id)
                    setOpen(false)
                    if (/^\/espace\/(save-the-date|faire-part)/.test(location.pathname)) {
                      navigate(`${productPath(p.product)}/apercu`)
                    }
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-neutral-100',
                    p.id === projectId && 'bg-terracotta-500/[0.06]',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink">{projectLabel(p, t)}</p>
                    <p className="truncate text-[11px] text-neutral-500">{projectStatusLabel(p.status, t)}</p>
                  </div>
                  {p.id === projectId && <Check size={14} className="shrink-0 text-terracotta-500" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
