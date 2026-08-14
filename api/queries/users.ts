import { eq } from "drizzle-orm";
import * as schema from "@db/schema";
import type { InsertUser } from "@db/schema";
import { getDb } from "./connection";
import { env } from "../lib/env";

export async function findUserByAuthId(authUserId: string) {
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.authUserId, authUserId))
    .limit(1);
  return rows.at(0);
}

/**
 * Crée/met à jour la ligne `users` locale à partir d'un utilisateur Supabase
 * Auth authentifié. Le rôle "admin" est attribué automatiquement au premier
 * login si l'email correspond à `OWNER_EMAIL`.
 */
export async function upsertUser(data: InsertUser) {
  const values = { ...data };
  const updateSet: Partial<InsertUser> = {
    lastSignInAt: new Date(),
    ...data,
  };

  if (
    values.role === undefined &&
    values.email &&
    env.ownerEmail &&
    values.email.toLowerCase() === env.ownerEmail
  ) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  await getDb()
    .insert(schema.users)
    .values(values)
    .onConflictDoUpdate({ target: schema.users.authUserId, set: updateSet });
}
