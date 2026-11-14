import { createHash } from "node:crypto";
import { eq, like, sql } from "drizzle-orm";
import { media, questionnaires } from "@db/schema";
import { getDb } from "../queries/connection";
import { supabaseAdmin } from "./supabaseAdmin";

const BUCKET = "videos";
const DATA_URI = /^data:((?:image|video)\/[a-zA-Z0-9.+-]+);base64,(.+)$/s;

/**
 * Photos (et vidéos) des clients : envoyées par le navigateur en data URI,
 * elles étaient stockées telles quelles dans la base (JSONB `answers`,
 * colonne `media.url`) — jusqu'à 1,7 Mo de texte par photo. Chaque
 * ouverture d'un faire-part (rsvp.getPublic renvoie `answers`) relisait
 * alors plusieurs Mo depuis Postgres, sans aucun cache : c'est ce trafic
 * qui consommait le quota « egress » Supabase, et qui aurait rempli la base
 * (500 Mo en offre gratuite) vers 120 faire-part.
 *
 * Ici, chaque data URI part dans Supabase Storage (servi par CDN, cache
 * d'un an comme les frames vidéo) et seule son URL publique reste en base.
 * Chemin = hash du contenu : renvoyer la même photo ne crée pas de doublon.
 */
async function uploadDataUri(projectId: number, dataUri: string): Promise<string> {
  const m = DATA_URI.exec(dataUri);
  if (!m) return dataUri;
  const mime = m[1]!.toLowerCase();
  const buffer = Buffer.from(m[2]!, "base64");
  const sub = mime.split("/")[1]!.split("+")[0]!;
  const ext = sub === "jpeg" ? "jpg" : sub.replace(/[^a-z0-9]/g, "") || "bin";
  const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 32);
  const path = `${projectId}/photos/${hash}.${ext}`;
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: mime, upsert: true, cacheControl: "31536000" });
  if (error) throw new Error(`Envoi de la photo échoué : ${error.message}`);
  return supabaseAdmin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Remplace récursivement toute data URI image/vidéo d'une valeur (chaîne, tableau, objet) par son URL Storage. */
export async function externalizeDataUris<T>(projectId: number, value: T): Promise<T> {
  if (typeof value === "string") {
    return (DATA_URI.test(value) ? await uploadDataUri(projectId, value) : value) as T;
  }
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (const v of value) out.push(await externalizeDataUris(projectId, v));
    return out as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = await externalizeDataUris(projectId, v);
    return out as T;
  }
  return value;
}

/**
 * Rattrapage des photos enregistrées avant ce fichier — lancé au démarrage
 * du serveur (cf. boot.ts), en tâche de fond. Idempotent : ne touche que les
 * lignes contenant encore une data URI, ne fait rien une fois tout converti.
 */
export async function externalizeLegacyPhotos() {
  if (!process.env.DATABASE_URL) return;
  try {
    const db = getDb();
    const qRows = await db
      .select({ id: questionnaires.id, projectId: questionnaires.projectId, answers: questionnaires.answers })
      .from(questionnaires)
      .where(sql`${questionnaires.answers}::text like '%data:image/%'`);
    for (const row of qRows) {
      const answers = await externalizeDataUris(row.projectId, row.answers);
      await db.update(questionnaires).set({ answers }).where(eq(questionnaires.id, row.id));
    }
    const mRows = await db
      .select({ id: media.id, projectId: media.projectId, url: media.url })
      .from(media)
      .where(like(media.url, "data:%"));
    for (const row of mRows) {
      const url = await externalizeDataUris(row.projectId, row.url);
      if (url !== row.url) await db.update(media).set({ url }).where(eq(media.id, row.id));
    }
    if (qRows.length || mRows.length) {
      console.log(`[photos] ${qRows.length} questionnaire(s) et ${mRows.length} média(s) déplacés vers Storage`);
    }
  } catch (err) {
    console.warn("[photos] rattrapage interrompu :", err instanceof Error ? err.message : err);
  }
}
