import { memo, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Heart, Minus, PartyPopper, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'
import { trpc } from '@/providers/trpc'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { DEMO_SLUG, RSVP_DEADLINE_LABEL } from './demoContent'

const RSVP_STORAGE_KEY = 'felicity-demo-rsvp'
const DEADLINE_LABEL = `Réponse souhaitée avant le ${RSVP_DEADLINE_LABEL}.`

type Attending = 'yes' | 'no'

interface RsvpPayload {
  guestName: string
  email: string
  attending: Attending
  plusOnes: number
  childrenAges: string
  allergies: string
  song: string
}

/* ------------------------------------------------------------------ */
/* Confettis corail/écru — canvas isolé, burst de 1.2s (memo).          */
/* ------------------------------------------------------------------ */
const ConfettiBurst = memo(function ConfettiBurst() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const COLORS = ['#C97A5C', '#DD8A6B', '#F5EEE4', '#B8AC9C', '#241E17']
    const parts = Array.from({ length: 90 }, () => ({
      x: rect.width / 2,
      y: rect.height * 0.35,
      vx: (Math.random() - 0.5) * 11,
      vy: -(3 + Math.random() * 8),
      size: 3 + Math.random() * 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
    }))

    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const elapsed = (now - start) / 1000
      ctx.clearRect(0, 0, rect.width, rect.height)
      if (elapsed > 1.2) return
      const fade = elapsed > 0.9 ? 1 - (elapsed - 0.9) / 0.3 : 1
      for (const p of parts) {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.32
        p.rot += p.vr
        ctx.save()
        ctx.globalAlpha = fade
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
        ctx.restore()
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  )
})

