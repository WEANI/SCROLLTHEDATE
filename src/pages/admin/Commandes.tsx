import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  Download,
  Flag,
  Image as ImageIcon,
  LayoutGrid,
  ListTodo,
  Loader2,
  MessageSquare,
  Search,
  Table as TableIcon,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { cn } from "@/lib/utils";
import ProjectDrawer from "@/components/admin/ProjectDrawer";
import { PaymentBadge, StatusBadge } from "@/components/admin/badges";
import {
  coupleNamesFromSlug,
  daysSince,
  formatDate,
  formatEuro,
  initials,
  orderRef,
  PIPELINE,
  productLabel,
  unreadMessages,
  type AdminProject,
  type ProjectStatus,
} from "@/components/admin/shared";

// ---------------------------------------------------------------------------
// Card Kanban
// ---------------------------------------------------------------------------
function KanbanCard({
  project,
  onOpen,
  onDragStart,
}: {
  project: AdminProject;
  onOpen: () => void;
  onDragStart: (e: React.DragEvent) => void;
}) {
  const days = daysSince(project.updatedAt);
  const unread = unreadMessages(project);
  const completion = project.questionnaire?.completionPct ?? 0;

  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      onClick={onOpen}
      className="w-full cursor-grab rounded-xl bg-white p-3.5 text-left shadow-[0_2px_12px_rgba(27,27,30,.06)] transition-shadow hover:shadow-[0_8px_24px_rgba(27,27,30,.12)] active:cursor-grabbing"
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="tabular font-mono text-[11px] font-semibold text-neutral-500">
          {orderRef(project.orderId)}
        </span>
        <span
          className={cn(
            "tabular rounded-full px-2 py-0.5 text-[10px] font-bold",
            days > 10 ? "bg-error/15 text-error" : days > 5 ? "bg-pending/15 text-pending" : "bg-neutral-100 text-neutral-500",
          )}
        >
          {days} j
        </span>
      </div>
      <p className="font-display truncate text-[15px] font-medium">{coupleNamesFromSlug(project.slug)}</p>
      <div className="mt-2 flex items-center gap-2 text-[11px] text-neutral-500">
        <span className="rounded-full border border-neutral-200 px-2 py-0.5 font-medium">
          {productLabel(project.order.product)}
        </span>
        {project.weddingDate && (
          <span className="tabular flex items-center gap-1">
            <Calendar size={11} /> {formatDate(project.weddingDate)}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center gap-3 border-t border-neutral-200/60 pt-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-anthracite-800 text-[10px] font-bold text-white">
          {initials(project.user.name)}
        </span>
        <span className="tabular flex items-center gap-1 text-[11px] text-neutral-500" title="Complétion questionnaire">
          <ListTodo size={12} /> {completion} %
        </span>
        <span className="tabular flex items-center gap-1 text-[11px] text-neutral-500" title="Médias">
          <ImageIcon size={12} /> {project.media.length}
        </span>
        {unread > 0 && (
          <span className="tabular flex items-center gap-1 text-[11px] font-semibold text-terracotta-500" title="Messages non lus">
            <MessageSquare size={12} /> {unread}
          </span>
        )}
        {project.order.paymentStatus === "failed" && (
          <Flag size={12} className="ml-auto text-error" aria-label="Paiement échoué" />
        )}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Vue Kanban
// ---------------------------------------------------------------------------
function Kanban({
  projects,
  onOpen,
  onMove,
  filter,
}: {
  projects: AdminProject[];
  onOpen: (id: number) => void;
  onMove: (projectId: number, status: ProjectStatus) => void;
  filter: ProjectStatus | null;
}) {
  const [dragOver, setDragOver] = useState<ProjectStatus | null>(null);
  const columns = filter ? PIPELINE.filter((c) => c.status === filter) : PIPELINE;

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((col) => {
        const items = projects.filter((p) => p.status === col.status);
        return (
          <section
            key={col.status}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(col.status);
            }}
            onDragLeave={() => setDragOver((v) => (v === col.status ? null : v))}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(null);
              const id = Number(e.dataTransfer.getData("text/project-id"));
              if (id) onMove(id, col.status);
            }}
            className={cn(
              "flex w-72 shrink-0 flex-col rounded-xl bg-neutral-200/40 p-2.5 transition-colors",
              dragOver === col.status && "bg-terracotta-500/10 ring-2 ring-terracotta-500/40",
            )}
          >
            <header
              className={cn(
                "mb-2 flex items-center justify-between rounded-lg px-2.5 py-2",
                col.accent && "bg-terracotta-500/10",
              )}
            >
              <h3
                className={cn(
                  "text-[11px] font-bold uppercase tracking-[0.12em]",
                  col.accent ? "text-terracotta-500" : "text-neutral-500",
                )}
              >
                {col.label}
              </h3>
              <span className="tabular rounded-full bg-anthracite-800 px-2 py-0.5 text-[11px] font-bold text-white">
                {items.length}
              </span>
            </header>
            <div className="flex min-h-16 flex-1 flex-col gap-2.5">
              <AnimatePresence>
                {items.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <KanbanCard
                      project={p}
                      onOpen={() => onOpen(p.id)}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/project-id", String(p.id));
                        e.dataTransfer.effectAllowed = "move";
                      }}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
              {items.length === 0 && (
                <p className="rounded-lg border border-dashed border-neutral-200 py-6 text-center text-[11px] text-neutral-500">
                  Déposez une commande ici
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vue Table
// ---------------------------------------------------------------------------
function OrdersTable({ onOpenProject }: { onOpenProject: (projectId: number) => void }) {
  const { data: orders, isLoading } = trpc.orders.adminList.useQuery();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [urgentFirst, setUrgentFirst] = useState(false);

  const rows = useMemo(() => {
    let list = (orders ?? []).map((o) => ({
      order: o,
      project: o.projects.at(0) ?? null,
    }));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        ({ order: o }) =>
          o.user.name?.toLowerCase().includes(q) ||
          o.user.email?.toLowerCase().includes(q) ||
          orderRef(o.id).toLowerCase().includes(q),
      );
    }
    if (productFilter !== "all") list = list.filter(({ order: o }) => o.product === productFilter);
    if (statusFilter !== "all") list = list.filter(({ project: p }) => p?.status === statusFilter);
    if (urgentFirst) {
      list = [...list].sort(
        (a, b) => daysSince(b.project?.updatedAt ?? b.order.createdAt) - daysSince(a.project?.updatedAt ?? a.order.createdAt),
      );
    }
    return list;
  }, [orders, search, statusFilter, productFilter, urgentFirst]);

  const exportCsv = () => {
    const header = "N°;Couple;Email;Produit;Montant;Payée le;Mariage le;Statut;Jours en statut";
    const lines = rows.map(({ order: o, project: p }) =>
      [
        orderRef(o.id),
        p ? coupleNamesFromSlug(p.slug) : "",
        o.user.email ?? "",
        productLabel(o.product),
        (o.amountCents / 100).toFixed(2).replace(".", ",") + " €",
        formatDate(o.createdAt),
        p?.weddingDate ? formatDate(p.weddingDate) : "",
        p?.status ?? "",
        p ? daysSince(p.updatedAt) : "",
      ].join(";"),
    );
    const blob = new Blob(["﻿" + [header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "commandes-scrollthedate.csv";
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Export CSV téléchargé");
  };

  return (
    <div className="rounded-xl bg-white shadow-[0_8px_32px_rgba(27,27,30,.06)]">
      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 p-4">
        <label className="flex h-9 min-w-52 flex-1 items-center gap-2 rounded-[10px] border border-neutral-200 bg-neutral-100 px-3">
          <Search size={14} className="text-neutral-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Recherche libre…"
            className="w-full bg-transparent text-[13px] outline-none placeholder:text-neutral-500"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-[10px] border border-neutral-200 bg-white px-3 text-[12px] font-medium outline-none focus:border-terracotta-500"
        >
          <option value="all">Tous les statuts</option>
          {PIPELINE.map((c) => (
            <option key={c.status} value={c.status}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          className="h-9 rounded-[10px] border border-neutral-200 bg-white px-3 text-[12px] font-medium outline-none focus:border-terracotta-500"
        >
          <option value="all">Tous les produits</option>
          <option value="FAIRE_PART">Faire-part</option>
          <option value="SAVE_THE_DATE">Save the Date</option>
        </select>
        <button
          type="button"
          onClick={() => setUrgentFirst((v) => !v)}
          className={cn(
            "h-9 rounded-[10px] border px-3 text-[12px] font-semibold transition-colors",
            urgentFirst ? "border-error/40 bg-error/10 text-error" : "border-neutral-200 text-neutral-500 hover:text-ink",
          )}
        >
          Trier par urgences
        </button>
        <button
          type="button"
          onClick={exportCsv}
          className="flex h-9 items-center gap-1.5 rounded-[10px] border border-neutral-200 px-3 text-[12px] font-semibold text-neutral-500 transition-colors hover:text-ink"
        >
          <Download size={13} /> CSV
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-terracotta-500" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-neutral-200 text-[11px] uppercase tracking-[0.08em] text-neutral-500">
                {["N°", "Couple", "Email", "Produit", "Montant", "Payée le", "Mariage le", "Statut", "Jours", "⚑"].map(
                  (h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 font-semibold">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ order: o, project: p }, i) => {
                const days = p ? daysSince(p.updatedAt) : 0;
                return (
                  <motion.tr
                    key={o.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => p && onOpenProject(p.id)}
                    className={cn(
                      "border-b border-neutral-200/60 transition-colors last:border-0",
                      p && "cursor-pointer hover:bg-neutral-100/60",
                    )}
                  >
                    <td className="tabular whitespace-nowrap px-4 py-3 font-mono text-[12px] font-semibold">
                      {orderRef(o.id)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="font-display font-medium">{p ? coupleNamesFromSlug(p.slug) : "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-neutral-500">{o.user.email ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="rounded-full border border-neutral-200 px-2 py-0.5 text-[11px] font-medium">
                        {productLabel(o.product)}
                      </span>
                    </td>
                    <td className="tabular whitespace-nowrap px-4 py-3 font-semibold">{formatEuro(o.amountCents)}</td>
                    <td className="tabular whitespace-nowrap px-4 py-3 text-neutral-500">
                      <span className="mr-2"><PaymentBadge status={o.paymentStatus} /></span>
                      {formatDate(o.createdAt)}
                    </td>
                    <td className="tabular whitespace-nowrap px-4 py-3 text-neutral-500">
                      {p?.weddingDate ? formatDate(p.weddingDate) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{p ? <StatusBadge status={p.status} /> : "—"}</td>
                    <td
                      className={cn(
                        "tabular px-4 py-3 font-semibold",
                        days > 10 ? "text-error" : days > 5 ? "text-pending" : "text-neutral-500",
                      )}
                    >
                      {p ? `${days} j` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {o.paymentStatus === "failed" && <Flag size={13} className="text-error" />}
                    </td>
                  </motion.tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-[13px] text-neutral-500">
                    Aucune commande ne correspond aux filtres.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function Commandes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [confirmDeliver, setConfirmDeliver] = useState<{ projectId: number } | null>(null);

  const utils = trpc.useUtils();
  const { data: projects, isLoading } = trpc.projects.adminList.useQuery();

  const statusFilter = (searchParams.get("statut") as ProjectStatus | null) ?? null;
  const openProjectId = searchParams.get("projet") ? Number(searchParams.get("projet")) : null;

  const setOpenProject = (id: number | null) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (id === null) next.delete("projet");
        else next.set("projet", String(id));
        return next;
      },
      { replace: true },
    );
  };

  const updateStatus = trpc.projects.adminUpdateStatus.useMutation({
    onSuccess: () => {
      utils.projects.adminList.invalidate();
      utils.analytics.adminOverview.invalidate();
      toast.success("Statut mis à jour");
    },
    onError: () => toast.error("Impossible de changer le statut"),
  });

  const moveProject = (projectId: number, status: ProjectStatus) => {
    const project = (projects ?? []).find((p) => p.id === projectId);
    if (!project || project.status === status) return;
    if (status === "DELIVERED") {
      setConfirmDeliver({ projectId });
      return;
    }
    updateStatus.mutate({ projectId, status });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-500">Admin</p>
          <h1 className="font-display text-[28px] font-medium leading-tight">Commandes</h1>
        </div>
        <div className="flex gap-1 rounded-full border border-neutral-200 bg-white p-1">
          {(
            [
              { id: "kanban", label: "Kanban", icon: LayoutGrid },
              { id: "table", label: "Table", icon: TableIcon },
            ] as const
          ).map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-1.5 text-[12px] font-semibold transition-colors",
                view === v.id ? "bg-anthracite-800 text-white" : "text-neutral-500 hover:text-ink",
              )}
            >
              <v.icon size={13} /> {v.label}
            </button>
          ))}
        </div>
      </div>

      {statusFilter && (
        <button
          type="button"
          onClick={() =>
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.delete("statut");
              return next;
            })
          }
          className="rounded-full bg-terracotta-500/10 px-3 py-1.5 text-[12px] font-semibold text-terracotta-500 hover:bg-terracotta-500/20"
        >
          Filtre : {PIPELINE.find((c) => c.status === statusFilter)?.label} ✕
        </button>
      )}

      {isLoading ? (
        <div className="flex justify-center py-24">
          <Loader2 size={28} className="animate-spin text-terracotta-500" />
        </div>
      ) : view === "kanban" ? (
        <Kanban
          projects={projects ?? []}
          onOpen={(id) => setOpenProject(id)}
          onMove={moveProject}
          filter={statusFilter && PIPELINE.some((c) => c.status === statusFilter) ? statusFilter : null}
        />
      ) : (
        <OrdersTable onOpenProject={(id) => setOpenProject(id)} />
      )}

      {/* Fiche 360° */}
      <ProjectDrawer projectId={openProjectId} onClose={() => setOpenProject(null)} />

      {/* Confirmation drop → Livré */}
      <AnimatePresence>
        {confirmDeliver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-anthracite-950/50 p-6 backdrop-blur-sm"
            onClick={() => setConfirmDeliver(null)}
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
                Le faire-part est-il activé et l'email de livraison prêt ? Le client sera notifié.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmDeliver(null)}
                  className="rounded-full border border-neutral-200 px-5 py-2.5 text-[13px] font-semibold hover:border-neutral-500"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateStatus.mutate({ projectId: confirmDeliver.projectId, status: "DELIVERED" });
                    setConfirmDeliver(null);
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
    </div>
  );
}
