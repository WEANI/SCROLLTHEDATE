import { desc, eq } from "drizzle-orm";
import {
  orders,
  projects,
  siteSettings,
  users,
  type InsertOrder,
  type InsertProject,
} from "@db/schema";
import { getDb } from "./connection";

export type CheckoutOption = { id: string; label: string; priceCents: number };

export type ProductSetting = {
  id: "FAIRE_PART" | "SAVE_THE_DATE";
  name: string;
  priceCents: number;
  description?: string;
};

export const FALLBACK_PRODUCTS: ProductSetting[] = [
  { id: "FAIRE_PART", name: "Faire-part digital", priceCents: 34900 },
  { id: "SAVE_THE_DATE", name: "Save the Date digital", priceCents: 14900 },
];

export const FALLBACK_OPTIONS: CheckoutOption[] = [
  { id: "revisions", label: "Révisions illimitées", priceCents: 6000 },
  { id: "sous-titres", label: "Sous-titres FR/EN", priceCents: 4000 },
  { id: "version-courte", label: "Version courte réseaux", priceCents: 9000 },
];

export async function getSiteSetting<T>(key: string): Promise<T | null> {
  const rows = await getDb()
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.key, key))
    .limit(1);
  return (rows.at(0)?.value as T) ?? null;
}

export async function upsertSiteSetting(key: string, value: unknown) {
  await getDb()
    .insert(siteSettings)
    .values({ key, value: value as Record<string, unknown> })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value: value as Record<string, unknown> },
    });
}

/** Calcule le montant serveur à partir des produits/options configurés. */
export async function computeAmount(
  product: "FAIRE_PART" | "SAVE_THE_DATE",
  optionIds: string[],
): Promise<{ amountCents: number; options: CheckoutOption[] }> {
  const products =
    (await getSiteSetting<ProductSetting[]>("products")) ?? FALLBACK_PRODUCTS;
  const availableOptions =
    (await getSiteSetting<CheckoutOption[]>("options")) ?? FALLBACK_OPTIONS;
  const base = products.find((p) => p.id === product) ?? FALLBACK_PRODUCTS[0];
  const chosen = availableOptions.filter((o) => optionIds.includes(o.id));
  const amountCents =
    base.priceCents + chosen.reduce((sum, o) => sum + o.priceCents, 0);
  return { amountCents, options: chosen };
}

export async function createOrder(data: InsertOrder) {
  const [{ id }] = await getDb()
    .insert(orders)
    .values(data)
    .returning({ id: orders.id });
  return id;
}

export async function createProject(data: InsertProject) {
  const [{ id }] = await getDb()
    .insert(projects)
    .values(data)
    .returning({ id: projects.id });
  return id;
}

export async function findOrdersByUser(userId: number) {
  return getDb().query.orders.findMany({
    where: eq(orders.userId, userId),
    orderBy: desc(orders.createdAt),
    with: { projects: true },
  });
}

export async function findAllOrders() {
  return getDb().query.orders.findMany({
    orderBy: desc(orders.createdAt),
    with: {
      user: true,
      projects: { with: { questionnaire: true } },
    },
  });
}

export async function findOrderById(orderId: number) {
  return getDb().query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { user: true, projects: true },
  });
}

export async function updateOrderPaymentStatus(
  orderId: number,
  paymentStatus: "pending" | "paid" | "failed" | "refunded",
) {
  await getDb()
    .update(orders)
    .set({ paymentStatus })
    .where(eq(orders.id, orderId));
}

export async function findUserById(userId: number) {
  const rows = await getDb()
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return rows.at(0);
}
