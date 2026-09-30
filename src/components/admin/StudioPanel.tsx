import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, Check, CloudUpload, ExternalLink, FileVideo, Loader2, Plus, Send, Sparkles, Upload, Wand2, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { cn } from "@/lib/utils";
import { suggestPalette, suggestPaletteFromColors, hexToRgbString } from "@/lib/suggestPalette";
import {
  HERO_OVERLAY_GRAPHICS,
  HERO_FONTS,
  HERO_TEXT_ANIMATIONS,
  HERO_FILTERS,
  HERO_CARD_FRAMES,
  HERO_COUNTDOWN_STYLES,
  HERO_DATE_FORMATS,
  HERO_MONOGRAM_LAYOUTS,
  HERO_MONOGRAM_FONT_IDS,
  HERO_SEAL_COLORS,
  HERO_SEAL_SHAPES,
  getHeroDateFormat,
  getHeroFont,
  monogramInitials,
  useGoogleFont,
  useGoogleFonts,
} from "@/components/hero-scrub/heroDecor";
import { HERO_THEMES } from "@/components/hero-scrub/themes";
import { ChapterContent } from "@/components/hero-scrub/HeroScrub";
import { HeroDateLayoutBlock, HeroMonogramBlock } from "@/components/hero-scrub/HeroDateBlocks";
import type { HeroChapter } from "@/components/hero-scrub/types";
import type {
  BespokePaletteInput,
  HeroChaptersFairePartInput,
  HeroChaptersSaveTheDateInput,
  HeroCustomCard,
} from "@contracts/bespokePalette";
import { QUESTIONNAIRE_KEYS } from "@contracts/questionnaireKeys";
import {
  coupleNamesFromSlug,
  formatDateTime,
  type Project360,
} from "@/components/admin/shared";
import { supabase } from "@/lib/supabaseClient";

// ---------------------------------------------------------------------------
// Éditeur de scénarios — 3 propositions
// ---------------------------------------------------------------------------
interface DraftProposal {
  title: string;
  summary: string;
  durationSec: number;
  tags: string[];
  moodboard: { url: string; caption?: string }[];
}

const EMPTY_PROPOSAL: DraftProposal = { title: "", summary: "", durationSec: 60, tags: [], moodboard: [] };
const AMBIANCE_TAGS = ["intimiste", "aventure", "cinéma", "humour", "poétique", "festif"];

function draftKey(projectId: number) {
  return `scrollthedate-scenario-draft-${projectId}`;
}

function loadDrafts(projectId: number, existing: Project360["scenarioProposals"]): DraftProposal[] {
  try {
    const raw = localStorage.getItem(draftKey(projectId));
    if (raw) {
      const parsed = JSON.parse(raw) as DraftProposal[];
      if (Array.isArray(parsed) && parsed.length === 3) return parsed;
    }
  } catch {
    /* brouillon illisible → on repart des données serveur */
  }
  return [1, 2, 3].map((i) => {
    const s = existing.find((p) => p.ordre === i);
    return s
      ? {
          title: s.title,
          summary: s.summary ?? "",
          durationSec: 60,
          tags: [],
          moodboard: (s.moodboard as DraftProposal["moodboard"] | null) ?? [],
        }
      : { ...EMPTY_PROPOSAL };
  });
}

/**
 * Retours du client sur les scénarios, affichés dans l'éditeur.
 *
 * Deux sources complémentaires :
 *  - le scénario lui-même (`status` + `clientComment`) pour la demande en
 *    cours ;
 *  - les événements d'audit pour l'HISTORIQUE, car renvoyer des scénarios
 *    passe par `replaceScenarios`, qui les supprime et les recrée : le
 *    `clientComment` est alors perdu, alors que l'audit, lui, subsiste.
 *    Sans ça, le studio corrigeait sans plus voir ce qui lui avait été
 *    demandé.
 */
