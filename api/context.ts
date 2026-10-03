import { createHash } from "node:crypto";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "@db/schema";
import { supabaseAdmin } from "./lib/supabaseAdmin";
import { findUserByAuthId, upsertUser } from "./queries/users";

/** Au-delà, Supabase Auth est considéré injoignable (cf. authenticateRequest). */
const AUTH_TIMEOUT_MS = 10_000;

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: User;
};

/**
 * Cache en mémoire du résultat de `authenticateRequest`, par token —
 * évite de repayer un aller-retour réseau vers Supabase Auth (getUser) PLUS
 * un upsert en base à CHAQUE requête tRPC. Mesuré en production le
 * 04/10/2026 : ~700-1100 ms par requête authentifiée, alors que l'espace
 * client et l'admin pollent en continu (notifications/messages toutes les
 * 10-30 s) — plusieurs requêtes par minute et par onglet ouvert, chacune
 * payant ce coût pour un profil qui ne change presque jamais d'une requête
 * à l'autre.
 *
 * `undefined` (token absent/invalide) n'est jamais mis en cache : la valeur
 * cachée est réellement résolue, incluant les tokens invalides/expirés
 * pour éviter de marteler Supabase sur un token mort — mais `undefined`
 * signifie ici "pas de token du tout", un cas trivial qui ne vaut pas la
 * peine d'être caché (pas de round-trip réseau à épargner).
 *
 * Clé = hash du token, jamais le token en clair (même motif que le hachage
 * IP/UA de inviteViews.ts) : réduit ce qu'une fuite mémoire pourrait
 * exposer, sans rien changer au fonctionnement du cache (toujours une clé
 * stable pour un même token).
 */
const TOKEN_CACHE_TTL_MS = 60_000;

type CachedAuth = { user: User | undefined; expiresAt: number };

const tokenCache = new Map<string, CachedAuth>();

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Purge paresseuse : évite que la Map ne grossisse indéfiniment (même principe que api/lib/rateLimit.ts). */
function sweepTokenCache(now: number) {
  if (tokenCache.size < 5000) return;
  for (const [key, entry] of tokenCache) {
    if (entry.expiresAt <= now) tokenCache.delete(key);
  }
}

/**
 * Authentifie la requête via le token Supabase Auth envoyé par le frontend
 * (`Authorization: Bearer <access_token>`). `supabaseAdmin.auth.getUser()`
 * vérifie la signature et l'expiration directement auprès de Supabase.
 * La ligne `users` locale est synchronisée (créée si absente) à chaque
 * résolution RÉELLE (hors cache) — upsert idempotent, coût négligeable.
 *
 * Volontairement en mémoire, comme rateLimit.ts : le service tourne sur une
 * seule instance Railway. Si le service passe un jour à plusieurs
 * instances, un utilisateur pourrait rester authentifié jusqu'à
 * `TOKEN_CACHE_TTL_MS` après une révocation côté Supabase sur une instance
 * qui l'a déjà en cache — acceptable pour 60 s, à revoir si ce délai devait
 * grandir ou si une révocation immédiate devient un besoin réel.
 */
async function authenticateRequest(headers: Headers): Promise<User | undefined> {
  const authHeader = headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return undefined;

  const now = Date.now();
  sweepTokenCache(now);
  const key = hashToken(token);
  const cached = tokenCache.get(key);
  if (cached && cached.expiresAt > now) return cached.user;

  const user = await resolveUser(token);
  tokenCache.set(key, { user, expiresAt: now + TOKEN_CACHE_TTL_MS });
  return user;
}

async function resolveUser(token: string): Promise<User | undefined> {
  // Garde-fou de latence : le 31/08/2026, getUser a mis jusqu'à 186 s à
  // répondre (incident passager côté Supabase Auth), immobilisant les
  // requêtes et, côté client, gelant l'interface — un acheteur ne pouvait
  // plus rien faire. Mieux vaut échouer vite et être considéré comme non
  // connecté que suspendre la requête indéfiniment.
  const timeout = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), AUTH_TIMEOUT_MS),
  );
  const result = await Promise.race([supabaseAdmin.auth.getUser(token), timeout]);
  if (!result) {
    console.warn(
      `[auth] getUser n'a pas répondu en ${AUTH_TIMEOUT_MS} ms — requête traitée comme non authentifiée`,
    );
    return undefined;
  }

  const { data, error } = result;
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
