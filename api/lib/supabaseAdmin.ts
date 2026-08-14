import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

/**
 * Client Supabase côté serveur (clé service_role — jamais exposée au
 * frontend). Sert uniquement à vérifier les tokens d'accès envoyés par le
 * client dans l'en-tête `Authorization: Bearer <token>` : `auth.getUser()`
 * valide la signature/expiration du JWT directement auprès de Supabase Auth.
 */
export const supabaseAdmin = createClient(
  env.supabaseUrl,
  env.supabaseServiceRoleKey,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  },
);
