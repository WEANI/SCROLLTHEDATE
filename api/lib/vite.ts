import type { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "fs";
import path from "path";
import { buildPageHtml } from "./pageMeta";
import { buildRobots, buildSitemap } from "./seoFiles";

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

  /**
   * Toute PAGE du site (pas un fichier, pas l'API) reçoit index.html enrichi
   * de ses balises d'aperçu de partage (cf. pageMeta.ts) — y compris
   * l'accueil, que serveStatic servait auparavant tel quel.
   *
   * Corrige aussi l'aperçu WhatsApp/Facebook cassé relevé à l'audit : la
   * page n'était renvoyée qu'aux requêtes annonçant `Accept: text/html`.
   * Les robots qui fabriquent les aperçus de lien envoient `Accept: *\/*`
   * (ou rien) : ils recevaient une 404 en JSON au lieu de la page.
   */
  const originOf = (c: { req: { header: (n: string) => string | undefined } }) => {
    const proto = (c.req.header("x-forwarded-proto") ?? "https").split(",")[0].trim();
    return `${proto}://${c.req.header("x-forwarded-host") ?? c.req.header("host") ?? ""}`;
  };
  // Générés à la volée (cf. seoFiles.ts) — avant serveStatic.
  app.get("/sitemap.xml", (c) => c.body(buildSitemap(originOf(c)), 200, { "Content-Type": "application/xml; charset=utf-8" }));
  app.get("/robots.txt", (c) => c.text(buildRobots(originOf(c))));

  let baseHtml: string | null = null;
  const isPage = (p: string) => !p.startsWith("/api/") && !p.startsWith("/assets/") && !/\.[a-z0-9]+$/i.test(p);
  app.get("*", async (c, next) => {
    if (!isPage(c.req.path)) return next();
    baseHtml ??= fs.readFileSync(path.resolve(distPath, "index.html"), "utf-8");
    const proto = (c.req.header("x-forwarded-proto") ?? "https").split(",")[0].trim();
    const host = c.req.header("x-forwarded-host") ?? c.req.header("host") ?? "";
    const page = await buildPageHtml(baseHtml, c.req.path, `${proto}://${host}`);
    return c.html(page.html, page.status);
  });

  app.use("*", serveStatic({ root: "./dist/public" }));

  // Ce qui reste : un fichier absent (image, script…) — une vraie 404, jamais
  // la page HTML (un script manquant servi en HTML casse le navigateur sans
  // message clair).
  app.notFound((c) => c.json({ error: "Not Found" }, 404));
}
