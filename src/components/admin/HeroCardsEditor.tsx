import type { CSSProperties } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { inputClass, textareaClass } from "@/components/admin-suite/ui";
import { HERO_CARD_FRAMES, HERO_COUNTDOWN_STYLES } from "@/components/hero-scrub/heroDecor";
import { ChapterContent } from "@/components/hero-scrub/HeroScrub";
import { HeroSceneCardEditor } from "@/components/admin/HeroSceneCardEditor";
import { getHeroScene, heroSceneFromCard, type HeroSceneContext } from "@/components/hero-scrub/heroScenes";
import type { HeroChapter } from "@/components/hero-scrub/types";
import { blankHeroCustomCard, type HeroCustomCard } from "@contracts/bespokePalette";
import {
  AnimSelect,
  BoldField,
  ColorField,
  FontSelect,
  PreviewStage,
  TimecodeField,
} from "@/components/admin/heroEditorFields";
import { COUNTDOWN_PREVIEW_TARGET } from "@/components/admin/heroEditorUtils";

/**
 * Liste éditable des blocs overlay d'un hero (texte, compte à rebours,
 * scène). Sortie de ModeleStdDetail.tsx le
 * 12/11/2026 pour servir aussi à l'écran des vidéos démo : un seul éditeur,
 * donc une correction faite ici vaut pour les deux écrans.
 */