/* ------------------------------------------------------------------ */
/* Radio pilule animé                                                   */
/* ------------------------------------------------------------------ */
function AttendingPill({
  value,
  current,
  onSelect,
  children,
}: {
  value: Attending
  current: Attending
  onSelect: (v: Attending) => void
  children: string
}) {
  const active = current === value
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={() => onSelect(value)}
      className={cn(
        'flex flex-1 items-center justify-center gap-2.5 rounded-full border px-5 py-3.5 text-[13px] font-semibold uppercase tracking-[0.08em] transition-all active:scale-[0.97]',
        active
          ? 'border-[#C97A5C] bg-[#C97A5C] text-white'
          : 'border-neutral-200 bg-white text-ink/70 hover:border-[#DD8A6B] hover:text-ink',
      )}
    >
      <motion.span
        animate={{ scale: active ? 1 : 0, opacity: active ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 22 }}
        className="flex h-4 w-4 items-center justify-center rounded-full bg-white/25"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-white" />
      </motion.span>
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Formulaire RSVP — logique intacte, ouvert dans un Dialog depuis      */
/* la section sobre (un seul CTA, cf. brief nouvelle architecture).     */
/* ------------------------------------------------------------------ */
function RsvpForm() {
  const publicQuery = trpc.rsvp.getPublic.useQuery(
    { slug: DEMO_SLUG },
    { retry: false, refetchOnWindowFocus: false, staleTime: Infinity },
  )
  const backendDown = publicQuery.isError
  const submitMutation = trpc.rsvp.submit.useMutation()

  const [guestName, setGuestName] = useState('')
  const [email, setEmail] = useState('')
  const [attending, setAttending] = useState<Attending>('yes')
  const [plusOnes, setPlusOnes] = useState(0)
  const [hasChildren, setHasChildren] = useState(false)
  const [childrenAges, setChildrenAges] = useState('')
  const [allergies, setAllergies] = useState('')
  const [song, setSong] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [localOnly, setLocalOnly] = useState(false)
  const [done, setDone] = useState<Attending | null>(() => {
    try {
      const raw = window.localStorage.getItem(RSVP_STORAGE_KEY)
      if (!raw) return null
      return (JSON.parse(raw) as { attending?: Attending }).attending ?? 'yes'
    } catch {
      return null
    }
  })

  const saveLocal = (payload: RsvpPayload) => {
    try {
      window.localStorage.setItem(
        RSVP_STORAGE_KEY,
        JSON.stringify({ ...payload, at: new Date().toISOString() }),
      )
    } catch {
      /* stockage indisponible — ignorer */
    }
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    const payload: RsvpPayload = {
      guestName: guestName.trim(),
      email: email.trim(),
      attending,
      plusOnes,
      childrenAges: hasChildren ? childrenAges.trim() : '',
      allergies: allergies.trim(),
      song: song.trim(),
    }

    if (backendDown) {
      // Mode dégradé : RSVP simulé en local.
      saveLocal(payload)
      setLocalOnly(true)
      setDone(attending)
      setSubmitting(false)
      return
    }

    try {
      await submitMutation.mutateAsync({
        slug: DEMO_SLUG,
        guestName: payload.guestName,
        email: payload.email || undefined,
        attending: payload.attending,
        plusOnes: payload.plusOnes,
        allergies: payload.allergies || undefined,
        song: payload.song || undefined,
        message:
          payload.childrenAges.length > 0 ? `Enfants : ${payload.childrenAges}` : undefined,
      })
      saveLocal(payload)
      setDone(attending)
    } catch {
      // Le backend lâche entre-temps : on retombe sur la simulation locale.
      saveLocal(payload)
      setLocalOnly(true)
      setDone(attending)
    } finally {
      setSubmitting(false)
    }
  }

  const fieldClass =
    'w-full rounded-[10px] border border-neutral-200 bg-white px-4 py-3 text-[15px] text-ink placeholder:text-neutral-500/70 outline-none transition-colors focus:border-[#C97A5C] focus:ring-2 focus:ring-[#C97A5C]/20'
  const labelClass = 'mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/60'

  const fieldVariants = {
    hidden: { y: 18, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
      className="relative overflow-hidden rounded-[20px] bg-white p-8 shadow-[0_24px_64px_rgba(23,19,15,0.4)] sm:p-10"
    >
      <AnimatePresence mode="wait">
        {done ? (
          <motion.div
            key="confirmation"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center py-6 text-center"
          >
            {done === 'yes' && <ConfettiBurst />}
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#C97A5C]/10">
              {done === 'yes' ? (
                <PartyPopper size={24} className="text-[#C97A5C]" aria-hidden />
              ) : (
                <Heart size={24} className="text-[#C97A5C]" aria-hidden />
              )}
            </span>
            <h2 className="font-display mt-6 text-[2rem] font-light tracking-[-0.01em] text-ink">
              Merci&nbsp;!
            </h2>
            <p className="mt-3 max-w-sm text-[15px] leading-[1.65] text-ink/70">
              {done === 'yes'
                ? 'Votre réponse est bien arrivée. On a déjà hâte de danser avec vous.'
                : 'Votre réponse est bien arrivée. Vous nous manquerez — on vous racontera tout.'}
            </p>
            {localOnly && (
              <p className="mt-4 rounded-full bg-neutral-100 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-500">
                Mode démo hors-ligne — réponse enregistrée localement
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                setDone(null)
                setLocalOnly(false)
                try {
                  window.localStorage.removeItem(RSVP_STORAGE_KEY)
                } catch {
                  /* ignorer */
                }
              }}
              className="mt-6 text-[12px] font-medium uppercase tracking-[0.12em] text-[#C97A5C] underline-offset-4 transition-colors hover:text-[#DD8A6B] hover:underline"
            >
              Modifier ma réponse
            </button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={onSubmit}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col"
          >
            <motion.div variants={fieldVariants} className="text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C97A5C]">
                RSVP
              </p>
              <h2 className="font-display mt-3 text-[clamp(1.8rem,4vw,2.4rem)] font-light leading-[1.1] tracking-[-0.015em] text-ink">
                Serez-vous <em className="italic text-[#C97A5C]">des nôtres&nbsp;?</em>
              </h2>
              <p className="mt-3 text-[13px] font-medium text-neutral-500">{DEADLINE_LABEL}</p>
            </motion.div>

            <motion.div variants={fieldVariants} className="mt-8 grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="rsvp-name" className={labelClass}>
                  Nom & prénom
                </label>
                <input
                  id="rsvp-name"
                  required
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Camille Dupont"
                  className={fieldClass}
                  autoComplete="name"
                />
              </div>
              <div>
                <label htmlFor="rsvp-email" className={labelClass}>
                  Email
                </label>
                <input
                  id="rsvp-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="camille@exemple.fr"
                  className={fieldClass}
                  autoComplete="email"
                />
              </div>
            </motion.div>

            <motion.div variants={fieldVariants} className="mt-6">
              <span className={labelClass}>Votre réponse</span>
              <div className="flex gap-3" role="radiogroup" aria-label="Présence">
                <AttendingPill value="yes" current={attending} onSelect={setAttending}>
                  On sera là !
                </AttendingPill>
                <AttendingPill value="no" current={attending} onSelect={setAttending}>
                  Hélas non
                </AttendingPill>
              </div>
            </motion.div>

            <AnimatePresence initial={false}>
              {attending === 'yes' && (
                <motion.div
                  key="details"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="mt-6 grid gap-5 sm:grid-cols-2">
                    <div>
                      <span className={labelClass} id="plus-ones-label">
                        Accompagnants
                      </span>
                      <div
                        className="flex items-center justify-between rounded-[10px] border border-neutral-200 px-2 py-1.5"
                        role="group"
                        aria-labelledby="plus-ones-label"
                      >
                        <button
                          type="button"
                          onClick={() => setPlusOnes((v) => Math.max(0, v - 1))}
                          aria-label="Retirer un accompagnant"
                          className="flex h-9 w-9 items-center justify-center rounded-full text-ink/60 transition-colors hover:bg-neutral-100 hover:text-[#C97A5C] active:scale-[0.95]"
                        >
                          <Minus size={15} />
                        </button>
                        <span className="tabular text-[15px] font-semibold text-ink">{plusOnes}</span>
                        <button
                          type="button"
                          onClick={() => setPlusOnes((v) => Math.min(10, v + 1))}
                          aria-label="Ajouter un accompagnant"
                          className="flex h-9 w-9 items-center justify-center rounded-full text-ink/60 transition-colors hover:bg-neutral-100 hover:text-[#C97A5C] active:scale-[0.95]"
                        >
                          <Plus size={15} />
                        </button>
                      </div>
                    </div>
                    <div>
                      <span className={labelClass}>Enfants</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={hasChildren}
                        onClick={() => setHasChildren((v) => !v)}
                        className={cn(
                          'flex w-full items-center justify-between rounded-[10px] border px-4 py-3 transition-colors',
                          hasChildren ? 'border-[#C97A5C] bg-[#C97A5C]/5' : 'border-neutral-200 bg-white',
                        )}
                      >
                        <span className="text-[14px] font-medium text-ink/80">
                          {hasChildren ? 'Avec enfants' : 'Sans enfant'}
                        </span>
                        <span
                          className={cn(
                            'relative h-5 w-9 rounded-full transition-colors',
                            hasChildren ? 'bg-[#C97A5C]' : 'bg-neutral-200',
                          )}
                        >
                          <motion.span
                            animate={{ x: hasChildren ? 16 : 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                            className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow"
                          />
                        </span>
                      </button>
                    </div>
                  </div>

                  <AnimatePresence initial={false}>
                    {hasChildren && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="mt-5">
                          <label htmlFor="rsvp-children" className={labelClass}>
                            Âges des enfants
                          </label>
                          <input
                            id="rsvp-children"
                            value={childrenAges}
                            onChange={(e) => setChildrenAges(e.target.value)}
                            placeholder="Ex. 4 ans et 7 ans"
                            className={fieldClass}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="mt-5">
                    <label htmlFor="rsvp-allergies" className={labelClass}>
                      Allergies / régime
                    </label>
                    <textarea
                      id="rsvp-allergies"
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                      placeholder="Arachides, végétarien, sans gluten…"
                      rows={3}
                      className={cn(fieldClass, 'resize-none')}
                    />
                  </div>

                  <div className="mt-5">
                    <label htmlFor="rsvp-song" className={labelClass}>
                      La chanson qui vous fera danser
                    </label>
                    <input
                      id="rsvp-song"
                      value={song}
                      onChange={(e) => setSong(e.target.value)}
                      placeholder="Ex. September — Earth, Wind & Fire"
                      className={fieldClass}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div variants={fieldVariants} className="mt-8">
              <motion.button
                type="submit"
                disabled={submitting}
                whileTap={{ scale: 0.97 }}
                className="w-full rounded-full bg-[#C97A5C] py-4 text-[13px] font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-[#DD8A6B] disabled:cursor-wait disabled:opacity-70"
              >
                {submitting ? 'Envoi en cours…' : 'Envoyer ma réponse'}
              </motion.button>
              {backendDown && (
                <p className="mt-3 text-center text-[11px] font-medium uppercase tracking-[0.1em] text-neutral-500">
                  Démo hors-ligne — la réponse sera simulée sur cet appareil
                </p>
              )}
            </motion.div>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Section 2 — RSVP sobre : un seul CTA qui ouvre le formulaire.        */
/* Fond `--bg-alt`, pas de photo, pas de lien d'hébergement (cf. brief).*/
/* ------------------------------------------------------------------ */
export default function RsvpSection({ showInfosLink = true }: { showInfosLink?: boolean }) {
  const [open, setOpen] = useState(false)

  return (
    <section
      className="relative overflow-hidden bg-[#1D1813] px-6 py-28 text-center lg:py-40"
      aria-label="RSVP"
      id="rsvp"
    >
      <div className="relative mx-auto max-w-[540px]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#C97A5C]">RSVP</p>
        <h2 className="font-display mt-4 text-[clamp(2rem,5vw,2.75rem)] font-normal italic leading-[1.15] text-[#F5EEE4]">
          On compte sur vous
        </h2>
        <p className="mx-auto mt-5 max-w-sm text-[15px] font-light leading-[1.7] text-[#B8AC9C]">
          Un mot, une présence, une absence — dites-le nous simplement.
          {' '}{DEADLINE_LABEL}
        </p>

        {showInfosLink && (
          <Link
            to="/demo/infos"
            className="mt-6 inline-flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.08em] text-[#B8AC9C] underline-offset-4 transition-colors hover:text-[#C97A5C] hover:underline"
          >
            Voir toutes les informations du mariage →
          </Link>
        )}

        <div className="mt-9">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center justify-center rounded-full bg-[#C97A5C] px-9 py-4 text-[13px] font-semibold uppercase tracking-[0.1em] text-[#17130F] transition-colors hover:bg-[#DD8A6B]"
          >
            Confirmer ma présence
          </button>
        </div>

        <p className="mt-10 text-[10px] uppercase tracking-[0.2em] text-[rgba(184,172,156,0.6)]">
          Créé avec Félicity
        </p>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton
          className="max-w-xl border-none bg-transparent p-0 shadow-none [&_[data-slot=dialog-close]]:top-6 [&_[data-slot=dialog-close]]:right-6 [&_[data-slot=dialog-close]]:text-ink/50"
        >
          <VisuallyHidden>
            <DialogTitle>Confirmer ma présence</DialogTitle>
          </VisuallyHidden>
          <RsvpForm />
        </DialogContent>
      </Dialog>
    </section>
  )
}
