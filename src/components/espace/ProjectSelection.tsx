import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronsUpDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { trpc } from '@/providers/trpc'
import { PROJECT_STATUS_LABEL, PRODUCT_LABEL } from '@/components/espace/utils'

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
  coupleNames: string | null
  createdAt: string | Date
}

interface ProjectSelectionValue {
  projectId: number | undefined
  setProjectId: (id: number) => void
  projects: ProjectSummary[]
  current: ProjectSummary | undefined
}

const ProjectSelectionContext = createContext<ProjectSelectionValue>({
  projectId: undefined,
  setProjectId: () => {},
  projects: [],
  current: undefined,
})

function storageKey(userId: number) {
  return `scrollthedate-espace-project-${userId}`
}

export function ProjectSelectionProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  const { data } = trpc.projects.myProjects.useQuery(undefined, {
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
    }),
    [selected, setProjectId, projects],
  )

  return <ProjectSelectionContext.Provider value={value}>{children}</ProjectSelectionContext.Provider>
}

export function useSelectedProject() {
  return useContext(ProjectSelectionContext)
}

function projectLabel(p: ProjectSummary) {
  const name = p.coupleNames ?? p.slug
  const product = p.product ? PRODUCT_LABEL[p.product] ?? p.product : null
  return product ? `${name} · ${product}` : name
}

/**
 * Sélecteur affiché dans la sidebar — masqué dès qu'un compte n'a qu'un
 * seul projet (l'immense majorité des vrais clients) : pas de contrôle à
 * expliquer pour un choix qui n'existe pas.
 */
export function ProjectSwitcher() {
  const { projectId, setProjectId, projects, current } = useSelectedProject()
  const [open, setOpen] = useState(false)

  if (projects.length < 2) return null

  return (
    <div className="relative px-3 pb-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-terracotta-300"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-ink">
            {current ? projectLabel(current) : 'Choisir un projet'}
          </p>
          {current && (
            <p className="truncate text-[11px] text-neutral-500">
              {PROJECT_STATUS_LABEL[current.status] ?? current.status}
            </p>
          )}
        </div>
        <ChevronsUpDown size={15} className="shrink-0 text-neutral-500" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <button
              type="button"
              aria-label="Fermer"
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
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-neutral-100',
                    p.id === projectId && 'bg-terracotta-500/[0.06]',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink">{projectLabel(p)}</p>
                    <p className="truncate text-[11px] text-neutral-500">
                      {PROJECT_STATUS_LABEL[p.status] ?? p.status}
                    </p>
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
