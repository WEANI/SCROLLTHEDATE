import { and, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import {
  notifications,
  orders,
  projects,
  questionnaires,
  rsvpResponses,
} from "@db/schema";
import { getDb } from "./connection";

// --------------------------------------------------------- notifications ----
export async function findNotificationsByUser(userId: number) {
  return getDb()
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt));
}

export async function markNotificationRead(notificationId: number, userId: number) {
  await getDb()
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(eq(notifications.id, notificationId), eq(notifications.userId, userId)),
    );
}

export async function markAllNotificationsRead(userId: number) {
  await getDb()
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}

// ------------------------------------------------------------- analytics ----
async function ordersAgg(from: Date, to: Date) {
  const rows = await getDb()
    .select({
      revenueCents: sql<number>`coalesce(sum(${orders.amountCents}), 0)`.as(
        "revenueCents",
      ),
      count: sql<number>`count(*)`.as("count"),
    })
    .from(orders)
    .where(
      and(
        eq(orders.paymentStatus, "paid"),
        gte(orders.createdAt, from),
        lt(orders.createdAt, to),
      ),
    );
  return rows.at(0) ?? { revenueCents: 0, count: 0 };
}

async function productAgg(from: Date, to: Date) {
  return getDb()
    .select({
      product: orders.product,
      count: sql<number>`count(*)`.as("count"),
      revenueCents: sql<number>`coalesce(sum(${orders.amountCents}), 0)`.as(
        "revenueCents",
      ),
    })
    .from(orders)
    .where(
      and(
        eq(orders.paymentStatus, "paid"),
        gte(orders.createdAt, from),
        lt(orders.createdAt, to),
      ),
    )
    .groupBy(orders.product);
}

export async function adminOverview(days: number) {
  const db = getDb();
  const now = new Date();
  const periodStart = new Date(now.getTime() - days * 24 * 3600 * 1000);
  const prevStart = new Date(periodStart.getTime() - days * 24 * 3600 * 1000);

  const [current, previous, byProduct] = await Promise.all([
    ordersAgg(periodStart, now),
    ordersAgg(prevStart, periodStart),
    productAgg(periodStart, now),
  ]);

  // Délai moyen de production (commande payée → projet livré), en jours
  const delayRows = await db
    .select({
      delayDays: sql<number>`avg(extract(epoch from (${projects.updatedAt} - ${orders.createdAt})) / 86400)`.as(
        "delayDays",
      ),
      count: sql<number>`count(*)`.as("count"),
    })
    .from(projects)
    .innerJoin(orders, eq(projects.orderId, orders.id))
    .where(eq(projects.status, "DELIVERED"));
  const delay = delayRows.at(0);

  // Complétion moyenne des questionnaires
  const completionRows = await db
    .select({
      avgPct: sql<number>`coalesce(avg(${questionnaires.completionPct}), 0)`.as(
        "avgPct",
      ),
      count: sql<number>`count(*)`.as("count"),
    })
    .from(questionnaires);
  const completion = completionRows.at(0);

  // RSVP : totaux globaux
  const rsvpRows = await db
    .select({
      attending: rsvpResponses.attending,
      count: sql<number>`count(*)`.as("count"),
      plusOnes: sql<number>`coalesce(sum(${rsvpResponses.plusOnes}), 0)`.as(
        "plusOnes",
      ),
    })
    .from(rsvpResponses)
    .groupBy(rsvpResponses.attending);

  const rsvpTotals = { yes: 0, no: 0, maybe: 0, guests: 0 };
  for (const r of rsvpRows) {
    rsvpTotals[r.attending] += Number(r.count);
    if (r.attending === "yes")
      rsvpTotals.guests += Number(r.count) + Number(r.plusOnes);
  }

  return {
    periodDays: days,
    revenueCents: Number(current.revenueCents),
    prevRevenueCents: Number(previous.revenueCents),
    orderCount: Number(current.count),
    prevOrderCount: Number(previous.count),
    avgBasketCents:
      Number(current.count) > 0
        ? Math.round(Number(current.revenueCents) / Number(current.count))
        : 0,
    conversionByProduct: byProduct.map((p) => ({
      product: p.product,
      orders: Number(p.count),
      revenueCents: Number(p.revenueCents),
      share:
        Number(current.count) > 0 ? Number(p.count) / Number(current.count) : 0,
    })),
    avgProductionDays:
      delay && delay.count > 0 && delay.delayDays !== null
        ? Math.round(Number(delay.delayDays) * 10) / 10
        : null,
    deliveredCount: Number(delay?.count ?? 0),
    questionnaireAvgCompletion: Math.round(Number(completion?.avgPct ?? 0)),
    questionnaireCount: Number(completion?.count ?? 0),
    rsvp: rsvpTotals,
  };
}
