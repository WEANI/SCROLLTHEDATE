import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "hono";

// Webhook Stripe : la commande ne doit passer "paid" qu'une fois tout livré,
// et un rejeu de Stripe après une erreur doit reprendre sans livrer deux fois.

const calls: string[] = [];
const track = (name: string, impl?: (...a: unknown[]) => unknown) =>
  vi.fn(async (...a: unknown[]) => {
    calls.push(name);
    return impl?.(...a);
  });

const m = vi.hoisted(() => ({
  event: null as unknown,
  constructEvent: null as unknown as (...a: unknown[]) => unknown,
}));

vi.mock("../lib/stripe", () => ({
  isStripeConfigured: () => true,
  stripe: {
    webhooks: {
      constructEvent: (...a: unknown[]) => m.constructEvent(...a),
    },
  },
}));
vi.mock("../lib/env", () => ({
  env: { stripeWebhookSecret: "whsec_test", appUrl: "https://www.scrollthedate.com" },
}));

const orders = vi.hoisted(() => ({
  findOrderByStripeRef: vi.fn(),
  findUserById: vi.fn(),
  getSiteSetting: vi.fn(),
  updateOrderPaymentStatus: vi.fn(),
}));
vi.mock("../queries/orders", () => orders);

const projects = vi.hoisted(() => ({
  updateProjectStatus: vi.fn(),
  updateProjectPalette: vi.fn(),
  updateProjectHeroChapters: vi.fn(),
  updateProjectHeroCustomCards: vi.fn(),
}));
vi.mock("../queries/projects", () => projects);

const domain = vi.hoisted(() => ({ addVideoVersion: vi.fn() }));
vi.mock("../queries/domain", () => domain);

vi.mock("../queries/questionnaire", () => ({
  upsertQuestionnaire: vi.fn(),
  markQuestionnaireSubmitted: vi.fn(),
}));
vi.mock("../queries/helpers", () => ({ logAudit: vi.fn(), notifyUser: vi.fn() }));

const email = vi.hoisted(() => ({ sendEmail: vi.fn() }));
vi.mock("../lib/email", () => email);
vi.mock("../lib/emailTemplates", () => ({
  orderConfirmationEmail: (x: unknown) => x,
}));
vi.mock("../lib/guestAccount", () => ({ provisionAccountForGuest: vi.fn(async () => null) }));

const { handleStripeWebhook } = await import("./stripe");

function fakeContext() {
  return {
    req: { header: () => "t=1,v1=sig", text: async () => "{}" },
    json: (body: unknown, status = 200) => ({ body, status }),
  } as unknown as Context;
}

function succeeded(id = "pi_1") {
  return {
    type: "payment_intent.succeeded",
    data: { object: { id, metadata: { names: "Anna & Théo" } } },
  };
}

