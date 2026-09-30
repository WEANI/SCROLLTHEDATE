import { useState } from "react";
import { Link } from "react-router";
import { ExternalLink } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { cn } from "@/lib/utils";
import { PageHeader, Panel, PanelTitle } from "@/components/admin-suite/ui";

/**
 * Statistiques d'audience — COMPLÈTE la page Analytique (chiffre d'affaires,
 * entonnoir de production, complétion des questionnaires) plutôt que de la
 * dupliquer : ici, uniquement ce qui vient des ouvertures des pages
 * publiques, impossible à mesurer avant la table `inviteViews` (30/09/2026).
 *
 * Rappel de lecture, valable partout sur cette page : les OUVERTURES sont
 * exactes, les VISITEURS sont une estimation (empreinte anonyme qui change
 * chaque jour, cf. api/queries/inviteViews.ts) — quelqu'un qui revient deux
 * jours de suite compte deux fois.
 */

const PERIODS = [
  { days: 7, label: "7 j" },
  { days: 30, label: "30 j" },
  { days: 90, label: "90 j" },
  { days: 365, label: "Année" },
] as const;

/** Palette catégorielle validée (contraste + daltonisme) — cf. échange du 30/09/2026. */
const SERIES = ["#1F6FA8", "#C96F5A", "#B08300", "#2E8B6B", "#7B4FB5"];

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Panel className="p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-ink">{value}</p>
      {hint && <p className="mt-1 text-[12px] text-neutral-500">{hint}</p>}
    </Panel>
  );
}

/** Barre horizontale d'un palmarès — la valeur est toujours écrite à côté, jamais seulement encodée par la longueur. */
function Bar({ label, value, max, color, href }: { label: string; value: number; max: number; color: string; href?: string }) {
  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-4">
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-1.5 truncate text-[13px] text-ink hover:text-terracotta-500">
            <span className="truncate">{label}</span>
            <ExternalLink size={11} className="shrink-0 text-neutral-500" />
          </a>
        ) : (
          <span className="min-w-0 truncate text-[13px] text-ink">{label}</span>
        )}
        <span className="shrink-0 text-[12.5px] font-semibold tabular-nums text-neutral-500">{value}</span>
      </div>
      <span className="block h-2 overflow-hidden rounded-full bg-neutral-100">
        <span className="block h-full rounded-full" style={{ width: `${Math.max(3, (value / max) * 100)}%`, background: color }} />
      </span>
    </li>
  );
}

