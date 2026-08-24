import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js'
import type { StripeElementsOptions } from '@stripe/stripe-js'
import {
  ArrowLeft,
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
import { stripePromise } from '@/lib/stripeClient'
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
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

type Errors = Record<string, string>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[+0-9 ().-]{8,}$/

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

  const [errors, setErrors] = useState<Errors>({})
  const [bump, setBump] = useState(0)
  const [preparing, setPreparing] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)
  const [recapOpen, setRecapOpen] = useState(false)

  // Rempli une fois orders.createCheckout appelé : fait apparaître le
  // Payment Element Stripe pour la saisie réelle de la carte. `null` tant
  // que le client n'a pas validé le bloc "Vos informations" (cf.
  // handlePrepare) — le PaymentIntent Stripe (et la commande "pending"
  // associée, cf. api/ordersRouter.ts) n'est créé qu'à ce moment-là, pas
  // avant.
  const [checkoutResult, setCheckoutResult] = useState<{
    orderId: number
    clientSecret: string
  } | null>(null)

  const product = getProduct(products, productId)
  const selectedOptions = options.filter((o) => optionIds.includes(o.id))
  const totalCents = product.priceCents + selectedOptions.reduce((sum, o) => sum + o.priceCents, 0)
  const eligible3x = totalCents >= 15000

  const checkout = trpc.orders.createCheckout.useMutation()

  // Le montant peut changer après coup (formule/options modifiées) — si un
  // PaymentIntent existe déjà pour un montant désormais périmé, on
  // réinitialise plutôt que de laisser confirmer un paiement pour le
  // mauvais montant. L'ancienne commande "pending" reste en base
  // (abandonnée), sans conséquence : elle ne passera jamais "paid" tant
  // qu'aucun paiement Stripe ne lui correspond.
  useEffect(() => {
    setCheckoutResult(null)
  }, [totalCents])

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
    }
    try {
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data))
    } catch {
      /* stockage indisponible : tant pis */
    }
  }

  // Phase 1 — valide les informations, crée le PaymentIntent Stripe + la
  // commande "pending" côté serveur, fait apparaître le Payment Element.
  // Ne débite rien : c'est StripePaymentForm (phase 2, plus bas) qui
  // confirme réellement le paiement avec Stripe.
  async function handlePrepare(e: FormEvent) {
    e.preventDefault()
    if (preparing || checkoutResult) return
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      setBump((b) => b + 1)
      return
    }
    if (!isAuthenticated) {
      saveDraft()
      navigate(LOGIN_PATH, { state: { from: '/commander' } })
      return
    }
    setPreparing(true)
    setPayError(null)
    try {
      const result = await checkout.mutateAsync({
        product: productId,
        optionIds,
        names: `${prenom1.trim()} & ${prenom2.trim()}`,
        weddingDate: weddingDate ? new Date(`${weddingDate}T12:00:00`) : undefined,
        venue: venue.trim() || undefined,
      })
      window.sessionStorage.removeItem(DRAFT_KEY)
      if (!result.clientSecret) {
        throw new Error("Le paiement n'a pas pu être initialisé. Réessayez dans un instant.")
      }
      setCheckoutResult({ orderId: result.orderId, clientSecret: result.clientSecret })
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setPreparing(false)
    }
  }

  const summaryThumb = productId === 'FAIRE_PART' ? '/template-editorial.jpg' : '/template-minimal.jpg'

  const elementsOptions: StripeElementsOptions | undefined = checkoutResult
    ? {
        clientSecret: checkoutResult.clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#C96F5A',
            colorText: '#232326',
            colorTextSecondary: '#6B6B70',
            colorBackground: '#ffffff',
            borderRadius: '12px',
            fontFamily: '"Space Grotesk", system-ui, sans-serif',
          },
        },
      }
    : undefined

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

        {/* Bandeau retour de connexion */}
        {!authLoading && isAuthenticated && draft && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE_EDITORIAL }}
            className="mt-6 flex items-start gap-3 rounded-xl border border-terracotta-500/30 bg-terracotta-500/5 px-5 py-4 text-[14px] leading-[1.55] text-ink"
          >
            <Check size={18} className="mt-0.5 shrink-0 text-terracotta-500" />
            <p>Bon retour — votre commande a été restaurée.</p>
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
          <form onSubmit={handlePrepare} noValidate className="flex flex-col gap-12">
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
                  disabled={!!checkoutResult}
                />
                <FloatingField
                  label="Prénom de votre moitié"
                  name="prenom2"
                  value={prenom2}
                  onChange={(e) => setPrenom2(e.target.value)}
                  error={errors.prenom2}
                  bump={bump}
                  disabled={!!checkoutResult}
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
                  helper="Pour vous contacter au sujet de votre projet."
                  bump={bump}
                  disabled={!!checkoutResult}
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
                  disabled={!!checkoutResult}
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
                  disabled={!!checkoutResult}
                />
                <FloatingField
                  label="Ville / lieu envisagé (optionnel)"
                  name="venue"
                  className="sm:col-span-2"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  error={errors.venue}
                  bump={bump}
                  disabled={!!checkoutResult}
                />
              </div>
            </section>

            {/* Bloc 4 — Paiement */}
            <section aria-labelledby="bloc-paiement">
              <BlockTitle id="bloc-paiement" index="04" title="Paiement" />

              {/* 3x sans frais — pas encore implémenté (aucun prestataire de
                  paiement fractionné n'est branché) : affiché grisé plutôt
                  que fonctionnel, pour ne pas promettre un échéancier que
                  rien ne débite réellement en 3 fois. */}
              <div
                aria-disabled
                className="mt-5 flex w-full cursor-not-allowed items-center justify-between rounded-2xl border border-neutral-200 bg-white p-5 text-left opacity-60"
              >
                <span>
                  <span className="block text-[15px] font-semibold text-ink">Payer en 3x sans frais</span>
                  <span className="mt-0.5 block text-[13px] text-neutral-500">
                    {eligible3x ? 'Bientôt disponible.' : 'Disponible dès 150 € de commande.'}
                  </span>
                </span>
                <span className="rounded-full bg-neutral-200/70 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-neutral-500">
                  bientôt
                </span>
              </div>

              {!checkoutResult ? (
                <>
                  <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-5">
                    <p className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                      <CreditCard size={16} className="text-terracotta-500" />
                      Carte bancaire
                      <span className="ml-auto rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-500">
                        Mode test
                      </span>
                    </p>
                    <p className="mt-3 text-[13px] leading-[1.6] text-neutral-500">
                      Les coordonnées de carte se saisissent à l'étape suivante, directement
                      auprès de Stripe.
                    </p>
                  </div>

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

                  <motion.button
                    type="submit"
                    disabled={preparing || authLoading}
                    whileHover={preparing ? undefined : { y: -2 }}
                    whileTap={preparing ? undefined : { scale: 0.98 }}
                    className={cn(
                      'mt-6 flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-terracotta-500 text-[15px] font-semibold text-white transition-colors hover:bg-terracotta-400',
                      (preparing || authLoading) && 'cursor-wait opacity-80',
                    )}
                  >
                    {preparing ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Un instant…
                      </>
                    ) : (
                      <>Continuer vers le paiement — {formatEuros(totalCents)}</>
                    )}
                  </motion.button>
                </>
              ) : stripePromise ? (
                <Elements stripe={stripePromise} options={elementsOptions}>
                  <StripePaymentForm orderId={checkoutResult.orderId} totalCents={totalCents} />
                </Elements>
              ) : (
                <p className="mt-4 rounded-xl border border-error/30 bg-error/5 px-5 py-4 text-[14px] font-medium text-error">
                  Le paiement en ligne n'est pas configuré sur cet environnement.
                </p>
              )}

              <p className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[12px] text-neutral-500">
                <ShieldCheck size={14} className="text-terracotta-500" />
                Paiement sécurisé par Stripe · 3D Secure · Mode test — carte 4242 4242 4242 4242,
                toute date future, tout CVC.
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
/* Formulaire de paiement Stripe (phase 2)                                    */
/* -------------------------------------------------------------------------- */