function ClientFeedback({ project }: { project: Project360 }) {
  const enCours = project.scenarioProposals.filter(
    (s) => s.status === "changes_requested" && s.clientComment,
  );

  const historique = project.auditEvents
    .filter((e) => e.action === "scenario.changes_requested")
    .map((e) => {
      const meta = (e.meta ?? {}) as { title?: string; comment?: string };
      return { id: e.id, date: e.createdAt, titre: meta.title ?? "—", commentaire: meta.comment ?? "" };
    })
    .filter((h) => h.commentaire);

  if (enCours.length === 0 && historique.length === 0) return null;

  return (
    <div className="mb-5 rounded-xl border border-pending/30 bg-pending/[0.06] p-4">
      <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-pending">
        Retours du client
      </h4>

      {enCours.length > 0 && (
        <div className="mb-3 space-y-2">
          {enCours.map((s) => (
            <div key={s.id} className="rounded-lg border border-pending/30 bg-white p-3">
              <p className="text-[12px] font-semibold text-ink">
                Modification demandée sur « {s.title} »
              </p>
              <p className="mt-1 text-[12px] italic leading-relaxed text-neutral-500">
                « {s.clientComment} »
              </p>
            </div>
          ))}
        </div>
      )}

      {historique.length > 0 && (
        <details className="text-[12px]">
          <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            Historique des retours ({historique.length})
          </summary>
          <ul className="mt-2 space-y-1.5">
            {historique.map((h) => (
              <li key={h.id} className="text-[11px] leading-relaxed text-neutral-500">
                <span className="tabular">{formatDateTime(h.date)}</span> — «&nbsp;{h.titre}&nbsp;» :{" "}
                <span className="italic">{h.commentaire}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function ScenarioEditor({ project }: { project: Project360 }) {
  const utils = trpc.useUtils();
  const [drafts, setDrafts] = useState<DraftProposal[]>(() => loadDrafts(project.id, project.scenarioProposals));
  const [confirmSend, setConfirmSend] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  // Sauvegarde brouillon auto (locale) à chaque frappe
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(draftKey(project.id), JSON.stringify(drafts));
        setSavedAt(new Date());
      } catch {
        /* stockage indisponible */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [drafts, project.id]);

  const create = trpc.scenarios.adminCreate.useMutation({
    onSuccess: () => {
      utils.projects.adminGet.invalidate({ projectId: project.id });
      utils.projects.adminList.invalidate();
      utils.scenarios.adminList.invalidate({ projectId: project.id });
      localStorage.removeItem(draftKey(project.id));
      setConfirmSend(false);
      toast.success("Propositions envoyées — le client est notifié");
    },
    onError: () => toast.error("Échec de l'envoi des propositions"),
  });

  const update = (index: number, patch: Partial<DraftProposal>) =>
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));

  const validity = drafts.map((d) => d.title.trim().length > 0 && d.summary.trim().length > 0);
  const allValid = validity.every(Boolean);
  const clientMedia = project.media.filter((m) => m.status !== "rejected");
  const alreadySent = project.scenarioProposals.length === 3;

  const submit = () => {
    create.mutate({
      projectId: project.id,
      proposals: drafts.map((d, i) => ({
        ordre: (i + 1) as 1 | 2 | 3,
        title: d.title.trim(),
        summary:
          d.summary.trim() +
          `\n\n— Durée estimée : ${d.durationSec} s` +
          (d.tags.length > 0 ? ` · Ambiance : ${d.tags.join(", ")}` : ""),
        moodboard: d.moodboard.length > 0 ? d.moodboard : undefined,
      })),
    });
  };

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Éditeur de scénarios
        </h3>
        <span className="tabular text-[11px] text-neutral-500">
          {savedAt ? `Brouillon enregistré à ${savedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : "Sauvegarde auto"}
        </span>
      </div>

      <ClientFeedback project={project} />

      <div className="grid gap-4 xl:grid-cols-3">
        {drafts.map((d, i) => (
          <motion.article
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            className={cn(
              "flex flex-col gap-3 rounded-xl border bg-white p-4",
              validity[i] ? "border-neutral-200" : "border-error/40",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="tabular text-[11px] font-bold uppercase tracking-[0.14em] text-terracotta-500">
                Proposition {i + 1}
              </span>
              {!validity[i] && <span className="text-[10px] font-semibold text-error">Titre + résumé requis</span>}
            </div>
            <input
              value={d.title}
              onChange={(e) => update(i, { title: e.target.value })}
              placeholder="Le café renversé"
              className="font-display w-full border-b border-neutral-200 bg-transparent pb-2 text-[17px] font-medium outline-none placeholder:text-neutral-500/50 focus:border-terracotta-500"
            />
            <textarea
              value={d.summary}
              onChange={(e) => update(i, { summary: e.target.value })}
              placeholder="Résumé narratif du film…"
              rows={5}
              className="w-full resize-y rounded-lg bg-neutral-100 p-3 text-[13px] leading-relaxed outline-none placeholder:text-neutral-500 focus:ring-2 focus:ring-terracotta-500/40"
            />
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Durée</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => update(i, { durationSec: Math.max(30, d.durationSec - 15) })}
                  className="h-7 w-7 rounded-md border border-neutral-200 text-[13px] font-bold hover:border-terracotta-500"
                >
                  −
                </button>
                <span className="tabular w-14 text-center text-[13px] font-semibold">{d.durationSec} s</span>
                <button
                  type="button"
                  onClick={() => update(i, { durationSec: Math.min(120, d.durationSec + 15) })}
                  className="h-7 w-7 rounded-md border border-neutral-200 text-[13px] font-bold hover:border-terracotta-500"
                >
                  +
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {AMBIANCE_TAGS.map((tag) => {
                const active = d.tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      update(i, { tags: active ? d.tags.filter((t) => t !== tag) : [...d.tags, tag] })
                    }
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                      active
                        ? "bg-terracotta-500 text-white"
                        : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200",
                    )}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
            {/* Moodboard : sélection depuis les médias client */}
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Moodboard ({d.moodboard.length}/3)
              </p>
              <div className="flex flex-wrap gap-2">
                {d.moodboard.map((m, mi) => (
                  <span key={mi} className="group relative">
                    <img src={m.url} alt="" className="h-14 w-14 rounded-lg object-cover" />
                    <button
                      type="button"
                      aria-label="Retirer"
                      onClick={() => update(i, { moodboard: d.moodboard.filter((_, x) => x !== mi) })}
                      className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-error text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
                {d.moodboard.length < 3 &&
                  clientMedia
                    .filter((m) => m.type === "photo" && !d.moodboard.some((x) => x.url === m.url))
                    .slice(0, 6)
                    .map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        title={m.filename ?? "Ajouter au moodboard"}
                        onClick={() => update(i, { moodboard: [...d.moodboard, { url: m.url }] })}
                        className="relative h-14 w-14 overflow-hidden rounded-lg border border-dashed border-neutral-200 opacity-70 transition-all hover:border-terracotta-500 hover:opacity-100"
                      >
                        <img src={m.url} alt="" className="h-full w-full object-cover" />
                        <Plus size={12} className="absolute inset-0 m-auto text-white drop-shadow" />
                      </button>
                    ))}
                {clientMedia.filter((m) => m.type === "photo").length === 0 && d.moodboard.length === 0 && (
                  <span className="text-[11px] italic text-neutral-500">Aucune photo client disponible.</span>
                )}
              </div>
            </div>
          </motion.article>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4">
        <p className="text-[12px] text-neutral-500">
          {alreadySent
            ? "3 propositions déjà envoyées — un nouvel envoi les remplace."
            : "L'envoi exige les 3 propositions complètes (titre + résumé)."}
        </p>
        <button
          type="button"
          disabled={!allValid || create.isPending}
          onClick={() => setConfirmSend(true)}
          className="flex items-center gap-2 rounded-full bg-terracotta-500 px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {create.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Envoyer les 3 propositions au client
        </button>
      </div>

      {/* Modal prévisualisation envoi */}
      <AnimatePresence>
        {confirmSend && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-anthracite-950/50 p-6 backdrop-blur-sm"
            onClick={() => setConfirmSend(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
            >
              <h3 className="font-display text-[20px] font-medium">Envoyer les propositions ?</h3>
              <p className="mt-2 text-[13px] text-neutral-500">
                Le client recevra un email « Vos scénarios sont prêts » et un message système sera ajouté au
                fil du projet.
              </p>
              <ul className="mt-4 space-y-2 rounded-xl bg-neutral-100 p-4">
                {drafts.map((d, i) => (
                  <li key={i} className="tabular text-[13px]">
                    <span className="font-semibold text-terracotta-500">{i + 1}.</span>{" "}
                    <span className="font-display font-medium">{d.title}</span>
                    <span className="text-neutral-500"> — {d.durationSec} s</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmSend(false)}
                  className="rounded-full border border-neutral-200 px-5 py-2.5 text-[13px] font-semibold hover:border-neutral-500"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={create.isPending}
                  onClick={submit}
                  className="flex items-center gap-2 rounded-full bg-terracotta-500 px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-terracotta-400 disabled:opacity-40"
                >
                  {create.isPending && <Loader2 size={14} className="animate-spin" />}
                  Confirmer l'envoi
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Vidéo — ajout de version (filigrane par défaut)
// ---------------------------------------------------------------------------
function VideoManager({ project }: { project: Project360 }) {
  const utils = trpc.useUtils();
  const [url, setUrl] = useState("");
  const [watermark, setWatermark] = useState(true);
  const [status, setStatus] = useState<"draft" | "sent" | "final">("sent");
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // "Vidéo finale" = déposée directement sans filigrane, aucune étape de
  // validation client — le circuit "envoyer filigranée → le client
  // approuve → insérer en HD" (cf. plus bas, bouton "Insérer dans le
  // faire-part") reste disponible pour qui veut faire valider une
  // version avant de la publier, mais n'est plus obligatoire : un
  // filigrane n'a pas de sens sur une version déjà finale, watermark
  // forcé à faux dans ce cas.
  const isFinal = status === "final";

  const addVersion = trpc.videos.adminAddVersion.useMutation({
    onSuccess: (r) => {
      utils.projects.adminGet.invalidate({ projectId: project.id });
      utils.projects.adminList.invalidate();
      setUrl("");
      toast.success(
        status === "final"
          ? `Version finale (v${r.version}) déposée — visible immédiatement sur le faire-part`
          : status === "sent"
            ? `Version ${r.version} envoyée au client`
            : `Version ${r.version} enregistrée en brouillon`,
      );
    },
    onError: () => toast.error("Échec de l'ajout de la version"),
  });

  const markFinal = trpc.videos.adminAddVersion.useMutation({
    onSuccess: (r) => {
      utils.projects.adminGet.invalidate({ projectId: project.id });
      toast.success(`Version finale HD (v${r.version}) insérée dans le faire-part`);
    },
    onError: () => toast.error("Échec de l'insertion"),
  });

  const clientVideos = project.media.filter((m) => m.type === "video");
  const approved = project.videoVersions.find((v) => v.status === "approved");
  const nextVersion = (project.videoVersions.at(0)?.version ?? 0) + 1;

  return (
    <section>
      <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
        Vidéo — versions
      </h3>

      {/* Zone d'ajout */}
      <div className="rounded-xl border border-dashed border-terracotta-500/40 bg-white p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-terracotta-500/10 text-terracotta-500">
            <Upload size={17} />
          </span>
          <div className="flex-1 space-y-3">
            <p className="text-[13px] font-medium">
              Nouvelle version <span className="tabular text-neutral-500">(v{nextVersion})</span>
            </p>

            {/* Upload drag & drop */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files[0];
                if (f?.type.startsWith("video/")) { setFile(f); setUrl(""); }
                else toast.error("Le fichier doit être une vidéo MP4");
              }}
              className={cn(
                "flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-6 transition-colors",
                dragOver ? "border-terracotta-500 bg-terracotta-500/5" : "border-neutral-200 bg-neutral-50 hover:border-terracotta-400",
                file && "border-terracotta-500/50 bg-terracotta-500/5",
              )}
            >
              {file ? (
                <>
                  <FileVideo size={20} className="text-terracotta-500" />
                  <span className="text-[13px] font-medium text-ink">{file.name}</span>
                  <span className="text-[11px] text-neutral-500">{(file.size / 1024 / 1024).toFixed(1)} Mo</span>
                </>
              ) : (
                <>
                  <CloudUpload size={22} className={dragOver ? "text-terracotta-500" : "text-neutral-500"} />
                  <span className="text-[13px] font-medium text-ink">
                    Glissez un fichier MP4 ou <span className="text-terracotta-500 underline underline-offset-4">parcourez</span>
                  </span>
                  <span className="text-[11px] text-neutral-500">500 Mo max — découpée en images à l'envoi</span>
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/quicktime"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { setFile(f); setUrl(""); }
                e.target.value = "";
              }}
            />
            {file && (
              <button
                type="button"
                onClick={() => setFile(null)}
                className="text-[11px] font-medium text-neutral-500 underline-offset-2 hover:text-error hover:underline"
              >
                Retirer le fichier
              </button>
            )}

            {/* Barre de progression upload */}
            {isUploading && (
              <div className="space-y-1">
                <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200">
                  <div
                    className="h-full rounded-full bg-terracotta-500 transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-[11px] tabular text-neutral-500">Upload en cours… {uploadProgress} %</p>
              </div>
            )}

            {/* URL en alternative (input réduit) */}
            {!file && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-neutral-500">ou URL :</span>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://… ou /demo-film.mp4"
                  className="flex-1 rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 text-[12px] outline-none placeholder:text-neutral-500 focus:border-terracotta-500"
                />
              </div>
            )}
            {!file && clientVideos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {clientVideos.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setUrl(m.url)}
                    className="rounded-full bg-neutral-100 px-3 py-1 text-[11px] font-medium text-neutral-500 hover:bg-terracotta-500/10 hover:text-terracotta-500"
                  >
                    {m.filename ?? `Vidéo client #${m.id}`}
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-4">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "draft" | "sent" | "final")}
                className="h-9 rounded-[10px] border border-neutral-200 bg-white px-3 text-[12px] font-medium outline-none focus:border-terracotta-500"
              >
                <option value="final">Vidéo finale (publiée immédiatement)</option>
                <option value="sent">Envoyer au client (faire-part filigrané, pour approbation)</option>
                <option value="draft">Brouillon (invisible client)</option>
              </select>
              <button
                type="button"
                disabled={(url.trim().length === 0 && !file) || addVersion.isPending || isUploading}
                onClick={async () => {
                  let videoUrl = url.trim();
                  // Résultat d'upload en mode "frames" (défaut, cf. VideoManager
                  // plus haut) — reste `null` pour une URL saisie à la main ou
                  // un upload en mode "video" (repli), auquel cas `videoUrl`
                  // porte directement l'URL du fichier unique.
                  let uploadedFrames: { frameCount: number; frameFps: number; frameBaseUrl: string } | null = null;
                  // Si fichier sélectionné → upload d'abord
                  if (file) {
                    setIsUploading(true);
                    setUploadProgress(0);
                    try {
                      const { data: session } = await supabase.auth.getSession();
                      const token = session.session?.access_token;
                      if (!token) { toast.error("Session expirée — reconnectez-vous"); setIsUploading(false); return; }
                      const formData = new FormData();
                      formData.append("file", file);
                      formData.append("projectId", String(project.id));
                      // XHR pour le suivi de progression. Réponse à deux formes
                      // possibles côté serveur (cf. api/boot.ts) : mode "frames"
                      // (défaut) → { kind: "frames", frameCount, frameFps,
                      // frameBaseUrl } ; mode "video" (repli, non déclenché
                      // depuis cette UI pour l'instant) → { kind: "video", url }.
                      type UploadResponse =
                        | { kind: "video"; url: string }
                        | { kind: "frames"; frameCount: number; frameFps: number; frameBaseUrl: string };
                      const result = await new Promise<UploadResponse>((resolve, reject) => {
                        const xhr = new XMLHttpRequest();
                        xhr.open("POST", "/api/upload/video");
                        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
                        xhr.upload.onprogress = (e) => {
                          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
                        };
                        xhr.onload = () => {
                          if (xhr.status >= 200 && xhr.status < 300) {
                            resolve(JSON.parse(xhr.responseText) as UploadResponse);
                          } else {
                            const err = JSON.parse(xhr.responseText) as { error?: string };
                            reject(new Error(err.error ?? "Upload échoué"));
                          }
                        };
                        xhr.onerror = () => reject(new Error("Erreur réseau"));
                        xhr.send(formData);
                      });
                      if (result.kind === "frames") {
                        uploadedFrames = result;
                        videoUrl = "";
                      } else {
                        videoUrl = result.url;
                      }
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Upload échoué");
                      setIsUploading(false);
                      return;
                    }
                    setIsUploading(false);
                    setFile(null);
                  }
                  addVersion.mutate({
                    projectId: project.id,
                    ...(uploadedFrames ? uploadedFrames : { url: videoUrl }),
                    watermark: isFinal ? false : watermark,
                    status,
                  });
                }}
                className="ml-auto flex items-center gap-2 rounded-full bg-terracotta-500 px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-terracotta-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {(addVersion.isPending || isUploading) ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {status === "final" ? "Publier la version finale" : status === "sent" ? "Ajouter & envoyer" : "Ajouter le brouillon"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Historique */}
      <ul className="mt-4 space-y-2">
        {project.videoVersions.length === 0 && (
          <li className="rounded-xl border border-neutral-200 bg-white p-4 text-[13px] text-neutral-500">
            Aucune version pour l'instant.
          </li>
        )}
        {project.videoVersions.map((v) => (
          <li key={v.id} className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3">
            <span className="tabular text-[13px] font-bold">v{v.version}</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                v.status === "approved"
                  ? "bg-terracotta-500/15 text-terracotta-500"
                  : v.status === "final"
                    ? "bg-success/15 text-success"
                    : v.status === "sent"
                      ? "bg-info/15 text-info"
                      : "bg-neutral-500/15 text-neutral-500",
              )}
            >
              {v.status === "approved" ? "Approuvée" : v.status === "final" ? "Finale HD" : v.status === "sent" ? "Envoyée" : "Brouillon"}
            </span>
            {v.watermark && (
              <span className="rounded-full bg-anthracite-800 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                Filigrane
              </span>
            )}
            {v.kind === "frames" && (
              <span
                title={`Séquence d'images — ${v.frameCount ?? "?"} images à ${v.frameFps ?? "?"} im/s`}
                className="rounded-full bg-terracotta-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-terracotta-500"
              >
                Frames · {v.frameCount ?? "?"} images
              </span>
            )}
            <span className="tabular ml-auto text-[11px] text-neutral-500">{formatDateTime(v.createdAt)}</span>
          </li>
        ))}
      </ul>

      {approved && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-terracotta-500/30 bg-terracotta-500/5 p-4">
          <Sparkles size={16} className="text-terracotta-500" />
          <p className="flex-1 text-[13px] font-medium">
            La v{approved.version} est approuvée — prête pour la version finale HD.
          </p>
          <button
            type="button"
            disabled={markFinal.isPending}
            onClick={() =>
              markFinal.mutate({
                projectId: project.id,
                // La version approuvée peut être en mode "frames" — dans ce
                // cas `approved.url` n'est que la 1ère image (compat), la
                // reporter telle quelle créerait une version "finale" cassée
                // (une balise <video> pointée sur un .jpg). Reporter plutôt
                // les champs frames d'origine, cf. adminAddVersion.
                ...(approved.kind === "frames" && approved.frameBaseUrl && approved.frameCount && approved.frameFps
                  ? {
                      frameBaseUrl: approved.frameBaseUrl,
                      frameCount: approved.frameCount,
                      frameFps: approved.frameFps,
                    }
                  : { url: approved.url }),
                watermark: false,
                status: "final",
              })
            }
            className="flex items-center gap-2 rounded-full bg-terracotta-500 px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-terracotta-400 disabled:opacity-40"
          >
            {markFinal.isPending && <Loader2 size={14} className="animate-spin" />}
            Insérer dans le faire-part
          </button>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Faire-part — template + activation
// ---------------------------------------------------------------------------
const TEMPLATES = [
  { id: "editorial" as const, label: "Éditorial", img: "/template-editorial.jpg" },
  { id: "cinema" as const, label: "Cinéma", img: "/template-cinema.jpg" },
  { id: "minimal" as const, label: "Minimal", img: "/template-minimal.jpg" },
];

function FairePartActivation({ project }: { project: Project360 }) {
  const utils = trpc.useUtils();
  const [confirm, setConfirm] = useState(false);

  const setTemplate = trpc.projects.adminSetTemplate.useMutation({
    onSuccess: () => {
      utils.projects.adminGet.invalidate({ projectId: project.id });
      toast.success("Template du faire-part mis à jour");
    },
    onError: () => toast.error("Échec du changement de template"),
  });

  const activate = trpc.projects.adminUpdateStatus.useMutation({
    onSuccess: () => {
      utils.projects.adminGet.invalidate({ projectId: project.id });
      utils.projects.adminList.invalidate();
      utils.analytics.adminOverview.invalidate();
      setConfirm(false);
      toast.success("Faire-part activé — le client est notifié");
    },
    onError: () => toast.error("Échec de l'activation"),
  });

  // "/faire-part/", pas "/m/" — la vraie route publique (cf. App.tsx). Le
  // "/m/" affiché ici jusqu'au 29/08/2026 était une 404 pour tout vrai
  // client qui suivait ce lien ou scannait le QR code.
  const publicUrl = `${window.location.origin}/faire-part/${project.slug}`;
  const delivered = project.status === "DELIVERED";

  return (
    <section>
      <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
        Faire-part — activation
      </h3>

      <div className="grid gap-4 md:grid-cols-3">
        {TEMPLATES.map((t) => {
          const active = project.template === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => !active && setTemplate.mutate({ projectId: project.id, template: t.id })}
              className={cn(
                "group overflow-hidden rounded-xl border-2 bg-white text-left transition-all",
                active ? "border-terracotta-500 shadow-[0_8px_32px_rgba(201,111,90,.18)]" : "border-transparent hover:border-neutral-200",
              )}
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <img
                  src={t.img}
                  alt={`Template ${t.label}`}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {active && (
                  <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-terracotta-500 text-white">
                    <Check size={13} />
                  </span>
                )}
              </div>
              <p className="flex items-center justify-between px-3 py-2.5 text-[13px] font-semibold">
                {t.label}
                {active && <span className="text-[10px] font-bold uppercase tracking-wide text-terracotta-500">Actif</span>}
              </p>
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4 rounded-xl border border-neutral-200 bg-white p-5">
        {delivered ? (
          <>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-success/15 text-success">
              <Check size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold">Faire-part activé</p>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 truncate text-[12px] font-medium text-terracotta-500 hover:underline"
              >
                {publicUrl} <ExternalLink size={11} />
              </a>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-2">
              <QRCodeSVG value={publicUrl} size={72} fgColor="#232326" />
            </div>
          </>
        ) : (
          <>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold">Prêt à activer ?</p>
              <p className="text-[12px] text-neutral-500">
                L'URL publique sera <span className="tabular font-medium text-ink">/faire-part/{project.slug}</span> — QR
                généré, email de livraison et message client automatiques.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConfirm(true)}
              className="rounded-full bg-terracotta-500 px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400"
            >
              Activer le faire-part
            </button>
          </>
        )}
      </div>

      <AnimatePresence>
        {confirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-anthracite-950/50 p-6 backdrop-blur-sm"
            onClick={() => setConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl"
            >
              <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-terracotta-500/10 text-terracotta-500">
                <Sparkles size={22} />
              </span>
              <h3 className="font-display text-[20px] font-medium">
                Activer le faire-part de {coupleNamesFromSlug(project.slug)} ?
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">
                Le projet passera au statut « Livré », le client recevra l'email de livraison avec le lien et le
                QR code.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setConfirm(false)}
                  className="rounded-full border border-neutral-200 px-5 py-2.5 text-[13px] font-semibold hover:border-neutral-500"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={activate.isPending}
                  onClick={() => activate.mutate({ projectId: project.id, status: "DELIVERED" })}
                  className="flex items-center gap-2 rounded-full bg-terracotta-500 px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-terracotta-400 disabled:opacity-40"
                >
                  {activate.isPending && <Loader2 size={14} className="animate-spin" />}
                  Activer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Palette bespoke + timings du hero (PLAN-GENERALISATION-THEMES.md, Phase 2)
// ---------------------------------------------------------------------------
const FALLBACK_ACCENT = "#C96F5A"; // terracotta-500 — point de départ si le studio n'a pas encore choisi de couleur.

const BLANK_PALETTE: BespokePaletteInput = {
  bg: "",
  bgDate: "transparent",
  bgProgramme: "",
  bgLieu: "",
  bgDressCode: "",
  bgMenu: "",
  bgHistoire: "",
  bgFaq: "",
  bgHebergements: "",
  bgListeMariage: "",
  cream: "#F3EAD9",
  ink: "",
  inkRgb: "",
  inkOnCard: "",
  inkOnCardRgb: "",
  mapLine: "",
  bordeaux: "",
  bordeauxRgb: "",
  gold: "",
  goldRgb: "",
  sectionTitle: "",
  timelineAccent: "",
  stepLabel: "",
  seal: "",
  sealLight: "",
  sealDark: "",
  dressCode1: "",
  dressCode2: "",
  dressCode3: "",
  heroTextColor: "",
  heroCardBg: "",
  heroInviteText: "",
  heroClosingEnabled: true,
  stdSaveTheDateTextColor: "",
  stdSaveTheDateCardBg: "",
  stdSaveTheDateTitleSize: "",
  stdNamesDateTextColor: "",
  stdNamesDateCardBg: "",
  stdNamesDateAccentColor: "",
  stdSaveTheDateCardFrame: "",
  stdNamesDateCardFrame: "",
  stdSaveTheDateFontId: "",
  stdSaveTheDateTextAnimation: "",
  stdSaveTheDateBold: false,
  stdNamesDateFontId: "",
  stdNamesDateTextAnimation: "",
  stdNamesDateBold: false,
  stdNamesDateTitleSize: "",
  heroOverlayGraphic: "",
  heroFontId: "",
  heroTextAnimation: "",
  heroFilter: "",
  stdDateFormat: "",
};

const HERO_CHAPTER_LABELS = ["Ouverture", "Détails pratiques", "Clôture"] as const;
const BLANK_HERO_CHAPTERS: HeroChaptersFairePartInput = [
  { fromSec: 0, toSec: 0, position: "middle" },
  { fromSec: 0, toSec: 0, position: "middle" },
  { fromSec: 0, toSec: 0, position: "middle" },
];

// Save the date — cf. SaveTheDateEditor plus bas : 2 chapitres seulement
// ("Save the date" / prénoms+date), pas de "détails pratiques" ni de
// "clôture" (page dédiée bien plus courte, hero + footer uniquement).
const HERO_CHAPTER_LABELS_STD = ["Save the date", "Prénoms & date"] as const;
const BLANK_HERO_CHAPTERS_STD: HeroChaptersSaveTheDateInput = [
  { fromSec: 0, toSec: 0, position: "middle" },
  { fromSec: 0, toSec: 0, position: "middle" },
];

/** Cible de l'aperçu du compte à rebours — 100 jours après le chargement (jamais échue, contrairement à une date fixe). */
const STUDIO_COUNTDOWN_PREVIEW_TARGET = new Date(Date.now() + 100 * 86400000).toISOString();

/** Options du menu "Position verticale" — communes aux timings fixes et aux cartes personnalisées. */
const VERTICAL_ALIGN_OPTIONS = [
  { value: "top", label: "Haut" },
  { value: "middle", label: "Milieu" },
  { value: "bottom", label: "Bas" },
] as const;

/** Un champ couleur = swatch + saisie texte (certains champs comme `bg`/`bgDate` peuvent contenir "transparent" ou une rgba(), pas seulement du hex — le swatch retombe alors sur noir plutôt que de planter). */
function ColorField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const isHex = /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold text-neutral-500">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={isHex ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-8 shrink-0 cursor-pointer rounded-md border border-neutral-200 bg-transparent p-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 font-mono text-[12px] outline-none focus:border-terracotta-500"
        />
      </div>
      {hint && <span className="text-[10px] leading-snug text-neutral-500">{hint}</span>}
    </label>
  );
}

/** Même allure que les autres champs du studio — factorisé pour les nouveaux sélecteurs de style ci-dessous. */
const studioInput =
  "w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-terracotta-500";

/** Libellé + contrôle, dans le style des champs studio existants. */
function StudioField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold text-neutral-500">{label}</span>
      {children}
      {hint && <span className="text-[10px] leading-snug text-neutral-500">{hint}</span>}
    </label>
  );
}

/** Police d'UN bloc — même bibliothèque que les modèles Save the Date (heroDecor.ts). */
function StudioFontSelect({ value, onChange, defaultLabel }: { value: string; onChange: (v: string) => void; defaultLabel: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={studioInput}>
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

function StudioAnimSelect({ value, onChange, defaultLabel }: { value: string; onChange: (v: string) => void; defaultLabel: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={studioInput}>
      <option value="">{defaultLabel}</option>
      {HERO_TEXT_ANIMATIONS.map((a) => (
        <option key={a.id} value={a.id}>{a.label}</option>
      ))}
    </select>
  );
}

function StudioFrameSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={studioInput}>
      <option value="">Aucun</option>
      {HERO_CARD_FRAMES.map((f) => (
        <option key={f.id} value={f.id}>{f.label}</option>
      ))}
    </select>
  );
}

function StudioSizeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={studioInput}>
      <option value="">Moyenne (défaut)</option>
      <option value="sm">Petite</option>
      <option value="md">Moyenne</option>
      <option value="lg">Grande</option>
    </select>
  );
}

function StudioBold({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 self-end pb-1.5 text-[12px] font-medium text-neutral-500">
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

/**
 * Variables CSS du thème du projet — mêmes clés que `themeVars` dans
 * HeroScrub, pour que les aperçus ci-dessous rendent comme la vraie page
 * (cf. ModeleStdDetail, qui fait pareil à partir du thème du modèle).
 * `heroTextColor`/`heroCardBg` de la palette prévalent, comme dans
 * FairePart.tsx.
 */
function useStudioThemeVars(project: Project360): CSSProperties {
  const palette = { ...BLANK_PALETTE, ...((project.palette as BespokePaletteInput | null) ?? {}) };
  const theme = HERO_THEMES[(project.template as keyof typeof HERO_THEMES) ?? "cinema"] ?? HERO_THEMES.cinema;
  const heroFont = getHeroFont(palette.heroFontId);
  return {
    "--hs-frame-bg": theme.frameBg,
    "--hs-vignette": theme.vignette,
    "--hs-accent": theme.accent,
    "--hs-text-primary": palette.heroTextColor || theme.textPrimary,
    "--hs-text-secondary": palette.heroTextColor || theme.textSecondary,
    "--hs-card-bg": palette.heroCardBg || theme.cardBg,
    "--hs-card-border": theme.cardBorder,
    "--hs-card-shadow": theme.cardShadow,
    "--hs-font-family": heroFont?.fontFamily || "'Fraunces', Georgia, serif",
  } as CSSProperties;
}

/** Vignette 9:16 — contexte de container-query (cqw) pour que le vrai rendu HeroScrub s'y affiche à l'identique de la page publique. */
function StudioPreview({ themeVars, children }: { themeVars: CSSProperties; children: React.ReactNode }) {
  return (
    <div
      className="relative w-full max-w-[160px] overflow-hidden rounded-lg bg-anthracite-950"
      style={{ aspectRatio: "9/16", containerType: "inline-size", ...themeVars } as CSSProperties}
    >
      {children}
    </div>
  );
}

/** Rejoue l'animation d'apparition en boucle dans les aperçus (même principe que ModeleStdDetail). */
function useAnimReplay(dep: string | undefined) {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const id = window.setInterval(() => {
      setShow(false);
      window.setTimeout(() => setShow(true), 80);
    }, 2600);
    return () => window.clearInterval(id);
  }, [dep]);
  return show;
}

/**
 * Cartes de texte overlay LIBRES, en plus des chapitres fixes du hero —
 * commune aux 2 produits (rendue dans PaletteHeroEditor pour un faire-part,
 * SaveTheDateEditor pour un save the date), cf. doc de
 * contracts/bespokePalette.ts::heroCustomCardsSchema. Pas de capture
 * depuis une vidéo/frame ici (contrairement aux timings des chapitres
 * fixes, juste au-dessus dans les deux onglets) : l'admin lit l'instant
 * sur l'aperçu déjà affiché plus haut dans le même onglet et le saisit ici
 * au clavier — évite de tripler la logique d'aperçu vidéo/frames pour un
 * réglage secondaire.
 */
/** Carte vierge du type demandé — au niveau module : `Date.now()`/`Math.random()`
 * sont impurs, ils ne doivent jamais être évalués pendant un rendu. */
function blankCustomCard(kind: HeroCustomCard["kind"], text: string): HeroCustomCard {
  return {
    id: `card-${Date.now()}-${Math.round(Math.random() * 1000)}`,
    fromSec: 0,
    toSec: 0,
    text,
    position: "middle",
    kind,
    textColor: "",
    fontId: "",
    textAnimation: "",
    bold: false,
    titleSize: "",
    cardFrame: "",
    cardBg: "",
    countdownStyle: kind === "countdown" ? "boxes" : "",
    monogramLayout: kind === "monogram" ? "circle" : "",
    monogramAccent: "",
    sealColor: kind === "monogram" ? "#8c1d24" : "",
    sealShape: kind === "monogram" ? "classic" : "",
    sealColor2: "",
  };
}

function CustomCardsEditor({ project }: { project: Project360 }) {
  const utils = trpc.useUtils();
  const existing = (project.heroCustomCards as HeroCustomCard[] | null) ?? [];
  const [cards, setCards] = useState<HeroCustomCard[]>(existing);
  const themeVars = useStudioThemeVars(project);
  const animShow = useAnimReplay(undefined);
  // Polices choisies bloc par bloc — chargées ici pour que les aperçus
  // ci-dessous rendent avec la bonne police, comme la page publique.
  useGoogleFonts(cards.flatMap((c) => [c.fontId, c.kind === "monogram" ? c.monogramLayout && c.fontId : ""]));
  const answers = (project.questionnaire?.answers as Record<string, unknown> | null) ?? {};
  const coupleNames = (answers["couple.prenoms"] as string | undefined) || coupleNamesFromSlug(project.slug);
  const [monoA, monoB] = monogramInitials(coupleNames);

  const addCard = (kind: HeroCustomCard["kind"] = "text") =>
    setCards((prev) => [
      ...prev,
      blankCustomCard(kind, kind === "countdown" ? "Compte à rebours" : kind === "monogram" ? "Monogramme" : ""),
    ]);
  const removeCard = (id: string) => setCards((prev) => prev.filter((c) => c.id !== id));
  const updateCard = (id: string, patch: Partial<HeroCustomCard>) =>
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const save = trpc.projects.adminSetHeroCustomCards.useMutation({
    onSuccess: () => {
      utils.projects.adminGet.invalidate({ projectId: project.id });
      toast.success("Cartes de texte enregistrées");
    },
    onError: () => toast.error("Échec de l'enregistrement des cartes"),
  });
  const submit = () => {
    // Seules les cartes de TEXTE ont besoin d'un texte : pour un compte à
    // rebours ou un monogramme, `text` n'est qu'un placeholder (cf. doc de
    // heroCustomCardSchema, bespokePalette.ts).
    if (cards.some((c) => c.kind === "text" && !c.text.trim())) {
      toast.error("Chaque carte de texte doit avoir un texte.");
      return;
    }
    save.mutate({ projectId: project.id, heroCustomCards: cards });
  };

  /** Timing + position — communs aux 3 types de carte. */
  const timingFields = (card: HeroCustomCard) => (
    <div className="mt-2 grid grid-cols-3 gap-3">
      <StudioField label="Début (s)">
        <input
          type="number"
          step={0.1}
          min={0}
          value={card.fromSec}
          onChange={(e) => updateCard(card.id, { fromSec: Number(e.target.value) })}
          className={studioInput}
        />
      </StudioField>
      <StudioField label="Fin (s)">
        <input
          type="number"
          step={0.1}
          min={0}
          value={card.toSec}
          onChange={(e) => updateCard(card.id, { toSec: Number(e.target.value) })}
          className={studioInput}
        />
      </StudioField>
      <StudioField label="Position">
        <select
          value={card.position}
          onChange={(e) => updateCard(card.id, { position: e.target.value as "top" | "middle" | "bottom" })}
          className={studioInput}
        >
          {VERTICAL_ALIGN_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </StudioField>
    </div>
  );

  const removeButton = (card: HeroCustomCard) => (
    <button
      type="button"
      onClick={() => removeCard(card.id)}
      aria-label="Retirer cette carte"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-500 hover:text-error"
    >
      <X size={16} />
    </button>
  );

  return (
    <div className="border-t border-neutral-200 pt-6">
      <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
        Blocs overlay personnalisés
      </h3>
      <p className="mb-4 text-[12px] text-neutral-500">
        En plus des chapitres fixes ci-dessus — texte libre, compte à rebours ou monogramme des mariés, chacun avec
        ses propres police, taille, couleurs, cadre et animation (mêmes réglages que les modèles Save the Date).
        Repérez l'instant sur l'aperçu vidéo plus haut, puis saisissez-le ici.
      </p>

      {cards.length > 0 && (
        <div className="space-y-3">
          {cards.map((card) =>
            card.kind === "countdown" ? (
              <div key={card.id} className="rounded-xl border border-neutral-200 bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[12px] font-semibold text-ink">Compte à rebours — jusqu'à la date du mariage</p>
                  {removeButton(card)}
                </div>
                {timingFields(card)}
                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                  <StudioField label="Style">
                    <select
                      value={card.countdownStyle || "boxes"}
                      onChange={(e) => updateCard(card.id, { countdownStyle: e.target.value })}
                      className={studioInput}
                    >
                      {HERO_COUNTDOWN_STYLES.map((st) => (
                        <option key={st.id} value={st.id}>{st.label}</option>
                      ))}
                    </select>
                  </StudioField>
                  <StudioField label="Animation">
                    <StudioAnimSelect value={card.textAnimation} onChange={(v) => updateCard(card.id, { textAnimation: v })} defaultLabel="Animation du hero" />
                  </StudioField>
                  <StudioField label="Cadre (décor)">
                    <StudioFrameSelect value={card.cardFrame} onChange={(v) => updateCard(card.id, { cardFrame: v })} />
                  </StudioField>
                  <ColorField label="Couleur du texte" hint="Vide = couleur du thème" value={card.textColor} onChange={(v) => updateCard(card.id, { textColor: v })} />
                  <ColorField label="Fond de carte" hint="Vide = fond du thème" value={card.cardBg} onChange={(v) => updateCard(card.id, { cardBg: v })} />
                </div>
                <div className="mt-2 flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-neutral-500">Aperçu (décompte fictif de 100 jours)</span>
                  <StudioPreview themeVars={themeVars}>
                    <ChapterContent
                      chapter={{
                        id: 3000,
                        kind: "text",
                        from: 0,
                        to: 1,
                        countdown: { style: card.countdownStyle || "boxes", targetIso: STUDIO_COUNTDOWN_PREVIEW_TARGET },
                        textColorOverride: card.textColor || undefined,
                        cardBgOverride: card.cardBg || undefined,
                        cardFrame: card.cardFrame || undefined,
                      }}
                      textAnimation={card.textAnimation || undefined}
                      className={cn("hs-overlay", animShow && "show", card.textAnimation && `hs-anim-${card.textAnimation}`)}
                    />
                  </StudioPreview>
                </div>
              </div>
            ) : card.kind === "monogram" ? (
              <div key={card.id} className="rounded-xl border border-neutral-200 bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[12px] font-semibold text-ink">
                    Monogramme — initiales des mariés ({monoA} &amp; {monoB})
                  </p>
                  {removeButton(card)}
                </div>
                {timingFields(card)}
                <div className="mt-3">
                  <p className="mb-2 text-[11px] font-semibold text-neutral-500">Mise en page</p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
                    {HERO_MONOGRAM_LAYOUTS.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        title={l.desc}
                        onClick={() => updateCard(card.id, { monogramLayout: l.id })}
                        className={cn(
                          "flex flex-col gap-1.5 rounded-xl border p-1.5 text-center transition-colors",
                          (card.monogramLayout || "circle") === l.id
                            ? "border-terracotta-500 bg-terracotta-500/5"
                            : "border-neutral-200 hover:border-terracotta-300",
                        )}
                      >
                        <div
                          className="relative flex w-full items-center justify-center overflow-hidden rounded-lg bg-anthracite-950"
                          style={{
                            aspectRatio: "1",
                            containerType: "inline-size",
                            ...themeVars,
                            ...(getHeroFont(card.fontId) ? { "--hs-font-family": getHeroFont(card.fontId)!.fontFamily } : null),
                          } as CSSProperties}
                        >
                          <HeroMonogramBlock
                            m={{
                              layout: l.id,
                              a: monoA,
                              b: monoB,
                              accent: card.monogramAccent,
                              sealColor: card.sealColor,
                              sealShape: card.sealShape || "classic",
                              sealColor2: card.sealColor2,
                              dateShort: "12 juin 2027",
                              dateNumeric: "12 · 06 · 2027",
                            }}
                            size="sm"
                            fontId={card.fontId}
                          />
                        </div>
                        <span className="text-[10px] font-medium leading-tight text-ink">{l.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                  <StudioField label="Police des initiales">
                    <select value={card.fontId} onChange={(e) => updateCard(card.id, { fontId: e.target.value })} className={studioInput}>
                      <option value="">Police du hero</option>
                      {HERO_MONOGRAM_FONT_IDS.map((id) => {
                        const f = getHeroFont(id);
                        return f ? <option key={id} value={id}>{f.label}</option> : null;
                      })}
                    </select>
                  </StudioField>
                  <StudioField label="Taille">
                    <StudioSizeSelect value={card.titleSize} onChange={(v) => updateCard(card.id, { titleSize: v })} />
                  </StudioField>
                  <StudioField label="Animation">
                    <StudioAnimSelect value={card.textAnimation} onChange={(v) => updateCard(card.id, { textAnimation: v })} defaultLabel="Animation du hero" />
                  </StudioField>
                  <ColorField label="Couleur des lettres" hint="Vide = couleur du thème" value={card.textColor} onChange={(v) => updateCard(card.id, { textColor: v })} />
                  {(card.monogramLayout || "circle") !== "wax" && (
                    <ColorField label="Couleur des filets & de l'esperluette" hint="Vide = accent du thème" value={card.monogramAccent} onChange={(v) => updateCard(card.id, { monogramAccent: v })} />
                  )}
                  {(card.monogramLayout || "circle") === "wax" && (
                    <>
                      <StudioField label="Forme du sceau">
                        <select value={card.sealShape || "classic"} onChange={(e) => updateCard(card.id, { sealShape: e.target.value })} className={studioInput}>
                          {HERO_SEAL_SHAPES.map((sh) => (
                            <option key={sh.id} value={sh.id} title={sh.desc}>{sh.label}</option>
                          ))}
                        </select>
                      </StudioField>
                      <div className="flex flex-col gap-1.5">
                        <ColorField label="Couleur du sceau" hint="Vide = bordeaux" value={card.sealColor} onChange={(v) => updateCard(card.id, { sealColor: v })} />
                        <div className="flex flex-wrap gap-1.5">
                          {HERO_SEAL_COLORS.map((c) => (
                            <button
                              key={c.hex}
                              type="button"
                              title={c.label}
                              aria-label={c.label}
                              onClick={() => updateCard(card.id, { sealColor: c.hex })}
                              className={cn(
                                "h-5 w-5 rounded-full border-2",
                                card.sealColor.toLowerCase() === c.hex ? "border-ink" : "border-white ring-1 ring-neutral-200",
                              )}
                              style={{ background: c.hex }}
                            />
                          ))}
                        </div>
                      </div>
                      {(card.sealShape || "classic") === "double" && (
                        <ColorField label="Couleur du 2e liseré" hint="Vide = couleur du sceau" value={card.sealColor2} onChange={(v) => updateCard(card.id, { sealColor2: v })} />
                      )}
                    </>
                  )}
                  <ColorField label="Fond de carte" hint="Vide = fond du thème" value={card.cardBg} onChange={(v) => updateCard(card.id, { cardBg: v })} />
                  <StudioField label="Cadre (décor)">
                    <StudioFrameSelect value={card.cardFrame} onChange={(v) => updateCard(card.id, { cardFrame: v })} />
                  </StudioField>
                </div>
                <div className="mt-2 flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-neutral-500">Aperçu</span>
                  <StudioPreview themeVars={themeVars}>
                    <ChapterContent
                      chapter={{
                        id: 4000,
                        kind: "text",
                        from: 0,
                        to: 1,
                        titleSize: (card.titleSize || undefined) as HeroChapter["titleSize"],
                        textColorOverride: card.textColor || undefined,
                        cardBgOverride: card.cardBg || undefined,
                        cardFrame: card.cardFrame || undefined,
                        fontId: card.fontId || undefined,
                        monogram: {
                          layout: card.monogramLayout || "circle",
                          a: monoA,
                          b: monoB,
                          accent: card.monogramAccent,
                          sealColor: card.sealColor,
                          sealShape: card.sealShape || "classic",
                          sealColor2: card.sealColor2,
                          dateShort: "12 juin 2027",
                          dateNumeric: "12 · 06 · 2027",
                        },
                      }}
                      textAnimation={card.textAnimation || undefined}
                      className={cn("hs-overlay", animShow && "show", card.textAnimation && `hs-anim-${card.textAnimation}`)}
                    />
                  </StudioPreview>
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
                    className="flex-1 resize-y rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-terracotta-500"
                  />
                  {removeButton(card)}
                </div>
                {timingFields(card)}
                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                  <StudioField label="Taille de police">
                    <StudioSizeSelect value={card.titleSize} onChange={(v) => updateCard(card.id, { titleSize: v })} />
                  </StudioField>
                  <StudioField label="Police — ce bloc">
                    <StudioFontSelect value={card.fontId} onChange={(v) => updateCard(card.id, { fontId: v })} defaultLabel="Police du hero" />
                  </StudioField>
                  <StudioField label="Animation — ce bloc">
                    <StudioAnimSelect value={card.textAnimation} onChange={(v) => updateCard(card.id, { textAnimation: v })} defaultLabel="Animation du hero" />
                  </StudioField>
                  <ColorField label="Couleur du texte" hint="Vide = couleur du thème" value={card.textColor} onChange={(v) => updateCard(card.id, { textColor: v })} />
                  <ColorField label="Fond de carte" hint="Vide = fond du thème" value={card.cardBg} onChange={(v) => updateCard(card.id, { cardBg: v })} />
                  <StudioField label="Cadre (décor)">
                    <StudioFrameSelect value={card.cardFrame} onChange={(v) => updateCard(card.id, { cardFrame: v })} />
                  </StudioField>
                </div>
                <div className="mt-2 flex flex-wrap items-end gap-4">
                  <StudioBold checked={card.bold} onChange={(v) => updateCard(card.id, { bold: v })} />
                </div>
                <div className="mt-2 flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-neutral-500">Aperçu</span>
                  <StudioPreview themeVars={themeVars}>
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
                        fontId: card.fontId || undefined,
                        bold: card.bold,
                      }}
                      textAnimation={card.textAnimation || undefined}
                      className={cn("hs-overlay", animShow && "show", card.textAnimation && `hs-anim-${card.textAnimation}`)}
                    />
                  </StudioPreview>
                </div>
              </div>
            ),
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {([
            ["text", "Ajouter un texte"],
            ["countdown", "Ajouter un compte à rebours"],
            ["monogram", "Ajouter un monogramme"],
          ] as const).map(([kind, label]) => (
            <button
              key={kind}
              type="button"
              disabled={cards.length >= 10}
              onClick={() => addCard(kind)}
              className="flex items-center gap-2 rounded-full border border-dashed border-neutral-300 px-4 py-2 text-[12px] font-semibold text-neutral-500 transition-colors hover:border-terracotta-400 hover:text-terracotta-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={14} />
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={save.isPending}
          onClick={submit}
          className="flex items-center gap-2 rounded-full bg-terracotta-500 px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400 disabled:opacity-40"
        >
          {save.isPending && <Loader2 size={14} className="animate-spin" />}
          Enregistrer les blocs
        </button>
      </div>
    </div>
  );
}

function PaletteHeroEditor({ project }: { project: Project360 }) {
  const utils = trpc.useUtils();
  const answers = (project.questionnaire?.answers as Record<string, unknown> | null) ?? {};
  const modeHint = answers[QUESTIONNAIRE_KEYS.paletteMode] === true ? "dark" : "light";
  const preferenceHint =
    typeof answers[QUESTIONNAIRE_KEYS.palettePreference] === "string"
      ? (answers[QUESTIONNAIRE_KEYS.palettePreference] as string).trim()
      : "";
  const avoidHint =
    typeof answers[QUESTIONNAIRE_KEYS.paletteAEviter] === "string"
      ? (answers[QUESTIONNAIRE_KEYS.paletteAEviter] as string).trim()
      : "";
  // Couleur de fond exacte (champ `color` du questionnaire) : contrairement
  // aux autres indications, c'est une valeur directement exploitable — d'où
  // le bouton « Utiliser » ci-dessous, qui la reporte dans la palette.
  const fondHint =
    typeof answers[QUESTIONNAIRE_KEYS.paletteFond] === "string" &&
    /^#[0-9a-fA-F]{6}$/.test(answers[QUESTIONNAIRE_KEYS.paletteFond] as string)
      ? (answers[QUESTIONNAIRE_KEYS.paletteFond] as string).toLowerCase()
      : "";
  // "Thème et couleurs du mariage" — question `color` (maxColors 4, cf.
  // QUESTIONNAIRE_KEYS.paletteTheme), jusqu'à 4 teintes indicatives EN PLUS
  // de `fondHint` ci-dessus. Pas de champ de palette dédié où les reporter
  // automatiquement (contrairement à `fondHint` → `palette.bg`) : affichées
  // en repère avec un bouton "Copier" chacune, à coller à la main dans le
  // ou les champs de palette pertinents. Une réponse saisie avant le
  // passage de cette question en `color` (07/09/2026) était une chaîne
  // libre, jamais un hex valide — filtrée silencieusement ici, comme dans
  // MultiColorQuestionField côté questionnaire.
  const themeColorsHint = (() => {
    const v = answers[QUESTIONNAIRE_KEYS.paletteTheme];
    const raw = Array.isArray(v) ? v : typeof v === "string" ? [v] : [];
    return raw
      .filter((x): x is string => typeof x === "string" && /^#[0-9a-fA-F]{6}$/.test(x))
      .map((x) => x.toLowerCase());
  })();

  const existingPalette = project.palette as BespokePaletteInput | null;
  const [mode, setMode] = useState<"light" | "dark">(modeHint);
  const [accentColor, setAccentColor] = useState(existingPalette?.gold ?? FALLBACK_ACCENT);
  // Fusionné avec BLANK_PALETTE (pas juste `existingPalette ?? BLANK_PALETTE`)
  // : une palette enregistrée avant l'ajout d'un champ (ex. heroTextColor/
  // heroCardBg/heroInviteText, cf. échange du 06/09/2026) ne le porte pas
  // du tout — sans fusion, ce champ resterait `undefined` dans le
  // formulaire (valeur incontrôlée sur l'input) et disparaîtrait carrément
  // du payload envoyé à l'enregistrement (JSON omet les clés `undefined`),
  // rejeté côté serveur qui l'exige (cf. bespokePaletteSchema).
  const [palette, setPalette] = useState<BespokePaletteInput>({ ...BLANK_PALETTE, ...existingPalette });
  // Charge la police choisie pour l'aperçu ci-dessous — même chargement
  // que la page publique (cf. doc de useGoogleFont), rien de spécifique à
  // l'aperçu studio.
  useGoogleFont(palette.heroFontId);

  const setField = (key: keyof BespokePaletteInput, value: string) =>
    setPalette((prev) => ({ ...prev, [key]: value }));
  // Seul champ booléen de BespokePaletteInput (les 21 autres sont des
  // chaînes) — setter dédié plutôt que d'élargir `setField` à `string |
  // boolean` pour tous les appelants existants.
  const setHeroClosingEnabled = (value: boolean) => setPalette((prev) => ({ ...prev, heroClosingEnabled: value }));

  const generate = () => setPalette(suggestPalette(accentColor, mode, fondHint || undefined));
  // Composition à partir des vraies couleurs choisies par le couple
  // (themeColorsHint, cf. plus haut) plutôt que d'une seule couleur saisie
  // à l'œil — cf. doc de suggestPaletteFromColors pour l'affectation
  // exacte (1ère couleur = accent principal, 2e = secondaire, 3e/4e =
  // pastilles dress code).
  const generateFromTheme = () => setPalette(suggestPaletteFromColors(themeColorsHint, mode, fondHint || undefined));

  const savePalette = trpc.projects.adminSetPalette.useMutation({
    onSuccess: () => {
      utils.projects.adminGet.invalidate({ projectId: project.id });
      toast.success("Palette enregistrée");
    },
    onError: () => toast.error("Échec de l'enregistrement de la palette"),
  });

  const submitPalette = () => {
    // Les 4 champs `...Rgb` ne sont jamais saisis à la main — recalculés
    // ici depuis leur compagnon hex pour ne jamais désynchroniser les deux.
    const complete: BespokePaletteInput = {
      ...palette,
      inkRgb: hexToRgbString(palette.ink),
      inkOnCardRgb: hexToRgbString(palette.inkOnCard),
      bordeauxRgb: hexToRgbString(palette.bordeaux),
      goldRgb: hexToRgbString(palette.gold),
    };
    savePalette.mutate({ projectId: project.id, palette: complete });
  };

  // Timings du hero — faire-part uniquement (3 chapitres) ; un save the
  // date a son propre onglet dédié, cf. SaveTheDateEditor plus bas (2
  // chapitres, page hero + footer sans corps).
  const isStd = project.product === "SAVE_THE_DATE";
  // Vérifie la longueur RÉELLE avant de faire confiance au cast TS
  // (`project.heroChapters` n'est qu'un JSONB, aucune validation à la
  // lecture) — un projet dont les timings ont été réglés avant l'ajout de
  // l'onglet Save the Date (donc encore au format 3 chapitres faire-part)
  // se retrouvait sinon avec un tableau à 3 éléments réutilisé tel quel :
  // seuls les 2 premiers étaient éditables ici, le 3e restait invisible
  // mais repartait au prochain enregistrement, gardant un tableau à 3
  // éléments pour un projet qui en attend 3 ici — sans incidence propre à
  // cet éditeur, mais le même bug côté SaveTheDateEditor (2 attendus)
  // envoyait un tableau à 3 éléments accepté par le schéma (union 2 ou 3)
  // sans jamais recouper avec le produit réel — reproduit en conditions
  // réelles le 08/09/2026 (commande 25, Yasmine & Adam : timings ignorés,
  // tout retombait sur le repli générique en toute fin de scroll).
  const existingChapters =
    Array.isArray(project.heroChapters) && project.heroChapters.length === 3
      ? (project.heroChapters as HeroChaptersFairePartInput)
      : null;
  const [chapters, setChapters] = useState<HeroChaptersFairePartInput>(existingChapters ?? BLANK_HERO_CHAPTERS);
  const videoRef = useRef<HTMLVideoElement>(null);
  const approvedVideo =
    project.videoVersions.find((v) => v.status === "approved" || v.status === "final") ??
    project.videoVersions.at(0);
  // Mode "frames" (cf. VideoManager plus haut) : pas de fichier vidéo unique
  // à faire défiler — `approvedVideo.url` n'est que la 1ère image (valeur de
  // compatibilité côté API), pas lisible par une balise <video>. On repère
  // les instants via un curseur d'index d'image à la place (cf. rendu plus
  // bas), converti en secondes via `frameFps`.
  const isFrameMode = approvedVideo?.kind === "frames";
  const [frameIdx, setFrameIdx] = useState(0);

  const setChapterField = (index: number, key: "fromSec" | "toSec", value: number) =>
    setChapters((prev) => {
      const next = [...prev] as HeroChaptersFairePartInput;
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  const setChapterPosition = (index: number, position: "top" | "middle" | "bottom") =>
    setChapters((prev) => {
      const next = [...prev] as HeroChaptersFairePartInput;
      next[index] = { ...next[index], position };
      return next;
    });

  const capture = (index: number, key: "fromSec" | "toSec") => {
    const t = isFrameMode ? frameIdx / (approvedVideo?.frameFps ?? 12) : videoRef.current?.currentTime;
    if (t === undefined) return;
    setChapterField(index, key, Math.round(t * 10) / 10);
  };

  const saveChapters = trpc.projects.adminSetHeroChapters.useMutation({
    onSuccess: () => {
      utils.projects.adminGet.invalidate({ projectId: project.id });
      toast.success("Timings du hero enregistrés");
    },
    onError: () => toast.error("Échec de l'enregistrement des timings"),
  });

  return (
    <section className="space-y-8">
      {/* Indications du client — jamais appliquées automatiquement, juste un repère pour le studio */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Indications du client (questionnaire)
        </h3>
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <p className="text-[11px] font-semibold text-neutral-500">Fond souhaité</p>
            <p className="text-[13px] font-medium">{modeHint === "dark" ? "Sombre" : "Clair"}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-neutral-500">Couleur de fond exacte</p>
            {fondHint ? (
              <div className="flex items-center gap-2">
                <span
                  className="h-4 w-4 shrink-0 rounded-full border border-neutral-200"
                  style={{ backgroundColor: fondHint }}
                />
                <span className="font-mono text-[12px] font-medium">{fondHint}</span>
                <button
                  type="button"
                  onClick={() => setField("bg", fondHint)}
                  className="text-[11px] text-terracotta-500 underline-offset-2 hover:underline"
                >
                  Utiliser
                </button>
              </div>
            ) : (
              <p className="text-[13px] font-medium">—</p>
            )}
          </div>
          <div>
            <p className="text-[11px] font-semibold text-neutral-500">Couleur souhaitée</p>
            <p className="text-[13px] font-medium">{preferenceHint || "—"}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-neutral-500">Couleur à éviter</p>
            <p className="text-[13px] font-medium">{avoidHint || "—"}</p>
          </div>
        </div>
        <div className="mt-4 border-t border-neutral-100 pt-4">
          <p className="mb-2 text-[11px] font-semibold text-neutral-500">
            Thème et couleurs du mariage <span className="font-normal">(jusqu'à 4, en plus du fond ci-dessus)</span>
          </p>
          {themeColorsHint.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {themeColorsHint.map((hex) => (
                <div key={hex} className="flex items-center gap-2 rounded-lg border border-neutral-200 px-2.5 py-1.5">
                  <span className="h-4 w-4 shrink-0 rounded-full border border-neutral-200" style={{ backgroundColor: hex }} />
                  <span className="font-mono text-[12px] font-medium">{hex}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard
                        .writeText(hex)
                        .then(() => toast.success(`${hex} copié`))
                        .catch(() => toast.error("Impossible de copier"));
                    }}
                    className="text-[11px] text-terracotta-500 underline-offset-2 hover:underline"
                  >
                    Copier
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] font-medium">—</p>
          )}
        </div>
      </div>

      {/* Générateur de proposition */}
      <div className="rounded-xl border border-dashed border-terracotta-500/40 bg-white p-4">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Proposition de départ
        </h3>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex gap-1 rounded-full border border-neutral-200 bg-neutral-100 p-1">
            {(["light", "dark"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors",
                  mode === m ? "bg-anthracite-800 text-white" : "text-neutral-500 hover:text-ink",
                )}
              >
                {m === "light" ? "Clair" : "Sombre"}
              </button>
            ))}
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-neutral-500">Couleur approximative (à l'œil, d'après l'indication client)</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(accentColor) ? accentColor : FALLBACK_ACCENT}
                onChange={(e) => setAccentColor(e.target.value)}
                className="h-9 w-9 shrink-0 cursor-pointer rounded-md border border-neutral-200 bg-transparent p-0"
              />
              <input
                type="text"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-28 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 font-mono text-[12px] outline-none focus:border-terracotta-500"
              />
            </div>
          </label>
          <button
            type="button"
            onClick={generate}
            className="flex items-center gap-2 rounded-full bg-anthracite-800 px-4 py-2.5 text-[13px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-anthracite-700"
          >
            <Wand2 size={14} />
            Générer une proposition
          </button>
          {themeColorsHint.length > 0 && (
            <button
              type="button"
              onClick={generateFromTheme}
              title={`À partir de : ${themeColorsHint.join(", ")}`}
              className="flex items-center gap-2 rounded-full bg-terracotta-500 px-4 py-2.5 text-[13px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400"
            >
              <Wand2 size={14} />
              Composer depuis les couleurs du client
            </button>
          )}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-neutral-500">
          "Générer une proposition" remplit les champs de fonds/encre/accents/sceau à partir d'une seule couleur
          saisie à l'œil. "Composer depuis les couleurs du client" (visible si le couple a répondu à "Thème et
          couleurs du mariage") fait la même chose mais à partir des vraies couleurs choisies par le couple : la 1ère
          devient l'accent principal, la 2e le secondaire, la 3e/4e alimentent les pastilles dress code. Dans les
          deux cas : un point de départ à retoucher, jamais le résultat final.
        </p>
      </div>

      {/* 22 champs, retouchables à la main */}
      <div className="space-y-5">
        <div>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">Fonds</h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ColorField label="Fond des cartes" value={palette.bg} onChange={(v) => setField("bg", v)} />
            <ColorField label="Fond case Date" value={palette.bgDate} onChange={(v) => setField("bgDate", v)} />
            <ColorField
              label="Fond piste Programme"
              value={palette.bgProgramme}
              onChange={(v) => setField("bgProgramme", v)}
            />
            <ColorField label="Crème du sceau" value={palette.cream} onChange={(v) => setField("cream", v)} />
          </div>
          <p className="mb-2 mt-4 text-[11px] text-neutral-500">Par section — vide = fond de carte ci-dessus (Lieu, FAQ, Hébergements, Liste de mariage) ou transparent (Dress code, Menu, Notre histoire).</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ColorField label="Fond Lieu" hint="Vide = fond des cartes" value={palette.bgLieu} onChange={(v) => setField("bgLieu", v)} />
            <ColorField label="Fond Dress code" hint="Vide = transparent" value={palette.bgDressCode} onChange={(v) => setField("bgDressCode", v)} />
            <ColorField label="Fond Menu du dîner" hint="Vide = transparent" value={palette.bgMenu} onChange={(v) => setField("bgMenu", v)} />
            <ColorField label="Fond Notre histoire" hint="Vide = transparent" value={palette.bgHistoire} onChange={(v) => setField("bgHistoire", v)} />
            <ColorField label="Fond FAQ" hint="Vide = fond des cartes" value={palette.bgFaq} onChange={(v) => setField("bgFaq", v)} />
            <ColorField label="Fond Hébergements" hint="Vide = fond des cartes" value={palette.bgHebergements} onChange={(v) => setField("bgHebergements", v)} />
            <ColorField label="Fond Liste de mariage" hint="Vide = fond des cartes" value={palette.bgListeMariage} onChange={(v) => setField("bgListeMariage", v)} />
          </div>
        </div>
        <div>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">Encre</h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ColorField
              label="Texte sur le fond de page"
              value={palette.ink}
              onChange={(v) => setField("ink", v)}
            />
            <ColorField
              label="Texte sur les cartes"
              value={palette.inkOnCard}
              onChange={(v) => setField("inkOnCard", v)}
            />
            <ColorField
              label="Traits de la carte (Lieu)"
              value={palette.mapLine}
              onChange={(v) => setField("mapLine", v)}
            />
          </div>
        </div>
        <div>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">Accents</h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ColorField label="Accent principal" value={palette.gold} onChange={(v) => setField("gold", v)} />
            <ColorField
              label="Accent secondaire"
              value={palette.bordeaux}
              onChange={(v) => setField("bordeaux", v)}
            />
            <ColorField
              label="Titres de section"
              value={palette.sectionTitle}
              onChange={(v) => setField("sectionTitle", v)}
            />
            <ColorField
              label="Chiffre de l'heure (Programme)"
              value={palette.timelineAccent}
              onChange={(v) => setField("timelineAccent", v)}
            />
            <ColorField
              label="Titre de l'étape (Programme)"
              value={palette.stepLabel}
              onChange={(v) => setField("stepLabel", v)}
            />
          </div>
        </div>
        <div>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">Sceau RSVP</h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ColorField label="Sceau" value={palette.seal} onChange={(v) => setField("seal", v)} />
            <ColorField
              label="Sceau — teinte claire"
              value={palette.sealLight}
              onChange={(v) => setField("sealLight", v)}
            />
            <ColorField
              label="Sceau — teinte sombre"
              value={palette.sealDark}
              onChange={(v) => setField("sealDark", v)}
            />
          </div>
        </div>
        <div>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
            Dress code — teintes suggérées
          </h4>
          <p className="mb-2 text-[11px] text-neutral-500">
            1 à 3 pastilles affichées sous le dress code. Laisser vide pour retomber sur les teintes pastel par
            défaut.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ColorField label="Teinte 1" value={palette.dressCode1} onChange={(v) => setField("dressCode1", v)} />
            <ColorField label="Teinte 2" value={palette.dressCode2} onChange={(v) => setField("dressCode2", v)} />
            <ColorField label="Teinte 3" value={palette.dressCode3} onChange={(v) => setField("dressCode3", v)} />
          </div>
        </div>
        <div>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
            Texte overlay du hero
          </h4>
          <p className="mb-2 text-[11px] text-neutral-500">
            Le texte affiché par-dessus la vidéo du hero (prénoms, date…). Laisser vide pour retomber sur le thème du
            hero (Éditorial/Cinéma/Minimal) — fond de carte transparent par défaut.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <ColorField
              label="Couleur du texte"
              hint="Vide = couleur du thème"
              value={palette.heroTextColor}
              onChange={(v) => setField("heroTextColor", v)}
            />
            <ColorField
              label="Fond de la carte"
              hint="Vide = transparent"
              value={palette.heroCardBg}
              onChange={(v) => setField("heroCardBg", v)}
            />
          </div>
          <label className="mt-3 flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-neutral-500">
              Texte sous les prénoms (chapitre d'ouverture)
            </span>
            <input
              value={palette.heroInviteText}
              onChange={(e) => setField("heroInviteText", e.target.value)}
              placeholder="Vide = aucun texte"
              className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[12px] outline-none placeholder:text-neutral-500 focus:border-terracotta-500"
            />
          </label>
          <label className="mt-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={palette.heroClosingEnabled}
              onChange={(e) => setHeroClosingEnabled(e.target.checked)}
              className="h-4 w-4 accent-terracotta-500"
            />
            <span className="text-[12px] font-medium">
              Afficher le texte de clôture en fin de vidéo (prénoms + date)
            </span>
          </label>
          <p className="mt-1 text-[11px] text-neutral-500">
            Uniquement pour un projet sans timings studio réglés (onglet Vidéo → Timings du hero) — sinon le chapitre
            "Détails pratiques" prend le relais, piloté par son propre timing.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-neutral-500">Décor graphique</span>
              <select
                value={palette.heroOverlayGraphic}
                onChange={(e) => setField("heroOverlayGraphic", e.target.value)}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[12px] outline-none focus:border-terracotta-500"
              >
                <option value="">Aucun</option>
                {HERO_OVERLAY_GRAPHICS.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-neutral-500">Police du titre</span>
              <select
                value={palette.heroFontId}
                onChange={(e) => setField("heroFontId", e.target.value)}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[12px] outline-none focus:border-terracotta-500"
              >
                <option value="">Police du site (Fraunces)</option>
                {Object.entries(
                  HERO_FONTS.reduce<Record<string, typeof HERO_FONTS>>((acc, f) => {
                    (acc[f.category] ??= []).push(f);
                    return acc;
                  }, {}),
                ).map(([category, fonts]) => (
                  <optgroup key={category} label={category}>
                    {fonts.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-neutral-500">Animation du texte</span>
              <select
                value={palette.heroTextAnimation}
                onChange={(e) => setField("heroTextAnimation", e.target.value)}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[12px] outline-none focus:border-terracotta-500"
              >
                <option value="">Fondu (défaut)</option>
                {HERO_TEXT_ANIMATIONS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-neutral-500">Filtre vidéo</span>
              <select
                value={palette.heroFilter}
                onChange={(e) => setField("heroFilter", e.target.value)}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[12px] outline-none focus:border-terracotta-500"
              >
                <option value="">Aucun</option>
                {HERO_FILTERS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {palette.heroFontId && getHeroFont(palette.heroFontId) && (
            <p
              className="mt-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-[13px] text-neutral-500"
              style={{
                fontFamily: getHeroFont(palette.heroFontId)!.fontFamily,
                fontStyle: getHeroFont(palette.heroFontId)!.italic ? "italic" : "normal",
                fontSize: "22px",
                color: "#232326",
              }}
            >
              Aperçu — {(answers["couple.prenoms"] as string | undefined) || "Prénom & Prénom"}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={savePalette.isPending}
          onClick={submitPalette}
          className="flex items-center gap-2 rounded-full bg-terracotta-500 px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400 disabled:opacity-40"
        >
          {savePalette.isPending && <Loader2 size={14} className="animate-spin" />}
          Enregistrer la palette
        </button>
      </div>

      {/* Timings du hero — faire-part uniquement (3 chapitres fixes), cf.
          isStd plus haut. Un save the date règle ses 2 timings dans son
          propre onglet dédié (SaveTheDateEditor). */}
      {!isStd && (
      <div className="border-t border-neutral-200 pt-6">
        <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Timings du hero vidéo
        </h3>
        <p className="mb-4 text-[12px] text-neutral-500">
          3 chapitres fixes (ouverture, détails pratiques, clôture) — le texte de chacun vient du questionnaire,
          seuls les instants où ils apparaissent à l'image se règlent ici.
        </p>

        {approvedVideo && isFrameMode && approvedVideo.frameBaseUrl && approvedVideo.frameCount ? (
          <div className="mb-4 w-full max-w-md space-y-2">
            <img
              src={`${approvedVideo.frameBaseUrl}${String(frameIdx + 1).padStart(5, "0")}.jpg`}
              alt=""
              className="w-full rounded-xl bg-black"
            />
            <input
              type="range"
              min={0}
              max={approvedVideo.frameCount - 1}
              value={frameIdx}
              onChange={(e) => setFrameIdx(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-[11px] tabular text-neutral-500">
              Image {frameIdx + 1} / {approvedVideo.frameCount} — {(frameIdx / (approvedVideo.frameFps ?? 12)).toFixed(1)} s
            </p>
          </div>
        ) : approvedVideo ? (
          <video ref={videoRef} src={approvedVideo.url} controls className="mb-4 w-full max-w-md rounded-xl bg-black" />
        ) : (
          <p className="mb-4 rounded-xl border border-neutral-200 bg-white p-4 text-[13px] text-neutral-500">
            Aucune vidéo disponible pour repérer les instants — ajoutez d'abord une version dans l'onglet Vidéo.
          </p>
        )}

        <div className="space-y-3">
          {HERO_CHAPTER_LABELS.map((label, i) => (
            <div key={label} className="grid items-end gap-3 rounded-xl border border-neutral-200 bg-white p-3 sm:grid-cols-[120px_1fr_1fr_110px]">
              <span className="text-[13px] font-semibold">{label}</span>
              {(["fromSec", "toSec"] as const).map((key) => (
                <label key={key} className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-neutral-500">
                    {key === "fromSec" ? "Début (s)" : "Fin (s)"}
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step={0.1}
                      min={0}
                      value={chapters[i][key]}
                      onChange={(e) => setChapterField(i, key, Number(e.target.value))}
                      className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-terracotta-500"
                    />
                    <button
                      type="button"
                      disabled={!approvedVideo}
                      title="Capturer l'instant courant de la vidéo"
                      onClick={() => capture(i, key)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-neutral-200 text-neutral-500 hover:border-terracotta-500 hover:text-terracotta-500 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Camera size={14} />
                    </button>
                  </div>
                </label>
              ))}
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-neutral-500">Position</span>
                <select
                  value={chapters[i].position}
                  onChange={(e) => setChapterPosition(i, e.target.value as "top" | "middle" | "bottom")}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-terracotta-500"
                >
                  {VERTICAL_ALIGN_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={saveChapters.isPending}
            onClick={() => saveChapters.mutate({ projectId: project.id, heroChapters: chapters })}
            className="flex items-center gap-2 rounded-full bg-terracotta-500 px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400 disabled:opacity-40"
          >
            {saveChapters.isPending && <Loader2 size={14} className="animate-spin" />}
            Enregistrer les timings
          </button>
        </div>
      </div>
      )}

      {/* Communes aux 2 produits — cf. doc de CustomCardsEditor. Rendu ici
          (Palette & Hero, seul onglet commun à faire-part et save the
          date) plutôt que dupliqué aussi dans l'onglet Save the Date, pour
          n'avoir qu'un seul endroit où les gérer. */}
      <CustomCardsEditor project={project} />
    </section>
  );
}

/**
 * Onglet "Save the Date" — remplace l'onglet "Faire-part" pour un projet
 * SAVE_THE_DATE (cf. isStd dans PaletteHeroEditor, StudioPanel plus bas) :
 * la page publique n'a pas de corps à activer/thématiser (hero + footer
 * uniquement, cf. échange du 07/09/2026), seuls les 2 timings du hero
 * restent à régler ("Save the date" / prénoms+date). Même mécanique de
 * repérage (aperçu vidéo/frames + capture de l'instant courant) que
 * "Timings du hero vidéo" dans PaletteHeroEditor, dupliquée plutôt que
 * factorisée : les 2 structures divergent (2 chapitres fixes vs 3) et la
 * logique reste courte, pas de gain clair à l'abstraire pour un seul autre
 * appelant.
 */
function SaveTheDateEditor({ project }: { project: Project360 }) {
  const utils = trpc.useUtils();
  // Vérifie la longueur RÉELLE avant de faire confiance au cast TS — cf.
  // le même garde-fou dans PaletteHeroEditor pour l'explication complète
  // du bug reproduit en conditions réelles (commande 25).
  const existingChapters =
    Array.isArray(project.heroChapters) && project.heroChapters.length === 2
      ? (project.heroChapters as HeroChaptersSaveTheDateInput)
      : null;
  const [chapters, setChapters] = useState<HeroChaptersSaveTheDateInput>(existingChapters ?? BLANK_HERO_CHAPTERS_STD);
  const videoRef = useRef<HTMLVideoElement>(null);
  const approvedVideo =
    project.videoVersions.find((v) => v.status === "approved" || v.status === "final") ??
    project.videoVersions.at(0);
  const isFrameMode = approvedVideo?.kind === "frames";
  const [frameIdx, setFrameIdx] = useState(0);

  const setChapterField = (index: number, key: "fromSec" | "toSec", value: number) =>
    setChapters((prev) => {
      const next = [...prev] as HeroChaptersSaveTheDateInput;
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  const setChapterPosition = (index: number, position: "top" | "middle" | "bottom") =>
    setChapters((prev) => {
      const next = [...prev] as HeroChaptersSaveTheDateInput;
      next[index] = { ...next[index], position };
      return next;
    });

  const capture = (index: number, key: "fromSec" | "toSec") => {
    const t = isFrameMode ? frameIdx / (approvedVideo?.frameFps ?? 12) : videoRef.current?.currentTime;
    if (t === undefined) return;
    setChapterField(index, key, Math.round(t * 10) / 10);
  };

  const saveChapters = trpc.projects.adminSetHeroChapters.useMutation({
    onSuccess: () => {
      utils.projects.adminGet.invalidate({ projectId: project.id });
      toast.success("Timings du hero enregistrés");
    },
    onError: () => toast.error("Échec de l'enregistrement des timings"),
  });

  // Couleurs propres à chacun des 2 blocs de texte overlay — cf. doc de
  // BespokePalette.stdSaveTheDateTextColor et co. Fusionnées avec le reste
  // de la palette existante à l'enregistrement (les 18 autres champs,
  // gérés dans l'onglet "Palette & Hero", ne doivent pas être écrasés) —
  // même recalcul des *Rgb que PaletteHeroEditor.submitPalette, ces champs
  // pouvant avoir changé entre-temps dans cet autre onglet.
  const existingPalette = { ...BLANK_PALETTE, ...(project.palette as BespokePaletteInput | null) };
  // Jeu COMPLET de réglages par bloc — mêmes possibilités que les modèles
  // Save the Date (cf. ModeleStdDetail) : taille, police, animation, gras,
  // couleurs, cadre, plus le format de la date. Tous ces champs existaient
  // déjà sur la palette et étaient déjà rendus par FairePart.tsx ; seul le
  // studio ne les exposait pas (échange du 30/09/2026).
  const [stdColors, setStdColors] = useState({
    stdSaveTheDateTextColor: existingPalette.stdSaveTheDateTextColor,
    stdSaveTheDateCardBg: existingPalette.stdSaveTheDateCardBg,
    stdSaveTheDateTitleSize: existingPalette.stdSaveTheDateTitleSize,
    stdSaveTheDateCardFrame: existingPalette.stdSaveTheDateCardFrame,
    stdSaveTheDateFontId: existingPalette.stdSaveTheDateFontId,
    stdSaveTheDateTextAnimation: existingPalette.stdSaveTheDateTextAnimation,
    stdSaveTheDateBold: existingPalette.stdSaveTheDateBold,
    stdNamesDateTextColor: existingPalette.stdNamesDateTextColor,
    stdNamesDateCardBg: existingPalette.stdNamesDateCardBg,
    stdNamesDateAccentColor: existingPalette.stdNamesDateAccentColor,
    stdNamesDateTitleSize: existingPalette.stdNamesDateTitleSize,
    stdNamesDateCardFrame: existingPalette.stdNamesDateCardFrame,
    stdNamesDateFontId: existingPalette.stdNamesDateFontId,
    stdNamesDateTextAnimation: existingPalette.stdNamesDateTextAnimation,
    stdNamesDateBold: existingPalette.stdNamesDateBold,
    stdDateFormat: existingPalette.stdDateFormat,
  });
  const setStdColor = (key: keyof typeof stdColors, value: string | boolean) =>
    setStdColors((prev) => ({ ...prev, [key]: value }));
  const stdThemeVars = useStudioThemeVars(project);
  const stdAnimShow = useAnimReplay(undefined);
  useGoogleFonts([stdColors.stdSaveTheDateFontId, stdColors.stdNamesDateFontId]);
  const stdAnswers = (project.questionnaire?.answers as Record<string, unknown> | null) ?? {};
  const stdNames = (stdAnswers["couple.prenoms"] as string | undefined) || coupleNamesFromSlug(project.slug);
  const stdNameParts = stdNames.split(/\s+(&|et)\s+/i);
  const stdNameSegments =
    stdNameParts.length === 3
      ? [{ text: stdNameParts[0] }, { text: stdNameParts[1], accent: true }, { text: stdNameParts[2] }]
      : [{ text: stdNames }];
  const stdDateFmt = getHeroDateFormat(stdColors.stdDateFormat);
  const STUDIO_DATE_PREVIEW = new Date(2027, 5, 12);
  const saveStdColors = trpc.projects.adminSetPalette.useMutation({
    onSuccess: () => {
      utils.projects.adminGet.invalidate({ projectId: project.id });
      toast.success("Couleurs enregistrées");
    },
    onError: () => toast.error("Échec de l'enregistrement des couleurs"),
  });
  const submitStdColors = () => {
    const complete: BespokePaletteInput = {
      ...existingPalette,
      ...stdColors,
      inkRgb: hexToRgbString(existingPalette.ink),
      inkOnCardRgb: hexToRgbString(existingPalette.inkOnCard),
      bordeauxRgb: hexToRgbString(existingPalette.bordeaux),
      goldRgb: hexToRgbString(existingPalette.gold),
    };
    saveStdColors.mutate({ projectId: project.id, palette: complete });
  };

  return (
    <section className="space-y-6">
      <div>
        <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Timings du hero — Save the Date
        </h3>
        <p className="mb-4 text-[12px] text-neutral-500">
          2 chapitres fixes : "Save the date", puis les prénoms (sur une ligne, séparés par "&") et la date juste en
          dessous. Seuls les instants où ils apparaissent à l'image se règlent ici. La page publique n'affiche que le
          hero et le pied de page — pas de corps de faire-part (programme, lieu, RSVP…).
        </p>

        {approvedVideo && isFrameMode && approvedVideo.frameBaseUrl && approvedVideo.frameCount ? (
          <div className="mb-4 w-full max-w-md space-y-2">
            <img
              src={`${approvedVideo.frameBaseUrl}${String(frameIdx + 1).padStart(5, "0")}.jpg`}
              alt=""
              className="w-full rounded-xl bg-black"
            />
            <input
              type="range"
              min={0}
              max={approvedVideo.frameCount - 1}
              value={frameIdx}
              onChange={(e) => setFrameIdx(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-[11px] tabular text-neutral-500">
              Image {frameIdx + 1} / {approvedVideo.frameCount} — {(frameIdx / (approvedVideo.frameFps ?? 12)).toFixed(1)} s
            </p>
          </div>
        ) : approvedVideo ? (
          <video ref={videoRef} src={approvedVideo.url} controls className="mb-4 w-full max-w-md rounded-xl bg-black" />
        ) : (
          <p className="mb-4 rounded-xl border border-neutral-200 bg-white p-4 text-[13px] text-neutral-500">
            Aucune vidéo disponible pour repérer les instants — ajoutez d'abord une version dans l'onglet Vidéo.
          </p>
        )}

        <div className="space-y-3">
          {HERO_CHAPTER_LABELS_STD.map((label, i) => (
            <div
              key={label}
              className="grid items-end gap-3 rounded-xl border border-neutral-200 bg-white p-3 sm:grid-cols-[140px_1fr_1fr_110px]"
            >
              <span className="text-[13px] font-semibold">{label}</span>
              {(["fromSec", "toSec"] as const).map((key) => (
                <label key={key} className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-neutral-500">
                    {key === "fromSec" ? "Début (s)" : "Fin (s)"}
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step={0.1}
                      min={0}
                      value={chapters[i][key]}
                      onChange={(e) => setChapterField(i, key, Number(e.target.value))}
                      className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-terracotta-500"
                    />
                    <button
                      type="button"
                      disabled={!approvedVideo}
                      title="Capturer l'instant courant de la vidéo"
                      onClick={() => capture(i, key)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-neutral-200 text-neutral-500 hover:border-terracotta-500 hover:text-terracotta-500 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Camera size={14} />
                    </button>
                  </div>
                </label>
              ))}
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-neutral-500">Position</span>
                <select
                  value={chapters[i].position}
                  onChange={(e) => setChapterPosition(i, e.target.value as "top" | "middle" | "bottom")}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-terracotta-500"
                >
                  {VERTICAL_ALIGN_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={saveChapters.isPending}
            onClick={() => saveChapters.mutate({ projectId: project.id, heroChapters: chapters })}
            className="flex items-center gap-2 rounded-full bg-terracotta-500 px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400 disabled:opacity-40"
          >
            {saveChapters.isPending && <Loader2 size={14} className="animate-spin" />}
            Enregistrer les timings
          </button>
        </div>
      </div>

      <div className="border-t border-neutral-200 pt-6">
        <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Style des 2 blocs
        </h3>
        <p className="mb-4 text-[12px] text-neutral-500">
          Mêmes réglages que les modèles Save the Date : taille, police, animation, gras, couleurs et cadre, bloc par
          bloc. Vide = retombe sur le réglage commun (onglet Palette &amp; Hero), lui-même retombant sur le thème.
          Fond de carte vide = transparent, toujours.
        </p>
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-[12px] font-semibold">Bloc 1 — "Save the date"</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <StudioField label="Taille de police">
                <StudioSizeSelect value={stdColors.stdSaveTheDateTitleSize} onChange={(v) => setStdColor("stdSaveTheDateTitleSize", v)} />
              </StudioField>
              <StudioField label="Police — ce bloc">
                <StudioFontSelect value={stdColors.stdSaveTheDateFontId} onChange={(v) => setStdColor("stdSaveTheDateFontId", v)} defaultLabel="Police du hero" />
              </StudioField>
              <StudioField label="Animation — ce bloc">
                <StudioAnimSelect value={stdColors.stdSaveTheDateTextAnimation} onChange={(v) => setStdColor("stdSaveTheDateTextAnimation", v)} defaultLabel="Animation du hero" />
              </StudioField>
              <ColorField
                label="Couleur du texte"
                hint="Vide = couleur commune"
                value={stdColors.stdSaveTheDateTextColor}
                onChange={(v) => setStdColor("stdSaveTheDateTextColor", v)}
              />
              <ColorField
                label="Fond de la carte"
                hint="Vide = transparent"
                value={stdColors.stdSaveTheDateCardBg}
                onChange={(v) => setStdColor("stdSaveTheDateCardBg", v)}
              />
              <StudioField label="Cadre (décor)">
                <StudioFrameSelect value={stdColors.stdSaveTheDateCardFrame} onChange={(v) => setStdColor("stdSaveTheDateCardFrame", v)} />
              </StudioField>
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-6">
              <StudioBold checked={stdColors.stdSaveTheDateBold} onChange={(v) => setStdColor("stdSaveTheDateBold", v)} />
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-neutral-500">Aperçu</span>
                <StudioPreview themeVars={stdThemeVars}>
                  <ChapterContent
                    chapter={{
                      id: 0,
                      kind: "text",
                      from: 0,
                      to: 1,
                      segments: [{ text: "Save the date" }],
                      titleSize: (stdColors.stdSaveTheDateTitleSize || "sm") as HeroChapter["titleSize"],
                      textColorOverride: stdColors.stdSaveTheDateTextColor || undefined,
                      cardBgOverride: stdColors.stdSaveTheDateCardBg || "transparent",
                      cardFrame: stdColors.stdSaveTheDateCardFrame || undefined,
                      fontId: stdColors.stdSaveTheDateFontId || undefined,
                      bold: stdColors.stdSaveTheDateBold,
                    }}
                    textAnimation={stdColors.stdSaveTheDateTextAnimation || undefined}
                    className={cn("hs-overlay", stdAnimShow && "show", stdColors.stdSaveTheDateTextAnimation && `hs-anim-${stdColors.stdSaveTheDateTextAnimation}`)}
                  />
                </StudioPreview>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-[12px] font-semibold">Bloc 2 — Prénoms &amp; date</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <StudioField label="Taille de police">
                <StudioSizeSelect value={stdColors.stdNamesDateTitleSize} onChange={(v) => setStdColor("stdNamesDateTitleSize", v)} />
              </StudioField>
              <StudioField label="Police — ce bloc">
                <StudioFontSelect value={stdColors.stdNamesDateFontId} onChange={(v) => setStdColor("stdNamesDateFontId", v)} defaultLabel="Police du hero" />
              </StudioField>
              <StudioField label="Animation — ce bloc">
                <StudioAnimSelect value={stdColors.stdNamesDateTextAnimation} onChange={(v) => setStdColor("stdNamesDateTextAnimation", v)} defaultLabel="Animation du hero" />
              </StudioField>
              <ColorField
                label="Couleur du texte"
                hint="Vide = couleur commune"
                value={stdColors.stdNamesDateTextColor}
                onChange={(v) => setStdColor("stdNamesDateTextColor", v)}
              />
              <ColorField
                label="Fond de la carte"
                hint="Vide = transparent"
                value={stdColors.stdNamesDateCardBg}
                onChange={(v) => setStdColor("stdNamesDateCardBg", v)}
              />
              <ColorField
                label={'Couleur du "&"'}
                hint="Vide = accent du thème"
                value={stdColors.stdNamesDateAccentColor}
                onChange={(v) => setStdColor("stdNamesDateAccentColor", v)}
              />
              <StudioField label="Cadre (décor)">
                <StudioFrameSelect value={stdColors.stdNamesDateCardFrame} onChange={(v) => setStdColor("stdNamesDateCardFrame", v)} />
              </StudioField>
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-6">
              <StudioBold checked={stdColors.stdNamesDateBold} onChange={(v) => setStdColor("stdNamesDateBold", v)} />
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-neutral-500">Aperçu</span>
                <StudioPreview themeVars={stdThemeVars}>
                  <ChapterContent
                    chapter={{
                      id: 1,
                      kind: "text",
                      from: 0,
                      to: 1,
                      segments: stdNameSegments,
                      fitOneLine: true,
                      titleSize: (stdColors.stdNamesDateTitleSize || "sm") as HeroChapter["titleSize"],
                      textColorOverride: stdColors.stdNamesDateTextColor || undefined,
                      cardBgOverride: stdColors.stdNamesDateCardBg || "transparent",
                      accentColorOverride: stdColors.stdNamesDateAccentColor || undefined,
                      cardFrame: stdColors.stdNamesDateCardFrame || undefined,
                      fontId: stdColors.stdNamesDateFontId || undefined,
                      bold: stdColors.stdNamesDateBold,
                    }}
                    textAnimation={stdColors.stdNamesDateTextAnimation || undefined}
                    className={cn("hs-overlay", stdAnimShow && "show", stdColors.stdNamesDateTextAnimation && `hs-anim-${stdColors.stdNamesDateTextAnimation}`)}
                  />
                </StudioPreview>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-[12px] font-semibold">Format de la date</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <StudioField
                label="Style d'affichage"
                hint="S'applique à la vraie date du client, sous les prénoms. Les mises en page multi-lignes retombent sur une ligne à cet emplacement."
              >
                <select value={stdColors.stdDateFormat} onChange={(e) => setStdColor("stdDateFormat", e.target.value)} className={studioInput}>
                  <option value="">12 juin 2027 (défaut)</option>
                  <optgroup label="Sur une ligne">
                    {HERO_DATE_FORMATS.filter((f) => !f.layout).map((f) => (
                      <option key={f.id} value={f.id}>{f.label} — {f.example}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Mises en page multi-lignes">
                    {HERO_DATE_FORMATS.filter((f) => f.layout).map((f) => (
                      <option key={f.id} value={f.id}>{f.label} — {f.example}</option>
                    ))}
                  </optgroup>
                </select>
              </StudioField>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-neutral-500">Aperçu (12 juin 2027)</span>
                <StudioPreview themeVars={stdThemeVars}>
                  {stdDateFmt?.layout ? (
                    <HeroDateLayoutBlock
                      layout={{ id: stdDateFmt.id, fonts: stdDateFmt.layout.fonts, lines: stdDateFmt.layout.lines(STUDIO_DATE_PREVIEW) }}
                    />
                  ) : (
                    <p
                      className="px-3 text-center text-[18px] font-light"
                      style={{ color: "var(--hs-text-primary)", fontFamily: "var(--hs-font-family)" }}
                    >
                      {stdDateFmt?.format(STUDIO_DATE_PREVIEW) ?? "12 juin 2027"}
                    </p>
                  )}
                </StudioPreview>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={saveStdColors.isPending}
            onClick={submitStdColors}
            className="flex items-center gap-2 rounded-full bg-terracotta-500 px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400 disabled:opacity-40"
          >
            {saveStdColors.isPending && <Loader2 size={14} className="animate-spin" />}
            Enregistrer le style
          </button>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Onglet Studio complet
// ---------------------------------------------------------------------------
export default function StudioPanel({ project }: { project: Project360 }) {
  const videoCount = project.videoVersions.length;
  // Un save the date n'a pas de corps de page à activer/thématiser (hero +
  // footer uniquement, cf. échange du 07/09/2026) — l'onglet "Faire-part"
  // (template + activation) n'a pas de sens ici, remplacé par "Save the
  // Date" (2 timings de hero, cf. SaveTheDateEditor). "Palette & Hero"
  // reste commun aux deux : les couleurs de fond/accent du hero
  // s'appliquent également à un save the date.
  const isStd = project.product === "SAVE_THE_DATE";
  const sections = useMemo(
    () => [
      { id: "scenarios", label: "Scénarios" },
      { id: "video", label: `Vidéo${videoCount > 0 ? ` (v${project.videoVersions.at(0)?.version})` : ""}` },
      isStd ? { id: "savethedate", label: "Save the Date" } : { id: "fairepart", label: "Faire-part" },
      { id: "palette", label: "Palette & Hero" },
    ],
    [project.videoVersions, videoCount, isStd],
  );
  const [section, setSection] = useState("scenarios");

  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-full border border-neutral-200 bg-white p-1">
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className={cn(
              "flex-1 rounded-full px-4 py-2 text-[12px] font-semibold transition-colors",
              section === s.id ? "bg-anthracite-800 text-white" : "text-neutral-500 hover:text-ink",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={section}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {section === "scenarios" && <ScenarioEditor project={project} />}
          {section === "video" && <VideoManager project={project} />}
          {section === "fairepart" && <FairePartActivation project={project} />}
          {section === "savethedate" && <SaveTheDateEditor project={project} />}
          {section === "palette" && <PaletteHeroEditor project={project} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
