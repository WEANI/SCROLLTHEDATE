import { beforeEach, describe, expect, it, vi } from "vitest";

// Alertes techniques par email au propriétaire du site.

vi.mock("../lib/env", () => ({ env: { ownerEmail: "proprio@exemple.fr", appUrl: "https://www.scrollthedate.com" } }));
const email = vi.hoisted(() => ({ sendEmail: vi.fn() }));
vi.mock("../lib/email", () => email);

const { alertOwner, resetAlertThrottle } = await import("../lib/alerts");

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  resetAlertThrottle();
});

describe("alertOwner", () => {
  it("envoie un email au propriétaire avec le détail de l'erreur", async () => {
    await alertOwner("k", "Paiement Stripe non traité", new Error("base injoignable"));

    expect(email.sendEmail).toHaveBeenCalledTimes(1);
    const msg = email.sendEmail.mock.calls[0]![0] as { to: string; subject: string; text: string };
    expect(msg.to).toBe("proprio@exemple.fr");
    expect(msg.subject).toContain("Paiement Stripe non traité");
    expect(msg.text).toContain("base injoignable");
  });

  it("n'envoie qu'un email par quart d'heure pour une même alerte", async () => {
    await alertOwner("boucle", "Erreur", "x");
    await alertOwner("boucle", "Erreur", "x");
    await alertOwner("autre", "Autre erreur", "y");

    expect(email.sendEmail).toHaveBeenCalledTimes(2);
  });

  it("neutralise le HTML contenu dans un message d'erreur", async () => {
    await alertOwner("k", "Erreur", '<img src=x onerror="alert(1)">');

    const msg = email.sendEmail.mock.calls[0]![0] as { html: string };
    expect(msg.html).not.toContain("<img src=x");
    expect(msg.html).toContain("&lt;img");
  });

  it("ne lève jamais, même si l'envoi échoue", async () => {
    email.sendEmail.mockRejectedValueOnce(new Error("Resend en panne"));
    await expect(alertOwner("k", "Erreur", "x")).resolves.toBeUndefined();
  });
});