function order(overrides: Record<string, unknown> = {}, projectOverrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    userId: 7,
    amountCents: 9900,
    paymentStatus: "pending",
    createdAt: new Date("2026-11-14T10:00:00Z"),
    projects: [
      {
        id: 100,
        slug: "anna-theo-abc123",
        product: "SAVE_THE_DATE",
        amountCents: 9900,
        templateSlug: "red-door",
        status: "ONBOARDING",
        ...projectOverrides,
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  calls.length = 0;
  m.event = succeeded();
  m.constructEvent = vi.fn(() => m.event);
  orders.findUserById.mockResolvedValue({ id: 7, email: "anna@exemple.fr", authUserId: "auth-7" });
  orders.getSiteSetting.mockResolvedValue(null);
  orders.updateOrderPaymentStatus.mockImplementation(track("paid"));
  projects.updateProjectStatus.mockImplementation(track("delivered"));
  domain.addVideoVersion.mockImplementation(track("video"));
  email.sendEmail.mockImplementation(track("email"));
});

describe("webhook Stripe — paiement réussi", () => {
  it("livre le modèle, envoie l'email, puis marque la commande payée en dernier", async () => {
    orders.findOrderByStripeRef.mockResolvedValue(order());

    const res = (await handleStripeWebhook(fakeContext())) as unknown as { status: number };

    expect(res.status).toBe(200);
    expect(calls).toEqual(["video", "delivered", "email", "paid"]);
    expect(orders.updateOrderPaymentStatus).toHaveBeenCalledWith(42, "paid");
    const mail = email.sendEmail.mock.calls[0]![0] as { items: { publicUrl?: string }[] };
    expect(mail.items[0]!.publicUrl).toBe("https://www.scrollthedate.com/faire-part/anna-theo-abc123");
  });

  it("ne marque PAS la commande payée si la livraison échoue (Stripe pourra rejouer)", async () => {
    orders.findOrderByStripeRef.mockResolvedValue(order());
    domain.addVideoVersion.mockRejectedValue(new Error("base injoignable"));

    await expect(handleStripeWebhook(fakeContext())).rejects.toThrow("base injoignable");
    expect(orders.updateOrderPaymentStatus).not.toHaveBeenCalled();
    expect(email.sendEmail).not.toHaveBeenCalled();
  });

  it("au rejeu, ne relivre pas un projet déjà livré mais finit le traitement", async () => {
    orders.findOrderByStripeRef.mockResolvedValue(order({}, { status: "DELIVERED" }));

    await handleStripeWebhook(fakeContext());

    expect(domain.addVideoVersion).not.toHaveBeenCalled();
    expect(projects.updateProjectStatus).not.toHaveBeenCalled();
    expect(calls).toEqual(["email", "paid"]);
    const mail = email.sendEmail.mock.calls[0]![0] as { items: { publicUrl?: string }[] };
    expect(mail.items[0]!.publicUrl).toContain("/faire-part/anna-theo-abc123");
  });

  it("ne refait rien pour une commande déjà payée", async () => {
    orders.findOrderByStripeRef.mockResolvedValue(order({ paymentStatus: "paid" }));

    await handleStripeWebhook(fakeContext());

    expect(calls).toEqual([]);
  });

  it("projet sur mesure : aucune livraison automatique, email puis payé", async () => {
    orders.findOrderByStripeRef.mockResolvedValue(
      order({ amountCents: 29900 }, { templateSlug: null, product: "FAIRE_PART", amountCents: 29900 }),
    );

    await handleStripeWebhook(fakeContext());

    expect(calls).toEqual(["email", "paid"]);
  });

  it("ignore un paiement sans commande correspondante", async () => {
    orders.findOrderByStripeRef.mockResolvedValue(undefined);

    const res = (await handleStripeWebhook(fakeContext())) as unknown as { status: number };

    expect(res.status).toBe(200);
    expect(calls).toEqual([]);
  });
});

describe("webhook Stripe — autres cas", () => {
  it("refuse une signature invalide", async () => {
    m.constructEvent = vi.fn(() => {
      throw new Error("bad signature");
    });

    const res = (await handleStripeWebhook(fakeContext())) as unknown as { status: number };

    expect(res.status).toBe(400);
    expect(orders.findOrderByStripeRef).not.toHaveBeenCalled();
  });

  it("un échec de paiement ne fait pas régresser une commande déjà payée", async () => {
    m.event = { type: "payment_intent.payment_failed", data: { object: { id: "pi_1" } } };
    orders.findOrderByStripeRef.mockResolvedValue(order({ paymentStatus: "paid" }));

    await handleStripeWebhook(fakeContext());

    expect(orders.updateOrderPaymentStatus).not.toHaveBeenCalled();
  });

  it("un échec de paiement marque une commande en attente comme échouée", async () => {
    m.event = {
      type: "payment_intent.payment_failed",
      data: { object: { id: "pi_1", last_payment_error: { message: "carte refusée" } } },
    };
    orders.findOrderByStripeRef.mockResolvedValue(order());

    await handleStripeWebhook(fakeContext());

    expect(orders.updateOrderPaymentStatus).toHaveBeenCalledWith(42, "failed");
  });
});
