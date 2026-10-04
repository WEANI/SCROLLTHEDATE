import { useEffect, useState, type CSSProperties } from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BespokePaletteInput } from "@contracts/bespokePalette";
import { HERO_THEMES } from "@/components/hero-scrub/themes";
import { getHeroFont, useGoogleFont } from "@/components/hero-scrub/heroDecor";
import { ChapterContent, HeroFilterLayer, HeroOverlayGraphic } from "@/components/hero-scrub/HeroScrub";
import { parseProgrammeItem } from "@/components/faire-part/DetailsSombre";
import {
  BespokePaletteProvider,
  DressCodeCard,
  EW_PALETTE,
  EwEffectsStyles,
  HorizontalProgramme,
  LieuMagnifier,
  ScatterDateCard,
  WaxSealRsvp,
  type BespokePalette,
} from "@/components/faire-part/edwigeWilfriedEffects";
import { hexToRgbString } from "@/lib/suggestPalette";

/**
 * Aperçu en direct de l'onglet Palette & Hero (Studio) — demandé le
 * 04/10/2026 : jusqu'ici les ~30 couleurs de la palette ne se voyaient que
 * sous forme de pastilles, sans moyen de juger l'effet avant d'enregistrer
 * puis d'ouvrir le faire-part.
 *
 * Fidélité : ce sont les VRAIS composants de la page publique (date,
 * programme, lieu, dress code, sceau RSVP, hero), alimentés par la palette
 * EN COURS D'ÉDITION via le même `BespokePaletteProvider` que FairePart.tsx
 * — pas une maquette qui imiterait leurs couleurs et finirait par diverger.
 * Les règles de choix du thème et du fond de page sont recopiées de
 * FairePart.tsx (cf. `hasDarkBespokeBg`, `effectivePageBg`,
 * `effectiveHeroTheme`) : à garder alignées si elles y changent.
 *
 * Volontairement indépendant de `useStudioThemeVars` (StudioPanel) : ce hook
 * lit la palette ENREGISTRÉE (`project.palette`), donc un aperçu basé dessus
 * ne bougerait qu'après « Enregistrer ».
 *
 * Contenu : vraies infos du couple quand le questionnaire les fournit,
 * exemples sinon (signalés comme tels dans l'interface).
 */
