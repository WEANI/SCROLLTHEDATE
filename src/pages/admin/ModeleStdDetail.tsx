import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { cn } from "@/lib/utils";
import {
  AdminButton,
  Panel,
  PanelTitle,
  PageHeader,
  ToastStack,
  inputClass,
  textareaClass,
  useToasts,
} from "@/components/admin-suite/ui";
import {
  getSaveTheDateTemplate,
  defaultOverrideFor,
  parseTemplateOverrides,
  templateDurationSec,
  type SaveTheDateTemplateOverride,
} from "@contracts/saveTheDateTemplates";
import {
  HERO_OVERLAY_GRAPHICS,
  HERO_FONTS,
  HERO_TEXT_ANIMATIONS,
  HERO_FILTERS,
  getHeroFont,
  useGoogleFont,
} from "@/components/hero-scrub/heroDecor";
import { HeroOverlayGraphic, HeroFilterLayer, ChapterContent } from "@/components/hero-scrub/HeroScrub";
import type { HeroChapter } from "@/components/hero-scrub/types";

type Push = (kind: "success" | "error", text: string) => void;

function useSaveSetting(push: Push) {
  return trpc.settings.adminUpdate.useMutation({
    onSuccess: () => push("success", "Modèle enregistré."),
    onError: () => push("error", "Échec de l'enregistrement."),
  });
}

function ColorField({
  label,
  hint,
  value,
  onChange,
  noneOption,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  /** Ajoute un bouton "Aucun fond" — sentinel 'none' (cf. doc de ChapterContent dans HeroScrub.tsx) : neutralise fond ET flou/bordure/ombre de la carte, pas juste un fond transparent. */
  noneOption?: boolean;
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
      {hint && <span className="text-[10px] font-normal normal-case text-neutral-400">{hint}</span>}
    </label>
  );
}

function fmtTimecode(sec: number) {
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(1).padStart(4, "0");
  return `${m}:${s}`;
}

/**
 * Page de réglages d'UN modèle Save the Date — cf. doc de TabModelesStd
 * dans Parametres.tsx (échange du 21/09/2026) : remplace l'ancien
 * empilement de `<select>` sans aperçu par une vidéo/timeline pour caler
 * les textes en les regardant, et un aperçu en direct dès qu'un
 * décor/police/animation/filtre est choisi — en réutilisant tel quel le
 * VRAI rendu de HeroScrub.tsx (HeroOverlayGraphic/HeroFilterLayer/
 * ChapterContent, exportées à cet effet) plutôt que de le redessiner.
 *
 * Les autres modèles (non ouverts ici) restent chargés en mémoire
 * (`allOverrides`) pour ne pas les écraser à l'enregistrement : la clé
 * `site_settings` "saveTheDateTemplates" stocke un tableau unique pour
 * TOUS les modèles (même mécanisme qu'avant ce découpage en pages).
 */
