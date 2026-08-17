import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  CalendarHeart,
  Check,
  ChevronDown,
  CreditCard,
  Loader2,
  Lock,
  LogIn,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { trpc } from '@/providers/trpc'
import { useAuth } from '@/hooks/useAuth'
import { LOGIN_PATH } from '@/const'
import { EASE_EDITORIAL } from '@/components/commerce/motion'
import AnimatedAmount from '@/components/commerce/AnimatedAmount'
import CheckDraw, { CheckboxMark } from '@/components/commerce/CheckDraw'
import FloatingField from '@/components/commerce/FloatingField'
import OptionToggle from '@/components/commerce/OptionToggle'
import {
  formatEuros,
  formatOrderNumber,
  getProduct,
  productIdFromSlug,
  usePricing,
  type ProductId,
} from '@/components/commerce/pricing'

/* -------------------------------------------------------------------------- */
/* Brouillon de commande (conservé si redirection vers la connexion)          */
/* -------------------------------------------------------------------------- */

const DRAFT_KEY = 'scrollthedate:checkout:draft'

interface CheckoutDraft {
  productId: ProductId
  optionIds: string[]
  prenom1: string
  prenom2: string
  email: string
  phone: string
  weddingDate: string
  venue: string
  payIn3: boolean
}

function loadDraft(): CheckoutDraft | null {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    window.sessionStorage.removeItem(DRAFT_KEY)
    const parsed = JSON.parse(raw) as CheckoutDraft
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

/* -------------------------------------------------------------------------- */
/* Validation & formatage carte (paiement simulé)                             */
/* -------------------------------------------------------------------------- */

type Errors = Record<string, string>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[+0-9 ().-]{8,}$/

function formatCardNumber(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, '$1 ')
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
}

