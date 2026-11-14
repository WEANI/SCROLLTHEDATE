import { env } from "./env";
import { sendEmail } from "./email";
import { systemAlertEmail } from "./emailTemplates";

/** Une même alerte (même `key`) au plus une fois par fenêtre — une erreur en boucle ne doit pas inonder la boîte mail. */
const THROTTLE_MS = 15 * 60_000;
const lastSent = new Map<string, number>();

/**
 * Alerte technique par email au propriétaire (OWNER_EMAIL) : paiement non
 * traité, migration échouée au démarrage, erreur serveur inattendue.
 * Toujours journalisée ; l'email part si Resend est configuré (cf.
 * api/lib/email.ts). Ne lève jamais : une alerte qui échoue ne doit pas
 * aggraver l'erreur qu'elle signale.
 */
export async function alertOwner(key: string, title: string, detail: unknown): Promise<void> {
  const text = describe(detail);
  console.error(`[alerte] ${title}\n${text}`);
  const now = Date.now();
  if (now - (lastSent.get(key) ?? 0) < THROTTLE_MS) return;
  lastSent.set(key, now);
  if (!env.ownerEmail) return;
  try {
    await sendEmail(systemAlertEmail({ to: env.ownerEmail, title, detail: text }));
  } catch (err) {
    console.error("[alerte] envoi de l'email impossible :", err instanceof Error ? err.message : err);
  }
}

function describe(detail: unknown): string {
  if (detail instanceof Error) return `${detail.message}\n\n${(detail.stack ?? "").split("\n").slice(1, 6).join("\n")}`.slice(0, 4000);
  if (typeof detail === "string") return detail.slice(0, 4000);
  try {
    return JSON.stringify(detail, null, 2).slice(0, 4000);
  } catch {
    return String(detail);
  }
}

/** Réservé aux tests. */
export function resetAlertThrottle() {
  lastSent.clear();
}
