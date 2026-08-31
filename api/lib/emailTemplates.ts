import { env } from "./env";
import type { EmailMessage } from "./email";

/**
 * Gabarits des emails transactionnels. HTML volontairement simple (tables
 * email-safe, pas de police custom — Fraunces/Space Grotesk ne se chargent
 * pas de façon fiable dans les clients mail, on retombe sur leurs piles de
 * secours déjà déclarées dans tailwind.config : Georgia/serif et
 * system-ui/sans-serif) : la charte se reconnaît à la couleur d'accent
 * (terracotta #C96F5A) et à la mise en page, pas à la typographie.
 *
 * Chaque builder renvoie un `EmailMessage` complet (HTML + texte). Le texte
 * n'est pas un simple `.replace()` du HTML : il est écrit à la main pour
 * rester lisible en clair, cf. sendEmail dans api/lib/email.ts.
 */

const BRAND = {
  bg: "#F4F2F0",
  card: "#FFFFFF",
  ink: "#232326",
  inkSoft: "#6B6B70",
  accent: "#C96F5A",
  border: "#E8E5E1",
};

function wrap(opts: { preheader: string; bodyHtml: string }): string {
  return `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:'Space Grotesk',system-ui,-apple-system,sans-serif;color:${BRAND.ink};">
  <span style="display:none;font-size:1px;color:${BRAND.bg};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${opts.preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:520px;background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:16px;overflow:hidden;">
        <tr><td style="padding:28px 32px 20px;border-bottom:1px solid ${BRAND.border};">
          <span style="font-family:Georgia,serif;font-style:italic;font-size:19px;color:${BRAND.ink};">Scroll The Date</span>
        </td></tr>
        <tr><td style="padding:32px;">
          ${opts.bodyHtml}
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid ${BRAND.border};">
          <p style="margin:0;font-size:12px;color:${BRAND.inkSoft};">
            Scroll The Date — <a href="mailto:contact@scrollthedate.com" style="color:${BRAND.inkSoft};">contact@scrollthedate.com</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function button(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:${BRAND.accent};color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;padding:13px 26px;border-radius:999px;margin-top:8px;">${label}</a>`;
}

const espaceUrl = () => `${env.appUrl}/espace`;

