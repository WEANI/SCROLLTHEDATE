import { useEffect } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import HeroScrub from '@/components/hero-scrub/HeroScrub'
import { useAuth } from '@/hooks/useAuth'
import { LOGIN_PATH } from '@/const'
import { getSaveTheDateTemplate } from '@contracts/saveTheDateTemplates'

/**
 * Page privée « 1025 » (26/10/2026) — la vidéo public/1025.mp4, découpée en
 * séquence d'images 12 im/s (public/1025-frames), lue au défilement comme un
 * modèle Save the Date, sans aucun texte par-dessus.
 *
 * Visible par les seuls administrateurs connectés (même garde que AdminShell),
 * en plein écran hors de la mise en page admin ; jamais indexée : sous /admin
 * (robots.txt) et balise noindex posée ici. Original non compressé :
 * « Modèles Save the Date/sources-originales/1025.mp4 ».
 */
const FRAMES = { baseUrl: '/1025-frames/', count: 381, fps: 12 }

export default function Apercu1025() {
  const { user, isLoading, isAuthenticated } = useAuth()
  const location = useLocation()

  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    const prevTitle = document.title
    document.title = 'Aperçu privé — 1025'
    return () => {
      meta.remove()
      document.title = prevTitle
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-anthracite-950">
        <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-terracotta-500" />
      </div>
    )
  }
  if (!isAuthenticated) return <Navigate to={LOGIN_PATH} state={{ from: location.pathname }} replace />
  if (user?.role !== 'admin') return <Navigate to="/" replace />

  // Thème sombre de Red Door : fond noir, accents rouges, assorti à la vidéo.
  const theme = getSaveTheDateTemplate('red-door')!.theme

  return (
    <div className="bg-anthracite-950">
      <div className="fixed left-4 top-4 z-50 flex items-center gap-3 rounded-full bg-black/60 px-4 py-2 text-[12px] text-white/80 backdrop-blur">
        <span className="h-2 w-2 rounded-full bg-terracotta-500" aria-hidden />
        Aperçu privé · 1025
        <Link to="/admin" className="font-semibold text-terracotta-300 hover:text-white">
          Admin
        </Link>
      </div>
      <HeroScrub
        theme={theme}
        chapters={[]}
        video={{ desktopSrc: '/1025.mp4', posterSrc: '/1025-frames/00001.jpg', frames: FRAMES }}
        trackHeightVh={800}
        tailVh={100}
        ariaLabel="Aperçu privé de la vidéo 1025"
      />
    </div>
  )
}
