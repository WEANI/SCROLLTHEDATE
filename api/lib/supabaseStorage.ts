import { supabaseAdmin } from "./supabaseAdmin";
import type { ExtractedFrame } from "./videoFrames";

const BUCKET = "videos";
// Doit rester ≥ la limite de /api/upload/video (cf. api/boot.ts) — un
// bucket dont le fileSizeLimit est plus bas que la limite côté serveur
// rejette silencieusement (ou fait tourner indéfiniment le client selon
// le SDK) toute vidéo entre les deux plafonds, sans que le serveur n'y
// soit pour quoi que ce soit.
export const MAX_VIDEO_BYTES = 500 * 1024 * 1024;

/**
 * Crée le bucket "videos" sur Supabase Storage si absent.
 * Idempotent — appelé au démarrage du serveur (boot.ts).
 */
export async function ensureVideosBucket() {
  const { error } = await supabaseAdmin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_VIDEO_BYTES,
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
    // `cacheControl` : sans lui, Supabase applique son défaut (1h) — beaucoup
    // trop court pour un fichier qui ne change jamais une fois livré (le
    // chemin inclut déjà `Date.now()`, une nouvelle version = un nouveau
    // chemin, jamais une réécriture). Un cache de 1h fait retélécharger
    // l'intégralité de la vidéo/des frames à chaque invité qui rouvre un
    // faire-part plus d'une heure après sa dernière visite — cause
    // probable du dépassement du quota "egress" Supabase constaté le
    // 13/09/2026 (17 Go transférés pour 40 Mo réellement stockés). 1 an,
    // comme pour tout asset immuable.
    .upload(path, fileBuffer, { contentType, upsert: false, cacheControl: "31536000" });
  if (error) throw new Error(`Upload échoué : ${error.message}`);
  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Upload une séquence de frames (cf. api/lib/videoFrames.ts) — jamais un
 * seul gros fichier : `CONCURRENCY` uploads en parallèle, chacun de
 * quelques dizaines de Ko, tous largement sous la limite du bucket.
 * Nom de fichier 1-indexé, `%05d.jpg` (`00001.jpg`…) pour trier correctement
 * au-delà de 9999 images sans dépendre d'un tri numérique côté client.
 */
export async function uploadVideoFrames(
  projectId: number,
  frames: ExtractedFrame[],
): Promise<{ count: number; baseUrl: string }> {
  // `Date.now()` plutôt que le n° de version : cette fonction s'exécute
  // avant que la version ne soit connue (calculée ensuite par
  // videosRouter.adminAddVersion) — même convention d'unicité que
  // `uploadVideo` ci-dessus pour le mode "video".
  const prefix = `${projectId}/${Date.now()}/frames`;
  const CONCURRENCY = 8;
  let cursor = 0;

  async function worker() {
    while (cursor < frames.length) {
      const frame = frames[cursor++];
      const name = `${String(frame.index + 1).padStart(5, "0")}.jpg`;
      const { error } = await supabaseAdmin.storage
        .from(BUCKET)
        // cf. doc de `cacheControl` sur `uploadVideo` ci-dessus — même
        // raisonnement, encore plus sensible ici (jusqu'à ~500 requêtes
        // par visionnage au lieu d'une seule pour un fichier vidéo unique).
        .upload(`${prefix}/${name}`, frame.buffer, {
          contentType: "image/jpeg",
          upsert: true,
          cacheControl: "31536000",
        });
      if (error) throw new Error(`Upload de l'image ${name} échoué : ${error.message}`);
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, frames.length) }, worker));

  // `getPublicUrl` sur un préfixe (pas un vrai fichier) renvoie tout de
  // même l'URL de base attendue — le client y ajoute lui-même `NNNNN.jpg`
  // (cf. FrameScrubPlayer, un préfixe commun plutôt qu'une liste d'URLs
  // complètes, plus compact à stocker/transmettre pour ~500 images).
  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(`${prefix}/`);
  return { count: frames.length, baseUrl: data.publicUrl };
}
