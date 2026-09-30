import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Baby, Eye, Heart, Music, UtensilsCrossed, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { trpc } from '@/providers/trpc'
import { useLanguage } from '@/i18n/LanguageContext'
import { useProductT } from '@/components/espace/useProductT'
import { EmptyState, ErrorState, PageSkeleton, SectionCard } from '@/components/espace/shared'
import { daysUntil, formatDate } from '@/components/espace/utils'
import { useSelectedProject } from '@/components/espace/ProjectSelection'

/**
 * Statistiques côté client — pensées pour le plaisir du couple plus que
 * pour l'analyse (cf. échange du 30/09/2026) : ce que les invités ont
 * répondu, et combien de fois leur page a été ouverte. Les ouvertures
 * viennent de `views.myProjectViews` (table `inviteViews`, aucune donnée
 * personnelle — cf. db/schema.ts) ; tout le reste sort des réponses RSVP
 * déjà en base.
 */

interface RsvpRow {
  attending: 'yes' | 'no' | 'maybe'
  adults: number
  children: number
  allergies: string | null
  song: string | null
  message: string | null
  guestName: string
  createdAt: Date | string
}

/** Compte les occurrences d'un champ libre (chanson, régime) — les 6 plus fréquentes. */
function topOf(values: (string | null)[], limit = 6) {
  const counts = new Map<string, number>()
  for (const raw of values) {
    const v = (raw ?? '').trim()
    if (!v) continue
    const key = v.length > 60 ? `${v.slice(0, 60)}…` : v
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit)
}

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = 'ink',
}: {
  icon: typeof Users
  label: string
  value: string
  detail?: string
  tone?: 'ink' | 'terracotta' | 'info'
}) {
  return (
    <SectionCard className="flex flex-col gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-terracotta-500/10 text-terracotta-500">
        <Icon size={18} />
      </span>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">{label}</p>
        <p
          className={cn(
            'font-display mt-1.5 text-4xl font-medium tabular-nums',
            tone === 'terracotta' && 'text-terracotta-500',
            tone === 'info' && 'text-[#2F6F8F]',
          )}
        >
          {value}
        </p>
        {detail && <p className="mt-1 text-[13px] text-neutral-500">{detail}</p>}
      </div>
    </SectionCard>
  )
}

/** Barre horizontale d'un palmarès (chanson, régime) — la valeur est toujours écrite, jamais seulement encodée par la longueur. */
function RankRow({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-4">
        <span className="min-w-0 truncate text-[14px] text-ink">{label}</span>
        <span className="shrink-0 text-[13px] font-semibold tabular-nums text-neutral-500">{value}</span>
      </div>
      <span className="block h-2 overflow-hidden rounded-full bg-neutral-200">
        <motion.span
          className="block h-full rounded-full bg-terracotta-500"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: Math.max(0.04, value / max) }}
          style={{ originX: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </span>
    </li>
  )
}

