import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { inputClass } from "@/components/admin-suite/ui";
import { HERO_FONTS, HERO_TEXT_ANIMATIONS } from "@/components/hero-scrub/heroDecor";

/**
 * Champs partagés des écrans de réglage du hero (Modèles Save the Date,
 * vidéos démo) — sortis de ModeleStdDetail.tsx le 12/11/2026 pour être
 * réutilisés tels quels par l'écran des démos.
 */

export function ColorField({
  label,
  hint,
  value,
  onChange,
  noneOption,
  transparentOption,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  /** Ajoute un bouton "Aucun fond" — sentinel 'none' (cf. doc de ChapterContent dans HeroScrub.tsx) : neutralise fond ET flou/bordure/ombre de la carte, pas juste un fond transparent. */
  noneOption?: boolean;
  /** Ajoute seulement le bouton « Transparent » (ex. couleur du cadre : cadre invisible). 12/11/2026. */
  transparentOption?: boolean;
}) {
  const isHex = /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
      {label}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={isHex ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 shrink-0 cursor-pointer rounded-[10px] border border-neutral-200 bg-transparent p-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Vide = défaut"
          className={cn(inputClass, "font-mono")}
        />
      </div>
      {(noneOption || transparentOption) && (
        <div className="flex flex-wrap gap-1.5">
            {(noneOption || transparentOption) && (
              <button
                type="button"
                onClick={() => onChange(value === "transparent" ? "" : "transparent")}
                title={noneOption ? "Carte transparente, sans flou — le contour et le cadre restent visibles" : "Transparent"}
                className={cn(
                  "shrink-0 rounded-md border px-2 py-1.5 text-[10px] font-semibold whitespace-nowrap",
                  value === "transparent"
                    ? "border-terracotta-500 bg-terracotta-500/10 text-terracotta-500"
                    : "border-neutral-200 text-neutral-500 hover:bg-neutral-100",
                )}
              >
                Transparent
              </button>
            )}
            {noneOption && (
              <button
                type="button"
                onClick={() => onChange(value === "none" ? "" : "none")}
                title="Aucun fond, aucun flou, aucune bordure — le texte seul"
                className={cn(
                  "shrink-0 rounded-md border px-2 py-1.5 text-[10px] font-semibold whitespace-nowrap",
                  value === "none"
                    ? "border-terracotta-500 bg-terracotta-500/10 text-terracotta-500"
                    : "border-neutral-200 text-neutral-500 hover:bg-neutral-100",
                )}
              >
                Aucun fond
              </button>
            )}
        </div>
      )}
      {hint && <span className="text-[10px] font-normal normal-case text-neutral-400">{hint}</span>}
    </label>
  );
}



/** Sélecteur de police — factorisé, réutilisé pour le réglage hero-wide ET chaque réglage par bloc (échange du 21/09/2026). */
export function FontSelect({ value, onChange, defaultLabel }: { value: string; onChange: (v: string) => void; defaultLabel: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
      <option value="">{defaultLabel}</option>
      {Object.entries(
        HERO_FONTS.reduce<Record<string, typeof HERO_FONTS>>((acc, f) => {
          (acc[f.category] ??= []).push(f);
          return acc;
        }, {}),
      ).map(([category, fonts]) => (
        <optgroup key={category} label={category}>
          {fonts.map((f) => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

/** Sélecteur d'animation — factorisé, même raisonnement que FontSelect ci-dessus. */
export function AnimSelect({ value, onChange, defaultLabel }: { value: string; onChange: (v: string) => void; defaultLabel: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
      <option value="">{defaultLabel}</option>
      {HERO_TEXT_ANIMATIONS.map((a) => (
        <option key={a.id} value={a.id}>{a.label}</option>
      ))}
    </select>
  );
}

/** Case à cocher "Gras" — factorisée, un bloc de texte à la fois (échange du 21/09/2026). */
export function BoldField({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 self-end pb-2 text-[12.5px] font-medium text-neutral-500">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-neutral-300 text-terracotta-500 focus:ring-terracotta-500"
      />
      Gras
    </label>
  );
}

/** Petite vignette 9:16 sombre, contexte de container-query (cqw) pour que le vrai composant HeroScrub s'y affiche à l'identique de la page publique. */
export function PreviewStage({ themeVars, children }: { themeVars: CSSProperties; children: ReactNode }) {
  return (
    <div
      className="relative mx-auto w-full max-w-[200px] overflow-hidden rounded-lg ring-1 ring-inset ring-neutral-200"
      style={{ background: "var(--hs-frame-bg, #1B1B1E)", aspectRatio: "9/16", containerType: "inline-size", ...themeVars } as CSSProperties}
    >
      {children}
    </div>
  );
}

export function TimecodeField({
  label,
  value,
  max,
  onChange,
  onCaler,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
  onCaler: () => void;
}) {
  return (
    <div className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
      {label}
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={0}
          max={max}
          step={0.1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={cn(inputClass, "tabular")}
        />
        <button
          type="button"
          onClick={onCaler}
          title="Reprendre l'instant actuel de la vidéo"
          className="shrink-0 rounded-md border border-neutral-200 px-2 py-1.5 text-[10px] font-semibold text-terracotta-500 hover:bg-terracotta-500/10"
        >
          Caler ici
        </button>
      </div>
    </div>
  );
}
