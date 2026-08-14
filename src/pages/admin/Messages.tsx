import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  CheckCheck,
  Inbox,
  Loader2,
  Mic,
  Search,
  Send,
  Zap,
} from "lucide-react";
import { Link } from "react-router";
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
  Pill,
  StatusPill,
  ToastStack,
  fmtDate,
  fmtTime,
  inputClass,
  textareaClass,
  timeAgo,
  useToasts,
} from "@/components/admin-suite/ui";
import type {
  AdminMessage,
  AdminProject,
  InboxThread,
} from "@/components/admin-suite/types";

const DEFAULT_QUICK_REPLIES = [
  "Merci, on s'en occupe !",
  "Vos scénarios arrivent demain.",
  "Bien reçu, je regarde ça aujourd'hui.",
];

// ------------------------------------------------------------------ page ----

export default function Messages() {
  const { toasts, push } = useToasts();
  const utils = trpc.useUtils();
  const inboxQ = trpc.messages.adminInbox.useQuery(undefined, {
    refetchInterval: 15000,
  });
  const threads = useMemo(
    () => ((inboxQ.data ?? []) as InboxThread[]),
    [inboxQ.data],
  );

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);

  const markRead = trpc.messages.markRead.useMutation({
    onSuccess: () => utils.messages.adminInbox.invalidate(),
  });

  const selected = threads.find((t) => t.project.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return threads
      .filter((t) => (unreadOnly ? t.unreadCount > 0 : true))
      .filter((t) =>
        q
          ? (t.user.name ?? "").toLowerCase().includes(q) ||
            (t.user.email ?? "").toLowerCase().includes(q) ||
            (t.lastMessage?.body ?? "").toLowerCase().includes(q)
          : true,
      )
      .sort((a, b) => {
        if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
        return (
          new Date(b.lastMessage?.createdAt ?? 0).getTime() -
          new Date(a.lastMessage?.createdAt ?? 0).getTime()
        );
      });
  }, [threads, search, unreadOnly]);

  const totalUnread = threads.reduce((sum, t) => sum + t.unreadCount, 0);

  const openThread = (t: InboxThread) => {
    setSelectedId(t.project.id);
    if (t.unreadCount > 0) markRead.mutate({ projectId: t.project.id });
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-[1600px] flex-col text-ink">
      <PageHeader
        title="Messages"
        description="Tous les fils clients, avec le contexte projet sous la main."
        actions={
          totalUnread > 0 ? (
            <Pill tone="terracotta" className="px-3 py-1 text-xs">
              {totalUnread} non lu{totalUnread > 1 ? "s" : ""}
            </Pill>
          ) : undefined
        }
      />

      <div className="grid min-h-[560px] flex-1 gap-4 xl:grid-cols-[300px_1fr_280px] lg:grid-cols-[300px_1fr]">
        {/* Colonne 1 — liste des fils */}
        <Panel className="flex min-h-0 flex-col overflow-hidden">
          <div className="border-b border-neutral-200 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher…"
                className={cn(inputClass, "h-8 pl-9 text-xs")}
              />
            </div>
            <div className="mt-2 flex gap-1.5">
              <FilterChip active={unreadOnly} onClick={() => setUnreadOnly((v) => !v)}>
                Non lus
              </FilterChip>
              <FilterChip active={!unreadOnly} onClick={() => setUnreadOnly(false)}>
                Tous
              </FilterChip>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {inboxQ.isLoading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-neutral-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                title={unreadOnly ? "Aucun non lu" : "Aucune conversation"}
                description="Les messages des clients apparaîtront ici."
              />
            ) : (
              filtered.map((t) => {
                const active = t.project.id === selectedId;
                return (
                  <button
                    key={t.project.id}
                    onClick={() => openThread(t)}
                    className={cn(
                      "relative flex w-full gap-3 border-b border-neutral-200/70 px-4 py-3 text-left transition-colors hover:bg-neutral-100",
                      active && "bg-neutral-100",
                    )}
                  >
                    {active ? (
                      <motion.span
                        layoutId="thread-indicator"
                        className="absolute inset-y-0 left-0 w-[3px] bg-terracotta-500"
                      />
                    ) : null}
                    <Initials name={t.user.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-[13px] font-semibold text-ink">
                          {t.user.name ?? "Sans nom"}
                        </p>
                        <span className="tabular shrink-0 text-[10px] text-neutral-500">
                          {timeAgo(t.lastMessage?.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-neutral-500">
                        {t.lastMessage?.body ?? "—"}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <StatusPill status={t.project.status} />
                        {t.unreadCount > 0 ? (
                          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-terracotta-500 px-1 text-[10px] font-bold text-white">
                            {t.unreadCount}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Panel>

        {/* Colonne 2 — fil actif */}
        <Panel className="flex min-h-0 flex-col overflow-hidden">
          {selected ? (
            <ThreadView
              key={selected.project.id}
              thread={selected}
              push={push}
            />
          ) : (
            <EmptyState
              title="Sélectionnez une conversation — ou profitez du calme."
              description="Choisissez un fil à gauche pour lire et répondre."
              action={<Inbox className="h-6 w-6 text-neutral-200" />}
            />
          )}
        </Panel>

        {/* Colonne 3 — contexte projet */}
        {selected ? (
          <ProjectContext projectId={selected.project.id} />
        ) : (
          <Panel className="hidden xl:block">
            <EmptyState title="Contexte projet" description="Sélectionnez un fil." />
          </Panel>
        )}
      </div>
      <ToastStack toasts={toasts} />
    </div>
  );
}

// --------------------------------------------------------------- fil actif ----

function ThreadView({
  thread,
  push,
}: {
  thread: InboxThread;
  push: (kind: "success" | "error", text: string) => void;
}) {
  const utils = trpc.useUtils();
  const projectId = thread.project.id;
  const threadQ = trpc.messages.listThread.useQuery(
    { projectId },
    { refetchInterval: 10000 },
  );
  const quickQ = trpc.settings.get.useQuery({ key: "quickReplies" });
  const quickReplies = useMemo(() => {
    const v = quickQ.data?.value;
    return Array.isArray(v) && v.every((x) => typeof x === "string")
      ? (v as string[])
      : DEFAULT_QUICK_REPLIES;
  }, [quickQ.data]);

  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [showQuick, setShowQuick] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const messages = (threadQ.data ?? []) as AdminMessage[];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = trpc.messages.send.useMutation({
    onSuccess: async () => {
      setBody("");
      await Promise.all([
        utils.messages.listThread.invalidate({ projectId }),
        utils.messages.adminInbox.invalidate(),
      ]);
    },
    onError: () => push("error", "Échec de l'envoi."),
  });

  const markAllRead = trpc.messages.markRead.useMutation({
    onSuccess: () => utils.messages.adminInbox.invalidate(),
  });

  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-5 py-3">
        <div className="flex items-center gap-3">
          <Initials name={thread.user.name} size="sm" />
          <div>
            <p className="font-display text-[15px] text-ink">
              {thread.user.name ?? "Sans nom"}
            </p>
            <p className="text-xs text-neutral-500">{thread.user.email ?? ""}</p>
          </div>
        </div>
        {thread.unreadCount > 0 ? (
          <AdminButton
            variant="ghost"
            onClick={() => markAllRead.mutate({ projectId })}
          >
            <CheckCheck /> Marquer lu
          </AdminButton>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-neutral-100/50 px-5 py-4">
        <AnimatePresence initial={false}>
          <div className="flex flex-col gap-3">
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                className={cn(
                  "max-w-[78%] rounded-2xl px-4 py-2.5 text-sm",
                  m.internal
                    ? "self-end border border-dashed border-neutral-200 bg-neutral-100 text-ink"
                    : m.senderRole === "admin"
                      ? "self-end bg-anthracite-800 text-white"
                      : "self-start border border-neutral-200 bg-white text-ink",
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
              </motion.div>
            ))}
            <div ref={bottomRef} />
          </div>
        </AnimatePresence>
      </div>

      {/* Composer */}
      <div className="relative border-t border-neutral-200 p-4">
        {showQuick ? (
          <div className="absolute -top-2 left-4 right-4 z-10 -translate-y-full rounded-xl border border-neutral-200 bg-white p-2 shadow-[0_8px_32px_rgba(27,27,30,0.16)]">
            <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-500">
              Réponses rapides
            </p>
            {quickReplies.map((r) => (
              <button
                key={r}
                onClick={() => {
                  setBody((b) => (b ? `${b} ${r}` : r));
                  setShowQuick(false);
                }}
                className="w-full rounded-lg px-2 py-1.5 text-left text-sm text-ink transition-colors hover:bg-neutral-100"
              >
                {r}
              </button>
            ))}
            <p className="mt-1 px-2 text-[10px] text-neutral-500">
              Modifiables dans Paramètres → Notifications.
            </p>
          </div>
        ) : null}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder={
            internal ? "Note interne (invisible client)…" : "Votre réponse…"
          }
          className={textareaClass}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && body.trim()) {
              send.mutate({ projectId, body: body.trim(), internal });
            }
          }}
        />
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AdminButton variant="ghost" onClick={() => setShowQuick((v) => !v)}>
              <Zap /> Réponses
            </AdminButton>
            <label className="flex items-center gap-2 text-xs text-neutral-500">
              <AdminSwitch checked={internal} onChange={setInternal} label="Note interne" />
              Note interne
            </label>
          </div>
          <AdminButton
            disabled={!body.trim() || send.isPending}
            onClick={() => send.mutate({ projectId, body: body.trim(), internal })}
          >
            {send.isPending ? <Loader2 className="animate-spin" /> : <Send />}
            Envoyer
          </AdminButton>
        </div>
      </div>
    </>
  );
}

// -------------------------------------------------------- contexte projet ----

function ProjectContext({ projectId }: { projectId: number }) {
  const q = trpc.projects.adminGet.useQuery({ projectId });
  const p = q.data as
    | (AdminProject & {
        voiceNotes?: { id: number; url: string; durationSec: number }[];
        auditEvents?: { id: number; action: string; createdAt: string | Date }[];
      })
    | undefined;

  if (q.isLoading) {
    return (
      <Panel className="flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />
      </Panel>
    );
  }
  if (!p) return null;

  const lastEvent = p.auditEvents?.at(-1);
  const voice = p.voiceNotes?.at(0);
  const completion = p.questionnaire?.completionPct ?? 0;

  return (
    <Panel className="flex flex-col gap-4 bg-neutral-100 p-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
          Projet #{p.id}
        </p>
        <div className="mt-2 flex flex-col gap-2">
          <StatusPill status={p.status} />
          <MiniStepper status={p.status} />
        </div>
      </div>

      <div className="rounded-xl bg-white p-3">
        <p className="text-[11px] font-medium text-neutral-500">Mariage</p>
        <p className="tabular mt-0.5 text-sm font-medium text-ink">
          {fmtDate(p.weddingDate)}
        </p>
        {p.venue ? (
          <p className="mt-0.5 truncate text-xs text-neutral-500">{p.venue}</p>
        ) : null}
      </div>

      <div className="rounded-xl bg-white p-3">
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] font-medium text-neutral-500">Questionnaire</p>
          <p className="tabular text-sm font-semibold text-ink">{completion} %</p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-200">
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: completion / 100 }}
            transition={{ duration: 0.6 }}
            className="h-full origin-left rounded-full bg-terracotta-500"
          />
        </div>
      </div>

      <div className="rounded-xl bg-white p-3">
        <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-neutral-500">
          <Mic className="h-3 w-3" /> Note vocale
        </p>
        {voice ? (
          <audio controls preload="none" src={voice.url} className="h-8 w-full" />
        ) : (
          <p className="text-xs text-neutral-500">Aucune note vocale.</p>
        )}
      </div>

      {lastEvent ? (
        <div className="rounded-xl bg-white p-3">
          <p className="text-[11px] font-medium text-neutral-500">
            Dernière activité
          </p>
          <p className="mt-0.5 text-xs font-medium text-ink">{lastEvent.action}</p>
          <p className="tabular text-[11px] text-neutral-500">
            {timeAgo(lastEvent.createdAt)}
          </p>
        </div>
      ) : null}

      <Link
        to="/admin/projets"
        className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-[10px] border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-terracotta-500 transition-colors hover:border-terracotta-300"
      >
        Ouvrir la fiche 360° <ArrowUpRight className="h-4 w-4" />
      </Link>
    </Panel>
  );
}
