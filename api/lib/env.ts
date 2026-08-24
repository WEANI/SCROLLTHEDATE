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
  // Emails transactionnels (confirmation de commande, scénarios prêts,
  // vidéo livrée…) via l'API REST Resend — cf. api/lib/email.ts. Facultatifs
  // à dessein (pas de `required()`) : en dev, ou tant que le domaine n'est
  // pas vérifié chez Resend, l'app démarre normalement et les emails sont
  // simplement journalisés en console au lieu d'être envoyés.
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  // Adresse d'expédition, format "Nom <adresse@domaine>" — le domaine doit
  // être vérifié (SPF/DKIM) chez Resend, sinon les envois échouent.
  emailFrom: process.env.EMAIL_FROM ?? "",
  // URL publique du site, pour les liens absolus dans les emails (lien vers
  // l'espace client, vers un faire-part…). À défaut, retombe sur le domaine
  // de production Railway plutôt que sur localhost — un email envoyé depuis
  // un environnement mal configuré ne doit jamais pointer vers une adresse
  // inaccessible au client.
  appUrl: process.env.APP_URL ?? "https://scrollthedate-production.up.railway.app",
};
