import { BRAND_NAME, activeSocialProfiles } from "../../contracts/brand";
import { getSaveTheDateTemplate } from "../../contracts/saveTheDateTemplates";
import { findProjectBySlug } from "../queries/projects";
import { findVideosByProject } from "../queries/domain";
import { fr } from "../../src/i18n/translations/fr";

/**
 * Titre, description et image de partage des pages vitrine, servis dès le
 * HTML (22/10/2026) — mêmes textes que useSeo côté navigateur (source
 * unique : le dictionnaire français). Avant, WhatsApp/Facebook/Pinterest
 * montraient l'aperçu générique de l'accueil pour toutes ces pages.
 */
const STATIC_PAGES: Record<string, PageMeta> = {
  "/": { title: fr.home.seo.title, description: fr.home.seo.description },
  "/offres": { title: fr.offres.seo.title, description: fr.offres.seo.description },
  "/save-the-date-digital": {
    title: fr.saveTheDateDigital.seo.title,
    description: fr.saveTheDateDigital.seo.description,
    image: "/save-the-date-sur-mesure-demo-poster.jpg",
  },
  "/faire-part-digital": { title: fr.fairePartDigital.seo.title, description: fr.fairePartDigital.seo.description },
  "/save-the-date-modeles": { title: fr.saveTheDateTemplates.seo.title, description: fr.saveTheDateTemplates.seo.description },
  "/cgv": { title: fr.cgv.seoTitle, description: fr.cgv.seoDescription },
  "/mentions-legales": { title: fr.mentionsLegales.seoTitle, description: fr.mentionsLegales.seoDescription },
  "/confidentialite": { title: fr.confidentialite.seoTitle, description: fr.confidentialite.seoDescription },
};

/**
 * Balises d'aperçu de partage (Open Graph) et fiche d'identité de la marque,
 * injectées CÔTÉ SERVEUR dans index.html avant de l'envoyer.
 *
 * Pourquoi côté serveur : le site est une application React, et ses titres
 * par page (useSeo) ne sont posés qu'une fois le JavaScript exécuté. Les
 * robots de WhatsApp, Facebook, Pinterest ou LinkedIn qui fabriquent un
 * aperçu de lien n'exécutent pas ce JavaScript : ils lisent le HTML brut.
 * Sans ceci, tout lien partagé montrait l'aperçu générique de l'accueil —
 * y compris un faire-part envoyé par un couple à ses invités.
 *
 * Trois règles :
 *  - l'image d'aperçu est toujours une adresse COMPLÈTE (une adresse
 *    relative, « /og-image.jpg », est ignorée par plusieurs réseaux) ;
 *  - un faire-part montre les prénoms du couple, sa date et l'image de son
 *    film, et porte `noindex` : c'est un lien privé, envoyé aux invités, qui
 *    n'a rien à faire dans les résultats de recherche ;
 *  - toute erreur (base indisponible, projet introuvable) retombe sur
 *    l'aperçu générique : un aperçu raté ne doit jamais casser la page.
 */

interface PageMeta {
  title?: string;
  description?: string;
  image?: string;
  noindex?: boolean;
  /** Adresse inexistante : réponse 404 (la page « introuvable » s'affiche quand même). */
  notFound?: boolean;
}

/**
 * Adresses qui existent dans l'application (cf. <Routes> de src/App.tsx) —
 * à garder synchronisé. Toute autre adresse reçoit le code 404 et
 * `noindex` : auparavant elle répondait « 200 OK », et Google pouvait
 * indexer des pages « introuvable » (audit du 19/10/2026).
 */
