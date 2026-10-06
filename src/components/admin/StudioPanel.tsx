import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
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
  HERO_NAMES_LAYOUTS,
  HERO_PROGRAMME_ANIMATIONS,
  HERO_PROGRAMME_LAYOUTS,
  HERO_PROGRAMME_SPEEDS,
  HERO_SEAL_COLORS,
  HERO_SEAL_SHAPES,
  getHeroDateFormat,
  getHeroFont,
  monogramInitials,
  splitCoupleNames,
  useGoogleFont,
  useGoogleFonts,
} from "@/components/hero-scrub/heroDecor";
import { HERO_THEMES } from "@/components/hero-scrub/themes";
import { ChapterContent } from "@/components/hero-scrub/HeroScrub";
import { HeroDateLayoutBlock, HeroMonogramBlock, HeroNamesBlock, HeroProgrammeBlock } from "@/components/hero-scrub/HeroDateBlocks";
import { HeroSceneCardEditor } from "@/components/admin/HeroSceneCardEditor";
import { PaletteLivePreview } from "@/components/admin/PaletteLivePreview";
import { getHeroScene, heroSceneFromCard, type HeroSceneContext } from "@/components/hero-scrub/heroScenes";
import type { HeroNames } from "@/components/hero-scrub/heroDecor";
import type { HeroChapter } from "@/components/hero-scrub/types";
import {
  blankHeroCustomCard,
  type BespokePaletteInput,
  type HeroChaptersFairePartInput,
  type HeroChaptersSaveTheDateInput,
  type HeroCustomCard,
} from "@contracts/bespokePalette";
import { QUESTIONNAIRE_KEYS } from "@contracts/questionnaireKeys";
import {
  coupleNamesFromSlug,
  formatDateTime,
  type Project360,
} from "@/components/admin/shared";
import { supabase } from "@/lib/supabaseClient";
import {
  FAIRE_PART_SECTIONS,
  SECTION_BACKGROUNDS,
  SECTION_ILLUSTRATIONS,
  SECTION_REVEALS,
  SECTION_SEPARATORS,
  SECTION_TITLES,
  sectionDecorFromPalette,
  sectionDecorRootProps,
  type SectionDecor,
} from "@/components/faire-part/sectionDecor";
import {
  DefaultDivider,
  SectionDecorPreview,
  SectionIllustration,
  SectionSeparator,
} from "@/components/faire-part/SectionDecorParts";

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

/**
 * À l'envoi, la durée et l'ambiance sont ajoutées en fin de résumé
 * (« — Durée estimée : 45 s · Ambiance : cinéma ») : c'est ce que lit le
 * client. Avant le 05/10/2026, rouvrir l'éditeur gardait cette ligne dans le
 * texte ET remettait le compteur à 60 s : un nouvel envoi l'ajoutait une
 * seconde fois, avec une durée fausse. On la relit ici pour la séparer du
 * texte et retrouver les vraies valeurs.
 */
const SCENARIO_SUFFIX_RE = /\n*— Durée estimée : (\d+) s(?: · Ambiance : ([^\n]*))?\s*$/;
function splitScenarioSummary(raw: string): { summary: string; durationSec: number; tags: string[] } {
  const m = raw.match(SCENARIO_SUFFIX_RE);
  if (!m || m.index === undefined) return { summary: raw, durationSec: 60, tags: [] };
  return {
    summary: raw.slice(0, m.index).trimEnd(),
    durationSec: Number(m[1]) || 60,
    tags: m[2] ? m[2].split(",").map((t) => t.trim()).filter((t) => AMBIANCE_TAGS.includes(t)) : [],
  };
}

