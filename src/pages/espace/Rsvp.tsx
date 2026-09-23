import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Baby,
  Check,
  ChevronDown,
  Download,
  HelpCircle,
  Users,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { trpc } from '@/providers/trpc'
import { useLanguage } from '@/i18n/LanguageContext'
import {
  EmptyState,
  ErrorState,
  Kicker,
  PageSkeleton,
  SectionCard,
  StatusBadge,
} from '@/components/espace/shared'
import { formatDate } from '@/components/espace/utils'
import { useSelectedProject } from '@/components/espace/ProjectSelection'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RsvpResponse {
  id: number
  guestName: string
  email: string | null
  attending: 'yes' | 'no' | 'maybe'
  adults: number
  children: number
  allergies: string | null
  song: string | null
  message: string | null
  createdAt: Date | string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type T = (key: string) => string
type TArray = (key: string) => string[]

function attendingLabel(value: string, t: T): { label: string; tone: 'success' | 'error' | 'pending' } {
  switch (value) {
    case 'yes':
      return { label: t('espace.rsvp.attendingYes'), tone: 'success' }
    case 'no':
      return { label: t('espace.rsvp.attendingNo'), tone: 'error' }
    default:
      return { label: t('espace.rsvp.attendingMaybe'), tone: 'pending' }
  }
}

type FilterValue = 'all' | 'yes' | 'no' | 'maybe'

function exportCsv(responses: RsvpResponse[], t: T, tArray: TArray, lang: 'fr' | 'en') {
  const headers = tArray('espace.rsvp.csvHeaders')
  const rows = responses.map((r) => [
    r.guestName,
    r.email ?? '',
    attendingLabel(r.attending, t).label,
    String(r.adults),
    String(r.children),
    r.allergies ?? '',
    r.song ?? '',
    r.message ?? '',
    formatDate(r.createdAt, undefined, lang),
  ])
  const csv = [headers, ...rows].map((row) => row.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `rsvp-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Rsvp() {
  const { t, tArray, lang } = useLanguage()
  const { projectId } = useSelectedProject()
  const { data, isLoading, isError, refetch } = trpc.rsvp.listMine.useQuery({ projectId })
  // Le RSVP fait partie du Faire-part digital uniquement — le Save the Date
  // est une page hero + footer sans formulaire de réponse (cf.
  // FairePart.tsx). L'onglet reste visible (grisé) dans la sidebar pour un
  // projet Save the Date (cf. ClientShell.tsx) ; cette page explique
  // pourquoi plutôt que d'afficher un tableau vide sans contexte.
  const projectQuery = trpc.projects.myProject.useQuery({ projectId })
  const [filter, setFilter] = useState<FilterValue>('all')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const responses = (data?.responses ?? []) as RsvpResponse[]

  const counts = useMemo(() => {
    const c = { yes: 0, no: 0, maybe: 0, adults: 0, children: 0, total: responses.length }
    for (const r of responses) {
      if (r.attending === 'yes') {
        c.yes++
        c.adults += r.adults
        c.children += r.children
      } else if (r.attending === 'no') c.no++
      else c.maybe++
    }
    return c
  }, [responses])

  const filtered = useMemo(
    () => (filter === 'all' ? responses : responses.filter((r) => r.attending === filter)),
    [responses, filter],
  )

  if (isLoading || projectQuery.isLoading) return <PageSkeleton />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  if (projectQuery.data && projectQuery.data.product !== 'FAIRE_PART') {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-display text-3xl font-medium tracking-[-0.01em] text-ink">
            {t('espace.rsvp.title')}
          </h1>
        </div>
        <EmptyState
          title={t('espace.rsvp.wrongProductTitle')}
          description={t('espace.rsvp.wrongProductDescription')}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-medium tracking-[-0.01em] text-ink">
          {t('espace.rsvp.title')}
        </h1>
        <p className="mt-1 text-[15px] text-neutral-500">
          {t('espace.rsvp.subtitle')}
        </p>
      </div>

      {/* Compteurs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <CountCard label={t('espace.rsvp.countResponses')} value={counts.total} tone="info" />
        <CountCard label={t('espace.rsvp.countPresent')} value={counts.yes} tone="success" />
        <CountCard label={t('espace.rsvp.countAbsent')} value={counts.no} tone="error" />
        <CountCard label={t('espace.rsvp.countAdults')} value={counts.adults} tone="pending" />
        <CountCard label={t('espace.rsvp.countChildren')} value={counts.children} tone="pending" />
      </div>

      {responses.length === 0 ? (
        <EmptyState
          title={t('espace.rsvp.emptyTitle')}
          description={t('espace.rsvp.emptyDescription')}
        />
      ) : (
        <SectionCard className="!p-0 overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-2">
              <Kicker className="!text-neutral-500">{t('espace.rsvp.filterLabel')}</Kicker>
              {(['all', 'yes', 'no', 'maybe'] as FilterValue[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setFilter(v)}
                  className={cn(
                    'rounded-full px-3 py-1 text-[12px] font-medium transition-colors',
                    filter === v
                      ? 'bg-terracotta-500 text-white'
                      : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200',
                  )}
                >
                  {v === 'all' ? t('espace.rsvp.filterAll') : attendingLabel(v, t).label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => exportCsv(responses, t, tArray, lang)}
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-4 py-1.5 text-[12px] font-medium text-neutral-500 transition-colors hover:border-terracotta-500 hover:text-terracotta-500"
            >
              <Download size={14} />
              {t('espace.rsvp.exportCsv')}
            </button>
          </div>

          {/* Liste */}
          <ul className="divide-y divide-neutral-100">
            <AnimatePresence initial={false}>
              {filtered.map((r) => {
                const att = attendingLabel(r.attending, t)
                const expanded = expandedId === r.id
                const hasDetails = !!(r.allergies || r.song || r.message)
                return (
                  <motion.li
                    key={r.id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => hasDetails && setExpandedId(expanded ? null : r.id)}
                      className={cn(
                        'flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors sm:px-6',
                        hasDetails && 'cursor-pointer hover:bg-neutral-100/40',
                        !hasDetails && 'cursor-default',
                      )}
                    >
                      {/* Icône statut */}
                      <span
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                          att.tone === 'success' && 'bg-[#6FA287]/15 text-[#4d7a62]',
                          att.tone === 'error' && 'bg-[#C0524A]/12 text-[#C0524A]',
                          att.tone === 'pending' && 'bg-[#C98850]/15 text-[#9a6534]',
                        )}
                      >
                        {att.tone === 'success' && <Check size={14} />}
                        {att.tone === 'error' && <X size={14} />}
                        {att.tone === 'pending' && <HelpCircle size={14} />}
                      </span>

                      {/* Nom + date */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold text-ink">{r.guestName}</p>
                        <p className="text-[12px] text-neutral-500">{formatDate(r.createdAt, undefined, lang)}</p>
                      </div>

                      {/* Adultes / enfants */}
                      {r.attending === 'yes' && (r.adults > 1 || r.children > 0) && (
                        <span className="hidden items-center gap-3 text-[12px] text-neutral-500 sm:flex">
                          <span className="inline-flex items-center gap-1">
                            <Users size={13} />
                            {r.adults}
                          </span>
                          {r.children > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <Baby size={13} />
                              {r.children}
                            </span>
                          )}
                        </span>
                      )}

                      {/* Badge */}
                      <StatusBadge tone={att.tone}>{att.label}</StatusBadge>

                      {/* Chevron */}
                      {hasDetails && (
                        <ChevronDown
                          size={16}
                          className={cn(
                            'shrink-0 text-neutral-400 transition-transform',
                            expanded && 'rotate-180',
                          )}
                        />
                      )}
                    </button>

                    {/* Détails (expanded) */}
                    <AnimatePresence>
                      {expanded && hasDetails && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-neutral-100 bg-neutral-100/30 px-5 sm:px-6"
                        >
                          <div className="grid gap-3 py-4 text-[13px] sm:grid-cols-3">
                            {r.allergies && (
                              <div>
                                <p className="font-medium text-neutral-500">{t('espace.rsvp.allergiesLabel')}</p>
                                <p className="mt-0.5 text-ink">{r.allergies}</p>
                              </div>
                            )}
                            {r.song && (
                              <div>
                                <p className="font-medium text-neutral-500">{t('espace.rsvp.songLabel')}</p>
                                <p className="mt-0.5 text-ink">{r.song}</p>
                              </div>
                            )}
                            {r.message && (
                              <div>
                                <p className="font-medium text-neutral-500">{t('espace.rsvp.messageLabel')}</p>
                                <p className="mt-0.5 text-ink">{r.message}</p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </ul>
        </SectionCard>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sous-composant — carte compteur
// ---------------------------------------------------------------------------

function CountCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'success' | 'error' | 'pending' | 'info'
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_8px_32px_rgba(27,27,30,0.08)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">{label}</p>
      <p
        className={cn(
          'font-display mt-2 text-3xl font-medium',
          tone === 'success' && 'text-[#4d7a62]',
          tone === 'error' && 'text-[#C0524A]',
          tone === 'pending' && 'text-[#9a6534]',
          tone === 'info' && 'text-ink',
        )}
      >
        {value}
      </p>
    </div>
  )
}
