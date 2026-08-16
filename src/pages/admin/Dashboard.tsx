import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckSquare,
  ClipboardList,
  Clock,
  Euro,
  FolderKanban,
  MessageSquare,
  Square,
  Users,
  Video,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { cn } from "@/lib/utils";
import {
  coupleNamesFromSlug,
  daysSince,
  formatDateTime,
  formatEuro,
  initials,
  orderRef,
  pctDelta,
  productLabel,
  unreadMessages,
  type AdminOverview,
  type AdminProject,
} from "@/components/admin/shared";

type Period = 7 | 30 | 90 | 365;
const PERIODS: { value: Period; label: string }[] = [
  { value: 7, label: "7 j" },
  { value: 30, label: "30 j" },
  { value: 90, label: "90 j" },
  { value: 365, label: "Année" },
];

/** Count-up animé (800ms) pour les KPI. */
function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from + (target - from) * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return value;
}

function Delta({ value, suffix = "%" }: { value: number; suffix?: string }) {
  const positive = value >= 0;
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6 }}
      className={cn(
        "inline-flex items-center gap-0.5 text-[12px] font-semibold",
        positive ? "text-success" : "text-error",
      )}
    >
      {positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
      {positive ? "+" : ""}
      {value} {suffix}
    </motion.span>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  format,
  delta,
  deltaSuffix,
  badge,
  delay,
}: {
  icon: typeof Euro;
  label: string;
  value: number;
  format?: (n: number) => string;
  delta?: number;
  deltaSuffix?: string;
  badge?: { text: string; cls: string };
  delay: number;
}) {
  const animated = useCountUp(value);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-xl bg-white p-5 shadow-[0_8px_32px_rgba(27,27,30,.06)]"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-terracotta-500/10 text-terracotta-500">
          <Icon size={16} />
        </span>
        {badge && (
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", badge.cls)}>
            {badge.text}
          </span>
        )}
      </div>
      <p className="tabular text-[26px] font-semibold leading-none tracking-tight">
        {format ? format(animated) : Math.round(animated)}
      </p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-[12px] font-medium text-neutral-500">{label}</p>
        {delta !== undefined && <Delta value={delta} suffix={deltaSuffix} />}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Alertes de blocage
// ---------------------------------------------------------------------------
interface AlertItem {
  project: AdminProject;
  reason: string;
  days: number;
}

function buildAlerts(projects: AdminProject[]): AlertItem[] {
  const alerts: AlertItem[] = [];
  for (const p of projects) {
    if (p.status === "DELIVERED") continue;
    const days = daysSince(p.updatedAt);
    if (p.order.paymentStatus === "failed") {
      alerts.push({ project: p, reason: "paiement échoué", days });
      continue;
    }
    if (p.status === "QUESTIONNAIRE" && (p.questionnaire?.completionPct ?? 0) === 0 && days >= 4) {
      alerts.push({ project: p, reason: `questionnaire non commencé depuis ${days} j`, days });
    } else if (p.status === "REVIEW" && days >= 3) {
      alerts.push({ project: p, reason: `filigrane envoyé il y a ${days} j, pas de réponse`, days });
    } else if (p.status === "SCENARIOS" && days >= 5) {
      alerts.push({ project: p, reason: `scénarios en attente client depuis ${days} j`, days });
    }
  }
  return alerts.sort((a, b) => b.days - a.days);
}

function AlertsCard({ projects }: { projects: AdminProject[] }) {
  const utils = trpc.useUtils();
  const send = trpc.messages.send.useMutation({
    onSuccess: () => {
      utils.projects.adminList.invalidate();
      toast.success("Relance envoyée au client");
    },
    onError: () => toast.error("Échec de la relance"),
  });
  const alerts = buildAlerts(projects);

  return (
    <section className="rounded-xl border-l-[3px] border-pending bg-white p-5 shadow-[0_8px_32px_rgba(27,27,30,.06)]">
      <h3 className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
        <AlertTriangle size={14} className="animate-badge-pulse text-pending" />
        Alertes de blocage
        <span className="tabular ml-auto rounded-full bg-pending/15 px-2 py-0.5 text-[11px] font-bold text-pending">
          {alerts.length}
        </span>
      </h3>
      {alerts.length === 0 ? (
        <p className="text-[13px] text-neutral-500">Aucun projet bloqué. Tout roule.</p>
      ) : (
        <ul className="space-y-3">
          {alerts.slice(0, 5).map((a) => (
            <li key={a.project.id} className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium leading-snug">
                  <span className="tabular font-semibold">{orderRef(a.project.orderId)}</span> : {a.reason}
                </p>
                <p className="text-[11px] text-neutral-500">{coupleNamesFromSlug(a.project.slug)}</p>
              </div>
              <button
                type="button"
                disabled={send.isPending}
                onClick={() =>
                  send.mutate({
                    projectId: a.project.id,
                    body:
                      "Bonjour ! Nous passons aux nouvelles concernant votre faire-part : n'hésitez pas à compléter les étapes en attente dans votre espace, ou à nous répondre ici si vous avez la moindre question. À très vite, l'équipe Scroll The Date.",
                  })
                }
                className="shrink-0 rounded-full border border-pending/40 px-3 py-1.5 text-[11px] font-semibold text-pending transition-colors hover:bg-pending hover:text-white disabled:opacity-40"
              >
                Relancer
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function Dashboard() {
  const [period, setPeriod] = useState<Period>(30);
  const navigate = useNavigate();

  const { data: overview } = trpc.analytics.adminOverview.useQuery({ days: period });
  const { data: projects } = trpc.projects.adminList.useQuery();
  const { data: inbox } = trpc.messages.adminInbox.useQuery();
  const { data: notifications } = trpc.notifications.listMine.useQuery();

  const [tasks, setTasks] = useState([
    { id: 1, label: "Envoyer scénarios en rédaction", done: false },
    { id: 2, label: "Uploader les filigranes en production", done: false },
    { id: 3, label: "Activer les faire-parts validés", done: false },
  ]);

  const stats = useMemo(() => {
    const list = projects ?? [];
    return {
      inProduction: list.filter((p) => p.status === "PRODUCTION").length,
      waitingClient: list.filter((p) => p.status === "SCENARIOS" || p.status === "REVIEW").length,
      byStatus: list.reduce<Record<string, number>>((acc, p) => {
        acc[p.status] = (acc[p.status] ?? 0) + 1;
        return acc;
      }, {}),
    };
  }, [projects]);

  const ov: AdminOverview | undefined = overview;
  const caChart = (ov?.conversionByProduct ?? []).map((p) => ({
    name: productLabel(p.product),
    ca: Math.round(p.revenueCents / 100),
    commandes: p.orders,
  }));

  const recentActivity = (notifications ?? []).slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Header + période */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-500">Admin</p>
          <h1 className="font-display text-[28px] font-medium leading-tight">Vue d'ensemble</h1>
        </div>
        <div className="flex gap-1 rounded-full border border-neutral-200 bg-white p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              className={cn(
                "tabular rounded-full px-4 py-1.5 text-[12px] font-semibold transition-colors",
                period === p.value ? "bg-anthracite-800 text-white" : "text-neutral-500 hover:text-ink",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          icon={Euro}
          label={`CA — ${period} derniers jours`}
          value={ov ? ov.revenueCents / 100 : 0}
          format={(n) => formatEuro(Math.round(n) * 100)}
          delta={ov ? pctDelta(ov.revenueCents, ov.prevRevenueCents) : 0}
          delay={0}
        />
        <KpiCard
          icon={ClipboardList}
          label="Commandes"
          value={ov?.orderCount ?? 0}
          delta={ov ? ov.orderCount - ov.prevOrderCount : 0}
          deltaSuffix=""
          delay={0.08}
        />
        <KpiCard
          icon={FolderKanban}
          label="En production"
          value={stats.inProduction}
          badge={{ text: "actifs", cls: "bg-terracotta-500/15 text-terracotta-500" }}
          delay={0.16}
        />
        <KpiCard
          icon={Clock}
          label="En attente client"
          value={stats.waitingClient}
          badge={{ text: "à relancer", cls: "bg-pending/15 text-pending" }}
          delay={0.24}
        />
        <KpiCard
          icon={Video}
          label="Délai moyen de production"
          value={ov?.avgProductionDays ?? 0}
          format={(n) => `${Math.round(n)} j`}
          delay={0.32}
        />
      </div>

      {/* Graph CA + pipeline */}
      <div className="grid gap-4 xl:grid-cols-3">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="rounded-xl bg-white p-5 shadow-[0_8px_32px_rgba(27,27,30,.06)] xl:col-span-2"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Chiffre d'affaires par produit
            </h3>
            <span className="tabular text-[12px] text-neutral-500">
              Période précédente : {ov ? formatEuro(ov.prevRevenueCents) : "—"}
            </span>
          </div>
          {caChart.length === 0 ? (
            <p className="py-16 text-center text-[13px] text-neutral-500">
              Aucune commande payée sur la période.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={caChart} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid stroke="#E8E5E1" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "#9A9AA0" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#9A9AA0" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `${v} €`}
                />
                <Tooltip
                  cursor={{ fill: "rgba(201,111,90,0.06)" }}
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #E8E5E1",
                    borderRadius: 12,
                    fontSize: 13,
                  }}
                  formatter={(value) => [`${Number(value)} €`, "CA"]}
                />
                <Bar dataKey="ca" radius={[6, 6, 0, 0]} maxBarSize={72}>
                  {caChart.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? "#C96F5A" : "#2E2E33"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          {/* Stats secondaires : questionnaires & RSVP */}
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-neutral-200 pt-4">
            <div>
              <p className="tabular text-[18px] font-semibold">{ov?.questionnaireAvgCompletion ?? 0} %</p>
              <p className="text-[11px] text-neutral-500">Complétion moyenne questionnaires</p>
            </div>
            <div>
              <p className="tabular text-[18px] font-semibold">
                {ov ? ov.rsvp.yes : 0} <span className="text-[12px] font-medium text-success">oui</span>
              </p>
              <p className="text-[11px] text-neutral-500">
                RSVP — {ov?.rsvp.guests ?? 0} invités confirmés
              </p>
            </div>
            <div>
              <p className="tabular text-[18px] font-semibold">{ov ? formatEuro(ov.avgBasketCents) : "—"}</p>
              <p className="text-[11px] text-neutral-500">Panier moyen</p>
            </div>
          </div>
        </motion.section>

        {/* Pipeline mini */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.5 }}
          className="rounded-xl bg-white p-5 shadow-[0_8px_32px_rgba(27,27,30,.06)]"
        >
          <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Pipeline
          </h3>
          <ul className="space-y-3">
            {(
              [
                ["ONBOARDING", "Nouveau"],
                ["QUESTIONNAIRE", "Questionnaire"],
                ["SCENARIOS", "Scénarios"],
                ["PRODUCTION", "Production"],
                ["REVIEW", "Validation filigrane"],
                ["DELIVERED", "Livré"],
              ] as const
            ).map(([status, label], i) => {
              const count = stats.byStatus[status] ?? 0;
              const max = Math.max(1, ...Object.values(stats.byStatus));
              return (
                <li key={status}>
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/commandes?statut=${status}`)}
                    className="group w-full text-left"
                  >
                    <span className="mb-1 flex items-center justify-between text-[12px]">
                      <span className="font-medium text-neutral-500 transition-colors group-hover:text-ink">
                        {label}
                      </span>
                      <span className="tabular font-semibold">{count}</span>
                    </span>
                    <span className="block h-2 overflow-hidden rounded-full bg-neutral-100">
                      <motion.span
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: count / max }}
                        transition={{ delay: 0.4 + i * 0.06, duration: 0.5 }}
                        className={cn(
                          "block h-full origin-left rounded-full",
                          status === "DELIVERED" ? "bg-neutral-500/40" : "bg-terracotta-500",
                        )}
                      />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </motion.section>
      </div>

      {/* Rangée 3 */}
      <div className="grid gap-4 xl:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
        >
          <AlertsCard projects={projects ?? []} />
        </motion.div>

        {/* Derniers messages */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="rounded-xl bg-white p-5 shadow-[0_8px_32px_rgba(27,27,30,.06)]"
        >
          <h3 className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            <MessageSquare size={14} className="text-terracotta-500" /> Derniers messages clients
          </h3>
          {(inbox ?? []).length === 0 ? (
            <p className="text-[13px] text-neutral-500">Aucun message pour le moment.</p>
          ) : (
            <ul className="space-y-3">
              {(inbox ?? []).slice(0, 4).map((t) => (
                <li key={t.project.id}>
                  <Link to="/admin/messages" className="flex items-start gap-3 rounded-lg p-1 transition-colors hover:bg-neutral-100">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-anthracite-800 text-[11px] font-bold text-white">
                      {initials(t.user.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-[13px] font-medium">{t.user.name ?? "Client"}</span>
                        <span className="tabular shrink-0 text-[10px] text-neutral-500">
                          {t.lastMessage ? formatDateTime(t.lastMessage.createdAt) : ""}
                        </span>
                      </span>
                      <span className="block truncate text-[12px] text-neutral-500">
                        {t.lastMessage?.body ?? ""}
                      </span>
                    </span>
                    {t.unreadCount > 0 && (
                      <span className="animate-badge-pulse mt-1 flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-terracotta-500 px-1 text-[10px] font-bold text-white">
                        {t.unreadCount}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </motion.section>

        {/* Tâches + activité */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.5 }}
          className="space-y-4"
        >
          <div className="rounded-xl bg-white p-5 shadow-[0_8px_32px_rgba(27,27,30,.06)]">
            <h3 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
              <CheckSquare size={14} className="text-terracotta-500" /> Mes tâches
            </h3>
            <ul className="space-y-2">
              {tasks.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))
                    }
                    className="flex w-full items-center gap-2.5 text-left text-[13px]"
                  >
                    {t.done ? (
                      <CheckSquare size={15} className="shrink-0 text-success" />
                    ) : (
                      <Square size={15} className="shrink-0 text-neutral-500" />
                    )}
                    <span className={cn(t.done && "text-neutral-500 line-through")}>{t.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-[0_8px_32px_rgba(27,27,30,.06)]">
            <h3 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
              <Users size={14} className="text-terracotta-500" /> Activité récente
            </h3>
            {recentActivity.length === 0 ? (
              <p className="text-[13px] text-neutral-500">Aucune activité récente.</p>
            ) : (
              <ul className="space-y-2.5">
                {recentActivity.map((n) => (
                  <li key={n.id} className="flex items-center gap-2.5 text-[12px]">
                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", n.readAt ? "bg-neutral-200" : "bg-terracotta-500")} />
                    <span className="min-w-0 flex-1 truncate font-medium">{n.type.replaceAll(".", " · ")}</span>
                    <span className="tabular shrink-0 text-[10px] text-neutral-500">{formatDateTime(n.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </motion.section>
      </div>

      {/* Raccourci pipeline projets non livrés */}
      {(projects ?? []).some((p) => unreadMessages(p) > 0) && (
        <p className="text-center text-[12px] text-neutral-500">
          {(projects ?? []).reduce((sum, p) => sum + unreadMessages(p), 0)} message(s) client non lu(s) dans le
          pipeline.
        </p>
      )}
    </div>
  );
}
