import { useMemo } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import {
  AlarmClock,
  ArrowRight,
  Check,
  ClipboardList,
  Clapperboard,
  MessageCircle,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { trpc } from '@/providers/trpc'
import {
  EmptyState,
  ErrorState,
  PageSkeleton,
  ProgressRing,
  SectionCard,
  StatusBadge,
} from '@/components/espace/shared'
import {
  daysUntil,
  formatDate,
  formatPrice,
  PRODUCT_LABEL,
  PROJECT_STATUS_LABEL,
  TEMPLATE_VIGNETTE,
} from '@/components/espace/utils'

// ---------------------------------------------------------------------------
// Stepper 6 étapes (fait / actif / à venir)
// ---------------------------------------------------------------------------

const STATUS_RANK: Record<string, number> = {
  ONBOARDING: 0,
  QUESTIONNAIRE: 1,
  SCENARIOS: 2,
  PRODUCTION: 3,
  REVIEW: 4,
  DELIVERED: 5,
}

interface Step {
  label: string
  state: 'done' | 'active' | 'todo'
  dateLabel?: string
}

function ProjectStepper({ steps }: { steps: Step[] }) {
  const doneCount = steps.filter((s) => s.state === 'done').length
  const hasActive = steps.some((s) => s.state === 'active')
  const fraction = Math.min(1, (doneCount + (hasActive ? 0.5 : 0)) / (steps.length - 1))

  return (
    <div className="relative">
      {/* Ligne de progression (desktop) */}
      <div className="absolute left-5 right-5 top-5 hidden h-0.5 bg-neutral-200 md:block" aria-hidden="true">
        <motion.div
          className="h-full origin-left bg-terracotta-500"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: fraction }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <ol className="relative flex flex-col gap-6 md:flex-row md:justify-between md:gap-2">
        {steps.map((step) => (
          <li key={step.label} className="flex items-start gap-3 md:flex-1 md:flex-col md:items-center md:gap-2 md:text-center">
            <span className="relative z-10 shrink-0">
              {step.state === 'active' && (
                <motion.span
                  className="absolute inset-0 rounded-full bg-terracotta-500"
                  animate={{ opacity: [0.6, 0], scale: [1, 1.8] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  aria-hidden="true"
                />
              )}
              <span
                className={cn(
                  'relative flex h-10 w-10 items-center justify-center rounded-full border text-[13px] font-semibold',
                  step.state === 'done' && 'border-terracotta-500 bg-terracotta-500 text-white',
                  step.state === 'active' && 'border-terracotta-500 bg-white text-terracotta-500',
                  step.state === 'todo' && 'border-neutral-200 bg-neutral-200/60 text-neutral-500',
                )}
              >
                {step.state === 'done' ? <Check size={16} /> : steps.indexOf(step) + 1}
              </span>
            </span>
            <span>
              <span
                className={cn(
                  'block text-[13px]',
                  step.state === 'active' ? 'font-semibold text-ink' : step.state === 'done' ? 'font-medium text-ink' : 'text-neutral-500',
                )}
              >
                {step.label}
              </span>
              {step.dateLabel && (
                <span className="block text-[12px] text-neutral-500">{step.dateLabel}</span>
              )}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TableauDeBord() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  // `enabled: isAuthenticated` — sans ça, ces requêtes partent dès le
  // montage, avant que la session Supabase ne soit confirmée (juste après un
  // signup/login qui vient de rediriger ici) : le token n'est pas encore
  // prêt, authedQuery lève UNAUTHORIZED, et l'écran affiche "Une erreur est
  // survenue" à un client qui vient pourtant de se connecter avec succès.
  // Merci.tsx applique déjà cette garde sur sa propre requête ; il manquait
  // ici. Comparer avec authLoading (pas seulement isLoading des requêtes
  // elles-mêmes) plus bas pour garder le skeleton affiché pendant ce court
  // laps de temps plutôt que de basculer sur un état d'erreur.
  const projectQuery = trpc.projects.myProject.useQuery(undefined, { enabled: isAuthenticated })
  const mediaQuery = trpc.media.listMine.useQuery(undefined, { enabled: isAuthenticated, retry: false })
  const ordersQuery = trpc.orders.myOrders.useQuery(undefined, { enabled: isAuthenticated })
  const threadQuery = trpc.messages.listThread.useQuery({}, { enabled: isAuthenticated, retry: false })

  const project = projectQuery.data ?? null
  const media = useMemo(() => mediaQuery.data ?? [], [mediaQuery.data])
  const orders = useMemo(() => ordersQuery.data ?? [], [ordersQuery.data])
  const thread = useMemo(() => threadQuery.data ?? [], [threadQuery.data])

  const answers = useMemo(
    () => ((project?.questionnaire?.answers as Record<string, unknown> | null) ?? {}),
    [project],
  )
  const names =
    (answers['couple.prenoms'] as string | undefined) || user?.name || ''
  const rank = STATUS_RANK[project?.status ?? 'ONBOARDING'] ?? 0
  const completionPct = project?.questionnaire?.completionPct ?? 0
  const photoCount = media.filter((m) => m.type === 'photo').length
  const voiceNoteCount = project?.voiceNotes?.length ?? 0
  const unreadMessages = thread.filter((m) => m.senderRole === 'admin' && !m.readAt).length
  const countdown = daysUntil(project?.weddingDate)

  const steps: Step[] = useMemo(() => {
    const questionnaireDone = completionPct >= 100 || rank >= 2
    const mediaDone = photoCount >= 5 || rank >= 2
    return [
      {
        label: 'Questionnaire',
        state: questionnaireDone ? 'done' : 'active',
        dateLabel: questionnaireDone ? 'Complété' : 'En cours',
      },
      {
        label: 'Médias reçus',
        state: mediaDone ? 'done' : questionnaireDone ? 'active' : 'todo',
        dateLabel: mediaDone ? `${photoCount} fichier${photoCount > 1 ? 's' : ''}` : undefined,
      },
      {
        label: 'Scénarios',
        state: rank >= 3 ? 'done' : rank === 2 ? 'active' : 'todo',
        dateLabel: rank === 2 ? 'Propositions en préparation' : undefined,
      },
      {
        label: 'À valider',
        state: rank >= 5 ? 'done' : rank === 4 ? 'active' : 'todo',
        dateLabel: rank === 4 ? 'Vidéo filigrane reçue' : undefined,
      },
      {
        label: 'Montage',
        state: rank >= 4 ? 'done' : rank === 3 ? 'active' : 'todo',
      },
      {
        label: 'Livré',
        state: rank >= 5 ? 'done' : 'todo',
        dateLabel: rank >= 5 && project ? `Livré le ${formatDate(project.updatedAt)}` : undefined,
      },
    ]
  }, [completionPct, rank, photoCount, project])

  // Bannière « prochaine action » dynamique
  const nextAction = useMemo((): { text: string; cta: string; to: string } | null => {
    if (rank <= 1)
      return {
        text: 'Votre histoire est la matière première de votre film — complétez le questionnaire pour lancer la rédaction.',
        cta: 'Répondre au questionnaire',
        to: '/espace/questionnaire',
      }
    if (rank === 2)
      return {
        text: 'Vos propositions de scénario arrivent ou vous attendent — complétez votre médiathèque pour une vidéo encore plus personnelle.',
        cta: photoCount < 5 ? 'Ajouter des photos' : 'Voir mes scénarios',
        to: photoCount < 5 ? '/espace/questionnaire#medias' : '/espace/projet',
      }
    if (rank === 3)
      return {
        text: 'Votre scénario est entre les mains de notre monteuse — la première version arrive sous quelques jours.',
        cta: 'Suivre mon projet',
        to: '/espace/projet',
      }
    if (rank === 4)
      return {
        text: 'Votre vidéo filigrane vous attend — visionnez-la et validez-la pour lancer la livraison.',
        cta: 'Valider ma vidéo',
        to: '/espace/projet',
      }
    if (rank >= 5)
      return {
        text: 'Votre faire-part est en ligne — partagez-le avec vos proches et suivez les réponses en direct.',
        cta: 'Partager mon faire-part',
        to: '/espace/commandes',
      }
    return null
  }, [rank, photoCount])

  // Checklist d'onboarding
  const checklist = useMemo(
    () => [
      { label: 'Commande validée', done: orders.some((o) => o.paymentStatus === 'paid') },
      { label: 'Compte créé', done: true },
      { label: 'Questionnaire complété', done: completionPct >= 100 },
      {
        label: 'Note vocale envoyée',
        done: voiceNoteCount > 0,
        cta: 'Enregistrer',
        to: '/espace/questionnaire#vocale',
      },
      {
        label: '5+ photos téléversées',
        done: photoCount >= 5,
        cta: 'Téléverser',
        to: '/espace/questionnaire#medias',
      },
    ],
    [orders, completionPct, voiceNoteCount, photoCount],
  )
  const checklistPct = Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100)

  if (authLoading || projectQuery.isLoading || ordersQuery.isLoading) return <PageSkeleton />
  if (projectQuery.error && projectQuery.error.data?.code !== 'NOT_FOUND') {
    return <ErrorState onRetry={() => projectQuery.refetch()} />
  }

  const firstOrder = orders[0] ?? null

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête de bienvenue */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-display text-3xl font-medium tracking-[-0.01em] text-ink sm:text-4xl"
          >
            Bonjour <span className="italic text-terracotta-500">{names || 'à vous deux'}</span>
          </motion.h2>
          <p className="mt-2 text-[15px] text-neutral-500">
            Votre faire-part prend vie. Voici où en est votre projet.
          </p>
        </div>
        {project?.weddingDate && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="flex items-center gap-3 rounded-full bg-anthracite-800 py-2 pl-4 pr-2 text-white"
          >
            <span className="text-[13px] font-medium">
              {formatDate(project.weddingDate, { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            {countdown !== null && (
              <span className="rounded-full bg-terracotta-500 px-2.5 py-1 text-[11px] font-semibold tabular-nums">
                J−{countdown}
              </span>
            )}
          </motion.div>
        )}
      </div>

      {!project ? (
        <EmptyState
          title="Votre projet n'est pas encore créé"
          description="Il apparaîtra ici dès confirmation de votre commande. Une question ? Écrivez-nous depuis l'onglet Messages."
        />
      ) : (
        <>
          {/* Stepper */}
          <SectionCard>
            <ProjectStepper steps={steps} />
          </SectionCard>

          {/* Bannière prochaine action */}
          {nextAction && (
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="flex flex-wrap items-center gap-4 rounded-2xl bg-anthracite-800 p-5 text-white sm:p-6"
            >
              <motion.span
                animate={{ rotate: [0, -8, 8, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 2 }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-terracotta-500/20 text-terracotta-300"
              >
                <AlarmClock size={20} />
              </motion.span>
              <p className="min-w-0 flex-1 text-[14px] leading-relaxed text-white/90">
                {nextAction.text}
              </p>
              <Link
                to={nextAction.to}
                className="rounded-full bg-white px-5 py-2.5 text-[13px] font-semibold text-anthracite-900 transition-all hover:-translate-y-0.5 active:scale-[0.97]"
              >
                {nextAction.cta}
              </Link>
            </motion.div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Checklist d'onboarding */}
            <SectionCard>
              <div className="mb-5 flex items-center justify-between gap-4">
                <h3 className="font-display text-xl font-medium text-ink">Vos premiers pas</h3>
                <div className="relative">
                  <ProgressRing pct={checklistPct} size={64} />
                  <span className="absolute inset-0 flex items-center justify-center text-[13px] font-semibold tabular-nums text-ink">
                    {checklistPct}%
                  </span>
                </div>
              </div>
              <ul className="flex flex-col gap-1">
                {checklist.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-neutral-100/60"
                  >
                    <span
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
                        item.done ? 'border-terracotta-500 bg-terracotta-500 text-white' : 'border-neutral-200 bg-white',
                      )}
                    >
                      {item.done && <Check size={12} />}
                    </span>
                    <span
                      className={cn(
                        'text-[14px] transition-all',
                        item.done ? 'text-neutral-500 line-through' : 'font-medium text-ink',
                      )}
                    >
                      {item.label}
                    </span>
                    {!item.done && item.cta && item.to && (
                      <Link
                        to={item.to}
                        className="ml-auto rounded-full border border-terracotta-500/40 px-3 py-1 text-[12px] font-medium text-terracotta-500 transition-colors hover:bg-terracotta-500 hover:text-white"
                      >
                        {item.cta}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </SectionCard>

            {/* Raccourcis */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                {
                  to: '/espace/questionnaire',
                  icon: ClipboardList,
                  title: 'Questionnaire',
                  desc: completionPct >= 100 ? 'Complété — merci !' : `Complété à ${completionPct} % — reprendre`,
                  bar: completionPct,
                },
                {
                  to: '/espace/projet',
                  icon: Clapperboard,
                  title: 'Projet & scénarios',
                  desc: project ? PROJECT_STATUS_LABEL[project.status] : '—',
                },
                {
                  to: '/espace/messages',
                  icon: MessageCircle,
                  title: 'Messages',
                  desc: unreadMessages > 0 ? `${unreadMessages} nouveau${unreadMessages > 1 ? 'x' : ''}` : 'Écrire à Élise',
                  badge: unreadMessages,
                },
                {
                  to: rank >= 5 ? `/faire-part/${project.slug}` : '#',
                  icon: Sparkles,
                  title: 'Mon faire-part',
                  desc: rank >= 5 ? 'En ligne — voir' : 'Disponible après livraison',
                  disabled: rank < 5,
                },
              ].map((card, i) => {
                const Icon = card.icon
                const inner = (
                  <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                    whileHover={card.disabled ? undefined : { y: -4 }}
                    className={cn(
                      'flex h-full flex-col gap-3 rounded-2xl bg-white p-5 shadow-[0_8px_32px_rgba(27,27,30,0.08)]',
                      card.disabled && 'opacity-60',
                    )}
                  >
                    <span className="flex items-center justify-between">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-terracotta-500/10 text-terracotta-500">
                        <Icon size={18} />
                      </span>
                      {card.badge ? (
                        <motion.span
                          animate={{ scale: [1, 1.12, 1] }}
                          transition={{ duration: 1.6, repeat: Infinity }}
                          className="rounded-full bg-terracotta-500 px-2.5 py-1 text-[11px] font-semibold text-white"
                        >
                          {card.badge} nouveau{card.badge > 1 ? 'x' : ''}
                        </motion.span>
                      ) : null}
                    </span>
                    <div>
                      <p className="text-[14.5px] font-semibold text-ink">{card.title}</p>
                      <p className="mt-0.5 text-[12.5px] text-neutral-500">{card.desc}</p>
                    </div>
                    {typeof card.bar === 'number' && (
                      <span className="mt-auto block h-1 overflow-hidden rounded-full bg-neutral-200">
                        <motion.span
                          className="block h-full bg-terracotta-500"
                          initial={{ scaleX: 0 }}
                          whileInView={{ scaleX: card.bar / 100 }}
                          viewport={{ once: true }}
                          style={{ originX: 0 }}
                          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </span>
                    )}
                  </motion.div>
                )
                return card.disabled ? (
                  <div key={card.title} aria-disabled="true">{inner}</div>
                ) : (
                  <Link key={card.title} to={card.to}>{inner}</Link>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Récap commande */}
      {firstOrder && (
        <SectionCard className="flex flex-wrap items-center gap-5">
          <img
            src={TEMPLATE_VIGNETTE[project?.template ?? 'editorial']}
            alt="Aperçu du template"
            className="h-20 w-16 rounded-lg object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-ink">
              {PRODUCT_LABEL[firstOrder.product] ?? firstOrder.product} — {formatPrice(firstOrder.amountCents)}
            </p>
            <p className="mt-0.5 text-[13px] text-neutral-500">
              Commande FL-{new Date(firstOrder.createdAt).getFullYear()}-{String(firstOrder.id).padStart(4, '0')} du{' '}
              {formatDate(firstOrder.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge tone={firstOrder.paymentStatus === 'paid' ? 'success' : 'pending'}>
              {firstOrder.paymentStatus === 'paid' ? 'Payé' : 'En attente'}
            </StatusBadge>
            <Link
              to="/espace/commandes"
              className="inline-flex items-center gap-1 text-[13px] font-medium text-terracotta-500 hover:text-terracotta-400"
            >
              Voir mes commandes <ArrowRight size={14} />
            </Link>
          </div>
        </SectionCard>
      )}
    </div>
  )
}
