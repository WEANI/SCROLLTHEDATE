import { desc, eq } from "drizzle-orm";
import {
  auditEvents,
  notifications,
  projects,
  users,
} from "@db/schema";
import { getDb } from "./connection";

/** Projet courant d'un client (le plus récent). */
export async function findCurrentProject(userId: number) {
  const rows = await getDb()
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.createdAt))
    .limit(1);
  return rows.at(0);
}

/** Écrit un événement d'audit horodaté sur un projet. */
export async function logAudit(
  projectId: number,
  actor: string,
  action: string,
  meta?: unknown,
) {
  await getDb().insert(auditEvents).values({
    projectId,
    actor,
    action,
    meta: meta === undefined ? null : (meta as Record<string, unknown>),
  });
}

/** Crée une notification pour un utilisateur. */
export async function notifyUser(
  userId: number,
  type: string,
  payload?: unknown,
) {
  await getDb().insert(notifications).values({
    userId,
    type,
    payload: payload === undefined ? null : (payload as Record<string, unknown>),
  });
}

/** Notifie tous les administrateurs. */
export async function notifyAdmins(type: string, payload?: unknown) {
  const db = getDb();
  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "admin"));
  if (admins.length === 0) return;
  await db.insert(notifications).values(
    admins.map((a) => ({
      userId: a.id,
      type,
      payload:
        payload === undefined ? null : (payload as Record<string, unknown>),
    })),
  );
}

export function actorOf(user: { id: number; role: string }) {
  return `${user.role === "admin" ? "admin" : "customer"}:${user.id}`;
}
