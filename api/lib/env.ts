import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

export const env = {
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  // Auth : Supabase Auth. Le service role key permet de vérifier les tokens
  // d'accès envoyés par le frontend (voir api/lib/supabaseAdmin.ts).
  supabaseUrl: required("SUPABASE_URL"),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  // Email qui reçoit le rôle "admin" automatiquement à sa première connexion.
  ownerEmail: (process.env.OWNER_EMAIL ?? "").toLowerCase(),
};
