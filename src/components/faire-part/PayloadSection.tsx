import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Heart, PartyPopper } from 'lucide-react'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { trpc } from '@/providers/trpc'

type Attending = 'yes' | 'no'

export interface PayloadField {
  label: string
  value: string
}

/**
 * Palette du bloc payload — dérivée du thème du couple (skill v0.37 : « toute
 * la page dérive du thème du couple »), pas seulement le hero. Valeurs par
 * défaut = charte claire d'Edwige & Wilfried (Minimal + pastel), pour que
 * cette page continue de fonctionner sans rien changer si aucun `theme`
 * n'est passé. Un couple en ambiance Cinéma (fond sombre, ex. Léa & Olivier)
 * passe ses propres couleurs.
 */
export interface PayloadTheme {
  sectionBg: string
  cardBg: string
  cardBorder: string
  accent: string
  accentHover: string
  heading: string
  text: string
}

const DEFAULT_PAYLOAD_THEME: PayloadTheme = {
  sectionBg: '#FBF7F1',
  cardBg: 'rgba(255, 255, 255, 0.7)',
  cardBorder: 'rgba(232, 201, 196, 0.6)',
  accent: '#B9776C',
  accentHover: '#A6675C',
  heading: '#2E2620',
  text: '#2E2620',
}

/**
 * Bloc payload — le faire-part fonctionnel (skill Étape 5.B.1), sous le
 * hero. Texte du formulaire posé **verbatim** — jamais reformulé.
 * Hébergement / infos pratiques non renseignés : le champ correspondant est
 * simplement absent de `fields` plutôt que de laisser un bloc vide (cf.
 * instructions §2.B.1). Formulaire RSVP court en Dialog, dégradé en local
 * si le slug n'existe pas côté backend. Le Dialog RSVP reste volontairement
 * clair quel que soit le thème de la page (lisibilité du formulaire avant
 * tout, pattern courant pour une modale par-dessus une page sombre).
 *
 * `children` (render prop) : remplace la pile de cartes + bouton par défaut
 * par une mise en page personnalisée — cf. Léa & Olivier (DetailsSombre),
 * dont le bloc détails (date/compte à rebours/lieu/programme/dress
 * code/hébergements/RSVP) est trop différent de la pile de cartes plate
 * pour rester une simple variation de thème. Le titre ("Le faire-part" +
 * "{coupleNames} se marient") et le Dialog RSVP restent portés par CE
 * composant dans les deux cas — pas dupliqués côté appelant — `children`
 * reçoit `openRsvp` pour déclencher le même Dialog.
 */