/** Confirmation de commande — envoyée juste après le paiement (simulé). N'invente PAS de "lien pour créer votre espace" : le compte existe déjà (auth requise avant paiement, cf. Commander.tsx). */
export function orderConfirmationEmail(params: {
  to: string;
  coupleNames: string;
  orderRef: string;
  amountCents: number;
  /**
   * Checkout invité : lien à usage unique pour choisir son mot de passe et
   * activer son espace (cf. api/lib/guestAccount.ts). Null/absent quand le
   * client était déjà connecté au moment de la commande — l'email affiche
   * alors simplement le lien vers l'espace.
   */
  setPasswordUrl?: string | null;
}): EmailMessage {
  const amount = (params.amountCents / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });
  const isGuest = Boolean(params.setPasswordUrl);
  const ctaUrl = params.setPasswordUrl ?? espaceUrl();
  const ctaLabel = isGuest ? "Activer mon espace" : "Accéder à mon espace";
  const subject = `Commande confirmée — ${params.orderRef}`;
  const html = wrap({
    preheader: `Votre commande ${params.orderRef} est confirmée (${amount}).`,
    bodyHtml: `
      <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${BRAND.accent};">Commande confirmée</p>
      <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-weight:400;font-size:26px;line-height:1.2;color:${BRAND.ink};">Merci${params.coupleNames ? `, ${params.coupleNames}` : ""} !</h1>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:${BRAND.inkSoft};">Référence : <strong style="color:${BRAND.ink};">${params.orderRef}</strong> — ${amount}</p>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:${BRAND.inkSoft};">
        ${
          isGuest
            ? "Votre place est réservée dans notre planning de production. Dernière étape pour activer votre espace : choisissez votre mot de passe. Vous pourrez ensuite remplir le questionnaire, pour nous raconter votre histoire et les infos pratiques du jour J."
            : "Votre place est réservée dans notre planning de production. Prochaine étape : le questionnaire, pour nous raconter votre histoire et les infos pratiques du jour J."
        }
      </p>
      ${button(ctaLabel, ctaUrl)}
      ${
        isGuest
          ? `<p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:${BRAND.inkSoft};">Ce lien est personnel et à usage unique. S'il a expiré, utilisez « Mot de passe oublié » depuis la page de connexion avec cette même adresse email.</p>`
          : ""
      }
    `,
  });
  const text = `Merci${params.coupleNames ? `, ${params.coupleNames}` : ""} !

Commande confirmée — ${params.orderRef} (${amount}).

${
  isGuest
    ? "Votre place est réservée dans notre planning de production. Dernière étape pour activer votre espace : choisissez votre mot de passe. Vous pourrez ensuite remplir le questionnaire, pour nous raconter votre histoire et les infos pratiques du jour J."
    : "Votre place est réservée dans notre planning de production. Prochaine étape : le questionnaire, pour nous raconter votre histoire et les infos pratiques du jour J."
}

${ctaLabel} : ${ctaUrl}
${isGuest ? "\nCe lien est personnel et à usage unique. S'il a expiré, utilisez « Mot de passe oublié » depuis la page de connexion avec cette même adresse email.\n" : ""}
— Scroll The Date`;
  return { to: params.to, subject, html, text };
}

/** Les scénarios sont prêts à être choisis (scenarios.sent). */
export function scenariosReadyEmail(params: {
  to: string;
  coupleNames: string;
  slug: string;
}): EmailMessage {
  const url = `${env.appUrl}/espace/projet`;
  const subject = "Vos scénarios sont prêts";
  const html = wrap({
    preheader: "Des propositions vous attendent, à choisir ou ajuster.",
    bodyHtml: `
      <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${BRAND.accent};">Vos scénarios sont prêts</p>
      <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-weight:400;font-size:26px;line-height:1.2;color:${BRAND.ink};">Des propositions vous attendent</h1>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:${BRAND.inkSoft};">
        Nous avons imaginé plusieurs façons de raconter votre histoire. Prenez le temps de les regarder, choisissez
        celle qui vous ressemble — ou demandez des ajustements.
      </p>
      ${button("Voir mes scénarios", url)}
    `,
  });
  const text = `Des propositions vous attendent

Nous avons imaginé plusieurs façons de raconter votre histoire. Choisissez celle qui vous ressemble, ou demandez des ajustements.

Voir mes scénarios : ${url}

— Scroll The Date`;
  return { to: params.to, subject, html, text };
}

/** Une nouvelle version de la vidéo vient d'être livrée (video.sent). */
export function videoDeliveredEmail(params: {
  to: string;
  coupleNames: string;
  slug: string;
}): EmailMessage {
  const url = `${env.appUrl}/espace/projet`;
  const subject = "Votre vidéo est prête à être visionnée";
  const html = wrap({
    preheader: "Une nouvelle version de votre film est disponible.",
    bodyHtml: `
      <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${BRAND.accent};">Votre vidéo est prête</p>
      <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-weight:400;font-size:26px;line-height:1.2;color:${BRAND.ink};">Une nouvelle version vous attend</h1>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:${BRAND.inkSoft};">
        Regardez-la tranquillement, puis validez ou demandez des retouches directement depuis votre espace.
      </p>
      ${button("Visionner la vidéo", url)}
    `,
  });
  const text = `Une nouvelle version vous attend

Regardez votre vidéo, puis validez ou demandez des retouches depuis votre espace.

Visionner la vidéo : ${url}

— Scroll The Date`;
  return { to: params.to, subject, html, text };
}

const STATUS_LABELS: Record<string, string> = {
  ONBOARDING: "Votre projet démarre",
  QUESTIONNAIRE: "En attente de votre questionnaire",
  SCENARIOS: "Vos scénarios sont en préparation",
  PRODUCTION: "Votre film est en cours de production",
  REVIEW: "Votre film est prêt pour relecture",
  DELIVERED: "Votre faire-part est livré !",
};

/** Le statut du projet a changé, décidé côté admin (project.status_changed). */
export function projectStatusChangedEmail(params: {
  to: string;
  coupleNames: string;
  status: string;
}): EmailMessage {
  const label = STATUS_LABELS[params.status] ?? "Votre projet a avancé";
  const url = `${env.appUrl}/espace`;
  const subject = label;
  const html = wrap({
    preheader: label,
    bodyHtml: `
      <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${BRAND.accent};">Mise à jour de votre projet</p>
      <h1 style="margin:0 0 20px;font-family:Georgia,serif;font-weight:400;font-size:26px;line-height:1.2;color:${BRAND.ink};">${label}</h1>
      ${button("Voir mon projet", url)}
    `,
  });
  const text = `${label}\n\nVoir mon projet : ${url}\n\n— Scroll The Date`;
  return { to: params.to, subject, html, text };
}

/** Nouveau message dans le fil client ↔ agence, côté DESTINATAIRE client. */
export function newMessageForClientEmail(params: { to: string }): EmailMessage {
  const url = `${env.appUrl}/espace/messages`;
  const subject = "Nouveau message de Scroll The Date";
  const html = wrap({
    preheader: "Vous avez un nouveau message.",
    bodyHtml: `
      <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${BRAND.accent};">Nouveau message</p>
      <h1 style="margin:0 0 20px;font-family:Georgia,serif;font-weight:400;font-size:26px;line-height:1.2;color:${BRAND.ink};">Nous vous avons écrit</h1>
      ${button("Lire le message", url)}
    `,
  });
  const text = `Nouveau message de Scroll The Date\n\nLire le message : ${url}\n\n— Scroll The Date`;
  return { to: params.to, subject, html, text };
}

/** Alerte générique côté admin (choix de scénario, demande de retouches…) — notifyAdmins() a un pendant email pour chaque type, avec ce même gabarit sobre : c'est un signal de travail, pas une communication client. */
export function adminAlertEmail(params: {
  to: string;
  title: string;
  detail: string;
  projectSlug: string;
}): EmailMessage {
  const url = `${env.appUrl}/admin/projets`;
  const subject = `${params.title} — ${params.projectSlug}`;
  const html = wrap({
    preheader: params.title,
    bodyHtml: `
      <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${BRAND.accent};">${params.title}</p>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:${BRAND.inkSoft};">Projet <strong style="color:${BRAND.ink};">${params.projectSlug}</strong> — ${params.detail}</p>
      ${button("Ouvrir l'admin", url)}
    `,
  });
  const text = `${params.title} — ${params.projectSlug}\n${params.detail}\n\nOuvrir l'admin : ${url}`;
  return { to: params.to, subject, html, text };
}

/** Nouveau message dans le fil client ↔ agence, côté DESTINATAIRE admin. */
export function newMessageForAdminEmail(params: {
  to: string;
  projectSlug: string;
}): EmailMessage {
  const url = `${env.appUrl}/admin/messages`;
  const subject = `Nouveau message client — ${params.projectSlug}`;
  const html = wrap({
    preheader: `Nouveau message sur le projet ${params.projectSlug}.`,
    bodyHtml: `
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:${BRAND.inkSoft};">Nouveau message client sur le projet <strong style="color:${BRAND.ink};">${params.projectSlug}</strong>.</p>
      ${button("Ouvrir la messagerie admin", url)}
    `,
  });
  const text = `Nouveau message client sur le projet ${params.projectSlug}.\n\nOuvrir la messagerie admin : ${url}`;
  return { to: params.to, subject, html, text };
}