function splitInThree(totalCents: number): [number, number, number] {
  const third = Math.floor(totalCents / 3)
  return [third, third, totalCents - 2 * third]
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function Commander() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { products, options } = usePricing()

  const [draft] = useState<CheckoutDraft | null>(() => loadDraft())

  const [productId, setProductId] = useState<ProductId>(
    () =>
      productIdFromSlug(searchParams.get('produit')) ??
      draft?.productId ??
      'FAIRE_PART',
  )
  const [optionIds, setOptionIds] = useState<string[]>(() => {
    const fromUrl = (searchParams.get('options') ?? '').split(',').filter(Boolean)
    return fromUrl.length > 0 ? fromUrl : (draft?.optionIds ?? [])
  })
  const [prenom1, setPrenom1] = useState(draft?.prenom1 ?? '')
  const [prenom2, setPrenom2] = useState(draft?.prenom2 ?? '')
  const [email, setEmail] = useState(draft?.email ?? '')
  const [phone, setPhone] = useState(draft?.phone ?? '')
  const [weddingDate, setWeddingDate] = useState(draft?.weddingDate ?? '')
  const [venue, setVenue] = useState(draft?.venue ?? '')
  const [payIn3, setPayIn3] = useState(draft?.payIn3 ?? false)

  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvc, setCardCvc] = useState('')

  const [errors, setErrors] = useState<Errors>({})
  const [bump, setBump] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)
  const [recapOpen, setRecapOpen] = useState(false)

  const product = getProduct(products, productId)
  const selectedOptions = options.filter((o) => optionIds.includes(o.id))
  const totalCents = product.priceCents + selectedOptions.reduce((sum, o) => sum + o.priceCents, 0)
  const eligible3x = totalCents >= 15000
  const installments = splitInThree(totalCents)
  const effectivePayIn3 = payIn3 && eligible3x

  const checkout = trpc.orders.createCheckout.useMutation()

  const toggleOption = (id: string) =>
    setOptionIds((prev) => (prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id]))

  function validate(): Errors {
    const errs: Errors = {}
    if (!prenom1.trim()) errs.prenom1 = 'Le prénom du premier marié·e est requis.'
    if (!prenom2.trim()) errs.prenom2 = 'Le prénom du second marié·e est requis.'
    if (!email.trim()) errs.email = "L'email est requis."
    else if (!EMAIL_RE.test(email.trim())) errs.email = 'Cet email semble invalide.'
    if (phone.trim() && !PHONE_RE.test(phone.trim()))
      errs.phone = 'Ce numéro semble invalide.'
    if (!weddingDate) errs.weddingDate = 'Une date prévisionnelle nous aide à planifier.'
    else if (new Date(weddingDate).getTime() < Date.now() - 24 * 3600 * 1000)
      errs.weddingDate = 'Cette date semble être déjà passée.'
    if (cardNumber.replace(/\D/g, '').length !== 16)
      errs.cardNumber = '16 chiffres requis — carte de test : 4242 4242 4242 4242.'
    else if (cardNumber.replace(/\D/g, '') === '4000000000000002')
      errs.cardNumber = 'Cette carte est refusée (simulation).'
    const expiryDigits = cardExpiry.replace(/\D/g, '')
    const month = Number.parseInt(expiryDigits.slice(0, 2), 10)
    if (expiryDigits.length !== 4 || month < 1 || month > 12)
      errs.cardExpiry = 'Format MM/AA attendu.'
    if (!/^\d{3}$/.test(cardCvc)) errs.cardCvc = '3 chiffres.'
    return errs
  }

  function saveDraft() {
    const data: CheckoutDraft = {
      productId,
      optionIds,
      prenom1,
      prenom2,
      email,
      phone,
      weddingDate,
      venue,
      payIn3,
    }
    try {
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data))
    } catch {
      /* stockage indisponible : tant pis */
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (processing) return
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      setBump((b) => b + 1)
      return
    }
    // Le paiement simulé crée la commande côté serveur → connexion requise.
    // `state: { from: '/commander' }` est indispensable : Login.tsx retombe
    // sinon sur son défaut ("/espace") après la connexion/inscription, et la
    // commande — jamais réellement soumise puisque createCheckout exige un
    // utilisateur authentifié — reste dans le brouillon sessionStorage sans
    // que rien ne ramène le client ici pour la finaliser. Le client croit
    // avoir payé (il vient de saisir sa carte) alors qu'aucune commande
    // n'existe côté serveur : dashboard vide, aucun email, questionnaire
    // introuvable.
    if (!isAuthenticated) {
      saveDraft()
      navigate(LOGIN_PATH, { state: { from: '/commander' } })
      return
    }
    setProcessing(true)
    setPayError(null)
    try {
      // Délai simulé de traitement bancaire (pas de vrai Stripe).
      await new Promise((resolve) => setTimeout(resolve, 1100))
      const result = await checkout.mutateAsync({
        product: productId,
        optionIds,
        names: `${prenom1.trim()} & ${prenom2.trim()}`,
        weddingDate: weddingDate ? new Date(`${weddingDate}T12:00:00`) : undefined,
        venue: venue.trim() || undefined,
      })
      window.sessionStorage.removeItem(DRAFT_KEY)
      navigate(`/merci?order=${formatOrderNumber(result.orderId)}`)
    } catch (err) {
      setProcessing(false)
      setPayError(
        err instanceof Error
          ? err.message
          : 'Le paiement simulé a échoué. Réessayez dans un instant.',
      )
    }
  }

  const summaryThumb = productId === 'FAIRE_PART' ? '/template-editorial.jpg' : '/template-minimal.jpg'

  return (
    <div className="min-h-[calc(100dvh-5rem)] bg-neutral-100 text-ink">
      <div className="mx-auto max-w-[1200px] px-6 py-10 lg:px-12 lg:py-14">
        {/* Header minimal */}
        <div className="mb-10 flex items-center justify-between">
          <Link
            to="/offres"
            className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-neutral-500 transition-colors hover:text-terracotta-500"
          >
            <ArrowLeft size={14} />
            Retour aux offres
          </Link>
          <span className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink">
            <Lock size={14} className="text-terracotta-500" />
            Paiement sécurisé
          </span>
        </div>

        <h1 className="font-display text-[clamp(2rem,4vw,3rem)] font-light leading-[1.05] tracking-[-0.015em]">
          Finaliser votre <em className="italic text-terracotta-500">commande</em>.
        </h1>

        {/* Bandeau invité */}
        {!authLoading && !isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE_EDITORIAL }}
            className="mt-6 flex items-start gap-3 rounded-xl border border-terracotta-500/30 bg-terracotta-500/5 px-5 py-4 text-[14px] leading-[1.55] text-ink"
          >
            <LogIn size={18} className="mt-0.5 shrink-0 text-terracotta-500" />
            <p>
              Aucun compte à créer à l'avance : une simple connexion vous sera demandée au moment du
              paiement, et vos choix seront conservés.{' '}
              <Link to={LOGIN_PATH} className="font-semibold text-terracotta-500 underline-offset-4 hover:underline">
                Se connecter maintenant
              </Link>
            </p>
          </motion.div>
        )}

        {/* Bandeau retour de connexion : le brouillon a été restauré, mais
            jamais les coordonnées de carte (jamais sauvegardées, même en
            simulation) — sans ce rappel, "Payer" semble ne rien faire tant
            que la carte n'est pas ressaisie. */}
        {!authLoading && isAuthenticated && draft && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE_EDITORIAL }}
            className="mt-6 flex items-start gap-3 rounded-xl border border-terracotta-500/30 bg-terracotta-500/5 px-5 py-4 text-[14px] leading-[1.55] text-ink"
          >
            <Check size={18} className="mt-0.5 shrink-0 text-terracotta-500" />
            <p>
              Bon retour — votre commande a été restaurée. Il ne reste qu'à ressaisir votre carte pour
              finaliser le paiement.
            </p>
          </motion.div>
        )}

        {/* Récap mobile — accordéon en haut */}
        <div className="mt-8 lg:hidden">
          <button
            type="button"
            aria-expanded={recapOpen}
            onClick={() => setRecapOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-2xl bg-white px-5 py-4 shadow-[0_8px_32px_rgba(27,27,30,.08)]"
          >
            <span className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
              Récapitulatif
              <motion.span animate={{ rotate: recapOpen ? 180 : 0 }} transition={{ duration: 0.25 }}>
                <ChevronDown size={16} />
              </motion.span>
            </span>
            <AnimatedAmount cents={totalCents} className="tabular font-display text-xl text-terracotta-500" />
          </button>
          <AnimatePresence initial={false}>
            {recapOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                className="overflow-hidden"
              >
                <div className="mt-2">
                  <SummaryCard
                    thumb={summaryThumb}
                    productName={product.name}
                    productPriceCents={product.priceCents}
                    selectedOptions={selectedOptions}
                    totalCents={totalCents}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-10 grid gap-10 lg:mt-12 lg:grid-cols-[60fr_40fr] lg:gap-14">
          {/* ---------------------------------------------------------- */}
          {/* Formulaire                                                  */}
          {/* ---------------------------------------------------------- */}
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-12">
            {/* Bloc 1 — Formule */}
            <section aria-labelledby="bloc-formule">
              <BlockTitle id="bloc-formule" index="01" title="Votre formule" />
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {(['SAVE_THE_DATE', 'FAIRE_PART'] as ProductId[]).map((id) => {
                  const p = getProduct(products, id)
                  const active = productId === id
                  return (
                    <motion.button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setProductId(id)}
                      whileTap={{ scale: 0.97 }}
                      className={cn(
                        'rounded-2xl border-2 bg-white p-6 text-left transition-colors duration-300',
                        active
                          ? 'border-terracotta-500 shadow-[0_8px_32px_rgba(27,27,30,.08)]'
                          : 'border-neutral-200 hover:border-neutral-500/50',
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[15px] font-semibold text-ink">{p.name}</p>
                          <p className="mt-1 text-[13px] leading-[1.5] text-neutral-500">
                            {id === 'FAIRE_PART'
                              ? 'Vidéo 60–90 s, page complète + RSVP, 3 scénarios.'
                              : "Vidéo 30–45 s, page d'annonce, lien illimité."}
                          </p>
                        </div>
                        <span
                          aria-hidden
                          className={cn(
                            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-300',
                            active ? 'border-terracotta-500 bg-terracotta-500 text-white' : 'border-neutral-200 text-transparent',
                          )}
                        >
                          <CheckDraw checked={active} className="h-3.5 w-3.5" />
                        </span>
                      </div>
                      <p className="font-display tabular mt-4 text-2xl font-light text-terracotta-500">
                        {formatEuros(p.priceCents)}
                      </p>
                    </motion.button>
                  )
                })}
              </div>
            </section>

            {/* Bloc 2 — Options */}
            <section aria-labelledby="bloc-options">
              <BlockTitle id="bloc-options" index="02" title="Options" />
              <div className="mt-5 flex flex-col gap-3">
                {options.map((option) => (
                  <OptionToggle
                    key={option.id}
                    option={option}
                    tone="light"
                    checked={optionIds.includes(option.id)}
                    onToggle={() => toggleOption(option.id)}
                  />
                ))}
              </div>
            </section>

            {/* Bloc 3 — Informations */}
            <section aria-labelledby="bloc-infos">
              <BlockTitle id="bloc-infos" index="03" title="Vos informations" />
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <FloatingField
                  label="Prénom du marié / de la mariée"
                  name="prenom1"
                  autoComplete="given-name"
                  value={prenom1}
                  onChange={(e) => setPrenom1(e.target.value)}
                  error={errors.prenom1}
                  bump={bump}
                />
                <FloatingField
                  label="Prénom de votre moitié"
                  name="prenom2"
                  value={prenom2}
                  onChange={(e) => setPrenom2(e.target.value)}
                  error={errors.prenom2}
                  bump={bump}
                />
                <FloatingField
                  label="Email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className="sm:col-span-2"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={errors.email}
                  helper="C'est ici que vous recevrez le lien pour créer votre espace."
                  bump={bump}
                />
                <FloatingField
                  label="Téléphone (optionnel, pour WhatsApp)"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  error={errors.phone}
                  bump={bump}
                />
                <FloatingField
                  label="Date prévisionnelle du mariage"
                  name="weddingDate"
                  type="date"
                  alwaysFloat
                  value={weddingDate}
                  onChange={(e) => setWeddingDate(e.target.value)}
                  error={errors.weddingDate}
                  bump={bump}
                />
                <FloatingField
                  label="Ville / lieu envisagé (optionnel)"
                  name="venue"
                  className="sm:col-span-2"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  error={errors.venue}
                  bump={bump}
                />
              </div>
            </section>

            {/* Bloc 4 — Paiement */}
            <section aria-labelledby="bloc-paiement">
              <BlockTitle id="bloc-paiement" index="04" title="Paiement" />

              {/* Toggle 3x sans frais */}
              <button
                type="button"
                role="switch"
                aria-checked={effectivePayIn3}
                disabled={!eligible3x}
                onClick={() => setPayIn3((v) => !v)}
                className={cn(
                  'mt-5 flex w-full items-center justify-between rounded-2xl border bg-white p-5 text-left transition-colors',
                  eligible3x ? 'border-neutral-200 hover:border-neutral-500/50' : 'cursor-not-allowed border-neutral-200 opacity-60',
                )}
              >
                <span>
                  <span className="block text-[15px] font-semibold text-ink">Payer en 3x sans frais</span>
                  <span className="mt-0.5 block text-[13px] text-neutral-500">
                    {eligible3x
                      ? 'Trois prélèvements, un mois d’écart, aucun frais.'
                      : 'Disponible dès 150 € de commande.'}
                  </span>
                </span>
                <span
                  aria-hidden
                  className={cn(
                    'relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300',
                    effectivePayIn3 ? 'bg-terracotta-500' : 'bg-neutral-200',
                  )}
                >
                  <motion.span
                    layout
                    transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                    className={cn(
                      'absolute top-1 h-5 w-5 rounded-full bg-white shadow',
                      effectivePayIn3 ? 'right-1' : 'left-1',
                    )}
                  />
                </span>
              </button>

              {/* Échéancier */}
              <AnimatePresence initial={false}>
                {effectivePayIn3 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                    className="overflow-hidden"
                  >
                    <ul className="mt-3 flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-5">
                      {['Aujourd’hui', 'Dans 30 jours', 'Dans 60 jours'].map((label, i) => (
                        <li key={label} className="flex items-center justify-between text-[14px]">
                          <span className="flex items-center gap-2 text-neutral-500">
                            <CalendarHeart size={14} className="text-terracotta-500" />
                            {label}
                          </span>
                          <span className="tabular font-medium text-ink">{formatEuros(installments[i])}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Carte (placeholder Stripe — paiement simulé) */}
              <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-5">
                <p className="mb-4 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                  <CreditCard size={16} className="text-terracotta-500" />
                  Carte bancaire
                  <span className="ml-auto rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-500">
                    Mode test
                  </span>
                </p>
                <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto]">
                  <FloatingField
                    label="Numéro de carte"
                    name="cardNumber"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    error={errors.cardNumber}
                    bump={bump}
                  />
                  <div className="sm:w-28">
                    <FloatingField
                      label="MM/AA"
                      name="cardExpiry"
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                      error={errors.cardExpiry}
                      bump={bump}
                    />
                  </div>
                  <div className="sm:w-24">
                    <FloatingField
                      label="CVC"
                      name="cardCvc"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 3))}
                      error={errors.cardCvc}
                      bump={bump}
                    />
                  </div>
                </div>
              </div>

              {/* Erreur paiement */}
              <AnimatePresence>
                {payError && (
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-4 rounded-xl border border-error/30 bg-error/5 px-5 py-4 text-[14px] font-medium text-error"
                  >
                    {payError}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* CTA payer */}
              <motion.button
                type="submit"
                disabled={processing || authLoading}
                whileHover={processing ? undefined : { y: -2 }}
                whileTap={processing ? undefined : { scale: 0.98 }}
                className={cn(
                  'mt-6 flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-terracotta-500 text-[15px] font-semibold text-white transition-colors hover:bg-terracotta-400',
                  (processing || authLoading) && 'cursor-wait opacity-80',
                )}
              >
                {processing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Paiement en cours…
                  </>
                ) : effectivePayIn3 ? (
                  <>Payer {formatEuros(installments[0])} — 1re échéance</>
                ) : (
                  <>Payer {formatEuros(totalCents)}</>
                )}
              </motion.button>
              <p className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[12px] text-neutral-500">
                <ShieldCheck size={14} className="text-terracotta-500" />
                Paiement simulé (aucune carte débitée) · Stripe · 3D Secure · Vous ne créez votre
                compte qu'après le paiement.
              </p>
            </section>
          </form>

          {/* ---------------------------------------------------------- */}
          {/* Récapitulatif sticky (desktop)                              */}
          {/* ---------------------------------------------------------- */}
          <aside className="hidden lg:block">
            <div className="sticky top-28">
              <SummaryCard
                thumb={summaryThumb}
                productName={product.name}
                productPriceCents={product.priceCents}
                selectedOptions={selectedOptions}
                totalCents={totalCents}
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Sous-composants                                                            */
/* -------------------------------------------------------------------------- */

function BlockTitle({ id, index, title }: { id: string; index: string; title: string }) {
  return (
    <h2
      id={id}
      className="flex items-baseline gap-3 text-[13px] font-semibold uppercase tracking-[0.18em] text-neutral-500"
    >
      <span className="font-display text-lg font-medium italic text-terracotta-500">{index}</span>
      {title}
    </h2>
  )
}

function SummaryCard({
  thumb,
  productName,
  productPriceCents,
  selectedOptions,
  totalCents,
}: {
  thumb: string
  productName: string
  productPriceCents: number
  selectedOptions: { id: string; label: string; priceCents: number }[]
  totalCents: number
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-[0_8px_32px_rgba(27,27,30,.08)]">
      <img
        src={thumb}
        alt={`Aperçu du template — ${productName}`}
        className="aspect-[16/10] w-full rounded-xl border border-neutral-200 object-cover object-top"
      />
      <div className="mt-5 flex items-baseline justify-between gap-4">
        <p className="text-[15px] font-semibold text-ink">{productName}</p>
        <p className="tabular text-[14px] font-medium text-ink">{formatEuros(productPriceCents)}</p>
      </div>

      <AnimatePresence initial={false}>
        {selectedOptions.map((option) => (
          <motion.div
            key={option.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.25, ease: EASE_EDITORIAL }}
            className="mt-2 flex items-baseline justify-between gap-4"
          >
            <p className="flex items-center gap-2 text-[13px] text-neutral-500">
              <CheckboxMark checked tone="light" />
              {option.label}
            </p>
            <p className="tabular text-[13px] font-medium text-ink">+{formatEuros(option.priceCents)}</p>
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="mt-5 border-t border-neutral-200 pt-5">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
            Total TTC
          </p>
          <AnimatedAmount
            cents={totalCents}
            className="tabular font-display text-[2rem] font-light leading-none text-terracotta-500"
          />
        </div>
        <p className="mt-3 flex items-center gap-2 text-[12px] text-neutral-500">
          <ShieldCheck size={13} className="shrink-0 text-terracotta-500" />
          Lien illimité — quel que soit le nombre d'invités.
        </p>
      </div>
    </div>
  )
}
