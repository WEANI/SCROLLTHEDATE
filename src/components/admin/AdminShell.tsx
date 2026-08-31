import { useState } from "react";
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Bell,
  CheckCheck,
  ClipboardList,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Search,
  Settings,
  Users,
  Video,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { LOGIN_PATH } from "@/const";
import { trpc } from "@/providers/trpc";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { formatDateTime, initials } from "@/components/admin/shared";
import type { TabId } from "@/components/admin/ProjectDrawer";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/commandes", label: "Commandes", icon: ClipboardList },
  { to: "/admin/projets", label: "Projets", icon: FolderKanban },
  { to: "/admin/clients", label: "Clients", icon: Users },
  { to: "/admin/formulaires", label: "Formulaires", icon: ClipboardList },
  { to: "/admin/analytique", label: "Analytique", icon: BarChart3 },
  { to: "/admin/messages", label: "Messages", icon: MessageSquare },
  { to: "/admin/parametres", label: "Paramètres", icon: Settings },
];

const NOTIF_LABEL: Record<string, string> = {
  "message.received": "Nouveau message client",
  "scenario.chosen": "Scénario choisi",
  "scenario.changes_requested": "Modifications demandées",
  "video.approved": "Vidéo approuvée",
  "video.changes_requested": "Retours sur la vidéo",
  "order.paid": "Nouvelle commande",
  "questionnaire.submitted": "Questionnaire validé",
};

function notifLabel(type: string) {
  return NOTIF_LABEL[type] ?? type.replaceAll(".", " · ");
}

/**
 * Onglet de la fiche projet (ProjectDrawer) vers lequel router chaque type
 * de notification — cliquer une notif ne faisait jusqu'ici que la marquer
 * lue, sans mener nulle part. `payload.projectId` est présent pour tous les
 * types déclenchés en pratique (cf. notifyAdmins(...) dans scenariosRouter/
 * videosRouter/messagesRouter — chacun y inclut systématiquement projectId
 * + slug) ; `order.paid` est dans NOTIF_LABEL mais n'est déclenché nulle
 * part dans le code actuel, laissé sans route dédiée (repli sur "resume").
 */
const NOTIF_TAB: Partial<Record<string, TabId>> = {
  "message.received": "messages",
  "scenario.chosen": "studio",
  "scenario.changes_requested": "studio",
  "video.approved": "video",
  "video.changes_requested": "video",
  "questionnaire.submitted": "questionnaire",
};

