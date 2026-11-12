import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Loader2, RotateCcw, Save } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { cn } from "@/lib/utils";
import { AdminButton, Panel, PanelTitle, PageHeader, ToastStack, inputClass, useToasts } from "@/components/admin-suite/ui";
import { HeroCardsEditor } from "@/components/admin/HeroCardsEditor";
import { fmtTimecode } from "@/components/admin/heroEditorUtils";
import { splitCoupleNames, useGoogleFonts } from "@/components/hero-scrub/heroDecor";
import type { HeroSceneContext } from "@/components/hero-scrub/heroScenes";
import { fillTokens, type HeroCard } from "@/components/hero-scrub/heroCards";
import {
  DEMO_VIDEOS,
  getDemoHero,
  parseDemoHeroSetting,
  videoDurationSec,
  type DemoHeroDef,
  type DemoHeroSetting,
} from "@/components/demo/demoHero";

/**
 * Réglage d'une vidéo démo (vidéo + blocs overlay), sur le modèle de
 * l'écran des Modèles Save the Date — ajouté le 12/11/2026. Même éditeur de
 * blocs (HeroCardsEditor) que les modèles. Tant que rien n'est enregistré,
 * la démo publique garde ses blocs d'origine.
 */
export default function DemoHeroDetail() {
  const { id } = useParams();
  const def = getDemoHero(id);
  const heroQ = trpc.settings.get.useQuery({ key: def?.heroKey ?? "none" }, { enabled: !!def });
  const namesQ = trpc.settings.get.useQuery({ key: def?.namesKey ?? "none" }, { enabled: !!def });

  if (!def) {
    return (
      <div className="mx-auto w-full max-w-[1200px] text-ink">
        <PageHeader title="Démo introuvable" />
        <Link to="/admin/parametres" className="text-sm font-medium text-terracotta-500 hover:text-terracotta-400">
          ← Retour aux paramètres
        </Link>
      </div>
    );
  }
  if (heroQ.isLoading || namesQ.isLoading) return null;

  const names = (namesQ.data?.value as { coupleNames?: string } | null)?.coupleNames?.trim() || "Anna & Théo";
  return <DemoHeroForm key={def.id} def={def} saved={parseDemoHeroSetting(heroQ.data?.value)} names={names} />;
}

