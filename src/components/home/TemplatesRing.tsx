import { useRef } from 'react'
import { Link } from 'react-router'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { useLanguage } from '@/i18n/LanguageContext'
import { formatEuros, TEMPLATE_PRICE_CENTS } from '@/components/commerce/pricing'
import { SAVE_THE_DATE_TEMPLATES } from '@contracts/saveTheDateTemplates'

gsap.registerPlugin(ScrollTrigger, useGSAP)

/**
 * Section « Nos modèles » de l'accueil (25/10/2026) — les modèles Save the Date
 * en « polaroïds » qui s'empilent, s'ouvrent en anneau autour du texte et
 * tournent, pilotés par le défilement pendant que la section reste épinglée.
 * Mécanique d'après l'étude du site oyin.design, réécrite pour Scroll The Date :
 *
 *   avant l'épinglage  : les cartes montent du bas de l'écran en une pile
 *   0   – 0,30         : la pile monte jusqu'au centre
 *   0,18 – 0,50        : la pile s'ouvre en anneau (ellipse vue en perspective)
 *   0,42 – 1           : l'anneau tourne d'un quart de tour
 *   0,78 – 0,95        : le texte et le bouton apparaissent au centre
 *   > 0,92             : les cartes réagissent au survol et sont cliquables
 *
 * Toutes les positions sont calculées ici (trigonométrie) à chaque image, puis
 * posées par GSAP. `prefers-reduced-motion` : état final directement, sans
 * épinglage.
 */

/** Image de couverture de chaque modèle (une image de la séquence, choisie pour sa lisibilité en petit). */
const COVERS: Record<string, string> = {
  'red-door': '/red-door-frames/00030.jpg',
  'parchemin-rose': '/parchemin-rose-frames/00154.jpg',
  'black-and-white': '/black-and-white-frames/00139.jpg',
  'the-ring': '/the-ring-frames/00151.jpg',
  'allee-des-roses': '/allee-des-roses-frames/00475.jpg',
  'parchemin-blanc': '/parchemin-blanc-frames/00188.jpg',
  'reception-room': '/reception-room-frames/00070.jpg',
}
/** Ordre autour de l'anneau : on alterne les ambiances (sombre / claire) pour que deux voisines se ressemblent peu. */
const ORDER = ['red-door', 'parchemin-rose', 'black-and-white', 'the-ring', 'allee-des-roses', 'parchemin-blanc', 'reception-room']
/** Inclinaison de chaque carte : [dans la pile, dans l'anneau] en degrés. */
const TILTS: [number, number][] = [
  [-5, -2],
  [4, 2],
  [-2, 1],
  [6, -2],
  [-4, 2],
  [3, -1],
  [-1, 2],
]

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const smooth = (v: number) => v * v * (3 - 2 * v)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const seg = (p: number, a: number, b: number) => smooth(clamp01((p - a) / (b - a)))

