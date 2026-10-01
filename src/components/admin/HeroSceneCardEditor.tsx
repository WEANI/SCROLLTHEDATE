import type { CSSProperties } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  HERO_SCENES,
  HERO_SCENE_GROUPS,
  getHeroScene,
  heroSceneDefaults,
  heroSceneFromCard,
  heroScenePreview,
  type HeroSceneContext,
  type HeroSceneField,
} from "@/components/hero-scrub/heroScenes";
import { HeroSceneBlock } from "@/components/hero-scrub/HeroSceneBlocks";
import type { HeroCustomCard } from "@contracts/bespokePalette";

/**
 * Choix de la mise en page d'une scène (bibliothèque HERO_SCENES) + saisie
 * de son contenu — partagé par le studio des projets sur mesure
 * (StudioPanel) et l'admin des modèles Save the Date (ModeleStdDetail), qui
 * gèrent tous deux des cartes `kind: 'scene'` avec la même donnée. Les
 * réglages communs à toutes les cartes (timing, position, police, couleurs,
 * cadre, animation) restent chez l'appelant : ils ne sont pas propres aux
 * scènes.
 *
 * Seuls les champs que la mise en page choisie utilise réellement sont
 * affichés (cf. `fields` sur HeroSceneOption) — une scène « Citation » n'a
 * qu'une phrase à saisir, pas six champs vides.
 */
