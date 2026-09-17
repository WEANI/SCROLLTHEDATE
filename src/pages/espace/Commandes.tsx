import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, animate, motion, useInView } from 'framer-motion'
import {
  ArrowRight,
  ChevronDown,
  Download,
  FileText,
  MessageCircle,
  Music4,
  Users,
} from 'lucide-react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
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
  formatDate,
  formatDateShort,
  formatPrice,
  PRODUCT_LABEL,
  PROJECT_STATUS_LABEL,
} from '@/components/espace/utils'
import QrShare from '@/components/espace/QrShare'
import { EmptyState } from '@/components/espace/shared'
import { useSelectedProject } from '@/components/espace/ProjectSelection'

// ---------------------------------------------------------------------------
// Facture (fenêtre d'impression → PDF)
// ---------------------------------------------------------------------------

interface OrderLike {
  id: number
  product: string
  options: unknown
  amountCents: number
  paymentStatus: string
  stripeRef: string | null
  createdAt: Date | string
}

function orderNumber(o: OrderLike) {
  return `FL-${new Date(o.createdAt).getFullYear()}-${String(o.id).padStart(4, '0')}`
}

/**
 * Identité légale du vendeur — synchronisée avec MentionsLegales.tsx
 * (source de vérité). NE PAS modifier ces valeurs ici sans les répercuter
 * là-bas : un SIREN/une adresse qui divergent entre les deux pages seraient
 * pires qu'une page incomplète. Code postal du siège manquant (cf.
 * TodoBlock de MentionsLegales.tsx) — affiché tel quel, jamais inventé :
 * un SIRET/une adresse fabriqués rendraient la facture invalide plutôt
 * qu'incomplète. À compléter avant tout envoi de facture réelle à un
 * client.
 */
const SELLER = {
  legalName: 'WEANI',
  brand: 'Scroll The Date',
  form: 'SAS au capital social de 1 000 €',
  address: '9 rue de Condé, Bordeaux', // code postal manquant, cf. doc ci-dessus
  rcs: 'RCS Bordeaux 904 049 301',
  siren: '904 049 301',
  vat: 'FR76 904049301',
}

/**
 * Taux de TVA standard (20 %) — appliqué aux prix affichés au client
 * (`amountCents`), traités comme TTC (convention B2C : le prix annoncé à un
 * particulier est toujours TTC, art. L112-1 C. consom.). Hypothèse à
 * confirmer : si WEANI relève en réalité de la franchise en base de TVA
 * (art. 293 B CGI) plutôt que d'un régime réel, ce taux et la ventilation
 * HT/TVA ci-dessous ne s'appliquent pas — remplacer par la mention
 * « TVA non applicable, art. 293 B du CGI » sur chaque ligne. Le numéro de
 * TVA intracommunautaire déjà publié dans MentionsLegales.tsx (non signalé
 * comme provisoire) suggère un régime réel, d'où ce choix par défaut.
 */
const VAT_RATE = 0.2

function splitTTC(ttcCents: number) {
  const ht = Math.round(ttcCents / (1 + VAT_RATE))
  return { ht, tva: ttcCents - ht }
}

