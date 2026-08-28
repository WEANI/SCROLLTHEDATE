import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Loader2,
  Mic,
  Plus,
  RefreshCw,
  Trash2,
  X,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  formatDurationLong,
  WHATSAPP_URL,
} from '@/components/espace/utils'
import VoiceRecorder from '@/components/espace/VoiceRecorder'
import UploadZone from '@/components/espace/UploadZone'
import type { VoiceNoteResult } from '@/components/espace/VoiceRecorder'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Question {
  id: string
  step: number
  type: string
  label: string
  placeholder?: string
  help?: string
  required?: boolean
  showOnInvite?: boolean
}

type Answers = Record<string, unknown>

const STEP_TITLES: Record<number, { title: string; sub: string }> = {
  1: { title: 'Le couple', sub: 'Présentez-vous comme à des amis.' },
  2: { title: 'Votre rencontre', sub: 'Les détails font la magie du film.' },
  3: { title: 'Le jour J', sub: 'Ces informations alimentent votre faire-part.' },
  4: { title: 'Votre style', sub: 'L’ambiance de votre vidéo et de votre faire-part.' },
}

const AMBIANCE_CARDS = [
  { value: 'editorial', label: 'Éditorial', img: '/template-editorial.jpg', desc: 'Magazine, typographie, élégance' },
  { value: 'cinema', label: 'Cinéma', img: '/template-cinema.jpg', desc: 'Plein écran, affiche de film' },
  { value: 'minimal', label: 'Minimal', img: '/template-minimal.jpg', desc: 'Clair, épuré, beaucoup de blanc' },
]

