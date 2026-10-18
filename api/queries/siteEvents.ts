import { sql } from "drizzle-orm";
import { getDb } from "./connection";
import { siteEvents, type InsertSiteEvent } from "@db/schema";

/**
 * Fréquentation du site vitrine — cf. doc de la table `siteEvents`
 * (db/schema.ts). `visitorHash` change chaque jour (sel quotidien) : il
 * identifie donc une VISITE (un visiteur sur une journée), jamais une
 * personne dans la durée. « Visites » et « visiteurs » se confondent ici, et
 * quelqu'un qui revient trois jours de suite compte pour trois visites.
 */

export async function recordSiteEvent(row: InsertSiteEvent) {
  await getDb().insert(siteEvents).values(row);
}

/** Navigateur, déduit du user-agent — y compris les navigateurs intégrés d'Instagram, Facebook et TikTok. */
export function browserOf(ua: string): string {
  if (/Instagram/i.test(ua)) return "Instagram";
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return "Facebook";
  if (/musical_ly|TikTok|BytedanceWebview/i.test(ua)) return "TikTok";
  if (/Pinterest/i.test(ua)) return "Pinterest";
  if (/SamsungBrowser/i.test(ua)) return "Samsung";
  if (/Edg\//i.test(ua)) return "Edge";
  if (/OPR\/|Opera/i.test(ua)) return "Opera";
  if (/Firefox|FxiOS/i.test(ua)) return "Firefox";
  if (/Chrome|CriOS/i.test(ua)) return "Chrome";
  if (/Safari/i.test(ua)) return "Safari";
  return "Autre";
}

export function osOf(ua: string): string {
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Android/i.test(ua)) return "Android";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Mac OS X|Macintosh/i.test(ua)) return "macOS";
  if (/CrOS/i.test(ua)) return "ChromeOS";
  if (/Linux/i.test(ua)) return "Linux";
  return "Autre";
}

/** Robots d'indexation et d'aperçu de lien : jamais comptés comme des visiteurs. */
export function isBot(ua: string): boolean {
  return !ua || /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|python|curl|wget|httpclient|monitor/i.test(ua);
}

/** Nom lisible d'une provenance : marqueur de campagne d'abord, sinon le site d'où vient le visiteur. */
export function sourceLabel(utmSource: string | null, host: string | null): string {
  const raw = (utmSource || host || "").toLowerCase();
  if (!raw) return "Accès direct";
  const known: [RegExp, string][] = [
    [/instagram|^ig$/, "Instagram"],
    [/facebook|^fb|fb\.me/, "Facebook"],
    [/tiktok/, "TikTok"],
    [/pinterest|pin\.it/, "Pinterest"],
    [/whatsapp|wa\.me/, "WhatsApp"],
    [/youtube|youtu\.be/, "YouTube"],
    [/google/, "Google"],
    [/bing/, "Bing"],
    [/linkedin|lnkd/, "LinkedIn"],
    [/snapchat/, "Snapchat"],
    [/^t\.co$|twitter|^x\.com$/, "X (Twitter)"],
    [/mail|gmail|outlook|newsletter/, "E-mail"],
  ];
  for (const [re, label] of known) if (re.test(raw)) return label;
  return utmSource || host || "Accès direct";
}

type Row = Record<string, unknown>;
const num = (v: unknown) => Number(v ?? 0);

/** Pages qui montrent l'offre : la 2e marche du tunnel de vente. */
const OFFER_PAGES = sql`(path in ('/offres', '/faire-part-digital', '/save-the-date-digital', '/save-the-date-modeles', '/demo', '/demofairepart') or path like '/save-the-date-modeles/%')`;

