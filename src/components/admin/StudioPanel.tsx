import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, Check, ExternalLink, Loader2, Plus, Send, Sparkles, Upload, Wand2, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { cn } from "@/lib/utils";
import { suggestPalette, hexToRgbString } from "@/lib/suggestPalette";
import type { BespokePaletteInput, HeroChaptersInput } from "@contracts/bespokePalette";
import { QUESTIONNAIRE_KEYS } from "@contracts/questionnaireKeys";
import {
  coupleNamesFromSlug,
  formatDateTime,
  type Project360,
} from "@/components/admin/shared";

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
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="URL de la vidéo (https://… ou /demo-film.mp4)"
              className="w-full rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2.5 text-[13px] outline-none placeholder:text-neutral-500 focus:border-terracotta-500"
            />
            {clientVideos.length > 0 && (
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
              <label
                className={cn(
                  "flex items-center gap-2 text-[12px] font-medium",
                  isFinal ? "cursor-not-allowed text-neutral-500/50" : "cursor-pointer text-neutral-500",
                )}
              >
                <button
                  type="button"
                  role="switch"
                  aria-checked={watermark && !isFinal}
                  disabled={isFinal}
                  onClick={() => setWatermark((v) => !v)}
                  className={cn(
                    "relative h-5 w-9 rounded-full transition-colors",
                    watermark && !isFinal ? "bg-terracotta-500" : "bg-neutral-200",
                    isFinal && "cursor-not-allowed opacity-60",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
                      watermark && !isFinal ? "left-[18px]" : "left-0.5",
                    )}
                  />
                </button>
                {isFinal ? "Sans filigrane (version finale)" : "Filigrane (recommandé avant approbation)"}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "draft" | "sent" | "final")}
                className="h-9 rounded-[10px] border border-neutral-200 bg-white px-3 text-[12px] font-medium outline-none focus:border-terracotta-500"
              >
                <option value="final">Vidéo finale (publiée immédiatement, sans validation)</option>
                <option value="sent">Envoyer au client (avec filigrane, pour approbation)</option>
                <option value="draft">Brouillon (invisible client)</option>
              </select>
              <button
                type="button"
                disabled={url.trim().length === 0 || addVersion.isPending}
                onClick={() =>
                  addVersion.mutate({
                    projectId: project.id,
                    url: url.trim(),
                    watermark: isFinal ? false : watermark,
                    status,
                  })
                }
                className="ml-auto flex items-center gap-2 rounded-full bg-terracotta-500 px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-terracotta-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {addVersion.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
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
                url: approved.url,
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
};

const HERO_CHAPTER_LABELS = ["Ouverture", "Détails pratiques", "Clôture"] as const;
const BLANK_HERO_CHAPTERS: HeroChaptersInput = [
  { fromSec: 0, toSec: 0 },
  { fromSec: 0, toSec: 0 },
  { fromSec: 0, toSec: 0 },
];

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

  const existingPalette = project.palette as BespokePaletteInput | null;
  const [mode, setMode] = useState<"light" | "dark">(modeHint);
  const [accentColor, setAccentColor] = useState(existingPalette?.gold ?? FALLBACK_ACCENT);
  const [palette, setPalette] = useState<BespokePaletteInput>(existingPalette ?? BLANK_PALETTE);

  const setField = (key: keyof BespokePaletteInput, value: string) =>
    setPalette((prev) => ({ ...prev, [key]: value }));

  const generate = () => setPalette(suggestPalette(accentColor, mode));

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

  // Timings du hero
  const existingChapters = project.heroChapters as HeroChaptersInput | null;
  const [chapters, setChapters] = useState<HeroChaptersInput>(existingChapters ?? BLANK_HERO_CHAPTERS);
  const videoRef = useRef<HTMLVideoElement>(null);
  const approvedVideo =
    project.videoVersions.find((v) => v.status === "approved" || v.status === "final") ??
    project.videoVersions.at(0);

  const setChapterField = (index: number, key: "fromSec" | "toSec", value: number) =>
    setChapters((prev) => {
      const next = [...prev] as HeroChaptersInput;
      next[index] = { ...next[index], [key]: value };
      return next;
    });

  const capture = (index: number, key: "fromSec" | "toSec") => {
    const t = videoRef.current?.currentTime;
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
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-[11px] font-semibold text-neutral-500">Fond souhaité</p>
            <p className="text-[13px] font-medium">{modeHint === "dark" ? "Sombre" : "Clair"}</p>
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
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-neutral-500">
          Remplit les 19 champs ci-dessous à partir de cette seule couleur — un point de départ à retoucher, jamais
          le résultat final.
        </p>
      </div>

      {/* 19 champs, retouchables à la main */}
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

      {/* Timings du hero */}
      <div className="border-t border-neutral-200 pt-6">
        <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Timings du hero vidéo
        </h3>
        <p className="mb-4 text-[12px] text-neutral-500">
          3 chapitres fixes (ouverture, détails pratiques, clôture) — le texte de chacun vient du questionnaire,
          seuls les instants où ils apparaissent à l'image se règlent ici.
        </p>

        {approvedVideo ? (
          <video ref={videoRef} src={approvedVideo.url} controls className="mb-4 w-full max-w-md rounded-xl bg-black" />
        ) : (
          <p className="mb-4 rounded-xl border border-neutral-200 bg-white p-4 text-[13px] text-neutral-500">
            Aucune vidéo disponible pour repérer les instants — ajoutez d'abord une version dans l'onglet Vidéo.
          </p>
        )}

        <div className="space-y-3">
          {HERO_CHAPTER_LABELS.map((label, i) => (
            <div key={label} className="grid items-end gap-3 rounded-xl border border-neutral-200 bg-white p-3 sm:grid-cols-[120px_1fr_1fr]">
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
    </section>
  );
}

// ---------------------------------------------------------------------------
// Onglet Studio complet
// ---------------------------------------------------------------------------
export default function StudioPanel({ project }: { project: Project360 }) {
  const videoCount = project.videoVersions.length;
  const sections = useMemo(
    () => [
      { id: "scenarios", label: "Scénarios" },
      { id: "video", label: `Vidéo${videoCount > 0 ? ` (v${project.videoVersions.at(0)?.version})` : ""}` },
      { id: "fairepart", label: "Faire-part" },
      { id: "palette", label: "Palette & Hero" },
    ],
    [project.videoVersions, videoCount],
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
          {section === "palette" && <PaletteHeroEditor project={project} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
