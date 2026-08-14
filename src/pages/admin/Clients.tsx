import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowUpRight,
  Download,
  Loader2,
  Mail,
  MessageSquare,
  Search,
  Send,
  Users,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { cn } from "@/lib/utils";
import {
  AdminButton,
  AdminSwitch,
  EmptyState,
  FilterChip,
  Initials,
  MiniStepper,
  PageHeader,
  Panel,
  PanelTitle,
  PaymentPill,
  Pill,
  StatusPill,
  ToastStack,
  eur,
  fmtDate,
  fmtTime,
  inputClass,
  textareaClass,
  timeAgo,
  useToasts,
} from "@/components/admin-suite/ui";
import {
  PRODUCT_LABEL,
  PROJECT_STATUS_ORDER,
  type AdminMessage,
  type AdminOrder,
  type AdminProject,
  type AdminUser,
  type FormTemplate,
  type ProjectStatus,
} from "@/components/admin-suite/types";

// ------------------------------------------------------------ agrégation ----

interface ClientRow {
  user: AdminUser;
  orders: AdminOrder[];
  projects: AdminProject[];
  products: string[];
  totalCents: number;
  lastContact: Date | null;
  latestProject: AdminProject | null;
}

function aggregateClients(
  orders: AdminOrder[] | undefined,
  projects: AdminProject[] | undefined,
): ClientRow[] {
  const byUser = new Map<number, ClientRow>();
  for (const o of orders ?? []) {
    if (!o.user) continue;
    const row =
      byUser.get(o.user.id) ??
      ({
        user: o.user,
        orders: [],
        projects: [],
        products: [],
        totalCents: 0,
        lastContact: null,
        latestProject: null,
      } satisfies ClientRow);
    row.orders.push(o);
    if (o.paymentStatus === "paid") row.totalCents += o.amountCents;
    byUser.set(o.user.id, row);
  }
  for (const p of projects ?? []) {
    const userId = p.userId;
    const user = p.user;
    if (!user) continue;
    let row = byUser.get(userId);
    if (!row) {
      row = {
        user,
        orders: [],
        projects: [],
        products: [],
        totalCents: 0,
        lastContact: null,
        latestProject: null,
      };
      byUser.set(userId, row);
    }
    row.projects.push(p);
    const msgDates = (p.messages ?? []).map((m) => new Date(m.createdAt));
    const candidates = [...msgDates, new Date(p.updatedAt)];
    const max = candidates.reduce((a, b) => (a > b ? a : b));
    if (!row.lastContact || max > row.lastContact) row.lastContact = max;
  }
  for (const row of byUser.values()) {
    const products = new Set<string>();
    for (const o of row.orders) products.add(PRODUCT_LABEL[o.product]);
    for (const p of row.projects) {
      if (p.order) products.add(PRODUCT_LABEL[p.order.product]);
    }
    row.products = [...products];
    row.projects.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    row.orders.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    row.latestProject = row.projects.at(0) ?? null;
  }
  return [...byUser.values()].sort(
    (a, b) => (b.lastContact?.getTime() ?? 0) - (a.lastContact?.getTime() ?? 0),
  );
}

// ---------------------------------------------------------------- segments ----

type SegmentId = "soon" | "questionnaire" | "rsvp" | "inactive";

const SEGMENTS: { id: SegmentId; label: string; test: (c: ClientRow) => boolean }[] = [
  {
    id: "soon",
    label: "Mariages < 60 jours",
    test: (c) =>
      c.projects.some((p) => {
        if (!p.weddingDate || p.status === "DELIVERED") return false;
        const diff = new Date(p.weddingDate).getTime() - Date.now();
        return diff > 0 && diff < 60 * 24 * 3600 * 1000;
      }),
  },
  {
    id: "questionnaire",
    label: "Questionnaire incomplet",
    test: (c) =>
      c.projects.some(
        (p) =>
          p.status !== "DELIVERED" &&
          (p.questionnaire?.completionPct ?? 0) < 100,
      ),
  },
  {
    id: "rsvp",
    label: "RSVP actifs",
    test: (c) => c.projects.some((p) => p.status === "DELIVERED"),
  },
  {
    id: "inactive",
    label: "Inactifs > 30 j",
    test: (c) =>
      c.projects.some((p) => p.status !== "DELIVERED") &&
      (c.lastContact?.getTime() ?? 0) < Date.now() - 30 * 24 * 3600 * 1000,
  },
];

