import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Check,
  Clapperboard,
  Clock3,
  ExternalLink,
  Film,
  Lock,
  MessageCircle,
  PencilLine,
  Plus,
  Send,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { trpc } from '@/providers/trpc'
import {
  ErrorState,
  Kicker,
  PageSkeleton,
  SectionCard,
  StatusBadge,
} from '@/components/espace/shared'
import {
  auditLabel,
  formatDate,
  formatDateShort,
  formatTimecode,
} from '@/components/espace/utils'
import QrShare from '@/components/espace/QrShare'

// ---------------------------------------------------------------------------
// Modal de confirmation générique
// ---------------------------------------------------------------------------

function ConfirmModal({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onClose,
  pending,
}: {
  open: boolean
  title: string
  body: string
  confirmLabel: string
  onConfirm: () => void
  onClose: () => void
  pending?: boolean
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-anthracite-950/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h4 className="font-display text-xl font-medium text-ink">{title}</h4>
            <p className="mt-2 text-[14px] leading-relaxed text-neutral-500">{body}</p>
            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-neutral-200 px-5 py-2.5 text-[13px] font-medium text-ink transition-colors hover:bg-neutral-100"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={pending}
                className="rounded-full bg-terracotta-500 px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-terracotta-400 active:scale-[0.97] disabled:opacity-60"
              >
                {pending ? 'Envoi…' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ---------------------------------------------------------------------------
// Page Projet & scénarios
// ---------------------------------------------------------------------------

const STATUS_RANK: Record<string, number> = {
  ONBOARDING: 0,
  QUESTIONNAIRE: 1,
  SCENARIOS: 2,
  PRODUCTION: 3,
  REVIEW: 4,
  DELIVERED: 5,
}

export default function Projet() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { hash } = useLocation()
  const utils = trpc.useUtils()
  // `enabled: isAuthenticated` — cf. TableauDeBord.tsx pour l'explication
  // complète : sans cette garde, ces requêtes partent avant que la session
  // ne soit confirmée (juste après un signup/login) et affichent "Une
  // erreur est survenue" à un client pourtant bien connecté.
  const projectQuery = trpc.projects.myProject.useQuery(undefined, { enabled: isAuthenticated, retry: false })
  const scenariosQuery = trpc.scenarios.listMine.useQuery(undefined, { enabled: isAuthenticated, retry: false })
  const videosQuery = trpc.videos.listMine.useQuery(undefined, { enabled: isAuthenticated, retry: false })

  const chooseMutation = trpc.scenarios.choose.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.scenarios.listMine.invalidate(),
        utils.projects.myProject.invalidate(),
      ])
    },
  })
  const requestChangesMutation = trpc.scenarios.requestChanges.useMutation({
    onSuccess: () => utils.scenarios.listMine.invalidate(),
  })
  const approveMutation = trpc.videos.clientApprove.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.videos.listMine.invalidate(), utils.projects.myProject.invalidate()])
    },
  })
  const videoChangesMutation = trpc.videos.clientRequestChanges.useMutation({
    onSuccess: () => utils.videos.listMine.invalidate(),
  })
  const saveAnswers = trpc.questionnaire.save.useMutation()

  const project = projectQuery.data ?? null
  const scenarios = useMemo(
    () => [...(scenariosQuery.data ?? [])].sort((a, b) => a.ordre - b.ordre),
    [scenariosQuery.data],
  )
  const videos = useMemo(
    () => [...(videosQuery.data ?? [])].sort((a, b) => b.version - a.version),
    [videosQuery.data],
  )
  const currentVideo = videos[0] ?? null
  const rank = STATUS_RANK[project?.status ?? 'ONBOARDING'] ?? 0

  const [confirmScenarioId, setConfirmScenarioId] = useState<number | null>(null)
  const [changesFor, setChangesFor] = useState<number | null>(null)
  const [changesText, setChangesText] = useState('')
  const [confirmApprove, setConfirmApprove] = useState(false)
  const [timecodes, setTimecodes] = useState<{ timecode: string; comment: string }[]>([])
  const [videoMessage, setVideoMessage] = useState('')
  const [shareMessage, setShareMessage] = useState('')
  const [welcomeText, setWelcomeText] = useState<string | null>(null)
  const [editingWelcome, setEditingWelcome] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  // Scroll vers l'ancre (ex. #scenarios, #video) après le chargement
  useEffect(() => {
    if (!hash || projectQuery.isLoading) return
    const id = hash.slice(1)
    // Petit délai pour laisser le DOM se rendre
    const t = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
    return () => clearTimeout(t)
  }, [hash, projectQuery.isLoading])

  if (authLoading || projectQuery.isLoading) return <PageSkeleton />
  if (projectQuery.error && projectQuery.error.data?.code !== 'NOT_FOUND') {
    return <ErrorState onRetry={() => projectQuery.refetch()} />
  }

  const answers = (project?.questionnaire?.answers as Record<string, unknown> | null) ?? {}
  const names = (answers['couple.prenoms'] as string | undefined) ?? 'vous deux'
  const inviteUrl = project ? `${window.location.origin}/faire-part/${project.slug}` : `${window.location.origin}/demo`
  const effectiveShareMessage =
    shareMessage ||
    `${names} se marient ! Découvrez leur histoire : ${inviteUrl}`

  const auditEvents = project?.auditEvents ?? []
  const chosenScenario = scenarios.find((s) => s.status === 'chosen')

  const addTimecode = () => {
    const t = videoRef.current?.currentTime ?? 0
    const tc = formatTimecode(t)
    setTimecodes((prev) => [...prev, { timecode: tc, comment: '' }])
    showToast(`${tc} ajouté`)
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Kicker>Suivi de production</Kicker>
        <h2 className="font-display mt-1 text-3xl font-medium tracking-[-0.01em] text-ink">
          Projet & scénarios
        </h2>
        <p className="mt-1.5 text-[14px] text-neutral-500">
          Suivez l'avancement, choisissez votre scénario, validez votre vidéo.
        </p>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-full bg-anthracite-800 px-5 py-2.5 text-[13px] font-medium text-white shadow-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {!project ? (
        <SectionCard>
          <p className="text-[14px] text-neutral-500">
            Votre projet apparaîtra ici dès confirmation de votre commande.
          </p>
        </SectionCard>
      ) : (
        <>
          {/* Bloc 1 — Timeline + interlocutrice */}
          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            <SectionCard>
              <h3 className="font-display mb-6 text-xl font-medium text-ink">L'aventure jusqu'ici</h3>
              <ol className="relative flex flex-col gap-5 border-l-2 border-terracotta-500/30 pl-6">
                {auditEvents.map((event, i) => (
                  <motion.li
                    key={event.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                    className="relative"
                  >
                    <span
                      className={cn(
                        'absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-white',
                        i === auditEvents.length - 1
                          ? 'border-terracotta-500'
                          : 'border-terracotta-500/50',
                      )}
                    >
                      {i === auditEvents.length - 1 && (
                        <motion.span
                          className="absolute inset-0 rounded-full bg-terracotta-500"
                          animate={{ opacity: [0.5, 0], scale: [1, 2] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      )}
                      <span
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          i === auditEvents.length - 1 ? 'bg-terracotta-500' : 'bg-terracotta-500/60',
                        )}
                      />
                    </span>
                    <p className="text-[13.5px] font-medium text-ink">
                      {auditLabel(event.action, event.meta)}
                    </p>
                    <p className="text-[12px] text-neutral-500">
                      {formatDateShort(event.createdAt)} — {event.actor === 'system' ? 'Scroll The Date' : event.actor}
                    </p>
                  </motion.li>
                ))}
                {rank < 5 && (
                  <li className="relative">
                    <span className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-dashed border-neutral-200 bg-white" />
                    <p className="text-[13.5px] text-neutral-500">
                      Faire-part en ligne — à venir
                    </p>
                  </li>
                )}
              </ol>
            </SectionCard>

            {/* Interlocutrice */}
            <SectionCard className="flex h-fit flex-col items-start gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-terracotta-500 font-display text-lg font-medium text-white">
                E·F
              </span>
              <div>
                <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-neutral-500">
                  Votre interlocutrice
                </p>
                <p className="font-display mt-1 text-xl font-medium text-ink">Élise</p>
                <p className="mt-1 text-[13px] leading-snug text-neutral-500">
                  Elle écrit, monte et veille sur votre film de bout en bout.
                </p>
              </div>
              <Link
                to="/espace/messages"
                className="inline-flex items-center gap-2 rounded-full bg-anthracite-800 px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-anthracite-700"
              >
                <MessageCircle size={14} /> Envoyer un message
              </Link>
            </SectionCard>
          </div>

          {/* Bloc 2 — Scénarios */}
          <SectionCard id="scenarios">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-2xl font-medium italic text-ink">
                  Choisissez votre histoire.
                </h3>
                <p className="mt-1 text-[13.5px] text-neutral-500">
                  Des propositions écrites à partir de votre questionnaire et de votre note vocale.
                </p>
              </div>
              {chosenScenario && <StatusBadge tone="success">Scénario choisi ✓</StatusBadge>}
            </div>

            {rank < 2 && scenarios.length === 0 ? (
              <LockedBlock label="Les scénarios arrivent après votre questionnaire" />
            ) : scenarios.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-200 px-6 py-10 text-center">
                <Clock3 className="mx-auto text-terracotta-500" size={22} />
                <p className="mt-3 text-[14px] font-medium text-ink">Rédaction en cours</p>
                <p className="mt-1 text-[13px] text-neutral-500">
                  Élise écrit vos propositions — vous serez notifié dès qu'elles arrivent.
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  {scenarios.map((s, i) => {
                    const moodboard = (s.moodboard as { url: string; caption?: string }[] | null) ?? []
                    const chosen = s.status === 'chosen'
                    const dimmed = !!chosenScenario && !chosen
                    return (
                      <motion.article
                        key={s.id}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.2 }}
                        transition={{ delay: i * 0.12, duration: 0.5 }}
                        whileHover={{ y: -4 }}
                        className={cn(
                          'flex flex-col overflow-hidden rounded-2xl border bg-white transition-all',
                          chosen
                            ? 'border-terracotta-500 shadow-[0_8px_32px_rgba(201,111,90,0.2)]'
                            : 'border-neutral-200 shadow-[0_8px_32px_rgba(27,27,30,0.06)]',
                          dimmed && 'opacity-40',
                        )}
                      >
                        <div className="grid grid-cols-3 gap-1 p-3 pb-0">
                          {moodboard.slice(0, 3).map((m) => (
                            <img
                              key={m.url}
                              src={m.url}
                              alt={m.caption ?? ''}
                              className="aspect-square w-full rounded-lg object-cover"
                              loading="lazy"
                            />
                          ))}
                          {moodboard.length === 0 && (
                            <div className="col-span-3 flex aspect-[3/1] items-center justify-center rounded-lg bg-neutral-100">
                              <Film size={20} className="text-neutral-500" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col gap-3 p-5">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-display text-lg font-medium leading-snug text-ink">
                              {s.title}
                            </h4>
                            {chosen && (
                              <span className="shrink-0 rounded-full bg-terracotta-500 px-2.5 py-1 text-[10.5px] font-semibold text-white">
                                Choisi ✓
                              </span>
                            )}
                          </div>
                          <p className="flex-1 text-[13px] leading-relaxed text-neutral-500">
                            {s.summary}
                          </p>
                          <p className="text-[11.5px] text-neutral-500">
                            Proposition {s.ordre}
                            {s.sentAt ? ` — envoyée le ${formatDate(s.sentAt)}` : ''}
                          </p>
                          {s.status === 'changes_requested' && (
                            <p className="rounded-lg bg-[#C98850]/10 px-3 py-2 text-[12px] text-[#9a6534]">
                              Modification demandée — Élise retravaille cette piste.
                            </p>
                          )}
                          {!chosenScenario && s.status !== 'changes_requested' && (
                            <div className="flex flex-col gap-2">
                              <button
                                type="button"
                                onClick={() => setConfirmScenarioId(s.id)}
                                className="rounded-full bg-terracotta-500 px-4 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-terracotta-400 active:scale-[0.97]"
                              >
                                Choisir ce scénario
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setChangesFor(changesFor === s.id ? null : s.id)
                                  setChangesText('')
                                }}
                                className="text-[12.5px] font-medium text-neutral-500 underline-offset-4 hover:text-ink hover:underline"
                              >
                                Demander une modification
                              </button>
                            </div>
                          )}
                          <AnimatePresence>
                            {changesFor === s.id && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                              >
                                <textarea
                                  value={changesText}
                                  onChange={(e) => setChangesText(e.target.value)}
                                  rows={3}
                                  placeholder="Dites-nous ce qui vous manque ou vous gêne…"
                                  className="w-full resize-none rounded-xl border border-neutral-200 px-3 py-2 text-[13px] outline-none focus:border-terracotta-500"
                                />
                                <button
                                  type="button"
                                  disabled={!changesText.trim() || requestChangesMutation.isPending}
                                  onClick={() => {
                                    requestChangesMutation.mutate(
                                      { scenarioId: s.id, comment: changesText.trim() },
                                      {
                                        onSuccess: () => {
                                          setChangesFor(null)
                                          showToast('Demande envoyée à Élise')
                                        },
                                      },
                                    )
                                  }}
                                  className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-anthracite-800 px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-anthracite-700 disabled:opacity-50"
                                >
                                  <Send size={12} /> Envoyer à Élise
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.article>
                    )
                  })}
                </div>

                {/* Historique */}
                <div className="mt-6 border-t border-neutral-200 pt-4">
                  <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                    Historique
                  </p>
                  <ul className="flex flex-col gap-1">
                    {auditEvents
                      .filter((e) => e.action.startsWith('scenario'))
                      .map((e) => (
                        <li key={e.id} className="text-[12.5px] text-neutral-500">
                          <span className="font-medium text-ink">{formatDate(e.createdAt)}</span> —{' '}
                          {auditLabel(e.action, e.meta)}
                        </li>
                      ))}
                  </ul>
                </div>
              </>
            )}
          </SectionCard>

          {/* Bloc 3 — Vidéo */}
          <SectionCard id="video">
            <h3 className="font-display mb-1 text-2xl font-medium italic text-ink">Votre vidéo.</h3>
            <p className="mb-6 text-[13.5px] text-neutral-500">
              La version de travail est filigranée — la version finale sera sans filigrane et en haute
              définition.
            </p>
            {rank < 4 && !currentVideo ? (
              <LockedBlock label="La vidéo filigrane arrive après le choix du scénario et le montage" />
            ) : !currentVideo ? (
              <div className="rounded-xl border border-dashed border-neutral-200 px-6 py-10 text-center">
                <Clapperboard className="mx-auto text-terracotta-500" size={22} />
                <p className="mt-3 text-[14px] font-medium text-ink">Montage en cours</p>
                <p className="mt-1 text-[13px] text-neutral-500">
                  La première version arrive sous quelques jours.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <div className="relative overflow-hidden rounded-2xl bg-anthracite-950">
                  <video
                    ref={videoRef}
                    src={currentVideo.url}
                    poster="/demo-poster.jpg"
                    controls
                    className="aspect-video w-full"
                  />
                  {currentVideo.watermark && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 opacity-[0.12]"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(-35deg, transparent 0 90px, rgba(255,255,255,0) 90px 92px), repeating-linear-gradient(-35deg, transparent 0 180px, rgba(255,255,255,0.9) 180px 181px)",
                        backgroundColor: 'transparent',
                      }}
                    />
                  )}
                  {currentVideo.watermark && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 flex rotate-[-18deg] flex-wrap content-center justify-center gap-x-16 gap-y-10 opacity-[0.14]"
                    >
                      {Array.from({ length: 12 }).map((_, i) => (
                        <span key={i} className="whitespace-nowrap text-lg font-bold tracking-[0.2em] text-white">
                          SCROLL THE DATE — APERÇU
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[13px] text-neutral-500">
                    Version {currentVideo.version} — reçue le {formatDate(currentVideo.createdAt)}
                    {currentVideo.status === 'approved' && ' — approuvée ✓'}
                    {currentVideo.status === 'final' && ' — version finale'}
                  </p>
                  {currentVideo.status === 'sent' && (
                    <div className="flex flex-wrap gap-2.5">
                      <button
                        type="button"
                        onClick={() => setConfirmApprove(true)}
                        className="rounded-full bg-terracotta-500 px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400 active:scale-[0.97]"
                      >
                        J'approuve cette version
                      </button>
                      <button
                        type="button"
                        onClick={addTimecode}
                        className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-4 py-2.5 text-[13px] font-medium text-ink transition-colors hover:bg-neutral-100"
                      >
                        <Plus size={14} /> Ajouter un timecode
                      </button>
                    </div>
                  )}
                </div>

                {/* Commentaires timecodés */}
                {currentVideo.status === 'sent' && (
                  <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-neutral-100/50 p-4">
                    <p className="text-[13px] font-semibold text-ink">Demander des modifications</p>
                    {timecodes.map((tc, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="shrink-0 rounded-md bg-anthracite-800 px-2 py-1 font-mono text-[12px] text-white">
                          {tc.timecode}
                        </span>
                        <input
                          type="text"
                          value={tc.comment}
                          onChange={(e) =>
                            setTimecodes((prev) =>
                              prev.map((p, j) => (j === i ? { ...p, comment: e.target.value } : p)),
                            )
                          }
                          placeholder="Votre commentaire…"
                          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-terracotta-500"
                        />
                        <button
                          type="button"
                          aria-label="Supprimer ce timecode"
                          onClick={() => setTimecodes((prev) => prev.filter((_, j) => j !== i))}
                          className="shrink-0 text-neutral-500 hover:text-error"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <textarea
                      value={videoMessage}
                      onChange={(e) => setVideoMessage(e.target.value)}
                      rows={2}
                      placeholder="Un message général pour Élise (optionnel)…"
                      className="w-full resize-none rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-terracotta-500"
                    />
                    {(timecodes.length > 0 || videoMessage.trim()) && (
                      <button
                        type="button"
                        disabled={videoChangesMutation.isPending}
                        onClick={() => {
                          videoChangesMutation.mutate(
                            {
                              videoId: currentVideo.id,
                              comments: timecodes.filter((t) => t.comment.trim()),
                              message: videoMessage.trim() || undefined,
                            },
                            {
                              onSuccess: () => {
                                setTimecodes([])
                                setVideoMessage('')
                                showToast('Modifications envoyées')
                              },
                            },
                          )
                        }}
                        className="inline-flex w-fit items-center gap-1.5 rounded-full bg-anthracite-800 px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-anthracite-700 disabled:opacity-50"
                      >
                        <Send size={12} /> Envoyer les modifications
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </SectionCard>

          {/* Bloc 4 — Livraison */}
          <SectionCard id="livraison">
            <h3 className="font-display mb-6 text-2xl font-medium italic text-ink">
              {rank >= 5 ? 'Votre faire-part est en ligne.' : 'Livraison & partage.'}
            </h3>
            {rank < 5 ? (
              <LockedBlock label="Votre lien, votre QR et votre kit de partage apparaîtront ici après validation de la vidéo" />
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col gap-6"
              >
                <div className="flex flex-wrap items-center gap-4 rounded-xl bg-[#6FA287]/10 p-4">
                  <Check size={18} className="shrink-0 text-[#4d7a62]" />
                  <p className="min-w-0 flex-1 text-[14px] font-medium text-ink">
                    Partagez-le sans compter — le lien est illimité.
                  </p>
                  <a
                    href={`/faire-part/${project.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-anthracite-800 px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-anthracite-700"
                  >
                    Ouvrir le faire-part <ExternalLink size={13} />
                  </a>
                </div>

                <QrShare url={inviteUrl} shareMessage={effectiveShareMessage} onMessageChange={setShareMessage} />

                {/* Personnaliser le texte d'accueil */}
                <div className="border-t border-neutral-200 pt-4">
                  {!editingWelcome ? (
                    <button
                      type="button"
                      onClick={() => {
                        setWelcomeText(
                          welcomeText ??
                            ((answers['invite.texte_accueil'] as string | undefined) ?? ''),
                        )
                        setEditingWelcome(true)
                      }}
                      className="inline-flex items-center gap-1.5 text-[13px] font-medium text-terracotta-500 underline-offset-4 hover:underline"
                    >
                      <PencilLine size={13} /> Personnaliser le texte d'accueil
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <textarea
                        value={welcomeText ?? ''}
                        onChange={(e) => setWelcomeText(e.target.value)}
                        rows={3}
                        placeholder="Le petit mot qui accueillera vos invités…"
                        className="w-full resize-none rounded-xl border border-neutral-200 px-4 py-3 text-[14px] outline-none focus:border-terracotta-500"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={saveAnswers.isPending}
                          onClick={() => {
                            saveAnswers.mutate(
                              { answers: { 'invite.texte_accueil': welcomeText ?? '' } },
                              {
                                onSuccess: () => {
                                  setEditingWelcome(false)
                                  showToast('Texte d’accueil enregistré — Élise est prévenue')
                                },
                              },
                            )
                          }}
                          className="rounded-full bg-terracotta-500 px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-terracotta-400 disabled:opacity-50"
                        >
                          Enregistrer
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingWelcome(false)}
                          className="rounded-full border border-neutral-200 px-4 py-2 text-[12.5px] font-medium text-ink hover:bg-neutral-100"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </SectionCard>
        </>
      )}

      {/* Modals */}
      <ConfirmModal
        open={confirmScenarioId !== null}
        title="Confirmer votre choix ?"
        body="Votre choix est définitif pour lancer le montage — vous pourrez toujours affiner pendant les révisions vidéo."
        confirmLabel="Confirmer ce scénario"
        pending={chooseMutation.isPending}
        onClose={() => setConfirmScenarioId(null)}
        onConfirm={() => {
          if (confirmScenarioId === null) return
          chooseMutation.mutate(
            { scenarioId: confirmScenarioId },
            {
              onSuccess: () => {
                setConfirmScenarioId(null)
                showToast('Scénario choisi — le montage commence !')
              },
            },
          )
        }}
      />
      <ConfirmModal
        open={confirmApprove}
        title="Approuver cette version ?"
        body="La version finale sans filigrane sera générée et votre faire-part passera en ligne."
        confirmLabel="J'approuve"
        pending={approveMutation.isPending}
        onClose={() => setConfirmApprove(false)}
        onConfirm={() => {
          if (!currentVideo) return
          approveMutation.mutate(
            { videoId: currentVideo.id },
            {
              onSuccess: () => {
                setConfirmApprove(false)
                showToast('Vidéo approuvée — livraison en cours !')
              },
            },
          )
        }}
      />
    </div>
  )
}

function LockedBlock({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-neutral-200 px-5 py-6 text-neutral-500">
      <Lock size={16} className="shrink-0" />
      <p className="text-[13.5px]">{label} — <span className="italic">à venir</span></p>
    </div>
  )
}
