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
import {
  EmptyState,
  ErrorState,
  Kicker,
  PageSkeleton,
  SectionCard,
  StatusBadge,
} from '@/components/espace/shared'
import { formatDate } from '@/components/espace/utils'

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

const ATTENDING_LABEL: Record<string, { label: string; tone: 'success' | 'error' | 'pending' }> = {
  yes: { label: 'Présent', tone: 'success' },
  no: { label: 'Absent', tone: 'error' },
  maybe: { label: 'Peut-être', tone: 'pending' },
}

type FilterValue = 'all' | 'yes' | 'no' | 'maybe'

function exportCsv(responses: RsvpResponse[]) {
  const headers = ['Nom', 'Email', 'Réponse', 'Adultes', 'Enfants', 'Allergies', 'Chanson', 'Message', 'Date']
  const rows = responses.map((r) => [
    r.guestName,
    r.email ?? '',
    ATTENDING_LABEL[r.attending]?.label ?? r.attending,
    String(r.adults),
    String(r.children),
    r.allergies ?? '',
    r.song ?? '',
    r.message ?? '',
    formatDate(r.createdAt),
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
  const { data, isLoading, isError, refetch } = trpc.rsvp.listMine.useQuery()
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

  if (isLoading) return <PageSkeleton />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-medium tracking-[-0.01em] text-ink">
          Réponses RSVP
        </h1>
        <p className="mt-1 text-[15px] text-neutral-500">
          Suivez les réponses de vos invités en temps réel.
        </p>
      </div>

      {/* Compteurs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <CountCard label="Réponses" value={counts.total} tone="info" />
        <CountCard label="Présents" value={counts.yes} tone="success" />
        <CountCard label="Absents" value={counts.no} tone="error" />
        <CountCard label="Adultes" value={counts.adults} tone="pending" />
        <CountCard label="Enfants" value={counts.children} tone="pending" />
      </div>

      {responses.length === 0 ? (
        <EmptyState
          title="Aucune réponse pour le moment"
          description="Les réponses de vos invités apparaîtront ici dès qu'ils auront rempli le formulaire RSVP de votre faire-part."
        />
      ) : (
        <SectionCard className="!p-0 overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-2">
              <Kicker className="!text-neutral-500">Filtrer</Kicker>
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
                  {v === 'all' ? 'Tous' : ATTENDING_LABEL[v].label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => exportCsv(responses)}
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-4 py-1.5 text-[12px] font-medium text-neutral-500 transition-colors hover:border-terracotta-500 hover:text-terracotta-500"
            >
              <Download size={14} />
              Exporter CSV
            </button>
          </div>

          {/* Liste */}
          <ul className="divide-y divide-neutral-100">
            <AnimatePresence initial={false}>
              {filtered.map((r) => {
                const att = ATTENDING_LABEL[r.attending]
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
                        <p className="text-[12px] text-neutral-500">{formatDate(r.createdAt)}</p>
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
                                <p className="font-medium text-neutral-500">Allergies / régime</p>
                                <p className="mt-0.5 text-ink">{r.allergies}</p>
                              </div>
                            )}
                            {r.song && (
                              <div>
                                <p className="font-medium text-neutral-500">Chanson souhaitée</p>
                                <p className="mt-0.5 text-ink">{r.song}</p>
                              </div>
                            )}
                            {r.message && (
                              <div>
                                <p className="font-medium text-neutral-500">Message</p>
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
