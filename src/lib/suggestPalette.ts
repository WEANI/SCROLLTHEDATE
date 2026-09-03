import type { BespokePaletteInput } from "@contracts/bespokePalette";

/**
 * Génère une proposition de départ pour les 19 champs de `BespokePalette`
 * à partir d'une seule couleur d'accent + du mode clair/sombre choisi par
 * le client (cf. PLAN-GENERALISATION-THEMES.md, Phase 0/D1 et Phase 2) —
 * jamais le résultat final : le studio retouche toujours à l'œil dans
 * StudioPanel avant de valider. N'est appelée que côté admin, jamais côté
 * rendu public (Phase 4 lit `project.palette` tel que validé, ne
 * régénère rien).
 *
 * Heuristique volontairement simple plutôt qu'une tentative de reproduire
 * exactement les choix de Léa & Olivier (doré/bordeaux, deux teintes
 * différentes) ou d'Edwige & Wilfried : un accent secondaire de MÊME
 * teinte que l'accent principal (juste plus doux/clair) ne jure jamais,
 * quelle que soit la couleur choisie par le client — une paire de deux
 * teintes différentes peut être plus "designée" mais suppose un choix de
 * goût qu'un algorithme ne peut pas garantir juste pour une couleur
 * arbitraire. C'est exactement le compromis acté en Phase 0/D1 : la
 * fonction ne fait QUE gagner du temps de saisie, jamais le dernier mot.
 */
export function suggestPalette(accentColor: string, mode: "light" | "dark", exactBg?: string): BespokePaletteInput {
  const parsed = parseHex(accentColor) ?? parseHex(FALLBACK_ACCENT)!;
  const { h, s, l } = rgbToHsl(parsed);

  const primaryHex = hslToHex(h, s, l);
  const primaryRgb = hexToRgbString(primaryHex);

  // Accent secondaire : même teinte, poussée vers une variante plus douce
  // — plus sombre/saturée en clair (comme le bordeaux d'Edwige & Wilfried
  // sur fond clair), plus claire/pâle en sombre (comme le rose pâle de
  // Léa & Olivier sur fond sombre), pour rester lisible dans les deux cas.
  const secondaryHex =
    mode === "light"
      ? hslToHex(h, clamp(s + 5, 20, 85), clamp(l - 18, 22, 55))
      : hslToHex(h, clamp(s - 15, 25, 70), clamp(l + 32, 65, 90));
  const secondaryRgb = hexToRgbString(secondaryHex);

  // Crème : constante de marque (identique chez Edwige & Wilfried et Léa
  // & Olivier), pas dérivée de l'accent.
  const cream = "#F3EAD9";
  const creamRgb = "243, 234, 217";
  const inkDark = "#2E2620";
  const inkDarkRgb = "46, 38, 32";

  const bg = exactBg && /^#[0-9a-fA-F]{6}$/.test(exactBg) ? exactBg : mode === "light" ? cream : "rgba(255, 255, 255, 0.05)";
  const ink = mode === "light" ? inkDark : cream;
  const inkRgb = mode === "light" ? inkDarkRgb : creamRgb;

  const sealLight = hslToHex(h, clamp(s + 5, 0, 90), clamp(l + 12, 0, 95));
  const sealDark = hslToHex(h, clamp(s + 5, 0, 90), clamp(l - 25, 5, 90));

  return {
    bg,
    bgDate: "transparent",
    bgProgramme: bg,
    cream,
    ink,
    inkRgb,
    // Cartes (Lieu, Programme, FAQ) : toujours lisibles avec la même
    // encre que le texte posé sur la page dans ces deux modes de départ
    // (page claire + cartes claires, ou page sombre + cartes sombres) —
    // cf. doc de BespokePalette. Un cas où l'accent du client entre en
    // conflit reste possible : au studio de le voir et retoucher.
    inkOnCard: ink,
    inkOnCardRgb: inkRgb,
    mapLine: ink,
    bordeaux: secondaryHex,
    bordeauxRgb: secondaryRgb,
    gold: primaryHex,
    goldRgb: primaryRgb,
    sectionTitle: primaryHex,
    timelineAccent: secondaryHex,
    // Valeur neutre par défaut (pas l'accent) — le studio peut le
    // repasser en accent si le client le demande explicitement, comme
    // Léa & Olivier (cf. doc de `stepLabel` dans BespokePalette).
    stepLabel: ink,
    seal: primaryHex,
    sealLight,
    sealDark,
  };
}

const FALLBACK_ACCENT = "#C96F5A"; // terracotta-500 (tailwind.config.cjs) — si la couleur saisie est invalide.

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function parseHex(input: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(input.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHsl({ r, g, b }: { r: number; g: number; b: number }) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case rn:
      h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
      break;
    case gn:
      h = ((bn - rn) / d + 2) * 60;
      break;
    default:
      h = ((rn - gn) / d + 4) * 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (h < 60) [rp, gp, bp] = [c, x, 0];
  else if (h < 120) [rp, gp, bp] = [x, c, 0];
  else if (h < 180) [rp, gp, bp] = [0, c, x];
  else if (h < 240) [rp, gp, bp] = [0, x, c];
  else if (h < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];
  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(rp)}${toHex(gp)}${toHex(bp)}`;
}

/** Exporté pour StudioPanel — recalcule les 4 champs `...Rgb` (compagnons de `ink`/`inkOnCard`/`bordeaux`/`gold`) à partir de leur hex au moment de l'enregistrement, plutôt que de les laisser saisissables à la main (évite qu'ils se désynchronisent). */
export function hexToRgbString(hex: string): string {
  const p = parseHex(hex);
  if (!p) return "0, 0, 0";
  return `${p.r}, ${p.g}, ${p.b}`;
}
