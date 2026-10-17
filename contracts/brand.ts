/**
 * Identité de la marque sur le web — partagée par le pied de page du site
 * (src/components/Footer.tsx) et la fiche d'identité injectée dans chaque
 * page pour les moteurs de recherche (api/lib/vite.ts, données structurées
 * `Organization` + `sameAs`).
 *
 * Les comptes sont VIDES tant que leurs noms ne sont pas confirmés (cf.
 * document « Scroll The Date — réseaux sociaux et visibilité », 11/10/2026) :
 * un lien vers @scrollthedate alors que ce nom appartient à quelqu'un
 * d'autre enverrait les visiteurs chez un inconnu. Une adresse vide n'est
 * affichée nulle part ; il suffit de la remplir pour que le lien apparaisse
 * dans le pied de page et dans la fiche Google.
 *
 * 17/10/2026 : Instagram, TikTok, Pinterest et Facebook renseignés, tous
 * sous le nom « scrollthedate ». YouTube reste à créer.
 */
export const BRAND_NAME = "Scroll The Date";

export const SOCIAL_PROFILES: { id: string; label: string; url: string }[] = [
  { id: "instagram", label: "Instagram", url: "https://www.instagram.com/scrollthedate/" },
  { id: "tiktok", label: "TikTok", url: "https://www.tiktok.com/@scrollthedate" },
  { id: "pinterest", label: "Pinterest", url: "https://www.pinterest.com/scrollthedate/" },
  { id: "facebook", label: "Facebook", url: "https://www.facebook.com/scrollthedate/" },
  { id: "youtube", label: "YouTube", url: "" },
];

/** Comptes renseignés seulement. */
export const activeSocialProfiles = () => SOCIAL_PROFILES.filter((p) => p.url.trim() !== "");
