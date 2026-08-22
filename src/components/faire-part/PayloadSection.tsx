import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, FocusEvent, FormEvent, ReactNode } from 'react'
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
 * Palette du Dialog RSVP — historiquement toujours clair, quel que soit le
 * thème de la page (lisibilité du formulaire avant tout). Reste le défaut
 * ici pour ne rien changer sur les pages existantes ; `rsvpTheme` permet à
 * une page de l'adapter (cf. Léa & Olivier, dont le Dialog reprend le
 * fond sombre + accent rouge du reste de la page).
 */
export interface RsvpTheme {
  modalBg: string
  shadow: string
  heading: string
  text: string
  textMuted: string
  accent: string
  accentHover: string
  accentSoft: string
  inputBg: string
  inputBorder: string
  inputText: string
  inputPlaceholder: string
}

const DEFAULT_RSVP_THEME: RsvpTheme = {
  modalBg: '#FFFFFF',
  shadow: '0 24px 64px rgba(46, 38, 32, 0.28)',
  heading: '#232326',
  text: '#232326',
  textMuted: 'rgba(35, 35, 38, 0.7)',
  accent: '#B9776C',
  accentHover: '#A6675C',
  accentSoft: 'rgba(185, 119, 108, 0.1)',
  inputBg: '#FFFFFF',
  inputBorder: '#E8E5E1',
  inputText: '#232326',
  inputPlaceholder: 'rgba(154, 154, 160, 0.7)',
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
 *
 * `eyebrow`/`heading` : le titre par défaut ("Le faire-part" au-dessus,
 * "{coupleNames} se marient" en dessous) reste le défaut pour ne rien
 * changer sur les pages existantes — `eyebrow={null}` le masque,
 * `heading` remplace le texte par défaut (cf. Léa & Olivier, qui masque
 * l'eyebrow et personnalise le heading en "Nous nous marions").
 *
 * `headingCascade` : le titre se découpe en mots qui apparaissent en
 * cascade au scroll (cf. CascadeHeading) au lieu d'être visible d'un coup
 * — opt-in, `false` par défaut pour ne rien changer sur les pages
 * existantes (cf. Léa & Olivier, seule page à l'activer).
 *
 * `headingSizeClass` : taille du titre — par défaut la même valeur
 * `clamp(...)` qu'avant (aucun changement sur les pages existantes),
 * remplaçable pour un titre plus long (cf. Edwige & Wilfried, dont le
 * titre est devenu une phrase entière plutôt que "{coupleNames} se
 * marient", réduite de moitié pour rester lisible sans dominer la page).
 */
export default function PayloadSection({
  slug,
  coupleNames,
  fields = [],
  rsvpCtaLabel = 'Répondre à l’invitation',
  theme,
  rsvpTheme,
  eyebrow = 'Le faire-part',
  heading,
  headingSizeClass = 'text-[clamp(1.9rem,4.4vw,2.6rem)]',
  headingCascade = false,
  children,
}: {
  slug: string
  coupleNames: string
  fields?: PayloadField[]
  rsvpCtaLabel?: string
  theme?: Partial<PayloadTheme>
  /** Palette du Dialog RSVP — par défaut toujours clair, cf. RsvpTheme. */
  rsvpTheme?: Partial<RsvpTheme>
  /** `null` pour masquer l'eyebrow au-dessus du titre. */
  eyebrow?: string | null
  /** Texte du titre — par défaut "{coupleNames} se marient". */
  heading?: string
  /** Classe Tailwind de taille du titre — par défaut la taille historique. */
  headingSizeClass?: string
  /** Le titre apparaît mot par mot au scroll plutôt que d'un coup. */
  headingCascade?: boolean
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
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: t.accent }}>
            {eyebrow}
          </p>
        )}
        {headingCascade ? (
          <CascadeHeading
            text={heading ?? `${coupleNames} se marient`}
            className={`font-display ${headingSizeClass} font-normal italic leading-[1.15] ${eyebrow ? 'mt-4' : ''}`}
            color={t.heading}
          />
        ) : (
          <h2
            className={`font-display ${headingSizeClass} font-normal italic leading-[1.15] ${eyebrow ? 'mt-4' : ''}`}
            style={{ color: t.heading }}
          >
            {heading ?? `${coupleNames} se marient`}
          </h2>
        )}

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
          <RsvpForm
            slug={slug}
            coupleNames={coupleNames}
            storageKey={rsvpStorageKey}
            theme={{ ...DEFAULT_RSVP_THEME, ...rsvpTheme }}
          />
        </DialogContent>
      </Dialog>
    </section>
  )
}