export default function ModeleStdDetail() {
  const { slug } = useParams();
  const template = getSaveTheDateTemplate(slug);
  const { toasts, push } = useToasts();
  const save = useSaveSetting(push);
  const q = trpc.settings.get.useQuery({ key: "saveTheDateTemplates" });

  const [allOverrides, setAllOverrides] = useState<Record<string, SaveTheDateTemplateOverride>>({});
  const [o, setO] = useState<SaveTheDateTemplateOverride | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded || !template) return;
    const saved = parseTemplateOverrides(q.data?.value);
    setAllOverrides(saved);
    setO(saved[template.slug] ?? defaultOverrideFor(template));
    setLoaded(true);
  }, [q.data, loaded, template]);

  const update = (patch: Partial<SaveTheDateTemplateOverride>) =>
    setO((prev) => (prev ? { ...prev, ...patch } : prev));

  const persist = () => {
    if (!o || !template) return;
    save.mutate({ key: "saveTheDateTemplates", value: Object.values({ ...allOverrides, [template.slug]: o }) });
  };

  // ---- lecteur vidéo + timeline (pour caler les textes en les regardant) ----
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);

  const seekTo = useCallback((sec: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(sec, v.duration || sec));
  }, []);

  const onBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = barRef.current;
    if (!bar || !videoDuration) return;
    const r = bar.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    seekTo(frac * videoDuration);
  };

  // ---- aperçu "police" : charge la police choisie à la volée ----
  useGoogleFont(o?.fontId);
  const fontPreview = getHeroFont(o?.fontId);

  // ---- aperçu "animation du texte" : rejoue en boucle (toggle show) ----
  const [animShow, setAnimShow] = useState(true);
  useEffect(() => {
    const id = window.setInterval(() => {
      setAnimShow(false);
      window.setTimeout(() => setAnimShow(true), 80);
    }, 2600);
    return () => window.clearInterval(id);
  }, [o?.textAnimation]);

  if (!template) {
    return (
      <div className="mx-auto w-full max-w-[1200px] text-ink">
        <PageHeader title="Modèle introuvable" />
        <Link to="/admin/parametres" className="text-sm font-medium text-terracotta-500 hover:text-terracotta-400">
          ← Retour aux modèles
        </Link>
      </div>
    );
  }

  if (!loaded || !o) return null;

  const duration = templateDurationSec(template);
  const previewChapter: HeroChapter = {
    id: 0,
    kind: "text",
    from: 0,
    to: 1,
    segments: [{ text: o.chapter1Text || "Save the date" }],
    titleSize: "lg",
  };
  const themeVars = {
    "--hs-frame-bg": template.theme.frameBg,
    "--hs-vignette": template.theme.vignette,
    "--hs-accent": template.theme.accent,
    "--hs-text-primary": template.theme.textPrimary,
    "--hs-text-secondary": template.theme.textSecondary,
    "--hs-card-bg": template.theme.cardBg,
    "--hs-card-border": template.theme.cardBorder,
    "--hs-card-shadow": template.theme.cardShadow,
    "--hs-font-family": fontPreview?.fontFamily || "'Fraunces', Georgia, serif",
  } as CSSProperties;

  return (
    <div className="mx-auto w-full max-w-[1200px] text-ink">
      <PageHeader
        title={o.name || template.name}
        description={`${duration.toFixed(1)} s de montage`}
        actions={
          <>
            <a
              href={`/save-the-date-modeles/${template.slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-terracotta-500 hover:text-terracotta-400"
            >
              Voir la page publique →
            </a>
            <Link
              to="/admin/parametres"
              className="flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-ink"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Modèles
            </Link>
          </>
        }
      />

      <div className="flex flex-col gap-4">
        {/* ---- Vidéo + timeline ---- */}
        <Panel>
          <PanelTitle
            title="Vidéo du montage"
            hint="Lisez/scrubbez pour repérer le bon instant, puis « Caler ici » sur le champ voulu — le filtre choisi ci-dessous s'applique déjà en direct."
          />
          <div className="p-6">
            <div
              className={cn("relative mx-auto w-full max-w-[280px] overflow-hidden rounded-xl bg-anthracite-950", o.filter && `hs-filter-${o.filter}`)}
              style={{ aspectRatio: "9/16" }}
            >
              <video
                ref={videoRef}
                src={template.desktopSrc}
                poster={template.posterSrc}
                controls
                muted
                playsInline
                className="hs-video absolute inset-0 h-full w-full object-cover"
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration)}
              />
              <HeroFilterLayer id={o.filter || undefined} />
            </div>

            {videoDuration > 0 && (
              <div className="mx-auto mt-4 max-w-[520px]">
                <div
                  ref={barRef}
                  onClick={onBarClick}
                  className="relative h-8 cursor-pointer rounded-md bg-neutral-100"
                >
                  <span
                    className="pointer-events-none absolute inset-y-0 rounded-md bg-terracotta-500/30"
                    style={{
                      left: `${(Math.min(o.chapter1FromSec, videoDuration) / videoDuration) * 100}%`,
                      width: `${(Math.max(0, o.chapter1ToSec - o.chapter1FromSec) / videoDuration) * 100}%`,
                    }}
                  />
                  <span
                    className="pointer-events-none absolute inset-y-0 rounded-md bg-terracotta-300/40"
                    style={{
                      left: `${(Math.min(o.chapter2FromSec, videoDuration) / videoDuration) * 100}%`,
                      width: `${(Math.max(0, o.chapter2ToSec - o.chapter2FromSec) / videoDuration) * 100}%`,
                    }}
                  />
                  <span
                    className="pointer-events-none absolute inset-y-0 w-[2px] bg-ink"
                    style={{ left: `${(currentTime / videoDuration) * 100}%` }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-neutral-500">
                  <span className="tabular">{fmtTimecode(currentTime)}</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-terracotta-500/60" /> Texte 1</span>
                    <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-terracotta-300/60" /> Texte 2</span>
                  </div>
                  <span className="tabular">{fmtTimecode(videoDuration)}</span>
                </div>
              </div>
            )}
          </div>
        </Panel>

        {/* ---- Textes ---- */}
        <Panel>
          <PanelTitle title="Contenu" hint="Nom, accroche et description affichés dans la bibliothèque de modèles." />
          <div className="grid gap-4 p-6 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
              Nom du modèle
              <input value={o.name} onChange={(e) => update({ name: e.target.value })} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
              Accroche (carte bibliothèque)
              <input value={o.tagline} onChange={(e) => update({ tagline: e.target.value })} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500 md:col-span-2">
              Description
              <textarea
                rows={2}
                value={o.description}
                onChange={(e) => update({ description: e.target.value })}
                className={textareaClass}
              />
            </label>
          </div>

          <div className="border-t border-neutral-200 p-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">
              1er texte affiché (ex. « Save the date »)
            </p>
            <div className="grid gap-3 md:grid-cols-5">
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500 md:col-span-2">
                Texte
                <input value={o.chapter1Text} onChange={(e) => update({ chapter1Text: e.target.value })} className={inputClass} />
              </label>
              <TimecodeField
                label="Apparaît à (s)"
                value={o.chapter1FromSec}
                max={duration}
                onChange={(v) => update({ chapter1FromSec: v })}
                onCaler={() => update({ chapter1FromSec: Math.round(currentTime * 10) / 10 })}
              />
              <TimecodeField
                label="Disparaît à (s)"
                value={o.chapter1ToSec}
                max={duration}
                onChange={(v) => update({ chapter1ToSec: v })}
                onCaler={() => update({ chapter1ToSec: Math.round(currentTime * 10) / 10 })}
              />
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
                Position verticale
                <select
                  value={o.chapter1Position}
                  onChange={(e) => update({ chapter1Position: e.target.value as SaveTheDateTemplateOverride["chapter1Position"] })}
                  className={inputClass}
                >
                  <option value="top">Haut</option>
                  <option value="middle">Milieu</option>
                  <option value="bottom">Bas</option>
                </select>
              </label>
            </div>
          </div>

          <div className="border-t border-neutral-200 p-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">
              2e texte — prénoms &amp; date d'exemple (un vrai client verra les siens à la place)
            </p>
            <div className="grid gap-3 md:grid-cols-5">
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
                Prénoms d'exemple
                <input value={o.exampleNames} onChange={(e) => update({ exampleNames: e.target.value })} className={inputClass} />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
                Date d'exemple
                <input value={o.exampleDate} onChange={(e) => update({ exampleDate: e.target.value })} className={inputClass} />
              </label>
              <TimecodeField
                label="Apparaît à (s)"
                value={o.chapter2FromSec}
                max={duration}
                onChange={(v) => update({ chapter2FromSec: v })}
                onCaler={() => update({ chapter2FromSec: Math.round(currentTime * 10) / 10 })}
              />
              <TimecodeField
                label="Disparaît à (s)"
                value={o.chapter2ToSec}
                max={duration}
                onChange={(v) => update({ chapter2ToSec: v })}
                onCaler={() => update({ chapter2ToSec: Math.round(currentTime * 10) / 10 })}
              />
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
                Position verticale
                <select
                  value={o.chapter2Position}
                  onChange={(e) => update({ chapter2Position: e.target.value as SaveTheDateTemplateOverride["chapter2Position"] })}
                  className={inputClass}
                >
                  <option value="top">Haut</option>
                  <option value="middle">Milieu</option>
                  <option value="bottom">Bas</option>
                </select>
              </label>
            </div>
          </div>

          <div className="border-t border-neutral-200 p-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">Couleurs des 2 textes</p>
            <div className="grid gap-4 md:grid-cols-4">
              <ColorField label="Texte — 1er bloc" hint="Vide = couleur du thème" value={o.chapter1TextColor} onChange={(v) => update({ chapter1TextColor: v })} />
              <ColorField label="Fond de carte — 1er bloc" hint="Vide = fond du thème" value={o.chapter1CardBg} onChange={(v) => update({ chapter1CardBg: v })} noneOption />
              <ColorField label="Texte — 2e bloc" hint="Vide = couleur du thème" value={o.chapter2TextColor} onChange={(v) => update({ chapter2TextColor: v })} />
              <ColorField label="Fond de carte — 2e bloc" hint="Vide = fond du thème" value={o.chapter2CardBg} onChange={(v) => update({ chapter2CardBg: v })} noneOption />
            </div>
          </div>
        </Panel>

        {/* ---- Décor & style, avec aperçu réactif ---- */}
        <Panel>
          <PanelTitle title="Décor & style" hint="Bibliothèque — l'aperçu se met à jour dès que vous changez un réglage." />
          <div className="grid gap-6 p-6 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
                Décor graphique
                <select value={o.overlayGraphic} onChange={(e) => update({ overlayGraphic: e.target.value })} className={inputClass}>
                  <option value="">Aucun</option>
                  {HERO_OVERLAY_GRAPHICS.map((g) => (
                    <option key={g.id} value={g.id}>{g.label}</option>
                  ))}
                </select>
              </label>
              <PreviewStage themeVars={themeVars}>
                <HeroOverlayGraphic id={o.overlayGraphic || undefined} />
              </PreviewStage>
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
                Police du titre
                <select value={o.fontId} onChange={(e) => update({ fontId: e.target.value })} className={inputClass}>
                  <option value="">Police du site (Fraunces)</option>
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
              </label>
              <PreviewStage themeVars={themeVars}>
                <p
                  className="px-4 text-center text-[28px] font-light leading-[1.1]"
                  style={{ color: "var(--hs-text-primary)", fontFamily: "var(--hs-font-family)", fontStyle: fontPreview?.italic ? "italic" : undefined }}
                >
                  {o.chapter1Text || "Save the date"}
                </p>
              </PreviewStage>
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
                Animation du texte
                <select value={o.textAnimation} onChange={(e) => update({ textAnimation: e.target.value })} className={inputClass}>
                  <option value="">Fondu (défaut)</option>
                  {HERO_TEXT_ANIMATIONS.map((a) => (
                    <option key={a.id} value={a.id}>{a.label}</option>
                  ))}
                </select>
              </label>
              <PreviewStage themeVars={themeVars}>
                <ChapterContent
                  chapter={previewChapter}
                  textAnimation={o.textAnimation || undefined}
                  className={cn("hs-overlay", animShow && "show", o.textAnimation && `hs-anim-${o.textAnimation}`)}
                />
              </PreviewStage>
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
                Filtre vidéo
                <select value={o.filter} onChange={(e) => update({ filter: e.target.value })} className={inputClass}>
                  <option value="">Aucun</option>
                  {HERO_FILTERS.map((f) => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
              </label>
              <p className="rounded-lg border border-dashed border-neutral-200 p-3 text-[11px] text-neutral-500">
                Déjà visible en direct sur la vidéo tout en haut de la page.
              </p>
            </div>
          </div>
        </Panel>

        <AdminButton className="self-start" disabled={save.isPending} onClick={persist}>
          {save.isPending ? <Loader2 className="animate-spin" /> : <Save />}
          Enregistrer le modèle
        </AdminButton>
      </div>

      <ToastStack toasts={toasts} />
    </div>
  );
}

/** Petite vignette 9:16 sombre, contexte de container-query (cqw) pour que le vrai composant HeroScrub s'y affiche à l'identique de la page publique. */
function PreviewStage({ themeVars, children }: { themeVars: CSSProperties; children: React.ReactNode }) {
  return (
    <div
      className="relative mx-auto w-full max-w-[200px] overflow-hidden rounded-lg bg-anthracite-950"
      style={{ aspectRatio: "9/16", containerType: "inline-size", ...themeVars } as CSSProperties}
    >
      {children}
    </div>
  );
}

function TimecodeField({
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