/** `db` : remplaçable par une transaction (tests). */
export async function findSiteStats(days: number, db: Pick<ReturnType<typeof getDb>, "execute"> = getDb()) {
  const since = new Date(Date.now() - days * 86400000);
  const q = async (query: ReturnType<typeof sql>) => (await db.execute(query)) as unknown as Row[];
  const inPeriod = sql`"createdAt" >= ${since}`;

  const [totals] = await q(sql`
    with v as (
      select "visitorHash",
             count(*) filter (where kind = 'pageview') as pv,
             coalesce(sum(seconds) filter (where kind = 'engagement'), 0) as secs
      from site_events where ${inPeriod}
      group by 1
    )
    select count(*) filter (where pv > 0) as visits,
           coalesce(sum(pv), 0) as pageviews,
           count(*) filter (where pv = 1) as bounces,
           coalesce(avg(secs) filter (where pv > 0), 0) as avg_secs
    from v`);

  const daily = await q(sql`
    select to_char(("createdAt" at time zone 'Europe/Paris')::date, 'YYYY-MM-DD') as day,
           count(*) as pageviews,
           count(distinct "visitorHash") as visits
    from site_events where ${inPeriod} and kind = 'pageview'
    group by 1 order by 1`);

  const pages = await q(sql`
    select path,
           count(*) filter (where kind = 'pageview') as pageviews,
           count(distinct "visitorHash") filter (where kind = 'pageview') as visits,
           round(sum(seconds) filter (where kind = 'engagement')::numeric
                 / nullif(count(distinct "visitorHash") filter (where kind = 'pageview'), 0)) as avg_secs,
           round(avg(depth) filter (where kind = 'engagement')) as avg_depth
    from site_events where ${inPeriod}
    group by path
    having count(*) filter (where kind = 'pageview') > 0
    order by 2 desc limit 25`);

  const firstLast = (dir: "asc" | "desc") => sql`
    select path, count(*) as visits from (
      select distinct on ("visitorHash") "visitorHash", path
      from site_events where ${inPeriod} and kind = 'pageview'
      order by "visitorHash", "createdAt" ${sql.raw(dir)}
    ) t group by path order by 2 desc limit 10`;
  const entries = await q(firstLast("asc"));
  const exits = await q(firstLast("desc"));

  // Provenance d'une visite = sa 1re page affichée.
  const rawSources = await q(sql`
    select "utmSource" as utm, "referrerHost" as host, "utmMedium" as medium, "utmCampaign" as campaign, count(*) as visits from (
      select distinct on ("visitorHash") "visitorHash", "utmSource", "referrerHost", "utmMedium", "utmCampaign"
      from site_events where ${inPeriod} and kind = 'pageview'
      order by "visitorHash", "createdAt" asc
    ) t group by 1, 2, 3, 4`);
  const sourceMap = new Map<string, { visits: number; hosts: Set<string> }>();
  const campaignMap = new Map<string, number>();
  for (const r of rawSources) {
    const label = sourceLabel(r.utm as string | null, r.host as string | null);
    const entry = sourceMap.get(label) ?? { visits: 0, hosts: new Set<string>() };
    entry.visits += num(r.visits);
    if (r.host) entry.hosts.add(String(r.host));
    sourceMap.set(label, entry);
    if (r.campaign) {
      const key = [r.utm, r.medium, r.campaign].filter(Boolean).join(" · ");
      campaignMap.set(key, (campaignMap.get(key) ?? 0) + num(r.visits));
    }
  }
  const sources = [...sourceMap.entries()]
    .map(([label, v]) => ({ label, visits: v.visits, hosts: [...v.hosts].slice(0, 4) }))
    .sort((a, b) => b.visits - a.visits);
  const campaigns = [...campaignMap.entries()].map(([label, visits]) => ({ label, visits })).sort((a, b) => b.visits - a.visits);

  const clicks = await q(sql`
    select name, target, count(*) as clicks, count(distinct "visitorHash") as visits,
           (array_agg(path order by "createdAt" desc))[1] as last_path
    from site_events where ${inPeriod} and kind = 'click' and target is not null
    group by name, target order by 3 desc limit 40`);

  const step = (cond: ReturnType<typeof sql>) => sql`count(distinct "visitorHash") filter (where ${cond})`;
  const [funnel] = await q(sql`
    select ${step(sql`kind = 'pageview'`)} as visited,
           ${step(sql`kind = 'pageview' and ${OFFER_PAGES}`)} as offer,
           ${step(sql`kind = 'event' and name = 'add_to_cart'`)} as cart,
           ${step(sql`kind = 'pageview' and path = '/commander'`)} as checkout_page,
           ${step(sql`kind = 'event' and name = 'checkout_start'`)} as checkout_start,
           ${step(sql`kind = 'event' and name = 'payment_success'`)} as paid
    from site_events where ${inPeriod}`);

  const breakdown = (col: string) =>
    q(sql`
      select coalesce(${sql.identifier(col)}, '—') as label, count(distinct "visitorHash") as visits
      from site_events where ${inPeriod} and kind = 'pageview'
      group by 1 order by 2 desc limit 12`);
  const [devices, browsers, oses, langs, tzs] = await Promise.all([
    breakdown("device"),
    breakdown("browser"),
    breakdown("os"),
    breakdown("lang"),
    breakdown("tz"),
  ]);

  const hours = await q(sql`
    select extract(hour from "createdAt" at time zone 'Europe/Paris')::int as hour, count(*) as pageviews
    from site_events where ${inPeriod} and kind = 'pageview'
    group by 1 order by 1`);

  // Les 25 dernières visites, page par page et clic par clic — anonymes.
  const recentRows = await q(sql`
    with last_visits as (
      select "visitorHash", max("createdAt") as last_at, min("createdAt") as first_at
      from site_events where ${inPeriod}
      group by 1 order by 2 desc limit 25
    )
    select e."visitorHash" as visit, lv.last_at, e.kind, e.name, e.path, e.target, e.seconds,
           e."createdAt" as at, e."referrerHost" as host, e."utmSource" as utm, e.device, e.browser, e.tz
    from site_events e join last_visits lv on lv."visitorHash" = e."visitorHash"
    where e."createdAt" >= ${since}
    order by lv.last_at desc, e."createdAt" asc`);
  const recentMap = new Map<string, { id: string; source: string; device: string; browser: string; tz: string; startedAt: string; steps: { at: string; kind: string; name: string | null; path: string; target: string | null; seconds: number | null }[] }>();
  for (const r of recentRows) {
    const key = String(r.visit);
    let v = recentMap.get(key);
    if (!v) {
      v = {
        id: key.slice(0, 8),
        source: sourceLabel(r.utm as string | null, r.host as string | null),
        device: String(r.device ?? ""),
        browser: String(r.browser ?? ""),
        tz: String(r.tz ?? ""),
        startedAt: new Date(r.at as string).toISOString(),
        steps: [],
      };
      recentMap.set(key, v);
    }
    if (v.source === "Accès direct" && (r.utm || r.host)) v.source = sourceLabel(r.utm as string | null, r.host as string | null);
    v.steps.push({
      at: new Date(r.at as string).toISOString(),
      kind: String(r.kind),
      name: (r.name as string | null) ?? null,
      path: String(r.path),
      target: (r.target as string | null) ?? null,
      seconds: r.seconds == null ? null : num(r.seconds),
    });
  }

  const visits = num(totals?.visits);
  const pick = (rows: Row[], ...cols: string[]) =>
    rows.map((r) => Object.fromEntries(cols.map((c) => [c, typeof r[c] === "string" || r[c] == null ? r[c] : num(r[c])])));

  return {
    days,
    visits,
    pageviews: num(totals?.pageviews),
    pagesPerVisit: visits ? num(totals?.pageviews) / visits : 0,
    bounceRate: visits ? num(totals?.bounces) / visits : 0,
    avgVisitSeconds: Math.round(num(totals?.avg_secs)),
    daily: daily.map((d) => ({ day: String(d.day), pageviews: num(d.pageviews), visits: num(d.visits) })),
    pages: pages.map((p) => ({
      path: String(p.path),
      pageviews: num(p.pageviews),
      visits: num(p.visits),
      avgSeconds: p.avg_secs == null ? null : num(p.avg_secs),
      avgDepth: p.avg_depth == null ? null : num(p.avg_depth),
    })),
    entries: entries.map((p) => ({ path: String(p.path), visits: num(p.visits) })),
    exits: exits.map((p) => ({ path: String(p.path), visits: num(p.visits) })),
    sources,
    campaigns,
    clicks: clicks.map((c) => ({
      name: String(c.name ?? ""),
      target: String(c.target),
      clicks: num(c.clicks),
      visits: num(c.visits),
      lastPath: String(c.last_path ?? ""),
    })),
    funnel: {
      visited: num(funnel?.visited),
      offer: num(funnel?.offer),
      cart: num(funnel?.cart),
      checkoutPage: num(funnel?.checkout_page),
      checkoutStart: num(funnel?.checkout_start),
      paid: num(funnel?.paid),
    },
    devices: pick(devices, "label", "visits") as { label: string; visits: number }[],
    browsers: pick(browsers, "label", "visits") as { label: string; visits: number }[],
    oses: pick(oses, "label", "visits") as { label: string; visits: number }[],
    langs: pick(langs, "label", "visits") as { label: string; visits: number }[],
    timezones: pick(tzs, "label", "visits") as { label: string; visits: number }[],
    hours: hours.map((h) => ({ hour: num(h.hour), pageviews: num(h.pageviews) })),
    recentVisits: [...recentMap.values()],
  };
}

export type SiteStats = Awaited<ReturnType<typeof findSiteStats>>;