export default function TemplatesRing() {
  const { t } = useLanguage()
  const rootRef = useRef<HTMLElement>(null)

  const cards = ORDER.map((slug) => SAVE_THE_DATE_TEMPLATES.find((tpl) => tpl.slug === slug)).filter(
    (tpl): tpl is NonNullable<typeof tpl> => !!tpl,
  )

  useGSAP(
    () => {
      const root = rootRef.current
      if (!root) return
      const els = gsap.utils.toArray<HTMLElement>('[data-ring-card]', root)
      const copy = root.querySelector<HTMLElement>('[data-ring-copy]')
      if (!copy || els.length === 0) return
      const N = els.length
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      const state = { peel: 0, p: 0 }
      const hover = els.map(() => ({ v: 0 }))
      let active = -1
      const mouse = { x: 0, y: 0, tx: 0, ty: 0 }

      const render = () => {
        const { peel, p } = state
        const W = window.innerWidth
        const H = window.innerHeight
        const mobile = W < 768
        const cw = els[0].offsetWidth

        const v = seg(p, 0, 0.3) // la pile monte
        const b = seg(p, mobile ? 0.15 : 0.18, mobile ? 0.45 : 0.5) // l'anneau s'ouvre
        const x = seg(p, mobile ? 0.3 : 0.42, 1) // l'anneau tourne

        // Centre de l'anneau : sous la barre de navigation ; sur mobile, plus bas pour laisser le texte en haut.
        const cx = W / 2
        const cy = mobile ? H * 0.665 : H / 2 + 28
        const rx = mobile ? Math.max(40, (W - cw) / 2 - 8) : Math.min(W * 0.36, 540)
        const ry = mobile ? H * 0.2 : Math.min(H * 0.3, 280)

        els.forEach((el, i) => {
          const rise = seg(peel, i * 0.045, i * 0.045 + 0.6)
          const angle = (i / N) * Math.PI * 2 - Math.PI / 2 + x * (Math.PI / 2)
          const d = Math.sin(angle) // > 0 : devant, < 0 : au fond
          const pileX = ((i % 3) - 1) * 9 * (1 - b)
          const pileY = -i * 3 * (1 - b)
          const lift = (1 - v) * H * 0.16 // la pile attend plus bas, puis monte
          // Centre voulu de la carte ; les cartes sont ancrées au milieu de la section (left/top 50 %).
          const X = cx + Math.cos(angle) * rx * b + pileX
          const Y = cy + Math.sin(angle) * ry * b + pileY + lift + (1 - rise) * H * 0.55

          const hv = hover[i].v
          const other = active >= 0 && active !== i ? 1 : 0
          const depthScale = 1 + 0.17 * d * b
          const scale = lerp(0.86, 1, b) * depthScale * (1 + 0.12 * hv) * lerp(0.7, 1, rise)
          const rotate = lerp(TILTS[i][0], TILTS[i][1], b) * (1 - hv)
          const alpha =
            rise * (1 - 0.35 * (1 - (d + 1) / 2) * b) * (1 - 0.45 * other * seg(p, 0.9, 1))

          gsap.set(el, {
            x: X - W / 2,
            y: Y - H / 2,
            rotation: rotate,
            scale,
            rotationX: -mouse.y * 5 * b,
            rotationY: mouse.x * 7 * b,
            transformPerspective: 900,
            autoAlpha: alpha,
            zIndex: hv > 0.01 ? 1000 : 100 + Math.round((d + 1) * 40 * b) + (b < 0.5 ? N - i : 0),
          })
        })

        const c = seg(p, 0.78, 0.95)
        gsap.set(copy, { autoAlpha: c, y: (1 - c) * 22 })
        root.classList.toggle('is-ready', p > 0.92)
      }

      els.forEach((el, i) => {
        el.addEventListener('pointerenter', () => {
          if (state.p < 0.92) return
          active = i
          gsap.to(hover[i], { v: 1, duration: 0.45, ease: 'power3.out', onUpdate: render })
        })
        el.addEventListener('pointerleave', () => {
          if (active === i) active = -1
          gsap.to(hover[i], { v: 0, duration: 0.4, ease: 'power3.out', onUpdate: render })
        })
      })

      if (reduced) {
        state.peel = 1
        state.p = 1
        render()
        return
      }

      render()
      gsap.to(state, {
        peel: 1,
        ease: 'none',
        onUpdate: render,
        scrollTrigger: { trigger: root, start: 'top 85%', end: 'top top', scrub: 1, invalidateOnRefresh: true },
      })
      gsap.to(state, {
        p: 1,
        ease: 'none',
        onUpdate: render,
        scrollTrigger: {
          trigger: root,
          start: 'top top',
          end: () => (window.innerWidth < 768 ? '+=190%' : '+=260%'),
          pin: true,
          anticipatePin: 1,
          scrub: 1,
          invalidateOnRefresh: true,
          onRefresh: render,
        },
      })

      // Léger suivi du pointeur (ordinateur uniquement) : toute la scène s'incline vers la souris.
      const onMove = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse') return
        mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2
        mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2
      }
      const tick = () => {
        const dx = mouse.tx - mouse.x
        const dy = mouse.ty - mouse.y
        if (Math.abs(dx) + Math.abs(dy) < 0.001) return
        mouse.x += dx * 0.06
        mouse.y += dy * 0.06
        if (state.p > 0.15) render()
      }
      window.addEventListener('pointermove', onMove, { passive: true })
      gsap.ticker.add(tick)
      return () => {
        window.removeEventListener('pointermove', onMove)
        gsap.ticker.remove(tick)
      }
    },
    { scope: rootRef },
  )

  return (
    <section
      ref={rootRef}
      id="modeles"
      aria-labelledby="ring-title"
      className="grain group/ring relative h-[100svh] overflow-hidden bg-anthracite-900"
    >
      {/* Lignes de repère, très discrètes */}
      <div aria-hidden className="pointer-events-none absolute inset-0 flex justify-evenly">
        <span className="w-0 border-l border-dashed border-white/[0.06]" />
        <span className="w-0 border-l border-dashed border-white/[0.06]" />
        <span className="w-0 border-l border-dashed border-white/[0.06]" />
      </div>

      <ul className="pointer-events-none absolute inset-0 m-0 list-none p-0 [&>li]:pointer-events-none group-[.is-ready]/ring:[&>li]:pointer-events-auto">
        {cards.map((tpl) => (
          <li
            key={tpl.slug}
            data-ring-card
            className="invisible absolute left-1/2 top-1/2 will-change-transform [--card:clamp(100px,min(13vw,18vh),200px)] max-md:[--card:clamp(90px,26vw,140px)]"
            style={{ width: 'var(--card)', marginLeft: 'calc(var(--card) / -2)', marginTop: 'calc(var(--card) / -2 * 1.22)' }}
          >
            <Link
              to={`/save-the-date-modeles/${tpl.slug}`}
              aria-label={tpl.name}
              className="block rounded-[3px] bg-[#F4ECDD] p-[7%] pb-0 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.7)] outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-terracotta-300"
              style={{ aspectRatio: '0.82' }}
            >
              <span className="block aspect-[4/5] w-full overflow-hidden bg-anthracite-800">
                <img
                  src={COVERS[tpl.slug] ?? tpl.posterSrc}
                  alt=""
                  loading="lazy"
                  draggable={false}
                  className="h-full w-full object-cover"
                />
              </span>
              <span className="flex h-[17%] items-center justify-center text-[#2A2522]">
                <span className="font-display truncate text-[clamp(10px,1.05vw,14px)] italic">{tpl.name}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {/* Texte au centre de l'anneau (en haut sur téléphone) */}
      <div className="pointer-events-none absolute left-1/2 top-[11%] z-[2000] w-[min(26rem,calc(100%-48px))] -translate-x-1/2 md:top-[calc(50%+28px)] md:-translate-y-1/2">
        <div data-ring-copy className="invisible text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-terracotta-300">{t('home.templatesRing.kicker')}</p>
          <h2 id="ring-title" className="font-display mt-3 text-[clamp(1.7rem,3vw,2.5rem)] font-light italic leading-[1.05] text-white">
            {t('home.templatesRing.title')}
          </h2>
          <p className="mx-auto mt-3 max-w-[19rem] text-[14px] leading-relaxed text-white/65">
            {t('home.templatesRing.text')} {formatEuros(TEMPLATE_PRICE_CENTS)}.
          </p>
          <Link
            to="/save-the-date-modeles"
            className="pointer-events-auto mt-5 inline-flex rounded-full bg-terracotta-500 px-8 py-3.5 text-[13px] font-semibold uppercase tracking-[0.1em] text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400 active:scale-[0.97]"
          >
            {t('home.templatesRing.cta')}
          </Link>
        </div>
      </div>
    </section>
  )
}