const INSPIRATION: Record<string, string[]> = {
  'rencontre.lieu_date': [
    '« Un café renversé sur un carnet, un soir de pluie à Pigalle, octobre 2019. »',
    '« En soirée chez des amis communs — on s’est disputé la dernière part de pizza. »',
    '« Sur un quai de gare, chacun dans le mauvais train. On a raté le bon ensemble. »',
  ],
  'rencontre.premier_souvenir': [
    '« Son rire. Il a ri à ma blague nulle et j’ai su que je voulais l’entendre encore. »',
    '« Un silence confortable dix minutes après s’être rencontrés. »',
  ],
  'rencontre.le_declic': [
    '« Quand il a conduit 400 km pour m’apporter de la soupe quand j’étais malade. »',
    '« Elle a dit “chez moi” en parlant de mon appartement. Et c’était vrai. »',
  ],
  'rencontre.anecdote': [
    '« Le roadtrip en van où on a fini sur une aire d’autoroute — et c’était parfait. »',
    '« La fois où on a dansé sous la pluie devant un restaurant fermé. »',
  ],
  'style.a_eviter': [
    '« Rien de trop guindé ni de musique “mariage chic” à la harpe. »',
    '« Pas de photos posées façon studio, on préfère le volé. »',
  ],
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

// ---------------------------------------------------------------------------
// Champs du wizard
// ---------------------------------------------------------------------------

function FieldShell({
  question,
  children,
}: {
  question: Question
  children: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col gap-2"
    >
      <label className="flex flex-wrap items-center gap-2 text-[14px] font-medium text-ink">
        {question.label}
        {question.required && <span className="text-terracotta-500">*</span>}
        {question.showOnInvite && (
          <span className="rounded-full bg-terracotta-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-terracotta-500">
            Affiché sur votre faire-part
          </span>
        )}
      </label>
      {children}
      {question.help && (
        <p className="text-[12.5px] italic leading-snug text-neutral-500">{question.help}</p>
      )}
    </motion.div>
  )
}

function InspirationButton({ questionId, onUse }: { questionId: string; onUse: (text: string) => void }) {
  const [open, setOpen] = useState(false)
  const [offset, setOffset] = useState(0)
  const pool = INSPIRATION[questionId] ?? []
  // Rotation déterministe : à chaque ouverture, on décale d'un exemple.
  const examples =
    pool.length === 0 ? [] : [pool[offset % pool.length]!, pool[(offset + 1) % pool.length]!].filter(
      (v, i, arr) => arr.indexOf(v) === i,
    )
  if (examples.length === 0) return null
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v)
          setOffset((o) => o + 1)
        }}
        className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-terracotta-500 hover:text-terracotta-400"
      >
        <Lightbulb size={13} />
        Inspirez-moi
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="mt-2 flex flex-col gap-2 rounded-xl border border-neutral-200 bg-neutral-100/70 p-3"
          >
            {examples.map((ex) => (
              <div key={ex} className="flex items-start justify-between gap-3">
                <p className="text-[12.5px] italic leading-snug text-neutral-500">{ex}</p>
                <button
                  type="button"
                  onClick={() => {
                    onUse(ex.replace(/[«»]/g, '').trim())
                    setOpen(false)
                  }}
                  className="shrink-0 rounded-full border border-terracotta-500/40 px-2.5 py-0.5 text-[11px] font-medium text-terracotta-500 hover:bg-terracotta-500 hover:text-white"
                >
                  Utiliser
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Question de type "photo" — upload d'une seule image directement dans le
 * wizard, distinct de la médiathèque générale plus bas sur la page : ici,
 * la photo sert un rôle nommé et précis (photo d'ouverture, photo du
 * lieu…), pas une pioche libre de 10-30 photos pour la vidéo. Réutilise
 * `media.addMedia` (même mutation que la médiathèque, même pipeline —
 * dataURI en base, pas de S3 en V1, cf. api/mediaRouter.ts) : la photo
 * existe donc aussi dans la médiathèque générale, juste pas taguée par un
 * rôle particulier côté table `media` pour l'instant.
 *
 * La réponse stockée est l'URL (dataURI) elle-même, pas l'id du média —
 * cohérent avec le reste du questionnaire (chaînes/tableaux dans le JSONB
 * `answers`), au prix d'alourdir un peu ce blob pour les questions photo.
 * Accepté sciemment plutôt que d'introduire une résolution par id
 * seulement pour ce type de question.
 */
function PhotoQuestionField({
  question,
  value,
  onChange,
}: {
  question: Question
  value: unknown
  onChange: (v: unknown) => void
}) {
  const url = typeof value === 'string' ? value : ''
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Retour visuel pendant le survol d'un fichier glissé — pas un état
  // "actif/inactif" binaire au clic, juste `dragover`/`dragleave`.
  const [dragOver, setDragOver] = useState(false)
  const addMediaMutation = trpc.media.addMedia.useMutation()

  async function handleFile(file: File) {
    setError(null)
    if (!file.type.startsWith('image/')) {
      setError('Seules les images sont acceptées.')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Fichier trop lourd (8 Mo max).')
      return
    }
    setUploading(true)
    try {
      const dataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error('read failed'))
        reader.readAsDataURL(file)
      })
      await addMediaMutation.mutateAsync({ type: 'photo', url: dataUri, filename: file.name })
      onChange(dataUri)
    } catch {
      setError('Échec de l’envoi — réessayez.')
    } finally {
      setUploading(false)
    }
  }

  // Partagés par la zone vide et la zone "photo déjà choisie" — glisser un
  // nouveau fichier sur une photo existante la remplace, même logique que
  // le bouton "Remplacer".
  const dragHandlers = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(true)
    },
    onDragLeave: () => setDragOver(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files?.[0]
      if (file) void handleFile(file)
    },
  }

  return (
    <FieldShell question={question}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
          e.target.value = ''
        }}
      />
      {url ? (
        <div
          {...dragHandlers}
          className={cn(
            'group relative w-fit overflow-hidden rounded-2xl border transition-colors',
            dragOver ? 'border-terracotta-400' : 'border-neutral-200',
          )}
        >
          <img src={url} alt="" className="h-40 w-auto max-w-full object-cover" />
          <button
            type="button"
            aria-label="Supprimer la photo"
            onClick={() => onChange('')}
            disabled={uploading}
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-neutral-500 opacity-0 shadow backdrop-blur transition-all hover:bg-error hover:text-white group-hover:opacity-100 focus-visible:opacity-100"
          >
            <Trash2 size={14} />
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-anthracite-950/70 py-2 text-[12px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-anthracite-950/85"
          >
            {uploading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Remplacer
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          {...dragHandlers}
          className={cn(
            'flex w-full max-w-xs flex-col items-center gap-2 rounded-2xl border-2 border-dashed bg-white px-6 py-8 text-center transition-colors',
            dragOver ? 'border-terracotta-400 bg-terracotta-500/5' : 'border-neutral-200',
            uploading ? 'cursor-wait opacity-70' : 'cursor-pointer hover:border-terracotta-400',
          )}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-terracotta-500">
            {uploading ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
          </span>
          <span className="text-[13px] font-medium text-ink">
            {uploading ? 'Envoi…' : 'Choisir une photo, ou glisser-déposer'}
          </span>
        </button>
      )}
      {error && <p className="text-[12.5px] font-medium text-error">{error}</p>}
    </FieldShell>
  )
}

function QuestionField({
  question,
  value,
  onChange,
}: {
  question: Question
  value: unknown
  onChange: (v: unknown) => void
}) {
  const str = typeof value === 'string' ? value : ''

  if (question.type === 'toggle') {
    return (
      <FieldShell question={question}>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange(true)}
            className={cn(
              'rounded-full border px-5 py-2 text-[13px] font-medium transition-all',
              value === true
                ? 'border-terracotta-500 bg-terracotta-500 text-white'
                : 'border-neutral-200 bg-white text-ink hover:border-terracotta-400',
            )}
          >
            Oui
          </button>
          <button
            type="button"
            onClick={() => onChange(false)}
            className={cn(
              'rounded-full border px-5 py-2 text-[13px] font-medium transition-all',
              value === false
                ? 'border-terracotta-500 bg-terracotta-500 text-white'
                : 'border-neutral-200 bg-white text-ink hover:border-terracotta-400',
            )}
          >
            Non
          </button>
        </div>
      </FieldShell>
    )
  }

  if (question.type === 'photo') {
    return <PhotoQuestionField question={question} value={value} onChange={onChange} />
  }

  if (question.type === 'textarea') {
    const words = wordCount(str)
    return (
      <FieldShell question={question}>
        <textarea
          value={str}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          rows={4}
          className="w-full resize-y rounded-xl border border-neutral-200 bg-white px-4 py-3 text-[14px] leading-relaxed text-ink outline-none transition-colors placeholder:text-neutral-500 focus:border-terracotta-500"
        />
        <div className="flex items-center justify-between gap-3">
          <span className={cn('text-[12px]', words >= 40 ? 'text-[#4d7a62]' : 'text-neutral-500')}>
            {str ? `~${words} mots${words >= 40 ? ', parfait' : ''}` : 'Pas de minimum — écrivez avec le cœur'}
          </span>
          <InspirationButton questionId={question.id} onUse={onChange} />
        </div>
      </FieldShell>
    )
  }

  if (question.type === 'date') {
    return (
      <FieldShell question={question}>
        <input
          type="date"
          value={str}
          onChange={(e) => onChange(e.target.value)}
          className="w-full max-w-60 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-[14px] text-ink outline-none transition-colors focus:border-terracotta-500"
        />
      </FieldShell>
    )
  }

  if (question.type === 'list') {
    const items = Array.isArray(value) ? (value as string[]) : []
    return (
      <FieldShell question={question}>
        <div className="flex flex-col gap-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={item}
                onChange={(e) => {
                  const next = [...items]
                  next[i] = e.target.value
                  onChange(next)
                }}
                placeholder="Nom + distance + lien (ex. Hôtel du Parc — 5 min — hotel.fr)"
                className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-[14px] text-ink outline-none transition-colors placeholder:text-neutral-500 focus:border-terracotta-500"
              />
              <button
                type="button"
                aria-label="Supprimer"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-error/10 hover:text-error"
              >
                <X size={15} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange([...items, ''])}
            className="inline-flex w-fit items-center gap-1.5 rounded-full border border-dashed border-neutral-200 px-4 py-2 text-[13px] font-medium text-ink transition-colors hover:border-terracotta-500 hover:text-terracotta-500"
          >
            <Plus size={14} /> Ajouter
          </button>
        </div>
      </FieldShell>
    )
  }

  if (question.type === 'choice' && question.id === 'style.ambiance') {
    return (
      <FieldShell question={question}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {AMBIANCE_CARDS.map((card) => (
            <button
              key={card.value}
              type="button"
              onClick={() => onChange(card.value)}
              className={cn(
                'group overflow-hidden rounded-xl border-2 text-left transition-all',
                str === card.value
                  ? 'border-terracotta-500 shadow-[0_8px_32px_rgba(201,111,90,0.25)]'
                  : 'border-neutral-200 hover:border-terracotta-400/60',
              )}
            >
              <img src={card.img} alt={card.label} className="aspect-[4/5] w-full object-cover" />
              <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                <div>
                  <p className="text-[13.5px] font-semibold text-ink">{card.label}</p>
                  <p className="text-[11.5px] text-neutral-500">{card.desc}</p>
                </div>
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                    str === card.value
                      ? 'border-terracotta-500 bg-terracotta-500 text-white'
                      : 'border-neutral-200 bg-white',
                  )}
                >
                  {str === card.value && <Check size={11} />}
                </span>
              </div>
            </button>
          ))}
        </div>
      </FieldShell>
    )
  }

  // text par défaut
  return (
    <FieldShell question={question}>
      <input
        type="text"
        value={str}
        onChange={(e) => onChange(e.target.value)}
        placeholder={question.placeholder}
        className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-[14px] text-ink outline-none transition-colors placeholder:text-neutral-500 focus:border-terracotta-500"
      />
    </FieldShell>
  )
}

