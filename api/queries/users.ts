import { eq, sql } from "drizzle-orm";
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
 * Recherche par email (insensible à la casse). Sert au checkout invité :
 * `authUserId` non nul signifie qu'un vrai compte Supabase Auth existe déjà
 * pour cette adresse — on refuse alors la commande invitée et on demande la
 * connexion, sinon n'importe qui pourrait commander avec l'email d'autrui et
 * récupérer l'accès à son espace.
 */
export async function findUserByEmail(email: string) {
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(sql`lower(${schema.users.email}) = ${email.trim().toLowerCase()}`)
    .limit(1);
  return rows.at(0);
}

/**
 * Crée une ligne `users` SANS compte Supabase Auth (`authUserId` null, ce que
 * le schéma autorise déjà — cf. les comptes de démo du seed).
 *
 * C'est ce qui permet de ne demander la création de compte qu'APRÈS le
 * paiement : `orders.userId`/`projects.userId` sont NOT NULL, il faut donc
 * bien une ligne utilisateur dès le checkout, mais le vrai compte (avec mot
 * de passe) n'est créé qu'une fois le paiement confirmé, dans le webhook
 * Stripe — aucun compte fantôme n'est créé pour un panier abandonné.
 */
export async function createGuestUser(data: { email: string; name?: string | null }) {
  const rows = await getDb()
    .insert(schema.users)
    .values({
      email: data.email.trim().toLowerCase(),
      name: data.name ?? null,
      authUserId: null,
    })
    .returning();
  return rows[0];
}

/** Rattache un compte Supabase Auth à une ligne `users` existante (invité → client). */
export async function linkAuthUser(userId: number, authUserId: string) {
  await getDb()
    .update(schema.users)
    .set({ authUserId })
    .where(eq(schema.users.id, userId));
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