export default function PayloadSection({
  slug,
  coupleNames,
  fields = [],
  rsvpCtaLabel = 'Répondre à l’invitation',
  theme,
  children,
}: {
  slug: string
  coupleNames: string
  fields?: PayloadField[]
  rsvpCtaLabel?: string
  theme?: Partial<PayloadTheme>
  children?: (openRsvp: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  const rsvpStorageKey = `scrollthedate-fp-rsvp-${slug}`
  const t = { ...DEFAULT_PAYLOAD_THEME, ...theme }

  return (
    <section
      className="relative px-6 py-24 text-center lg:py-32"
      style={{ background: t.sectionBg }}
      aria-label="Informations du mariage"
    >
      <div className="mx-auto max-w-[560px]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: t.accent }}>
          Le faire-part
        </p>
        <h2
          className="font-display mt-4 text-[clamp(1.9rem,4.4vw,2.6rem)] font-normal italic leading-[1.15]"
          style={{ color: t.heading }}
        >
          {coupleNames} se marient
        </h2>

        {children ? (
          children(() => setOpen(true))
        ) : (
          <>
            <dl className="mt-12 flex flex-col gap-6 text-left sm:mt-14">
              {fields.map((field) => (
                <div
                  key={field.label}
                  className="flex flex-col gap-1 rounded-2xl border px-6 py-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
                  style={{ borderColor: t.cardBorder, background: t.cardBg }}
                >
                  <dt className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: t.accent }}>
                    {field.label}
                  </dt>
                  <dd
                    className="whitespace-pre-line text-[15px] font-light sm:text-right"
                    style={{ color: t.text }}
                  >
                    {field.value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-11">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center justify-center rounded-full px-9 py-4 text-[13px] font-semibold uppercase tracking-[0.1em] text-white transition-colors"
                style={{ background: t.accent }}
                onMouseEnter={(e) => (e.currentTarget.style.background = t.accentHover)}
                onMouseLeave={(e) => (e.currentTarget.style.background = t.accent)}
              >
                {rsvpCtaLabel}
              </button>
            </div>
          </>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton
          className="max-w-lg border-none bg-transparent p-0 shadow-none [&_[data-slot=dialog-close]]:top-6 [&_[data-slot=dialog-close]]:right-6 [&_[data-slot=dialog-close]]:text-ink/50"
        >
          <VisuallyHidden>
            <DialogTitle>{rsvpCtaLabel}</DialogTitle>
          </VisuallyHidden>
          <RsvpForm slug={slug} coupleNames={coupleNames} storageKey={rsvpStorageKey} />
        </DialogContent>
      </Dialog>
    </section>
  )
}

function RsvpForm({ slug, coupleNames, storageKey }: { slug: string; coupleNames: string; storageKey: string }) {
  const publicQuery = trpc.rsvp.getPublic.useQuery(
    { slug },
    { retry: false, refetchOnWindowFocus: false, staleTime: Infinity },
  )
  const backendDown = publicQuery.isError
  const submitMutation = trpc.rsvp.submit.useMutation()

  const [guestName, setGuestName] = useState('')
  const [email, setEmail] = useState('')
  const [attending, setAttending] = useState<Attending>('yes')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [localOnly, setLocalOnly] = useState(false)
  const [done, setDone] = useState<Attending | null>(() => {
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (!raw) return null
      return (JSON.parse(raw) as { attending?: Attending }).attending ?? 'yes'
    } catch {
      return null
    }
  })

  const saveLocal = (payload: { guestName: string; email: string; attending: Attending; message: string }) => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ ...payload, at: new Date().toISOString() }))
    } catch {
      /* stockage indisponible — ignorer */
    }
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    const payload = { guestName: guestName.trim(), email: email.trim(), attending, message: message.trim() }

    if (backendDown) {
      saveLocal(payload)
      setLocalOnly(true)
      setDone(attending)
      setSubmitting(false)
      return
    }

    try {
      await submitMutation.mutateAsync({
        slug,
        guestName: payload.guestName,
        email: payload.email || undefined,
        attending: payload.attending,
        plusOnes: 0,
        message: payload.message || undefined,
      })
      saveLocal(payload)
      setDone(attending)
    } catch {
      saveLocal(payload)
      setLocalOnly(true)
      setDone(attending)
    } finally {
      setSubmitting(false)
    }
  }

  const fieldClass =
    'w-full rounded-[10px] border border-neutral-200 bg-white px-4 py-3 text-[15px] text-ink placeholder:text-neutral-500/70 outline-none transition-colors focus:border-[#B9776C] focus:ring-2 focus:ring-[#B9776C]/20'
  const labelClass = 'mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/60'

  return (
    <motion.div
      initial={{ y: 18, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-[20px] bg-white p-8 shadow-[0_24px_64px_rgba(46,38,32,0.28)] sm:p-10"
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
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#B9776C]/10">
              {done === 'yes' ? (
                <PartyPopper size={24} className="text-[#B9776C]" aria-hidden />
              ) : (
                <Heart size={24} className="text-[#B9776C]" aria-hidden />
              )}
            </span>
            <h2 className="font-display mt-6 text-[2rem] font-light tracking-[-0.01em] text-ink">Merci&nbsp;!</h2>
            <p className="mt-3 max-w-sm text-[15px] leading-[1.65] text-ink/70">
              {done === 'yes'
                ? `Votre réponse est bien arrivée. ${coupleNames} ont hâte de vous accueillir.`
                : `Votre réponse est bien arrivée. Vous manquerez à ${coupleNames}.`}
            </p>
            {localOnly && (
              <p className="mt-4 rounded-full bg-neutral-100 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-500">
                Réponse enregistrée localement
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                setDone(null)
                setLocalOnly(false)
                try {
                  window.localStorage.removeItem(storageKey)
                } catch {
                  /* ignorer */
                }
              }}
              className="mt-6 text-[12px] font-medium uppercase tracking-[0.12em] text-[#B9776C] underline-offset-4 transition-colors hover:underline"
            >
              Modifier ma réponse
            </button>
          </motion.div>
        ) : (
          <motion.form key="form" onSubmit={onSubmit} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
            <div className="text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B9776C]">RSVP</p>
              <h2 className="font-display mt-3 text-[clamp(1.6rem,3.6vw,2.1rem)] font-light leading-[1.15] text-ink">
                Serez-vous <em className="italic text-[#B9776C]">des nôtres&nbsp;?</em>
              </h2>
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="fp-rsvp-name" className={labelClass}>
                  Nom &amp; prénom
                </label>
                <input
                  id="fp-rsvp-name"
                  required
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Votre nom"
                  className={fieldClass}
                  autoComplete="name"
                />
              </div>
              <div>
                <label htmlFor="fp-rsvp-email" className={labelClass}>
                  Email
                </label>
                <input
                  id="fp-rsvp-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.fr"
                  className={fieldClass}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="mt-6">
              <span className={labelClass}>Votre réponse</span>
              <div className="flex gap-3" role="radiogroup" aria-label="Présence">
                {(['yes', 'no'] as const).map((value) => {
                  const active = attending === value
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setAttending(value)}
                      className={cn(
                        'flex flex-1 items-center justify-center gap-2.5 rounded-full border px-5 py-3.5 text-[13px] font-semibold uppercase tracking-[0.08em] transition-all active:scale-[0.97]',
                        active
                          ? 'border-[#B9776C] bg-[#B9776C] text-white'
                          : 'border-neutral-200 bg-white text-ink/70 hover:border-[#B9776C]/60 hover:text-ink',
                      )}
                    >
                      {value === 'yes' ? 'On sera là !' : 'Hélas non'}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-5">
              <label htmlFor="fp-rsvp-message" className={labelClass}>
                Un mot pour {coupleNames} (facultatif)
              </label>
              <textarea
                id="fp-rsvp-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className={cn(fieldClass, 'resize-none')}
              />
            </div>

            <div className="mt-8">
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-full bg-[#B9776C] py-4 text-[13px] font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-[#A6675C] disabled:cursor-wait disabled:opacity-70"
              >
                {submitting ? 'Envoi en cours…' : 'Envoyer ma réponse'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