function loadDrafts(projectId: number, existing: Project360["scenarioProposals"]): DraftProposal[] {
  try {
    const raw = localStorage.getItem(draftKey(projectId));
    if (raw) {
      const parsed = JSON.parse(raw) as DraftProposal[];
      if (Array.isArray(parsed) && parsed.length === 3) {
        // Un brouillon local enregistré avant le correctif peut contenir la ligne de durée dans le texte.
        return parsed.map((d) => {
          const split = splitScenarioSummary(d.summary);
          return split.summary === d.summary ? d : { ...d, ...split };
        });
      }
    }
  } catch {
    /* brouillon illisible → on repart des données serveur */
  }
  return [1, 2, 3].map((i) => {
    const s = existing.find((p) => p.ordre === i);
    return s
      ? {
          title: s.title,
          ...splitScenarioSummary(s.summary ?? ""),
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
  // Le retour EN COURS s'affiche directement dans la carte de la proposition
  // concernée (cf. ScenarioEditor) : ici, l'historique seul.
  const historique = project.auditEvents
    .filter((e) => e.action === "scenario.changes_requested")
    .map((e) => {
      const meta = (e.meta ?? {}) as { title?: string; comment?: string };
      return { id: e.id, date: e.createdAt, titre: meta.title ?? "—", commentaire: meta.comment ?? "" };
    })
    .filter((h) => h.commentaire);

  if (historique.length === 0) return null;

  return (
    <div className="mb-5 rounded-xl border border-pending/30 bg-pending/[0.06] p-4">
      <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-pending">
        Retours précédents du client
      </h4>

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
  // Les cartes incomplètes ne passent en rouge qu'après une tentative d'envoi,
  // pas dès l'ouverture d'un éditeur vide.
  const [triedSend, setTriedSend] = useState(false);

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
  const clientPhotos = clientMedia.filter((m) => m.type === "photo");
  const alreadySent = project.scenarioProposals.length === 3;
  const chosen = project.scenarioProposals.find((p) => p.status === "chosen");
  const answers = (project.questionnaire?.answers as Record<string, unknown> | null) ?? {};
  const histoire = typeof answers[QUESTIONNAIRE_KEYS.histoire] === "string" ? (answers[QUESTIONNAIRE_KEYS.histoire] as string).trim() : "";
  const motsCles = (() => {
    const v = answers[QUESTIONNAIRE_KEYS.histoireMotsCles];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : [];
  })();
  const requestSend = () => {
    setTriedSend(true);
    if (!allValid) {
      toast.error("Complétez les 3 propositions : un titre et un résumé chacune.");
      return;
    }
    setConfirmSend(true);
  };

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

      {chosen && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-success/30 bg-success/[0.06] p-4">
          <Check size={16} className="mt-0.5 shrink-0 text-success" />
          <p className="text-[13px] leading-relaxed">
            <span className="font-semibold">Le client a choisi « {chosen.title} ».</span>{" "}
            <span className="text-neutral-500">
              Un nouvel envoi remplacerait les 3 propositions et annulerait ce choix.
            </span>
          </p>
        </div>
      )}

      {(histoire || motsCles.length > 0) && (
        <details className="mb-5 rounded-xl border border-neutral-200 bg-white p-4" open={!alreadySent}>
          <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Repères du questionnaire
          </summary>
          {histoire && <p className="mt-3 max-w-[75ch] whitespace-pre-line text-[13px] leading-relaxed">{histoire}</p>}
          {motsCles.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {motsCles.map((m) => (
                <span key={m} className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-500">
                  {m}
                </span>
              ))}
            </div>
          )}
        </details>
      )}

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
              triedSend && !validity[i] ? "border-error/50" : "border-neutral-200",
            )}
          >
            {(() => {
              const server = project.scenarioProposals.find((p) => p.ordre === i + 1);
              return (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="tabular text-[11px] font-bold uppercase tracking-[0.14em] text-terracotta-500">
                      Proposition {i + 1}
                    </span>
                    {server?.status === "chosen" ? (
                      <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success">
                        Choisie par le client
                      </span>
                    ) : server?.status === "changes_requested" ? (
                      <span className="rounded-full bg-pending/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-pending">
                        Modification demandée
                      </span>
                    ) : server ? (
                      <span className="rounded-full bg-info/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-info">
                        Envoyée
                      </span>
                    ) : !validity[i] ? (
                      <span className={cn("text-[10px] font-semibold", triedSend ? "text-error" : "text-neutral-500")}>
                        À compléter
                      </span>
                    ) : null}
                  </div>
                  {server?.status === "changes_requested" && server.clientComment && (
                    <p className="rounded-lg border border-pending/30 bg-pending/[0.06] px-3 py-2 text-[12px] italic leading-relaxed">
                      « {server.clientComment} »
                    </p>
                  )}
                </>
              );
            })()}
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
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 pt-1.5">
                {d.moodboard.map((m, mi) => (
                  <span key={mi} className="group relative">
                    <img src={m.url} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover ring-2 ring-terracotta-500" />
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
                  clientPhotos
                    .filter((m) => !d.moodboard.some((x) => x.url === m.url))
                    .map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        title={m.filename ?? "Ajouter au moodboard"}
                        onClick={() => update(i, { moodboard: [...d.moodboard, { url: m.url }] })}
                        className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-dashed border-neutral-200 opacity-70 transition-all hover:border-terracotta-500 hover:opacity-100"
                      >
                        <img src={m.url} alt="" className="h-full w-full object-cover" />
                        <Plus size={12} className="absolute inset-0 m-auto text-white drop-shadow" />
                      </button>
                    ))}
                {clientPhotos.length === 0 && d.moodboard.length === 0 && (
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
          disabled={create.isPending}
          onClick={requestSend}
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
              {chosen && (
                <p className="mt-3 rounded-lg border border-pending/30 bg-pending/[0.06] px-3 py-2 text-[12px] leading-relaxed">
                  Le client avait choisi « {chosen.title} » : ce choix sera annulé et il devra choisir à nouveau.
                </p>
              )}
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
      toast.success(`Version finale (v${r.version}) publiée sur la page, sans filigrane`);
    },
    onError: () => toast.error("Échec de l'insertion"),
  });

  const clientVideos = project.media.filter((m) => m.type === "video");
  const nextVersion = (project.videoVersions.at(0)?.version ?? 0) + 1;
  // Version que la page publique affiche — même règle que projects.getPublicInvite.
  const publicVideo =
    project.videoVersions.find((v) => !v.watermark) ??
    project.videoVersions.find((v) => v.status === "sent" || v.status === "final");

  return (
    <section>
      <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
        Déposer une version
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

            {/* Le choix le plus lourd de conséquences, en premier et en clair
                (il était caché dans une liste déroulante à côté du bouton). */}
            <div role="radiogroup" aria-label="Que faire de cette version" className="grid gap-2 sm:grid-cols-3">
              {(
                [
                  ["sent", "Envoyer pour validation", "Filigranée. Le client la voit sur son faire-part et peut commenter."],
                  ["final", "Publier la version finale", "Sans filigrane, en ligne tout de suite. Aucune validation."],
                  ["draft", "Garder en brouillon", "Invisible pour le client."],
                ] as const
              ).map(([value, label, desc]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={status === value}
                  onClick={() => setStatus(value)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors",
                    status === value ? "border-terracotta-500 bg-terracotta-500/5" : "border-neutral-200 hover:border-neutral-500",
                  )}
                >
                  <span className="flex items-center gap-2 text-[12px] font-semibold">
                    <span
                      className={cn(
                        "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border",
                        status === value ? "border-terracotta-500" : "border-neutral-300",
                      )}
                      aria-hidden
                    >
                      {status === value && <span className="h-1.5 w-1.5 rounded-full bg-terracotta-500" />}
                    </span>
                    {label}
                  </span>
                  <span className="mt-1 block text-[11px] leading-snug text-neutral-500">{desc}</span>
                </button>
              ))}
            </div>

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
                <p className="text-[11px] tabular text-neutral-500">
                  {uploadProgress < 100
                    ? `Envoi du fichier… ${uploadProgress} %`
                    : "Fichier reçu — découpage du film en images, cela peut prendre une minute…"}
                </p>
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
                    // Filigrane sur toute version à faire valider ; jamais sur une version finale.
                    watermark: !isFinal,
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

      {/* Historique — chaque version avec son image, ses retours client et son état sur la page */}
      <div className="mt-6">
        <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">Versions</h4>
        {project.videoVersions.length === 0 ? (
          <p className="rounded-xl border border-neutral-200 bg-white p-4 text-[13px] text-neutral-500">
            Aucune version pour l'instant.
          </p>
        ) : (
          <ul className="space-y-2">
            {project.videoVersions.map((v) => {
              const comments = (v.clientComment as { timecode: string; comment: string }[] | null) ?? [];
              const thumb =
                v.kind === "frames" && v.frameBaseUrl ? `${v.frameBaseUrl}00001.jpg` : (v.posterUrl ?? null);
              const isPublic = publicVideo?.id === v.id;
              return (
                <li key={v.id} className="flex gap-3 rounded-xl border border-neutral-200 bg-white p-3">
                  <div className="h-[72px] w-[41px] shrink-0 overflow-hidden rounded-md bg-anthracite-950">
                    {thumb ? (
                      <img src={thumb} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <FileVideo size={16} className="m-auto mt-7 text-white/50" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
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
                        {v.status === "approved" ? "Approuvée par le client" : v.status === "final" ? "Finale" : v.status === "sent" ? "Envoyée au client" : "Brouillon"}
                      </span>
                      {v.watermark && (
                        <span className="rounded-full bg-anthracite-800 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                          Filigrane
                        </span>
                      )}
                      {isPublic && (
                        <span className="rounded-full border border-success/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success">
                          Affichée sur la page
                        </span>
                      )}
                      <span className="tabular ml-auto text-[11px] text-neutral-500">{formatDateTime(v.createdAt)}</span>
                    </div>
                    {v.kind === "frames" && (
                      <p className="mt-1 text-[11px] text-neutral-500">
                        {v.frameCount ?? "?"} images · {((v.frameCount ?? 0) / (v.frameFps ?? 12)).toFixed(1)} s
                      </p>
                    )}
                    {comments.length > 0 && (
                      <ul className="mt-2 space-y-1 rounded-lg border border-pending/30 bg-pending/[0.06] px-3 py-2">
                        {comments.map((c, i) => (
                          <li key={i} className="text-[12px] leading-relaxed">
                            <span className="tabular font-semibold text-terracotta-500">{c.timecode}</span> — {c.comment}
                          </li>
                        ))}
                      </ul>
                    )}
                    {v.status === "approved" && (
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <p className="text-[12px] text-neutral-500">Le client l'a validée : publiez-la sans filigrane.</p>
                        <button
                          type="button"
                          disabled={markFinal.isPending}
                          onClick={() =>
                            markFinal.mutate({
                              projectId: project.id,
                              // Une version en images reporte ses champs « frames » ;
                              // son `url` n'est que la 1re image et créerait une
                              // version finale cassée (cf. adminAddVersion).
                              ...(v.kind === "frames" && v.frameBaseUrl && v.frameCount && v.frameFps
                                ? { frameBaseUrl: v.frameBaseUrl, frameCount: v.frameCount, frameFps: v.frameFps }
                                : { url: v.url }),
                              watermark: false,
                              status: "final",
                            })
                          }
                          className="flex items-center gap-2 rounded-full bg-terracotta-500 px-4 py-2 text-[12px] font-semibold text-white hover:bg-terracotta-400 disabled:opacity-40"
                        >
                          {markFinal.isPending ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                          Publier en version finale
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
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
  stdNamesLayout: "",
  stdNamesFamily: "",
  stdNamesVerb: "",
  heroOverlayGraphic: "",
  heroFontId: "",
  heroTextAnimation: "",
  heroFilter: "",
  sectionBgs: {},
  sectionIllus: {},
  sectionSeparator: "",
  sectionReveal: "",
  sectionTitleStyle: "",
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
  // Vide = « valeur par défaut », pas noir : la pastille native affichait du
  // noir, ce qui laissait croire à une couleur choisie. Hachures à la place.
  // La croix « revenir au défaut » n'apparaît que sur les champs qui ont
  // vraiment une valeur de repli (ceux dont l'aide dit « Vide = … ») : vider
  // l'encre ou l'accent principal casserait l'affichage.
  const empty = value.trim() === "";
  const hatched = empty || value.trim() === "transparent";
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold text-neutral-500">{label}</span>
      <div className="flex items-center gap-2">
        <span className="relative h-8 w-8 shrink-0">
          <input
            type="color"
            value={isHex ? value : "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 w-8 cursor-pointer rounded-md border border-neutral-200 bg-transparent p-0"
          />
          {hatched && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-md border border-neutral-200"
              style={{ background: "repeating-linear-gradient(135deg, #fff 0 4px, #e6e6e1 4px 5px)" }}
            />
          )}
        </span>
        <input
          type="text"
          value={value}
          placeholder={hint ? "Défaut" : "Vide"}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 font-mono text-[12px] outline-none placeholder:font-sans placeholder:text-neutral-400 focus:border-terracotta-500"
        />
        {!empty && hint && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onChange("");
            }}
            title="Revenir à la valeur par défaut"
            aria-label={`${label} : revenir à la valeur par défaut`}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-neutral-400 hover:text-error"
          >
            <X size={13} />
          </button>
        )}
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
/**
 * Variables CSS des aperçus du Studio — calculées depuis la palette EN COURS
 * D'ÉDITION (brouillon commun), pas depuis la palette enregistrée : les
 * aperçus suivent chaque changement avant l'enregistrement. Mêmes règles que
 * la page publique (FairePart.tsx) : fond de page sombre → ambiance Cinéma,
 * fond de carte vide → transparent (et non le fond de carte du thème, comme
 * le montraient à tort les aperçus avant le 05/10/2026).
 */
function studioThemeVars(project: Project360, palette: BespokePaletteInput): CSSProperties {
  const hex = palette.bg?.match(/^#([0-9a-f]{6})$/i)?.[1];
  const darkBg = hex
    ? 0.299 * (parseInt(hex.slice(0, 2), 16) / 255) + 0.587 * (parseInt(hex.slice(2, 4), 16) / 255) + 0.114 * (parseInt(hex.slice(4, 6), 16) / 255) < 0.4
    : false;
  const key = darkBg ? "cinema" : ((project.template as keyof typeof HERO_THEMES) ?? "cinema");
  const theme = HERO_THEMES[key] ?? HERO_THEMES.cinema;
  const heroFont = getHeroFont(palette.heroFontId);
  return {
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
 * sont impurs, ils ne doivent jamais être évalués pendant un rendu. Les
 * défauts par kind vivent dans le contrat (source unique, cf.
 * blankHeroCustomCard). */
function blankCustomCard(kind: HeroCustomCard["kind"], text: string): HeroCustomCard {
  return blankHeroCustomCard(`card-${Date.now()}-${Math.round(Math.random() * 1000)}`, kind, text);
}

function CustomCardsEditor({
  project,
  cards,
  setCards,
  palette,
}: {
  project: Project360;
  /** Brouillon partagé du Studio (cf. useStudioDraft) — enregistré par la barre d'enregistrement commune. */
  cards: HeroCustomCard[];
  setCards: React.Dispatch<React.SetStateAction<HeroCustomCard[]>>;
  /** Palette du brouillon — pour que les aperçus des blocs suivent les couleurs en cours d'édition. */
  palette: BespokePaletteInput;
}) {
  const themeVars = studioThemeVars(project, palette);
  const animShow = useAnimReplay(undefined);
  // Polices choisies bloc par bloc — chargées ici pour que les aperçus
  // ci-dessous rendent avec la bonne police, comme la page publique.
  useGoogleFonts(cards.flatMap((c) => [c.fontId, c.kind === "monogram" ? c.monogramLayout && c.fontId : ""]));
  const answers = (project.questionnaire?.answers as Record<string, unknown> | null) ?? {};
  const coupleNames = (answers["couple.prenoms"] as string | undefined) || coupleNamesFromSlug(project.slug);
  const [monoA, monoB] = monogramInitials(coupleNames);
  // Contexte passé aux scènes (bibliothèque HERO_SCENES) : prénoms,
  // initiales et date du projet — jamais saisis dans le formulaire. La date
  // d'aperçu est celle du questionnaire si elle est connue, sinon une date
  // d'exemple, pour que les scènes « calendrier »/« décompte » montrent
  // quelque chose de crédible au studio.
  const sceneDateIso = (() => {
    // `jourj.date` est une saisie libre du questionnaire : un format
    // inattendu donnerait un « Invalid Date » dans les aperçus — repli sur
    // la date d'exemple plutôt que sur une date illisible.
    const candidate =
      (project.weddingDate ? new Date(project.weddingDate).toISOString().slice(0, 10) : "") ||
      (answers["jourj.date"] as string | undefined) ||
      "";
    return candidate && !Number.isNaN(new Date(candidate).getTime()) ? candidate : "2027-06-12";
  })();
  const sceneCtx: HeroSceneContext = {
    a: coupleNames.split(/\s+(?:&|et)\s+/i)[0] ?? coupleNames,
    b: coupleNames.split(/\s+(?:&|et)\s+/i).slice(1).join(" ").trim(),
    initials: `${monoA}${monoB}`,
    dateShort: new Date(sceneDateIso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
    dateNumeric: new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
      .format(new Date(sceneDateIso))
      .replace(/\//g, " · "),
    dateIso: sceneDateIso,
  };

  const addCard = (kind: HeroCustomCard["kind"] = "text") =>
    setCards((prev) => [
      ...prev,
      blankCustomCard(kind, kind === "countdown" ? "Compte à rebours" : kind === "monogram" ? "Monogramme" : ""),
    ]);
  const removeCard = (id: string) => setCards((prev) => prev.filter((c) => c.id !== id));
  const updateCard = (id: string, patch: Partial<HeroCustomCard>) =>
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));


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
        En plus des chapitres fixes ci-dessus — texte libre, compte à rebours, monogramme des mariés ou scène de la
        bibliothèque (37 mises en page : formule d'annonce, jalons, lieu, dress code, billet, calendrier…), chacun avec
        ses propres police, taille, couleurs, cadre et animation (mêmes réglages que les modèles Save the Date).
        Repérez l'instant sur l'aperçu vidéo plus haut, puis saisissez-le ici.
      </p>

      {cards.length > 0 && (
        <div className="space-y-3">
          {cards.map((card) =>
            card.kind === "scene" ? (
              <div key={card.id} className="rounded-xl border border-neutral-200 bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[12px] font-semibold text-ink">
                    Scène{getHeroScene(card.sceneId) ? ` — ${getHeroScene(card.sceneId)!.label}` : ""}
                  </p>
                  {removeButton(card)}
                </div>
                {timingFields(card)}
                <HeroSceneCardEditor
                  card={card}
                  onChange={(patch) => updateCard(card.id, patch)}
                  ctx={sceneCtx}
                  themeVars={themeVars}
                  inputClass={studioInput}
                />
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <StudioField label="Police">
                    <StudioFontSelect value={card.fontId} onChange={(v) => updateCard(card.id, { fontId: v })} defaultLabel="Police du hero" />
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
                  <span className="text-[11px] font-semibold text-neutral-500">Aperçu</span>
                  <StudioPreview themeVars={themeVars}>
                    <ChapterContent
                      chapter={{
                        id: 3100,
                        kind: "text",
                        from: 0,
                        to: 1,
                        textColorOverride: card.textColor || undefined,
                        cardBgOverride: card.cardBg || undefined,
                        cardFrame: card.cardFrame || undefined,
                        fontId: card.fontId || undefined,
                        scene: heroSceneFromCard(card, sceneCtx),
                      }}
                      textAnimation={card.textAnimation || undefined}
                      className={cn("hs-overlay", animShow && "show", card.textAnimation && `hs-anim-${card.textAnimation}`)}
                    />
                  </StudioPreview>
                </div>
              </div>
            ) : card.kind === "programme" ? (
              <div key={card.id} className="rounded-xl border border-neutral-200 bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[12px] font-semibold text-ink">Programme du jour J</p>
                  {removeButton(card)}
                </div>
                {timingFields(card)}

                <div className="mt-3">
                  <p className="mb-2 text-[11px] font-semibold text-neutral-500">Étapes (heure + libellé)</p>
                  <div className="space-y-2">
                    {card.programmeItems.map((step, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={step.h}
                          maxLength={20}
                          placeholder="17h00"
                          onChange={(e) =>
                            updateCard(card.id, {
                              programmeItems: card.programmeItems.map((x, k) => (k === i ? { ...x, h: e.target.value } : x)),
                            })
                          }
                          className="w-[86px] shrink-0 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-center font-mono text-[12px] outline-none focus:border-terracotta-500"
                        />
                        <input
                          type="text"
                          value={step.l}
                          maxLength={60}
                          placeholder="Vin d'honneur"
                          onChange={(e) =>
                            updateCard(card.id, {
                              programmeItems: card.programmeItems.map((x, k) => (k === i ? { ...x, l: e.target.value } : x)),
                            })
                          }
                          className="flex-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-terracotta-500"
                        />
                        <button
                          type="button"
                          aria-label="Retirer cette étape"
                          onClick={() =>
                            updateCard(card.id, { programmeItems: card.programmeItems.filter((_, k) => k !== i) })
                          }
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-500 hover:text-error"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={card.programmeItems.length >= 6}
                    onClick={() =>
                      updateCard(card.id, { programmeItems: [...card.programmeItems, { h: "", l: "" }] })
                    }
                    className="mt-2 flex items-center gap-1.5 rounded-full border border-dashed border-neutral-300 px-3 py-1.5 text-[11.5px] font-semibold text-neutral-500 transition-colors hover:border-terracotta-400 hover:text-terracotta-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus size={13} /> Ajouter une étape
                  </button>
                </div>

                <div className="mt-3">
                  <p className="mb-2 text-[11px] font-semibold text-neutral-500">Mise en page</p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {HERO_PROGRAMME_LAYOUTS.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        title={l.desc}
                        onClick={() => updateCard(card.id, { programmeLayout: l.id })}
                        className={cn(
                          "flex flex-col gap-1.5 rounded-xl border p-1.5 text-center transition-colors",
                          (card.programmeLayout || "rail") === l.id
                            ? "border-terracotta-500 bg-terracotta-500/5"
                            : "border-neutral-200 hover:border-terracotta-300",
                        )}
                      >
                        <div
                          className="relative flex w-full items-center justify-center overflow-hidden rounded-lg bg-anthracite-950"
                          style={{
                            aspectRatio: "9/16",
                            containerType: "inline-size",
                            ...themeVars,
                            ...(getHeroFont(card.fontId) ? { "--hs-font-family": getHeroFont(card.fontId)!.fontFamily } : null),
                          } as CSSProperties}
                        >
                          <HeroProgrammeBlock
                            p={{ layout: l.id, items: card.programmeItems, animation: "", speed: card.programmeSpeed }}
                          />
                        </div>
                        <span className="text-[10px] font-medium leading-tight text-ink">{l.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <StudioField label="Animation d'apparition">
                    <select
                      value={card.programmeAnimation}
                      onChange={(e) => updateCard(card.id, { programmeAnimation: e.target.value })}
                      className={studioInput}
                    >
                      <option value="">Aucune (fondu commun)</option>
                      {HERO_PROGRAMME_ANIMATIONS.map((a) => (
                        <option key={a.id} value={a.id} title={a.desc}>{a.label}</option>
                      ))}
                    </select>
                  </StudioField>
                  <StudioField label="Vitesse">
                    <select
                      value={String(card.programmeSpeed)}
                      onChange={(e) => updateCard(card.id, { programmeSpeed: Number(e.target.value) })}
                      className={studioInput}
                    >
                      {HERO_PROGRAMME_SPEEDS.map((sp) => (
                        <option key={sp.value} value={String(sp.value)}>{sp.label}</option>
                      ))}
                    </select>
                  </StudioField>
                  <StudioField label="Police des libellés">
                    <StudioFontSelect value={card.fontId} onChange={(v) => updateCard(card.id, { fontId: v })} defaultLabel="Police du hero" />
                  </StudioField>
                  <ColorField label="Couleur du texte" hint="Vide = couleur du thème" value={card.textColor} onChange={(v) => updateCard(card.id, { textColor: v })} />
                  <ColorField label="Fond de carte" hint="Vide = fond du thème" value={card.cardBg} onChange={(v) => updateCard(card.id, { cardBg: v })} />
                  <StudioField label="Cadre (décor)">
                    <StudioFrameSelect value={card.cardFrame} onChange={(v) => updateCard(card.id, { cardFrame: v })} />
                  </StudioField>
                </div>

                <div className="mt-2 flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-neutral-500">Aperçu (animation rejouée en boucle)</span>
                  <StudioPreview themeVars={themeVars}>
                    <ChapterContent
                      chapter={{
                        id: 5000,
                        kind: "text",
                        from: 0,
                        to: 1,
                        textColorOverride: card.textColor || undefined,
                        cardBgOverride: card.cardBg || undefined,
                        cardFrame: card.cardFrame || undefined,
                        fontId: card.fontId || undefined,
                        programme: {
                          layout: card.programmeLayout || "rail",
                          items: card.programmeItems,
                          animation: card.programmeAnimation,
                          speed: card.programmeSpeed,
                        },
                      }}
                      textAnimation={card.textAnimation || undefined}
                      className={cn("hs-overlay", animShow && "show", card.textAnimation && `hs-anim-${card.textAnimation}`)}
                    />
                  </StudioPreview>
                </div>
              </div>
            ) : card.kind === "countdown" ? (
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
            // Scènes narratives (37 mises en page, cf. HERO_SCENES) — la
            // mise en page se choisit ensuite dans la carte elle-même.
            ["scene", "Ajouter une scène"],
            // Programme du jour J : proposé pour un faire-part seulement
            // (un save the date n'annonce pas le déroulé, cf. échange du
            // 30/09/2026) — un bloc déjà enregistré reste rendu quel que
            // soit le produit.
            ...(project.product === "FAIRE_PART" ? ([["programme", "Ajouter un programme"]] as const) : []),
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
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Brouillon commun du Studio — couleurs, timings du hero, blocs personnalisés
// ---------------------------------------------------------------------------
/**
 * Un seul brouillon pour tout le Studio, enregistré par UNE barre commune
 * (cf. StudioSaveBar), au lieu de trois formulaires indépendants avec chacun
 * son bouton « Enregistrer » (refonte du 05/10/2026, demande : « plus
 * ergonomiques »). Deux problèmes réglés d'un coup :
 *  - changer d'onglet effaçait les modifications non enregistrées (chaque
 *    onglet était démonté et repartait des données serveur) ;
 *  - la couleur réglée dans un onglet pouvait être écrasée par l'autre :
 *    les onglets Palette & Hero et Save the Date gardaient chacun SA copie
 *    de la palette entière et l'envoyaient en entier à l'enregistrement.
 * Ici, une seule copie, lue et modifiée par tous les onglets.
 *
 * `baseline` = dernier état connu du serveur (au montage, puis après chaque
 * enregistrement réussi), sérialisé — la comparaison dit ce qui a changé.
 */
function initialPalette(project: Project360): BespokePaletteInput {
  return { ...BLANK_PALETTE, ...((project.palette as BespokePaletteInput | null) ?? {}) };
}
function initialChapters(project: Project360): HeroChaptersFairePartInput | HeroChaptersSaveTheDateInput {
  // Vérifie la longueur RÉELLE avant de faire confiance au cast : un projet
  // dont les timings ont été réglés au mauvais format (3 chapitres pour un
  // save the date, ou l'inverse) repart des valeurs vides plutôt que
  // d'envoyer un tableau incohérent — cf. commande 25 (08/09/2026).
  const isStd = project.product === "SAVE_THE_DATE";
  const expected = isStd ? 2 : 3;
  if (Array.isArray(project.heroChapters) && project.heroChapters.length === expected) {
    return project.heroChapters as HeroChaptersFairePartInput | HeroChaptersSaveTheDateInput;
  }
  return isStd ? BLANK_HERO_CHAPTERS_STD : BLANK_HERO_CHAPTERS;
}
function initialCards(project: Project360): HeroCustomCard[] {
  return (project.heroCustomCards as HeroCustomCard[] | null) ?? [];
}

function useStudioDraft(project: Project360) {
  const utils = trpc.useUtils();
  const [palette, setPalette] = useState<BespokePaletteInput>(() => initialPalette(project));
  const [chapters, setChapters] = useState<HeroChaptersFairePartInput | HeroChaptersSaveTheDateInput>(() =>
    initialChapters(project),
  );
  const [cards, setCards] = useState<HeroCustomCard[]>(() => initialCards(project));
  const [baseline, setBaseline] = useState(() => ({
    palette: JSON.stringify(initialPalette(project)),
    chapters: JSON.stringify(initialChapters(project)),
    cards: JSON.stringify(initialCards(project)),
  }));
  const [saving, setSaving] = useState(false);

  const dirty = {
    palette: JSON.stringify(palette) !== baseline.palette,
    chapters: JSON.stringify(chapters) !== baseline.chapters,
    cards: JSON.stringify(cards) !== baseline.cards,
  };
  const anyDirty = dirty.palette || dirty.chapters || dirty.cards;

  // Fermer l'onglet du navigateur avec des modifications en attente :
  // le navigateur demande confirmation.
  useEffect(() => {
    if (!anyDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [anyDirty]);

  const setField = (key: keyof BespokePaletteInput, value: string | boolean) =>
    setPalette((prev) => ({ ...prev, [key]: value }));

  /**
   * Habillage d'UNE section : `sectionBgs`/`sectionIllus` sont des
   * dictionnaires indexés par id de section. Une valeur vide retire la clé
   * au lieu de l'enregistrer à "" — la palette reste lisible, et « aucun
   * fond » se relit comme l'absence de réglage, pas comme un réglage vide.
   */
  const setSectionField = (key: "sectionBgs" | "sectionIllus", section: string, value: string) =>
    setPalette((prev) => {
      const next = { ...(prev[key] ?? {}) };
      if (value) next[section] = value;
      else delete next[section];
      return { ...prev, [key]: next };
    });

  const savePaletteM = trpc.projects.adminSetPalette.useMutation();
  const saveChaptersM = trpc.projects.adminSetHeroChapters.useMutation();
  const saveCardsM = trpc.projects.adminSetHeroCustomCards.useMutation();

  const save = async () => {
    // Seules les cartes de TEXTE ont besoin d'un texte (pour les autres
    // types, `text` n'est qu'un placeholder) ; une scène sans mise en page
    // ne rendrait rien à l'image.
    if (dirty.cards && cards.some((c) => c.kind === "text" && !c.text.trim())) {
      toast.error("Chaque bloc de texte doit avoir un texte (onglet Hero).");
      return;
    }
    if (dirty.cards && cards.some((c) => c.kind === "scene" && !c.sceneId)) {
      toast.error("Choisissez une mise en page pour chaque scène (onglet Hero).");
      return;
    }
    setSaving(true);
    try {
      // Une partie enregistrée reste enregistrée même si la suivante
      // échoue : sa référence est mise à jour aussitôt, seul le reste
      // apparaît encore comme « non enregistré ».
      if (dirty.palette) {
        await savePaletteM.mutateAsync({
          projectId: project.id,
          palette: {
            ...palette,
            // Jamais saisis : recalculés depuis leur compagnon hex.
            inkRgb: hexToRgbString(palette.ink),
            inkOnCardRgb: hexToRgbString(palette.inkOnCard),
            bordeauxRgb: hexToRgbString(palette.bordeaux),
            goldRgb: hexToRgbString(palette.gold),
          },
        });
        setBaseline((b) => ({ ...b, palette: JSON.stringify(palette) }));
      }
      if (dirty.chapters) {
        await saveChaptersM.mutateAsync({ projectId: project.id, heroChapters: chapters });
        setBaseline((b) => ({ ...b, chapters: JSON.stringify(chapters) }));
      }
      if (dirty.cards) {
        await saveCardsM.mutateAsync({ projectId: project.id, heroCustomCards: cards });
        setBaseline((b) => ({ ...b, cards: JSON.stringify(cards) }));
      }
      toast.success("Modifications enregistrées");
    } catch {
      toast.error("Échec de l'enregistrement — vos modifications sont toujours là, réessayez.");
    } finally {
      setSaving(false);
      utils.projects.adminGet.invalidate({ projectId: project.id });
    }
  };

  const reset = () => {
    setPalette(JSON.parse(baseline.palette) as BespokePaletteInput);
    setChapters(JSON.parse(baseline.chapters) as HeroChaptersFairePartInput | HeroChaptersSaveTheDateInput);
    setCards(JSON.parse(baseline.cards) as HeroCustomCard[]);
  };

  return { palette, setPalette, setField, setSectionField, chapters, setChapters, cards, setCards, dirty, anyDirty, saving, save, reset };
}
type StudioDraft = ReturnType<typeof useStudioDraft>;

/** Barre collée en bas du Studio, visible seulement quand quelque chose n'est pas enregistré. */
function StudioSaveBar({ draft }: { draft: StudioDraft }) {
  if (!draft.anyDirty) return null;
  const parts = [
    draft.dirty.palette && "couleurs et texte du hero",
    draft.dirty.chapters && "timings",
    draft.dirty.cards && "blocs supplémentaires",
  ].filter(Boolean) as string[];
  return (
    <div className="sticky bottom-0 z-30 -mx-1 pt-3">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-terracotta-500/40 bg-white px-4 py-3 shadow-[0_-8px_28px_rgba(27,27,30,0.12)]">
        <span className="h-2 w-2 shrink-0 rounded-full bg-terracotta-500" aria-hidden />
        <p className="min-w-0 flex-1 text-[13px]">
          <span className="font-semibold">Modifications non enregistrées</span>
          <span className="text-neutral-500"> — {parts.join(", ")}</span>
        </p>
        <button
          type="button"
          onClick={draft.reset}
          disabled={draft.saving}
          className="rounded-full border border-neutral-200 px-4 py-2 text-[12px] font-semibold text-neutral-500 hover:border-neutral-500 hover:text-ink disabled:opacity-40"
        >
          Annuler les modifications
        </button>
        <button
          type="button"
          onClick={() => void draft.save()}
          disabled={draft.saving}
          className="flex items-center gap-2 rounded-full bg-terracotta-500 px-5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-terracotta-400 disabled:opacity-40"
        >
          {draft.saving && <Loader2 size={14} className="animate-spin" />}
          Enregistrer
        </button>
      </div>
    </div>
  );
}

/** Titre de section d'onglet — même allure partout, avec une phrase d'aide facultative. */
function StudioSectionTitle({ id, title, hint }: { id?: string; title: string; hint?: string }) {
  return (
    <div id={id} className="mb-4 scroll-mt-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">{title}</h3>
      {hint && <p className="mt-1 max-w-[70ch] text-[12px] leading-relaxed text-neutral-500">{hint}</p>}
    </div>
  );
}

/** Raccourcis vers les sections d'un onglet long (Hero, Couleurs de la page). */
function SectionJumps({ items }: { items: { id: string; label: string }[] }) {
  return (
    <nav aria-label="Aller à" className="flex flex-wrap gap-2">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          onClick={() => document.getElementById(it.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[12px] font-medium text-neutral-500 hover:border-terracotta-500 hover:text-terracotta-500"
        >
          {it.label}
        </button>
      ))}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Timings du hero — commun au faire-part (3 chapitres) et au save the date (2)
// ---------------------------------------------------------------------------
/** Version vidéo sur laquelle on repère les instants : approuvée ou finale, sinon la plus récente. */
function referenceVideo(project: Project360) {
  return (
    project.videoVersions.find((v) => v.status === "approved" || v.status === "final") ?? project.videoVersions.at(0)
  );
}

/**
 * Repérage des instants où chaque chapitre apparaît — image du film à
 * gauche, chapitres à droite, visibles ENSEMBLE : avant la refonte, l'image
 * (9:16, ~800 px de haut) poussait les champs hors de l'écran, si bien qu'on
 * ne voyait jamais l'image et les boutons de capture en même temps.
 * La frise montre les plages de chaque chapitre sur toute la durée du film ;
 * cliquer sur une plage amène l'image au début du chapitre.
 */
function HeroTimingsEditor({
  project,
  labels,
  chapters,
  setChapters,
}: {
  project: Project360;
  labels: readonly string[];
  chapters: HeroChaptersFairePartInput | HeroChaptersSaveTheDateInput;
  setChapters: StudioDraft["setChapters"];
}) {
  const video = referenceVideo(project);
  const isFrameMode = video?.kind === "frames" && !!video.frameBaseUrl && !!video.frameCount;
  const fps = video?.frameFps ?? 12;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [frameIdx, setFrameIdx] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoTime, setVideoTime] = useState(0);
  const duration = isFrameMode ? (video!.frameCount! - 1) / fps : videoDuration;
  const current = isFrameMode ? frameIdx / fps : videoTime;

  const setChapter = (index: number, patch: Partial<{ fromSec: number; toSec: number; position: "top" | "middle" | "bottom" }>) =>
    setChapters((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)) as typeof prev);
  const capture = (index: number, key: "fromSec" | "toSec") => setChapter(index, { [key]: Math.round(current * 10) / 10 });
  const seek = (sec: number) => {
    if (isFrameMode) setFrameIdx(Math.max(0, Math.min(video!.frameCount! - 1, Math.round(sec * fps))));
    else if (videoRef.current) videoRef.current.currentTime = sec;
  };
  const SEG_COLORS = ["bg-terracotta-500", "bg-info", "bg-success"];

  return (
    <div className="grid gap-5 md:grid-cols-[200px_minmax(0,1fr)]">
      <div className="space-y-2">
        {video && isFrameMode ? (
          <>
            <img
              src={`${video.frameBaseUrl}${String(frameIdx + 1).padStart(5, "0")}.jpg`}
              alt=""
              className="aspect-[9/16] w-full rounded-xl bg-black object-cover"
            />
            <input
              type="range"
              min={0}
              max={video.frameCount! - 1}
              value={frameIdx}
              onChange={(e) => setFrameIdx(Number(e.target.value))}
              aria-label="Position dans le film"
              className="w-full accent-terracotta-500"
            />
          </>
        ) : video ? (
          <video
            ref={videoRef}
            src={video.url}
            controls
            onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration || 0)}
            onTimeUpdate={(e) => setVideoTime(e.currentTarget.currentTime)}
            className="aspect-[9/16] w-full rounded-xl bg-black object-cover"
          />
        ) : (
          <p className="rounded-xl border border-dashed border-neutral-200 bg-white p-4 text-[12px] leading-relaxed text-neutral-500">
            Aucun film pour repérer les instants. Déposez d'abord une version dans l'onglet Vidéo.
          </p>
        )}
        {video && (
          <p className="tabular text-center text-[12px] font-semibold">
            {current.toFixed(1)} s <span className="font-normal text-neutral-500">/ {duration.toFixed(1)} s</span>
          </p>
        )}
      </div>

      <div className="min-w-0 space-y-3">
        {video && duration > 0 && (
          <div>
            <div className="relative h-8 overflow-hidden rounded-lg bg-neutral-200/70" aria-hidden>
              {chapters.map((c, i) =>
                c.toSec > c.fromSec ? (
                  <button
                    key={i}
                    type="button"
                    tabIndex={-1}
                    title={`${labels[i]} : ${c.fromSec}–${c.toSec} s`}
                    onClick={() => seek(c.fromSec)}
                    className={cn("absolute inset-y-1 rounded-md opacity-80 hover:opacity-100", SEG_COLORS[i % SEG_COLORS.length])}
                    style={{
                      left: `${(Math.min(c.fromSec, duration) / duration) * 100}%`,
                      width: `${(Math.max(0, Math.min(c.toSec, duration) - c.fromSec) / duration) * 100}%`,
                    }}
                  />
                ) : null,
              )}
              <span
                className="absolute inset-y-0 w-0.5 bg-ink"
                style={{ left: `${(Math.min(current, duration) / duration) * 100}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-neutral-500">
              Cliquez sur une plage pour amener l'image au début du chapitre, puis ajustez avec le curseur.
            </p>
          </div>
        )}

        {labels.map((label, i) => (
          <div key={label} className="rounded-xl border border-neutral-200 bg-white p-3">
            <div className="mb-2 flex items-center gap-2">
              <span className={cn("h-2.5 w-2.5 rounded-full", SEG_COLORS[i % SEG_COLORS.length])} aria-hidden />
              <span className="text-[13px] font-semibold">{label}</span>
              {chapters[i].toSec <= chapters[i].fromSec && (
                <span className="text-[11px] font-medium text-pending">à régler</span>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_120px]">
              {(["fromSec", "toSec"] as const).map((key) => (
                <label key={key} className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-neutral-500">{key === "fromSec" ? "Apparaît à (s)" : "Disparaît à (s)"}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step={0.1}
                      min={0}
                      value={chapters[i][key]}
                      onChange={(e) => setChapter(i, { [key]: Number(e.target.value) })}
                      className={studioInput}
                    />
                    <button
                      type="button"
                      disabled={!video}
                      onClick={() => capture(i, key)}
                      title="Utiliser l'instant affiché à gauche"
                      className="flex h-8 shrink-0 items-center gap-1 rounded-md border border-neutral-200 px-2 text-[11px] font-semibold text-neutral-500 hover:border-terracotta-500 hover:text-terracotta-500 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Camera size={13} />
                      Caler
                    </button>
                  </div>
                </label>
              ))}
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-neutral-500">Position</span>
                <select
                  value={chapters[i].position}
                  onChange={(e) => setChapter(i, { position: e.target.value as "top" | "middle" | "bottom" })}
                  className={studioInput}
                >
                  {VERTICAL_ALIGN_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aperçus — contenu du couple partagé par les onglets Hero et Couleurs
// ---------------------------------------------------------------------------
/** Données d'aperçu (PaletteLivePreview) : vraies réponses du couple, exemples sinon — mêmes clés que projects.getPublicInvite. */
function previewPropsFor(project: Project360) {
  const answers = (project.questionnaire?.answers as Record<string, unknown> | null) ?? {};
  const str = (key: string) =>
    typeof answers[key] === "string" && (answers[key] as string).trim() ? (answers[key] as string).trim() : "";
  const dateIso = (() => {
    const candidate =
      (project.weddingDate ? new Date(project.weddingDate).toISOString().slice(0, 10) : "") || str("jourj.date");
    return candidate && !Number.isNaN(new Date(candidate).getTime()) ? candidate : "";
  })();
  const venue = str("jourj.lieu_ceremonie") || (project.venue ?? "");
  const programme = (() => {
    const v = answers[QUESTIONNAIRE_KEYS.programme];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : [];
  })();
  const dressCode = str("jourj.dress_code");
  const dressColors = (() => {
    const v = answers["jourj.dress_code_couleur"];
    const raw = Array.isArray(v) ? v : typeof v === "string" ? [v] : [];
    return raw.filter((x): x is string => typeof x === "string" && /^#[0-9a-fA-F]{6}$/.test(x));
  })();
  const video = referenceVideo(project);
  return {
    template: project.template ?? null,
    isStd: project.product === "SAVE_THE_DATE",
    coupleNames: str("couple.prenoms") || coupleNamesFromSlug(project.slug),
    weddingDateIso: dateIso || "2027-06-12",
    venueName: venue || "Domaine des Oliviers",
    programme:
      programme.length > 0
        ? programme
        : ["15h30 — Cérémonie — Au jardin", "17h00 — Vin d'honneur", "20h00 — Dîner", "23h00 — Soirée"],
    dressCode: dressCode || "Élégance champêtre",
    dressCodeColors: dressColors,
    posterSrc: video ? (video.kind === "frames" ? video.url : (video.posterUrl ?? undefined)) : undefined,
    usesSampleContent: !dateIso || !venue || programme.length === 0 || !dressCode,
  };
}

/**
 * Champs que « Générer une proposition » a le droit de remplir — fonds,
 * encre, accents, sceau, pastilles du dress code. Avant la refonte, la
 * proposition remplaçait la palette ENTIÈRE et effaçait au passage tout le
 * réglage du hero (police, décor, texte sous les prénoms, blocs du save the
 * date…), que suggestPalette renvoie vides.
 */
const GENERATED_PALETTE_KEYS = [
  "bg", "bgDate", "bgProgramme", "bgLieu", "bgDressCode", "bgMenu", "bgHistoire", "bgFaq", "bgHebergements",
  "bgListeMariage", "cream", "ink", "inkRgb", "inkOnCard", "inkOnCardRgb", "mapLine", "bordeaux", "bordeauxRgb",
  "gold", "goldRgb", "sectionTitle", "timelineAccent", "stepLabel", "seal", "sealLight", "sealDark",
  "dressCode1", "dressCode2", "dressCode3",
] as const satisfies readonly (keyof BespokePaletteInput)[];

function onlyGeneratedKeys(p: BespokePaletteInput): Partial<BespokePaletteInput> {
  const out: Partial<BespokePaletteInput> = {};
  for (const k of GENERATED_PALETTE_KEYS) (out as Record<string, unknown>)[k] = p[k];
  return out;
}

// ---------------------------------------------------------------------------
// Onglet « Couleurs de la page » — faire-part seulement
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Habillage des sections — fonds, illustrations, séparateur, animation, titre
// ---------------------------------------------------------------------------

/**
 * Cadre d'aperçu brut : il ne pose que les variables de couleur de
 * l'habillage et le fond de la page, et laisse son contenu se peindre tout
 * seul. Sert aux vignettes qui ne montrent pas une section entière (un
 * séparateur seul, par exemple).
 */
function DecorChip({
  palette,
  pageBg,
  className,
  children,
}: {
  palette: BespokePaletteInput;
  pageBg: string;
  className?: string;
  children: ReactNode;
}) {
  const root = sectionDecorRootProps(palette, pageBg);
  return (
    <div
      className={cn("fpd-chip flex items-center justify-center overflow-hidden rounded-lg", root.className, className)}
      style={{ ...root.style, background: pageBg, color: palette.ink }}
      aria-hidden
    >
      {children}
    </div>
  );
}

/** Une vignette cliquable d'une bibliothèque : l'aperçu, le nom, la description en infobulle. */
function DecorOptionButton({
  active,
  label,
  desc,
  badge,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  desc: string;
  badge?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={desc}
      aria-pressed={active}
      className={cn(
        "flex flex-col gap-1.5 rounded-xl border p-1.5 text-center transition-colors",
        active ? "border-terracotta-500 bg-terracotta-500/5" : "border-neutral-200 hover:border-terracotta-300",
      )}
    >
      {children}
      <span className="text-[10px] font-medium leading-tight text-ink">
        {label}
        {badge ? <span className="ml-1 font-normal text-neutral-400">{badge}</span> : null}
      </span>
    </button>
  );
}

/**
 * Habillage du corps du faire-part — les 5 bibliothèques retenues le
 * 05/10/2026 (cf. src/components/faire-part/sectionDecor.ts).
 *
 * Deux parties, qui suivent la façon dont les réglages agissent :
 *  - « Identité de la page » : séparateur, animation d'apparition et style
 *    de titre, communs aux 10 sections. Choix en galerie, parce qu'il n'y en
 *    a qu'un de chaque et qu'il faut le voir.
 *  - « Section par section » : fond et illustration. En listes déroulantes,
 *    pas en galerie — 13 fonds × 10 sections feraient 130 vignettes. La
 *    vignette de chaque ligne montre le résultat, et les deux galeries de
 *    référence juste au-dessus montrent à quoi correspond chaque nom.
 *
 * Toutes les vignettes montent les composants et les classes de la vraie
 * page (cf. SectionDecorPreview) : rien à maintenir en double.
 */
function SectionDecorEditor({ draft }: { draft: StudioDraft }) {
  const { palette, setField, setSectionField } = draft;
  const decor = sectionDecorFromPalette(palette);
  // Même repli que la page publique : la palette sert de fond de page dès
  // qu'elle est renseignée (cf. effectivePageBg dans FairePart.tsx).
  const pageBg = palette.bg || "#1A1211";
  // Rejouer les animations d'apparition : remonter les vignettes suffit à
  // relancer leurs animations CSS, d'où ce compteur dans leur `key`.
  const [replay, setReplay] = useState(0);

  const tile = (over: Partial<SectionDecor>, section: string, title: string) => (
    <SectionDecorPreview palette={palette} pageBg={pageBg} decor={{ ...decor, ...over }} section={section} title={title} />
  );

  return (
    <section className="space-y-6">
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Identité de la page
        </h3>
        <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">
          Un seul réglage pour les 10 sections : c'est lui qui fait l'unité de la page. Tout est dessiné à partir
          de la palette ci-dessus — change une couleur et l'habillage suit.
        </p>
      </div>

      {/* Séparateur */}
      <div>
        <p className="mb-2 text-[11px] font-semibold text-neutral-500">
          Séparateur entre deux sections <span className="font-normal">— « Actuel » = filet et trois losanges</span>
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {SECTION_SEPARATORS.map((o) => (
            <DecorOptionButton
              key={o.id || "actuel"}
              active={decor.separator === o.id}
              label={o.label}
              desc={o.desc}
              onClick={() => setField("sectionSeparator", o.id)}
            >
              <DecorChip palette={palette} pageBg={pageBg} className="h-[46px] w-full">
                {o.id ? <SectionSeparator id={o.id} /> : <DefaultDivider color={palette.gold} />}
              </DecorChip>
            </DecorOptionButton>
          ))}
        </div>
      </div>

      {/* Animation d'apparition */}
      <div>
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-[11px] font-semibold text-neutral-500">
            Apparition d'une section <span className="font-normal">— quand l'invité arrive dessus</span>
          </p>
          <button
            type="button"
            onClick={() => setReplay((v) => v + 1)}
            className="text-[11px] text-terracotta-500 underline-offset-2 hover:underline"
          >
            Rejouer les aperçus
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {SECTION_REVEALS.map((o) => (
            <DecorOptionButton
              key={o.id || "cascade"}
              active={decor.reveal === o.id}
              label={o.label}
              desc={o.desc}
              onClick={() => setField("sectionReveal", o.id)}
            >
              <div key={replay} className="w-full">
                {tile({ reveal: o.id }, "lieu", "Le Lieu")}
              </div>
            </DecorOptionButton>
          ))}
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">
          Le programme et Notre histoire gardent la cascade dans tous les cas : ils débordent en pleine largeur et
          s'animent déjà au doigt, une apparition par-dessus les tronquerait.
        </p>
      </div>

      {/* Style de titre */}
      <div>
        <p className="mb-2 text-[11px] font-semibold text-neutral-500">
          Style des titres de section <span className="font-normal">— « La date », « Le Lieu », « RSVP »…</span>
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {SECTION_TITLES.map((o) => (
            <DecorOptionButton
              key={o.id || "actuel"}
              active={decor.titleStyle === o.id}
              label={o.label}
              desc={o.desc}
              onClick={() => setField("sectionTitleStyle", o.id)}
            >
              {tile({ titleStyle: o.id }, "lieu", "Le Lieu")}
            </DecorOptionButton>
          ))}
        </div>
      </div>

      <div className="border-t border-neutral-100 pt-6">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Section par section
        </h3>
        <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">
          Le fond et l'illustration se choisissent section par section : le dress code et le RSVP n'ont pas la même
          ambiance. Laisse « Aucun » pour garder le fond de page actuel.
        </p>
      </div>

      {/* Galeries de référence — à quoi ressemble chaque nom de la liste */}
      <details className="rounded-xl border border-neutral-200 bg-white p-3">
        <summary className="cursor-pointer text-[12px] font-semibold text-ink">
          Les 12 fonds, en images <span className="font-normal text-neutral-500">(5 sont animés)</span>
        </summary>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
          {SECTION_BACKGROUNDS.filter((o) => o.id).map((o) => (
            <div key={o.id} className="flex flex-col gap-1.5 text-center">
              {tile({ bgs: { apercu: o.id } }, "apercu", "Le Lieu")}
              <span className="text-[10px] font-medium leading-tight text-ink">
                {o.label}
                {o.animated ? <span className="ml-1 font-normal text-neutral-400">animé</span> : null}
              </span>
            </div>
          ))}
        </div>
      </details>

      <details className="rounded-xl border border-neutral-200 bg-white p-3">
        <summary className="cursor-pointer text-[12px] font-semibold text-ink">Les 8 illustrations, en images</summary>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
          {SECTION_ILLUSTRATIONS.filter((o) => o.id).map((o) => (
            <div key={o.id} className="flex flex-col gap-1.5 text-center">
              <DecorChip palette={palette} pageBg={pageBg} className="aspect-[4/3] w-full px-2">
                <SectionIllustration id={o.id} />
              </DecorChip>
              <span className="text-[10px] font-medium leading-tight text-ink">{o.label}</span>
            </div>
          ))}
        </div>
      </details>

      {/* Les 10 sections */}
      <div className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white">
        {FAIRE_PART_SECTIONS.map((sec) => {
          const bgId = decor.bgs[sec.id] ?? "";
          const illuId = decor.illus[sec.id] ?? "";
          return (
            <div key={sec.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="w-[92px] shrink-0">
                {tile({}, sec.id, sec.label)}
              </div>
              <p className="w-[130px] shrink-0 text-[13px] font-semibold text-ink">{sec.label}</p>
              <label className="flex min-w-[150px] flex-1 flex-col gap-1">
                <span className="text-[11px] font-semibold text-neutral-500">Fond</span>
                <select
                  value={bgId}
                  onChange={(e) => setSectionField("sectionBgs", sec.id, e.target.value)}
                  className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-terracotta-500"
                >
                  {SECTION_BACKGROUNDS.map((o) => (
                    <option key={o.id || "aucun"} value={o.id}>
                      {o.label}
                      {o.animated ? " (animé)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-[150px] flex-1 flex-col gap-1">
                <span className="text-[11px] font-semibold text-neutral-500">Illustration</span>
                <select
                  value={illuId}
                  onChange={(e) => setSectionField("sectionIllus", sec.id, e.target.value)}
                  className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-terracotta-500"
                >
                  {SECTION_ILLUSTRATIONS.map((o) => (
                    <option key={o.id || "aucune"} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <p className="w-full text-[11px] text-neutral-400 sm:w-auto sm:min-w-[160px] sm:flex-1">
                {SECTION_BACKGROUNDS.find((o) => o.id === bgId)?.desc ?? ""}
              </p>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] leading-relaxed text-neutral-500">
        Les fonds animés tournent en continu : une ou deux sections suffisent, sinon la page fatigue à la lecture.
        Un invité qui a coupé les animations dans son système voit tout figé, et la page complète.
      </p>
    </section>
  );
}

function PageColorsTab({ project, draft }: { project: Project360; draft: StudioDraft }) {
  const { palette, setPalette, setField } = draft;
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
  const fondHint =
    typeof answers[QUESTIONNAIRE_KEYS.paletteFond] === "string" &&
    /^#[0-9a-fA-F]{6}$/.test(answers[QUESTIONNAIRE_KEYS.paletteFond] as string)
      ? (answers[QUESTIONNAIRE_KEYS.paletteFond] as string).toLowerCase()
      : "";
  const themeColorsHint = (() => {
    const v = answers[QUESTIONNAIRE_KEYS.paletteTheme];
    const raw = Array.isArray(v) ? v : typeof v === "string" ? [v] : [];
    return raw
      .filter((x): x is string => typeof x === "string" && /^#[0-9a-fA-F]{6}$/.test(x))
      .map((x) => x.toLowerCase());
  })();
  const [mode, setMode] = useState<"light" | "dark">(modeHint);
  const [accentColor, setAccentColor] = useState(palette.gold || FALLBACK_ACCENT);
  const generate = () =>
    setPalette((prev) => ({ ...prev, ...onlyGeneratedKeys(suggestPalette(accentColor, mode, fondHint || undefined)) }));
  const generateFromTheme = () =>
    setPalette((prev) => ({
      ...prev,
      ...onlyGeneratedKeys(suggestPaletteFromColors(themeColorsHint, mode, fondHint || undefined)),
    }));
  const preview = previewPropsFor(project);

  return (
    <section className="space-y-8">
      <SectionJumps
        items={[
          { id: "page-client", label: "Indications du client" },
          { id: "page-depart", label: "Proposition de départ" },
          { id: "page-couleurs", label: "Couleurs" },
          { id: "page-habillage", label: "Habillage des sections" },
        ]}
      />
      <div id="page-client" className="scroll-mt-4">
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
      </div>
      <div id="page-depart" className="scroll-mt-4">
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
      </div>

      <div id="page-couleurs" className="grid scroll-mt-4 gap-6 min-[1400px]:grid-cols-[minmax(0,1fr)_320px]">
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
        </div>
        <aside className="min-[1400px]:sticky min-[1400px]:top-4 min-[1400px]:self-start">
          <PaletteLivePreview palette={palette} mode="page" {...preview} />
        </aside>
      </div>

      <div id="page-habillage" className="scroll-mt-4 border-t border-neutral-200 pt-8">
        <SectionDecorEditor draft={draft} />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Onglet « Hero » — texte, timings, blocs (faire-part et save the date)
// ---------------------------------------------------------------------------
function HeroStyleFields({ draft, isStd }: { draft: StudioDraft; isStd: boolean }) {
  const { palette, setField } = draft;
  const setHeroClosingEnabled = (value: boolean) => setField("heroClosingEnabled", value);
  useGoogleFont(palette.heroFontId);
  return (
    <div className="space-y-5">
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
          {!isStd && (
            <>
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
            Uniquement pour un projet sans timings studio réglés (onglet Hero → Timings) — sinon le chapitre
            "Détails pratiques" prend le relais, piloté par son propre timing.
          </p>
            </>
          )}

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
        </div>
    </div>
  );
}

/** Les 2 blocs fixes du save the date (« Save the date », prénoms & date) et le format de la date. */
function StdBlocksEditor({ project, draft }: { project: Project360; draft: StudioDraft }) {
  const { palette, setField } = draft;
  const themeVars = studioThemeVars(project, palette);
  const animShow = useAnimReplay(undefined);
  useGoogleFonts([palette.stdSaveTheDateFontId, palette.stdNamesDateFontId]);
  const stdAnswers = (project.questionnaire?.answers as Record<string, unknown> | null) ?? {};
  const stdNames = (stdAnswers["couple.prenoms"] as string | undefined) || coupleNamesFromSlug(project.slug);
  const stdNameParts = stdNames.split(/\s+(&|et)\s+/i);
  const stdNameSegments =
    stdNameParts.length === 3
      ? [{ text: stdNameParts[0] }, { text: stdNameParts[1], accent: true }, { text: stdNameParts[2] }]
      : [{ text: stdNames }];
  const stdDateFmt = getHeroDateFormat(palette.stdDateFormat);
  const STUDIO_DATE_PREVIEW = new Date(2027, 5, 12);
  const [stdNamesA, stdNamesB] = splitCoupleNames(stdNames);
  const stdNamesLayoutId = palette.stdNamesLayout || "ligne";
  const stdNamesPreview: HeroNames = {
    layout: stdNamesLayoutId,
    a: stdNamesA,
    b: stdNamesB,
    family: palette.stdNamesFamily,
    verb: palette.stdNamesVerb,
    dateShort: stdDateFmt ? stdDateFmt.format(STUDIO_DATE_PREVIEW) : "12 juin 2027",
  };
  return (
    <div>
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-[12px] font-semibold">Bloc 1 — "Save the date"</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <StudioField label="Taille de police">
                <StudioSizeSelect value={palette.stdSaveTheDateTitleSize} onChange={(v) => setField("stdSaveTheDateTitleSize", v)} />
              </StudioField>
              <StudioField label="Police — ce bloc">
                <StudioFontSelect value={palette.stdSaveTheDateFontId} onChange={(v) => setField("stdSaveTheDateFontId", v)} defaultLabel="Police du hero" />
              </StudioField>
              <StudioField label="Animation — ce bloc">
                <StudioAnimSelect value={palette.stdSaveTheDateTextAnimation} onChange={(v) => setField("stdSaveTheDateTextAnimation", v)} defaultLabel="Animation du hero" />
              </StudioField>
              <ColorField
                label="Couleur du texte"
                hint="Vide = couleur commune"
                value={palette.stdSaveTheDateTextColor}
                onChange={(v) => setField("stdSaveTheDateTextColor", v)}
              />
              <ColorField
                label="Fond de la carte"
                hint="Vide = transparent"
                value={palette.stdSaveTheDateCardBg}
                onChange={(v) => setField("stdSaveTheDateCardBg", v)}
              />
              <StudioField label="Cadre (décor)">
                <StudioFrameSelect value={palette.stdSaveTheDateCardFrame} onChange={(v) => setField("stdSaveTheDateCardFrame", v)} />
              </StudioField>
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-6">
              <StudioBold checked={palette.stdSaveTheDateBold} onChange={(v) => setField("stdSaveTheDateBold", v)} />
              <div className="w-[160px] shrink-0 flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-neutral-500">Aperçu</span>
                <StudioPreview themeVars={themeVars}>
                  <ChapterContent
                    chapter={{
                      id: 0,
                      kind: "text",
                      from: 0,
                      to: 1,
                      segments: [{ text: "Save the date" }],
                      titleSize: (palette.stdSaveTheDateTitleSize || "sm") as HeroChapter["titleSize"],
                      textColorOverride: palette.stdSaveTheDateTextColor || undefined,
                      cardBgOverride: palette.stdSaveTheDateCardBg || "transparent",
                      cardFrame: palette.stdSaveTheDateCardFrame || undefined,
                      fontId: palette.stdSaveTheDateFontId || undefined,
                      bold: palette.stdSaveTheDateBold,
                    }}
                    textAnimation={palette.stdSaveTheDateTextAnimation || undefined}
                    className={cn("hs-overlay", animShow && "show", palette.stdSaveTheDateTextAnimation && `hs-anim-${palette.stdSaveTheDateTextAnimation}`)}
                  />
                </StudioPreview>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-[12px] font-semibold">Bloc 2 — Prénoms &amp; date</p>
            <div className="mb-4">
              <p className="mb-2 text-[11px] font-semibold text-neutral-500">
                Mise en page des prénoms <span className="font-normal">— « Une ligne » = rendu actuel</span>
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                {HERO_NAMES_LAYOUTS.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setField("stdNamesLayout", l.id)}
                    title={l.desc}
                    className={cn(
                      "flex flex-col gap-1.5 rounded-xl border p-1.5 text-center transition-colors",
                      stdNamesLayoutId === l.id ? "border-terracotta-500 bg-terracotta-500/5" : "border-neutral-200 hover:border-terracotta-300",
                    )}
                  >
                    <div
                      className="relative flex w-full items-center justify-center overflow-hidden rounded-lg bg-anthracite-950 px-1"
                      style={{ aspectRatio: "16 / 10", containerType: "inline-size", ...themeVars } as CSSProperties}
                    >
                      {l.id === "ligne" ? (
                        <div
                          style={{
                            fontFamily: "var(--hs-font-family)",
                            color: "var(--hs-text-primary)",
                            fontSize: "11cqw",
                            lineHeight: 1.1,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {stdNamesA} <span style={{ color: "var(--hs-accent)", fontStyle: "italic" }}>&amp;</span> {stdNamesB}
                        </div>
                      ) : (
                        <HeroNamesBlock n={{ ...stdNamesPreview, layout: l.id }} />
                      )}
                    </div>
                    <span className="text-[10px] font-medium leading-tight text-ink">{l.label}</span>
                  </button>
                ))}
              </div>
              {(stdNamesLayoutId === "full" || stdNamesLayoutId === "verbe") && (
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {stdNamesLayoutId === "full" && (
                    <StudioField label="Noms de famille" hint="« Moreau & Dupont » — affichés sous les prénoms.">
                      <input
                        value={palette.stdNamesFamily}
                        onChange={(e) => setField("stdNamesFamily", e.target.value)}
                        placeholder="Moreau & Dupont"
                        className={studioInput}
                      />
                    </StudioField>
                  )}
                  {stdNamesLayoutId === "verbe" && (
                    <StudioField label="Verbe" hint="Vide = « se disent oui ».">
                      <input
                        value={palette.stdNamesVerb}
                        onChange={(e) => setField("stdNamesVerb", e.target.value)}
                        placeholder="se disent oui"
                        className={studioInput}
                      />
                    </StudioField>
                  )}
                </div>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <StudioField label="Taille de police">
                <StudioSizeSelect value={palette.stdNamesDateTitleSize} onChange={(v) => setField("stdNamesDateTitleSize", v)} />
              </StudioField>
              <StudioField label="Police — ce bloc">
                <StudioFontSelect value={palette.stdNamesDateFontId} onChange={(v) => setField("stdNamesDateFontId", v)} defaultLabel="Police du hero" />
              </StudioField>
              <StudioField label="Animation — ce bloc">
                <StudioAnimSelect value={palette.stdNamesDateTextAnimation} onChange={(v) => setField("stdNamesDateTextAnimation", v)} defaultLabel="Animation du hero" />
              </StudioField>
              <ColorField
                label="Couleur du texte"
                hint="Vide = couleur commune"
                value={palette.stdNamesDateTextColor}
                onChange={(v) => setField("stdNamesDateTextColor", v)}
              />
              <ColorField
                label="Fond de la carte"
                hint="Vide = transparent"
                value={palette.stdNamesDateCardBg}
                onChange={(v) => setField("stdNamesDateCardBg", v)}
              />
              <ColorField
                label={'Couleur du "&"'}
                hint="Vide = accent du thème"
                value={palette.stdNamesDateAccentColor}
                onChange={(v) => setField("stdNamesDateAccentColor", v)}
              />
              <StudioField label="Cadre (décor)">
                <StudioFrameSelect value={palette.stdNamesDateCardFrame} onChange={(v) => setField("stdNamesDateCardFrame", v)} />
              </StudioField>
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-6">
              <StudioBold checked={palette.stdNamesDateBold} onChange={(v) => setField("stdNamesDateBold", v)} />
              <div className="w-[160px] shrink-0 flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-neutral-500">Aperçu</span>
                <StudioPreview themeVars={themeVars}>
                  <ChapterContent
                    chapter={{
                      id: 1,
                      kind: "text",
                      from: 0,
                      to: 1,
                      segments: stdNamesLayoutId === "ligne" ? stdNameSegments : undefined,
                      names: stdNamesLayoutId === "ligne" ? undefined : stdNamesPreview,
                      fitOneLine: true,
                      titleSize: (palette.stdNamesDateTitleSize || "sm") as HeroChapter["titleSize"],
                      textColorOverride: palette.stdNamesDateTextColor || undefined,
                      cardBgOverride: palette.stdNamesDateCardBg || "transparent",
                      accentColorOverride: palette.stdNamesDateAccentColor || undefined,
                      cardFrame: palette.stdNamesDateCardFrame || undefined,
                      fontId: palette.stdNamesDateFontId || undefined,
                      bold: palette.stdNamesDateBold,
                    }}
                    textAnimation={palette.stdNamesDateTextAnimation || undefined}
                    className={cn("hs-overlay", animShow && "show", palette.stdNamesDateTextAnimation && `hs-anim-${palette.stdNamesDateTextAnimation}`)}
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
                <select value={palette.stdDateFormat} onChange={(e) => setField("stdDateFormat", e.target.value)} className={studioInput}>
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
              <div className="w-[160px] shrink-0 flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-neutral-500">Aperçu (12 juin 2027)</span>
                <StudioPreview themeVars={themeVars}>
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
    </div>
  );
}

function HeroTab({ project, draft }: { project: Project360; draft: StudioDraft }) {
  const isStd = project.product === "SAVE_THE_DATE";
  const preview = previewPropsFor(project);
  return (
    <section className="space-y-10">
      <SectionJumps
        items={[
          { id: "hero-texte", label: "Texte et habillage" },
          { id: "hero-timings", label: "Timings" },
          ...(isStd ? [{ id: "hero-std", label: "Les 2 blocs" }] : []),
          { id: "hero-blocs", label: "Blocs supplémentaires" },
        ]}
      />

      <div>
        <StudioSectionTitle
          id="hero-texte"
          title="Texte et habillage"
          hint="Ce qui s'affiche par-dessus le film : couleurs du texte, police, animation, décor et filtre. L'aperçu se met à jour à chaque changement."
        />
        <div className="grid gap-6 min-[1400px]:grid-cols-[minmax(0,1fr)_280px]">
          <HeroStyleFields draft={draft} isStd={isStd} />
          <aside className="min-[1400px]:sticky min-[1400px]:top-4 min-[1400px]:self-start">
            <PaletteLivePreview palette={draft.palette} mode="hero" {...preview} />
          </aside>
        </div>
      </div>

      <div className="border-t border-neutral-200 pt-8">
        <StudioSectionTitle
          id="hero-timings"
          title="Timings"
          hint={
            isStd
              ? "Les instants où chaque bloc apparaît à l'image. Déplacez le curseur sur le film, puis « Caler » pour utiliser l'instant affiché."
              : "Les instants où chaque chapitre apparaît à l'image ; le texte de chacun vient du questionnaire. Déplacez le curseur sur le film, puis « Caler » pour utiliser l'instant affiché."
          }
        />
        <HeroTimingsEditor
          project={project}
          labels={isStd ? HERO_CHAPTER_LABELS_STD : HERO_CHAPTER_LABELS}
          chapters={draft.chapters}
          setChapters={draft.setChapters}
        />
      </div>

      {isStd && (
        <div className="border-t border-neutral-200 pt-8">
          <StudioSectionTitle
            id="hero-std"
            title="Les 2 blocs du Save the Date"
            hint="Taille, police, animation, couleurs et cadre, bloc par bloc. Vide = le réglage « Texte et habillage » ci-dessus, lui-même retombant sur le thème. Fond de carte vide = transparent."
          />
          <StdBlocksEditor project={project} draft={draft} />
        </div>
      )}

      <div id="hero-blocs" className="scroll-mt-4">
        <CustomCardsEditor project={project} cards={draft.cards} setCards={draft.setCards} palette={draft.palette} />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Onglet « Mise en ligne » — ambiance, vérifications, aperçu, activation
// ---------------------------------------------------------------------------
const TEMPLATES = [
  { id: "editorial" as const, label: "Éditorial" },
  { id: "cinema" as const, label: "Cinéma" },
  { id: "minimal" as const, label: "Minimal" },
];

type CheckLevel = "ok" | "warn" | "missing";

function OnlineTab({ project, draft }: { project: Project360; draft: StudioDraft }) {
  const utils = trpc.useUtils();
  const [confirm, setConfirm] = useState(false);
  const isStd = project.product === "SAVE_THE_DATE";
  const productLabel = isStd ? "save the date" : "faire-part";
  const delivered = project.status === "DELIVERED";
  const publicUrl = `${window.location.origin}/faire-part/${project.slug}`;

  // Même règle que la page publique (projects.getPublicInvite) : la 1re
  // version sans filigrane, sinon une version envoyée ou finale. Sans
  // aucune des deux, la page ne s'affiche pas du tout.
  const publicVideo =
    project.videoVersions.find((v) => !v.watermark) ??
    project.videoVersions.find((v) => v.status === "sent" || v.status === "final");

  const chaptersSet = draft.chapters.every((c) => c.toSec > c.fromSec);
  const questionnaireDone = !!project.questionnaire?.submittedAt || (project.questionnaire?.completionPct ?? 0) >= 100;
  const rsvpEnabled = !!(project as { rsvpConfig?: { enabled?: boolean } | null }).rsvpConfig?.enabled;

  const checks: { level: CheckLevel; label: string; detail: string }[] = [
    !publicVideo
      ? { level: "missing", label: "Film", detail: "Aucun film affichable : la page ne s'ouvrira pas. Déposez une version dans l'onglet Vidéo." }
      : publicVideo.watermark
        ? { level: "warn", label: "Film", detail: `La v${publicVideo.version} affichée est encore filigranée. Publiez la version finale (onglet Vidéo).` }
        : { level: "ok", label: "Film", detail: `v${publicVideo.version} sans filigrane.` },
    chaptersSet
      ? { level: "ok", label: "Timings du hero", detail: "Tous les textes ont leur moment à l'image." }
      : { level: "warn", label: "Timings du hero", detail: "Certains textes n'ont pas d'instant réglé (onglet Hero)." },
    project.palette
      ? { level: "ok", label: "Couleurs", detail: "Palette enregistrée." }
      : { level: "warn", label: "Couleurs", detail: isStd ? "Aucun réglage enregistré : les couleurs du thème s'appliquent." : "Aucune palette enregistrée : les couleurs par défaut s'appliquent (onglet Couleurs de la page)." },
    questionnaireDone
      ? { level: "ok", label: "Questionnaire", detail: "Complété par le couple." }
      : { level: "warn", label: "Questionnaire", detail: `Rempli à ${project.questionnaire?.completionPct ?? 0} % : des infos peuvent manquer sur la page.` },
    ...(!isStd
      ? [
          rsvpEnabled
            ? ({ level: "ok", label: "RSVP", detail: "Les invités pourront répondre." } as const)
            : ({ level: "warn", label: "RSVP", detail: "Désactivé : les invités ne pourront pas répondre en ligne." } as const),
        ]
      : []),
    ...(draft.anyDirty
      ? [{ level: "warn" as const, label: "Modifications", detail: "Des réglages ne sont pas encore enregistrés (barre en bas)." }]
      : []),
  ];
  const blocking = checks.filter((c) => c.level === "missing");
  const warnings = checks.filter((c) => c.level === "warn");

  const setTemplate = trpc.projects.adminSetTemplate.useMutation({
    onSuccess: () => {
      utils.projects.adminGet.invalidate({ projectId: project.id });
      toast.success("Ambiance du hero mise à jour");
    },
    onError: () => toast.error("Échec du changement d'ambiance"),
  });
  const activate = trpc.projects.adminUpdateStatus.useMutation({
    onSuccess: () => {
      utils.projects.adminGet.invalidate({ projectId: project.id });
      utils.projects.adminList.invalidate();
      utils.analytics.adminOverview.invalidate();
      setConfirm(false);
      toast.success(`${isStd ? "Save the date" : "Faire-part"} en ligne — le client est notifié`);
    },
    onError: () => toast.error("Échec de la mise en ligne"),
  });

  // Ambiance : aperçu de chaque thème sur une image du film du couple,
  // plutôt que les anciennes vignettes d'exemple (d'autres couples, une mise
  // en page qui n'est pas celle du faire-part) — le thème ne change que les
  // couleurs du hero, c'est exactement ce que montrent ces aperçus.
  const preview = previewPropsFor(project);
  const darkBgForcesCinema = (() => {
    const hex = draft.palette.bg?.match(/^#([0-9a-f]{6})$/i)?.[1];
    if (!hex) return false;
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    return 0.299 * r + 0.587 * g + 0.114 * b < 0.4;
  })();
  const nameParts = preview.coupleNames.split(/\s+(&|et)\s+/i);
  const segments =
    nameParts.length === 3
      ? [{ text: nameParts[0] }, { text: nameParts[1], accent: true }, { text: nameParts[2] }]
      : [{ text: preview.coupleNames }];
  const heroFont = getHeroFont(draft.palette.heroFontId);

  const copyLink = () => {
    navigator.clipboard
      .writeText(publicUrl)
      .then(() => toast.success("Lien copié"))
      .catch(() => toast.error("Impossible de copier — sélectionnez le lien à la main"));
  };

  return (
    <section className="space-y-8">
      {/* État + actions principales */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-neutral-200 bg-white p-5">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            delivered ? "bg-success/15 text-success" : "bg-neutral-100 text-neutral-500",
          )}
        >
          {delivered ? <Check size={18} /> : <Send size={16} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold">
            {delivered ? `Le ${productLabel} est en ligne` : `Le ${productLabel} n'est pas encore en ligne`}
          </p>
          <p className="truncate text-[12px] text-neutral-500">
            <span className="tabular font-medium text-ink">{publicUrl}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {publicVideo ? (
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-full border border-neutral-200 px-4 py-2 text-[12px] font-semibold hover:border-terracotta-500 hover:text-terracotta-500"
            >
              {delivered ? "Ouvrir" : "Prévisualiser"} <ExternalLink size={12} />
            </a>
          ) : (
            <span className="rounded-full border border-dashed border-neutral-200 px-4 py-2 text-[12px] text-neutral-500">
              Aperçu disponible après le 1er film
            </span>
          )}
          <button
            type="button"
            onClick={copyLink}
            className="rounded-full border border-neutral-200 px-4 py-2 text-[12px] font-semibold hover:border-terracotta-500 hover:text-terracotta-500"
          >
            Copier le lien
          </button>
          {!delivered && (
            <button
              type="button"
              onClick={() => setConfirm(true)}
              disabled={blocking.length > 0}
              title={blocking.length > 0 ? "Un film est nécessaire pour mettre en ligne" : undefined}
              className="rounded-full bg-terracotta-500 px-5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-terracotta-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Mettre en ligne
            </button>
          )}
        </div>
        {delivered && (
          <div className="rounded-xl border border-neutral-200 bg-white p-2">
            <QRCodeSVG value={publicUrl} size={72} fgColor="#232326" />
          </div>
        )}
      </div>
      {!delivered && (
        <p className="-mt-5 text-[12px] text-neutral-500">
          Avant la mise en ligne, l'aperçu s'affiche avec le bandeau « aperçu ». La mise en ligne passe le projet en
          « Livré » et envoie au client l'email avec le lien et le QR code.
        </p>
      )}

      {/* Vérifications */}
      <div>
        <StudioSectionTitle title="Avant de mettre en ligne" />
        <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
          {checks.map((c) => (
            <li key={c.label} className="flex items-start gap-3 px-4 py-3">
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                  c.level === "ok" && "bg-success/15 text-success",
                  c.level === "warn" && "bg-pending/15 text-pending",
                  c.level === "missing" && "bg-error/15 text-error",
                )}
                aria-label={c.level === "ok" ? "Prêt" : c.level === "warn" ? "À vérifier" : "Bloquant"}
              >
                {c.level === "ok" ? <Check size={12} /> : "!"}
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold">{c.label}</p>
                <p className="text-[12px] leading-relaxed text-neutral-500">{c.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Ambiance du hero */}
      <div>
        <StudioSectionTitle
          title="Ambiance du hero"
          hint="Couleurs de base du texte et du cadre sur le film, appliquées tout de suite (pas besoin d'enregistrer). Les couleurs réglées dans l'onglet Hero prennent le dessus."
        />
        {darkBgForcesCinema && (
          <p className="mb-3 rounded-lg border border-pending/30 bg-pending/[0.06] px-3 py-2 text-[12px] text-ink">
            Le fond de page de la palette est sombre : la page publique utilise automatiquement l'ambiance Cinéma,
            quel que soit le choix ci-dessous.
          </p>
        )}
        <div className="grid grid-cols-3 gap-3 sm:max-w-[560px]">
          {TEMPLATES.map((t) => {
            const theme = HERO_THEMES[t.id];
            const active = (project.template ?? "cinema") === t.id;
            const vars = {
              "--hs-frame-bg": theme.frameBg,
              "--hs-vignette": theme.vignette,
              "--hs-accent": theme.accent,
              "--hs-text-primary": draft.palette.heroTextColor || theme.textPrimary,
              "--hs-text-secondary": draft.palette.heroTextColor || theme.textSecondary,
              "--hs-card-bg": draft.palette.heroCardBg || "transparent",
              "--hs-card-border": theme.cardBorder,
              "--hs-card-shadow": theme.cardShadow,
              "--hs-font-family": heroFont?.fontFamily || "'Fraunces', Georgia, serif",
            } as CSSProperties;
            return (
              <button
                key={t.id}
                type="button"
                disabled={setTemplate.isPending}
                onClick={() => !active && setTemplate.mutate({ projectId: project.id, template: t.id })}
                aria-pressed={active}
                className={cn(
                  "overflow-hidden rounded-xl border-2 bg-white text-left transition-colors",
                  active ? "border-terracotta-500" : "border-neutral-200 hover:border-neutral-500",
                )}
              >
                <div
                  className="relative w-full overflow-hidden"
                  style={{ aspectRatio: "9/16", containerType: "inline-size", background: theme.frameBg, ...vars } as CSSProperties}
                >
                  {preview.posterSrc && <img src={preview.posterSrc} alt="" className="hs-video" />}
                  <ChapterContent
                    chapter={{ id: 0, kind: "text", from: 0, to: 1, segments, segmentLayout: "stack", titleSize: "lg" }}
                    className="hs-overlay show"
                  />
                </div>
                <p className="flex items-center justify-between px-3 py-2 text-[12px] font-semibold">
                  {t.label}
                  {active && <Check size={13} className="text-terracotta-500" />}
                </p>
              </button>
            );
          })}
        </div>
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
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            >
              <h3 className="font-display text-[20px] font-medium">
                Mettre en ligne le {productLabel} de {preview.coupleNames} ?
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">
                Le projet passera au statut « Livré » et le client recevra l'email de livraison avec le lien et le QR
                code.
              </p>
              {warnings.length > 0 && (
                <ul className="mt-4 space-y-1.5 rounded-xl border border-pending/30 bg-pending/[0.06] p-3">
                  {warnings.map((w) => (
                    <li key={w.label} className="text-[12px] leading-relaxed">
                      <span className="font-semibold">{w.label} :</span> {w.detail}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-6 flex justify-end gap-3">
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
                  {warnings.length > 0 ? "Mettre en ligne quand même" : "Mettre en ligne"}
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
// Studio — onglets dans l'ordre de fabrication
// ---------------------------------------------------------------------------
type StudioTabId = "scenarios" | "video" | "hero" | "page" | "online";

/** Onglet ouvert par défaut : celui de l'étape où en est le projet. */
function defaultStudioTab(project: Project360): StudioTabId {
  if (project.status === "DELIVERED") return "online";
  if (project.status === "PRODUCTION" || project.status === "REVIEW") return "video";
  return "scenarios";
}

/** Une ligne d'état sous chaque onglet — pour voir où en est le projet sans ouvrir chaque onglet. */
function studioTabHint(id: StudioTabId, project: Project360, draft: StudioDraft): { text: string; attention: boolean } {
  switch (id) {
    case "scenarios": {
      const chosen = project.scenarioProposals.find((s) => s.status === "chosen");
      if (chosen) return { text: `Choisi : ${chosen.title}`, attention: false };
      if (project.scenarioProposals.some((s) => s.status === "changes_requested")) return { text: "Retour du client", attention: true };
      if (project.scenarioProposals.length === 3) return { text: "Envoyés, en attente", attention: false };
      return { text: "À rédiger", attention: false };
    }
    case "video": {
      const latest = project.videoVersions.at(0);
      if (!latest) return { text: "Aucune version", attention: false };
      const comments = (latest.clientComment as { comment: string }[] | null) ?? [];
      if (comments.length > 0 && latest.status === "sent") return { text: `v${latest.version} · retour du client`, attention: true };
      const label = { draft: "brouillon", sent: "envoyée", approved: "approuvée", final: "finale" }[latest.status] ?? latest.status;
      return { text: `v${latest.version} · ${label}`, attention: latest.status === "approved" };
    }
    case "hero": {
      if (draft.dirty.chapters || draft.dirty.cards || draft.dirty.palette) return { text: "Non enregistré", attention: true };
      if (!draft.chapters.every((c) => c.toSec > c.fromSec)) return { text: "Timings à régler", attention: true };
      return { text: "Réglé", attention: false };
    }
    case "page":
      if (draft.dirty.palette) return { text: "Non enregistré", attention: true };
      return project.palette ? { text: "Enregistrées", attention: false } : { text: "À faire", attention: false };
    case "online":
      return project.status === "DELIVERED" ? { text: "En ligne", attention: false } : { text: "Pas encore en ligne", attention: false };
  }
}

export default function StudioPanel({ project }: { project: Project360 }) {
  // `key` : changer de projet dans le tiroir repart d'un brouillon neuf,
  // jamais des réglages du projet précédent.
  return <StudioWorkspace key={project.id} project={project} />;
}

function StudioWorkspace({ project }: { project: Project360 }) {
  const draft = useStudioDraft(project);
  const isStd = project.product === "SAVE_THE_DATE";
  const tabs: { id: StudioTabId; label: string }[] = [
    { id: "scenarios", label: "Scénarios" },
    { id: "video", label: "Vidéo" },
    { id: "hero", label: "Hero" },
    // Un save the date n'a pas de corps de page : pas de couleurs de sections.
    ...(isStd ? [] : [{ id: "page" as const, label: "Couleurs de la page" }]),
    { id: "online", label: "Mise en ligne" },
  ];
  const [tab, setTab] = useState<StudioTabId>(() => defaultStudioTab(project));

  return (
    <div className="space-y-5">
      <div
        role="tablist"
        aria-label="Étapes du Studio"
        className={cn("grid gap-1 rounded-2xl border border-neutral-200 bg-white p-1", isStd ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-5")}
      >
        {tabs.map((t, i) => {
          const hint = studioTabHint(t.id, project, draft);
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={cn(
                "min-w-0 rounded-xl px-3 py-2 text-left transition-colors",
                active ? "bg-anthracite-800 text-white" : "hover:bg-neutral-100",
              )}
            >
              <span className={cn("block text-[12px] font-semibold", !active && "text-ink")}>
                <span className={cn("tabular mr-1", active ? "text-white/60" : "text-neutral-500")}>{i + 1}.</span>
                {t.label}
              </span>
              <span
                className={cn(
                  "block truncate text-[11px]",
                  hint.attention ? (active ? "text-terracotta-300" : "text-terracotta-500") : active ? "text-white/70" : "text-neutral-500",
                )}
              >
                {hint.text}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tous les onglets restent montés (simplement masqués) : changer
          d'onglet ne perd plus rien de ce qui est en cours. */}
      <div role="tabpanel" hidden={tab !== "scenarios"}>
        <ScenarioEditor project={project} />
      </div>
      <div role="tabpanel" hidden={tab !== "video"}>
        <VideoManager project={project} />
      </div>
      <div role="tabpanel" hidden={tab !== "hero"}>
        <HeroTab project={project} draft={draft} />
      </div>
      {!isStd && (
        <div role="tabpanel" hidden={tab !== "page"}>
          <PageColorsTab project={project} draft={draft} />
        </div>
      )}
      <div role="tabpanel" hidden={tab !== "online"}>
        <OnlineTab project={project} draft={draft} />
      </div>

      <StudioSaveBar draft={draft} />
    </div>
  );
}