/**
 * Doit être rendu à l'intérieur d'un <Elements> déjà monté avec le
 * `clientSecret` du PaymentIntent — c'est ce qui donne accès à
 * `useStripe()`/`useElements()`. Confirme le paiement DIRECTEMENT avec
 * Stripe (`stripe.confirmPayment`) : les données de carte ne transitent
 * jamais par nos serveurs, seul le résultat (succès/échec) en revient.
 * La commande ne passe "paid" qu'une fois le webhook Stripe reçu (cf.
 * api/webhooks/stripe.ts) — cet écran peut donc naviguer vers /merci avant
 * que ce ne soit tout à fait le cas ; Merci.tsx affiche la commande dès
 * qu'elle existe (statut "pending" ou "paid"), pas seulement une fois payée.
 */
function StripePaymentForm({ orderId, totalCents }: { orderId: number; totalCents: number }) {
  const stripe = useStripe()
  const elements = useElements()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm(e: FormEvent) {
    e.preventDefault()
    if (!stripe || !elements || submitting) return
    setSubmitting(true)
    setError(null)

    const returnUrl = `${window.location.origin}/merci?order=${formatOrderNumber(orderId)}`

    // `elements.submit()` valide le Payment Element côté client avant
    // confirmation — requis par l'API Stripe actuelle en amont de
    // `confirmPayment`.
    const submitResult = await elements.submit()
    if (submitResult.error) {
      setError(submitResult.error.message ?? 'Vérifiez les informations de votre carte.')
      setSubmitting(false)
      return
    }

    // `redirect: 'if_required'` : reste sur cette page pour une carte
    // standard (mode test inclus) ; ne redirige que si Stripe l'exige
    // réellement (ex. authentification 3D Secure).
    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: 'if_required',
    })

    if (confirmError) {
      setError(confirmError.message ?? 'Le paiement a été refusé. Réessayez avec une autre carte.')
      setSubmitting(false)
      return
    }

    navigate(returnUrl.replace(window.location.origin, ''))
  }

  return (
    <form onSubmit={handleConfirm} className="mt-4 flex flex-col gap-4">
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <p className="mb-4 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
          <CreditCard size={16} className="text-terracotta-500" />
          Carte bancaire
          <span className="ml-auto rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-500">
            Mode test
          </span>
        </p>
        <PaymentElement />
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-error/30 bg-error/5 px-5 py-4 text-[14px] font-medium text-error"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <motion.button
        type="submit"
        disabled={!stripe || submitting}
        whileHover={submitting ? undefined : { y: -2 }}
        whileTap={submitting ? undefined : { scale: 0.98 }}
        className={cn(
          'flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-terracotta-500 text-[15px] font-semibold text-white transition-colors hover:bg-terracotta-400',
          (!stripe || submitting) && 'cursor-wait opacity-80',
        )}
      >
        {submitting ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Paiement en cours…
          </>
        ) : (
          <>Payer {formatEuros(totalCents)}</>
        )}
      </motion.button>
    </form>
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
