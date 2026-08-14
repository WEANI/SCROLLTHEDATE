import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Sparkle } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Bandeau démo persistant — h 40px, terracotta-500, sous la navbar fixe.
 * Se replie (translateY −100 %) dès que le scroll dépasse ~100vh.
 */
export default function DemoBanner() {
  const [folded, setFolded] = useState(false)

  useEffect(() => {
    const onScroll = () => setFolded(window.scrollY > window.innerHeight)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      className={cn(
        'fixed inset-x-0 top-20 z-40 flex h-10 items-center justify-center gap-3 bg-terracotta-500 px-4 text-anthracite-950 transition-transform duration-300',
        folded && '-translate-y-[calc(100%+5rem)]',
      )}
      role="note"
    >
      <Sparkle size={13} aria-hidden className="shrink-0" />
      <p className="truncate text-[13px] font-medium tracking-[0.02em]">
        Ceci est un faire-part de démonstration
      </p>
      <Link
        to="/offres"
        className="shrink-0 rounded-full bg-white px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-anthracite-950 transition-transform hover:-translate-y-px active:scale-[0.97]"
      >
        Créer le vôtre
      </Link>
    </div>
  )
}
