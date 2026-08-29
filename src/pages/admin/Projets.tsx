import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { motion } from "framer-motion";
import { Clock, FolderKanban, Loader2, PenLine, Send } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { cn } from "@/lib/utils";
import ProjectDrawer, { TABS as PROJECT_DRAWER_TABS, type TabId } from "@/components/admin/ProjectDrawer";
import StudioPanel from "@/components/admin/StudioPanel";
import {
  coupleNamesFromSlug,
  daysSince,
  formatDate,
  orderRef,
  PIPELINE,
  type AdminProject,
  type ProjectStatus,
} from "@/components/admin/shared";

// ---------------------------------------------------------------------------
// Stepper miniature 6 points
// ---------------------------------------------------------------------------
function MiniStepper({ status }: { status: ProjectStatus }) {
  const activeIndex = PIPELINE.findIndex((p) => p.status === status);
  return (
    <span className="flex items-center gap-1" aria-label={`Étape ${activeIndex + 1} sur 6`}>
      {PIPELINE.map((p, i) => (
        <span
          key={p.status}
          title={p.label}
          className={cn(
            "h-1.5 rounded-full transition-all",
            i < activeIndex
              ? "w-3 bg-anthracite-800/30"
              : i === activeIndex
                ? "w-5 bg-terracotta-500"
                : "w-3 bg-neutral-200",
          )}
        />
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Files de travail
// ---------------------------------------------------------------------------
function WorkQueues({
  projects,
  onWrite,
  onOpen,
}: {
  projects: AdminProject[];
  onWrite: (id: number) => void;
  onOpen: (id: number) => void;
}) {
  const utils = trpc.useUtils();
  const send = trpc.messages.send.useMutation({
    onSuccess: () => {
      utils.projects.adminList.invalidate();
      toast.success("Relance envoyée au client");
    },
    onError: () => toast.error("Échec de la relance"),
  });

  const toWrite = useMemo(
    () =>
      projects
        .filter(
          (p) =>
            (p.status === "QUESTIONNAIRE" || p.status === "ONBOARDING") &&
            (p.questionnaire?.completionPct ?? 0) >= 90,
        )
        .sort((a, b) => daysSince(b.questionnaire?.updatedAt ?? b.updatedAt) - daysSince(a.questionnaire?.updatedAt ?? a.updatedAt)),
    [projects],
  );

  const waiting = useMemo(
    () =>
      projects
        .filter((p) => p.status === "SCENARIOS" || p.status === "REVIEW")
        .sort((a, b) => daysSince(b.updatedAt) - daysSince(a.updatedAt)),
    [projects],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Scénarios à écrire */}
      <section className="rounded-xl bg-white p-5 shadow-[0_8px_32px_rgba(27,27,30,.06)]">
        <h3 className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
          <PenLine size={14} className="text-terracotta-500" />
          Scénarios à écrire
          <span
            className={cn(
              "tabular ml-auto rounded-full bg-terracotta-500/15 px-2 py-0.5 text-[11px] font-bold text-terracotta-500",
              toWrite.length > 3 && "animate-badge-pulse",
            )}
          >
            {toWrite.length}
          </span>
        </h3>
        {toWrite.length === 0 ? (
          <p className="text-[13px] text-neutral-500">Aucun questionnaire complet en attente de rédaction.</p>
        ) : (
          <ul className="space-y-3">
            {toWrite.map((p, i) => {
              const answers = (p.questionnaire?.answers as Record<string, unknown> | null) ?? {};
              const anecdote = Object.values(answers)
                .filter((v): v is string => typeof v === "string" && v.trim().length > 30)
                .at(0);
              const days = daysSince(p.questionnaire?.updatedAt ?? p.updatedAt);
              return (
                <motion.li
                  key={p.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-start gap-3 rounded-xl border border-neutral-200 p-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium">
                      <span className="tabular font-semibold">{orderRef(p.orderId)}</span>{" "}
                      <span className="font-display">{coupleNamesFromSlug(p.slug)}</span>
                    </p>
                    <p className="tabular text-[11px] text-neutral-500">
                      Questionnaire complet depuis {days} j
                    </p>
                    {anecdote && (
                      <p className="mt-1 line-clamp-2 text-[12px] italic leading-relaxed text-neutral-500">
                        « {anecdote.slice(0, 140)}{anecdote.length > 140 ? "…" : ""} »
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onWrite(p.id)}
                    className="shrink-0 rounded-full bg-terracotta-500 px-4 py-2 text-[12px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400"
                  >
                    Écrire les scénarios
                  </button>
                </motion.li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Validations en attente */}
      <section className="rounded-xl bg-white p-5 shadow-[0_8px_32px_rgba(27,27,30,.06)]">
        <h3 className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
          <Clock size={14} className="text-pending" />
          Validations en attente
          <span
            className={cn(
              "tabular ml-auto rounded-full bg-pending/15 px-2 py-0.5 text-[11px] font-bold text-pending",
              waiting.length > 3 && "animate-badge-pulse",
            )}
          >
            {waiting.length}
          </span>
        </h3>
        {waiting.length === 0 ? (
          <p className="text-[13px] text-neutral-500">Aucune validation en attente côté client.</p>
        ) : (
          <ul className="space-y-3">
            {waiting.map((p, i) => {
              const days = daysSince(p.updatedAt);
              return (
                <motion.li
                  key={p.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3.5"
                >
                  <button type="button" onClick={() => onOpen(p.id)} className="min-w-0 flex-1 text-left">
                    <p className="text-[13px] font-medium">
                      <span className="tabular font-semibold">{orderRef(p.orderId)}</span>{" "}
                      <span className="font-display">{coupleNamesFromSlug(p.slug)}</span>
                    </p>
                    <p className="tabular text-[11px] text-neutral-500">
                      {p.status === "REVIEW"
                        ? `Filigrane envoyé il y a ${days} j`
                        : `Scénarios envoyés il y a ${days} j`}
                    </p>
                  </button>
                  <button
                    type="button"
                    disabled={send.isPending}
                    onClick={() =>
                      send.mutate({
                        projectId: p.id,
                        body:
                          "Bonjour ! Avez-vous pu prendre connaissance de nos dernières propositions ? Nous restons disponibles pour en discuter. Belle journée, l'équipe Scroll The Date.",
                      })
                    }
                    className="flex shrink-0 items-center gap-1.5 rounded-full border border-pending/40 px-3.5 py-2 text-[12px] font-semibold text-pending transition-colors hover:bg-pending hover:text-white disabled:opacity-40"
                  >
                    <Send size={12} /> Relancer
                  </button>
                </motion.li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function Projets() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: projects, isLoading } = trpc.projects.adminList.useQuery();

  const openProjectId = searchParams.get("projet") ? Number(searchParams.get("projet")) : null;
  // Dérivé de l'URL plutôt que d'un state local : reste correct aussi bien
  // pour les clics internes (WorkQueues, table) que pour une navigation
  // entrante depuis un autre onglet/page (ex. le lien "Créer les
  // scénarios" de TabScenarios, qui pointe vers ?projet=…&studio=1, ou une
  // notification cliquée dans AdminShell, qui pointe vers ?projet=…&tab=…).
  const studioRequested = searchParams.get("studio") === "1";
  const KNOWN_TAB_IDS: readonly string[] = [...PROJECT_DRAWER_TABS.map((t) => t.id), "studio"];
  const tabParam = searchParams.get("tab");
  const requestedTab: TabId | null =
    tabParam && KNOWN_TAB_IDS.includes(tabParam) ? (tabParam as TabId) : null;

  const setOpenProject = (id: number | null, studio = false) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (id === null) {
          next.delete("projet");
          next.delete("studio");
        } else {
          next.set("projet", String(id));
          if (studio) next.set("studio", "1");
          else next.delete("studio");
        }
        return next;
      },
      { replace: true },
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-500">Admin</p>
        <h1 className="font-display text-[28px] font-medium leading-tight">Projets — atelier de production</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24">
          <Loader2 size={28} className="animate-spin text-terracotta-500" />
        </div>
      ) : (
        <>
          <WorkQueues
            projects={projects ?? []}
            onWrite={(id) => setOpenProject(id, true)}
            onOpen={(id) => setOpenProject(id)}
          />

          {/* Table des projets */}
          <section className="overflow-hidden rounded-xl bg-white shadow-[0_8px_32px_rgba(27,27,30,.06)]">
            <header className="flex items-center gap-2 border-b border-neutral-200 px-5 py-4">
              <FolderKanban size={15} className="text-terracotta-500" />
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Tous les projets
              </h2>
              <span className="tabular ml-auto rounded-full bg-anthracite-800 px-2 py-0.5 text-[11px] font-bold text-white">
                {(projects ?? []).length}
              </span>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-neutral-200 text-[11px] uppercase tracking-[0.08em] text-neutral-500">
                    {["N°", "Couple", "Statut", "Vidéo", "Faire-part", "Livraison est.", ""].map((h) => (
                      <th key={h} className="whitespace-nowrap px-5 py-3 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(projects ?? []).map((p, i) => {
                    // Versions vidéo : non incluses dans adminList → infos via médias vidéo
                    const videoCount = p.media.filter((m) => m.type === "video").length;
                    const delivered = p.status === "DELIVERED";
                    return (
                      <motion.tr
                        key={p.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => setOpenProject(p.id)}
                        className="cursor-pointer border-b border-neutral-200/60 transition-colors last:border-0 hover:bg-neutral-100/60"
                      >
                        <td className="tabular whitespace-nowrap px-5 py-3.5 font-mono text-[12px] font-semibold">
                          {orderRef(p.orderId)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5">
                          <span className="font-display font-medium">{coupleNamesFromSlug(p.slug)}</span>
                          <span className="block text-[11px] text-neutral-500">{p.user.name}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <MiniStepper status={p.status} />
                          <span className="mt-1 block text-[11px] text-neutral-500">
                            {PIPELINE.find((c) => c.status === p.status)?.label}
                          </span>
                        </td>
                        <td className="tabular whitespace-nowrap px-5 py-3.5 text-neutral-500">
                          {videoCount > 0 ? `${videoCount} média(s) vidéo` : "—"}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5">
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                              delivered ? "bg-success/15 text-success" : "bg-neutral-100 text-neutral-500",
                            )}
                          >
                            {delivered ? "activé ✓" : "brouillon"}
                          </span>
                        </td>
                        <td className="tabular whitespace-nowrap px-5 py-3.5 text-neutral-500">
                          {p.weddingDate ? formatDate(p.weddingDate) : "—"}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenProject(p.id, true);
                            }}
                            className="rounded-full border border-neutral-200 px-3 py-1.5 text-[11px] font-semibold text-ink transition-colors hover:border-terracotta-500 hover:text-terracotta-500"
                          >
                            Studio
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })}
                  {(projects ?? []).length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-[13px] text-neutral-500">
                        Aucun projet pour le moment.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* Fiche projet avec onglet Studio */}
      <ProjectDrawer
        key={openProjectId ?? "closed"}
        projectId={openProjectId}
        onClose={() => setOpenProject(null)}
        studio={(project) => <StudioPanel project={project} />}
        initialTab={requestedTab ?? (studioRequested ? "studio" : "resume")}
      />
    </div>
  );
}
