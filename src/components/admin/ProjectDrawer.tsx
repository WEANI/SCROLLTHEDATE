import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  Calendar,
  Check,
  Copy,
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  Mail,
  MapPin,
  Mic,
  Play,
  Send,
  X,
} from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";
import { trpc } from "@/providers/trpc";
import { cn } from "@/lib/utils";
import {
  coupleNamesFromSlug,
  daysSince,
  formatDate,
  formatDateTime,
  formatDuration,
  formatEuro,
  initials,
  orderRef,
  productLabel,
  type Project360,
  type ProjectStatus,
} from "@/components/admin/shared";
import { StatusBadge } from "@/components/admin/badges";

const TABS = [
  { id: "resume", label: "Résumé" },
  { id: "questionnaire", label: "Questionnaire" },
  { id: "medias", label: "Médias" },
  { id: "scenarios", label: "Scénarios" },
  { id: "video", label: "Vidéo" },
  { id: "messages", label: "Messages" },
  { id: "historique", label: "Historique" },
] as const;

type TabId = (typeof TABS)[number]["id"] | "studio";

const STATUS_ORDER: ProjectStatus[] = [
  "ONBOARDING",
  "QUESTIONNAIRE",
  "SCENARIOS",
  "PRODUCTION",
  "REVIEW",
  "DELIVERED",
];

const STATUS_FR: Record<ProjectStatus, string> = {
  ONBOARDING: "Nouveau",
  QUESTIONNAIRE: "Questionnaire",
  SCENARIOS: "Scénarios",
  PRODUCTION: "Production",
  REVIEW: "Validation filigrane",
  DELIVERED: "Livré",
};

const AUDIT_LABEL: Record<string, string> = {
  "order.paid": "Commande payée",
  "project.created": "Projet créé",
  "project.status_changed": "Statut du projet modifié",
  "project.template_changed": "Template du faire-part modifié",
  "questionnaire.started": "Questionnaire commencé",
  "questionnaire.completed": "Questionnaire terminé",
  "voice_note.received": "Note vocale reçue",
  "media.uploaded": "Média envoyé",
  "scenarios.sent": "Propositions de scénarios envoyées",
  "scenario.chosen": "Scénario choisi par le client",
  "scenario.changes_requested": "Modifications de scénario demandées",
  "video.version_added": "Version vidéo ajoutée",
  "video.approved": "Vidéo approuvée par le client",
  "video.changes_requested": "Retours client sur la vidéo",
  "message.admin_sent": "Message envoyé au client",
  "message.customer_sent": "Message reçu du client",
  "rsvp.received": "Réponse RSVP reçue",
  "order.payment_status_changed": "Statut de paiement modifié",
};

function auditLabel(action: string) {
  return AUDIT_LABEL[action] ?? action;
}

function actorLabel(actor: string) {
  if (actor === "system") return "Système";
  if (actor.startsWith("admin")) return "Admin";
  if (actor.startsWith("customer")) return "Client";
  return actor;
}