export function PaletteLivePreview({
  palette,
  template,
  isStd,
  coupleNames,
  weddingDateIso,
  venueName,
  programme,
  dressCode,
  dressCodeColors,
  posterSrc,
  usesSampleContent,
}: {
  palette: BespokePaletteInput;
  /** `project.template` — thème d'ambiance du hero (HERO_THEMES). */
  template: string | null;
  isStd: boolean;
  coupleNames: string;
  weddingDateIso: string;
  venueName: string;
  programme: string[];
  dressCode: string;
  /** Teintes du questionnaire, utilisées seulement si la palette n'en pose aucune (même priorité que FairePart.tsx). */
  dressCodeColors: string[];
  /** Image du film livré (1re image ou affiche) — fond de l'aperçu du hero. */
  posterSrc?: string;
  usesSampleContent: boolean;
}) {
  useGoogleFont(palette.heroFontId);
  const [tab, setTab] = useState<"hero" | "page">("hero");

  // Mêmes règles que FairePart.tsx — cf. doc du composant.
  const hasDarkBespokeBg = (() => {
    const hex = palette.bg?.match(/^#([0-9a-f]{6})$/i)?.[1];
    if (!hex) return false;
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    return 0.299 * r + 0.587 * g + 0.114 * b < 0.4;
  })();
  const themeKey = hasDarkBespokeBg ? "cinema" : ((template as keyof typeof HERO_THEMES) ?? "cinema");
  const theme = HERO_THEMES[themeKey] ?? HERO_THEMES.cinema;
  const effectivePageBg = palette.bg && palette.bg !== EW_PALETTE.bg ? palette.bg : theme.pageBg;
  const heroFont = getHeroFont(palette.heroFontId);

  // Les 4 champs `...Rgb` ne sont jamais saisis : recalculés comme au
  // moment de l'enregistrement (cf. submitPalette dans StudioPanel), sinon
  // l'aperçu afficherait les teintes de la dernière sauvegarde.
  const livePalette: BespokePalette = {
    ...(palette as BespokePalette),
    inkRgb: hexToRgbString(palette.ink),
    inkOnCardRgb: hexToRgbString(palette.inkOnCard),
    bordeauxRgb: hexToRgbString(palette.bordeaux),
    goldRgb: hexToRgbString(palette.gold),
  };

  // `heroCardBg` vide = transparent sur la vraie page (FairePart.tsx,
  // `effectiveHeroTheme`), PAS le fond de carte du thème.
  const heroVars = {
    "--hs-frame-bg": theme.frameBg,
    "--hs-vignette": theme.vignette,
    "--hs-accent": theme.accent,
    "--hs-text-primary": palette.heroTextColor || theme.textPrimary,
    "--hs-text-secondary": palette.heroTextColor || theme.textSecondary,
    "--hs-card-bg": palette.heroCardBg || "transparent",
    "--hs-card-border": theme.cardBorder,
    "--hs-card-shadow": theme.cardShadow,
    "--hs-font-family": heroFont?.fontFamily || "'Fraunces', Georgia, serif",
  } as CSSProperties;

  const nameParts = coupleNames.split(/\s+(&|et)\s+/i);
  const segments =
    nameParts.length === 3
      ? [{ text: nameParts[0] }, { text: nameParts[1], accent: true }, { text: nameParts[2] }]
      : [{ text: coupleNames }];
  const sealInitials =
    nameParts.length === 3 ? `${nameParts[0][0]} · ${nameParts[2][0]}` : coupleNames.slice(0, 1).toUpperCase();
  const weddingDateShort = new Date(weddingDateIso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const fromPalette = [palette.dressCode1, palette.dressCode2, palette.dressCode3].filter((c): c is string => !!c);
  const effectiveDressColors = fromPalette.length > 0 ? fromPalette : dressCodeColors.length > 0 ? dressCodeColors : undefined;

  const anim = palette.heroTextAnimation || undefined;
  const [show, replay] = useReplay(anim);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">Aperçu en direct</h4>
        {!isStd && (
          <div className="flex gap-1 rounded-full border border-neutral-200 bg-neutral-100 p-0.5" role="tablist">
            {(
              [
                ["hero", "Hero"],
                ["page", "Page"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-semibold transition-colors",
                  tab === id ? "bg-anthracite-800 text-white" : "text-neutral-500 hover:text-ink",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {(isStd || tab === "hero") && (
        <div className="flex flex-col items-center gap-2">
          <div
            className={cn(
              "relative w-full max-w-[240px] overflow-hidden rounded-xl",
              palette.heroFilter && `hs-filter-${palette.heroFilter}`,
            )}
            style={{ aspectRatio: "9/16", containerType: "inline-size", background: theme.frameBg, ...heroVars } as CSSProperties}
          >
            {posterSrc && <img src={posterSrc} alt="" className="hs-video" />}
            <HeroFilterLayer id={palette.heroFilter || undefined} />
            <HeroOverlayGraphic id={palette.heroOverlayGraphic || undefined} />
            <ChapterContent
              chapter={{
                id: 0,
                kind: "text",
                from: 0,
                to: 1,
                segments,
                segmentLayout: "stack",
                titleSize: "lg",
                sub: palette.heroInviteText || undefined,
              }}
              textAnimation={anim}
              className={cn("hs-overlay", show && "show", anim && `hs-anim-${anim}`)}
            />
          </div>
          <div className="flex w-full max-w-[240px] items-center justify-between gap-2 text-[10.5px] text-neutral-500">
            <span>{posterSrc ? "Sur une image du film livré" : "Aucun film livré — fond du thème"}</span>
            {anim && (
              <button
                type="button"
                onClick={replay}
                className="flex shrink-0 items-center gap-1 font-semibold hover:text-terracotta-500"
              >
                <RotateCcw size={11} />
                Rejouer
              </button>
            )}
          </div>
        </div>
      )}

      {!isStd && tab === "page" && (
        <BespokePaletteProvider palette={livePalette}>
          {/* Rendu à une VRAIE largeur de téléphone (390 px, comme la plupart
              des invités) puis réduit à l'échelle de la colonne avec `zoom`.
              Rendue directement à la largeur de la colonne (~270 px utiles),
              la page débordait : date, compteurs et programme sont dessinés
              pour un écran de téléphone, pas plus étroit (constaté à la
              capture du 04/10/2026). `zoom` plutôt que `transform: scale` :
              il réduit aussi la place occupée, donc pas de vide autour. */}
          <div
            className="mx-auto max-h-[70vh] w-fit overflow-y-auto overflow-x-hidden rounded-xl border border-neutral-200"
            style={{ background: effectivePageBg }}
          >
            <EwEffectsStyles />
            <div className="space-y-14 px-6 py-10" style={{ width: PHONE_WIDTH, zoom: PHONE_ZOOM }}>
              <ScatterDateCard weddingDateTime={weddingDateIso} revealed reducedMotion />
              {programme.length > 0 && (
                <HorizontalProgramme programme={programme.map(parseProgrammeItem)} revealed reducedMotion />
              )}
              <LieuMagnifier
                venueName={venueName}
                venueAddress=""
                mapsUrl={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueName)}`}
                photoSrc=""
              />
              {dressCode && <DressCodeCard dressCode={dressCode} colors={effectiveDressColors} />}
              <WaxSealRsvp
                label="Répondre à l’invitation"
                weddingDateLabel={weddingDateShort}
                initials={sealInitials}
                onClick={() => {}}
              />
            </div>
          </div>
        </BespokePaletteProvider>
      )}

      <p className="mt-2 text-[10.5px] leading-snug text-neutral-500">
        {usesSampleContent
          ? "Couleurs réelles, contenu d'exemple là où le questionnaire n'est pas encore rempli."
          : "Couleurs et contenu réels du couple."}{" "}
        Mis à jour à chaque changement, avant même d'enregistrer.
      </p>
    </div>
  );
}

/** Largeur de rendu de l'onglet Page (téléphone courant) et réduction pour tenir dans la colonne de 320 px. */
const PHONE_WIDTH = 390;
const PHONE_ZOOM = 0.74;

/**
 * Rejoue l'animation d'apparition du texte : la classe `show` doit
 * disparaître puis revenir pour que la transition CSS se déclenche à
 * nouveau. Rejouée automatiquement quand l'animation choisie change.
 */
function useReplay(dep: string | undefined): [boolean, () => void] {
  const [tick, setTick] = useState(0);
  const key = `${dep ?? ""}|${tick}`;
  // `show` est DÉRIVÉ (clé affichée === clé courante) plutôt que remis à
  // false dans l'effet : un setState synchrone dans un effet provoque un
  // rendu en cascade (règle react-hooks/set-state-in-effect du projet).
  // Seul le passage à « affiché » est différé, dans le callback du timer.
  const [shownKey, setShownKey] = useState(key);
  useEffect(() => {
    const id = window.setTimeout(() => setShownKey(key), 80);
    return () => window.clearTimeout(id);
  }, [key]);
  return [shownKey === key, () => setTick((t) => t + 1)];
}
