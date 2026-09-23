import { useEffect, useRef, useState } from 'react'
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
  Plus,
  ShieldCheck,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { trpc } from '@/providers/trpc'
import { useAuth } from '@/hooks/useAuth'
import { LOGIN_PATH } from '@/const'
import { useLanguage } from '@/i18n/LanguageContext'
import { useCart } from '@/cart/CartContext'
import { stripePromise } from '@/lib/stripeClient'
import { EASE_EDITORIAL } from '@/components/commerce/motion'
import AnimatedAmount from '@/components/commerce/AnimatedAmount'
import { CheckboxMark } from '@/components/commerce/CheckDraw'
import FloatingField from '@/components/commerce/FloatingField'
import OptionToggle from '@/components/commerce/OptionToggle'
import {
  formatEuros,
  formatOrderNumber,
  getProduct,
  lineAmountCents,
  productIdFromSlug,
  TEMPLATE_PRICE_CENTS,
  usePricing,
  type ProductId,
} from '@/components/commerce/pricing'
import { getSaveTheDateTemplate, parseTemplateOverrides, resolveSaveTheDateTemplate } from '@contracts/saveTheDateTemplates'

/* -------------------------------------------------------------------------- */
/* Brouillon de commande (conservé si redirection vers la connexion)          */
/* -------------------------------------------------------------------------- */
/* Le panier lui-même (produits/options/modèle) persiste déjà tout seul via
   CartContext (localStorage) — ce brouillon n'a plus besoin de le porter,
   seulement les champs de contact du formulaire "Informations". */

const DRAFT_KEY = 'scrollthedate:checkout:draft'

interface CheckoutDraft {
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
  const { t } = useLanguage()
  const [searchParams] = useSearchParams()
  // Plus de useNavigate ici : la redirection vers /login au moment de payer a
  // disparu avec le checkout invité. StripePaymentForm garde le sien pour
  // aller vers /merci une fois le paiement confirmé.
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { products, options } = usePricing()
  const cart = useCart()

  const [draft] = useState<CheckoutDraft | null>(() => loadDraft())

