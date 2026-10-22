import { SAVE_THE_DATE_TEMPLATES } from "../../contracts/saveTheDateTemplates";

/**
 * sitemap.xml et robots.txt générés à la volée (22/10/2026), au lieu de
 * fichiers figés dans public/ : les adresses suivent le domaine par lequel
 * le site est appelé (Railway aujourd'hui, scrollthedate.com une fois
 * branché, sans rien régénérer), et chaque modèle Save the Date ajouté au
 * catalogue entre tout seul dans le sitemap.
 *
 * Volontairement absents : les faire-part de vrais clients (liens privés,
 * marqués noindex), /admin, /espace, /login, /commander, /merci,
 * /demofairepart (privés ou sans intérêt de recherche).
 */
const PAGES: { path: string; priority: string; changefreq: string }[] = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/offres", priority: "0.9", changefreq: "weekly" },
  { path: "/save-the-date-digital", priority: "0.9", changefreq: "weekly" },
  { path: "/faire-part-digital", priority: "0.9", changefreq: "weekly" },
  { path: "/save-the-date-modeles", priority: "0.9", changefreq: "weekly" },
  { path: "/demo", priority: "0.7", changefreq: "monthly" },
  { path: "/mentions-legales", priority: "0.3", changefreq: "yearly" },
  { path: "/cgv", priority: "0.3", changefreq: "yearly" },
  { path: "/confidentialite", priority: "0.3", changefreq: "yearly" },
];

export function buildSitemap(origin: string): string {
  const urls = [
    ...PAGES,
    ...SAVE_THE_DATE_TEMPLATES.map((t) => ({ path: `/save-the-date-modeles/${t.slug}`, priority: "0.8", changefreq: "monthly" })),
  ];
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(
      (u) => `  <url><loc>${origin}${u.path}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`,
    ),
    "</urlset>",
    "",
  ].join("\n");
}

export function buildRobots(origin: string): string {
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /espace",
    "Disallow: /login",
    "Disallow: /commander",
    "Disallow: /merci",
    "Disallow: /demofairepart",
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n");
}
