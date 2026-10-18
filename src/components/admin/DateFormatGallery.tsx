import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { HERO_DATE_FORMATS } from "@/components/hero-scrub/heroDecor";
import { HeroDateLayoutBlock } from "@/components/hero-scrub/HeroDateBlocks";

/** Date d'exemple des vignettes — la même partout dans l'admin. */
const DATE_FORMAT_PREVIEW_DATE = new Date(2027, 5, 12);

/**
 * Galerie des formats de date (HERO_DATE_FORMATS) — une vignette par format,
 * comme la galerie des mises en page de prénoms, au lieu d'une liste
 * déroulante où les mises en page sur plusieurs lignes passaient inaperçues
 * (cf. échange du 11/10/2026). Les vignettes montent les vrais blocs du hero
 * (`HeroDateLayoutBlock`), réduits par `zoom` : leurs tailles en `clamp(px)`
 * sont pensées pour la vidéo, trop grandes pour une vignette.
 */
export function DateFormatGallery({
  value,
  onChange,
  themeVars,
}: {
  value: string;
  onChange: (id: string) => void;
  themeVars: CSSProperties;
}) {
  const groups: { title: string; items: { id: string; label: string; layout?: (typeof HERO_DATE_FORMATS)[number]["layout"]; text: string }[] }[] = [
    {
      title: "Sur une ligne",
      items: [
        { id: "", label: "Par défaut", text: "12 juin 2027" },
        ...HERO_DATE_FORMATS.filter((f) => !f.layout).map((f) => ({ id: f.id, label: f.label, text: f.format(DATE_FORMAT_PREVIEW_DATE) })),
      ],
    },
    {
      title: "Sur plusieurs lignes",
      items: HERO_DATE_FORMATS.filter((f) => f.layout).map((f) => ({ id: f.id, label: f.label, layout: f.layout, text: "" })),
    },
  ];
  return (
    <div className="flex flex-col gap-3">
      {groups.map((g) => (
        <div key={g.title}>
          <p className="mb-1.5 text-[11px] font-medium text-neutral-500">{g.title}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {g.items.map((f) => (
              <button
                key={f.id || "defaut"}
                type="button"
                onClick={() => onChange(f.id)}
                title={f.label}
                aria-pressed={value === f.id}
                className={cn(
                  "flex flex-col gap-1.5 rounded-xl border p-1.5 text-center transition-colors",
                  value === f.id ? "border-terracotta-500 bg-terracotta-500/5" : "border-neutral-200 hover:border-terracotta-300",
                )}
              >
                <div
                  className="relative flex w-full items-center justify-center overflow-hidden rounded-lg ring-1 ring-inset ring-neutral-200 px-1"
                  style={{ background: "var(--hs-frame-bg, #1B1B1E)", aspectRatio: "16 / 10", containerType: "inline-size", ...themeVars } as CSSProperties}
                >
                  {f.layout ? (
                    <div style={{ zoom: 0.55 }}>
                      <HeroDateLayoutBlock layout={{ id: f.id, fonts: f.layout.fonts, lines: f.layout.lines(DATE_FORMAT_PREVIEW_DATE) }} />
                    </div>
                  ) : (
                    <span className="px-1 text-[11px] font-light leading-tight" style={{ color: "var(--hs-text-primary)", fontFamily: "var(--hs-font-family)" }}>
                      {f.text}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium leading-tight text-ink">{f.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

