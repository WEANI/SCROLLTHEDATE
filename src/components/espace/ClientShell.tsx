import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell,
  ChevronRight,
  ClipboardList,
  Clapperboard,
  Images,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Settings,
  ShoppingBag,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { trpc } from '@/providers/trpc'
import {
  ProgressRing,
} from '@/components/espace/shared'
import {
  formatTime,
  notificationLabel,
} from '@/components/espace/utils'

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

interface NavItem {
  label: string
  to: string
  icon: typeof LayoutDashboard
  end?: boolean
  disabled?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Tableau de bord', to: '/espace', icon: LayoutDashboard, end: true },
  { label: 'Questionnaire', to: '/espace/questionnaire', icon: ClipboardList },
  { label: 'Médias', to: '/espace/questionnaire#medias', icon: Images },
  { label: 'Projet & scénarios', to: '/espace/projet', icon: Clapperboard },
  { label: 'Commandes', to: '/espace/commandes', icon: ShoppingBag },
  { label: 'Messages', to: '/espace/messages', icon: MessageCircle },
  { label: 'Paramètres', to: '/espace/parametres', icon: Settings },
]

const CRUMB_LABEL: Record<string, string> = {
  espace: 'Espace client',
  questionnaire: 'Questionnaire',
  projet: 'Projet & scénarios',
  commandes: 'Commandes',
  messages: 'Messages',
  parametres: 'Paramètres',
}

function breadcrumb(pathname: string): string[] {
  const parts = pathname.split('/').filter(Boolean)
  return parts.map((p) => CRUMB_LABEL[p] ?? p)
}

// ---------------------------------------------------------------------------
// Cloche notifications
// ---------------------------------------------------------------------------

