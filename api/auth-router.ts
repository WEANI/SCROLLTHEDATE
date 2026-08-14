import { createRouter, authedQuery } from "./middleware";

/**
 * L'authentification elle-même (login/signup/logout) est gérée entièrement
 * côté frontend par Supabase Auth (supabase-js). Le backend n'a plus de
 * session propre à créer/détruire : il se contente de vérifier le token
 * Supabase envoyé sur chaque requête (voir api/context.ts) et d'exposer le
 * profil applicatif correspondant.
 */
export const authRouter = createRouter({
  me: authedQuery.query((opts) => opts.ctx.user),
});
