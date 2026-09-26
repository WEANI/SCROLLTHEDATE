import { useEffect } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/i18n/LanguageContext'
import { EmptyState, PageSkeleton, StatusBadge } from '@/components/espace/shared'
import { useSelectedProject } from '@/components/espace/ProjectSelection'
import { productPath, projectStatusLabel } from '@/components/espace/utils'

export type EspaceProduct = 'SAVE_THE_DATE' | 'FAIRE_PART'

interface TabDef {
  to: string
  labelKey: string
}

/**
 * Onglets de chaque page produit (cf. échange du 26/09/2026 : « une page
 * dédiée au Save the Date avec des onglets, une page dédiée au Faire-part »).
 * Chaque onglet réutilise la page existante (Projet, Personnalisation,
 * Questionnaire, Rsvp) — elles lisent le projet sélectionné, que cette page
 * cale sur le bon produit avant d'afficher quoi que ce soit.
 */
const TABS: Record<EspaceProduct, TabDef[]> = {
  SAVE_THE_DATE: [
    { to: 'apercu', labelKey: 'espace.productSpace.tabPreview' },
    { to: 'personnalisation', labelKey: 'espace.productSpace.tabPersonalization' },
    { to: 'questionnaire', labelKey: 'espace.productSpace.tabQuestionnaire' },
  ],
  FAIRE_PART: [
    { to: 'apercu', labelKey: 'espace.productSpace.tabPreview' },
    { to: 'questionnaire', labelKey: 'espace.productSpace.tabQuestionnaireFp' },
    { to: 'rsvp', labelKey: 'espace.productSpace.tabRsvp' },
  ],
}

const ORDER_PATH: Record<EspaceProduct, string> = {
  SAVE_THE_DATE: '/save-the-date-digital',
  FAIRE_PART: '/faire-part-digital',
}

export default function ProductSpace({ product }: { product: EspaceProduct }) {
  const { t } = useLanguage()
  const { projects, current, isLoading, setProjectId } = useSelectedProject()
  const owned = projects.filter((p) => p.product === product)
  const isStd = product === 'SAVE_THE_DATE'
  const location = useLocation()
  // Save the Date : « sur mesure » (149 €) = onglet Questionnaire ; « sur un
  // modèle » (99 €) = onglet Personnalisation — jamais les deux (cf. échange
  // du 26/09/2026). Le projet sélectionné décide (`templateSlug` renseigné =
  // sur un modèle).
  const isTemplate = isStd && !!current?.templateSlug
  const tabs = TABS[product].filter((tab) => {
    if (!isStd) return true
    if (tab.to === 'personnalisation') return isTemplate
    if (tab.to === 'questionnaire') return !isTemplate
    return true
  })
  const mismatch = owned.length > 0 && current?.product !== product

  // Cale le projet sélectionné sur ce produit (le plus récent) — sans ça, les
  // onglets afficheraient le projet de l'AUTRE produit.
  useEffect(() => {
    if (mismatch) setProjectId(owned[0].id)
  }, [mismatch, owned, setProjectId])

  if (isLoading || mismatch) return <PageSkeleton />

  // URL d'un onglet masqué pour ce projet → onglet d'ouverture.
  const currentTab = location.pathname.split('/')[3]
  if (currentTab && !tabs.some((tab) => tab.to === currentTab)) {
    return <Navigate to={`${productPath(product)}/apercu`} replace />
  }

  if (owned.length === 0) {
    return (
      <EmptyState
        title={t(isStd ? 'espace.productSpace.notOwnedTitleSaveTheDate' : 'espace.productSpace.notOwnedTitleFairePart')}
        description={t(isStd ? 'espace.productSpace.notOwnedDescSaveTheDate' : 'espace.productSpace.notOwnedDescFairePart')}
        action={
          <Link
            to={ORDER_PATH[product]}
            className="mt-2 rounded-full bg-terracotta-500 px-6 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-terracotta-400"
          >
            {t('espace.productSpace.notOwnedCta')}
          </Link>
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-medium tracking-[-0.01em] text-ink">
            {t(isStd ? 'espace.productSpace.titleSaveTheDate' : 'espace.productSpace.titleFairePart')}
          </h1>
          <p className="mt-1 text-[15px] text-neutral-500">
            {t(isStd ? 'espace.productSpace.subtitleSaveTheDate' : 'espace.productSpace.subtitleFairePart')}
          </p>
        </div>
        {current && <StatusBadge tone="info">{projectStatusLabel(current.status, t)}</StatusBadge>}
      </div>

      <nav aria-label={t('espace.productSpace.tabsAria')} className="-mx-1 flex gap-1 overflow-x-auto border-b border-neutral-200 px-1">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={`${productPath(product)}/${tab.to}`}
            className={({ isActive }) =>
              cn(
                '-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-[13.5px] font-medium transition-colors',
                isActive
                  ? 'border-terracotta-500 text-terracotta-500'
                  : 'border-transparent text-neutral-500 hover:text-ink',
              )
            }
          >
            {t(tab.labelKey)}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  )
}

/**
 * Anciennes URL (/espace/projet, /espace/questionnaire, /espace/rsvp,
 * /espace/personnalisation) → onglet équivalent de la page produit du projet
 * sélectionné, ancre (#video, #medias…) conservée. Aucun lien existant
 * (notifications, e-mails, boutons du tableau de bord) ne casse.
 */
export function LegacyRedirect({ tab }: { tab: string }) {
  const { projects, current, isLoading } = useSelectedProject()
  const location = useLocation()
  if (isLoading) return <PageSkeleton />
  const product: EspaceProduct | null =
    tab === 'rsvp'
      ? 'FAIRE_PART'
      : tab === 'personnalisation'
        ? 'SAVE_THE_DATE'
        : ((current?.product ?? projects[0]?.product) as EspaceProduct | undefined) ?? null
  if (!product) return <Navigate to="/espace" replace />
  return <Navigate to={`${productPath(product)}/${tab}${location.hash}`} replace />
}