/**
 * Titre qui se découpe en mots, chacun apparaissant en cascade au scroll —
 * translateY + légère rotation, easing cubic-bezier(.22,1,.36,1). Une seule
 * IntersectionObserver pour tout le titre (pas une par mot) : c'est le
 * titre entier qui doit entrer dans l'écran pour déclencher, chaque mot n'a
 * qu'un délai différent une fois ce point atteint — pas 5 observers
 * indépendants qui se déclencheraient à des instants de scroll différents.
 * Respecte `prefers-reduced-motion`, même pattern que DetailsSombre/
 * PhotoSplitCinematique.
 */
function CascadeHeading({ text, className, color }: { text: string; className: string; color: string }) {
  const ref = useRef<HTMLHeadingElement>(null)
  const [revealed, setRevealed] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (reducedMotion) {
      setRevealed(true)
      return
    }
    const el = ref.current
    if (!el || revealed) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setRevealed(true)
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.4 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [revealed, reducedMotion])

  // Découpage par ligne d'abord (saut de ligne explicite, ex. Edwige &
  // Wilfried : "Edwige & Wilfried\nse marient") puis par mot — l'index de
  // cascade continue d'une ligne à l'autre (pas remis à 0), pour que le
  // mouvement reste un seul geste fluide sur tout le titre plutôt que deux
  // cascades indépendantes qui repartiraient chacune de zéro.
  const lines = text.split('\n')
  let wordIndex = 0

  return (
    <h2 ref={ref} className={className} style={{ color }}>
      {lines.map((line, li) => (
        <span key={li} className="flex flex-wrap justify-center gap-x-[0.32em]">
          {line.split(' ').map((word) => {
            const i = wordIndex++
            return (
              <span
                key={i}
                className="inline-block"
                style={
                  reducedMotion
                    ? undefined
                    : {
                        opacity: revealed ? 1 : 0,
                        transform: revealed ? 'translateY(0) rotate(0deg)' : 'translateY(22px) rotate(-4deg)',
                        transition: 'opacity 0.7s cubic-bezier(.22,1,.36,1), transform 0.7s cubic-bezier(.22,1,.36,1)',
                        transitionDelay: `${i * 110}ms`,
                      }
                }
              >
                {word}
              </span>
            )
          })}
        </span>
      ))}
    </h2>
  )
}