export function HeroCardsEditor({
  cards,
  onChange,
  currentTime,
  duration,
  themeVars,
  heroAnimation,
  animShow,
  sceneCtx,
}: {
  cards: HeroCustomCard[];
  onChange: (cards: HeroCustomCard[]) => void;
  currentTime: number;
  duration: number;
  themeVars: CSSProperties;
  heroAnimation: string;
  animShow: boolean;
  sceneCtx: HeroSceneContext;
}) {
  const addCard = (kind: HeroCustomCard["kind"], text: string) =>
    onChange([...cards, blankHeroCustomCard(`card-${Date.now()}-${Math.round(Math.random() * 1000)}`, kind, text)]);
  const removeCard = (id: string) => onChange(cards.filter((c) => c.id !== id));
  const updateCard = (id: string, patch: Partial<HeroCustomCard>) =>
    onChange(cards.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  return (
    <>
        {cards.map((card) => card.kind === 'scene' ? (
          <div key={card.id} className="rounded-xl border border-neutral-200 bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">
                Scène{getHeroScene(card.sceneId) ? ` — ${getHeroScene(card.sceneId)!.label}` : ""}
              </p>
              <button
                type="button"
                onClick={() => removeCard(card.id)}
                aria-label="Retirer ce bloc"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-500 hover:text-error"
              >
                <X size={16} />
              </button>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-3">
              <TimecodeField
                label="Apparaît à (s)"
                value={card.fromSec}
                max={duration}
                onChange={(v) => updateCard(card.id, { fromSec: v })}
                onCaler={() => updateCard(card.id, { fromSec: Math.round(currentTime * 10) / 10 })}
              />
              <TimecodeField
                label="Disparaît à (s)"
                value={card.toSec}
                max={duration}
                onChange={(v) => updateCard(card.id, { toSec: v })}
                onCaler={() => updateCard(card.id, { toSec: Math.round(currentTime * 10) / 10 })}
              />
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
                Position verticale
                <select value={card.position} onChange={(e) => updateCard(card.id, { position: e.target.value as HeroCustomCard["position"] })} className={inputClass}>
                  <option value="top">Haut</option>
                  <option value="middle">Milieu</option>
                  <option value="bottom">Bas</option>
                </select>
              </label>
            </div>
            <HeroSceneCardEditor
              card={card}
              onChange={(patch) => updateCard(card.id, patch)}
              ctx={sceneCtx}
              themeVars={themeVars}
              inputClass={inputClass}
            />
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
                Police — ce bloc
                <FontSelect value={card.fontId} onChange={(v) => updateCard(card.id, { fontId: v })} defaultLabel="Police du hero" />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
                Animation — ce bloc
                <AnimSelect value={card.textAnimation} onChange={(v) => updateCard(card.id, { textAnimation: v })} defaultLabel="Animation du hero" />
              </label>
              <ColorField label="Couleur du texte" hint="Vide = couleur du thème" value={card.textColor} onChange={(v) => updateCard(card.id, { textColor: v })} />
              <ColorField label="Fond de carte" hint="Vide = fond du thème" value={card.cardBg} onChange={(v) => updateCard(card.id, { cardBg: v })} noneOption />
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
                Cadre (décor)
                <select value={card.cardFrame} onChange={(e) => updateCard(card.id, { cardFrame: e.target.value })} className={inputClass}>
                  <option value="">Aucun</option>
                  {HERO_CARD_FRAMES.map((f) => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
              </label>
              {card.cardFrame && (
                <ColorField label="Couleur du cadre" hint="Vide = couleur d'accent" value={card.cardFrameColor} onChange={(v) => updateCard(card.id, { cardFrameColor: v })} transparentOption />
              )}
            </div>
            <div className="mt-2 flex flex-col gap-1">
              <span className="text-xs font-medium text-neutral-500">Aperçu</span>
              <PreviewStage themeVars={themeVars}>
                <ChapterContent
                  chapter={{
                    id: 3100,
                    kind: "text",
                    from: 0,
                    to: 1,
                    textColorOverride: card.textColor || undefined,
                    cardBgOverride: card.cardBg || undefined,
                    cardFrame: card.cardFrame || undefined,
                    frameColorOverride: card.cardFrameColor || undefined,
                    fontId: card.fontId || undefined,
                    scene: heroSceneFromCard(card, sceneCtx),
                  }}
                  textAnimation={card.textAnimation || heroAnimation || undefined}
                  className={cn("hs-overlay", animShow && "show", (card.textAnimation || heroAnimation) && `hs-anim-${card.textAnimation || heroAnimation}`)}
                />
              </PreviewStage>
            </div>
          </div>
        ) : card.kind === 'countdown' ? (
          <div key={card.id} className="rounded-xl border border-neutral-200 bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">
                Compte à rebours — jusqu'à la date du mariage du client
              </p>
              <button
                type="button"
                onClick={() => removeCard(card.id)}
                aria-label="Retirer ce bloc"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-500 hover:text-error"
              >
                <X size={16} />
              </button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500 sm:col-span-2">
                Style
                <select value={card.countdownStyle || "boxes"} onChange={(e) => updateCard(card.id, { countdownStyle: e.target.value })} className={inputClass}>
                  {HERO_COUNTDOWN_STYLES.map((st) => (
                    <option key={st.id} value={st.id}>{st.label}</option>
                  ))}
                </select>
              </label>
              <TimecodeField
                label="Apparaît à (s)"
                value={card.fromSec}
                max={duration}
                onChange={(v) => updateCard(card.id, { fromSec: v })}
                onCaler={() => updateCard(card.id, { fromSec: Math.round(currentTime * 10) / 10 })}
              />
              <TimecodeField
                label="Disparaît à (s)"
                value={card.toSec}
                max={duration}
                onChange={(v) => updateCard(card.id, { toSec: v })}
                onCaler={() => updateCard(card.id, { toSec: Math.round(currentTime * 10) / 10 })}
              />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
                Position verticale
                <select value={card.position} onChange={(e) => updateCard(card.id, { position: e.target.value as HeroCustomCard["position"] })} className={inputClass}>
                  <option value="top">Haut</option>
                  <option value="middle">Milieu</option>
                  <option value="bottom">Bas</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
                Animation — ce bloc
                <AnimSelect value={card.textAnimation} onChange={(v) => updateCard(card.id, { textAnimation: v })} defaultLabel="Animation du hero" />
              </label>
              <ColorField label="Couleur du texte" hint="Vide = couleur du thème" value={card.textColor} onChange={(v) => updateCard(card.id, { textColor: v })} />
              <ColorField label="Fond de carte" hint="Vide = fond du thème" value={card.cardBg} onChange={(v) => updateCard(card.id, { cardBg: v })} noneOption />
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
                Cadre (décor)
                <select value={card.cardFrame} onChange={(e) => updateCard(card.id, { cardFrame: e.target.value })} className={inputClass}>
                  <option value="">Aucun</option>
                  {HERO_CARD_FRAMES.map((f) => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
              </label>
              {card.cardFrame && (
                <ColorField label="Couleur du cadre" hint="Vide = couleur d'accent" value={card.cardFrameColor} onChange={(v) => updateCard(card.id, { cardFrameColor: v })} transparentOption />
              )}
            </div>
            <div className="mt-2 flex flex-col gap-1">
              <span className="text-xs font-medium text-neutral-500">Aperçu (décompte fictif de 100 jours)</span>
              <PreviewStage themeVars={themeVars}>
                <ChapterContent
                  chapter={{
                    id: 3000,
                    kind: "text",
                    from: 0,
                    to: 1,
                    countdown: { style: card.countdownStyle || "boxes", targetIso: COUNTDOWN_PREVIEW_TARGET },
                    textColorOverride: card.textColor || undefined,
                    cardBgOverride: card.cardBg || undefined,
                    cardFrame: card.cardFrame || undefined,
                    frameColorOverride: card.cardFrameColor || undefined,
                  }}
                  textAnimation={card.textAnimation || heroAnimation || undefined}
                  className={cn("hs-overlay", animShow && "show", (card.textAnimation || heroAnimation) && `hs-anim-${card.textAnimation || heroAnimation}`)}
                />
              </PreviewStage>
            </div>
          </div>
        ) : (
          <div key={card.id} className="rounded-xl border border-neutral-200 bg-white p-3">
            <div className="flex items-start gap-3">
              <textarea
                  value={card.text}
                  onChange={(e) => updateCard(card.id, { text: e.target.value })}
                  placeholder="Votre texte…"
                  rows={2}
                  maxLength={280}
                  className={cn(textareaClass, "flex-1")}
                />
              <button
                type="button"
                onClick={() => removeCard(card.id)}
                aria-label="Retirer ce bloc"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-500 hover:text-error"
              >
                <X size={16} />
              </button>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-3">
              <TimecodeField
                label="Apparaît à (s)"
                value={card.fromSec}
                max={duration}
                onChange={(v) => updateCard(card.id, { fromSec: v })}
                onCaler={() => updateCard(card.id, { fromSec: Math.round(currentTime * 10) / 10 })}
              />
              <TimecodeField
                label="Disparaît à (s)"
                value={card.toSec}
                max={duration}
                onChange={(v) => updateCard(card.id, { toSec: v })}
                onCaler={() => updateCard(card.id, { toSec: Math.round(currentTime * 10) / 10 })}
              />
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
                Position verticale
                <select
                  value={card.position}
                  onChange={(e) => updateCard(card.id, { position: e.target.value as HeroCustomCard["position"] })}
                  className={inputClass}
                >
                  <option value="top">Haut</option>
                  <option value="middle">Milieu</option>
                  <option value="bottom">Bas</option>
                </select>
              </label>
            </div>
            {/* Police/taille/couleur/cadre/animation/gras propres à CE
                bloc — vide = réglage hero-wide (cf. échanges des
                21/09/2026 et 23/09/2026, "pouvoir tout gérer comme pour
                les autres blocs") : même jeu complet de réglages que les
                3 blocs fixes ci-dessus, aperçu compris. */}
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
                Taille de police
                <select
                  value={card.titleSize}
                  onChange={(e) => updateCard(card.id, { titleSize: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Moyenne (défaut)</option>
                  <option value="sm">Petite</option>
                  <option value="md">Moyenne</option>
                  <option value="lg">Grande</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
                Police — ce bloc
                <FontSelect value={card.fontId} onChange={(v) => updateCard(card.id, { fontId: v })} defaultLabel="Police du hero" />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
                Animation — ce bloc
                <AnimSelect value={card.textAnimation} onChange={(v) => updateCard(card.id, { textAnimation: v })} defaultLabel="Animation du hero" />
              </label>
              <ColorField label="Couleur du texte" hint="Vide = couleur du thème" value={card.textColor} onChange={(v) => updateCard(card.id, { textColor: v })} />
              <ColorField label="Fond de carte" hint="Vide = fond du thème" value={card.cardBg} onChange={(v) => updateCard(card.id, { cardBg: v })} noneOption />
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
                Cadre (décor)
                <select value={card.cardFrame} onChange={(e) => updateCard(card.id, { cardFrame: e.target.value })} className={inputClass}>
                  <option value="">Aucun</option>
                  {HERO_CARD_FRAMES.map((f) => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
              </label>
              {card.cardFrame && (
                <ColorField label="Couleur du cadre" hint="Vide = couleur d'accent" value={card.cardFrameColor} onChange={(v) => updateCard(card.id, { cardFrameColor: v })} transparentOption />
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
              <BoldField checked={card.bold} onChange={(v) => updateCard(card.id, { bold: v })} />
            </div>

            <div className="mt-2 flex flex-col gap-1">
              <span className="text-xs font-medium text-neutral-500">Aperçu</span>
              <PreviewStage themeVars={themeVars}>
                <ChapterContent
                  chapter={{
                    id: 2000,
                    kind: "text",
                    from: 0,
                    to: 1,
                    lead: card.text || "Votre texte…",
                    titleSize: (card.titleSize || undefined) as HeroChapter["titleSize"],
                    textColorOverride: card.textColor || undefined,
                    cardBgOverride: card.cardBg || undefined,
                    cardFrame: card.cardFrame || undefined,
                    frameColorOverride: card.cardFrameColor || undefined,
                    fontId: card.fontId || undefined,
                    bold: card.bold,
                  }}
                  textAnimation={card.textAnimation || heroAnimation || undefined}
                  className={cn("hs-overlay", animShow && "show", (card.textAnimation || heroAnimation) && `hs-anim-${card.textAnimation || heroAnimation}`)}
                />
              </PreviewStage>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => addCard("countdown", "Compte à rebours")}
          className="flex items-center justify-center gap-1.5 self-start rounded-full border border-dashed border-neutral-300 px-4 py-2 text-[12.5px] font-medium text-neutral-500 hover:border-terracotta-500 hover:text-terracotta-500"
        >
          <Plus size={14} /> Ajouter un compte à rebours
        </button>

        <button
          type="button"
          onClick={() => addCard("text", "")}
          className="flex items-center justify-center gap-1.5 self-start rounded-full border border-dashed border-neutral-300 px-4 py-2 text-[12.5px] font-medium text-neutral-500 hover:border-terracotta-500 hover:text-terracotta-500"
        >
          <Plus size={14} /> Ajouter un bloc
        </button>
        <button
          type="button"
          onClick={() => addCard("scene", "Scène")}
          className="flex items-center justify-center gap-1.5 self-start rounded-full border border-dashed border-neutral-300 px-4 py-2 text-[12.5px] font-medium text-neutral-500 hover:border-terracotta-500 hover:text-terracotta-500"
        >
          <Plus size={14} /> Ajouter une scène
        </button>

    </>
  );
}
