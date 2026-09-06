import { spawn } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ffmpegPath from "ffmpeg-static";

/**
 * Découpage vidéo → séquence d'images JPEG, alternative au fichier vidéo
 * unique pour le hero scrub (échange du 06/09/2026, cf. VideoManager dans
 * StudioPanel.tsx). Deux raisons :
 *
 * 1. Supabase Storage plafonne la taille d'un fichier — un film de 40-60 s
 *    en bonne qualité la dépasse facilement. Une séquence d'images, elle,
 *    n'a jamais un seul gros fichier : chaque image pèse quelques dizaines
 *    de Ko.
 * 2. Ça élimine toute la classe de bugs de lecture <video> rencontrés en
 *    conditions réelles cette même session (frame noire iOS au-delà du
 *    buffer, mise en mémoire tampon qui bloque le scroll, position du moov
 *    atom…) : un <canvas> qui affiche une image chargée (ou la dernière
 *    chargée, sinon) n'a aucune de ces subtilités de seek.
 *
 * `FRAME_FPS` volontairement plus bas que la vidéo source : suffisant pour
 * un scrub perçu comme fluide au doigt/à la molette, et ça divise par 2-3
 * le nombre de fichiers (donc le temps d'upload et de préchargement côté
 * client) par rapport à un découpage à 24-30 im/s.
 */
export const FRAME_FPS = 12;
const FRAME_HEIGHT = 1080;
/** Qualité JPEG ffmpeg : 2 (meilleure) à 31 (pire) — 5 reste net à l'écran tout en gardant des fichiers légers. */
const JPEG_QUALITY = 5;

export interface ExtractedFrame {
  /** 0-indexé — le nom de fichier final (1-indexé, `%05d.jpg`) vaut `index + 1`. */
  index: number;
  buffer: Buffer;
}

export interface FrameExtractionResult {
  frames: ExtractedFrame[];
  fps: number;
}

/**
 * Lance ffmpeg sur un fichier temporaire, relit les images extraites en
 * mémoire, puis nettoie le dossier temporaire — jamais de fichier laissé
 * derrière, y compris en cas d'échec (`finally`).
 */
export async function extractFrames(videoBuffer: Buffer): Promise<FrameExtractionResult> {
  if (!ffmpegPath) throw new Error("ffmpeg introuvable (ffmpeg-static)");
  const dir = await mkdtemp(join(tmpdir(), "video-frames-"));
  const inputPath = join(dir, "input.mp4");
  const pattern = join(dir, "%05d.jpg");
  await writeFile(inputPath, videoBuffer);

  try {
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(ffmpegPath as string, [
        "-y",
        "-i",
        inputPath,
        // scale=-2:H : hauteur fixée, largeur automatique (arrondie au
        // pair, requis par certains encodeurs — sans effet ici mais
        // convention sûre) — les vidéos du produit sont toutes au format
        // vertical 9:16, cf. doc du composant appelant.
        "-vf",
        `fps=${FRAME_FPS},scale=-2:${FRAME_HEIGHT}`,
        "-q:v",
        String(JPEG_QUALITY),
        pattern,
      ]);
      let stderr = "";
      proc.stderr.on("data", (d: Buffer) => {
        stderr += d.toString();
      });
      proc.on("error", reject);
      proc.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg a échoué (code ${code}) : ${stderr.slice(-2000)}`));
      });
    });

    const files = (await readdir(dir)).filter((f) => f.endsWith(".jpg")).sort();
    if (files.length === 0) {
      throw new Error("Aucune image extraite — le fichier est-il une vidéo valide ?");
    }

    const frames: ExtractedFrame[] = [];
    for (let i = 0; i < files.length; i++) {
      const buffer = await readFile(join(dir, files[i]));
      frames.push({ index: i, buffer });
    }

    return { frames, fps: FRAME_FPS };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
