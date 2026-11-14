import { beforeEach, describe, expect, it, vi } from "vitest";

// Commande (orders.createCheckout) : le montant est TOUJOURS calculé côté
// serveur, depuis les réglages Produits & prix — jamais depuis le navigateur.

const settings = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));

// Fausse base : seuls les réglages sont lus (getSiteSetting → select…limit).
vi.mock("./queries/connection", () => ({
  getDb: () => ({
    select: () => ({
      from: () => ({
        where: (cond: { queryChunks?: unknown[] }) => ({
          limit: async () => {
            const key = (cond.queryChunks ?? [])
              .map((c) => (c as { value?: unknown })?.value)
              .find((v) => typeof v === "string" && v in settings.value) as string | undefined;
            return key ? [{ key, value: settings.value[key] }] : [];
          },
        }),
      }),
    }),
  }),
}));

const db = vi.hoisted(() => ({
  createOrder: vi.fn(async () => 42),
  createProject: vi.fn(async () => 100),
}));
vi.mock("./queries/orders", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./queries/orders")>()),
  ...db,
}));

const users = vi.hoisted(() => ({
  findUserByEmail: vi.fn(),
  createGuestUser: vi.fn(async ({ email }: { email: string }) => ({ id: 7, email, role: "user", authUserId: null })),
}));
vi.mock("./queries/users", () => users);
vi.mock("./queries/helpers", () => ({ logAudit: vi.fn(), actorOf: () => "customer:7" }));

const stripe = vi.hoisted(() => ({
  create: vi.fn(async (args: { amount: number }) => ({ id: "pi_test", client_secret: "secret", amount: args.amount })),
}));
vi.mock("./lib/stripe", () => ({
  isStripeConfigured: () => true,
  stripe: { paymentIntents: { create: stripe.create } },
}));
vi.mock("./lib/supabaseAdmin", () => ({ supabaseAdmin: {} }));

const { ordersRouter, TEMPLATE_PRICE_CENTS } = await import("./ordersRouter");
const { createCallerFactory } = await import("./middleware");
const { FALLBACK_PRODUCTS } = await import("./queries/orders");

let ip = 0;
function caller(user?: Record<string, unknown>) {
  // Une IP différente par test : le limiteur de débit (10/min/IP) ne doit
  // pas faire échouer les tests entre eux.
  const headers = new Headers({ "x-forwarded-for": `10.0.0.${++ip}` });
  return createCallerFactory(ordersRouter)({
    req: new Request("https://www.scrollthedate.com/api/trpc", { headers }),
    resHeaders: new Headers(),
    user: user as never,
  });
}

const guest = { email: "anna@exemple.fr", names: "Anna & Théo" };

beforeEach(() => {
  vi.clearAllMocks();
  settings.value = {};
  users.findUserByEmail.mockResolvedValue(undefined);
});

describe("orders.createCheckout — montants", () => {
  it("prend les prix réglés dans l'admin, options comprises", async () => {
    settings.value = {
      products: [
        { id: "FAIRE_PART", name: "Faire-part", priceCents: 31900 },
        { id: "SAVE_THE_DATE", name: "Save the Date", priceCents: 14900 },
      ],
      options: [
        { id: "revisions", label: "Révisions", priceCents: 6000 },
        { id: "sous-titres", label: "Sous-titres", priceCents: 4000 },
      ],
    };

    const res = await caller().createCheckout({
      ...guest,
      items: [{ product: "FAIRE_PART", optionIds: ["revisions", "sous-titres"] }],
    });

    expect(res.amountCents).toBe(31900 + 6000 + 4000);
    expect(stripe.create).toHaveBeenCalledWith(expect.objectContaining({ amount: 41900, currency: "eur" }));
  });

  it("ignore une option inconnue envoyée par le navigateur", async () => {
    const res = await caller().createCheckout({
      ...guest,
      items: [{ product: "SAVE_THE_DATE", optionIds: ["option-pirate"] }],
    });

    const std = FALLBACK_PRODUCTS.find((p) => p.id === "SAVE_THE_DATE")!;
    expect(res.amountCents).toBe(std.priceCents);
  });

  it("Save the Date sur modèle : prix fixe, options ignorées", async () => {
    const res = await caller().createCheckout({
      ...guest,
      items: [{ product: "SAVE_THE_DATE", templateSlug: "red-door", optionIds: ["revisions"] }],
    });

    expect(res.amountCents).toBe(TEMPLATE_PRICE_CENTS);
    expect(db.createProject).toHaveBeenCalledWith(
      expect.objectContaining({ templateSlug: "red-door", amountCents: TEMPLATE_PRICE_CENTS, options: [] }),
    );
  });

  it("panier à 2 produits : un seul paiement, une commande, deux projets", async () => {
    const res = await caller().createCheckout({
      ...guest,
      items: [
        { product: "SAVE_THE_DATE", templateSlug: "parchemin-rose" },
        { product: "FAIRE_PART" },
      ],
    });

    const fp = FALLBACK_PRODUCTS.find((p) => p.id === "FAIRE_PART")!;
    expect(res.amountCents).toBe(TEMPLATE_PRICE_CENTS + fp.priceCents);
    expect(stripe.create).toHaveBeenCalledTimes(1);
    expect(db.createOrder).toHaveBeenCalledTimes(1);
    expect(db.createProject).toHaveBeenCalledTimes(2);
    expect(db.createOrder).toHaveBeenCalledWith(expect.objectContaining({ paymentStatus: "pending" }));
  });
});

describe("orders.createCheckout — refus", () => {
  it("refuse un modèle inexistant", async () => {
    await expect(
      caller().createCheckout({ ...guest, items: [{ product: "SAVE_THE_DATE", templateSlug: "inconnu" }] }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(stripe.create).not.toHaveBeenCalled();
  });

  it("refuse un modèle sur un faire-part", async () => {
    await expect(
      caller().createCheckout({ ...guest, items: [{ product: "FAIRE_PART", templateSlug: "red-door" }] }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("exige un email pour un invité", async () => {
    await expect(caller().createCheckout({ items: [{ product: "FAIRE_PART" }] })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("refuse la commande invitée sur l'email d'un compte existant", async () => {
    users.findUserByEmail.mockResolvedValue({ id: 3, email: guest.email, role: "user", authUserId: "auth-3" });

    await expect(caller().createCheckout({ ...guest, items: [{ product: "FAIRE_PART" }] })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(stripe.create).not.toHaveBeenCalled();
  });

  it("refuse la commande invitée sur l'email d'un administrateur", async () => {
    users.findUserByEmail.mockResolvedValue({ id: 1, email: guest.email, role: "admin", authUserId: null });

    await expect(caller().createCheckout({ ...guest, items: [{ product: "FAIRE_PART" }] })).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("limite les tentatives répétées depuis une même adresse IP", async () => {
    const c = caller();
    for (let i = 0; i < 10; i++) await c.createCheckout({ ...guest, items: [{ product: "FAIRE_PART" }] });

    await expect(c.createCheckout({ ...guest, items: [{ product: "FAIRE_PART" }] })).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
  });
});
