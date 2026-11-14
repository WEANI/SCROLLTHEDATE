import { beforeEach, describe, expect, it, vi } from "vitest";

// rsvp.submit : formulaire public sans compte — borné et limité en débit.

const project = { id: 5, slug: "anna-theo-abc", status: "DELIVERED", rsvpConfig: { enabled: true } };
const q = vi.hoisted(() => ({
  findProjectBySlug: vi.fn(),
  addRsvpResponse: vi.fn(async () => 1),
}));
vi.mock("../queries/projects", () => ({ findProjectBySlug: q.findProjectBySlug }));
vi.mock("../queries/domain", () => ({
  addRsvpResponse: q.addRsvpResponse,
  findRsvpConfig: vi.fn(),
  findRsvpResponsesByProject: vi.fn(),
  findRsvpStats: vi.fn(),
  upsertRsvpConfig: vi.fn(),
}));
vi.mock("../queries/helpers", () => ({ actorOf: vi.fn(), findProjectForUser: vi.fn(), logAudit: vi.fn() }));

const { rsvpRouter } = await import("../rsvpRouter");
const { createCallerFactory } = await import("../middleware");

let ip = 0;
const caller = (fixedIp?: string) =>
  createCallerFactory(rsvpRouter)({
    req: new Request("https://www.scrollthedate.com", {
      headers: { "x-forwarded-for": fixedIp ?? `10.1.0.${++ip}` },
    }),
    resHeaders: new Headers(),
  });

const answer = { slug: project.slug, guestName: "Claire", attending: "yes" as const, adults: 2, children: 1 };

beforeEach(() => {
  vi.clearAllMocks();
  q.findProjectBySlug.mockResolvedValue(project);
});

describe("rsvp.submit", () => {
  it("enregistre une réponse et calcule les accompagnants", async () => {
    await caller().submit(answer);
    expect(q.addRsvpResponse).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 5, guestName: "Claire", adults: 2, children: 1, plusOnes: 2 }),
    );
  });

  it("refuse quand les réponses sont fermées", async () => {
    q.findProjectBySlug.mockResolvedValue({ ...project, rsvpConfig: { enabled: false } });
    await expect(caller().submit(answer)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refuse un faire-part inexistant", async () => {
    q.findProjectBySlug.mockResolvedValue(undefined);
    await expect(caller().submit(answer)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("refuse un nom vide et des textes démesurés", async () => {
    await expect(caller().submit({ ...answer, guestName: "   " })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller().submit({ ...answer, message: "x".repeat(5001) })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    await expect(caller().submit({ ...answer, allergies: "x".repeat(2001) })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(q.addRsvpResponse).not.toHaveBeenCalled();
  });

  it("bloque au-delà de 20 réponses en 10 minutes depuis la même adresse", async () => {
    const c = caller("10.9.9.9");
    for (let i = 0; i < 20; i++) await c.submit(answer);
    await expect(c.submit(answer)).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
  });
});