// ---------------------------------------------------------------------------
// Page Questionnaire
// ---------------------------------------------------------------------------

export default function Questionnaire() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const location = useLocation()
  const utils = trpc.useUtils()

  // `enabled: isAuthenticated` — cf. TableauDeBord.tsx pour l'explication :
  // évite de lancer ces requêtes avant que la session ne soit confirmée
  // (juste après un signup/login), ce qui afficherait une erreur à un
  // client pourtant bien connecté.
  const templateQuery = trpc.questionnaire.getActiveTemplate.useQuery(undefined, { enabled: isAuthenticated })
  const getQuery = trpc.questionnaire.get.useQuery(undefined, { enabled: isAuthenticated, retry: false })
  const voiceQuery = trpc.voiceNotes.list.useQuery(undefined, { enabled: isAuthenticated, retry: false })
  const mediaQuery = trpc.media.listMine.useQuery(undefined, { enabled: isAuthenticated, retry: false })
  const rsvpQuery = trpc.rsvp.listMine.useQuery(undefined, { enabled: isAuthenticated, retry: false })

  const saveMutation = trpc.questionnaire.save.useMutation({
    onSuccess: async () => {
      setSavedAt(new Date())
      setSaveState('saved')
      await utils.questionnaire.get.invalidate()
    },
    onError: () => setSaveState('error'),
  })
  const voiceSave = trpc.voiceNotes.save.useMutation({
    onSuccess: () => utils.voiceNotes.list.invalidate(),
  })
  const addMediaMutation = trpc.media.addMedia.useMutation()
  const deleteMediaMutation = trpc.media.deleteMine.useMutation({
    onSuccess: async () => {
      await utils.media.listMine.invalidate()
      setDeleteTarget(null)
    },
  })
  const rsvpSave = trpc.rsvp.saveConfig.useMutation()

  // --- Réponses + autosave ---------------------------------------------------
  const [answers, setAnswers] = useState<Answers>({})
  const [hydrated, setHydrated] = useState(false)
  const dirtyRef = useRef<Set<string>>(new Set())
  const answersRef = useRef<Answers>({})
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!hydrated && getQuery.data) {
      const initial =
        (getQuery.data.questionnaire?.answers as Answers | null) ?? {}
      setAnswers(initial)
      answersRef.current = initial
      setHydrated(true)
    }
  }, [getQuery.data, hydrated])

  const flushSave = useCallback(() => {
    const dirty = Array.from(dirtyRef.current)
    if (dirty.length === 0) return
    const payload: Answers = {}
    for (const key of dirty) payload[key] = answersRef.current[key]
    dirtyRef.current.clear()
    setSaveState('saving')
    saveMutation.mutate({ answers: payload })
  }, [saveMutation])

  const setAnswer = useCallback(
    (id: string, value: unknown) => {
      setAnswers((prev) => {
        const next = { ...prev, [id]: value }
        answersRef.current = next
        return next
      })
      dirtyRef.current.add(id)
      setSaveState('idle')
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(flushSave, 800)
    },
    [flushSave],
  )

  // Flush en quittant la page
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // Indicateur « il y a X s » rafraîchi
  const [, forceTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 5000)
    return () => clearInterval(t)
  }, [])

  // --- RSVP config (étape 3) -------------------------------------------------
  const rsvpConfig = rsvpQuery.data?.config ?? null
  const rsvpQuestions = useMemo(
    () => (rsvpConfig?.questions as Record<string, unknown> | null) ?? {},
    [rsvpConfig],
  )
  const [rsvpHydrated, setRsvpHydrated] = useState(false)
  const [rsvpState, setRsvpState] = useState({
    enabled: true,
    deadline: '',
    askPlusOnes: true,
    askAllergies: true,
    askSong: true,
    askMessage: false,
  })
  useEffect(() => {
    if (!rsvpHydrated && rsvpQuery.data) {
      setRsvpState({
        enabled: rsvpConfig?.enabled ?? true,
        deadline: (rsvpQuestions.deadline as string) ?? '',
        askPlusOnes: (rsvpQuestions.askPlusOnes as boolean) ?? true,
        askAllergies: (rsvpQuestions.askAllergies as boolean) ?? true,
        askSong: (rsvpQuestions.askSong as boolean) ?? true,
        askMessage: (rsvpQuestions.askMessage as boolean) ?? false,
      })
      setRsvpHydrated(true)
    }
  }, [rsvpQuery.data, rsvpHydrated, rsvpConfig, rsvpQuestions])
  const rsvpDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const updateRsvp = (patch: Partial<typeof rsvpState>) => {
    const next = { ...rsvpState, ...patch }
    setRsvpState(next)
    if (rsvpDebounce.current) clearTimeout(rsvpDebounce.current)
    rsvpDebounce.current = setTimeout(() => {
      rsvpSave.mutate({
        enabled: next.enabled,
        questions: {
          deadline: next.deadline || undefined,
          askPlusOnes: next.askPlusOnes,
          askAllergies: next.askAllergies,
          askSong: next.askSong,
          askMessage: next.askMessage,
        },
      })
    }, 800)
  }

  // --- Wizard ----------------------------------------------------------------
  const questions = useMemo(
    () => ((templateQuery.data?.questions as Question[] | null) ?? []).sort((a, b) => a.step - b.step),
    [templateQuery.data],
  )
  const [step, setStep] = useState(1)

  // URL #etape-N / #vocale / #medias
  useEffect(() => {
    const hash = location.hash.replace('#', '')
    if (/^etape-[1-4]$/.test(hash)) {
      setStep(Number(hash.slice(-1)))
      window.scrollTo({ top: 0 })
    } else if (hash === 'vocale' || hash === 'medias') {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [location.hash])

  const goStep = (n: number) => {
    flushSave()
    setStep(n)
    window.history.replaceState(null, '', `#etape-${n}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const stepQuestions = (n: number) => questions.filter((q) => q.step === n)
  const stepValidated = (n: number) => {
    const qs = stepQuestions(n).filter((q) => q.required)
    return qs.every((q) => {
      const v = answers[q.id]
      if (v === undefined || v === null) return false
      if (typeof v === 'string') return v.trim().length > 0
      if (Array.isArray(v)) return v.some((x) => String(x).trim().length > 0)
      return true
    })
  }
  const completionPct = getQuery.data?.questionnaire?.completionPct ?? 0

  // --- Médiathèque ------------------------------------------------------------
  const [mediaFilter, setMediaFilter] = useState<'all' | 'photo' | 'video'>('all')
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; filename: string } | null>(null)
  const [pending, setPending] = useState<
    { key: string; filename: string; type: 'photo' | 'video'; previewUrl: string; progress: number; error?: string }[]
  >([])

  const handleFiles = useCallback(
    async (files: { filename: string; type: 'photo' | 'video'; dataUri: string; previewUrl: string }[]) => {
      const entries = files.map((f) => ({
        key: `${Date.now()}-${f.filename}`,
        filename: f.filename,
        type: f.type,
        previewUrl: f.previewUrl,
        progress: 5,
      }))
      setPending((prev) => [...prev, ...entries])
      for (let i = 0; i < files.length; i++) {
        const key = entries[i]!.key
        const tick = setInterval(() => {
          setPending((prev) =>
            prev.map((p) => (p.key === key ? { ...p, progress: Math.min(90, p.progress + 15) } : p)),
          )
        }, 250)
        try {
          await addMediaMutation.mutateAsync({
            type: files[i]!.type,
            url: files[i]!.dataUri,
            filename: files[i]!.filename,
          })
          setPending((prev) => prev.map((p) => (p.key === key ? { ...p, progress: 100 } : p)))
          await utils.media.listMine.invalidate()
          setTimeout(() => setPending((prev) => prev.filter((p) => p.key !== key)), 600)
        } catch {
          setPending((prev) =>
            prev.map((p) => (p.key === key ? { ...p, error: 'Échec de l’envoi' } : p)),
          )
        } finally {
          clearInterval(tick)
        }
      }
    },
    [addMediaMutation, utils],
  )

  const mediaItems = (mediaQuery.data ?? []).filter(
    (m) => mediaFilter === 'all' || m.type === mediaFilter,
  )

  // --- Note vocale -------------------------------------------------------------
  const latestVoiceNote = (voiceQuery.data ?? [])[0] ?? null
  const handleVoiceSend = async (result: VoiceNoteResult) => {
    await voiceSave.mutateAsync({ url: result.dataUri, durationSec: result.durationSec })
  }

  // --- Rendu -------------------------------------------------------------------
  if (authLoading || templateQuery.isLoading || getQuery.isLoading) return <PageSkeleton />
  const notFound = getQuery.error?.data?.code === 'NOT_FOUND'
  if ((getQuery.error && !notFound) || templateQuery.error) {
    return <ErrorState onRetry={() => { void getQuery.refetch(); void templateQuery.refetch() }} />
  }

  const noProject = notFound

  return (
    <div className="flex flex-col gap-8">
      {/* Header + indicateur autosave */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Kicker>Votre histoire</Kicker>
          <h2 className="font-display mt-1 text-3xl font-medium tracking-[-0.01em] text-ink">
            Questionnaire
          </h2>
          <p className="mt-1.5 text-[14px] text-neutral-500">
            Vos réponses nourrissent le scénario de votre film{user?.name ? `, ${user.name.split(' ')[0]}` : ''}.
          </p>
        </div>
        <div aria-live="polite" className="text-[12.5px] font-medium">
          {saveState === 'saving' && (
            <span className="inline-flex items-center gap-1.5 text-neutral-500">
              <Loader2 size={13} className="animate-spin" /> Enregistrement…
            </span>
          )}
          {saveState === 'saved' && savedAt && (
            <span className="inline-flex items-center gap-1.5 text-terracotta-500">
              <Check size={13} /> Enregistré il y a {Math.max(1, Math.round((Date.now() - savedAt.getTime()) / 1000))} s
            </span>
          )}
          {saveState === 'error' && (
            <span className="inline-flex items-center gap-1.5 text-error">
              Échec — nouvelle tentative automatique à la prochaine modification
            </span>
          )}
        </div>
      </div>

      {noProject ? (
        <SectionCard>
          <p className="text-[14px] text-neutral-500">
            Votre projet apparaîtra ici dès confirmation de votre commande. Le questionnaire s'ouvrira
            automatiquement à ce moment-là.
          </p>
        </SectionCard>
      ) : (
        <>
          {/* Barre de progression sticky */}
          <div className="sticky top-16 z-20 -mx-1 rounded-2xl border border-neutral-200 bg-white/90 p-4 shadow-[0_8px_32px_rgba(27,27,30,0.06)] backdrop-blur-md">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => (n < step || stepValidated(n)) && goStep(n)}
                  disabled={!(n < step || stepValidated(n))}
                  className="group flex-1"
                  aria-label={`Étape ${n} — ${STEP_TITLES[n]!.title}`}
                >
                  <span className="block h-1.5 overflow-hidden rounded-full bg-neutral-200">
                    <motion.span
                      className={cn('block h-full', n === step || stepValidated(n) ? 'bg-terracotta-500' : 'bg-transparent')}
                      initial={false}
                      animate={{ scaleX: n < step || stepValidated(n) ? 1 : n === step ? 0.6 : 0 }}
                      style={{ originX: 0 }}
                      transition={{ duration: 0.3 }}
                    />
                  </span>
                  <span
                    className={cn(
                      'mt-1.5 block text-left text-[11px] font-medium',
                      n === step ? 'text-terracotta-500' : 'text-neutral-500 group-hover:text-ink',
                    )}
                  >
                    {n}. {STEP_TITLES[n]!.title}
                  </span>
                </button>
              ))}
              <span className="ml-2 w-12 text-right text-[13px] font-semibold tabular-nums text-terracotta-500">
                {completionPct}%
              </span>
            </div>
          </div>

          {/* Wizard */}
          <SectionCard id={`etape-${step}`}>
            <div className="mb-6">
              <h3 className="font-display text-2xl font-medium text-ink">
                {STEP_TITLES[step]!.title}
              </h3>
              <p className="mt-1 text-[13.5px] text-neutral-500">{STEP_TITLES[step]!.sub}</p>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col gap-6"
              >
                {stepQuestions(step).map((q) => (
                  <QuestionField
                    key={q.id}
                    question={q}
                    value={answers[q.id]}
                    onChange={(v) => setAnswer(q.id, v)}
                  />
                ))}

                {/* Config RSVP — étape 3 */}
                {step === 3 && (
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-100/50 p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[14px] font-semibold text-ink">Réponses de vos invités (RSVP)</p>
                        <p className="text-[12.5px] text-neutral-500">
                          Choisissez ce que vos invités pourront renseigner sur le faire-part.
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={rsvpState.enabled}
                        onClick={() => updateRsvp({ enabled: !rsvpState.enabled })}
                        className={cn(
                          'relative h-6 w-11 shrink-0 rounded-full transition-colors',
                          rsvpState.enabled ? 'bg-terracotta-500' : 'bg-neutral-200',
                        )}
                      >
                        <span
                          className={cn(
                            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
                            rsvpState.enabled ? 'left-[22px]' : 'left-0.5',
                          )}
                        />
                      </button>
                    </div>
                    {rsvpState.enabled && (
                      <div className="flex flex-col gap-4">
                        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-ink">
                          Date limite de réponse
                          <input
                            type="date"
                            value={rsvpState.deadline}
                            onChange={(e) => updateRsvp({ deadline: e.target.value })}
                            className="w-full max-w-60 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-[14px] outline-none focus:border-terracotta-500"
                          />
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {(
                            [
                              ['askPlusOnes', 'Accompagnants'],
                              ['askAllergies', 'Allergies'],
                              ['askSong', 'Chanson favorite'],
                              ['askMessage', 'Message libre'],
                            ] as const
                          ).map(([key, label]) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => updateRsvp({ [key]: !rsvpState[key] })}
                              className={cn(
                                'rounded-full border px-4 py-2 text-[13px] font-medium transition-all',
                                rsvpState[key]
                                  ? 'border-terracotta-500 bg-terracotta-500 text-white'
                                  : 'border-neutral-200 bg-white text-ink hover:border-terracotta-400',
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Nav précédent / suivant */}
            <div className="mt-8 flex items-center justify-between border-t border-neutral-200 pt-5">
              <button
                type="button"
                onClick={() => goStep(step - 1)}
                disabled={step === 1}
                className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-5 py-2.5 text-[13px] font-medium text-ink transition-colors hover:bg-neutral-100 disabled:opacity-40"
              >
                <ChevronLeft size={15} /> Précédent
              </button>
              {step < 4 ? (
                <button
                  type="button"
                  onClick={() => goStep(step + 1)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-terracotta-500 px-6 py-2.5 text-[13px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400 active:scale-[0.97]"
                >
                  Suivant <ChevronRight size={15} />
                </button>
              ) : (
                <StatusBadge tone={completionPct >= 100 ? 'success' : 'terracotta'}>
                  {completionPct >= 100 ? 'Questionnaire complété ✓' : `Complété à ${completionPct} %`}
                </StatusBadge>
              )}
            </div>
          </SectionCard>

          {/* Note vocale */}
          <SectionCard id="vocale" className="scroll-mt-24">
            <div className="flex flex-col gap-5 sm:flex-row">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-terracotta-500/10 text-terracotta-500">
                <Mic size={26} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-2xl font-medium italic text-ink">
                  Racontez-nous à voix haute.
                </h3>
                <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-neutral-500">
                  2 à 5 minutes, parlez comme à un ami : votre rencontre, les détails du mariage, ce
                  qui vous fait rire. Votre voix guide l'écriture de la voix off.
                </p>

                {latestVoiceNote && (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <StatusBadge tone="success">
                      <Check size={13} /> Note vocale reçue — {formatDurationLong(latestVoiceNote.durationSec)}
                    </StatusBadge>
                    {latestVoiceNote.url.startsWith('data:') && (
                      <audio controls src={latestVoiceNote.url} className="h-9 max-w-64" />
                    )}
                  </div>
                )}

                <div className="mt-5">
                  <VoiceRecorder onSend={handleVoiceSend} />
                </div>

                {/* Alternative WhatsApp */}
                <div className="mt-6 flex items-center gap-4">
                  <span className="h-px flex-1 bg-neutral-200" />
                  <span className="text-[12px] font-medium uppercase tracking-widest text-neutral-500">ou</span>
                  <span className="h-px flex-1 bg-neutral-200" />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-anthracite-800 px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-anthracite-700"
                  >
                    Ouvrir WhatsApp
                  </a>
                  <p className="max-w-xs text-[12.5px] leading-snug text-neutral-500">
                    Votre message vocal WhatsApp sera rattaché à votre dossier par notre équipe.
                  </p>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Médiathèque */}
          <SectionCard id="medias" className="scroll-mt-24">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-2xl font-medium italic text-ink">
                  Vos photos.
                </h3>
                <p className="mt-1 text-[13.5px] text-neutral-500">
                  Ces images alimentent votre vidéo. 10–30 photos, c'est l'idéal.
                </p>
              </div>
              <span className="text-[13px] font-medium text-neutral-500">
                {(mediaQuery.data ?? []).length} fichier{(mediaQuery.data ?? []).length > 1 ? 's' : ''}
              </span>
            </div>

            <UploadZone onFiles={(files) => void handleFiles(files)} />

            {/* Filtres */}
            <div className="mt-5 flex gap-2">
              {(
                [
                  ['all', 'Tous'],
                  ['photo', 'Photos'],
                  // 'video' retiré (2026-08-27, demande client) : l'envoi
                  // n'accepte plus que des images (cf. UploadZone
                  // ci-dessus, accept="image/*") — d'éventuelles vidéos
                  // envoyées avant ce changement restent visibles dans
                  // "Tous", juste plus filtrables par un onglet dédié.
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMediaFilter(key)}
                  className={cn(
                    'rounded-full px-4 py-1.5 text-[12.5px] font-medium transition-all',
                    mediaFilter === key
                      ? 'bg-anthracite-800 text-white'
                      : 'bg-neutral-100 text-ink hover:bg-neutral-200',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Vignettes */}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <AnimatePresence>
                {pending.map((p) => (
                  <motion.div
                    key={p.key}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="relative aspect-square overflow-hidden rounded-xl bg-neutral-100"
                  >
                    {p.previewUrl ? (
                      <img src={p.previewUrl} alt={p.filename} className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center text-[12px] text-neutral-500">
                        {p.filename}
                      </span>
                    )}
                    <span className="absolute inset-x-2 bottom-2 rounded-lg bg-white/90 px-2 py-1.5 text-[11px] font-medium backdrop-blur">
                      {p.error ? (
                        <span className="text-error">{p.error}</span>
                      ) : (
                        <span className="text-ink">
                          Envoi… {p.progress}%
                          <span className="mt-1 block h-1 overflow-hidden rounded-full bg-neutral-200">
                            <span
                              className="block h-full bg-terracotta-500 transition-all"
                              style={{ width: `${p.progress}%` }}
                            />
                          </span>
                        </span>
                      )}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
              {mediaItems.map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.05, duration: 0.35 }}
                  className="group relative aspect-square overflow-hidden rounded-xl bg-neutral-100"
                >
                  {m.type === 'photo' ? (
                    <img
                      src={m.url}
                      alt={m.filename ?? 'photo'}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <video src={m.url} className="h-full w-full object-cover" muted preload="metadata" />
                  )}
                  <button
                    type="button"
                    aria-label="Supprimer ce fichier"
                    onClick={() => setDeleteTarget({ id: m.id, filename: m.filename ?? `fichier-${m.id}` })}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-neutral-500 opacity-0 shadow backdrop-blur transition-all hover:bg-error hover:text-white group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                  <span className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2 rounded-lg bg-white/90 px-2 py-1.5 backdrop-blur">
                    <span className="min-w-0 truncate text-[11px] font-medium text-ink">
                      {m.filename ?? `fichier-${m.id}`}
                    </span>
                    {m.status === 'rejected' ? (
                      <span className="shrink-0 rounded-full bg-error/10 px-2 py-0.5 text-[10px] font-semibold text-error">
                        À remplacer
                      </span>
                    ) : m.status === 'validated' ? (
                      <span className="shrink-0 rounded-full bg-[#6FA287]/15 px-2 py-0.5 text-[10px] font-semibold text-[#4d7a62]">
                        Validé ✓
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-[#6FA287]/15 px-2 py-0.5 text-[10px] font-semibold text-[#4d7a62]">
                        Reçu ✓
                      </span>
                    )}
                  </span>
                </motion.div>
              ))}
            </div>
            {mediaItems.length === 0 && pending.length === 0 && (
              <p className="mt-4 text-center text-[13px] text-neutral-500">
                Aucun fichier pour ce filtre — vos envois apparaîtront ici.
              </p>
            )}
          </SectionCard>

          {/* Confirmation de suppression d'un média */}
          <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer ce fichier ?</AlertDialogTitle>
                <AlertDialogDescription>
                  {deleteTarget ? `« ${deleteTarget.filename} » sera définitivement supprimé.` : ''}{' '}
                  Cette action est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleteMediaMutation.isPending}>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  disabled={deleteMediaMutation.isPending}
                  onClick={(e) => {
                    e.preventDefault()
                    if (deleteTarget) deleteMediaMutation.mutate({ mediaId: deleteTarget.id })
                  }}
                  className="bg-error text-white hover:bg-error/90"
                >
                  {deleteMediaMutation.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  )
}
