import { memo, useEffect, useRef } from 'react'
import { Outlet } from 'react-router'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CookieNotice from '@/components/CookieNotice'

gsap.registerPlugin(ScrollTrigger)

/** Lenis sur tout le site public (lerp 0.09), synchronisé avec ScrollTrigger. */
function useSmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const lenis = new Lenis({ lerp: 0.09 })
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
    }
  }, [])
}

/** Curseur custom : dot terracotta 8px + anneau 32px (mix-blend-difference). */
const Cursor = memo(function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const dot = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    dot.style.opacity = '1'
    ring.style.opacity = '1'
    const pos = { x: -100, y: -100 }
    const ringPos = { x: -100, y: -100 }
    let hovering = false
    let raf = 0

    const onMove = (e: MouseEvent) => {
      pos.x = e.clientX
      pos.y = e.clientY
    }
    const onOver = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null
      hovering = !!t?.closest('a, button, [data-cursor]')
    }
    const loop = () => {
      ringPos.x += (pos.x - ringPos.x) * 0.16
      ringPos.y += (pos.y - ringPos.y) * 0.16
      dot.style.transform = `translate(${pos.x - 4}px, ${pos.y - 4}px)`
      const s = hovering ? 1.6 : 1
      ring.style.transform = `translate(${ringPos.x - 16}px, ${ringPos.y - 16}px) scale(${s})`
      raf = requestAnimationFrame(loop)
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('mouseover', onOver, { passive: true })
    raf = requestAnimationFrame(loop)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseover', onOver)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <>
      <div
        ref={dotRef}
        aria-hidden
        style={{ position: 'fixed', top: 0, left: 0, zIndex: 100, opacity: 0 }}
        className="pointer-events-none h-2 w-2 rounded-full bg-terracotta-500 mix-blend-difference"
      />
      <div
        ref={ringRef}
        aria-hidden
        style={{ position: 'fixed', top: 0, left: 0, zIndex: 100, opacity: 0 }}
        className="pointer-events-none h-8 w-8 rounded-full border border-terracotta-300/70 mix-blend-difference transition-[border-color] duration-300"
      />
    </>
  )
})

/**
 * Layout public (Navbar + Footer) — pattern nested-route (<Outlet/>).
 * La Navbar est `fixed` (overlay sur héros) : le slot de contenu porte donc
 * le padding top correspondant (h-20 → pt-20). Les héros plein écran
 * sortent du flux via une marge négative `-mt-20` dans la page.
 * Ne PAS envelopper les routes /espace/* et /admin/* (shells dédiés).
 */
export default function Layout() {
  useSmoothScroll()

  return (
    <div className="min-h-[100dvh] bg-anthracite-950 font-sans text-white">
      <Cursor />
      <Navbar />
      <main className="pt-20">
        <Outlet />
      </main>
      <Footer />
      <CookieNotice />
    </div>
  )
}