  // Replie les query params legacy (`?produit=`/`?options=`/`?modele=`) dans
  // le panier AU MONTAGE, une seule fois — compat avec tout lien externe déjà
  // en circulation (pages produit historiques, favoris…). La page rend
  // ensuite TOUJOURS depuis `cart.items`, jamais depuis ces paramètres
  // directement.
  const foldedParams = useRef(false)
  useEffect(() => {
    if (foldedParams.current) return
    foldedParams.current = true
    const modeleParam = searchParams.get('modele')
    const produitParam = searchParams.get('produit')
    if (!modeleParam && !produitParam) return
    if (modeleParam) {
      if (getSaveTheDateTemplate(modeleParam)) {
        cart.addOrReplace({ product: 'SAVE_THE_DATE', optionIds: [], templateSlug: modeleParam })
      }
      return
    }
    const fromSlug = productIdFromSlug(produitParam)
    if (!fromSlug) return
    const optionIds = (searchParams.get('options') ?? '').split(',').filter(Boolean)
    cart.addOrReplace({ product: fromSlug, optionIds })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Modèles ("sur un modèle") éventuellement présents dans le panier — un
  // seul appel de settings pour toutes les lignes concernées, plutôt qu'un
  // par ligne.
  const hasTemplateLine = cart.items.some((l) => !!l.templateSlug)
  const templateOverridesQ = trpc.settings.get.useQuery(
    { key: 'saveTheDateTemplates' },
    { enabled: hasTemplateLine },
  )
  const templateOverrides = parseTemplateOverrides(templateOverridesQ.data?.value)
  const resolveLineTemplate = (slug: string | undefined) =>
    slug ? resolveSaveTheDateTemplate(slug, templateOverrides) : undefined

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
  // Email déjà rattaché à un compte : on affiche une invitation à se
  // connecter plutôt qu'une erreur sèche (le panier est conservé).
  const [accountExists, setAccountExists] = useState(false)
  const [recapOpen, setRecapOpen] = useState(false)

  // Rempli une fois orders.createCheckout appelé : fait apparaître le
  // Payment Element Stripe pour la saisie réelle de la carte. `null` tant
  // que le client n'a pas validé le bloc "Vos informations" (cf.
  // handlePrepare) — le PaymentIntent Stripe (et les commandes "pending"
  // associée (un projet par ligne du panier, cf. api/ordersRouter.ts) n'est
  // créée qu'à ce moment-là, pas avant.
  const [checkoutResult, setCheckoutResult] = useState<{
    orderId: number
    clientSecret: string
  } | null>(null)

  const totalCents = cart.items.reduce((sum, line) => sum + lineAmountCents(line, products, options), 0)

  const checkout = trpc.orders.createCheckout.useMutation()

  // Le montant peut changer après coup (lignes/options modifiées) — si un
  // PaymentIntent existe déjà pour un montant désormais périmé, on
  // réinitialise plutôt que de laisser confirmer un paiement pour le
  // mauvais montant. L'ancienne commande "pending" reste en base
  // (abandonnée), sans conséquence : elle ne passera jamais "paid" tant
  // qu'aucun paiement Stripe ne lui correspond.
  useEffect(() => {
    setCheckoutResult(null)
  }, [totalCents])

  function validate(): Errors {
    const errs: Errors = {}
    if (!prenom1.trim()) errs.prenom1 = t('commander.errPrenom1')
    if (!prenom2.trim()) errs.prenom2 = t('commander.errPrenom2')
    if (!email.trim()) errs.email = t('commander.errEmailRequired')
    else if (!EMAIL_RE.test(email.trim())) errs.email = t('commander.errEmailInvalid')
    if (phone.trim() && !PHONE_RE.test(phone.trim()))
      errs.phone = t('commander.errPhoneInvalid')
    if (!weddingDate) errs.weddingDate = t('commander.errDateRequired')
    else if (new Date(weddingDate).getTime() < Date.now() - 24 * 3600 * 1000)
      errs.weddingDate = t('commander.errDatePast')
    return errs
  }

  function saveDraft() {
    const data: CheckoutDraft = {
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

  // Phase 1 — valide les informations, crée le PaymentIntent Stripe + une
  // commande "pending" par ligne du panier côté serveur, fait apparaître le
  // Payment Element. Ne débite rien : c'est StripePaymentForm (phase 2, plus
  // bas) qui confirme réellement le paiement avec Stripe.
  async function handlePrepare(e: FormEvent) {
    e.preventDefault()
    if (preparing || checkoutResult || cart.items.length === 0) return
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      setBump((b) => b + 1)
      return
    }
    // Plus de redirection vers /login ici : le compte est désormais créé
    // APRÈS le paiement (checkout invité — cf. orders.createCheckout et
    // api/lib/guestAccount.ts). L'email saisi ci-dessus suffit ; le client
    // choisira son mot de passe via l'email de confirmation.
    setPreparing(true)
    setPayError(null)
    setAccountExists(false)
    try {
      const result = await checkout.mutateAsync({
        items: cart.items.map((line) => ({
          product: line.product,
          optionIds: line.templateSlug ? [] : line.optionIds,
          templateSlug: line.templateSlug,
        })),
        names: `${prenom1.trim()} & ${prenom2.trim()}`,
        weddingDate: weddingDate ? new Date(`${weddingDate}T12:00:00`) : undefined,
        venue: venue.trim() || undefined,
        email: email.trim(),
      })
      window.sessionStorage.removeItem(DRAFT_KEY)
      if (!result.clientSecret) {
        throw new Error(t('commander.errPaymentInit'))
      }
      // Le panier n'est vidé qu'une fois le PAIEMENT confirmé (cf.
      // StripePaymentForm.handleConfirm plus bas) — pas ici : à ce stade,
      // les commandes "pending" existent déjà côté serveur mais rien n'est
      // payé. Vider le panier maintenant ferait perdre le rappel du
      // contenu de la commande si le client recharge la page avant de
      // payer (ex. carte refusée, onglet fermé par erreur).
      setCheckoutResult({ orderId: result.orderId, clientSecret: result.clientSecret })
    } catch (err) {
      // CONFLICT = un compte existe déjà pour cet email. On ne peut pas
      // commander en invité sur une adresse déjà rattachée à un compte, sinon
      // n'importe qui accéderait à l'espace d'autrui : on invite à se
      // connecter, en conservant le panier.
      const errData = (err as { data?: { code?: string; httpStatus?: number } })?.data
      if (errData?.code === 'CONFLICT' || errData?.httpStatus === 409) {
        saveDraft()
        setAccountExists(true)
        setPayError(null)
      } else {
        setPayError(err instanceof Error ? err.message : 'Une erreur est survenue.')
      }
    } finally {
      setPreparing(false)
    }
  }

  // Une entrée de récapitulatif par ligne du panier — remplace le calcul
  // "un seul produit" d'origine (`summaryThumb`/`displayProductName`…).
  const summaryLines = cart.items.map((line) => {
    const lineTemplate = resolveLineTemplate(line.templateSlug)
    const lineProduct = getProduct(products, line.product)
    return {
      key: line.product,
      thumb: lineTemplate ? lineTemplate.posterSrc : line.product === 'FAIRE_PART' ? '/template-editorial.jpg' : '/template-minimal.jpg',
      name: lineTemplate ? `${t('commander.templateNamePrefix')} ${lineTemplate.name}` : lineProduct.name,
      priceCents: lineTemplate ? TEMPLATE_PRICE_CENTS : lineProduct.priceCents,
      selectedOptions: lineTemplate ? [] : options.filter((o) => line.optionIds.includes(o.id)),
    }
  })

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
            {t('commander.backToOffers')}
          </Link>
          <span className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink">
            <Lock size={14} className="text-terracotta-500" />
            {t('commander.securePayment')}
          </span>
        </div>

        <h1 className="font-display text-[clamp(2rem,4vw,3rem)] font-light leading-[1.05] tracking-[-0.015em]">
          {t('commander.title')} <em className="italic text-terracotta-500">{t('commander.titleAccent')}</em>
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
              {t('commander.guestBanner')}{' '}
              <Link to={LOGIN_PATH} className="font-semibold text-terracotta-500 underline-offset-4 hover:underline">
                {t('commander.guestBannerLogin')}
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
            <p>{t('commander.returningBanner')}</p>
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
              {t('commander.summaryLabel')}
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
                  <SummaryCard items={summaryLines} totalCents={totalCents} />
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
            {/* Bloc 1 — Panier : une carte par ligne (produit + ses propres
                options, verrouillées pour une commande "sur un modèle" —
                changer de produit reviendrait à quitter ce modèle, cf. lien
                "Changer" sur cette ligne). Plusieurs lignes possibles depuis
                le 22/09/2026 ("un vrai panier") : chaque produit du
                catalogue garde SA propre carte, éditable indépendamment. */}
            <section aria-labelledby="bloc-panier">
              <BlockTitle id="bloc-panier" index="01" title={t('commander.block1Title')} />

              {cart.items.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-neutral-200 bg-white px-6 py-10 text-center">
                  <p className="text-[15px] font-semibold text-ink">{t('commander.emptyCartTitle')}</p>
                  <p className="mt-1.5 text-[13px] text-neutral-500">{t('commander.emptyCartDesc')}</p>
                  <Link
                    to="/offres"
                    className="mt-5 inline-flex items-center rounded-full bg-terracotta-500 px-6 py-2.5 text-[13px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400"
                  >
                    {t('commander.emptyCartCta')}
                  </Link>
                </div>
              ) : (
                <div className="mt-5 flex flex-col gap-6">
                  {cart.items.map((line) => {
                    const lineTemplate = resolveLineTemplate(line.templateSlug)
                    const lineProduct = getProduct(products, line.product)
                    return (
                      <div
                        key={line.product}
                        className="rounded-2xl border-2 border-terracotta-500/40 bg-white p-6 shadow-[0_8px_32px_rgba(27,27,30,.08)]"
                      >
                        {lineTemplate ? (
                          <div className="flex items-center gap-4">
                            <img
                              src={lineTemplate.posterSrc}
                              alt=""
                              className="h-16 w-12 shrink-0 rounded-lg border border-neutral-200 object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-terracotta-500">
                                {t('commander.templateBadge')}
                              </p>
                              <p className="mt-1 text-[15px] font-semibold text-ink">{lineTemplate.name}</p>
                              <p className="mt-0.5 text-[13px] leading-[1.4] text-neutral-500">{lineTemplate.tagline}</p>
                            </div>
                            <Link
                              to="/save-the-date-modeles"
                              className="shrink-0 text-[12px] font-semibold uppercase tracking-[0.1em] text-neutral-500 underline-offset-4 hover:text-terracotta-500 hover:underline"
                            >
                              {t('commander.templateChange')}
                            </Link>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-[15px] font-semibold text-ink">{lineProduct.name}</p>
                                <p className="mt-1 text-[13px] leading-[1.5] text-neutral-500">
                                  {line.product === 'FAIRE_PART' ? t('commander.fairePartDesc') : t('commander.saveTheDateDesc')}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => cart.removeProduct(line.product)}
                                aria-label={t('commander.removeLine')}
                                className="shrink-0 rounded-full p-1.5 text-neutral-500 transition-colors hover:bg-error/10 hover:text-error"
                              >
                                <X size={16} />
                              </button>
                            </div>
                            <p className="font-display tabular mt-3 text-2xl font-light text-terracotta-500">
                              {formatEuros(lineProduct.priceCents)}
                            </p>
                            {options.length > 0 && (
                              <div className="mt-5 flex flex-col gap-3 border-t border-neutral-200 pt-5">
                                {options.map((option) => (
                                  <OptionToggle
                                    key={option.id}
                                    option={option}
                                    tone="light"
                                    checked={line.optionIds.includes(option.id)}
                                    onToggle={() =>
                                      cart.updateOptions(
                                        line.product,
                                        line.optionIds.includes(option.id)
                                          ? line.optionIds.filter((o) => o !== option.id)
                                          : [...line.optionIds, option.id],
                                      )
                                    }
                                  />
                                ))}
                              </div>
                            )}
                          </>
                        )}
                        {lineTemplate && (
                          <button
                            type="button"
                            onClick={() => cart.removeProduct(line.product)}
                            className="mt-3 text-[12px] font-medium text-neutral-500 underline-offset-4 hover:text-error hover:underline"
                          >
                            {t('commander.removeLine')}
                          </button>
                        )}
                      </div>
                    )
                  })}

                  {/* Ajouter l'autre produit du catalogue s'il n'est pas déjà
                      dans le panier — chaque produit a sa propre page dédiée
                      où configurer ses options avant de rejoindre le panier. */}
                  {(['SAVE_THE_DATE', 'FAIRE_PART'] as ProductId[])
                    .filter((id) => !cart.items.some((l) => l.product === id))
                    .map((id) => (
                      <Link
                        key={id}
                        to={id === 'FAIRE_PART' ? '/faire-part-digital' : '/save-the-date-digital'}
                        className="inline-flex w-fit items-center gap-2 rounded-full border border-dashed border-neutral-300 px-5 py-2.5 text-[13px] font-medium text-neutral-500 transition-colors hover:border-terracotta-500 hover:text-terracotta-500"
                      >
                        <Plus size={14} />
                        {t('commander.addAnotherProduct')} — {getProduct(products, id).name}
                      </Link>
                    ))}
                </div>
              )}
            </section>

            {/* Bloc 2 — Informations */}
            <section aria-labelledby="bloc-infos">
              <BlockTitle id="bloc-infos" index="02" title={t('commander.block3Title')} />
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <FloatingField
                  label={t('commander.fieldPrenom1')}
                  name="prenom1"
                  autoComplete="given-name"
                  value={prenom1}
                  onChange={(e) => setPrenom1(e.target.value)}
                  error={errors.prenom1}
                  bump={bump}
                  disabled={!!checkoutResult}
                />
                <FloatingField
                  label={t('commander.fieldPrenom2')}
                  name="prenom2"
                  value={prenom2}
                  onChange={(e) => setPrenom2(e.target.value)}
                  error={errors.prenom2}
                  bump={bump}
                  disabled={!!checkoutResult}
                />
                <FloatingField
                  label={t('commander.fieldEmail')}
                  name="email"
                  type="email"
                  autoComplete="email"
                  className="sm:col-span-2"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={errors.email}
                  helper={t('commander.fieldEmailHelper')}
                  bump={bump}
                  disabled={!!checkoutResult}
                />
                <FloatingField
                  label={t('commander.fieldPhone')}
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
                  label={t('commander.fieldWeddingDate')}
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
                  label={t('commander.fieldVenue')}
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
              <BlockTitle id="bloc-paiement" index="03" title={t('commander.block4Title')} />

              {!checkoutResult ? (
                <>
                  <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-5">
                    <p className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                      <CreditCard size={16} className="text-terracotta-500" />
                      {t('commander.cardTitle')}
                      <span className="ml-auto rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-500">
                        {t('commander.testMode')}
                      </span>
                    </p>
                    <p className="mt-3 text-[13px] leading-[1.6] text-neutral-500">
                      {t('commander.cardHelper')}
                    </p>
                  </div>

                  <AnimatePresence>
                    {accountExists && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mt-4 flex items-start gap-3 rounded-xl border border-terracotta-500/30 bg-terracotta-500/5 px-5 py-4 text-[14px] leading-[1.55] text-ink"
                      >
                        <LogIn size={18} className="mt-0.5 shrink-0 text-terracotta-500" />
                        <p>
                          {t('commander.accountExistsPrefix')} <strong>{email.trim()}</strong>.{' '}
                          {t('commander.accountExistsSuffix')}{' '}
                          <Link
                            to={LOGIN_PATH}
                            state={{ from: '/commander' }}
                            className="font-semibold text-terracotta-500 underline-offset-4 hover:underline"
                          >
                            {t('commander.login')}
                          </Link>
                        </p>
                      </motion.div>
                    )}
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
                    // Volontairement PAS désactivé pendant `authLoading` :
                    // commander ne demande plus de compte, l'état de connexion
                    // n'est donc plus un prérequis. Le 31/08/2026, une réponse
                    // anormalement lente de auth.me (jusqu'à 186 s côté
                    // Supabase) a rendu ce bouton inerte avec un curseur
                    // d'attente — un client ne pouvait plus payer du tout, pour
                    // une requête dont le paiement n'a pas besoin.
                    disabled={preparing || cart.items.length === 0}
                    whileHover={preparing ? undefined : { y: -2 }}
                    whileTap={preparing ? undefined : { scale: 0.98 }}
                    className={cn(
                      'mt-6 flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-terracotta-500 text-[15px] font-semibold text-white transition-colors hover:bg-terracotta-400',
                      preparing && 'cursor-wait opacity-80',
                      !preparing && cart.items.length === 0 && 'cursor-not-allowed opacity-60',
                    )}
                  >
                    {preparing ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        {t('commander.preparing')}
                      </>
                    ) : (
                      <>{t('commander.continueToPayment')} {formatEuros(totalCents)}</>
                    )}
                  </motion.button>
                </>
              ) : stripePromise ? (
                <Elements stripe={stripePromise} options={elementsOptions}>
                  <StripePaymentForm orderId={checkoutResult.orderId} totalCents={totalCents} onPaid={cart.clear} />
                </Elements>
              ) : (
                <p className="mt-4 rounded-xl border border-error/30 bg-error/5 px-5 py-4 text-[14px] font-medium text-error">
                  {t('commander.paymentNotConfigured')}
                </p>
              )}

              <p className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[12px] text-neutral-500">
                <ShieldCheck size={14} className="text-terracotta-500" />
                {t('commander.stripeFooter')}
              </p>
            </section>
          </form>

          {/* ---------------------------------------------------------- */}
          {/* Récapitulatif sticky (desktop)                              */}
          {/* ---------------------------------------------------------- */}
          <aside className="hidden lg:block">
            <div className="sticky top-28">
              <SummaryCard items={summaryLines} totalCents={totalCents} />
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
function StripePaymentForm({
  orderId,
  totalCents,
  onPaid,
}: {
  orderId: number
  totalCents: number
  /** Vide le panier — appelé une fois le paiement réellement confirmé, pas avant. */
  onPaid: () => void
}) {
  const { t } = useLanguage()
  const stripe = useStripe()
  const elements = useElements()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    if (!stripe || !elements || submitting) return
    setSubmitting(true)
    setError(null)

    const returnUrl = `${window.location.origin}/merci?order=${formatOrderNumber(orderId)}`

    // `elements.submit()` valide le Payment Element côté client avant
    // confirmation — requis par l'API Stripe actuelle en amont de
    // `confirmPayment`.
    const submitResult = await elements.submit()
    if (submitResult.error) {
      setError(submitResult.error.message ?? t('commander.errCardCheck'))
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
      setError(confirmError.message ?? t('commander.errPaymentRefused'))
      setSubmitting(false)
      return
    }

    onPaid()
    navigate(returnUrl.replace(window.location.origin, ''))
  }

  return (
    // `<div>` et non `<form>` : ce composant est rendu à l'intérieur du
    // <form onSubmit={handlePrepare}> de Commander.tsx (bloc "04 Paiement").
    // Un <form> imbriqué dans un <form> est du HTML invalide — le clic sur
    // "Payer" finissait par déclencher une VRAIE soumission native du
    // formulaire (rechargement complet vers /commander, sans passer par
    // handleConfirm ni par Stripe) au lieu du paiement, un bug confirmé en
    // reproduction live le 31/08/2026. Le bouton plus bas est donc
    // type="button" + onClick, pas type="submit".
    <div className="mt-4 flex flex-col gap-4">
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <p className="mb-4 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
          <CreditCard size={16} className="text-terracotta-500" />
          {t('commander.cardTitle')}
          <span className="ml-auto rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-500">
            {t('commander.testMode')}
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
        type="button"
        onClick={handleConfirm}
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
            {t('commander.payingInProgress')}
          </>
        ) : (
          <>{t('commander.payButton')} {formatEuros(totalCents)}</>
        )}
      </motion.button>
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