export function HeroSceneCardEditor({
  card,
  onChange,
  ctx,
  themeVars,
  inputClass,
}: {
  card: HeroCustomCard;
  onChange: (patch: Partial<HeroCustomCard>) => void;
  ctx: HeroSceneContext;
  themeVars: CSSProperties;
  inputClass: string;
}) {
  const option = getHeroScene(card.sceneId);
  const fields = option?.fields ?? [];
  const label = (f: HeroSceneField, fallback: string) => option?.labels?.[f] ?? fallback;

  // Changer de mise en page repose le contenu de départ de la NOUVELLE
  // scène : les champs de l'ancienne (« Répondez avant le » sur une scène
  // « Rose des vents »…) n'ont aucun sens ailleurs, et un formulaire vide
  // serait tout aussi inutilisable.
  const pickScene = (id: string) => {
    const d = heroSceneDefaults(id);
    onChange({
      sceneId: id,
      sceneKicker: d.kicker,
      sceneTitle: d.title,
      sceneSubtitle: d.subtitle,
      sceneExtra: d.extra,
      sceneItems: d.items,
      sceneColors: d.colors,
    });
  };

  const setItem = (i: number, patch: Partial<{ a: string; b: string }>) =>
    onChange({ sceneItems: card.sceneItems.map((it, j) => (j === i ? { ...it, ...patch } : it)) });

  const textField = (f: 'kicker' | 'title' | 'subtitle' | 'extra', fallback: string, key: keyof HeroCustomCard) => {
    const value = card[key] as string;
    const multiline = f === 'title' || f === 'subtitle' || f === 'extra';
    return (
      <label key={f} className="flex flex-col gap-1 text-[11px] font-semibold text-neutral-500">
        {label(f, fallback)}
        {multiline ? (
          <textarea
            rows={2}
            value={value}
            maxLength={200}
            onChange={(e) => onChange({ [key]: e.target.value } as Partial<HeroCustomCard>)}
            placeholder="Un retour à la ligne = une ligne à l'image"
            className={cn(inputClass, "resize-y")}
          />
        ) : (
          <input
            value={value}
            maxLength={200}
            onChange={(e) => onChange({ [key]: e.target.value } as Partial<HeroCustomCard>)}
            className={inputClass}
          />
        )}
      </label>
    );
  };

  return (
    <div className="mt-3 space-y-3">
      <div>
        <p className="mb-2 text-[11px] font-semibold text-neutral-500">
          Mise en page {option ? <span className="font-normal text-neutral-400">— {option.desc}</span> : null}
        </p>
        <div className="space-y-3">
          {HERO_SCENE_GROUPS.map((group) => (
            <div key={group}>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">{group}</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                {HERO_SCENES.filter((s) => s.group === group).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => pickScene(s.id)}
                    title={s.desc}
                    className={cn(
                      "flex flex-col gap-1.5 rounded-xl border p-1.5 text-center transition-colors",
                      card.sceneId === s.id
                        ? "border-terracotta-500 bg-terracotta-500/5"
                        : "border-neutral-200 hover:border-terracotta-300",
                    )}
                  >
                    <div
                      className="relative flex w-full items-center justify-center overflow-hidden rounded-lg bg-anthracite-950"
                      style={{ aspectRatio: "16 / 10", containerType: "inline-size", ...themeVars } as CSSProperties}
                    >
                      <HeroSceneBlock s={heroScenePreview(s, ctx)} />
                    </div>
                    <span className="text-[10px] font-medium leading-tight text-ink">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {option && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.includes('kicker') && textField('kicker', 'Surtitre', 'sceneKicker')}
            {fields.includes('title') && textField('title', 'Titre', 'sceneTitle')}
            {fields.includes('subtitle') && textField('subtitle', 'Sous-titre', 'sceneSubtitle')}
            {fields.includes('extra') && textField('extra', 'Ligne du dessous', 'sceneExtra')}
            {fields.includes('image') && (
              <label className="flex flex-col gap-1 text-[11px] font-semibold text-neutral-500 sm:col-span-2">
                URL de la photo
                <input
                  value={card.sceneImage}
                  maxLength={500}
                  onChange={(e) => onChange({ sceneImage: e.target.value })}
                  placeholder="https://… — vide = cadre vide"
                  className={inputClass}
                />
              </label>
            )}
          </div>

          {fields.includes('items') && (
            <div>
              <p className="mb-2 text-[11px] font-semibold text-neutral-500">{label('items', 'Lignes')}</p>
              <div className="space-y-2">
                {card.sceneItems.map((it, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={it.a}
                      maxLength={60}
                      onChange={(e) => setItem(i, { a: e.target.value })}
                      className={cn(inputClass, "w-32 shrink-0")}
                    />
                    <input
                      value={it.b}
                      maxLength={120}
                      onChange={(e) => setItem(i, { b: e.target.value })}
                      className={cn(inputClass, "flex-1")}
                    />
                    <button
                      type="button"
                      onClick={() => onChange({ sceneItems: card.sceneItems.filter((_, j) => j !== i) })}
                      aria-label="Retirer cette ligne"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-500 hover:text-error"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              {card.sceneItems.length < 6 && (
                <button
                  type="button"
                  onClick={() => onChange({ sceneItems: [...card.sceneItems, { a: "", b: "" }] })}
                  className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500 hover:text-terracotta-500"
                >
                  <Plus size={13} />
                  Ajouter une ligne
                </button>
              )}
            </div>
          )}

          {fields.includes('colors') && (
            <div>
              <p className="mb-2 text-[11px] font-semibold text-neutral-500">{label('colors', 'Teintes')}</p>
              <div className="flex flex-wrap items-center gap-2">
                {card.sceneColors.map((c, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <input
                      type="color"
                      value={/^#[0-9a-fA-F]{6}$/.test(c) ? c : "#B9A3CC"}
                      onChange={(e) =>
                        onChange({ sceneColors: card.sceneColors.map((x, j) => (j === i ? e.target.value : x)) })
                      }
                      className="h-8 w-10 cursor-pointer rounded border border-neutral-200 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => onChange({ sceneColors: card.sceneColors.filter((_, j) => j !== i) })}
                      aria-label="Retirer cette teinte"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 hover:text-error"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
                {card.sceneColors.length < 4 && (
                  <button
                    type="button"
                    onClick={() => onChange({ sceneColors: [...card.sceneColors, "#B9A3CC"] })}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500 hover:text-terracotta-500"
                  >
                    <Plus size={13} />
                    Ajouter une teinte
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Aperçu d'une carte scène, aux dimensions d'un bloc hero — même composant que la page publique. */
export function HeroSceneCardPreview({ card, ctx }: { card: HeroCustomCard; ctx: HeroSceneContext }) {
  if (!card.sceneId) return null;
  return <HeroSceneBlock s={heroSceneFromCard(card, ctx)} />;
}
