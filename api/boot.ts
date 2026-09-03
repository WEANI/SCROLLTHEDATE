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
import { ensureVideosBucket, uploadVideo } from "./lib/supabaseStorage";
import { supabaseAdmin } from "./lib/supabaseAdmin";
import { findUserByAuthId } from "./queries/users";

bootstrapDatabase();
ensureVideosBucket();
warnIfEmailMisconfigured();
warnIfStripeMisconfigured();

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

// Healthcheck plateforme (Railway) : ne touche pas la DB, doit répondre vite
// même si Supabase est temporairement indisponible. Sous /api/ pour rester
// routé vers Hono aussi bien en dev (plugin @hono/vite-dev-server) qu'en prod.
app.get("/api/health", (c) => c.json({ ok: true }));

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
// la taille de 33 % (un fichier de 37 Mo franchirait le body limit de 50 Mo).
app.post("/api/upload/video", async (c) => {
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
  if (!(file instanceof File)) return c.json({ error: "Fichier manquant" }, 400);
  if (!projectId) return c.json({ error: "projectId manquant" }, 400);
  if (!file.type.startsWith("video/")) return c.json({ error: "Le fichier doit être une vidéo" }, 400);

  // 3. Upload vers Supabase Storage
  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await uploadVideo(Number(projectId), file.name, buffer, file.type);
  return c.json({ url });
});

app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

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
