import { and, desc, eq, gte, sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import { getDb } from "./connection";
import { inviteViews, projects } from "@db/schema";

/**
 * Ouvertures des pages publiques (faire-part / save the date) — cf. doc de
 * la table `inviteViews` (db/schema.ts) pour le parti pris de
 * confidentialité : aucun cookie, aucune donnée personnelle stockée, sel
 * qui tourne chaque jour.
 *
 * Conséquence directe sur la lecture : un « visiteur unique » n'a de sens
 * QUE dans une journée. Sur une période plus longue, on somme les visiteurs
 * uniques quotidiens — c'est une ESTIMATION (quelqu'un qui revient deux
 * jours de suite compte deux fois), à présenter comme telle. Les
 * « ouvertures », elles, sont exactes.
 */

/** Sel du jour — dérivé d'un secret serveur, jamais exposé au client. */
function dailySalt(now = new Date()): string {
  const day = now.toISOString().slice(0, 10);
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.STRIPE_SECRET_KEY ?? "scrollthedate";
  return `${day}:${secret}`;
}

/** Empreinte anonyme d'un visiteur pour aujourd'hui. */
export function visitorFingerprint(ip: string, userAgent: string, now = new Date()): string {
  return createHash("sha256").update(`${dailySalt(now)}|${ip}|${userAgent}`).digest("hex");
}

/** Créneau horaire UTC servant de clé de dédoublonnage ("2026-09-30T14"). */
export function hourBucketOf(now = new Date()): string {
  return now.toISOString().slice(0, 13);
}

/** Téléphone / tablette / ordinateur, déduit du user-agent — jamais stocké plus finement. */
export function deviceOf(userAgent: string): "mobile" | "tablet" | "desktop" {
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet/.test(ua)) return "tablet";
  if (/mobi|android|iphone/.test(ua)) return "mobile";
  return "desktop";
}

/** Domaine du référent uniquement (jamais l'URL complète), vide si inconnu ou interne. */
export function referrerHostOf(referrer: string | null, selfHost: string | null): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    if (!host || (selfHost && host === selfHost.replace(/^www\./, ""))) return null;
    return host.slice(0, 120);
  } catch {
    return null;
  }
}

/**
 * Enregistre une ouverture — idempotent dans l'heure grâce à l'index unique
 * (projectId, visitorHash, hourBucket) : recharger la page en boucle ne
 * gonfle pas les compteurs.
 */
export async function recordInviteView(input: {
  projectId: number;
  visitorHash: string;
  hourBucket: string;
  referrerHost: string | null;
  device: string;
}) {
  await getDb().insert(inviteViews).values(input).onConflictDoNothing();
}

/** Totaux d'un projet : ouvertures exactes + visiteurs estimés (cf. doc en tête). */
export async function findProjectViewStats(projectId: number, days = 90) {
  const since = new Date(Date.now() - days * 86400000);
  const db = getDb();

  const [totals] = await db
    .select({
      views: sql<number>`count(*)::int`,
      firstAt: sql<Date | null>`min(${inviteViews.viewedAt})`,
      lastAt: sql<Date | null>`max(${inviteViews.viewedAt})`,
    })
    .from(inviteViews)
    .where(eq(inviteViews.projectId, projectId));

  // Visiteurs uniques par jour, puis somme — cf. doc : estimation, jamais un
  // décompte exact de personnes sur toute la période.
  const daily = await db
    .select({
      day: sql<string>`to_char(${inviteViews.viewedAt}, 'YYYY-MM-DD')`,
      views: sql<number>`count(*)::int`,
      visitors: sql<number>`count(distinct ${inviteViews.visitorHash})::int`,
    })
    .from(inviteViews)
    .where(and(eq(inviteViews.projectId, projectId), gte(inviteViews.viewedAt, since)))
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  const devices = await db
    .select({ device: inviteViews.device, views: sql<number>`count(*)::int` })
    .from(inviteViews)
    .where(eq(inviteViews.projectId, projectId))
    .groupBy(inviteViews.device);

  const referrers = await db
    .select({ host: inviteViews.referrerHost, views: sql<number>`count(*)::int` })
    .from(inviteViews)
    .where(and(eq(inviteViews.projectId, projectId), sql`${inviteViews.referrerHost} is not null`))
    .groupBy(inviteViews.referrerHost)
    .orderBy(desc(sql`count(*)`))
    .limit(6);

  return {
    views: totals?.views ?? 0,
    visitors: daily.reduce((sum, d) => sum + d.visitors, 0),
    firstAt: totals?.firstAt ?? null,
    lastAt: totals?.lastAt ?? null,
    daily,
    devices,
    referrers,
  };
}

/** Vue d'ensemble admin : ouvertures tous projets confondus + palmarès. */
export async function findGlobalViewStats(days = 90) {
  const since = new Date(Date.now() - days * 86400000);
  const db = getDb();

  const daily = await db
    .select({
      day: sql<string>`to_char(${inviteViews.viewedAt}, 'YYYY-MM-DD')`,
      views: sql<number>`count(*)::int`,
      visitors: sql<number>`count(distinct ${inviteViews.visitorHash})::int`,
    })
    .from(inviteViews)
    .where(gte(inviteViews.viewedAt, since))
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  const byProject = await db
    .select({
      projectId: inviteViews.projectId,
      slug: projects.slug,
      product: projects.product,
      views: sql<number>`count(*)::int`,
      visitors: sql<number>`count(distinct ${inviteViews.visitorHash})::int`,
    })
    .from(inviteViews)
    .innerJoin(projects, eq(projects.id, inviteViews.projectId))
    .where(gte(inviteViews.viewedAt, since))
    .groupBy(inviteViews.projectId, projects.slug, projects.product)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  const devices = await db
    .select({ device: inviteViews.device, views: sql<number>`count(*)::int` })
    .from(inviteViews)
    .where(gte(inviteViews.viewedAt, since))
    .groupBy(inviteViews.device);

  const referrers = await db
    .select({ host: inviteViews.referrerHost, views: sql<number>`count(*)::int` })
    .from(inviteViews)
    .where(and(gte(inviteViews.viewedAt, since), sql`${inviteViews.referrerHost} is not null`))
    .groupBy(inviteViews.referrerHost)
    .orderBy(desc(sql`count(*)`))
    .limit(8);

  return { daily, byProject, devices, referrers };
}