export default function AdminStatistiques() {
  const [days, setDays] = useState<number>(90);
  const q = trpc.views.adminOverview.useQuery({ days });
  const data = q.data;

  const daily = data?.daily ?? [];
  const totalViews = daily.reduce((s, d) => s + d.views, 0);
  const totalVisitors = daily.reduce((s, d) => s + d.visitors, 0);
  const maxDay = Math.max(1, ...daily.map((d) => d.views));
  const perProject = data?.byProject ?? [];
  const maxProject = Math.max(1, ...perProject.map((p) => p.views));
  const devices = data?.devices ?? [];
  const totalDevice = Math.max(1, devices.reduce((s, d) => s + d.views, 0));
  const referrers = data?.referrers ?? [];
  const maxRef = Math.max(1, ...referrers.map((r) => r.views));
  const viralite = perProject.length > 0 ? totalViews / Math.max(1, perProject.length) : 0;

  return (
    <div className="mx-auto w-full max-w-[1200px] text-ink">
      <PageHeader
        title="Statistiques d'audience"
        description="Ouvertures des faire-part et save the date publiés — complète la page Analytique (chiffre d'affaires, production)."
        actions={
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.days}
                type="button"
                onClick={() => setDays(p.days)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
                  days === p.days ? "bg-terracotta-500 text-white" : "text-neutral-500 hover:bg-neutral-100 hover:text-ink",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      />

      {q.isLoading ? (
        <Panel className="p-8 text-center text-[13px] text-neutral-500">Chargement…</Panel>
      ) : totalViews === 0 ? (
        <Panel className="p-8 text-center">
          <p className="text-[14px] font-medium text-ink">Aucune ouverture enregistrée sur cette période</p>
          <p className="mx-auto mt-2 max-w-xl text-[13px] text-neutral-500">
            Le comptage démarre à la mise en ligne de cette version : les consultations antérieures n'ont pas été
            enregistrées, elles n'apparaîtront donc jamais ici. Les chiffres se rempliront au fil des visites.
          </p>
        </Panel>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Ouvertures" value={totalViews.toLocaleString("fr-FR")} hint="Décompte exact" />
            <Stat label="Visiteurs" value={totalVisitors.toLocaleString("fr-FR")} hint="Estimation — empreinte anonyme quotidienne" />
            <Stat label="Pages consultées" value={String(perProject.length)} hint="Projets ayant reçu au moins une visite" />
            <Stat label="Ouvertures par page" value={viralite.toFixed(1)} hint="Indicateur de partage" />
          </div>

          <Panel>
            <PanelTitle title="Ouvertures par jour" hint={`${days} derniers jours — décompte exact`} />
            <div className="p-6">
              <div className="flex h-44 items-end gap-1">
                {daily.map((d) => (
                  <div key={d.day} className="group relative flex h-full flex-1 items-end" title={`${d.day} — ${d.views} ouvertures, ${d.visitors} visiteurs`}>
                    <span
                      className="w-full rounded-t"
                      style={{ height: `${Math.max(3, (d.views / maxDay) * 100)}%`, background: SERIES[0] }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[11px] tabular-nums text-neutral-500">
                <span>{daily[0]?.day}</span>
                <span>Record : {maxDay}</span>
                <span>{daily.at(-1)?.day}</span>
              </div>
            </div>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel>
              <PanelTitle title="Pages les plus ouvertes" hint="Top 10 sur la période" />
              <ul className="flex flex-col gap-3 p-6">
                {perProject.map((p, i) => (
                  <Bar
                    key={p.projectId}
                    label={`${p.slug} · ${p.product === "SAVE_THE_DATE" ? "Save the Date" : "Faire-part"}`}
                    value={p.views}
                    max={maxProject}
                    color={SERIES[i % SERIES.length]}
                    href={`/faire-part/${p.slug}`}
                  />
                ))}
              </ul>
            </Panel>

            <div className="flex flex-col gap-4">
              <Panel>
                <PanelTitle title="D'où viennent les visites" hint="Domaine référent, jamais l'URL complète" />
                <ul className="flex flex-col gap-3 p-6">
                  {referrers.length === 0 ? (
                    <li className="text-[13px] text-neutral-500">
                      Aucun référent connu — un lien ouvert depuis WhatsApp ou un SMS n'en transmet pas.
                    </li>
                  ) : (
                    referrers.map((r, i) => (
                      <Bar key={r.host ?? i} label={r.host ?? "—"} value={r.views} max={maxRef} color={SERIES[1]} />
                    ))
                  )}
                </ul>
              </Panel>

              <Panel>
                <PanelTitle title="Appareils" hint="Déduit du navigateur" />
                <ul className="flex flex-col gap-3 p-6">
                  {devices.map((d, i) => (
                    <Bar
                      key={d.device ?? i}
                      label={d.device === "mobile" ? "Téléphone" : d.device === "tablet" ? "Tablette" : "Ordinateur"}
                      value={d.views}
                      max={totalDevice}
                      color={SERIES[2]}
                    />
                  ))}
                </ul>
              </Panel>
            </div>
          </div>

          <Panel className="p-5">
            <p className="text-[12.5px] text-neutral-500">
              <b className="font-semibold text-ink">Comment lire ces chiffres.</b> Les ouvertures sont exactes (une par
              visiteur et par heure, un rechargement ne compte pas double). Les visiteurs sont une estimation : aucun
              cookie n'est posé, l'empreinte anonyme change chaque jour, donc quelqu'un qui revient deux jours de suite
              compte deux fois. Pour le détail par couple, voir{" "}
              <Link to="/admin/projets" className="font-medium text-terracotta-500 hover:text-terracotta-400">
                la fiche de chaque projet
              </Link>
              .
            </p>
          </Panel>
        </div>
      )}
    </div>
  );
}