/** Cloche de notifications (données réelles via notifications.listMine). */
function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const { data: notifications } = trpc.notifications.listMine.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => utils.notifications.listMine.invalidate(),
  });
  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => utils.notifications.listMine.invalidate(),
  });

  const unread = (notifications ?? []).filter((n) => !n.readAt);
  const recent = (notifications ?? []).slice(0, 8);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-[10px] border border-neutral-200 bg-white text-ink transition-colors hover:border-terracotta-500"
      >
        <Bell size={17} />
        {unread.length > 0 && (
          <span className="animate-badge-pulse absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-terracotta-500 px-1 text-[10px] font-bold text-white">
            {unread.length}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <button
              type="button"
              aria-label="Fermer"
              className="fixed inset-0 z-40 cursor-default"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18 }}
              className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-[0_8px_32px_rgba(27,27,30,.12)]"
            >
              <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
                <p className="text-[13px] font-semibold text-ink">Notifications</p>
                {unread.length > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllRead.mutate()}
                    className="flex items-center gap-1 text-[11px] font-medium text-terracotta-500 hover:text-terracotta-400"
                  >
                    <CheckCheck size={13} /> Tout marquer lu
                  </button>
                )}
              </div>
              <ul className="max-h-80 overflow-y-auto">
                {recent.length === 0 && (
                  <li className="px-4 py-6 text-center text-[13px] text-neutral-500">
                    Aucune notification.
                  </li>
                )}
                {recent.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!n.readAt) markRead.mutate({ notificationId: n.id });
                        const payload = n.payload as { projectId?: number } | null;
                        const tab = NOTIF_TAB[n.type];
                        if (payload?.projectId && tab) {
                          setOpen(false);
                          navigate(`/admin/projets?projet=${payload.projectId}&tab=${tab}`);
                        }
                      }}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-neutral-100",
                        !n.readAt && "bg-terracotta-500/5",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                          n.readAt ? "bg-neutral-200" : "bg-terracotta-500",
                        )}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium text-ink">
                          {notifLabel(n.type)}
                        </span>
                        <span className="tabular block text-[11px] text-neutral-500">
                          {formatDateTime(n.createdAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Shell admin : sidebar 240px anthracite-800 + topbar claire + <Outlet/>.
 * Garde d'accès : réservé au rôle admin.
 */
export default function AdminShell() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-neutral-100">
        <div className="flex flex-col items-center gap-4">
          <span className="h-10 w-10 animate-spin rounded-full border-2 border-neutral-200 border-t-terracotta-500" />
          <p className="text-[13px] font-medium text-neutral-500">Chargement de l'administration…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={LOGIN_PATH} state={{ from: location.pathname }} replace />;
  }
  if (user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-[100dvh] bg-neutral-100 font-sans text-ink">
      <Toaster position="top-right" richColors />
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-anthracite-800">
        {/* Marque seule (sans wordmark) : "Scroll The Date" en toutes
            lettres + badge "Admin" ne tiennent pas dans les 240px fixes de
            cette sidebar (déjà à la limite avec l'ancien nom, plus court). */}
        <Link to="/admin" className="flex h-16 items-center gap-2 border-b border-anthracite-700 px-6">
          <img src="/logo-mark.svg" alt="Scroll The Date" className="h-8 w-8" />
          <span className="font-display text-[15px] italic leading-none text-white">Scroll The Date</span>
        </Link>
        <div className="border-b border-anthracite-700 px-6 py-2">
          <span className="rounded-full bg-terracotta-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-terracotta-300">
            Admin
          </span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="flex flex-col gap-1">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13px] font-medium transition-colors",
                      isActive
                        ? "bg-anthracite-700 text-terracotta-500"
                        : "text-neutral-500 hover:bg-anthracite-700/60 hover:text-white",
                    )
                  }
                >
                  <item.icon size={16} />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-anthracite-700 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-terracotta-500 text-[12px] font-bold text-white">
              {initials(user?.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-white">{user?.name ?? "Admin"}</p>
              <p className="truncate text-[11px] text-neutral-500">{user?.email}</p>
            </div>
            <button
              type="button"
              aria-label="Déconnexion"
              onClick={() => logout()}
              className="text-neutral-500 transition-colors hover:text-terracotta-400"
            >
              <LogOut size={16} />
            </button>
          </div>
          <Link
            to="/"
            className="mt-3 block text-center text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500 transition-colors hover:text-white"
          >
            ← Voir le site
          </Link>
        </div>
      </aside>

      {/* ── Colonne principale ──────────────────────────────────── */}
      <div className="ml-60 flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-neutral-200 bg-white/90 px-6 backdrop-blur-md">
          <button
            type="button"
            onClick={() => navigate("/admin/commandes")}
            className="flex h-10 w-full max-w-md items-center gap-3 rounded-[10px] border border-neutral-200 bg-neutral-100 px-3 text-[13px] text-neutral-500 transition-colors hover:border-terracotta-500"
          >
            <Search size={15} />
            <span className="flex-1 text-left">Rechercher une commande, un client…</span>
            <kbd className="rounded-md border border-neutral-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-neutral-500">
              ⌘K
            </kbd>
          </button>
          <div className="ml-auto flex items-center gap-3">
            <Link
              to="/admin/projets"
              className="flex h-10 items-center gap-2 rounded-[10px] bg-terracotta-500 px-4 text-[13px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400 active:scale-[0.97]"
            >
              <Video size={15} />+ Nouveau
            </Link>
            <NotificationsBell />
          </div>
        </header>

        {/* Contenu */}
        <main className="mx-auto w-full max-w-[1600px] flex-1 p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