export default function Statistiques() {
  const { t, lang } = useLanguage()
  const tp = useProductT()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { projectId } = useSelectedProject()
  const projectQuery = trpc.projects.myProject.useQuery({ projectId }, { enabled: isAuthenticated })
  const rsvpQuery = trpc.rsvp.listMine.useQuery({ projectId }, { enabled: isAuthenticated, retry: false })
  const viewsQuery = trpc.views.myProjectViews.useQuery({ projectId }, { enabled: isAuthenticated, retry: false })

  const project = projectQuery.data ?? null
  const responses = useMemo(() => (rsvpQuery.data?.responses ?? []) as RsvpRow[], [rsvpQuery.data])
  const views = viewsQuery.data ?? null

  const counts = useMemo(() => {
    const c = { yes: 0, no: 0, maybe: 0, adults: 0, children: 0, messages: 0 }
    for (const r of responses) {
      if (r.attending === 'yes') {
        c.yes++
        c.adults += r.adults
        c.children += r.children
      } else if (r.attending === 'no') c.no++
      else c.maybe++
      if ((r.message ?? '').trim()) c.messages++
    }
    return c
  }, [responses])

  const songs = useMemo(() => topOf(responses.map((r) => r.song)), [responses])
  const diets = useMemo(() => topOf(responses.map((r) => r.allergies)), [responses])
  const lastMessage = useMemo(
    () => [...responses].reverse().find((r) => (r.message ?? '').trim()),
    [responses],
  )
  const countdown = daysUntil(project?.weddingDate)
  const isLive = project?.status === 'DELIVERED'

  if (authLoading || projectQuery.isLoading) return <PageSkeleton />
  if (projectQuery.error && projectQuery.error.data?.code !== 'NOT_FOUND') {
    return <ErrorState onRetry={() => projectQuery.refetch()} />
  }

  if (!project) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-display text-3xl font-medium tracking-[-0.01em] text-ink">
            {t('espace.stats.title')}
          </h1>
        </div>
        <EmptyState title={t('espace.stats.noProjectTitle')} description={t('espace.stats.noProjectDescription')} />
      </div>
    )
  }

  const maxViews = Math.max(1, ...(views?.daily ?? []).map((d) => d.views))
  const guests = counts.adults + counts.children

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-medium tracking-[-0.01em] text-ink">
          {t('espace.stats.title')}
        </h1>
        <p className="mt-1 text-[15px] text-neutral-500">{tp('espace.stats.subtitle')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label={t('espace.stats.guestsLabel')}
          value={String(guests)}
          detail={`${counts.adults} ${t('espace.stats.adults')} · ${counts.children} ${t('espace.stats.children')}`}
          tone="terracotta"
        />
        <StatCard
          icon={Heart}
          label={t('espace.stats.answeredLabel')}
          value={String(responses.length)}
          detail={`${counts.yes} ${t('espace.stats.yes')} · ${counts.no} ${t('espace.stats.no')} · ${counts.maybe} ${t('espace.stats.maybe')}`}
        />
        <StatCard
          icon={Eye}
          label={tp('espace.stats.viewsLabel')}
          value={views ? String(views.views) : '—'}
          detail={
            views && views.views > 0
              ? `${views.visitors} ${t('espace.stats.visitorsEstimate')}`
              : isLive
                ? t('espace.stats.viewsEmpty')
                : t('espace.stats.viewsLocked')
          }
          tone="info"
        />
        <StatCard
          icon={Baby}
          label={t('espace.stats.countdownLabel')}
          value={countdown !== null ? String(countdown) : '—'}
          detail={project.weddingDate ? formatDate(project.weddingDate, { day: 'numeric', month: 'long', year: 'numeric' }, lang) : undefined}
        />
      </div>

      {/* Ouvertures par jour — une seule série, donc pas de légende (cf. titre). */}
      {views && views.daily.length > 0 && (
        <SectionCard>
          <h2 className="font-display text-xl font-medium text-ink">{tp('espace.stats.viewsChartTitle')}</h2>
          <p className="mt-1 text-[13px] text-neutral-500">{t('espace.stats.viewsChartSubtitle')}</p>
          <div className="mt-5 flex h-40 items-end gap-1.5">
            {views.daily.slice(-30).map((d) => (
              <div key={d.day} className="group relative flex h-full flex-1 items-end" title={`${d.day} — ${d.views}`}>
                <motion.span
                  className="w-full rounded-t bg-[#2F6F8F]"
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  style={{ height: `${Math.max(4, (d.views / maxViews) * 100)}%`, originY: 1 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] tabular-nums text-neutral-500">
            <span>{views.daily.slice(-30)[0]?.day}</span>
            <span>{t('espace.stats.viewsPeak')} {maxViews}</span>
            <span>{views.daily.at(-1)?.day}</span>
          </div>
        </SectionCard>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard>
          <h2 className="font-display flex items-center gap-2 text-xl font-medium text-ink">
            <Music size={18} className="text-terracotta-500" /> {t('espace.stats.playlistTitle')}
          </h2>
          <p className="mt-1 text-[13px] text-neutral-500">{t('espace.stats.playlistSubtitle')}</p>
          {songs.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-neutral-200 p-4 text-[13px] text-neutral-500">
              {t('espace.stats.playlistEmpty')}
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {songs.map(([label, value]) => (
                <RankRow key={label} label={label} value={value} max={songs[0][1]} />
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard>
          <h2 className="font-display flex items-center gap-2 text-xl font-medium text-ink">
            <UtensilsCrossed size={18} className="text-terracotta-500" /> {t('espace.stats.dietsTitle')}
          </h2>
          <p className="mt-1 text-[13px] text-neutral-500">{t('espace.stats.dietsSubtitle')}</p>
          {diets.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-neutral-200 p-4 text-[13px] text-neutral-500">
              {t('espace.stats.dietsEmpty')}
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {diets.map(([label, value]) => (
                <RankRow key={label} label={label} value={value} max={diets[0][1]} />
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {lastMessage && (
        <SectionCard>
          <h2 className="font-display text-xl font-medium text-ink">{t('espace.stats.messagesTitle')}</h2>
          <p className="mt-1 text-[13px] text-neutral-500">
            {counts.messages} {t('espace.stats.messagesCount')}
          </p>
          <p className="font-display mt-4 text-xl font-light italic leading-relaxed text-ink">
            « {lastMessage.message} »
          </p>
          <p className="mt-2 text-[13px] text-neutral-500">— {lastMessage.guestName}</p>
        </SectionCard>
      )}
    </div>
  )
}
