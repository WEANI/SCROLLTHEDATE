import { beforeEach, describe, expect, it, vi } from "vitest";

// Photos clients : toute data URI image part dans Supabase Storage, seule
// l'URL reste en base. Une même photo = un seul fichier.

const storage = vi.hoisted(() => ({
  upload: vi.fn(async () => ({ error: null })),
}));
vi.mock("../lib/supabaseAdmin", () => ({
  supabaseAdmin: {
    storage: {
      from: () => ({
        upload: storage.upload,
        getPublicUrl: (p: string) => ({ data: { publicUrl: `https://cdn.test/videos/${p}` } }),
      }),
    },
  },
}));
vi.mock("../queries/connection", () => ({ getDb: vi.fn() }));

const { externalizeDataUris } = await import("../lib/photoStorage");

const jpeg = `data:image/jpeg;base64,${Buffer.from("photo-1").toString("base64")}`;
const png = `data:image/png;base64,${Buffer.from("photo-2").toString("base64")}`;

beforeEach(() => vi.clearAllMocks());

describe("externalizeDataUris", () => {
  it("remplace une photo par son URL Storage, cache d'un an", async () => {
    const url = await externalizeDataUris(12, jpeg);
    expect(url).toMatch(/^https:\/\/cdn\.test\/videos\/12\/photos\/[0-9a-f]{32}\.jpg$/);
    expect(storage.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^12\/photos\/.+\.jpg$/),
      Buffer.from("photo-1"),
      expect.objectContaining({ contentType: "image/jpeg", cacheControl: "31536000" }),
    );
  });

  it("parcourt les réponses du questionnaire sans toucher au texte", async () => {
    const out = await externalizeDataUris(12, {
      "couple.prenoms": "Anna & Théo",
      q_photo: png,
      galerie: [jpeg, "https://deja.en/ligne.jpg"],
      nombre: 3,
    });
    expect(out["couple.prenoms"]).toBe("Anna & Théo");
    expect(out.q_photo).toMatch(/\.png$/);
    expect(out.galerie[0]).toMatch(/\.jpg$/);
    expect(out.galerie[1]).toBe("https://deja.en/ligne.jpg");
    expect(out.nombre).toBe(3);
  });

  it("donne la même adresse à la même photo envoyée deux fois", async () => {
    const [a, b] = [await externalizeDataUris(12, jpeg), await externalizeDataUris(12, jpeg)];
    expect(a).toBe(b);
  });

  it("laisse les notes vocales et le texte tels quels", async () => {
    const audio = "data:audio/webm;base64,AAAA";
    expect(await externalizeDataUris(12, audio)).toBe(audio);
    expect(await externalizeDataUris(12, "data:image/png,pas-en-base64")).toBe("data:image/png,pas-en-base64");
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it("signale un envoi échoué au lieu de perdre la photo", async () => {
    storage.upload.mockResolvedValueOnce({ error: { message: "quota" } } as never);
    await expect(externalizeDataUris(12, jpeg)).rejects.toThrow("quota");
  });
});