// ---------------------------------------------------------------------------
// Onglet Résumé
// ---------------------------------------------------------------------------
function TabResume({ project }: { project: Project360 }) {
  const options = (project.order.options as { label?: string }[] | null) ?? [];
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Le couple
        </h3>
        <dl className="space-y-3 text-[13px]">
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-500">Noms</dt>
            <dd className="font-display text-[15px] font-medium">{coupleNamesFromSlug(project.slug)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-500">Contact</dt>
            <dd>{project.user.name ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="flex items-center gap-1.5 text-neutral-500">
              <Mail size={13} /> Email
            </dt>
            <dd>{project.user.email ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="flex items-center gap-1.5 text-neutral-500">
              <Calendar size={13} /> Mariage
            </dt>
            <dd className="tabular">{formatDate(project.weddingDate)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="flex items-center gap-1.5 text-neutral-500">
              <MapPin size={13} /> Lieu
            </dt>
            <dd className="text-right">{project.venue ?? "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Commande
        </h3>
        <dl className="space-y-3 text-[13px]">
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-500">Produit</dt>
            <dd className="font-medium">{productLabel(project.order.product)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-500">Options</dt>
            <dd className="text-right">
              {options.length > 0 ? options.map((o) => o.label ?? "").filter(Boolean).join(", ") : "Aucune"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-500">Montant</dt>
            <dd className="tabular font-semibold">{formatEuro(project.order.amountCents)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-500">Payée le</dt>
            <dd className="tabular">{formatDate(project.order.createdAt)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-500">Template</dt>
            <dd className="capitalize">{project.template}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-500">Progression</dt>
            <dd className="tabular">{project.progress} %</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-5 lg:col-span-2">
        <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Timeline
        </h3>
        {project.auditEvents.length === 0 ? (
          <p className="text-[13px] text-neutral-500">Aucun événement pour le moment.</p>
        ) : (
          <ol className="relative space-y-4 border-l border-neutral-200 pl-5">
            {project.auditEvents.slice().reverse().map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-terracotta-500" />
                <p className="text-[13px] font-medium text-ink">{auditLabel(e.action)}</p>
                <p className="tabular text-[11px] text-neutral-500">
                  {actorLabel(e.actor)} · {formatDateTime(e.createdAt)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Onglet Questionnaire
// ---------------------------------------------------------------------------
/** Extension de fichier déduite du en-tête MIME d'une data URI ("data:image/png;base64,..." -> "png") — repli "jpg" si absent/non reconnu, jamais d'extension vide. */
function extensionFromDataUri(dataUri: string): string {
  const m = /^data:image\/([a-zA-Z0-9.+-]+);base64,/.exec(dataUri);
  const type = m?.[1]?.toLowerCase();
  return type === "jpeg" ? "jpg" : (type ?? "jpg");
}

/** Nom de fichier sûr pour un zip — dérivé du libellé de la question, pas du filename d'origine (jamais stocké pour ces réponses, cf. PhotoQuestionField : la data URI est la réponse elle-même). */
function slugifyLabel(label: string): string {
  return label
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function TabQuestionnaire({ project }: { project: Project360 }) {
  const { data: template } = trpc.questionnaire.getActiveTemplate.useQuery();
  const answers = (project.questionnaire?.answers as Record<string, unknown> | null) ?? {};
  const questions =
    (template?.questions as { id: string; label: string; step: string; type: string }[] | null | undefined) ?? [];
  const voiceNote = project.voiceNotes.at(0);
  const [zipping, setZipping] = useState(false);

  const photoAnswers = questions
    .filter((q) => q.type === "photo")
    .map((q) => ({ label: q.label, dataUri: answers[q.id] }))
    .filter((p): p is { label: string; dataUri: string } => typeof p.dataUri === "string" && p.dataUri.startsWith("data:image/"));

  const copyBrief = () => {
    const lines = questions.map((q) => {
      const v = answers[q.id];
      // Question photo : la réponse est la data URI de l'image elle-même
      // (cf. PhotoQuestionField) — la coller telle quelle noierait le
      // brief texte sous des mégaoctets de base64 illisibles. Repère
      // textuel à la place ; les vraies images sont dans le zip
      // (bouton "Télécharger les photos", juste à côté).
      const text =
        q.type === "photo"
          ? typeof v === "string" && v.startsWith("data:image/")
            ? "[photo jointe — voir le zip téléchargé]"
            : "—"
          : Array.isArray(v)
            ? v.join(", ")
            : String(v ?? "—");
      return `## ${q.label}\n${text}`;
    });
    const brief = `# Brief — ${coupleNamesFromSlug(project.slug)}\n\n${lines.join("\n\n")}`;
    navigator.clipboard
      .writeText(brief)
      .then(() => toast.success("Brief copié — prêt pour la rédaction du scénario"))
      .catch(() => toast.error("Impossible de copier le brief"));
  };

  const downloadPhotos = async () => {
    if (photoAnswers.length === 0) {
      toast.error("Aucune photo dans le questionnaire pour l'instant");
      return;
    }
    setZipping(true);
    try {
      const zip = new JSZip();
      const usedNames = new Set<string>();
      for (const p of photoAnswers) {
        const res = await fetch(p.dataUri);
        // ArrayBuffer plutôt que Blob : JSZip peine à lire un Blob selon
        // l'environnement (constaté en testant cette logique côté Node —
        // "Can't read the data of..."), l'ArrayBuffer est le format
        // universellement supporté par `zip.file()`.
        const buf = await res.arrayBuffer();
        let name = `${slugifyLabel(p.label)}.${extensionFromDataUri(p.dataUri)}`;
        // Deux questions au libellé proche (ex. "Photo 1"/"Photo 2" déjà
        // distinctes en pratique, mais par sécurité) ne doivent jamais
        // s'écraser dans le zip.
        let i = 2;
        while (usedNames.has(name)) {
          name = `${slugifyLabel(p.label)}-${i}.${extensionFromDataUri(p.dataUri)}`;
          i += 1;
        }
        usedNames.add(name);
        zip.file(name, buf);
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `photos-${coupleNamesFromSlug(project.slug).toLowerCase().replace(/\s+/g, "-")}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`${photoAnswers.length} photo${photoAnswers.length > 1 ? "s" : ""} téléchargée${photoAnswers.length > 1 ? "s" : ""}`);
    } catch {
      toast.error("Échec de la création du zip");
    } finally {
      setZipping(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Note vocale */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            <Mic size={13} className="text-terracotta-500" /> Note vocale
          </h3>
          {voiceNote && (
            <span className="tabular text-[11px] text-neutral-500">
              {formatDuration(voiceNote.durationSec)} · {formatDate(voiceNote.createdAt)}
            </span>
          )}
        </div>
        {voiceNote ? (
          <audio controls preload="metadata" src={voiceNote.url} className="w-full" />
        ) : (
          <p className="text-[13px] text-neutral-500">
            Le client n'a pas encore enregistré de note vocale.
          </p>
        )}
      </section>

      {/* Réponses */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            <FileText size={13} className="text-terracotta-500" /> Réponses
          </h3>
          <div className="flex items-center gap-3">
            <span className="tabular text-[12px] font-semibold text-terracotta-500">
              {project.questionnaire?.completionPct ?? 0} % complet
            </span>
            <button
              type="button"
              onClick={() => void downloadPhotos()}
              disabled={zipping || photoAnswers.length === 0}
              title={photoAnswers.length === 0 ? "Aucune photo dans le questionnaire pour l'instant" : undefined}
              className="flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-[11px] font-semibold text-ink transition-colors hover:border-terracotta-500 hover:text-terracotta-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-neutral-200 disabled:hover:text-ink"
            >
              {zipping ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              Télécharger les photos{photoAnswers.length > 0 ? ` (${photoAnswers.length})` : ""}
            </button>
            <button
              type="button"
              onClick={copyBrief}
              className="flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-[11px] font-semibold text-ink transition-colors hover:border-terracotta-500 hover:text-terracotta-500"
            >
              <Copy size={12} /> Copier le brief
            </button>
          </div>
        </div>
        <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-neutral-200">
          <div
            className="h-full rounded-full bg-terracotta-500 transition-all"
            style={{ width: `${project.questionnaire?.completionPct ?? 0}%` }}
          />
        </div>
        {questions.length === 0 ? (
          <p className="text-[13px] text-neutral-500">Aucune question configurée.</p>
        ) : (
          <dl className="space-y-4">
            {questions.map((q) => {
              const v = answers[q.id];
              const empty = v === undefined || v === null || (typeof v === "string" && v.trim() === "");
              return (
                <div key={q.id} className="border-b border-neutral-200/60 pb-4 last:border-0 last:pb-0">
                  <dt className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500">
                    {q.step} — {q.label}
                  </dt>
                  <dd className={cn("whitespace-pre-wrap text-[13px] leading-relaxed", empty ? "italic text-neutral-500" : "text-ink")}>
                    {empty ? "Sans réponse" : Array.isArray(v) ? v.join(", ") : String(v)}
                  </dd>
                </div>
              );
            })}
          </dl>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Onglet Médias
// ---------------------------------------------------------------------------
function TabMedias({ project }: { project: Project360 }) {
  const utils = trpc.useUtils();
  const updateStatus = trpc.media.adminUpdateStatus.useMutation({
    onSuccess: () => {
      utils.projects.adminGet.invalidate({ projectId: project.id });
      toast.success("Statut du média mis à jour");
    },
  });

  if (project.media.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-200 bg-white p-10 text-center">
        <ImageIcon size={24} className="mx-auto mb-3 text-neutral-500" />
        <p className="text-[13px] text-neutral-500">Le client n'a pas encore envoyé de média.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {project.media.map((m) => (
        <figure key={m.id} className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <div className="relative aspect-[4/3] bg-neutral-100">
            {m.type === "photo" ? (
              <img src={m.url} alt={m.filename ?? "Média client"} className="h-full w-full object-cover" />
            ) : (
              <video src={m.url} className="h-full w-full object-cover" muted />
            )}
            {m.status === "validated" && (
              <span className="absolute left-2 top-2 rounded-full bg-terracotta-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                Retenu
              </span>
            )}
          </div>
          <figcaption className="space-y-2 p-3">
            <p className="truncate text-[12px] font-medium text-ink">{m.filename ?? `Média #${m.id}`}</p>
            <div className="flex items-center gap-1.5">
              {m.status !== "validated" ? (
                <button
                  type="button"
                  onClick={() => updateStatus.mutate({ mediaId: m.id, status: "validated" })}
                  className="flex items-center gap-1 rounded-full bg-terracotta-500/10 px-2 py-1 text-[10px] font-semibold text-terracotta-500 hover:bg-terracotta-500/20"
                >
                  <Check size={11} /> Retenir
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => updateStatus.mutate({ mediaId: m.id, status: "received" })}
                  className="rounded-full bg-neutral-100 px-2 py-1 text-[10px] font-semibold text-neutral-500 hover:bg-neutral-200"
                >
                  Retirer
                </button>
              )}
              <a
                href={m.url}
                download={m.filename ?? true}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-1 text-[10px] font-semibold text-ink hover:bg-neutral-200"
              >
                <Download size={11} /> Télécharger
              </a>
            </div>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Onglet Scénarios
// ---------------------------------------------------------------------------
const SCENARIO_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Envoyée", cls: "bg-info/15 text-info" },
  chosen: { label: "Choisie", cls: "bg-terracotta-500/15 text-terracotta-500" },
  changes_requested: { label: "Modif. demandée", cls: "bg-pending/15 text-pending" },
};

function TabScenarios({ project }: { project: Project360 }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Propositions ({project.scenarioProposals.length}/3)
        </h3>
        <Link
          to={`/admin/projets?projet=${project.id}&studio=1`}
          className="rounded-full bg-terracotta-500 px-4 py-2 text-[12px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400"
        >
          {project.scenarioProposals.length === 0 ? "Créer les scénarios" : "Ouvrir l'éditeur"}
        </Link>
      </div>
      {project.scenarioProposals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 bg-white p-10 text-center">
          <p className="text-[13px] text-neutral-500">
            Aucune proposition rédigée. Ouvrez l'éditeur de scénarios pour écrire les 3 propositions.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {project.scenarioProposals.map((s) => {
            const st = SCENARIO_STATUS[s.status] ?? SCENARIO_STATUS.pending;
            return (
              <article key={s.id} className="rounded-xl border border-neutral-200 bg-white p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h4 className="font-display text-[15px] font-medium leading-snug">{s.title}</h4>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", st.cls)}>
                    {st.label}
                  </span>
                </div>
                <p className="line-clamp-4 text-[12px] leading-relaxed text-neutral-500">{s.summary}</p>
                {s.clientComment && (
                  <p className="mt-3 rounded-lg bg-pending/10 p-2 text-[11px] italic text-pending">
                    « {s.clientComment} »
                  </p>
                )}
                <p className="tabular mt-3 text-[10px] uppercase tracking-wide text-neutral-500">
                  {s.chosenAt ? `Choisie le ${formatDate(s.chosenAt)}` : s.sentAt ? `Envoyée le ${formatDate(s.sentAt)}` : "Brouillon"}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Onglet Vidéo
// ---------------------------------------------------------------------------
const VIDEO_STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Brouillon", cls: "bg-neutral-500/15 text-neutral-500" },
  sent: { label: "Envoyée", cls: "bg-info/15 text-info" },
  approved: { label: "Approuvée", cls: "bg-terracotta-500/15 text-terracotta-500" },
  final: { label: "Finale HD", cls: "bg-success/15 text-success" },
};

function TabVideo({ project }: { project: Project360 }) {
  if (project.videoVersions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-200 bg-white p-10 text-center">
        <Play size={24} className="mx-auto mb-3 text-neutral-500" />
        <p className="text-[13px] text-neutral-500">
          Aucune version vidéo. Ajoutez la première version depuis l'onglet Studio (page Projets).
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {project.videoVersions.map((v) => {
        const st = VIDEO_STATUS[v.status] ?? VIDEO_STATUS.draft;
        const comments = (v.clientComment as { timecode: string; comment: string }[] | null) ?? [];
        return (
          <article key={v.id} className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h4 className="tabular text-[14px] font-semibold">Version {v.version}</h4>
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", st.cls)}>
                {st.label}
              </span>
              {v.watermark && (
                <span className="rounded-full bg-anthracite-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Filigrane
                </span>
              )}
              <span className="tabular ml-auto text-[11px] text-neutral-500">{formatDateTime(v.createdAt)}</span>
            </div>
            <video controls preload="metadata" src={v.url} className="aspect-video w-full rounded-lg bg-anthracite-950" />
            {comments.length > 0 && (
              <ul className="mt-3 space-y-1">
                {comments.map((c, i) => (
                  <li key={i} className="tabular text-[12px] text-neutral-500">
                    <span className="font-semibold text-terracotta-500">{c.timecode}</span> — {c.comment}
                  </li>
                ))}
              </ul>
            )}
          </article>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Onglet Messages
// ---------------------------------------------------------------------------
function TabMessages({ project }: { project: Project360 }) {
  const utils = trpc.useUtils();
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const send = trpc.messages.send.useMutation({
    onSuccess: () => {
      setBody("");
      utils.projects.adminGet.invalidate({ projectId: project.id });
      utils.projects.adminList.invalidate();
      toast.success(internal ? "Note interne ajoutée" : "Message envoyé au client");
    },
    onError: () => toast.error("Échec de l'envoi du message"),
  });

  return (
    <div className="flex h-full flex-col gap-4">
      <ul className="flex-1 space-y-3">
        {project.messages.length === 0 && (
          <li className="rounded-xl border border-dashed border-neutral-200 bg-white p-8 text-center text-[13px] text-neutral-500">
            Aucun message sur ce projet.
          </li>
        )}
        {project.messages.map((m) => {
          const isAdmin = m.senderRole === "admin";
          return (
            <li key={m.id} className={cn("flex", isAdmin ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-3",
                  m.internal
                    ? "border border-dashed border-pending/50 bg-neutral-100"
                    : isAdmin
                      ? "bg-anthracite-800 text-white"
                      : "border border-neutral-200 bg-white",
                )}
              >
                {m.internal && (
                  <span className="mb-1 inline-block rounded-full bg-pending/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-pending">
                    Note interne — jamais visible client
                  </span>
                )}
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{m.body}</p>
                <p className={cn("tabular mt-1.5 text-[10px]", isAdmin && !m.internal ? "text-white/50" : "text-neutral-500")}>
                  {isAdmin ? "Scroll The Date" : coupleNamesFromSlug(project.slug)} · {formatDateTime(m.createdAt)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="rounded-xl border border-neutral-200 bg-white p-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder={internal ? "Note interne (équipe uniquement)…" : "Répondre au client…"}
          className="w-full resize-none rounded-lg bg-neutral-100 p-3 text-[13px] outline-none placeholder:text-neutral-500 focus:ring-2 focus:ring-terracotta-500/40"
        />
        <div className="mt-2 flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-[12px] font-medium text-neutral-500">
            <button
              type="button"
              role="switch"
              aria-checked={internal}
              onClick={() => setInternal((v) => !v)}
              className={cn(
                "relative h-5 w-9 rounded-full transition-colors",
                internal ? "bg-pending" : "bg-neutral-200",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
                  internal ? "left-[18px]" : "left-0.5",
                )}
              />
            </button>
            Note interne
          </label>
          <button
            type="button"
            disabled={body.trim().length === 0 || send.isPending}
            onClick={() => send.mutate({ projectId: project.id, body: body.trim(), internal })}
            className="flex items-center gap-2 rounded-full bg-terracotta-500 px-4 py-2 text-[12px] font-semibold text-white transition-all hover:bg-terracotta-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {send.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            Envoyer
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Onglet Historique
// ---------------------------------------------------------------------------
function TabHistorique({ project }: { project: Project360 }) {
  if (project.auditEvents.length === 0) {
    return <p className="text-[13px] text-neutral-500">Aucun événement d'audit.</p>;
  }
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <table className="w-full text-left text-[13px]">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-100/60 text-[11px] uppercase tracking-[0.08em] text-neutral-500">
            <th className="px-4 py-2.5 font-semibold">Date</th>
            <th className="px-4 py-2.5 font-semibold">Acteur</th>
            <th className="px-4 py-2.5 font-semibold">Action</th>
            <th className="px-4 py-2.5 font-semibold">Détail</th>
          </tr>
        </thead>
        <tbody>
          {project.auditEvents.slice().reverse().map((e) => (
            <tr key={e.id} className="border-b border-neutral-200/60 last:border-0">
              <td className="tabular whitespace-nowrap px-4 py-2.5 text-neutral-500">{formatDateTime(e.createdAt)}</td>
              <td className="px-4 py-2.5">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                    e.actor === "system"
                      ? "bg-neutral-500/15 text-neutral-500"
                      : e.actor.startsWith("admin")
                        ? "bg-anthracite-800/10 text-anthracite-800"
                        : "bg-terracotta-500/15 text-terracotta-500",
                  )}
                >
                  {actorLabel(e.actor)}
                </span>
              </td>
              <td className="px-4 py-2.5 font-medium">{auditLabel(e.action)}</td>
              <td className="max-w-[260px] truncate px-4 py-2.5 font-mono text-[11px] text-neutral-500">
                {e.meta ? JSON.stringify(e.meta) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Drawer
// ---------------------------------------------------------------------------
interface ProjectDrawerProps {
  projectId: number | null;
  onClose: () => void;
  /** Contenu de l'onglet Studio (page Projets). */
  studio?: (project: Project360) => ReactNode;
  initialTab?: TabId;
}

export default function ProjectDrawer({ projectId, onClose, studio, initialTab }: ProjectDrawerProps) {
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<TabId>(initialTab ?? "resume");
  const [pendingStatus, setPendingStatus] = useState<ProjectStatus | null>(null);

  // `initialTab` n'est utilisé par useState que lors du tout premier rendu :
  // ce composant reste monté en permanence (Projets.tsx le rend
  // inconditionnellement), donc rouvrir la fiche sur un autre projet — ou
  // demander directement l'onglet Studio via un raccourci — ne changeait
  // jamais l'onglet affiché sans cet effet. C'était la cause du bug
  // « impossible d'ajouter des scénarios » : le raccourci "Créer les
  // scénarios" ramenait toujours sur l'onglet Résumé au lieu de Studio.
  useEffect(() => {
    if (projectId !== null) setTab(initialTab ?? "resume");
  }, [projectId, initialTab]);

  const { data: project, isLoading } = trpc.projects.adminGet.useQuery(
    { projectId: projectId ?? 0 },
    { enabled: projectId !== null },
  );

  const updateStatus = trpc.projects.adminUpdateStatus.useMutation({
    onSuccess: () => {
      utils.projects.adminList.invalidate();
      utils.projects.adminGet.invalidate({ projectId: projectId ?? 0 });
      utils.analytics.adminOverview.invalidate();
      toast.success("Statut du projet mis à jour");
    },
    onError: () => toast.error("Impossible de changer le statut"),
  });

  const requestStatus = (status: ProjectStatus) => {
    if (!project || status === project.status) return;
    if (status === "DELIVERED") {
      setPendingStatus(status);
    } else {
      updateStatus.mutate({ projectId: project.id, status });
    }
  };

  const tabs = useMemo(
    () => (studio ? [{ id: "studio" as const, label: "Studio" }, ...TABS] : TABS),
    [studio],
  );

  return (
    <AnimatePresence>
      {projectId !== null && (
        <>
          <motion.button
            type="button"
            aria-label="Fermer la fiche"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-anthracite-950/40 backdrop-blur-[4px]"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-neutral-100 shadow-2xl md:w-[70%]"
          >
            {isLoading || !project ? (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 size={28} className="animate-spin text-terracotta-500" />
              </div>
            ) : (
              <>
                {/* Header */}
                <header className="flex flex-wrap items-center gap-4 bg-anthracite-800 px-6 py-4 text-white">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-terracotta-500 text-[14px] font-bold">
                    {initials(project.user.name)}
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-display truncate text-[20px] font-medium leading-tight">
                      {coupleNamesFromSlug(project.slug)}
                    </h2>
                    <p className="tabular text-[11px] uppercase tracking-[0.14em] text-neutral-500">
                      {orderRef(project.orderId)} · {productLabel(project.order.product)}
                    </p>
                  </div>
                  <div className="ml-auto flex flex-wrap items-center gap-3">
                    <StatusBadge status={project.status} />
                    <select
                      value={project.status}
                      onChange={(e) => requestStatus(e.target.value as ProjectStatus)}
                      disabled={updateStatus.isPending}
                      className="h-9 rounded-[10px] border border-anthracite-700 bg-anthracite-900 px-3 text-[12px] font-medium text-white outline-none focus:border-terracotta-500"
                    >
                      {STATUS_ORDER.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_FR[s]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => toast.info("Archivage : passez le statut à « Livré » puis contactez le support.")}
                      className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-anthracite-700 text-neutral-500 transition-colors hover:text-white"
                      aria-label="Archiver"
                    >
                      <Archive size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-anthracite-700 text-neutral-500 transition-colors hover:text-white"
                      aria-label="Fermer"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </header>

                {/* Onglets */}
                <div className="flex gap-1 overflow-x-auto border-b border-neutral-200 bg-white px-4">
                  {tabs.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTab(t.id)}
                      className={cn(
                        "relative whitespace-nowrap px-4 py-3 text-[13px] font-medium transition-colors",
                        tab === t.id ? "text-terracotta-500" : "text-neutral-500 hover:text-ink",
                      )}
                    >
                      {t.label}
                      {tab === t.id && (
                        <motion.span
                          layoutId="admin-drawer-tab"
                          className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-terracotta-500"
                        />
                      )}
                    </button>
                  ))}
                  <span className="tabular ml-auto hidden items-center py-3 text-[11px] text-neutral-500 md:flex">
                    {daysSince(project.updatedAt)} j dans ce statut
                  </span>
                </div>

                {/* Contenu */}
                <div className="flex-1 overflow-y-auto p-6">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={tab}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {tab === "studio" && studio ? studio(project) : null}
                      {tab === "resume" && <TabResume project={project} />}
                      {tab === "questionnaire" && <TabQuestionnaire project={project} />}
                      {tab === "medias" && <TabMedias project={project} />}
                      {tab === "scenarios" && <TabScenarios project={project} />}
                      {tab === "video" && <TabVideo project={project} />}
                      {tab === "messages" && <TabMessages project={project} />}
                      {tab === "historique" && <TabHistorique project={project} />}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </>
            )}
          </motion.aside>

          {/* Confirmation → Livré */}
          <AnimatePresence>
            {pendingStatus === "DELIVERED" && project && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] flex items-center justify-center bg-anthracite-950/50 p-6 backdrop-blur-sm"
                onClick={() => setPendingStatus(null)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
                >
                  <h3 className="font-display text-[20px] font-medium">Marquer comme livré ?</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">
                    Le faire-part est-il activé et l'email de livraison prêt ? Le client sera notifié et le
                    projet passera au statut « Livré ».
                  </p>
                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setPendingStatus(null)}
                      className="rounded-full border border-neutral-200 px-5 py-2.5 text-[13px] font-semibold text-ink hover:border-neutral-500"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateStatus.mutate({ projectId: project.id, status: "DELIVERED" });
                        setPendingStatus(null);
                      }}
                      className="rounded-full bg-terracotta-500 px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-terracotta-400"
                    >
                      Confirmer la livraison
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}
