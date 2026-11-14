import { describe, expect, it, vi } from "vitest";

// settings.get : les réglages des pages publiques restent lisibles par tous,
// les autres (modèles d'emails, notifications…) sont réservés à l'admin.

vi.mock("../queries/orders", () => ({
  getSiteSetting: vi.fn(async (key: string) => ({ from: key })),
  upsertSiteSetting: vi.fn(),
}));
vi.mock("../queries/analytics", () => ({}));
vi.mock("../lib/email", () => ({ isEmailConfigured: () => false }));
vi.mock("../lib/stripe", () => ({ isStripeConfigured: () => false }));
vi.mock("../lib/env", () => ({ env: { stripeSecretKey: "" } }));

const { settingsRouter } = await import("../miscRouters");
const { createCallerFactory } = await import("../middleware");

const caller = (role?: "user" | "admin") =>
  createCallerFactory(settingsRouter)({
    req: new Request("https://www.scrollthedate.com"),
    resHeaders: new Headers(),
    user: role ? ({ id: 1, role } as never) : undefined,
  });

describe("settings.get", () => {
  it.each(["products", "options", "texts", "saveTheDateTemplates", "demoFairePart1Std"])(
    "laisse lire « %s » sans compte",
    async (key) => {
      await expect(caller().get({ key })).resolves.toEqual({ key, value: { from: key } });
    },
  );

  it("lit « products » par défaut", async () => {
    await expect(caller().get()).resolves.toMatchObject({ key: "products" });
  });

  it.each(["emailTemplates", "notifications", "quickReplies", "security", "profile"])(
    "refuse « %s » à un visiteur et à un client",
    async (key) => {
      await expect(caller().get({ key })).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(caller("user").get({ key })).rejects.toMatchObject({ code: "FORBIDDEN" });
    },
  );

  it("laisse l'admin lire un réglage réservé", async () => {
    await expect(caller("admin").get({ key: "emailTemplates" })).resolves.toMatchObject({ key: "emailTemplates" });
  });

  it("refuse la modification des réglages à un client", async () => {
    await expect(caller("user").adminUpdate({ key: "products", value: [] })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
