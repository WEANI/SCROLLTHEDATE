import type { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "fs";
import path from "path";

type App = Hono<{ Bindings: HttpBindings }>;

export function serveStaticFiles(app: App) {
  const distPath = path.resolve(import.meta.dirname, "../dist/public");

  /**
   * En-têtes de cache — AUCUN n'était envoyé auparavant (ni Cache-Control,
   * ni ETag, ni Last-Modified), laissant le navigateur appliquer son cache
   * heuristique à index.html. Conséquence observée en production le
   * 31/08/2026 : après un déploiement, un visiteur déjà venu continuait
   * d'exécuter l'ANCIEN bundle depuis son cache (a fait croire à tort qu'un
   * correctif du paiement n'avait pas fonctionné). Pire, les bundles étant
   * supprimés à chaque redéploiement, un HTML en cache dont le JS a été
   * évincé renvoie une 404 → page blanche.
   *
   * Règle : les fichiers de /assets/ portent un hash de contenu dans leur
   * nom (index-CpycOtwi.js) — ils sont donc immuables et cachables un an.
   * index.html, lui, garde le MÊME nom à chaque déploiement : il doit être
   * revalidé à chaque visite, sans quoi il continue de pointer vers un
   * bundle périmé. `no-cache` n'interdit pas la mise en cache, il impose
   * seulement la revalidation (304 si inchangé) — donc pas de coût réseau
   * supplémentaire quand rien n'a bougé.
   */
  app.use("*", async (c, next) => {
    await next();
    if (c.req.path.startsWith("/assets/")) {
      c.res.headers.set("Cache-Control", "public, max-age=31536000, immutable");
      return;
    }
    if ((c.res.headers.get("content-type") ?? "").includes("text/html")) {
      c.res.headers.set("Cache-Control", "no-cache");
    }
  });

  app.use("*", serveStatic({ root: "./dist/public" }));

  app.notFound((c) => {
    const accept = c.req.header("accept") ?? "";
    if (!accept.includes("text/html")) {
      return c.json({ error: "Not Found" }, 404);
    }
    const indexPath = path.resolve(distPath, "index.html");
    const content = fs.readFileSync(indexPath, "utf-8");
    return c.html(content);
  });
}