function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const utils = trpc.useUtils()
  const { isAuthenticated } = useAuth()
  const { data: notifications } = trpc.notifications.listMine.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30_000,
  })
  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => utils.notifications.listMine.invalidate(),
  })
  const unread = (notifications ?? []).filter((n) => !n.readAt).length

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-neutral-100"
      >
        <Bell size={19} />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-terracotta-500 px-1 text-[10px] font-semibold text-white">
            {unread}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <button
              type="button"
              aria-label="Fermer"
              className="fixed inset-0 z-30 cursor-default"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_8px_32px_rgba(27,27,30,0.12)]"
            >
              <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
                <p className="text-[13px] font-semibold text-ink">Notifications</p>
                {unread > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllRead.mutate()}
                    className="text-[12px] font-medium text-terracotta-500 hover:text-terracotta-400"
                  >
                    Tout marquer lu
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {(notifications ?? []).length === 0 ? (
                  <p className="px-4 py-8 text-center text-[13px] text-neutral-500">
                    Rien de nouveau pour le moment.
                  </p>
                ) : (
                  (notifications ?? []).slice(0, 12).map((n) => {
                    const label = notificationLabel(n.type)
                    return (
                      <div
                        key={n.id}
                        className={cn(
                          'flex gap-3 border-b border-neutral-200/60 px-4 py-3 last:border-0',
                          !n.readAt && 'bg-terracotta-500/[0.04]',
                        )}
                      >
                        <span
                          className={cn(
                            'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                            n.readAt ? 'bg-neutral-200' : 'bg-terracotta-500',
                          )}
                        />
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-ink">{label.title}</p>
                          {label.detail && (
                            <p className="truncate text-[12px] text-neutral-500">{label.detail}</p>
                          )}
                          <p className="mt-0.5 text-[11px] text-neutral-500">
                            {formatTime(n.createdAt)}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Contenu de la sidebar (partagé desktop / mobile)
// ---------------------------------------------------------------------------

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation()
  const { user, logout, isAuthenticated } = useAuth()
  // `enabled: isAuthenticated` — capital ici : ce composant est monté sur
  // TOUTES les pages /espace/*, et sans cette garde ses requêtes (non
  // désactivées, elles) partagent leur clé de cache react-query avec les
  // requêtes homologues de chaque page (TableauDeBord, Projet…). Même si
  // CES pages posent correctement `enabled: isAuthenticated`, le simple
  // fait que SidebarContent reste toujours actif suffit à déclencher la
  // requête et — en cas de course sur la session juste après un
  // signup/login — à écrire une erreur dans le cache partagé que la page
  // affiche ensuite, rendant la garde de la page inopérante en pratique.
  const { data: project } = trpc.projects.myProject.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 60_000,
  })
  const { data: thread } = trpc.messages.listThread.useQuery(
    {},
    { enabled: isAuthenticated, refetchInterval: 30_000, retry: false },
  )
  const unreadMessages = (thread ?? []).filter(
    (m) => m.senderRole === 'admin' && !m.readAt,
  ).length
  const progress = project?.progress ?? 0

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-20 items-center border-b border-neutral-200 px-6">
        <Link to="/" aria-label="Scroll The Date — accueil" onClick={onNavigate} className="flex items-baseline gap-2">
          <span className="font-display text-2xl font-medium italic text-ink">Scroll The Date</span>
          <span className="rounded-full bg-terracotta-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white">
            S.
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            if (item.disabled) {
              return (
                <li key={item.label}>
                  <span className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium text-neutral-500/60">
                    <Icon size={18} />
                    {item.label}
                    <span className="ml-auto rounded-full bg-neutral-200/70 px-2 py-0.5 text-[10px] font-medium text-neutral-500">
                      bientôt
                    </span>
                  </span>
                </li>
              )
            }
            const target = item.to.split('#')[0]
            const isActive = item.end
              ? location.pathname === target
              : location.pathname.startsWith(target)
            return (
              <li key={item.label}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors',
                    isActive
                      ? 'bg-terracotta-500/10 text-terracotta-500'
                      : 'text-ink/70 hover:bg-neutral-100 hover:text-ink',
                  )}
                >
                  <Icon size={18} className={isActive ? 'text-terracotta-500' : 'text-neutral-500 group-hover:text-ink'} />
                  {item.label}
                  {item.label === 'Messages' && unreadMessages > 0 && (
                    <motion.span
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ duration: 1.6, repeat: Infinity }}
                      className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-terracotta-500 px-1.5 text-[10px] font-semibold text-white"
                    >
                      {unreadMessages}
                    </motion.span>
                  )}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Badge de progression */}
      <div className="border-t border-neutral-200 px-5 py-5">
        <div className="flex items-center gap-3 rounded-xl bg-neutral-100 p-3.5">
          <div className="relative shrink-0">
            <ProgressRing pct={progress} size={48} stroke={5} />
            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-ink">
              {progress}%
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-[12.5px] font-semibold text-ink">Votre projet</p>
            <p className="text-[11.5px] leading-snug text-neutral-500">
              {progress >= 100 ? 'Félicitations, tout est livré !' : 'avance bien, continuez !'}
            </p>
          </div>
        </div>
        {user && (
          <button
            type="button"
            onClick={() => logout()}
            className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] font-medium text-neutral-500 transition-colors hover:text-error"
          >
            <LogOut size={14} />
            Se déconnecter
          </button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

export default function ClientShell() {
  const { user, isLoading, isAuthenticated } = useAuth({ redirectOnUnauthenticated: true })
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const crumbs = breadcrumb(location.pathname)

  // Ferme le drawer mobile à chaque navigation
  const locKey = location.pathname + location.hash
  const [lastLocKey, setLastLocKey] = useState(locKey)
  if (lastLocKey !== locKey) {
    setLastLocKey(locKey)
    setMobileOpen(false)
  }

  useEffect(() => {
    document.title = `Scroll The Date — ${crumbs[crumbs.length - 1] ?? 'Espace client'}`
  }, [crumbs])

  const initials = user?.name
    ? user.name
        .split(/[\s&]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w.charAt(0).toUpperCase())
        .join('')
    : '?'

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-neutral-100">
        <span className="font-display animate-pulse text-3xl font-light italic text-terracotta-500">
          Scroll The Date
        </span>
      </div>
    )
  }
  if (!isAuthenticated) return null // redirection gérée par useAuth

  return (
    <div className="min-h-[100dvh] bg-neutral-100 text-ink">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] border-r border-neutral-200 bg-white lg:block">
        <SidebarContent />
      </aside>

      {/* Sidebar mobile (drawer) */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-anthracite-950/50 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-y-0 left-0 z-50 w-[260px] bg-white shadow-2xl lg:hidden"
            >
              <button
                type="button"
                aria-label="Fermer le menu"
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-5 flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
              >
                <X size={18} />
              </button>
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Colonne principale */}
      <div className="flex min-h-[100dvh] flex-col lg:pl-[260px]">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-neutral-200 bg-white/85 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            aria-label="Ouvrir le menu"
            onClick={() => setMobileOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-neutral-100 lg:hidden"
          >
            <Menu size={20} />
          </button>

          {/* Fil d'Ariane */}
          <nav aria-label="Fil d'Ariane" className="flex min-w-0 items-center gap-1 text-[13px]">
            {crumbs.map((c, i) => (
              <span key={`${c}-${i}`} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={13} className="text-neutral-500" />}
                <span
                  className={cn(
                    'truncate',
                    i === crumbs.length - 1 ? 'font-semibold text-ink' : 'text-neutral-500',
                  )}
                >
                  {c}
                </span>
              </span>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
            <NotificationsBell />
            <div className="flex items-center gap-2.5">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-terracotta-500 text-[12px] font-semibold text-white">
                  {initials}
                </span>
              )}
              <span className="hidden max-w-40 truncate text-[13px] font-medium text-ink sm:block">
                {user?.name ?? 'Mon compte'}
              </span>
            </div>
          </div>
        </header>

        {/* Contenu */}
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
