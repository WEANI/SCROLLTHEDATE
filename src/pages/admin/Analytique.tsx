import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Download, Loader2 } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { trpc } from "@/providers/trpc";
import { cn } from "@/lib/utils";
import {
  AdminButton,
  CountUp,
  Delta,
  EmptyState,
  PageHeader,
  Panel,
  PanelTitle,
  eur,
} from "@/components/admin-suite/ui";
import {
  PRODUCT_LABEL,
  PROJECT_STATUS_ORDER,
  type AdminOrder,
  type AdminProject,
  type AnalyticsOverview,
  type RsvpStatRow,
} from "@/components/admin-suite/types";

const T500 = "#C96F5A";
const T300 = "#E8B4A4";
const N300 = "#D8D3CD";
const OK = "#6FA287";
const KO = "#C0524A";

const PERIODS = [
  { days: 7, label: "7 j" },
  { days: 30, label: "30 j" },
  { days: 90, label: "90 j" },
  { days: 365, label: "Année" },
];

const tooltipStyle = {
  backgroundColor: "#FFFFFF",
  border: "1px solid #E8E5E1",
  borderRadius: 12,
  fontSize: 12,
  color: "#232326",
};

// ------------------------------------------------------------------ page ----

export default function Analytique() {
  const [days, setDays] = useState(30);
  const overviewQ = trpc.analytics.adminOverview.useQuery({ days });
  const ordersQ = trpc.orders.adminList.useQuery();
  const projectsQ = trpc.projects.adminList.useQuery();
  const rsvpQ = trpc.rsvp.stats.useQuery();

  const overview = overviewQ.data as AnalyticsOverview | undefined;
  const orders = (ordersQ.data ?? []) as AdminOrder[];
  const projects = (projectsQ.data ?? []) as AdminProject[];
  const rsvpStats = (rsvpQ.data ?? []) as RsvpStatRow[];

  // Série quotidienne CA (période courante + période précédente) depuis les commandes réelles.
  const daily = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 3600 * 1000;
    const buckets = Math.min(days, 60);
    const bucketMs = (days * dayMs) / buckets;
    const cur = new Array<number>(buckets).fill(0);
    const prev = new Array<number>(buckets).fill(0);
    const curOrders = new Array<number>(buckets).fill(0);
    for (const o of orders) {
      if (o.paymentStatus !== "paid") continue;
      const t = new Date(o.createdAt).getTime();
      const ageCur = now - t;
      if (ageCur >= 0 && ageCur < days * dayMs) {
        const b = Math.min(buckets - 1, Math.floor(ageCur / bucketMs));
        cur[buckets - 1 - b] += o.amountCents;
        curOrders[buckets - 1 - b] += 1;
      }
      const agePrev = ageCur - days * dayMs;
      if (agePrev >= 0 && agePrev < days * dayMs) {
        const b = Math.min(buckets - 1, Math.floor(agePrev / bucketMs));
        prev[buckets - 1 - b] += o.amountCents;
      }
    }
    return cur.map((v, i) => ({
      label: new Date(now - (buckets - 1 - i) * bucketMs).toLocaleDateString(
        "fr-FR",
        { day: "numeric", month: "short" },
      ),
      ca: Math.round(v / 100),
      caPrev: Math.round(prev[i] / 100),
      commandes: curOrders[i],
    }));
  }, [orders, days]);

  // Entonnoir de production (statuts réels).
  const funnel = useMemo(() => {
    const rank = (p: AdminProject) => PROJECT_STATUS_ORDER.indexOf(p.status);
    const totalOrders = orders.length;
    const questDone = projects.filter(
      (p) => (p.questionnaire?.completionPct ?? 0) >= 100,
    ).length;
    const scenarioChosen = projects.filter((p) => rank(p) >= 3).length;
    const approved = projects.filter((p) => rank(p) >= 4).length;
    const delivered = projects.filter((p) => p.status === "DELIVERED").length;
    return [
      { label: "Commandes", value: totalOrders },
      { label: "Questionnaire complet", value: questDone },
      { label: "Scénario choisi", value: scenarioChosen },
      { label: "Filigrane approuvé", value: approved },
      { label: "Livrés", value: delivered },
    ];
  }, [orders, projects]);

  // Âge moyen des projets en cours par étape (jours dans l'étape courante).
  const stageDurations = useMemo(() => {
    const byStatus = new Map<string, number[]>();
    const now = Date.now();
    for (const p of projects) {
      if (p.status === "DELIVERED") continue;
      const age = Math.max(
        0,
        Math.round((now - new Date(p.updatedAt).getTime()) / (24 * 3600 * 1000)),
      );
      const arr = byStatus.get(p.status) ?? [];
      arr.push(age);
      byStatus.set(p.status, arr);
    }
    return PROJECT_STATUS_ORDER.filter((s) => s !== "DELIVERED").map((s) => {
      const arr = byStatus.get(s) ?? [];
      return {
        stage: statusLabel(s),
        jours: arr.length
          ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10
          : 0,
        client: s === "QUESTIONNAIRE" || s === "REVIEW", // étapes côté client
        count: arr.length,
      };
    });
  }, [projects]);

  // RSVP par projet.
  const rsvpByProject = useMemo(() => {
    const map = new Map<number, { yes: number; no: number; maybe: number }>();
    for (const r of rsvpStats) {
      const row = map.get(r.projectId) ?? { yes: 0, no: 0, maybe: 0 };
      row[r.attending] += Number(r.count);
      map.set(r.projectId, row);
    }
    const rows = [...map.entries()].map(([projectId, v]) => {
      const project = projects.find((p) => p.id === projectId);
      const total = v.yes + v.no + v.maybe;
      return {
        name: project?.user?.name ?? `Projet #${projectId}`,
        oui: v.yes,
        non: v.no,
        peutEtre: v.maybe,
        taux: total,
      };
    });
    return rows.sort((a, b) => b.taux - a.taux).slice(0, 8);
  }, [rsvpStats, projects]);

  const conversionSeries = useMemo(
    () =>
      daily.map((d) => ({
        label: d.label,
        taux: d.commandes, // commandes / jour (proxy conversion faute de trafic)
      })),
    [daily],
  );

  const loading = overviewQ.isLoading;

  const exportCsv = () => {
    const lines = [
      "indicateur;periode;precédente",
      `ca_eur;${(overview?.revenueCents ?? 0) / 100};${(overview?.prevRevenueCents ?? 0) / 100}`,
      `commandes;${overview?.orderCount ?? 0};${overview?.prevOrderCount ?? 0}`,
      `panier_moyen_eur;${(overview?.avgBasketCents ?? 0) / 100};`,
      `delai_production_j;${overview?.avgProductionDays ?? ""};`,
      `completion_questionnaire_pct;${overview?.questionnaireAvgCompletion ?? 0};`,
      `rsvp_oui;${overview?.rsvp.yes ?? 0};`,
      `rsvp_non;${overview?.rsvp.no ?? 0};`,
      `rsvp_peut_etre;${overview?.rsvp.maybe ?? 0};`,
      "",
      "date;ca_eur;commandes;ca_precedent_eur",
      ...daily.map((d) => `${d.label};${d.ca};${d.commandes};${d.caPrev}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `felicity-rapport-${days}j.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] text-ink">
      <PageHeader
        title="Analytique"
        description="Vue décisionnelle — comparaison systématique avec la période précédente. Données calculées à J−1."
        actions={
          <div className="flex items-center gap-1 rounded-full border border-neutral-200 bg-white p-1">
            {PERIODS.map((p) => (
              <button
                key={p.days}
                onClick={() => setDays(p.days)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  days === p.days
                    ? "bg-terracotta-500 text-white"
                    : "text-neutral-500 hover:text-ink",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-32 text-sm text-neutral-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Calcul des indicateurs…
        </div>
      ) : (
        <>
          {/* Rangée 1 — KPI */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
            <Kpi
              label="Chiffre d'affaires"
              value={overview?.revenueCents ?? 0}
              format={(v) => eur(Math.round(v))}
              delta={
                <Delta
                  current={overview?.revenueCents ?? 0}
                  previous={overview?.prevRevenueCents ?? 0}
                />
              }
            />
            <Kpi
              label="Commandes"
              value={overview?.orderCount ?? 0}
              delta={
                <Delta
                  current={overview?.orderCount ?? 0}
                  previous={overview?.prevOrderCount ?? 0}
                />
              }
            />
            <Kpi
              label="Panier moyen"
              value={overview?.avgBasketCents ?? 0}
              format={(v) => eur(Math.round(v))}
            />
            <Kpi
              label="Délai moyen production"
              value={overview?.avgProductionDays ?? 0}
              format={(v) => `${v.toFixed(1)} j`}
              hint={`${overview?.deliveredCount ?? 0} livrés`}
            />
            <Kpi
              label="Complétion questionnaires"
              value={overview?.questionnaireAvgCompletion ?? 0}
              format={(v) => `${Math.round(v)} %`}
              hint={`${overview?.questionnaireCount ?? 0} questionnaires`}
            />
            <Kpi
              label="Invités confirmés (RSVP)"
              value={overview?.rsvp.guests ?? 0}
              hint={`${overview?.rsvp.yes ?? 0} oui · ${overview?.rsvp.maybe ?? 0} peut-être`}
            />
          </div>

          {/* Rangée 2 — CA + donut */}
          <div className="mb-6 grid gap-4 xl:grid-cols-3">
            <Panel className="xl:col-span-2">
              <PanelTitle
                title="Chiffre d'affaires & volume"
                hint="Trait plein : période courante · pointillés : période précédente"
              />
              <div className="h-72 px-3 py-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={daily} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="caGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={T500} stopOpacity={0.32} />
                        <stop offset="100%" stopColor={T500} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E5E1" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9A9AA0" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#9A9AA0" }} tickLine={false} axisLine={false} width={44} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [`${v} €`, name === "ca" ? "CA" : name === "caPrev" ? "CA période préc." : "Commandes"]} />
                    <Area type="monotone" dataKey="ca" stroke={T500} strokeWidth={2} fill="url(#caGrad)" name="ca" />
                    <Line type="monotone" dataKey="caPrev" stroke={N300} strokeDasharray="5 5" strokeWidth={1.5} dot={false} name="caPrev" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <DataTable
                headers={["Date", "CA (€)", "Commandes", "CA préc. (€)"]}
                rows={daily.map((d) => [d.label, d.ca, d.commandes, d.caPrev])}
              />
            </Panel>

            <Panel>
              <PanelTitle title="Répartition par produit" hint={`${days} derniers jours`} />
              <div className="relative h-56 px-3 py-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={(overview?.conversionByProduct ?? []).map((p) => ({
                        name: PRODUCT_LABEL[p.product],
                        value: p.orders,
                      }))}
                      dataKey="value"
                      innerRadius={62}
                      outerRadius={88}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {(overview?.conversionByProduct ?? []).map((p, i) => (
                        <Cell key={p.product} fill={i === 0 ? T500 : T300} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="font-display tabular text-3xl text-ink">
                    {overview?.orderCount ?? 0}
                  </p>
                  <p className="text-xs text-neutral-500">commandes</p>
                </div>
              </div>
              <ul className="flex flex-col gap-2 px-5 pb-4">
                {(overview?.conversionByProduct ?? []).map((p, i) => (
                  <li key={p.product} className="flex items-center gap-2 text-sm">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: i === 0 ? T500 : T300 }}
                    />
                    <span className="flex-1 text-ink">{PRODUCT_LABEL[p.product]}</span>
                    <span className="tabular text-neutral-500">
                      {Math.round(p.share * 100)} % · {eur(p.revenueCents)}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>

          {/* Rangée 3 — entonnoir + durée par étape */}
          <div className="mb-6 grid gap-4 xl:grid-cols-2">
            <Panel>
              <PanelTitle title="Entonnoir de production" hint="Conversion inter-étapes" />
              <div className="flex flex-col gap-3 px-5 py-4">
                {funnel.map((f, i) => {
                  const max = funnel[0]?.value || 1;
                  const prev = i > 0 ? funnel[i - 1].value : f.value;
                  const conv = prev > 0 ? Math.round((f.value / prev) * 100) : 100;
                  return (
                    <div key={f.label}>
                      <div className="mb-1 flex items-baseline justify-between text-xs">
                        <span className="font-medium text-ink">{f.label}</span>
                        <span className="tabular text-neutral-500">
                          {f.value}
                          {i > 0 ? ` · ${conv} %` : ""}
                        </span>
                      </div>
                      <div className="h-7 overflow-hidden rounded-lg bg-neutral-100">
                        <motion.div
                          initial={{ scaleX: 0 }}
                          whileInView={{ scaleX: Math.max(0.02, f.value / max) }}
                          viewport={{ once: true, amount: 0.25 }}
                          transition={{ delay: i * 0.08, duration: 0.6 }}
                          className="flex h-full origin-left items-center justify-end rounded-lg pr-2"
                          style={{
                            background: `linear-gradient(90deg, ${T500}, ${T300})`,
                            opacity: 1 - i * 0.12,
                          }}
                        >
                          <span className="tabular text-[11px] font-semibold text-white">
                            {f.value}
                          </span>
                        </motion.div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <DataTable
                headers={["Étape", "Projets"]}
                rows={funnel.map((f) => [f.label, f.value])}
              />
            </Panel>

            <Panel>
              <PanelTitle
                title="Ancienneté moyenne par étape"
                hint="Étapes client en terracotta clair (hors de notre contrôle)"
              />
              <div className="h-64 px-3 py-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stageDurations} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E5E1" vertical={false} />
                    <XAxis dataKey="stage" tick={{ fontSize: 11, fill: "#9A9AA0" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#9A9AA0" }} tickLine={false} axisLine={false} width={36} unit=" j" />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} j`, "Ancienneté moy."]} />
                    <Bar dataKey="jours" radius={[6, 6, 0, 0]}>
                      {stageDurations.map((s) => (
                        <Cell key={s.stage} fill={s.client ? T300 : T500} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <DataTable
                headers={["Étape", "Jours moyens", "Projets en cours"]}
                rows={stageDurations.map((s) => [s.stage, s.jours, s.count])}
              />
            </Panel>
          </div>

          {/* Rangée 4 — commandes/jour + RSVP */}
          <div className="mb-6 grid gap-4 xl:grid-cols-2">
            <Panel>
              <PanelTitle
                title="Commandes par jour"
                hint="Tendance de la période sélectionnée"
              />
              <div className="h-56 px-3 py-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={conversionSeries} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E5E1" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9A9AA0" }} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#9A9AA0" }} tickLine={false} axisLine={false} width={28} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v, "Commandes"]} />
                    <Line type="monotone" dataKey="taux" stroke={T500} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <DataTable
                headers={["Date", "Commandes"]}
                rows={conversionSeries.map((d) => [d.label, d.taux])}
              />
            </Panel>

            <Panel>
              <PanelTitle
                title="RSVP par faire-part"
                hint="Réponses des invités par projet livré"
              />
              <div className="h-56 px-3 py-4">
                {rsvpByProject.length === 0 ? (
                  <EmptyState
                    title="Aucune réponse RSVP"
                    description="Les réponses apparaîtront dès les premiers faire-parts livrés."
                  />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rsvpByProject} layout="vertical" margin={{ top: 0, right: 12, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8E5E1" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: "#9A9AA0" }} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: "#232326" }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="oui" stackId="r" fill={OK} radius={[0, 0, 0, 0]} name="Oui" />
                      <Bar dataKey="peutEtre" stackId="r" fill={T300} name="Peut-être" />
                      <Bar dataKey="non" stackId="r" fill={KO} radius={[0, 6, 6, 0]} name="Non" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <DataTable
                headers={["Projet", "Oui", "Peut-être", "Non"]}
                rows={rsvpByProject.map((r) => [r.name, r.oui, r.peutEtre, r.non])}
              />
            </Panel>
          </div>

          {/* Pied — export */}
          <Panel className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <p className="text-xs text-neutral-500">
              Données calculées à J−1 · période de {days} jours comparée aux {days}{" "}
              jours précédents.
            </p>
            <AdminButton variant="outline" onClick={exportCsv}>
              <Download /> Exporter le rapport CSV
            </AdminButton>
          </Panel>
        </>
      )}
    </div>
  );
}

// -------------------------------------------------------------- widgets ----

function Kpi({
  label,
  value,
  format,
  delta,
  hint,
}: {
  label: string;
  value: number;
  format?: (v: number) => string;
  delta?: React.ReactNode;
  hint?: string;
}) {
  return (
    <Panel className="p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-500">
        {label}
      </p>
      <p className="font-display tabular mt-1.5 text-2xl text-ink">
        <CountUp value={value} format={format} />
      </p>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-1"
      >
        {delta ?? (hint ? <span className="text-xs text-neutral-500">{hint}</span> : null)}
      </motion.div>
    </Panel>
  );
}

function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | number)[][];
}) {
  return (
    <details className="border-t border-neutral-200 px-5 py-3">
      <summary className="cursor-pointer text-xs font-medium text-neutral-500 hover:text-ink">
        Données du graphique
      </summary>
      <div className="mt-2 max-h-48 overflow-y-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-left text-neutral-500">
              {headers.map((h) => (
                <th key={h} className="py-1 pr-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="tabular border-t border-neutral-200/60">
                {r.map((c, j) => (
                  <td key={j} className="py-1 pr-3 text-ink">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function statusLabel(s: string) {
  return (
    {
      ONBOARDING: "Onboarding",
      QUESTIONNAIRE: "Questionnaire",
      SCENARIOS: "Scénarios",
      PRODUCTION: "Production",
      REVIEW: "Validation",
      DELIVERED: "Livré",
    } as Record<string, string>
  )[s];
}
