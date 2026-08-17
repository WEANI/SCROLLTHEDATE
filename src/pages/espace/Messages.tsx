import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, Mic, Paperclip, Send, Smile, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { trpc } from '@/providers/trpc'
import {
  ErrorState,
  PageSkeleton,
} from '@/components/espace/shared'
import {
  formatTime,
} from '@/components/espace/utils'
import VoiceRecorder from '@/components/espace/VoiceRecorder'
import type { VoiceNoteResult } from '@/components/espace/VoiceRecorder'

// ---------------------------------------------------------------------------
// Groupage par jour
// ---------------------------------------------------------------------------

function dayLabel(d: Date): string {
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  if (same(d, today)) return "Aujourd'hui"
  if (same(d, yesterday)) return 'Hier'
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

const EMOJIS = ['❤️', '😂', '🥂', '🎉', '😘', '🙏']

// ---------------------------------------------------------------------------
// Page Messages
// ---------------------------------------------------------------------------

export default function Messages() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const utils = trpc.useUtils()
  // `enabled: isAuthenticated` — cf. TableauDeBord.tsx pour l'explication :
  // évite de lancer ces requêtes avant que la session ne soit confirmée
  // (juste après un signup/login), ce qui afficherait une erreur à un
  // client pourtant bien connecté.
  const threadQuery = trpc.messages.listThread.useQuery(
    {},
    { enabled: isAuthenticated, refetchInterval: 10_000, retry: false },
  )
  const projectQuery = trpc.projects.myProject.useQuery(undefined, { enabled: isAuthenticated, retry: false })

  const sendMutation = trpc.messages.send.useMutation({
    onSuccess: () => utils.messages.listThread.invalidate(),
  })
  const markRead = trpc.messages.markRead.useMutation({
    onSuccess: () => utils.messages.listThread.invalidate(),
  })
  const voiceSave = trpc.voiceNotes.save.useMutation()

  const [draft, setDraft] = useState('')
  const [showVoice, setShowVoice] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [pendingAttachment, setPendingAttachment] = useState<{
    url: string
    filename: string
    mimeType: string
  } | null>(null)

  const messages = useMemo(() => threadQuery.data ?? [], [threadQuery.data])
  const project = projectQuery.data ?? null
  const notFound = threadQuery.error?.data?.code === 'NOT_FOUND'

  // Marque lu les messages admin à l'arrivée de nouveaux messages
  const lastAdminUnread = messages.filter((m) => m.senderRole === 'admin' && !m.readAt).length
  useEffect(() => {
    if (lastAdminUnread > 0) markRead.mutate({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastAdminUnread])

  // Scroll auto vers le bas
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  // Auto-grow du composer
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`
  }, [draft])

  const send = async () => {
    const body = draft.trim()
    if ((!body && !pendingAttachment) || sending) return
    setSending(true)
    try {
      await sendMutation.mutateAsync({
        body: body || (pendingAttachment ? '📎 Pièce jointe' : ''),
        attachments: pendingAttachment ? [pendingAttachment] : undefined,
      })
      setDraft('')
      setPendingAttachment(null)
    } finally {
      setSending(false)
    }
  }

  const handleVoiceSend = async (result: VoiceNoteResult) => {
    await voiceSave.mutateAsync({ url: result.dataUri, durationSec: result.durationSec })
    await sendMutation.mutateAsync({
      body: `🎙 Note vocale (${result.durationSec} s)`,
      attachments: [{ url: result.dataUri, filename: 'note-vocale', mimeType: result.mimeType }],
    })
    setShowVoice(false)
  }

  const handleFile = (file: File | undefined) => {
    if (!file) return
    if (file.size > 4 * 1024 * 1024) return
    const reader = new FileReader()
    reader.onloadend = () =>
      setPendingAttachment({ url: String(reader.result), filename: file.name, mimeType: file.type })
    reader.readAsDataURL(file)
  }

  if (authLoading || threadQuery.isLoading) return <PageSkeleton />
  if (threadQuery.error && !notFound) return <ErrorState onRetry={() => threadQuery.refetch()} />

  const answers = (project?.questionnaire?.answers as Record<string, unknown> | null) ?? {}
  const names = (answers['couple.prenoms'] as string | undefined) ?? project?.slug ?? ''

  // Groupes par jour
  const groups: { label: string; items: typeof messages }[] = []
  for (const m of messages) {
    const label = dayLabel(new Date(m.createdAt))
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.items.push(m)
    else groups.push({ label, items: [m] })
  }

  return (
    <div className="flex h-[calc(100dvh-10rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_8px_32px_rgba(27,27,30,0.08)]">
      {/* Header de fil */}
      <div className="flex items-center gap-3 border-b border-neutral-200 px-5 py-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-terracotta-500 font-display text-[15px] font-medium text-white">
          E·F
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-semibold text-ink">Élise — Scroll The Date</p>
          <p className="text-[12px] text-neutral-500">Répond en général sous 24 h</p>
        </div>
        {project && (
          <span className="hidden rounded-full bg-anthracite-800 px-3.5 py-1.5 text-[11.5px] font-medium text-white sm:block">
            Projet : Faire-part {names}
          </span>
        )}
      </div>

      {/* Zone messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <span className="font-display text-4xl font-light italic text-terracotta-500">S.</span>
            <p className="font-display text-xl font-medium text-ink">
              Dites bonjour à Élise — elle adore les détails croustillants.
            </p>
            <button
              type="button"
              onClick={() => inputRef.current?.focus()}
              className="mt-2 rounded-full bg-terracotta-500 px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400"
            >
              Écrire un message
            </button>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label} className="mb-6">
              <p className="mb-4 text-center text-[11px] font-medium text-neutral-500">
                {group.label}
              </p>
              <div className="flex flex-col gap-2.5">
                {group.items.map((m) => {
                  const fromAdmin = m.senderRole === 'admin'
                  const attachments =
                    (m.attachments as { url: string; filename?: string; mimeType?: string }[] | null) ?? []
                  return (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                      className={cn('flex items-end gap-2.5', fromAdmin ? '' : 'flex-row-reverse')}
                    >
                      {fromAdmin && (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-terracotta-500 font-display text-[11px] font-medium text-white">
                          E·F
                        </span>
                      )}
                      <div
                        className={cn(
                          'max-w-[78%] rounded-2xl px-4 py-3 sm:max-w-[65%]',
                          fromAdmin
                            ? 'rounded-tl-md bg-anthracite-800 text-white'
                            : 'rounded-tr-md border border-neutral-200 bg-white text-ink shadow-sm',
                        )}
                      >
                        <p className="whitespace-pre-wrap text-[14px] leading-relaxed">{m.body}</p>
                        {attachments.map((a, i) =>
                          a.mimeType?.startsWith('audio/') || a.filename === 'note-vocale' ? (
                            <audio key={i} controls src={a.url} className="mt-2 h-9 max-w-full" />
                          ) : a.mimeType?.startsWith('image/') ? (
                            <img
                              key={i}
                              src={a.url}
                              alt={a.filename ?? 'pièce jointe'}
                              className="mt-2 max-h-48 rounded-lg object-cover"
                            />
                          ) : (
                            <a
                              key={i}
                              href={a.url}
                              download={a.filename}
                              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-medium underline-offset-2 hover:underline"
                            >
                              <Paperclip size={12} /> {a.filename ?? 'Pièce jointe'}
                            </a>
                          ),
                        )}
                        <p
                          className={cn(
                            'mt-1 text-right text-[10.5px]',
                            fromAdmin ? 'text-white/50' : 'text-neutral-500',
                          )}
                        >
                          {formatTime(m.createdAt)}
                        </p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Popover note vocale */}
      <AnimatePresence>
        {showVoice && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="border-t border-neutral-200 bg-neutral-100/60 px-5 py-4"
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-semibold text-ink">Note vocale</p>
              <button
                type="button"
                aria-label="Fermer"
                onClick={() => setShowVoice(false)}
                className="text-neutral-500 hover:text-ink"
              >
                <X size={16} />
              </button>
            </div>
            <VoiceRecorder compact onSend={handleVoiceSend} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Composer */}
      <div className="border-t border-neutral-200 px-4 py-3 sm:px-5">
        {pendingAttachment && (
          <div className="mb-2 flex items-center gap-2 rounded-lg bg-neutral-100 px-3 py-2 text-[12.5px] text-ink">
            <Paperclip size={13} className="shrink-0 text-terracotta-500" />
            <span className="min-w-0 flex-1 truncate">{pendingAttachment.filename}</span>
            <button
              type="button"
              aria-label="Retirer la pièce jointe"
              onClick={() => setPendingAttachment(null)}
              className="text-neutral-500 hover:text-error"
            >
              <X size={14} />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <button
            type="button"
            aria-label="Joindre un fichier"
            onClick={() => fileRef.current?.click()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-ink"
          >
            <Paperclip size={18} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,audio/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <button
            type="button"
            aria-label="Note vocale"
            onClick={() => setShowVoice((v) => !v)}
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors',
              showVoice ? 'bg-terracotta-500 text-white' : 'text-neutral-500 hover:bg-neutral-100 hover:text-ink',
            )}
          >
            <Mic size={18} />
          </button>
          <div className="relative">
            <button
              type="button"
              aria-label="Emoji"
              onClick={() => setShowEmoji((v) => !v)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-ink"
            >
              <Smile size={18} />
            </button>
            <AnimatePresence>
              {showEmoji && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 8 }}
                  className="absolute bottom-12 left-0 z-20 flex gap-1 rounded-full border border-neutral-200 bg-white p-2 shadow-lg"
                >
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => {
                        setDraft((d) => d + e)
                        setShowEmoji(false)
                        inputRef.current?.focus()
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-lg hover:bg-neutral-100"
                    >
                      {e}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void send()
              }
            }}
            placeholder="Écrivez à Élise…"
            rows={1}
            className="max-h-[140px] min-h-[40px] flex-1 resize-none rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-[14px] text-ink outline-none transition-colors placeholder:text-neutral-500 focus:border-terracotta-500"
          />
          <button
            type="button"
            aria-label="Envoyer"
            disabled={(!draft.trim() && !pendingAttachment) || sending}
            onClick={() => void send()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-terracotta-500 text-white transition-all hover:bg-terracotta-400 active:scale-95 disabled:opacity-40"
          >
            {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
          </button>
        </div>
        <p className="mt-2 text-[11.5px] text-neutral-500">
          Pour les messages vocaux longs, WhatsApp reste dispo : 06 00 00 00 00.
        </p>
      </div>
    </div>
  )
}