const KNOWN_PAGES = [
  /^\/$/,
  /^\/(offres|faire-part-digital|save-the-date-digital|save-the-date-modeles|commander|merci|demo|demo\/infos|demofairepart|mentions-legales|cgv|confidentialite|login|definir-mot-de-passe)\/?$/,
  /^\/save-the-date-modeles\/[^/]+\/?$/,
  /^\/faire-part\/[^/]+\/?$/,
  /^\/(espace|admin)(\/.*)?$/,
];
export const isKnownPage = (pathname: string) => KNOWN_PAGES.some((re) => re.test(pathname));

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const absolute = (origin: string, url: string) => (/^https?:\/\//i.test(url) ? url : `${origin}${url.startsWith("/") ? "" : "/"}${url}`);

async function routeMeta(pathname: string): Promise<PageMeta> {
  const page = STATIC_PAGES[pathname.replace(/(.)\/$/, "$1")];
  if (page) return { ...page };
  const fp = pathname.match(/^\/faire-part\/([^/]+)\/?$/);
  if (fp) {
    const project = await findProjectBySlug(decodeURIComponent(fp[1]));
    if (!project) return { noindex: true, notFound: !/^demo-faire-part-[12]$|^camille-adrien$/.test(fp[1]) };
    const answers = (project.questionnaire?.answers as Record<string, unknown> | null) ?? {};
    const names = typeof answers["couple.prenoms"] === "string" ? (answers["couple.prenoms"] as string).trim() : "";
    const isStd = project.product === "SAVE_THE_DATE";
    const date = project.weddingDate
      ? new Date(project.weddingDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" })
      : "";
    const videos = await findVideosByProject(project.id);
    const hero = videos.find((v) => !v.watermark) ?? videos.find((v) => v.status === "sent" || v.status === "final");
    return {
      title: names ? `${names} — ${isStd ? "Save the date" : "Faire-part de mariage"}` : isStd ? "Save the date" : "Faire-part de mariage",
      description: [date, isStd ? "Ouvrez l'invitation et faites défiler." : "Ouvrez votre faire-part et faites défiler."].filter(Boolean).join(" · "),
      image: hero?.posterUrl ?? undefined,
      noindex: true,
    };
  }
  const tpl = pathname.match(/^\/save-the-date-modeles\/([^/]+)\/?$/);
  if (tpl) {
    const template = getSaveTheDateTemplate(decodeURIComponent(tpl[1]));
    if (template) {
      return {
        title: `Modèle ${template.name} — Save the date vidéo · ${BRAND_NAME}`,
        description: template.tagline,
        image: template.cardPreview?.posterSrc ?? template.posterSrc,
      };
    }
    return { notFound: true, noindex: true };
  }
  return {};
}

/** index.html enrichi pour une page donnée, et son code de réponse. `origin` = schéma + hôte de la requête (le domaine par lequel le lien a été partagé). */
export async function buildPageHtml(baseHtml: string, pathname: string, origin: string): Promise<{ html: string; status: 200 | 404 }> {
  let meta: PageMeta = isKnownPage(pathname) ? {} : { notFound: true, noindex: true };
  if (meta.notFound) return { html: render(baseHtml, pathname, origin, meta), status: 404 };
  try {
    meta = await routeMeta(pathname);
  } catch (err) {
    console.error("[pageMeta] aperçu générique faute de mieux :", err);
  }
  // Un faire-part n'est jamais indexé, même quand ses données n'ont pas pu
  // être lues (base indisponible) : c'est l'adresse qui le rend privé.
  if (pathname.startsWith("/faire-part/")) meta.noindex = true;
  return { html: render(baseHtml, pathname, origin, meta), status: meta.notFound ? 404 : 200 };
}

function render(baseHtml: string, pathname: string, origin: string, meta: PageMeta): string {
  let html = baseHtml;
  const image = absolute(origin, meta.image || "/og-image.jpg");

  html = html.replace(/<meta property="og:image" content="[^"]*" \/>/, `<meta property="og:image" content="${esc(image)}" />`);
  if (meta.title) {
    html = html
      .replace(/<title>[^<]*<\/title>/, `<title>${esc(meta.title)}</title>`)
      .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${esc(meta.title)}" />`);
  }
  if (meta.description) {
    html = html
      .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${esc(meta.description)}" />`)
      .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${esc(meta.description)}" />`);
  }

  const sameAs = activeSocialProfiles().map((p) => p.url);
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND_NAME,
    url: origin,
    logo: `${origin}/logo-dark.png`,
    ...(sameAs.length ? { sameAs } : {}),
  };
  const extra = [
    `<meta property="og:url" content="${esc(origin + pathname)}" />`,
    // Adresse de référence = le domaine par lequel le site est appelé (plus
    // d'adresse Railway figée : elle aurait survécu au branchement de
    // scrollthedate.com). Jamais sur une page exclue de l'index.
    meta.noindex ? "" : `<link rel="canonical" href="${esc(origin + (pathname.replace(/(.)\/$/, "$1")))}" />`,
    `<meta property="og:site_name" content="${BRAND_NAME}" />`,
    `<meta property="og:locale" content="fr_FR" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    meta.noindex ? `<meta name="robots" content="noindex" />` : "",
    // `<` échappé : une valeur ne peut pas fermer la balise script.
    `<script type="application/ld+json">${JSON.stringify(organization).replace(/</g, "\\u003c")}</script>`,
  ]
    .filter(Boolean)
    .join("\n    ");
  return html.replace("</head>", `    ${extra}\n  </head>`);
}
