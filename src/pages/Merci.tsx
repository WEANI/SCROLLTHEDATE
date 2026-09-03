import { memo, useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  Check,
  Mail,
  MessageCircle,
  Mic,
  PenLine,
  UserRound,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { trpc } from '@/providers/trpc'
import { useAuth } from '@/hooks/useAuth'
import { LOGIN_PATH } from '@/const'
import { FadeUp, WordReveal } from '@/components/commerce/Reveal'
import { EASE_EDITORIAL } from '@/components/commerce/motion'
import {
  formatOrderNumber,
  parseOrderNumber,
  usePricing,
  whatsappHref,
} from '@/components/commerce/pricing'

/* -------------------------------------------------------------------------- */
/* Confettis argent/terracotta discrets — burst unique (~1,4 s), isolé + memo */
/* -------------------------------------------------------------------------- */

const ConfettiBurst = memo(function ConfettiBurst() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)

    const colors = ['#C96F5A', '#D98E7B', '#E8B4A4', '#C9C9CF', '#E8E5E1']
    const parts = Array.from({ length: 80 }, () => ({
      x: w / 2 + (Math.random() - 0.5) * w * 0.35,
      y: h * 0.28,
      vx: (Math.random() - 0.5) * 7,
      vy: -(Math.random() * 6 + 2),
      size: Math.random() * 5 + 2,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.2,
      color: colors[Math.floor(Math.random() * colors.length)],
      circle: Math.random() > 0.5,
    }))

    let raf = 0
    const DURATION = 1400
    const start = performance.now()
    const tick = (now: number) => {
      const t = now - start
      const fade = Math.max(0, 1 - t / DURATION)
      ctx.clearRect(0, 0, w, h)
      for (const p of parts) {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.15
        p.rot += p.vr
        ctx.save()
        ctx.globalAlpha = fade
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        if (p.circle) {
          ctx.beginPath()
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
        }
        ctx.restore()
      }
      if (t < DURATION) raf = requestAnimationFrame(tick)
      else ctx.clearRect(0, 0, w, h)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  )
})

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatPhoneFr(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  const national = digits.startsWith('33') ? `0${digits.slice(2)}` : digits
  return national.replace(/(\d{2})(?=\d)/g, '$1 ').trim()
}

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 24 * 3600 * 1000)
}