function RsvpForm({
  slug,
  coupleNames,
  storageKey,
  theme: t,
}: {
  slug: string
  coupleNames: string
  storageKey: string
  theme: RsvpTheme
}) {
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

  // Couleurs en inline style plutôt qu'en classes Tailwind câblées en dur
  // (`#B9776C`, `bg-white`...) : ce sont des valeurs de thème, pilotables
  // via `rsvpTheme` (cf. PayloadSection). Hover/focus gérés en JS
  // (`e.currentTarget.style...`), même pattern que le bouton CTA plus haut
  // dans ce fichier — une couleur de thème dynamique ne peut pas passer par
  // les pseudo-classes Tailwind (`hover:`/`focus:`), qui exigent une classe
  // statique connue à la compilation.
  const fieldClass =
    'w-full rounded-[10px] border px-4 py-3 text-[15px] outline-none transition-colors placeholder:[color:var(--fp-rsvp-placeholder)]'
  const fieldStyle: CSSProperties = {
    background: t.inputBg,
    borderColor: t.inputBorder,
    color: t.inputText,
    ['--fp-rsvp-placeholder' as string]: t.inputPlaceholder,
  }
  const onFieldFocus = (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = t.accent
    e.currentTarget.style.boxShadow = `0 0 0 3px ${t.accentSoft}`
  }
  const onFieldBlur = (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = t.inputBorder
    e.currentTarget.style.boxShadow = 'none'
  }
  const labelClass = 'mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em]'

  return (
    <motion.div
      initial={{ y: 18, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-[20px] p-8 sm:p-10"
      style={{ background: t.modalBg, boxShadow: t.shadow }}
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
            <span className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: t.accentSoft }}>
              {done === 'yes' ? (
                <PartyPopper size={24} color={t.accent} aria-hidden />
              ) : (
                <Heart size={24} color={t.accent} aria-hidden />
              )}
            </span>
            <h2 className="font-display mt-6 text-[2rem] font-light tracking-[-0.01em]" style={{ color: t.heading }}>
              Merci&nbsp;!
            </h2>
            <p className="mt-3 max-w-sm text-[15px] leading-[1.65]" style={{ color: t.textMuted }}>
              {done === 'yes'
                ? `Votre réponse est bien arrivée. ${coupleNames} ont hâte de vous accueillir.`
                : `Votre réponse est bien arrivée. Vous manquerez à ${coupleNames}.`}
            </p>
            {localOnly && (
              <p
                className="mt-4 rounded-full border px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em]"
                style={{ background: t.inputBg, borderColor: t.inputBorder, color: t.textMuted }}
              >
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
              className="mt-6 text-[12px] font-medium uppercase tracking-[0.12em] underline-offset-4 transition-colors hover:underline"
              style={{ color: t.accent }}
            >
              Modifier ma réponse
            </button>
          </motion.div>
        ) : (
          <motion.form key="form" onSubmit={onSubmit} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
            <div className="text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: t.accent }}>
                RSVP
              </p>
              <h2 className="font-display mt-3 text-[clamp(1.6rem,3.6vw,2.1rem)] font-light leading-[1.15]" style={{ color: t.heading }}>
                Serez-vous <em className="italic" style={{ color: t.accent }}>des nôtres&nbsp;?</em>
              </h2>
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="fp-rsvp-name" className={labelClass} style={{ color: t.textMuted }}>
                  Nom &amp; prénom
                </label>
                <input
                  id="fp-rsvp-name"
                  required
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  onFocus={onFieldFocus}
                  onBlur={onFieldBlur}
                  placeholder="Votre nom"
                  className={fieldClass}
                  style={fieldStyle}
                  autoComplete="name"
                />
              </div>
              <div>
                <label htmlFor="fp-rsvp-email" className={labelClass} style={{ color: t.textMuted }}>
                  Email
                </label>
                <input
                  id="fp-rsvp-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={onFieldFocus}
                  onBlur={onFieldBlur}
                  placeholder="vous@exemple.fr"
                  className={fieldClass}
                  style={fieldStyle}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="mt-6">
              <span className={labelClass} style={{ color: t.textMuted }}>
                Votre réponse
              </span>
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
                      onMouseEnter={(e) => {
                        if (!active) e.currentTarget.style.borderColor = t.accent
                      }}
                      onMouseLeave={(e) => {
                        if (!active) e.currentTarget.style.borderColor = t.inputBorder
                      }}
                      className={cn(
                        'flex flex-1 items-center justify-center gap-2.5 rounded-full border px-5 py-3.5 text-[13px] font-semibold uppercase tracking-[0.08em] transition-all active:scale-[0.97]',
                      )}
                      style={
                        active
                          ? { borderColor: t.accent, background: t.accent, color: '#fff' }
                          : { borderColor: t.inputBorder, background: t.inputBg, color: t.textMuted }
                      }
                    >
                      {value === 'yes' ? 'On sera là !' : 'Hélas non'}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-5">
              <label htmlFor="fp-rsvp-message" className={labelClass} style={{ color: t.textMuted }}>
                Un mot pour {coupleNames} (facultatif)
              </label>
              <textarea
                id="fp-rsvp-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onFocus={onFieldFocus}
                onBlur={onFieldBlur}
                rows={3}
                className={cn(fieldClass, 'resize-none')}
                style={fieldStyle}
              />
            </div>

            <div className="mt-8">
              <button
                type="submit"
                disabled={submitting}
                onMouseEnter={(e) => !submitting && (e.currentTarget.style.background = t.accentHover)}
                onMouseLeave={(e) => !submitting && (e.currentTarget.style.background = t.accent)}
                className="w-full rounded-full py-4 text-[13px] font-semibold uppercase tracking-[0.1em] text-white transition-colors disabled:cursor-wait disabled:opacity-70"
                style={{ background: t.accent }}
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
