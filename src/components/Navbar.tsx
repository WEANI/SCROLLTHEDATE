import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { LOGIN_PATH } from '@/const'

interface NavLink {
  label: string
  href: string // '/route' ou '#ancre' (ancre de la home)
}

const NAV_LINKS: NavLink[] = [
  { label: 'Concept', href: '#concept' },
  { label: 'Comment ça marche', href: '#comment-ca-marche' },
  { label: 'Offres', href: '/offres' },
  { label: 'Démo', href: '/demofairepart' },
  { label: 'FAQ', href: '#faq' },
]

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
}
const itemVariants = {
  hidden: { y: 12, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, isLoading, isAuthenticated, logout } = useAuth()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Ferme le menu mobile à chaque navigation (ajustement d'état au rendu)
  const locKey = location.pathname + location.hash
  const [lastLocKey, setLastLocKey] = useState(locKey)
  if (lastLocKey !== locKey) {
    setLastLocKey(locKey)
    setOpen(false)
  }

  const go = (href: string) => {
    if (href.startsWith('#')) {
      if (location.pathname === '/') {
        document.getElementById(href.slice(1))?.scrollIntoView({ behavior: 'smooth' })
      } else {
        navigate(`/${href}`)
      }
    } else {
      navigate(href)
    }
    setOpen(false)
  }

  return (
    <>
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-colors duration-500',
        scrolled || open
          ? 'border-b border-anthracite-700/50 bg-anthracite-950/85 backdrop-blur-md'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <motion.nav
        className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-6 lg:px-12"
        variants={listVariants}
        initial="hidden"
        animate="show"
      >
        {/* Wordmark */}
        <motion.div variants={itemVariants}>
          <Link to="/" aria-label="Scroll The Date — accueil" className="flex items-center">
            <img src="/logo.svg" alt="Scroll The Date" className="h-9 w-auto" />
          </Link>
        </motion.div>

        {/* Liens centre — desktop */}
        <ul className="hidden items-center gap-8 lg:flex">
          {NAV_LINKS.map((link) => (
            <motion.li key={link.label} variants={itemVariants}>
              <button
                type="button"
                onClick={() => go(link.href)}
                className="group relative text-[13px] font-medium uppercase tracking-[0.14em] text-white/80 transition-colors hover:text-white"
              >
                {link.label}
                <span className="absolute -bottom-1.5 left-0 h-px w-full origin-left scale-x-0 bg-terracotta-500 transition-transform duration-300 group-hover:scale-x-100" />
              </button>
            </motion.li>
          ))}
        </ul>

        {/* Zone compte + CTA — desktop */}
        <motion.div variants={itemVariants} className="hidden items-center gap-6 lg:flex">
          {/* AUTH-SLOT: rewired to useAuth() */}
          {isLoading ? (
            <span className="inline-block h-5 w-24 animate-pulse rounded bg-white/10" aria-hidden="true" />
          ) : isAuthenticated && user ? (
            <span className="flex items-center gap-4">
              <Link
                to={user.role === 'admin' ? '/admin' : '/espace'}
                className="flex items-center gap-2.5 text-[13px] font-medium uppercase tracking-[0.14em] text-white/80 transition-colors hover:text-white"
              >
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-terracotta-500 text-[11px] font-semibold text-white">
                    {(user.name ?? '?').slice(0, 1).toUpperCase()}
                  </span>
                )}
                Mon espace
              </Link>
              <button
                type="button"
                onClick={() => logout()}
                className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/50 transition-colors hover:text-white"
              >
                Déconnexion
              </button>
            </span>
          ) : (
            <Link
              to={LOGIN_PATH}
              className="text-[13px] font-medium uppercase tracking-[0.14em] text-white/80 transition-colors hover:text-white"
            >
              Se connecter
            </Link>
          )}
          <Link
            to="/offres"
            className="rounded-full bg-terracotta-500 px-6 py-2.5 text-[13px] font-semibold uppercase tracking-[0.1em] text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400 active:scale-[0.97]"
          >
            Créer notre faire-part
          </Link>
        </motion.div>

        {/* Burger — mobile */}
        <motion.button
          variants={itemVariants}
          type="button"
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          onClick={() => setOpen((v) => !v)}
          className="flex h-11 w-11 items-center justify-center text-white lg:hidden"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </motion.button>
      </motion.nav>
    </header>

    {/* Menu mobile plein écran — hors du <header> : celui-ci reçoit
        `backdrop-blur-md` quand le menu est ouvert, et un `backdrop-filter`
        sur un ancêtre transforme celui-ci en containing block pour ses
        descendants `position: fixed` (comportement CSS standard, comme
        `transform`/`filter`/`perspective`). Le panneau se retrouvait
        positionné par rapport à la boîte du header (~81px) au lieu du
        viewport entier, réduit à un bandeau transparent au travers duquel
        on voyait le contenu de la page. */}
    <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 top-20 z-40 flex flex-col bg-anthracite-950 px-8 pb-10 pt-6 lg:hidden"
          >
            <motion.ul
              className="flex flex-1 flex-col justify-center gap-2"
              variants={{ show: { transition: { staggerChildren: 0.06 } } }}
              initial="hidden"
              animate="show"
            >
              {NAV_LINKS.map((link) => (
                <motion.li
                  key={link.label}
                  variants={{
                    hidden: { y: 24, opacity: 0 },
                    show: { y: 0, opacity: 1, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
                  }}
                >
                  <button
                    type="button"
                    onClick={() => go(link.href)}
                    className="font-display py-3 text-left text-[2rem] font-light italic text-white transition-colors hover:text-terracotta-300"
                  >
                    {link.label}
                  </button>
                </motion.li>
              ))}
            </motion.ul>
            <motion.div
              variants={{ hidden: { y: 24, opacity: 0 }, show: { y: 0, opacity: 1 } }}
              initial="hidden"
              animate="show"
              transition={{ delay: 0.35 }}
              className="flex flex-col gap-4"
            >
              {/* AUTH-SLOT: rewired to useAuth() */}
              {isLoading ? (
                <span className="mx-auto block h-5 w-24 animate-pulse rounded bg-white/10" aria-hidden="true" />
              ) : isAuthenticated && user ? (
                <>
                  <Link
                    to={user.role === 'admin' ? '/admin' : '/espace'}
                    className="text-center text-sm font-medium uppercase tracking-[0.14em] text-white/80"
                  >
                    Mon espace{user.name ? ` — ${user.name}` : ''}
                  </Link>
                  <button
                    type="button"
                    onClick={() => logout()}
                    className="text-center text-[11px] font-medium uppercase tracking-[0.14em] text-white/50 transition-colors hover:text-white"
                  >
                    Déconnexion
                  </button>
                </>
              ) : (
                <Link
                  to={LOGIN_PATH}
                  className="text-center text-sm font-medium uppercase tracking-[0.14em] text-white/70"
                >
                  Se connecter
                </Link>
              )}
              <Link
                to="/offres"
                className="rounded-full bg-terracotta-500 px-6 py-4 text-center text-sm font-semibold uppercase tracking-[0.1em] text-white"
              >
                Créer notre faire-part
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