function DemoHeroForm({ def, saved, names }: { def: DemoHeroDef; saved: DemoHeroSetting | null; names: string }) {
  const { toasts, push } = useToasts();
  const save = trpc.settings.adminUpdate.useMutation({
    onError: () => push("error", "Échec de l'enregistrement."),
  });

  const [videoId, setVideoId] = useState(() => saved?.videoId || def.defaultVideoId);
  const [cards, setCards] = useState<HeroCard[]>(() => saved?.cards ?? def.seedCards());
  const [isCustom, setIsCustom] = useState(!!saved);
  const video = DEMO_VIDEOS.find((v) => v.id === videoId) ?? DEMO_VIDEOS[0];
  const duration = videoDurationSec(video);

  const persist = () =>
    save.mutate(
      { key: def.heroKey, value: { videoId, cards } satisfies DemoHeroSetting },
      { onSuccess: () => { setIsCustom(true); push("success", "Démo enregistrée — visible sur la page publique."); } },
    );
  const resetToOriginal = () => {
    if (!window.confirm("Revenir à la vidéo et aux blocs d'origine de cette démo ? Vos réglages seront effacés.")) return;
    save.mutate(
      // Objet sans `cards` = « rien d'enregistré » (cf. parseDemoHeroSetting) ; null est refusé par la colonne.
      { key: def.heroKey, value: {} },
      {
        onSuccess: () => {
          setVideoId(def.defaultVideoId);
          setCards(def.seedCards());
          setIsCustom(false);
          push("success", "Démo remise à l'origine.");
        },
      },
    );
  };

  const videoRef = useRef<HTMLVideoElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const seekTo = useCallback((sec: number) => {
    const v = videoRef.current;
    if (v) v.currentTime = Math.max(0, Math.min(sec, v.duration || sec));
  }, []);
  const onBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = barRef.current;
    if (!bar) return;
    const r = bar.getBoundingClientRect();
    seekTo(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * duration);
  };

  useGoogleFonts(cards.map((c) => c.fontId));
  const [animShow, setAnimShow] = useState(true);
  useEffect(() => {
    const t = window.setInterval(() => {
      setAnimShow(false);
      window.setTimeout(() => setAnimShow(true), 80);
    }, 2600);
    return () => window.clearInterval(t);
  }, []);

  const theme = def.theme;
  const themeVars = {
    "--hs-frame-bg": theme.frameBg,
    "--hs-vignette": theme.vignette,
    "--hs-accent": theme.accent,
    "--hs-text-primary": theme.textPrimary,
    "--hs-text-secondary": theme.textSecondary,
    "--hs-card-bg": theme.cardBg,
    "--hs-card-border": theme.cardBorder,
    "--hs-card-shadow": theme.cardShadow,
    "--hs-font-family": "'Fraunces', Georgia, serif",
  } as CSSProperties;
  const [nA, nB] = splitCoupleNames(names);
  const sceneCtx: HeroSceneContext = {
    a: nA,
    b: nB,
    initials: `${nA.charAt(0)}${nB.charAt(0)}`.toLocaleUpperCase("fr-FR"),
    dateShort: def.ctx.dateShort,
    dateNumeric: new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(def.ctx.dateIso)).replace(/\//g, " · "),
    dateIso: new Date(def.ctx.dateIso).toISOString(),
  };

  return (
    <div className="mx-auto w-full max-w-[1200px] text-ink">
      <PageHeader
        title={`${def.label} — vidéo et blocs`}
        description={`${duration.toFixed(1)} s de vidéo · ${isCustom ? "réglage personnalisé en ligne" : "blocs d'origine (rien d'enregistré)"}`}
        actions={
          <>
            <a href={def.path} target="_blank" rel="noreferrer" className="text-xs font-medium text-terracotta-500 hover:text-terracotta-400">
              Voir la page publique →
            </a>
            <Link to="/admin/parametres" className="flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-ink">
              <ArrowLeft className="h-3.5 w-3.5" /> Paramètres
            </Link>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[280px_1fr] lg:items-start">
        <div className="lg:sticky lg:top-4">
          <Panel>
            <PanelTitle title="Vidéo" hint="Lisez ou faites défiler pour repérer le bon instant, puis « Caler ici » sur le bloc voulu." />
            <div className="p-6">
              <div className="relative mx-auto w-full max-w-[280px] overflow-hidden rounded-xl bg-anthracite-950" style={{ aspectRatio: "9/16" }}>
                <video
                  key={video.id}
                  ref={videoRef}
                  src={video.desktopSrc}
                  poster={video.posterSrc}
                  controls
                  muted
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover"
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                />
              </div>
              <div className="mx-auto mt-4 max-w-[520px]">
                <div ref={barRef} onClick={onBarClick} className="relative h-8 cursor-pointer rounded-md bg-neutral-100">
                  {cards.map((c) => (
                    <span
                      key={c.id}
                      className="pointer-events-none absolute rounded-sm bg-terracotta-500/30"
                      style={{
                        left: `${(Math.min(c.fromSec, duration) / duration) * 100}%`,
                        width: `${(Math.max(0, Math.min(c.toSec, duration) - c.fromSec) / duration) * 100}%`,
                        top: c.position === "top" ? "0" : c.position === "bottom" ? "66%" : "33%",
                        height: "34%",
                      }}
                    />
                  ))}
                  <span className="pointer-events-none absolute inset-y-0 w-[2px] bg-ink" style={{ left: `${(currentTime / duration) * 100}%` }} />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-neutral-500">
                  <span className="tabular">{fmtTimecode(currentTime)}</span>
                  <span>haut · milieu · bas</span>
                  <span className="tabular">{fmtTimecode(duration)}</span>
                </div>
              </div>
            </div>
          </Panel>
        </div>

        <div className="flex flex-col gap-4">
          <Panel>
            <PanelTitle
              title="Vidéo de la démo"
              hint="Si vous changez de vidéo, revérifiez les moments d'apparition de chaque bloc : ils sont en secondes."
            />
            <div className="p-6">
              <select value={videoId} onChange={(e) => setVideoId(e.target.value)} className={cn(inputClass, "max-w-md")}>
                {DEMO_VIDEOS.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label} — {videoDurationSec(v).toFixed(1)} s
                  </option>
                ))}
              </select>
            </div>
          </Panel>

          <Panel>
            <PanelTitle
              title="Blocs affichés sur la vidéo"
              hint={`Prénoms : « ${names} » (onglet Faire-part démo). Dans un bloc de texte, {prénoms}, {date}, {heure} et {lieu} sont remplacés par ceux de la démo. Deux blocs peuvent s'afficher ensemble s'ils ont une position verticale différente.`}
            />
            <div className="flex flex-col gap-3 p-6">
              <HeroCardsEditor
                cards={cards}
                onChange={setCards}
                currentTime={currentTime}
                duration={duration}
                themeVars={themeVars}
                heroAnimation=""
                animShow={animShow}
                sceneCtx={sceneCtx}
                allowNames
                previewNames={names}
                previewDate={def.ctx.dateShort}
                fillPreview={(t) => fillTokens(t, { ...def.ctx, coupleNames: names })}
              />
            </div>
          </Panel>

          <div className="flex flex-wrap items-center gap-3">
            <AdminButton disabled={save.isPending} onClick={persist}>
              {save.isPending ? <Loader2 className="animate-spin" /> : <Save />}
              Enregistrer la démo
            </AdminButton>
            {isCustom && (
              <button
                type="button"
                onClick={resetToOriginal}
                className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-error"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Revenir aux blocs d'origine
              </button>
            )}
          </div>
        </div>
      </div>

      <ToastStack toasts={toasts} />
    </div>
  );
}