interface SummaryLine {
  key: string
  thumb: string
  name: string
  priceCents: number
  selectedOptions: { id: string; label: string; priceCents: number }[]
}

function SummaryCard({ items, totalCents }: { items: SummaryLine[]; totalCents: number }) {
  const { t } = useLanguage()
  return (
    <div className="rounded-2xl bg-white p-6 shadow-[0_8px_32px_rgba(27,27,30,.08)]">
      {items.length === 0 ? (
        <p className="text-[13px] text-neutral-500">{t('commander.emptyCartTitle')}</p>
      ) : (
        <div className="flex flex-col gap-6">
          {items.map((item) => (
            <div key={item.key}>
              <img
                src={item.thumb}
                alt={`${t('commander.summaryAltPrefix')} ${item.name}`}
                className="aspect-[16/10] w-full rounded-xl border border-neutral-200 object-cover object-top"
              />
              <div className="mt-5 flex items-baseline justify-between gap-4">
                <p className="text-[15px] font-semibold text-ink">{item.name}</p>
                <p className="tabular text-[14px] font-medium text-ink">{formatEuros(item.priceCents)}</p>
              </div>

              <AnimatePresence initial={false}>
                {item.selectedOptions.map((option) => (
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
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 border-t border-neutral-200 pt-5">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
            {t('commander.totalTtc')}
          </p>
          <AnimatedAmount
            cents={totalCents}
            className="tabular font-display text-[2rem] font-light leading-none text-terracotta-500"
          />
        </div>
        <p className="mt-3 flex items-center gap-2 text-[12px] text-neutral-500">
          <ShieldCheck size={13} className="shrink-0 text-terracotta-500" />
          {t('commander.summaryFooter')}
        </p>
      </div>
    </div>
  )
}
