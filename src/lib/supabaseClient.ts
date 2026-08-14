import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  console.warn(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquantes — l'authentification ne fonctionnera pas.",
  );
}

/** Client Supabase navigateur (clé publique anon). Gère la session (login,
 * signup, refresh de token, logout) entièrement côté client. */
export const supabase = createClient(url ?? "", anonKey ?? "");
