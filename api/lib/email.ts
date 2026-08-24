import { env } from "./env";

/**
 * Envoi d'emails transactionnels — via l'API REST de Resend, appelée en
 * `fetch` direct plutôt qu'avec le SDK `resend` : une seule requête POST,
 * pas de dépendance supplémentaire à installer ni à maintenir.
 *
 * Deux garanties non négociables, parce que ce module est appelé depuis des
 * mutations métier (paiement, envoi de scénarios, livraison de vidéo) :
 *
 * 1. `sendEmail` NE LÈVE JAMAIS. Un incident chez Resend, une clé expirée ou
 *    une coupure réseau ne doivent pas faire échouer la commande du client :
 *    l'email est un effet de bord, pas une étape du paiement. Toute erreur
 *    est capturée, journalisée, et renvoyée sous forme de `SendResult`.
 * 2. Sans `RESEND_API_KEY`/`EMAIL_FROM`, rien n'est envoyé et rien ne casse :
 *    l'email est journalisé en console (utile en dev) et `delivered: false`
 *    est renvoyé. L'appelant peut ainsi savoir si un email est RÉELLEMENT
 *    parti, et l'UI éviter d'affirmer au client qu'il a reçu quelque chose
 *    qui n'existe pas — c'est précisément le défaut relevé à l'audit.
 */

export type SendResult = {
  /** `true` uniquement si Resend a accepté le message. Sert à ne pas mentir au client dans l'UI. */
  delivered: boolean;
  /** Renseigné quand `delivered` est `false` : "not_configured" | "no_recipient" | "api_error" | "network_error". */
  reason?: string;
  /** Identifiant Resend du message envoyé, pour retrouver la trace côté fournisseur. */
  id?: string;
};

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  /** Version texte — améliore la délivrabilité et sert de repli aux clients mail sans HTML. */
  text: string;
  replyTo?: string;
};

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export function isEmailConfigured(): boolean {
  return Boolean(env.resendApiKey && env.emailFrom);
}

export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  if (!message.to) {
    console.warn("[email] Destinataire absent, envoi ignoré:", message.subject);
    return { delivered: false, reason: "no_recipient" };
  }

  if (!isEmailConfigured()) {
    // Volontairement `info` et non `warn` : en développement c'est le
    // fonctionnement nominal, pas une anomalie. L'alerte pour la production
    // est levée une seule fois au démarrage (cf. warnIfEmailMisconfigured).
    console.info(
      `[email] Non configuré — email NON envoyé. À: ${message.to} | Sujet: ${message.subject}`,
    );
    return { delivered: false, reason: "not_configured" };
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.emailFrom,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(
        `[email] Refus de Resend (${response.status}) pour "${message.subject}": ${detail}`,
      );
      return { delivered: false, reason: "api_error" };
    }

    const data = (await response.json().catch(() => null)) as { id?: string } | null;
    return { delivered: true, id: data?.id };
  } catch (error) {
    // Réseau coupé, DNS, timeout… : on journalise et on rend la main. Encore
    // une fois : ne jamais propager, la mutation métier doit aboutir.
    console.error(`[email] Échec réseau pour "${message.subject}":`, error);
    return { delivered: false, reason: "network_error" };
  }
}

/**
 * Avertissement unique au démarrage. En production, une configuration email
 * absente est une vraie anomalie (le client ne reçoit plus rien) mais ne doit
 * pas empêcher le serveur de démarrer : le site reste parfaitement utilisable
 * sans emails, alors qu'un crash au boot le rendrait totalement indisponible.
 */
export function warnIfEmailMisconfigured(): void {
  if (isEmailConfigured()) return;
  if (env.isProduction) {
    console.warn(
      "[email] RESEND_API_KEY et/ou EMAIL_FROM manquants en production : " +
        "AUCUN email transactionnel ne sera envoyé (confirmation de commande, " +
        "scénarios prêts, vidéo livrée…).",
    );
  }
}
