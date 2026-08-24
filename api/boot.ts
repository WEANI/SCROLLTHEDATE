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

bootstrapDatabase();
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