// ------------------------------------------------------------------ page ----

export default function Clients() {
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("client");
  const selectClient = (id: number | null) => {
    setParams(id ? { client: String(id) } : {}, { replace: false });
  };
  return (
    <div className="mx-auto w-full max-w-[1600px] text-ink">
      <AnimatePresence mode="wait">
        {selectedId ? (
          <motion.div
            key="detail"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ClientDetail userId={Number(selectedId)} onBack={() => selectClient(null)} />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ClientList onSelect={(id) => selectClient(id)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ------------------------------------------------------------------ liste ----

function highlight(text: string, query: string): ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-sm bg-terracotta-300/50 px-0.5 text-inherit">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function ClientList({ onSelect }: { onSelect: (userId: number) => void }) {
  const ordersQ = trpc.orders.adminList.useQuery();
  const projectsQ = trpc.projects.adminList.useQuery();
  const clients = useMemo(
    () =>
      aggregateClients(
        ordersQ.data as AdminOrder[] | undefined,
        projectsQ.data as AdminProject[] | undefined,
      ),
    [ordersQ.data, projectsQ.data],
  );

  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const t = window.setTimeout(() => setQuery(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const [productFilter, setProductFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | null>(null);
  const [monthFilter, setMonthFilter] = useState<string | null>(null);
  const [segment, setSegment] = useState<SegmentId | null>(null);
  const [showSegments, setShowSegments] = useState(true);

  const months = useMemo(() => {
    const set = new Map<string, string>();
    for (const c of clients)
      for (const p of c.projects) {
        if (!p.weddingDate) continue;
        const d = new Date(p.weddingDate);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        set.set(
          key,
          d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
        );
      }
    return [...set.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [clients]);

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      if (query) {
        const hay = [
          c.user.name ?? "",
          c.user.email ?? "",
          ...c.orders.map((o) => `#${o.id}`),
          ...c.orders.map((o) => String(o.id)),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(query.toLowerCase())) return false;
      }
      if (productFilter && !c.products.includes(productFilter)) return false;
      if (
        statusFilter &&
        !c.projects.some((p) => p.status === statusFilter)
      )
        return false;
      if (monthFilter) {
        const ok = c.projects.some((p) => {
          if (!p.weddingDate) return false;
          const d = new Date(p.weddingDate);
          return (
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` ===
            monthFilter
          );
        });
        if (!ok) return false;
      }
      if (segment) {
        const seg = SEGMENTS.find((s) => s.id === segment);
        if (seg && !seg.test(c)) return false;
      }
      return true;
    });
  }, [clients, query, productFilter, statusFilter, monthFilter, segment]);

  const loading = ordersQ.isLoading || projectsQ.isLoading;

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Qui sont les couples, où en sont-ils, comment les joindre."
        actions={
          <AdminButton
            variant="outline"
            onClick={() => setShowSegments((v) => !v)}
          >
            <Users /> {showSegments ? "Masquer les segments" : "Segments"}
          </AdminButton>
        }
      />

      <div className={cn("grid gap-6", showSegments && "xl:grid-cols-[1fr_260px]")}>
        <div className="min-w-0">
          {/* Barre de recherche + filtres */}
          <div className="mb-4 flex flex-col gap-3">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un nom, un email, un n° de commande…"
                className={cn(inputClass, "pl-9")}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {Object.values(PRODUCT_LABEL).map((p) => (
                <FilterChip
                  key={p}
                  active={productFilter === p}
                  onClick={() =>
                    setProductFilter((cur) => (cur === p ? null : p))
                  }
                >
                  {p}
                </FilterChip>
              ))}
              <span className="mx-1 h-4 w-px bg-neutral-200" />
              {PROJECT_STATUS_ORDER.map((s) => (
                <FilterChip
                  key={s}
                  active={statusFilter === s}
                  onClick={() =>
                    setStatusFilter((cur) => (cur === s ? null : s))
                  }
                >
                  {statusLabelShort(s)}
                </FilterChip>
              ))}
              {months.length > 0 ? (
                <>
                  <span className="mx-1 h-4 w-px bg-neutral-200" />
                  <select
                    value={monthFilter ?? ""}
                    onChange={(e) => setMonthFilter(e.target.value || null)}
                    className="h-7 rounded-full border border-neutral-200 bg-white px-2 text-xs text-neutral-500 outline-none focus:border-terracotta-500"
                    aria-label="Filtrer par mois de mariage"
                  >
                    <option value="">Mariage : tous les mois</option>
                    {months.map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </>
              ) : null}
            </div>
          </div>

          {/* Table */}
          <Panel className="overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-20 text-sm text-neutral-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Chargement des clients…
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                title="Aucun client ne correspond"
                description="Essayez d'élargir la recherche ou de retirer des filtres."
              />
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500">
                    <th className="px-5 py-3">Couple</th>
                    <th className="px-3 py-3">Contact</th>
                    <th className="px-3 py-3">Produit(s)</th>
                    <th className="px-3 py-3">Projet</th>
                    <th className="px-3 py-3">Mariage le</th>
                    <th className="px-3 py-3 text-right">CA total</th>
                    <th className="px-3 py-3">Dernier contact</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => (
                    <motion.tr
                      key={c.user.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.3 }}
                      onClick={() => onSelect(c.user.id)}
                      className="cursor-pointer border-b border-neutral-200/70 transition-colors last:border-0 hover:bg-[#EDEAE6]"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Initials name={c.user.name} size="sm" />
                          <span className="font-display text-[15px] font-medium">
                            {highlight(c.user.name ?? "Sans nom", query)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-neutral-500">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3 w-3" />
                          <span className="max-w-[180px] truncate">
                            {highlight(c.user.email ?? "—", query)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {c.products.map((p) => (
                            <Pill key={p} tone="anthracite" className="px-1.5">
                              {p}
                            </Pill>
                          ))}
                          {c.products.length === 0 ? (
                            <span className="text-neutral-500">—</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {c.latestProject ? (
                          <div className="flex flex-col gap-1.5">
                            <StatusPill status={c.latestProject.status} />
                            <MiniStepper status={c.latestProject.status} />
                          </div>
                        ) : (
                          <span className="text-neutral-500">—</span>
                        )}
                      </td>
                      <td className="tabular px-3 py-3">
                        {fmtDate(c.latestProject?.weddingDate)}
                      </td>
                      <td className="tabular px-3 py-3 text-right font-medium">
                        {eur(c.totalCents)}
                      </td>
                      <td className="px-3 py-3 text-neutral-500">
                        {timeAgo(c.lastContact)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <ArrowUpRight className="ml-auto h-4 w-4 text-neutral-500" />
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </div>

        {/* Segments */}
        {showSegments ? (
          <div className="flex flex-col gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Segments
            </p>
            {SEGMENTS.map((s) => {
              const count = clients.filter(s.test).length;
              const active = segment === s.id;
              return (
                <motion.button
                  key={s.id}
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSegment(active ? null : s.id)}
                  className={cn(
                    "rounded-2xl border bg-white p-4 text-left transition-colors",
                    active
                      ? "border-terracotta-500 ring-2 ring-terracotta-500/20"
                      : "border-neutral-200 hover:border-terracotta-300",
                  )}
                >
                  <p className="tabular font-display text-2xl text-ink">{count}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">{s.label}</p>
                </motion.button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function statusLabelShort(s: ProjectStatus) {
  return (
    {
      ONBOARDING: "Onboarding",
      QUESTIONNAIRE: "Questionnaire",
      SCENARIOS: "Scénarios",
      PRODUCTION: "Production",
      REVIEW: "Validation",
      DELIVERED: "Livré",
    } as const
  )[s];
}


// ----------------------------------------------------------------- fiche ----

const DETAIL_TABS = [
  { id: "projets", label: "Projets & commandes" },
  { id: "echanges", label: "Échanges" },
  { id: "donnees", label: "Données" },
  { id: "activite", label: "Activité" },
] as const;

type DetailTab = (typeof DETAIL_TABS)[number]["id"];

function ClientDetail({
  userId,
  onBack,
}: {
  userId: number;
  onBack: () => void;
}) {
  const { toasts, push } = useToasts();
  const ordersQ = trpc.orders.adminList.useQuery();
  const projectsQ = trpc.projects.adminList.useQuery();
  const client = useMemo(
    () =>
      aggregateClients(
        ordersQ.data as AdminOrder[] | undefined,
        projectsQ.data as AdminProject[] | undefined,
      ).find((c) => c.user.id === userId) ?? null,
    [ordersQ.data, projectsQ.data, userId],
  );

  const [tab, setTab] = useState<DetailTab>("projets");
  const [detailProjectId, setDetailProjectId] = useState<number | null>(null);
  const projectId = detailProjectId ?? client?.latestProject?.id ?? null;

  const detailQ = trpc.projects.adminGet.useQuery(
    { projectId: projectId ?? 0 },
    { enabled: projectId !== null },
  );
  const templateQ = trpc.questionnaire.adminListTemplates.useQuery();
  const activeTemplate = useMemo(() => {
    const list = (templateQ.data ?? []) as FormTemplate[];
    return list.find((t) => t.active) ?? list.at(0) ?? null;
  }, [templateQ.data]);

  const composerRef = useRef<HTMLTextAreaElement>(null);

  if (ordersQ.isLoading || projectsQ.isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-32 text-sm text-neutral-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement de la fiche…
      </div>
    );
  }
  if (!client) {
    return (
      <EmptyState
        title="Client introuvable"
        description="Ce client n'existe pas ou n'a plus de commande."
        action={<AdminButton onClick={onBack}>Retour à la liste</AdminButton>}
      />
    );
  }

  const exportRgpd = () => {
    const payload = {
      exporte_le: new Date().toISOString(),
      client: client.user,
      commandes: client.orders,
      projets: client.projects,
      fiche_360: detailQ.data ?? null,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `felicity-client-${client.user.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    push("success", "Export RGPD téléchargé.");
  };

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Tous les clients
      </button>

      {/* Header fiche */}
      <Panel className="mb-6 flex flex-wrap items-center gap-5 p-6">
        <Initials name={client.user.name} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl text-ink">
            {client.user.name ?? "Sans nom"}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-500">
            <span className="inline-flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> {client.user.email ?? "—"}
            </span>
            <span className="tabular">
              Client depuis le {fmtDate(client.user.createdAt)}
            </span>
            <span className="tabular font-medium text-ink">
              {eur(client.totalCents)} cumulés
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdminButton
            variant="outline"
            onClick={() => {
              setTab("echanges");
              window.setTimeout(() => composerRef.current?.focus(), 250);
            }}
          >
            <MessageSquare /> Envoyer un message
          </AdminButton>
          <AdminButton variant="outline" onClick={exportRgpd}>
            <Download /> Exporter les données
          </AdminButton>
        </div>
      </Panel>

      {/* Onglets */}
      <div className="mb-5 flex gap-1 border-b border-neutral-200">
        {DETAIL_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "relative px-4 py-2.5 text-sm font-medium transition-colors",
              tab === t.id ? "text-ink" : "text-neutral-500 hover:text-ink",
            )}
          >
            {t.label}
            {tab === t.id ? (
              <motion.span
                layoutId="client-tab"
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-terracotta-500"
              />
            ) : null}
          </button>
        ))}
        {client.projects.length > 1 ? (
          <select
            value={projectId ?? ""}
            onChange={(e) => setDetailProjectId(Number(e.target.value))}
            className="ml-auto h-8 self-center rounded-[10px] border border-neutral-200 bg-white px-2 text-xs text-neutral-500 outline-none"
            aria-label="Projet affiché"
          >
            {client.projects.map((p) => (
              <option key={p.id} value={p.id}>
                Projet #{p.id} — {statusLabelShort(p.status)}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {tab === "projets" ? <TabProjets client={client} /> : null}
          {tab === "echanges" ? (
            <TabEchanges client={client} composerRef={composerRef} push={push} />
          ) : null}
          {tab === "donnees" ? (
            <TabDonnees
              client={client}
              detail={detailQ.data as AdminProject | undefined}
              loading={detailQ.isLoading}
              template={activeTemplate}
            />
          ) : null}
          {tab === "activite" ? (
            <TabActivite
              detail={
                detailQ.data as
                  | (AdminProject & {
                      auditEvents?: {
                        id: number;
                        actor: string;
                        action: string;
                        createdAt: string | Date;
                      }[];
                    })
                  | undefined
              }
              loading={detailQ.isLoading}
            />
          ) : null}
        </motion.div>
      </AnimatePresence>

      <ToastStack toasts={toasts} />
    </div>
  );
}

function TabProjets({ client }: { client: ClientRow }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {client.orders.map((o) => {
        const project = client.projects.find((p) => p.orderId === o.id);
        return (
          <Panel key={o.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                  Commande #{o.id}
                </p>
                <p className="font-display mt-1 text-lg text-ink">
                  {PRODUCT_LABEL[o.product]}
                </p>
              </div>
              <PaymentPill status={o.paymentStatus} />
            </div>
            <div className="tabular mt-3 flex items-baseline justify-between text-sm">
              <span className="text-neutral-500">{fmtDate(o.createdAt)}</span>
              <span className="text-base font-semibold text-ink">
                {eur(o.amountCents)}
              </span>
            </div>
            {o.options && o.options.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1">
                {o.options.map((opt) => (
                  <Pill key={opt.id} tone="neutral">
                    {opt.label} · {eur(opt.priceCents)}
                  </Pill>
                ))}
              </div>
            ) : null}
            {project ? (
              <div className="mt-4 flex items-center justify-between rounded-xl bg-neutral-100 px-4 py-3">
                <div className="flex flex-col gap-1.5">
                  <StatusPill status={project.status} />
                  <MiniStepper status={project.status} />
                </div>
                <div className="text-right text-xs text-neutral-500">
                  <p className="tabular">
                    Questionnaire {project.questionnaire?.completionPct ?? 0} %
                  </p>
                  <Link
                    to="/admin/projets"
                    className="mt-1 inline-flex items-center gap-1 font-medium text-terracotta-500 hover:text-terracotta-400"
                  >
                    Fiche 360° <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ) : null}
          </Panel>
        );
      })}
      {client.orders.length === 0 ? (
        <Panel>
          <EmptyState title="Aucune commande" />
        </Panel>
      ) : null}
    </div>
  );
}

function TabEchanges({
  client,
  composerRef,
  push,
}: {
  client: ClientRow;
  composerRef: React.RefObject<HTMLTextAreaElement | null>;
  push: (kind: "success" | "error", text: string) => void;
}) {
  const utils = trpc.useUtils();
  const [internal, setInternal] = useState(false);
  const [body, setBody] = useState("");
  const targetProject = client.latestProject;

  const send = trpc.messages.send.useMutation({
    onSuccess: async () => {
      setBody("");
      push("success", internal ? "Note interne ajoutée." : "Message envoyé.");
      await Promise.all([
        utils.projects.adminList.invalidate(),
        utils.messages.adminInbox.invalidate(),
        utils.messages.listThread.invalidate(),
      ]);
    },
    onError: () => push("error", "Échec de l'envoi du message."),
  });

  const allMessages = useMemo(() => {
    const msgs: (AdminMessage & { projectId: number })[] = [];
    for (const p of client.projects)
      for (const m of p.messages ?? []) msgs.push({ ...m, projectId: p.id });
    return msgs.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [client.projects]);

  return (
    <div className="grid gap-4">
      <Panel className="max-h-[460px] overflow-y-auto p-5">
        {allMessages.length === 0 ? (
          <EmptyState
            title="Aucun échange pour le moment"
            description="Envoyez le premier message pour démarrer la conversation."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {allMessages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
                  m.senderRole === "admin"
                    ? "self-end bg-anthracite-800 text-white"
                    : "self-start border border-neutral-200 bg-white text-ink",
                  m.internal && "border-dashed bg-neutral-100 text-ink",
                )}
              >
                {m.internal ? (
                  <Pill tone="neutral" className="mb-1">
                    interne
                  </Pill>
                ) : null}
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p
                  className={cn(
                    "tabular mt-1 text-[11px]",
                    m.senderRole === "admin" && !m.internal
                      ? "text-white/60"
                      : "text-neutral-500",
                  )}
                >
                  {fmtDate(m.createdAt)} · {fmtTime(m.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-neutral-500">
            Répondre sur le projet{" "}
            {targetProject ? `#${targetProject.id}` : "—"}
          </p>
          <label className="flex items-center gap-2 text-xs text-neutral-500">
            Note interne (invisible client)
            <AdminSwitch checked={internal} onChange={setInternal} label="Note interne" />
          </label>
        </div>
        <textarea
          ref={composerRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder={
            internal ? "Note interne pour l'équipe…" : "Votre message au couple…"
          }
          className={textareaClass}
        />
        <div className="mt-2 flex justify-end">
          <AdminButton
            disabled={
              !body.trim() || !targetProject || send.isPending
            }
            onClick={() =>
              targetProject &&
              send.mutate({
                projectId: targetProject.id,
                body: body.trim(),
                internal,
              })
            }
          >
            {send.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Send />
            )}
            {internal ? "Ajouter la note" : "Envoyer"}
          </AdminButton>
        </div>
      </Panel>
    </div>
  );
}

function TabDonnees({
  client,
  detail,
  loading,
  template,
}: {
  client: ClientRow;
  detail: AdminProject | undefined;
  loading: boolean;
  template: FormTemplate | null;
}) {
  const project = client.latestProject;
  const answers = (project?.questionnaire?.answers ?? {}) as Record<string, unknown>;
  const questions = template?.questions ?? [];
  const labelOf = (id: string) =>
    questions.find((q) => q.id === id)?.label ?? id;
  const voiceNotes = (
    detail as
      | (AdminProject & {
          voiceNotes?: { id: number; url: string; durationSec: number; status: string }[];
        })
      | undefined
  )?.voiceNotes;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel>
        <PanelTitle
          title="Réponses au questionnaire"
          hint={`Complété à ${project?.questionnaire?.completionPct ?? 0} %`}
        />
        <div className="max-h-[420px] overflow-y-auto px-5 py-4">
          {Object.keys(answers).length === 0 ? (
            <p className="py-6 text-center text-sm text-neutral-500">
              Le questionnaire n'a pas encore été commencé.
            </p>
          ) : (
            <dl className="flex flex-col gap-4">
              {Object.entries(answers).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-500">
                    {labelOf(key)}
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm text-ink">
                    {Array.isArray(value)
                      ? value.join(", ")
                      : typeof value === "boolean"
                        ? value
                          ? "Oui"
                          : "Non"
                        : String(value ?? "—")}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </Panel>

      <div className="flex flex-col gap-4">
        <Panel>
          <PanelTitle title="Note vocale" />
          <div className="px-5 py-4">
            {loading ? (
              <p className="flex items-center gap-2 text-sm text-neutral-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
              </p>
            ) : voiceNotes && voiceNotes.length > 0 ? (
              <div className="flex flex-col gap-3">
                {voiceNotes.map((v) => (
                  <div key={v.id} className="flex items-center gap-3">
                    <audio controls preload="none" src={v.url} className="h-9 w-full" />
                    <Pill tone={v.status === "processed" ? "success" : "neutral"}>
                      {v.status === "processed"
                        ? "traitée"
                        : v.status === "received"
                          ? "reçue"
                          : "archivée"}
                    </Pill>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-500">
                Aucune note vocale reçue pour ce projet.
              </p>
            )}
          </div>
        </Panel>

        <Panel>
          <PanelTitle title="Médias" hint={`${project?.media?.length ?? 0} fichier(s)`} />
          <div className="max-h-[260px] overflow-y-auto px-5 py-4">
            {(project?.media ?? []).length === 0 ? (
              <p className="text-sm text-neutral-500">Aucun média envoyé.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {(project?.media ?? []).map((mItem) => (
                  <li
                    key={mItem.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  >
                    <span className="truncate text-ink">
                      {mItem.filename ?? mItem.url}
                    </span>
                    <Pill
                      tone={
                        mItem.status === "validated"
                          ? "success"
                          : mItem.status === "rejected"
                            ? "error"
                            : "neutral"
                      }
                    >
                      {mItem.type}
                    </Pill>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function TabActivite({
  detail,
  loading,
}: {
  detail:
    | (AdminProject & {
        auditEvents?: {
          id: number;
          actor: string;
          action: string;
          createdAt: string | Date;
        }[];
      })
    | undefined;
  loading: boolean;
}) {
  const events = detail?.auditEvents ?? [];
  return (
    <Panel>
      <PanelTitle title="Journal d'activité" hint="Transitions horodatées du projet" />
      <div className="max-h-[480px] overflow-y-auto px-5 py-4">
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-neutral-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
          </p>
        ) : events.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-500">
            Aucun événement enregistré.
          </p>
        ) : (
          <ol className="relative ml-2 flex flex-col gap-4 border-l border-neutral-200 pl-5">
            {[...events].reverse().map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-terracotta-500" />
                <p className="text-sm font-medium text-ink">{e.action}</p>
                <p className="tabular text-xs text-neutral-500">
                  {fmtDate(e.createdAt)} · {fmtTime(e.createdAt)} — {e.actor}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Panel>
  );
}
