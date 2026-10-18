import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { cn } from "@/lib/utils";
import { PageHeader, Panel, PanelTitle } from "@/components/admin-suite/ui";

/**
 * Fréquentation du site vitrine — mesure MAISON (table siteEvents, cf.
 * src/lib/analytics.ts), sans Plausible ni service tiers. Complète
 * Statistiques (ouvertures des faire-part publiés) et Analytique (ventes).
 *
 * Rappel de lecture : une « visite » = un visiteur anonyme sur une
 * journée (l'empreinte change chaque jour, aucun cookie). Les visites d'un
 * administrateur connecté ne sont pas comptées.
 */

const PERIODS = [
  { days: 1, label: "Aujourd'hui" },
  { days: 7, label: "7 j" },
  { days: 30, label: "30 j" },
  { days: 90, label: "90 j" },
  { days: 365, label: "Année" },
] as const;

/** Palette catégorielle validée (contraste + daltonisme) — la même que Statistiques. */
const SERIES = ["#1F6FA8", "#C96F5A", "#B08300", "#2E8B6B", "#7B4FB5"];

const PAGE_NAMES: Record<string, string> = {
  "/": "Accueil",
  "/offres": "Offres",
  "/faire-part-digital": "Faire-part digital",
  "/save-the-date-digital": "Save the Date digital",
  "/save-the-date-modeles": "Modèles Save the Date",
  "/commander": "Commander (tunnel)",
  "/merci": "Merci (après paiement)",
  "/demo": "Démo",
  "/demo/infos": "Démo — infos",
  "/demofairepart": "Démo faire-part",
  "/mentions-legales": "Mentions légales",
  "/cgv": "CGV",
  "/confidentialite": "Confidentialité",
};

function pageName(path: string): string {
  if (PAGE_NAMES[path]) return PAGE_NAMES[path];
  const tpl = path.match(/^\/save-the-date-modeles\/(.+)$/);
  if (tpl) return `Modèle « ${tpl[1].replace(/-/g, " ")} »`;
  return path;
}

const STEP_NAMES: Record<string, string> = {
  add_to_cart: "Ajout au panier",
  checkout_start: "Paiement commencé",
  payment_success: "Paiement réussi",
};

const DEVICE_NAMES: Record<string, string> = { mobile: "Téléphone", tablet: "Tablette", desktop: "Ordinateur" };

const fmtInt = (n: number) => n.toLocaleString("fr-FR");
const fmtPct = (n: number) => `${Math.round(n * 100)} %`;
function fmtDuration(s: number | null): string {
  if (s == null) return "—";
  if (s < 60) return `${s} s`;
  return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")}`;
}
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
/** « Europe/Paris » → « Paris » ; une indication de pays, pas une géolocalisation. */
const tzName = (tz: string) => (tz === "—" ? "Inconnu" : (tz.split("/").pop() ?? tz).replace(/_/g, " "));

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Panel className="p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-ink">{value}</p>
      {hint && <p className="mt-1 text-[12px] text-neutral-500">{hint}</p>}
    </Panel>
  );
}