const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' })

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function Merci() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const { texts } = usePricing()
  const reduceMotion = useReducedMotion()

  const orderRef = searchParams.get('order')
  const parsedId = useMemo(() => parseOrderNumber(orderRef), [orderRef])

  // Vérification côté serveur : le n° de commande ne doit pas venir que de l'URL.
  const ordersQuery = trpc.orders.myOrders.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  })

  const matchedOrder = useMemo(() => {
    const list = ordersQuery.data ?? []
    if (parsedId != null) return list.find((o) => o.id === parsedId) ?? null
    return list[0] ?? null
  }, [ordersQuery.data, parsedId])

  // Redirections : aucune commande valide → retour à l'accueil.
  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) {
      if (parsedId == null) navigate('/', { replace: true })
      return
    }
    if (!ordersQuery.isSuccess) return
    const list = ordersQuery.data ?? []
    if (list.length === 0 || (parsedId != null && !matchedOrder)) {
      navigate('/', { replace: true })
    }
  }, [authLoading, isAuthenticated, ordersQuery.isSuccess, ordersQuery.data, parsedId, matchedOrder, navigate])

  const displayRef = matchedOrder
    ? formatOrderNumber(matchedOrder.id, new Date(matchedOrder.createdAt))
    : orderRef

  const baseDate = matchedOrder ? new Date(matchedOrder.createdAt) : new Date()
  const timeline = [
    { label: 'Questionnaire', detail: 'Votre histoire, vos mots', date: "Aujourd'hui" },
    { label: 'Scénarios', detail: 'Des propositions à choisir', date: dateFmt.format(addDays(baseDate, 5)) },
    { label: 'Vidéo en filigrane', detail: 'Vous validez avant la finale', date: dateFmt.format(addDays(baseDate, 14)) },
    {
      label: 'Faire-part en ligne',
      detail: 'Lien, QR & kit de partage',
      date: dateFmt.format(addDays(baseDate, texts.deliveryEstimateDays)),
    },
  ]

  const waNumber = formatPhoneFr(texts.contactWhatsApp)
  const waLink = whatsappHref(
    texts.contactWhatsApp,
    "Bonjour Scroll The Date ! Voici notre note vocale pour raconter notre histoire",
  )

  // Pendant la vérification serveur d'un utilisateur connecté : écran d'attente.
  if (isAuthenticated && ordersQuery.isLoading) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center bg-anthracite-950">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-anthracite-700 border-t-terracotta-500" />
      </div>
    )
  }

  return (
    <div className="bg-anthracite-950">
      {/* ------------------------------------------------------------ */}
      {/* Section 1 — Confirmation                                      */}
      {/* ------------------------------------------------------------ */}
      <section className="grain relative overflow-hidden px-6 pb-24 pt-16 lg:pb-32 lg:pt-20">
        <ConfettiBurst />
        <div className="relative mx-auto max-w-[720px] text-center">
          {/* Cachet monogramme qui « se pose » */}
          <motion.div
            initial={reduceMotion ? false : { scale: 1.6, rotate: -8, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 16, duration: 0.5 }}
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-terracotta-500/40 bg-anthracite-900"
          >
            <img src="/favicon.svg" alt="" className="h-12 w-12" />
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            className="mt-8 text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-300"
          >
            Commande confirmée{displayRef ? ` — ${displayRef}` : ''}
          </motion.p>

          <h1 className="font-display mt-6 text-[clamp(2.6rem,6vw,4.6rem)] font-light leading-[1.05] tracking-[-0.02em] text-white">
            <WordReveal
              segments={[{ text: 'Merci. Maintenant,' }, { text: 'racontez-nous tout.', accent: true }]}
              delay={0.2}
            />
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.55, ease: EASE_EDITORIAL }}
            className="mx-auto mt-8 max-w-lg text-[16px] leading-[1.65] text-white/60"
          >
            Votre place est réservée dans notre planning de production. Un email de confirmation
            vient de vous être envoyé avec le récapitulatif de votre commande
            {isAuthenticated
              ? ' — votre espace est accessible dès maintenant ci-dessous.'
              : " — il contient le lien pour activer votre espace en choisissant votre mot de passe."}
          </motion.p>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Section 2 — Les 3 prochaines étapes                           */}
      {/* ------------------------------------------------------------ */}
      <section className="px-6 pb-24 lg:px-12 lg:pb-32">
        <motion.ol
          className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-20%' }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.15 } } }}
        >
          {/* Étape 1 — Créer l'espace */}
          <StepCard
            number="1"
            icon={<UserRound size={20} className="text-terracotta-300" aria-hidden />}
            title="Activez votre espace"
            text={
              isAuthenticated
                ? 'Votre espace est actif : questionnaire, scénarios, RSVP, tout est centralisé ici.'
                : "Ouvrez l'email de confirmation et cliquez sur « Activer mon espace » pour choisir votre mot de passe. Vous y retrouverez questionnaire, scénarios et RSVP."
            }
          >
            {isAuthenticated ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-success/40 bg-success/10 px-5 py-2.5 text-[13px] font-semibold text-success">
                <Check size={15} aria-hidden />
                Espace actif{user?.name ? ` — ${user.name}` : ''}
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-anthracite-700 px-5 py-2.5 text-[13px] font-semibold text-white/70">
                <Mail size={15} className="text-terracotta-500" aria-hidden />
                Lien envoyé par email
              </span>
            )}
          </StepCard>

          {/* Étape 2 — Questionnaire */}
          <StepCard
            number="2"
            icon={<PenLine size={20} className="text-terracotta-300" aria-hidden />}
            title="Remplissez le questionnaire"
            text="Votre rencontre, vos moments, les infos pratiques du jour J. 10 minutes, à votre rythme."
          >
            <Link
              to={isAuthenticated ? '/espace/questionnaire' : LOGIN_PATH}
              className="inline-flex items-center gap-2 rounded-full bg-terracotta-500 px-6 py-3 text-[13px] font-semibold uppercase tracking-[0.1em] text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400 active:scale-[0.97]"
            >
              Commencer le questionnaire
              <ArrowRight size={14} aria-hidden />
            </Link>
          </StepCard>

          {/* Étape 3 — Note vocale WhatsApp */}
          <StepCard
            number="3"
            icon={<Mic size={20} className="text-terracotta-300" aria-hidden />}
            title="Laissez une note vocale"
            text={`Sur WhatsApp au ${waNumber} : racontez votre histoire avec vos mots, vos rires, vos hésitations. C'est notre matière première.`}
          >
            <div className="flex items-center gap-4">
              <span className="rounded-xl bg-white p-2">
                <QRCodeSVG value={waLink} size={72} fgColor="#1B1B1E" bgColor="#FFFFFF" />
              </span>
              <a
                href={waLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-anthracite-700 px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-white transition-all hover:-translate-y-0.5 hover:border-terracotta-500 hover:text-terracotta-300"
              >
                <MessageCircle size={14} className="text-terracotta-500" aria-hidden />
                Ouvrir WhatsApp
              </a>
            </div>
          </StepCard>
        </motion.ol>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Section 3 — Ce qui se passe ensuite (mini-timeline)           */}
      {/* ------------------------------------------------------------ */}
      <section className="bg-anthracite-900 px-6 py-24 lg:px-12 lg:py-32">
        <div className="mx-auto max-w-6xl">
          <FadeUp>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-300">
              Ce qui se passe ensuite
            </p>
            <h2 className="font-display mt-4 text-[clamp(2rem,4vw,3.2rem)] font-light leading-[1.05] tracking-[-0.015em] text-white">
              4 étapes, <em className="italic text-terracotta-300">72 h</em>.
            </h2>
          </FadeUp>

          <div className="relative mt-16">
            <div
              aria-hidden
              className="absolute left-0 right-0 top-[7px] hidden h-px bg-anthracite-700 md:block"
            />
            <motion.div
              aria-hidden
              className="absolute left-0 right-0 top-[7px] hidden h-px origin-left bg-terracotta-500 md:block"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, margin: '-20%' }}
              transition={{ duration: 1.2, ease: EASE_EDITORIAL }}
            />
            <motion.ol
              className="grid gap-10 md:grid-cols-4"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-20%' }}
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.2 } } }}
            >
              {timeline.map((step) => (
                <motion.li
                  key={step.label}
                  variants={{
                    hidden: { opacity: 0 },
                    show: { opacity: 1, transition: { duration: 0.5 } },
                  }}
                  className="flex gap-4 md:block"
                >
                  <motion.span
                    variants={{
                      hidden: { scale: 0.8, opacity: 0 },
                      show: {
                        scale: 1,
                        opacity: 1,
                        transition: { type: 'spring', stiffness: 300, damping: 16 },
                      },
                    }}
                    aria-hidden
                    className="mt-1 block h-3.5 w-3.5 shrink-0 rounded-full border-2 border-terracotta-500 bg-anthracite-900 md:mb-6 md:mt-0"
                  />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-terracotta-300">
                      {step.date}
                    </p>
                    <p className="font-display mt-2 text-xl font-medium text-white">{step.label}</p>
                    <p className="mt-1 text-[13px] text-white/55">{step.detail}</p>
                  </div>
                </motion.li>
              ))}
            </motion.ol>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Section 4 — Aide                                              */}
      {/* ------------------------------------------------------------ */}
      <section className="px-6 py-20 lg:py-24">
        <FadeUp className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
          <p className="text-[15px] text-white/60">Une question, un doute, une impatience ?</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href={waLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-anthracite-700 px-6 py-3 text-[13px] font-semibold uppercase tracking-[0.1em] text-white transition-all hover:-translate-y-0.5 hover:border-terracotta-500 hover:text-terracotta-300"
            >
              <MessageCircle size={15} className="text-terracotta-500" aria-hidden />
              Écrivez-nous sur WhatsApp
            </a>
            <a
              href="mailto:contact@scrollthedate.com"
              className="inline-flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.1em] text-white/70 transition-colors hover:text-terracotta-300"
            >
              <Mail size={15} className="text-terracotta-500" aria-hidden />
              contact@scrollthedate.com
            </a>
          </div>
        </FadeUp>
      </section>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Card d'étape                                                                */
/* -------------------------------------------------------------------------- */

function StepCard({
  number,
  icon,
  title,
  text,
  children,
}: {
  number: string
  icon: React.ReactNode
  title: string
  text: string
  children: React.ReactNode
}) {
  return (
    <motion.li
      variants={{
        hidden: { y: 40, opacity: 0 },
        show: { y: 0, opacity: 1, transition: { duration: 0.8, ease: EASE_EDITORIAL } },
      }}
      whileHover={{ y: -4 }}
      className="relative flex flex-col rounded-xl border border-anthracite-700/60 bg-anthracite-800 p-7"
    >
      <div className="flex items-start justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-anthracite-900">
          {icon}
        </span>
        <motion.span
          variants={{
            hidden: { scale: 0.8, opacity: 0 },
            show: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 280, damping: 16 } },
          }}
          aria-hidden
          className="text-outline-terracotta font-display text-5xl font-light leading-none"
        >
          {number}
        </motion.span>
      </div>
      <h3 className="font-display mt-6 text-2xl font-medium text-white">{title}</h3>
      <p className="mt-3 flex-1 text-[14px] leading-[1.65] text-white/60">{text}</p>
      <div className="mt-7">{children}</div>
    </motion.li>
  )
}
