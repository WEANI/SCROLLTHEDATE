import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  SAVE_THE_DATE_TEMPLATES,
  buildFulfillmentData,
  getSaveTheDateTemplate,
  parseTemplateOverrides,
} from "../../contracts/saveTheDateTemplates";

// Modèles Save the Date : ce que le webhook livre après paiement doit
// pointer vers des images qui existent vraiment dans public/.

const publicDir = path.resolve(import.meta.dirname, "../../public");
const frame = (baseUrl: string, n: number) =>
  path.join(publicDir, baseUrl, `${String(n).padStart(5, "0")}.jpg`);

describe("modèles Save the Date", () => {
  it("ont tous un slug unique", () => {
    const slugs = SAVE_THE_DATE_TEMPLATES.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  for (const t of SAVE_THE_DATE_TEMPLATES) {
    describe(t.slug, () => {
      it("livre la vidéo du modèle", () => {
        const { video, heroChapters } = buildFulfillmentData(t, undefined);
        expect(video.frameBaseUrl).toBe(t.frames.baseUrl);
        expect(video.frameCount).toBe(t.frames.count);
        expect(video.frameFps).toBe(t.frames.fps);
        expect(heroChapters).toHaveLength(2);
      });

      it("a toutes ses images dans public/ (première et dernière)", () => {
        expect(existsSync(frame(t.frames.baseUrl, 1))).toBe(true);
        expect(existsSync(frame(t.frames.baseUrl, t.frames.count))).toBe(true);
        expect(existsSync(frame(t.frames.baseUrl, t.frames.count + 1))).toBe(false);
      });
    });
  }

  it("getSaveTheDateTemplate refuse un slug inconnu", () => {
    expect(getSaveTheDateTemplate("inconnu")).toBeUndefined();
    expect(getSaveTheDateTemplate(undefined)).toBeUndefined();
  });
});

describe("parseTemplateOverrides", () => {
  it("tolère un réglage mal formé sans casser l'affichage", () => {
    expect(parseTemplateOverrides(null)).toEqual({});
    expect(parseTemplateOverrides("n'importe quoi")).toEqual({});
    expect(parseTemplateOverrides({ slug: "red-door" })).toEqual({});
  });

  it("indexe les réglages valides par slug et ignore les autres", () => {
    const out = parseTemplateOverrides([{ slug: "red-door", chapter1Text: "Réservez" }, null, 3, { pas: "de slug" }]);
    expect(Object.keys(out)).toEqual(["red-door"]);
    expect(out["red-door"]!.chapter1Text).toBe("Réservez");
  });
});