function openInvoice(o: OrderLike, customerName: string, customerEmail: string) {
  const options = (o.options as { id: string; label: string; priceCents: number }[] | null) ?? []
  const baseCents = o.amountCents - options.reduce((s, x) => s + x.priceCents, 0)

  const lineRow = (label: string, ttcCents: number) => {
    const { ht } = splitTTC(ttcCents)
    return `<tr><td>${label}</td><td class="num">${formatPrice(ht)}</td><td class="num">20 %</td><td class="num">${formatPrice(ttcCents)}</td></tr>`
  }
  const rows = [
    lineRow(PRODUCT_LABEL[o.product] ?? o.product, baseCents),
    ...options.map((opt) => lineRow(`Option — ${opt.label}`, opt.priceCents)),
  ].join('')

  const { ht: totalHt, tva: totalTva } = splitTTC(o.amountCents)
  const issueDate = formatDate(o.createdAt, { day: '2-digit', month: 'long', year: 'numeric' })

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Facture ${orderNumber(o)}</title>
<style>
  body{font-family:Georgia,serif;color:#232326;max-width:720px;margin:40px auto;padding:0 24px;font-size:13px;line-height:1.55}
  .logo{height:56px;width:auto;display:block}
  .sub{margin:8px 0 0;font-size:11px;color:#9A9AA0;font-family:Arial,sans-serif}
  .top{display:flex;justify-content:space-between;gap:32px;margin-top:28px}
  .block h2{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:#9A9AA0;margin:0 0 6px;font-family:Arial,sans-serif;font-weight:600}
  .block p{margin:0 0 2px}
  .meta{margin-top:24px;font-size:12.5px}
  .meta b{font-weight:600}
  table{width:100%;border-collapse:collapse;margin-top:24px}
  th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#9A9AA0;font-family:Arial,sans-serif;font-weight:600;padding:6px 8px;border-bottom:1px solid #232326}
  td{padding:10px 8px;border-bottom:1px solid #E8E5E1}
  .num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
  .totals{margin-top:0;width:280px;margin-left:auto;border-collapse:collapse}
  .totals td{border-bottom:none;padding:4px 8px}
  .totals .grand td{font-weight:bold;font-size:15px;border-top:1px solid #232326;padding-top:10px}
  .pay{margin-top:28px;padding-top:16px;border-top:1px solid #E8E5E1;font-size:12px}
  .legal{margin-top:28px;padding-top:16px;border-top:1px solid #E8E5E1;font-size:10.5px;color:#9A9AA0;line-height:1.6;font-family:Arial,sans-serif}
</style></head><body>
  <img class="logo" src="/logo-dark.png" alt="Scroll The Date" />
  <p class="sub">${SELLER.legalName} — ${SELLER.form}</p>

  <div class="top">
    <div class="block">
      <h2>Vendeur</h2>
      <p><b>${SELLER.legalName}</b> (marque « ${SELLER.brand} »)</p>
      <p>${SELLER.form}</p>
      <p>${SELLER.address}</p>
      <p>SIREN ${SELLER.siren} — ${SELLER.rcs}</p>
      <p>TVA intracommunautaire : ${SELLER.vat}</p>
    </div>
    <div class="block">
      <h2>Client</h2>
      <p><b>${customerName}</b></p>
      <p>${customerEmail || '—'}</p>
    </div>
  </div>

  <p class="meta">
    <b>Facture n°</b> ${orderNumber(o)} &nbsp; <b>Date d'émission</b> ${issueDate}<br>
    <b>Date de vente</b> ${issueDate} — prestation numérique, livraison après validation du projet<br>
    <b>Nature de l'opération</b> Prestation de services<br>
    <b>Réf. paiement</b> ${o.stripeRef ?? '—'}
  </p>

  <table>
    <thead><tr><th>Désignation</th><th class="num">Prix HT</th><th class="num">TVA</th><th class="num">Prix TTC</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <table class="totals">
    <tr><td>Total HT</td><td class="num">${formatPrice(totalHt)}</td></tr>
    <tr><td>TVA (20 %)</td><td class="num">${formatPrice(totalTva)}</td></tr>
    <tr class="grand"><td>Total TTC</td><td class="num">${formatPrice(o.amountCents)}</td></tr>
  </table>

  <p class="pay">
    <b>Statut</b> Facture réglée en totalité le ${issueDate} par carte bancaire (Stripe).<br>
    Escompte pour paiement anticipé : néant.<br>
    Taux de pénalités de retard applicable en cas de règlement différé : 3 fois le taux d'intérêt légal.
  </p>

  <p class="legal">
    ${SELLER.legalName}, ${SELLER.form}, immatriculée au ${SELLER.rcs}, SIREN ${SELLER.siren}, siège social ${SELLER.address}.
    TVA intracommunautaire ${SELLER.vat}. Éditeur du site scrollthedate.com sous la marque « ${SELLER.brand} ».
  </p>

  <script>window.print()</script>
</body></html>`
  const win = window.open('', '_blank', 'width=760,height=920')
  if (!win) return
  win.document.write(html)
  win.document.close()
}

// ---------------------------------------------------------------------------
// KPI animé (count-up)
// ---------------------------------------------------------------------------

function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.5 })
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (!inView) return
    const controls = animate(0, value, {
      duration: 1,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    })
    return () => controls.stop()
  }, [inView, value])
  return (
    <span ref={ref} className="tabular-nums">
      {display}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Page Commandes
// ---------------------------------------------------------------------------

export default function Commandes() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  // `enabled: isAuthenticated` — cf. TableauDeBord.tsx pour l'explication :
  // évite de lancer ces requêtes avant que la session ne soit confirmée
  // (juste après un signup/login), ce qui afficherait une erreur à un
  // client pourtant bien connecté.
  const { projectId } = useSelectedProject()
  const ordersQuery = trpc.orders.myOrders.useQuery(undefined, { enabled: isAuthenticated })
  const rsvpQuery = trpc.rsvp.listMine.useQuery({ projectId }, { enabled: isAuthenticated, retry: false })

  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [rsvpFilter, setRsvpFilter] = useState<'all' | 'yes' | 'no' | 'maybe'>('all')

  const orders = useMemo(() => (ordersQuery.data ?? []) as (OrderLike & { projects: { id: number; status: string; slug: string }[] })[], [ordersQuery.data])
  const rsvp = rsvpQuery.data ?? null
  const responses = useMemo(() => rsvp?.responses ?? [], [rsvp])

  const deliveredProject = orders
    .flatMap((o) => o.projects)
    .find((p) => p.status === 'DELIVERED')

  const stats = useMemo(() => {
    const yes = responses.filter((r) => r.attending === 'yes')
    const no = responses.filter((r) => r.attending === 'no')
    const people = yes.reduce((s, r) => s + 1 + (r.plusOnes ?? 0), 0)
    return { total: responses.length, yes: yes.length, no: no.length, people }
  }, [responses])

  const chartData = useMemo(() => {
    const byDay = new Map<string, number>()
    for (const r of responses) {
      const key = formatDateShort(r.createdAt)
      byDay.set(key, (byDay.get(key) ?? 0) + 1)
    }
    return Array.from(byDay.entries()).map(([day, count]) => ({ day, reponses: count }))
  }, [responses])

  const filteredResponses = responses.filter((r) => rsvpFilter === 'all' || r.attending === rsvpFilter)

  const exportCsv = () => {
    const header = 'Invité;Email;Réponse;Accompagnants;Allergies;Chanson;Message;Date'
    const lines = responses.map((r) =>
      [
        r.guestName,
        r.email ?? '',
        r.attending === 'yes' ? 'Oui' : r.attending === 'no' ? 'Non' : 'Peut-être',
        String(r.plusOnes),
        r.allergies ?? '',
        r.song ?? '',
        (r.message ?? '').replace(/[\n;]+/g, ' '),
        formatDate(r.createdAt),
      ]
        .map((c) => `"${c.replace(/"/g, '""')}"`)
        .join(';'),
    )
    const blob = new Blob(['\ufeff' + header + '\n' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'rsvp-reponses.csv'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  if (authLoading || ordersQuery.isLoading) return <PageSkeleton />
  if (ordersQuery.error) return <ErrorState onRetry={() => ordersQuery.refetch()} />

  const inviteUrl = deliveredProject
    ? `${window.location.origin}/faire-part/${deliveredProject.slug}`
    : null

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Kicker>Vos achats</Kicker>
        <h2 className="font-display mt-1 text-3xl font-medium tracking-[-0.01em] text-ink">Commandes</h2>
        <p className="mt-1.5 text-[14px] text-neutral-500">
          Historique, factures et suivi de votre faire-part.
        </p>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          title="Aucune commande pour le moment"
          description="Votre espace se remplira dès votre première commande."
          action={
            <Link
              to="/offres"
              className="mt-2 rounded-full bg-terracotta-500 px-6 py-2.5 text-[13px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400"
            >
              Découvrir les offres
            </Link>
          }
        />
      ) : (
        <SectionCard className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-neutral-200 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                  <th className="px-6 py-4">N°</th>
                  <th className="px-4 py-4">Produit</th>
                  <th className="px-4 py-4">Date</th>
                  <th className="px-4 py-4">Montant</th>
                  <th className="px-4 py-4">Paiement</th>
                  <th className="px-4 py-4">Projet</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o, i) => {
                  const project = o.projects[0] ?? null
                  const expanded = expandedId === o.id
                  return (
                    <motion.tr
                      key={o.id}
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ delay: i * 0.06, duration: 0.4 }}
                      className="group border-b border-neutral-200/70 align-top transition-colors last:border-0 hover:bg-[#EDEAE6]/50"
                    >
                      <td colSpan={7} className="p-0">
                        {/* Ligne */}
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setExpandedId(expanded ? null : o.id)}
                          onKeyDown={(e) => e.key === 'Enter' && setExpandedId(expanded ? null : o.id)}
                          className="flex cursor-pointer flex-wrap items-center md:grid md:grid-cols-[1.2fr_1.4fr_1fr_1fr_1fr_1.2fr_1.4fr]"
                        >
                          <span className="w-full px-6 pb-1 pt-4 font-mono text-[13px] tabular-nums text-ink md:w-auto md:py-4">
                            {orderNumber(o)}
                          </span>
                          <span className="px-6 py-1 text-[13.5px] text-ink md:px-4 md:py-4">
                            {PRODUCT_LABEL[o.product] ?? o.product}
                          </span>
                          <span className="px-6 py-1 text-[13px] text-neutral-500 md:px-4 md:py-4">
                            {formatDate(o.createdAt)}
                          </span>
                          <span className="px-6 py-1 text-[13.5px] font-medium tabular-nums text-ink md:px-4 md:py-4">
                            {formatPrice(o.amountCents)}
                          </span>
                          <span className="px-6 py-1 md:px-4 md:py-4">
                            <StatusBadge tone={o.paymentStatus === 'paid' ? 'success' : 'pending'}>
                              {o.paymentStatus === 'paid' ? 'Payé' : 'En attente'}
                            </StatusBadge>
                          </span>
                          <span className="px-6 py-1 md:px-4 md:py-4">
                            {project ? (
                              <StatusBadge tone={project.status === 'DELIVERED' ? 'success' : 'terracotta'}>
                                {PROJECT_STATUS_LABEL[project.status] ?? project.status}
                              </StatusBadge>
                            ) : (
                              <span className="text-[12.5px] text-neutral-500">—</span>
                            )}
                          </span>
                          <span className="flex items-center justify-end gap-2 px-6 py-3 md:py-4">
                            <span
                              role="button"
                              tabIndex={0}
                              aria-label="Télécharger la facture"
                              onClick={(e) => {
                                e.stopPropagation()
                                openInvoice(o, user?.name ?? 'Client', user?.email ?? '')
                              }}
                              onKeyDown={(e) => e.stopPropagation()}
                              className="flex h-9 w-9 items-center justify-center rounded-full text-terracotta-500 transition-colors hover:bg-terracotta-500/10"
                            >
                              <Download size={16} />
                            </span>
                            {project && (
                              <Link
                                to="/espace/projet"
                                onClick={(e) => e.stopPropagation()}
                                className="hidden items-center gap-1 rounded-full border border-neutral-200 px-3.5 py-2 text-[12px] font-medium text-ink transition-colors hover:bg-neutral-100 sm:inline-flex"
                              >
                                Voir le projet <ArrowRight size={12} />
                              </Link>
                            )}
                            <ChevronDown
                              size={16}
                              className={cn('text-neutral-500 transition-transform', expanded && 'rotate-180')}
                            />
                          </span>
                        </div>
                        {/* Détail expandé */}
                        <AnimatePresence>
                          {expanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="overflow-hidden"
                            >
                              <div className="grid gap-6 border-t border-neutral-200/70 bg-neutral-100/50 px-6 py-5 sm:grid-cols-3">
                                <div>
                                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                                    Options choisies
                                  </p>
                                  {((o.options as { label: string; priceCents: number }[] | null) ?? []).length === 0 ? (
                                    <p className="text-[13px] text-neutral-500">Formule seule</p>
                                  ) : (
                                    <ul className="flex flex-col gap-1">
                                      {((o.options as { label: string; priceCents: number }[] | null) ?? []).map((opt, j) => (
                                        <li key={j} className="flex justify-between gap-4 text-[13px]">
                                          <span className="text-ink">{opt.label}</span>
                                          <span className="tabular-nums text-neutral-500">{formatPrice(opt.priceCents)}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                                <div>
                                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                                    Paiement
                                  </p>
                                  <p className="text-[13px] text-ink">
                                    {o.paymentStatus === 'paid' ? 'Réglé en totalité' : 'En attente'}
                                  </p>
                                  <p className="mt-1 text-[12px] text-neutral-500">
                                    Réf. : {o.stripeRef ?? '—'}
                                  </p>
                                </div>
                                <div>
                                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                                    Reçu
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => openInvoice(o, user?.name ?? 'Client', user?.email ?? '')}
                                    className="inline-flex items-center gap-1.5 rounded-full bg-anthracite-800 px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-anthracite-700"
                                  >
                                    <FileText size={13} /> Facture {orderNumber(o)}
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Mon faire-part (RSVP live) */}
      {deliveredProject && rsvp && (
        <SectionCard>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-2xl font-medium italic text-ink">Mon faire-part.</h3>
              <p className="mt-1 text-[13.5px] text-neutral-500">
                Suivez les réponses de vos invités en temps réel.
              </p>
            </div>
            <StatusBadge tone="success">En ligne ✓</StatusBadge>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_1.6fr_1fr]">
            {/* Lien & QR */}
            {inviteUrl && (
              <QrShare
                url={inviteUrl}
                shareMessage={`Nous nous marions ! Découvrez notre histoire : ${inviteUrl}`}
              />
            )}

            {/* RSVP live */}
            <div>
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'réponses', value: stats.total },
                  { label: 'oui', value: stats.yes },
                  { label: 'non', value: stats.no },
                  { label: 'personnes attendues', value: stats.people },
                ].map((kpi) => (
                  <div key={kpi.label} className="rounded-xl bg-neutral-100/70 p-3">
                    <p className="font-display text-2xl font-medium text-ink">
                      <CountUp value={kpi.value} />
                    </p>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                      {kpi.label}
                    </p>
                  </div>
                ))}
              </div>
              {/* Barres oui / non */}
              <div className="mb-5 flex flex-col gap-2">
                {(
                  [
                    ['Oui', stats.yes, '#C96F5A'],
                    ['Non', stats.no, '#9A9AA0'],
                  ] as const
                ).map(([label, value, color], i) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="w-8 text-[12px] font-medium text-neutral-500">{label}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-200">
                      <motion.span
                        className="block h-full rounded-full"
                        style={{ backgroundColor: color, originX: 0 }}
                        initial={{ scaleX: 0 }}
                        whileInView={{ scaleX: stats.total > 0 ? value / stats.total : 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </span>
                    <span className="w-8 text-right text-[12px] tabular-nums text-ink">{value}</span>
                  </div>
                ))}
              </div>

              {/* Filtres + export */}
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {(
                  [
                    ['all', 'Tous'],
                    ['yes', 'Oui'],
                    ['no', 'Non'],
                    ['maybe', 'Peut-être'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setRsvpFilter(key)}
                    className={cn(
                      'rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-all',
                      rsvpFilter === key ? 'bg-anthracite-800 text-white' : 'bg-neutral-100 text-ink hover:bg-neutral-200',
                    )}
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={exportCsv}
                  disabled={responses.length === 0}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-terracotta-500 px-4 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-terracotta-400 disabled:opacity-50"
                >
                  <Download size={13} /> Exporter CSV
                </button>
              </div>

              {/* Table réponses */}
              <div className="max-h-72 overflow-y-auto rounded-xl border border-neutral-200">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-neutral-200 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                      <th className="px-4 py-2.5">Invité</th>
                      <th className="px-3 py-2.5">Réponse</th>
                      <th className="px-3 py-2.5">+</th>
                      <th className="hidden px-3 py-2.5 md:table-cell">Chanson</th>
                      <th className="px-4 py-2.5">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResponses.map((r, i) => (
                      <motion.tr
                        key={r.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.04 }}
                        className="border-b border-neutral-200/60 last:border-0"
                      >
                        <td className="px-4 py-2.5 text-[13px] font-medium text-ink">{r.guestName}</td>
                        <td className="px-3 py-2.5">
                          <StatusBadge tone={r.attending === 'yes' ? 'success' : r.attending === 'no' ? 'neutral' : 'pending'}>
                            {r.attending === 'yes' ? 'Oui' : r.attending === 'no' ? 'Non' : 'Peut-être'}
                          </StatusBadge>
                        </td>
                        <td className="px-3 py-2.5 text-[13px] tabular-nums text-neutral-500">
                          {r.plusOnes > 0 ? `+${r.plusOnes}` : '—'}
                        </td>
                        <td className="hidden max-w-40 truncate px-3 py-2.5 text-[12.5px] text-neutral-500 md:table-cell">
                          {r.song ? (
                            <span className="inline-flex items-center gap-1">
                              <Music4 size={12} className="shrink-0 text-terracotta-500" /> {r.song}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-[12px] text-neutral-500">{formatDateShort(r.createdAt)}</td>
                      </motion.tr>
                    ))}
                    {filteredResponses.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-[13px] text-neutral-500">
                          Aucune réponse dans ce filtre.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <a
                href={`https://wa.me/?text=${encodeURIComponent('Petit rappel : pensez à répondre à notre faire-part ! ' + (inviteUrl ?? ''))}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-terracotta-500 underline-offset-4 hover:underline"
              >
                <MessageCircle size={13} /> Relancer les sans-réponse (WhatsApp)
              </a>
            </div>

            {/* Réponses par jour */}
            <div>
              <p className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                <Users size={13} /> Réponses par jour
              </p>
              {chartData.length === 0 ? (
                <p className="text-[13px] text-neutral-500">Les statistiques apparaîtront dès les premières réponses.</p>
              ) : (
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9A9AA0' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: 'rgba(201,111,90,0.08)' }}
                        contentStyle={{ borderRadius: 12, border: '1px solid #E8E5E1', fontSize: 12 }}
                        labelStyle={{ color: '#232326' }}
                      />
                      <Bar dataKey="reponses" name="Réponses" fill="#C96F5A" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </SectionCard>
      )}

      {/* Factures */}
      {orders.some((o) => o.paymentStatus === 'paid') && (
        <SectionCard>
          <h3 className="font-display mb-4 text-xl font-medium text-ink">Factures</h3>
          <ul className="flex flex-col divide-y divide-neutral-200/70">
            {orders
              .filter((o) => o.paymentStatus === 'paid')
              .map((o, i) => (
                <motion.li
                  key={o.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center gap-4 py-3"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-terracotta-500/10 text-terracotta-500">
                    <FileText size={17} />
                  </span>
                  <p className="min-w-0 flex-1 text-[13.5px] text-ink">
                    Facture {orderNumber(o)} — <span className="tabular-nums">{formatPrice(o.amountCents)}</span>
                    <span className="block text-[12px] text-neutral-500">{formatDate(o.createdAt)}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => openInvoice(o, user?.name ?? 'Client', user?.email ?? '')}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-terracotta-500 transition-colors hover:bg-terracotta-500/10"
                    aria-label="Télécharger la facture"
                  >
                    <Download size={16} />
                  </button>
                </motion.li>
              ))}
          </ul>
        </SectionCard>
      )}
    </div>
  )
}
