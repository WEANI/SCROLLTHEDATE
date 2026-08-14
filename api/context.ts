import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "@db/schema";
import { supabaseAdmin } from "./lib/supabaseAdmin";
import { findUserByAuthId, upsertUser } from "./queries/users";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: User;
};

/**
 * Authentifie la requête via le token Supabase Auth envoyé par le frontend
 * (`Authorization: Bearer <access_token>`). `supabaseAdmin.auth.getUser()`
 * vérifie la signature et l'expiration directement auprès de Supabase.
 * La ligne `users` locale est synchronisée (créée si absente) à chaque
 * requête authentifiée — upsert idempotent, coût négligeable.
 */
async function authenticateRequest(headers: Headers): Promise<User | undefined> {
  const authHeader = headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return undefined;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return undefined;

  const authUser = data.user;
  await upsertUser({
    authUserId: authUser.id,
    email: authUser.email ?? null,
    name:
      (authUser.user_metadata?.name as string | undefined) ??
      authUser.email?.split("@")[0] ??
      null,
  });

  return findUserByAuthId(authUser.id);
}

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };
  try {
    ctx.user = await authenticateRequest(opts.req.headers);
  } catch {
    // Authentication is optional here
  }
  return ctx;
}
