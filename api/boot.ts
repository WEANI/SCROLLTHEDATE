import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { bootstrapDatabase } from "./db-bootstrap";
import { warnIfEmailMisconfigured } from "./lib/email";
import { warnIfStripeMisconfigured } from "./lib/stripe";
import { handleStripeWebhook } from "./webhooks/stripe";
import { ensureVideosBucket, MAX_VIDEO_BYTES, uploadVideo, uploadVideoFrames } from "./lib/supabaseStorage";
import { extractFrames } from "./lib/videoFrames";
import { supabaseAdmin } from "./lib/supabaseAdmin";
import { findUserByAuthId } from "./queries/users";

bootstrapDatabase();
ensureVideosBucket();
warnIfEmailMisconfigured();
warnIfStripeMisconfigured();

const app = new Hono<{ Bindings: HttpBindings }>();

// Healthcheck plateforme (Railway) : ne touche pas la DB, doit répondre vite
// même si Supabase est temporairement indisponible. Sous /api/ pour rester
// routé vers Hono aussi bien en dev (plugin @hono/vite-dev-server) qu'en prod.
app.get("/api/health", (c) => c.json({ ok: true }));

// Limite de taille du corps — 50 Mo, mais scopée à /api/trpc/* uniquement
// (JSON : les photos y transitent encore en dataURI base64, dont le
// gonflement de +33 % doit rester couvert). Était globale avant ce
// commentaire, donc appliquée aussi à /api/upload/video ci-dessous — sa
// toute raison d'être est justement de dépasser cette limite pour un
// fichier vidéo brut (pas de gonflement base64 ici) : une vidéo de plus de
// 50 Mo (fréquent, cf. le body de retour Studio admin) coupait la
// connexion en plein transfert, remontant côté navigateur comme un vague
// "Erreur réseau" plutôt qu'un message clair sur la taille du fichier.
app.use(
  "/api/trpc/*",
  bodyLimit({
    maxSize: 50 * 1024 * 1024,
    onError: (c) => c.json({ error: "Fichier trop volumineux" }, 413),
  }),
);

app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});

// Route Hono brute (pas une procédure tRPC) : la vérification de signature
// Stripe exige le corps de requête BRUT, incompatible avec le parsing JSON
// automatique de tRPC. Doit rester avant le catch-all /api/* ci-dessous.
app.post("/api/webhooks/stripe", handleStripeWebhook);

// Upload vidéo (multipart) — réservé aux admins. Route brute comme le
// webhook Stripe : tRPC ne gère pas le multipart, et le base64 gonflerait
// la taille de 33 % (un fichier de 37 Mo franchirait le body limit de 50
// Mo). Limite propre à cette route (500 Mo) — largement au-dessus d'un
// montage de 40-60 s même en haute qualité, cf. onError ci-dessus pour le
// bug que cette même limite, globale, provoquait avant.
app.post(
  "/api/upload/video",
  bodyLimit({
    maxSize: MAX_VIDEO_BYTES,
    onError: (c) => c.json({ error: "Vidéo trop volumineuse (500 Mo max)" }, 413),
  }),
  async (c) => {
    // 1. Auth — même logique que context.ts / authenticateRequest
    const authHeader = c.req.header("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return c.json({ error: "Non authentifié" }, 401);
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) return c.json({ error: "Token invalide" }, 401);
    const user = await findUserByAuthId(data.user.id);
    if (!user || user.role !== "admin") return c.json({ error: "Accès refusé" }, 403);

    // 2. Multipart
    const formData = await c.req.formData();
    const file = formData.get("file");
    const projectId = formData.get("projectId");
    // "frames" (défaut, recommandé) découpe la vidéo en séquence d'images
    // — cf. api/lib/videoFrames.ts pour pourquoi. "video" garde l'ancien
    // comportement (un seul fichier), utile en repli/comparaison.
    const mode = formData.get("mode") === "video" ? "video" : "frames";
    if (!(file instanceof File)) return c.json({ error: "Fichier manquant" }, 400);
    if (!projectId) return c.json({ error: "projectId manquant" }, 400);
    if (!file.type.startsWith("video/")) return c.json({ error: "Le fichier doit être une vidéo" }, 400);

    // 3. Upload vers Supabase Storage — try/catch explicite : une exception
    // laissée remonter ici (avant ce commentaire) atterrissait sur le
    // gestionnaire d'erreur PAR DÉFAUT de Hono, qui répond en texte brut,
    // pas en JSON. Le client (StudioPanel.tsx) fait un `JSON.parse` du
    // corps de réponse quel que soit le status HTTP — sur du texte brut,
    // ce parse lève une exception À L'INTÉRIEUR du callback `xhr.onload`,
    // qui ne rejette jamais la Promise englobante (un throw dans un
    // gestionnaire d'événement ne se propage pas ainsi) : le bouton
    // "Ajouter & envoyer" restait bloqué en chargement indéfiniment, sans
    // le moindre message d'erreur, même quand l'échec réel (ex. vidéo
    // au-delà de la limite Supabase Storage) était par ailleurs correct.
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      if (mode === "video") {
        const url = await uploadVideo(Number(projectId), file.name, buffer, file.type);
        return c.json({ kind: "video" as const, url });
      }
      const { frames, fps } = await extractFrames(buffer);
      const { count, baseUrl } = await uploadVideoFrames(Number(projectId), frames);
      return c.json({ kind: "frames" as const, frameCount: count, frameFps: fps, frameBaseUrl: baseUrl });
    } catch (err) {
      console.error("[upload/video] échec :", err);
      return c.json(
        { error: err instanceof Error ? err.message : "Upload échoué" },
        502,
      );
    }
  },
);

app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

// Filet de sécurité global : toute exception non rattrapée ailleurs (pas
// seulement /api/upload/video ci-dessus) répond en JSON propre plutôt que
// via la page d'erreur par défaut de Hono (texte brut) — même raison que
// le try/catch ci-dessus, généralisée à toute l'API.
app.onError((err, c) => {
  console.error("[api] exception non rattrapée :", err);
  return c.json({ error: "Erreur serveur" }, 500);
});

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
