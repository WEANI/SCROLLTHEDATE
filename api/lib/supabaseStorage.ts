import { supabaseAdmin } from "./supabaseAdmin";

const BUCKET = "videos";

/**
 * Crée le bucket "videos" sur Supabase Storage si absent.
 * Idempotent — appelé au démarrage du serveur (boot.ts).
 */
export async function ensureVideosBucket() {
  const { error } = await supabaseAdmin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 50 * 1024 * 1024,
  });
  // 409 = bucket existe déjà, attendu en fonctionnement normal.
  if (error && !error.message?.includes("already exists")) {
    console.warn(`[storage] impossible de créer le bucket "${BUCKET}" :`, error.message);
  }
}

/**
 * Upload un fichier vidéo dans le bucket et renvoie l'URL publique.
 */
export async function uploadVideo(
  projectId: number,
  filename: string,
  fileBuffer: Buffer,
  contentType: string,
): Promise<string> {
  const path = `${projectId}/${Date.now()}-${filename}`;
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, fileBuffer, { contentType, upsert: false });
  if (error) throw new Error(`Upload échoué : ${error.message}`);
  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