function Ranking({ rows, color, empty }: { rows: { label: ReactNode; value: number; sub?: string; key: string }[]; color: string; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <p className="p-6 text-[13px] text-neutral-500">{empty}</p>;
  return (
    <ul className="flex flex-col gap-3 p-6">
      {rows.map((r) => (
        <li key={r.key} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-4">
            <span className="min-w-0 truncate text-[13px] text-ink">
              {r.label}
              {r.sub && <span className="ml-2 text-[11.5px] text-neutral-500">{r.sub}</span>}
            </span>
            <span className="shrink-0 text-[12.5px] font-semibold tabular-nums text-neutral-500">{fmtInt(r.value)}</span>
          </div>
          <span className="block h-2 overflow-hidden rounded-full bg-neutral-100">
            <span className="block h-full rounded-full" style={{ width: `${Math.max(3, (r.value / max) * 100)}%`, background: color }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function AdminFrequentation() {
  const [days, setDays] = useState<number>(30);
  const q = trpc.views.adminSiteStats.useQuery({ days });
  const data = q.data;

  const daily = data?.daily ?? [];
  const maxDay = Math.max(1, ...daily.map((d) => d.visits));
  const hours = Array.from({ length: 24 }, (_, h) => data?.hours.find((x) => x.hour === h)?.pageviews ?? 0);
  const maxHour = Math.max(1, ...hours);
  const f = data?.funnel;
  const funnelSteps = f
    ? [
        { label: "Visite du site", value: f.visited },
        { label: "A vu une offre ou un modèle", value: f.offer },
        { label: "A ajouté au panier", value: f.cart },
        { label: "Page Commander", value: f.checkoutPage },
        { label: "A commencé le paiement", value: f.checkoutStart },
        { label: "A payé", value: f.paid },
      ]
    : [];

  return (
    <div className="mx-auto w-full max-w-[1200px] text-ink">
      <PageHeader
        title="Fréquentation du site"
        description="Visites, pages, clics et tunnel de vente du site — mesure maison, sans cookie. Les faire-part publiés sont dans Statistiques."
        actions={
          <div className="flex flex-wrap gap-1">
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
      ) : q.error ? (
        <Panel className="p-8 text-center text-[13px] text-neutral-500">Impossible de charger les chiffres : {q.error.message}</Panel>
      ) : !data || data.visits === 0 ? (
        <Panel className="p-8 text-center">
          <p className="text-[14px] font-medium text-ink">Aucune visite enregistrée sur cette période</p>
          <p className="mx-auto mt-2 max-w-xl text-[13px] text-neutral-500">
            Le comptage a démarré à la mise en ligne de cette page (18 octobre 2026) : les visites antérieures n'ont pas
            été enregistrées. Vos propres visites ne comptent pas — ce navigateur est reconnu comme celui d'un
            administrateur.
          </p>
        </Panel>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="Visites" value={fmtInt(data.visits)} hint="Un visiteur sur une journée" />
            <Stat label="Pages vues" value={fmtInt(data.pageviews)} />
            <Stat label="Pages par visite" value={data.pagesPerVisit.toFixed(1)} />
            <Stat label="Durée moyenne" value={fmtDuration(data.avgVisitSeconds)} hint="Temps passé page visible" />
            <Stat label="Rebond" value={fmtPct(data.bounceRate)} hint="Visites d'une seule page" />
          </div>

          {daily.length > 1 && (
            <Panel>
              <PanelTitle title="Visites par jour" hint="Survolez une barre pour le détail" />
              <div className="p-6">
                <div className="flex h-44 items-end gap-1">
                  {daily.map((d) => (
                    <div key={d.day} className="flex h-full flex-1 items-end" title={`${d.day} — ${d.visits} visites, ${d.pageviews} pages vues`}>
                      <span className="w-full rounded-t" style={{ height: `${Math.max(3, (d.visits / maxDay) * 100)}%`, background: SERIES[0] }} />
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-[11px] tabular-nums text-neutral-500">
                  <span>{daily[0]?.day}</span>
                  <span>Record : {maxDay} visites</span>
                  <span>{daily.at(-1)?.day}</span>
                </div>
              </div>
            </Panel>
          )}

          <Panel>
            <PanelTitle title="Tunnel de vente" hint="Visites ayant franchi chaque étape — le % compare à l'étape précédente" />
            <ol className="grid gap-3 p-6 sm:grid-cols-3 lg:grid-cols-6">
              {funnelSteps.map((s, i) => {
                const prev = i === 0 ? null : funnelSteps[i - 1].value;
                return (
                  <li key={s.label} className="flex flex-col gap-1 rounded-xl border border-neutral-200 p-4">
                    <span className="text-[11.5px] text-neutral-500">{s.label}</span>
                    <span className="text-2xl font-semibold tabular-nums">{fmtInt(s.value)}</span>
                    <span className="text-[11.5px] tabular-nums text-neutral-500">
                      {prev == null ? "Point de départ" : prev > 0 ? `${Math.round((s.value / prev) * 100)} % de l'étape d'avant` : "—"}
                    </span>
                  </li>
                );
              })}
            </ol>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel>
              <PanelTitle title="D'où viennent les visiteurs" hint="Réseau social, moteur de recherche, lien marqué… ou accès direct" />
              <Ranking
                color={SERIES[1]}
                empty="Aucune provenance connue."
                rows={data.sources.map((s) => ({ key: s.label, label: s.label, value: s.visits, sub: s.hosts.filter((h) => h !== s.label.toLowerCase()).join(", ") }))}
              />
              <p className="px-6 pb-5 text-[11.5px] text-neutral-500">
                « Accès direct » regroupe les adresses tapées à la main, les favoris et les liens ouverts depuis WhatsApp, un
                SMS ou certaines applications, qui ne transmettent pas leur provenance. Pour les distinguer, utilisez des
                liens marqués (voir Campagnes).
              </p>
            </Panel>
            <Panel>
              <PanelTitle title="Campagnes" hint="Liens marqués ?utm_source=…&utm_campaign=…" />
              <Ranking
                color={SERIES[1]}
                empty="Aucun lien marqué n'a encore été utilisé. Exemple pour la bio Instagram : scrollthedate.com/?utm_source=instagram&utm_medium=bio&utm_campaign=lancement"
                rows={data.campaigns.map((c) => ({ key: c.label, label: c.label, value: c.visits }))}
              />
            </Panel>
          </div>

          <Panel>
            <PanelTitle title="Pages les plus vues" hint="Temps moyen passé et part de la page lue (défilement)" />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-[13px]">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-[0.1em] text-neutral-500">
                    <th className="px-6 py-3 font-semibold">Page</th>
                    <th className="px-3 py-3 text-right font-semibold">Vues</th>
                    <th className="px-3 py-3 text-right font-semibold">Visites</th>
                    <th className="px-3 py-3 text-right font-semibold">Temps moyen</th>
                    <th className="px-6 py-3 text-right font-semibold">Lue à</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {data.pages.map((p) => (
                    <tr key={p.path} className="border-b border-neutral-100 last:border-0">
                      <td className="px-6 py-2.5">
                        <a href={p.path} target="_blank" rel="noreferrer" className="hover:text-terracotta-500">
                          {pageName(p.path)}
                        </a>
                        {pageName(p.path) !== p.path && <span className="ml-2 text-[11.5px] text-neutral-500">{p.path}</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right">{fmtInt(p.pageviews)}</td>
                      <td className="px-3 py-2.5 text-right">{fmtInt(p.visits)}</td>
                      <td className="px-3 py-2.5 text-right">{fmtDuration(p.avgSeconds)}</td>
                      <td className="px-6 py-2.5 text-right">{p.avgDepth == null ? "—" : `${p.avgDepth} %`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel>
            <PanelTitle title="Liens et boutons cliqués" hint="Les plus cliqués sur la période" />
            {data.clicks.length === 0 ? (
              <p className="p-6 text-[13px] text-neutral-500">Aucun clic enregistré.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-[13px]">
                  <thead>
                    <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-[0.1em] text-neutral-500">
                      <th className="px-6 py-3 font-semibold">Type</th>
                      <th className="px-3 py-3 font-semibold">Lien ou bouton</th>
                      <th className="px-3 py-3 font-semibold">Dernière page</th>
                      <th className="px-3 py-3 text-right font-semibold">Clics</th>
                      <th className="px-6 py-3 text-right font-semibold">Visites</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {data.clicks.map((c) => (
                      <tr key={c.name + c.target} className="border-b border-neutral-100 last:border-0">
                        <td className="px-6 py-2.5 text-neutral-500">
                          {c.name === "outbound" ? "Lien externe" : c.name === "link" ? "Lien" : "Bouton"}
                        </td>
                        <td className="max-w-[360px] truncate px-3 py-2.5" title={c.target}>
                          {c.name === "link" ? pageName(c.target) : c.target}
                        </td>
                        <td className="px-3 py-2.5 text-neutral-500">{pageName(c.lastPath)}</td>
                        <td className="px-3 py-2.5 text-right">{fmtInt(c.clicks)}</td>
                        <td className="px-6 py-2.5 text-right">{fmtInt(c.visits)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel>
              <PanelTitle title="Pages d'arrivée" hint="La 1re page vue de chaque visite" />
              <Ranking color={SERIES[3]} empty="—" rows={data.entries.map((p) => ({ key: p.path, label: pageName(p.path), value: p.visits }))} />
            </Panel>
            <Panel>
              <PanelTitle title="Pages de sortie" hint="La dernière page vue avant de partir" />
              <Ranking color={SERIES[4]} empty="—" rows={data.exits.map((p) => ({ key: p.path, label: pageName(p.path), value: p.visits }))} />
            </Panel>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Panel>
              <PanelTitle title="Appareils" />
              <Ranking color={SERIES[2]} empty="—" rows={data.devices.map((d) => ({ key: d.label, label: DEVICE_NAMES[d.label] ?? d.label, value: d.visits }))} />
            </Panel>
            <Panel>
              <PanelTitle title="Navigateurs" hint="Instagram, Facebook, TikTok = ouvert depuis l'appli" />
              <Ranking color={SERIES[2]} empty="—" rows={data.browsers.map((d) => ({ key: d.label, label: d.label, value: d.visits }))} />
            </Panel>
            <Panel>
              <PanelTitle title="Systèmes" />
              <Ranking color={SERIES[2]} empty="—" rows={data.oses.map((d) => ({ key: d.label, label: d.label, value: d.visits }))} />
            </Panel>
            <Panel>
              <PanelTitle title="Langues" hint="Langue du navigateur" />
              <Ranking color={SERIES[0]} empty="—" rows={data.langs.map((d) => ({ key: d.label, label: d.label, value: d.visits }))} />
            </Panel>
            <Panel>
              <PanelTitle title="Fuseaux horaires" hint="Indique le pays, sans géolocalisation" />
              <Ranking color={SERIES[0]} empty="—" rows={data.timezones.map((d) => ({ key: d.label, label: tzName(d.label), value: d.visits, sub: d.label === "—" ? undefined : d.label }))} />
            </Panel>
            <Panel>
              <PanelTitle title="Heures de visite" hint="Pages vues par heure, heure de Paris" />
              <div className="p-6">
                <div className="flex h-28 items-end gap-[3px]">
                  {hours.map((v, h) => (
                    <div key={h} className="flex h-full flex-1 items-end" title={`${h} h — ${v} pages vues`}>
                      <span className="w-full rounded-t" style={{ height: `${Math.max(3, (v / maxHour) * 100)}%`, background: SERIES[3] }} />
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-[11px] tabular-nums text-neutral-500">
                  <span>0 h</span>
                  <span>12 h</span>
                  <span>23 h</span>
                </div>
              </div>
            </Panel>
          </div>

          <Panel>
            <PanelTitle title="Dernières visites" hint="Le parcours des 25 dernières visites, page par page et clic par clic — anonyme" />
            <ul className="divide-y divide-neutral-100">
              {data.recentVisits.map((v) => (
                <li key={v.id} className="px-6 py-4">
                  <p className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[12px] text-neutral-500">
                    <span className="font-semibold text-ink">{fmtTime(v.startedAt)}</span>
                    <span>{v.source}</span>
                    <span>{DEVICE_NAMES[v.device] ?? v.device}</span>
                    <span>{v.browser}</span>
                    {v.tz && <span>{tzName(v.tz)}</span>}
                  </p>
                  <ol className="flex flex-wrap items-center gap-1.5 text-[12px]">
                    {v.steps
                      .filter((s) => s.kind !== "engagement")
                      .map((s, i) => (
                        <li
                          key={i}
                          title={new Date(s.at).toLocaleTimeString("fr-FR")}
                          className={cn(
                            "rounded-full px-2.5 py-1",
                            s.kind === "pageview" && "bg-neutral-100 text-ink",
                            s.kind === "click" && "border border-neutral-200 text-neutral-600",
                            s.kind === "event" && "bg-terracotta-500/10 font-semibold text-terracotta-600",
                          )}
                        >
                          {s.kind === "pageview"
                            ? pageName(s.path)
                            : s.kind === "click"
                              ? `↳ ${s.name === "link" && s.target ? pageName(s.target) : s.target}`
                              : `${STEP_NAMES[s.name ?? ""] ?? s.name}${s.target ? ` · ${s.target}` : ""}`}
                        </li>
                      ))}
                  </ol>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel className="p-5">
            <p className="text-[12.5px] text-neutral-500">
              <b className="font-semibold text-ink">Comment lire ces chiffres.</b> Aucun cookie n'est posé et aucune
              donnée personnelle n'est conservée : une empreinte anonyme, qui change chaque jour, distingue les visiteurs
              d'une même journée. Quelqu'un qui revient trois jours de suite compte donc pour trois visites. Les robots
              (Google, aperçus de liens) et vos propres visites d'administratrice sont exclus. Les ouvertures des
              faire-part publiés sont dans{" "}
              <Link to="/admin/statistiques" className="font-medium text-terracotta-500 hover:text-terracotta-400">
                Statistiques
              </Link>
              , les ventes dans{" "}
              <Link to="/admin/analytique" className="font-medium text-terracotta-500 hover:text-terracotta-400">
                Analytique
              </Link>
              .
            </p>
          </Panel>
        </div>
      )}
    </div>
  );
}
