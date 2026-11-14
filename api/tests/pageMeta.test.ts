import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

// Ce que reçoivent Google et les aperçus de liens, dès le HTML.

vi.mock("../queries/projects", () => ({ findProjectBySlug: vi.fn(async () => undefined) }));
vi.mock("../queries/domain", () => ({ findVideosByProject: vi.fn(async () => []) }));
vi.mock("../queries/orders", () => ({
  FALLBACK_PRODUCTS: [
    { id: "FAIRE_PART", name: "Faire-part", priceCents: 29900 },
    { id: "SAVE_THE_DATE", name: "Save the Date", priceCents: 14900 },
  ],
  // Prix « réglés dans l'admin » différents des valeurs de repli, pour
  // vérifier qu'ils sont bien ceux qui apparaissent.
  getSiteSetting: vi.fn(async () => [
    { id: "FAIRE_PART", name: "Faire-part", priceCents: 32900 },
    { id: "SAVE_THE_DATE", name: "Save the Date", priceCents: 15900 },
  ]),
}));

const { buildPageHtml } = await import("../lib/pageMeta");
const baseHtml = readFileSync(path.resolve(import.meta.dirname, "../../index.html"), "utf-8");
const origin = "https://www.scrollthedate.com";
const page = (p: string) => buildPageHtml(baseHtml, p, origin);
const title = (html: string) => html.match(/<title>([^<]*)<\/title>/)?.[1];

describe("pages publiques", () => {
  it.each(["/", "/offres", "/save-the-date-modeles", "/save-the-date-modeles/red-door", "/demo"])(
    "%s est indexable, avec son adresse de référence",
    async (p) => {
      const { html, status } = await page(p);
      expect(status).toBe(200);
      expect(html).not.toContain('name="robots" content="noindex"');
      expect(html).toContain(`<link rel="canonical" href="${origin}${p === "/" ? "/" : p}" />`);
    },
  );

  it("/demo a son propre titre, pas celui de l'accueil", async () => {
    const [demo, home] = await Promise.all([page("/demo"), page("/")]);
    expect(title(demo.html)).toContain("démo");
    expect(title(demo.html)).not.toBe(title(home.html));
  });

  it("l'accueil expose ses questions fréquentes à Google", async () => {
    const { html } = await page("/");
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]!));
    const faq = blocks.find((b) => b["@type"] === "FAQPage");
    expect(faq.mainEntity).toHaveLength(5);
    expect(faq.mainEntity[0].name).toMatch(/\?$/);
    expect(faq.mainEntity[0].acceptedAnswer.text.length).toBeGreaterThan(20);
  });

  it("seul l'accueil porte la FAQ", async () => {
    const { html } = await page("/offres");
    expect(html).not.toContain("FAQPage");
  });
});

describe("pages privées et faire-part", () => {
  it.each(["/admin", "/admin/projets", "/espace", "/login", "/commander", "/merci", "/definir-mot-de-passe", "/demofairepart", "/faire-part/anna-theo"])(
    "%s est exclue de Google, sans adresse de référence",
    async (p) => {
      const { html } = await page(p);
      expect(html).toContain('<meta name="robots" content="noindex" />');
      expect(html).not.toContain('rel="canonical"');
    },
  );

  it("une adresse inconnue répond 404 et noindex", async () => {
    const { html, status } = await page("/nimporte-quoi");
    expect(status).toBe(404);
    expect(html).toContain('content="noindex"');
  });
});

describe("prix dans les titres Google", () => {
  it("affiche les prix réglés dans l'admin, jamais un {modèle} non remplacé", async () => {
    const { html: std } = await page("/save-the-date-digital");
    const { html: fp } = await page("/faire-part-digital");
    const { html: tpl } = await page("/save-the-date-modeles");
    const { html: offres } = await page("/offres");
    expect(title(std)).toBe("Save the Date vidéo mariage — 159 € | Scroll The Date");
    expect(title(fp)).toBe("Faire-part mariage digital vidéo — 329 € | Scroll The Date");
    expect(title(tpl)).toBe("Modèles save the date vidéo — 99 € | Scroll The Date");
    for (const h of [std, fp, tpl, offres]) expect(h).not.toMatch(/\{(std|fp|modele)\}/);
    expect(offres).toContain("sur mesure à 159 €");
  });

  it("tous les titres des pages vitrine tiennent en 60 caractères", async () => {
    for (const p of ["/", "/offres", "/save-the-date-digital", "/faire-part-digital", "/save-the-date-modeles"]) {
      const t = title((await page(p)).html)!.replace(/&amp;/g, "&");
      expect(t.length, `${p} : ${t}`).toBeLessThanOrEqual(60);
    }
  });
});
