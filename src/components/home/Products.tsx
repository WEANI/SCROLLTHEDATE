import { useRef } from 'react'
import { Link } from 'react-router'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { Check, Clapperboard, Infinity as InfinityIcon, CalendarHeart, Users, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PRODUCTS } from '@/components/home/productsCatalog'
import { formatEuros, getProduct, TEMPLATE_PRICE_CENTS, usePricing } from '@/components/commerce/pricing'
import { useLanguage } from '@/i18n/LanguageContext'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const seg = (p: number, a: number, b: number) => {
  const t = clamp01((p - a) / (b - a))
  return t * t * (3 - 2 * t)
}

/** Les trois offres (Save the Date sur modèle, sur mesure, Faire-part) — cards calmes sur fond anthracite-900. */
export default function Products() {
  const { t } = useLanguage()
  const { products } = usePricing()
  const rootRef = useRef<HTMLElement>(null)
  const stepsRef = useRef<HTMLDivElement>(null)

  // Texte traduit par produit, superposé à `PRODUCTS` (cf.
  // productsCatalog.ts — non touché ici : partagé avec FairePartDigital.tsx/
  // SaveTheDateDigital.tsx, hors périmètre de cette phase, cf. échange du
  // 22/09/2026). Seuls id/prix/cta/recommended/icônes viennent du catalogue ;
  // name/tagline/features[].label viennent d'ici, sélectionnés par `id`.
  const PRODUCT_TEXT: Record<string, { name: string; tagline: string; features: string[] }> = {
    SAVE_THE_DATE: {
      name: t('home.products.saveTheDate.name'),
      tagline: t('home.products.saveTheDate.tagline'),
      features: [
        t('home.products.saveTheDate.feature1'),
        t('home.products.saveTheDate.feature2'),
        t('home.products.saveTheDate.feature3'),
        t('home.products.saveTheDate.feature4'),
        t('home.products.saveTheDate.feature5'),
      ],
    },
    TEMPLATE: {
      name: t('home.products.template.name'),
      tagline: t('home.products.template.tagline'),
      features: [
        t('home.products.template.feature1'),
        t('home.products.template.feature2'),
        t('home.products.template.feature3'),
        t('home.products.template.feature4'),
        t('home.products.template.feature5'),
      ],
    },
    FAIRE_PART: {
      name: t('home.products.fairePart.name'),
      tagline: t('home.products.fairePart.tagline'),
      features: [
        t('home.products.fairePart.feature1'),
        t('home.products.fairePart.feature2'),
        t('home.products.fairePart.feature3'),
        t('home.products.fairePart.feature4'),
        t('home.products.fairePart.feature5'),
      ],
    },
  }

  // Prix réels (base de données) ; le catalogue partagé ne donne que des prix indicatifs.
  const CARDS = [
    {
      id: 'TEMPLATE' as const,
      price: formatEuros(TEMPLATE_PRICE_CENTS),
      cta: '/save-the-date-modeles',
      ctaLabel: t('home.products.ctaTemplate'),
      recommended: false,
      showDemo: false,
      features: [
        { icon: Clapperboard, label: 'modèle' },
        { icon: CalendarHeart, label: 'prénoms' },
        { icon: Zap, label: 'rapide' },
        { icon: InfinityIcon, label: 'lien' },
        { icon: Users, label: 'invités' },
      ],
    },
    ...PRODUCTS.map((product) => ({
      id: product.id,
      price: formatEuros(getProduct(products, product.id).priceCents),
      cta: product.cta,
      ctaLabel: t('home.products.ctaOrder'),
      recommended: product.recommended,
      showDemo: true,
      features: product.features,
    })),
  ]

  // « Fil rouge » (26/10/2026) : un fil terracotta se dessine au défilement et
  // serpente d'une offre à l'autre ; chaque carte s'éclaire quand il l'atteint,
  // puis le fil finit sur le point d'arrivée (prix unique + lien vers les offres).
  useGSAP(
    () => {
      const root = rootRef.current
      const wrap = stepsRef.current
      if (!root || !wrap) return
      const path = wrap.querySelector<SVGPathElement>('[data-thread]')
      const ghost = wrap.querySelector<SVGPathElement>('[data-thread-ghost]')
      const steps = gsap.utils.toArray<HTMLElement>('[data-offer-step]', wrap)
      const knots = steps.map((st) => st.querySelector<HTMLElement>('[data-offer-knot]'))
      const endEl = root.querySelector<HTMLElement>('[data-offer-end]')
      const endKnot = root.querySelector<HTMLElement>('[data-offer-end-knot]')
      if (!path || !ghost || !endEl || !endKnot || knots.some((k) => !k)) return

      gsap.fromTo(
        '.products-title',
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: root, start: 'top 80%' } },
      )

      let len = 1
      let marks: number[] = []
      const build = () => {
        const box = wrap.getBoundingClientRect()
        const centre = (el: HTMLElement): [number, number] => {
          const r = el.getBoundingClientRect()
          return [r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top]
        }
        const pts = [...knots.map((k) => centre(k as HTMLElement)), centre(endKnot)]
        const start: [number, number] = [window.innerWidth >= 1024 ? box.width / 2 : pts[0][0], -70]
        let d = `M ${start[0]} ${start[1]}`
        let prev = start
        for (const pt of pts) {
          const my = (prev[1] + pt[1]) / 2
          d += ` C ${prev[0]} ${my}, ${pt[0]} ${my}, ${pt[0]} ${pt[1]}`
          prev = pt
        }
        path.setAttribute('d', d)
        ghost.setAttribute('d', d)
        len = path.getTotalLength() || 1
        path.style.strokeDasharray = `${len}`
        // Part de la longueur du fil à laquelle il atteint chaque nœud.
        marks = pts.map(([x, y]) => {
          let best = 0
          let bestDist = Infinity
          for (let k = 0; k <= 200; k++) {
            const q = path.getPointAtLength((len * k) / 200)
            const dist = Math.hypot(q.x - x, q.y - y)
            if (dist < bestDist) {
              bestDist = dist
              best = k / 200
            }
          }
          return best
        })
      }
      const render = (p: number) => {
        path.style.strokeDashoffset = `${len * (1 - p)}`
        steps.forEach((st, i) => {
          const v = seg(p, marks[i] - 0.08, marks[i] + 0.02)
          gsap.set(st, { autoAlpha: 0.18 + 0.82 * v, y: (1 - v) * 30 })
        })
        const last = marks[marks.length - 1]
        const e = seg(p, last - 0.04, last)
        gsap.set(endEl, { autoAlpha: e, y: (1 - e) * 20 })
      }

      build()
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        render(1)
        return
      }
      render(0)
      ScrollTrigger.create({
        trigger: wrap,
        start: 'top 70%',
        endTrigger: endEl,
        end: 'top 65%',
        scrub: 0.5,
        invalidateOnRefresh: true,
        onRefresh: (st) => {
          build()
          render(st.progress)
        },
        onUpdate: (st) => render(st.progress),
      })
    },
    { scope: rootRef },
  )

  return (
    <section ref={rootRef} className="grain bg-anthracite-900 py-32 lg:py-44">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-12">
        <div className="text-center">
          <p className="products-title mb-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-300">
            {t('home.products.kicker')}
          </p>
          <h2 className="products-title font-display mx-auto max-w-3xl text-[clamp(2.4rem,5vw,4.5rem)] font-light leading-[1.05] tracking-[-0.015em] text-white">
            {t('home.products.titleLead')} <em className="italic text-terracotta-300">{t('home.products.titleEm')}</em>.
          </h2>
        </div>

        <div ref={stepsRef} className="relative mx-auto mt-28 flex max-w-[1100px] flex-col gap-20 max-lg:pl-9 lg:gap-24">
          <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
            <path data-thread-ghost fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={2} strokeDasharray="4 7" />
            <path data-thread fill="none" stroke="#C96F5A" strokeWidth={2} strokeLinecap="round" />
          </svg>
          {CARDS.map((product, i) => {
            const text = PRODUCT_TEXT[product.id]
            return (
             <div
              key={product.id}
              data-offer-step
              className={cn('relative lg:w-[min(560px,56%)]', i % 2 === 0 ? 'lg:self-start' : 'lg:self-end')}
             >
              <span
                aria-hidden
                data-offer-knot
                className={cn(
                  'absolute top-12 z-[2] h-3.5 w-3.5 rounded-full border-2 border-terracotta-500 bg-anthracite-900 max-lg:-left-[29px]',
                  i % 2 === 0 ? 'lg:-right-[37px]' : 'lg:-left-[37px]',
                )}
              />
              <article
                className="product-card group relative flex flex-col overflow-hidden rounded-lg border border-white/[0.06] bg-anthracite-800 p-8 transition-transform duration-500 hover:-translate-y-1.5 lg:p-10"
              >
                {/* Liseré haut terracotta sur la recommandée */}
                <span
                  aria-hidden
                  className={cn(
                    'absolute inset-x-0 top-0 h-0.5 origin-left bg-terracotta-500 transition-transform duration-500',
                    product.recommended ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100',
                  )}
                />
                {/* Ligne réservée au badge dans chaque carte : les trois titres restent alignés. */}
                <div className="mb-4 h-7">
                  {product.recommended && (
                    <span className="animate-badge-pulse inline-block rounded-full bg-terracotta-500 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
                      {t('home.products.badgeRecommended')}
                    </span>
                  )}
                </div>

                <h3 className="font-display text-2xl font-medium tracking-[-0.01em] text-white lg:text-3xl">
                  {text.name}
                </h3>
                <p className="font-display tabular mt-4 text-5xl font-light text-terracotta-300">
                  {product.price}
                </p>
                <p className="mt-3 text-sm font-medium text-white/60">{text.tagline}</p>

                <ul className="mt-8 flex flex-col gap-4">
                  {product.features.map((feature, i) => (
                    <li key={feature.label} className="flex items-center gap-3 text-[15px] text-white/80">
                      <feature.icon size={18} strokeWidth={1.75} className="shrink-0 text-terracotta-500" />
                      {text.features[i]}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto flex flex-wrap items-center gap-5 pt-9">
                  <Link
                    to={product.cta}
                    className="rounded-full bg-terracotta-500 px-7 py-3 text-[13px] font-semibold uppercase tracking-[0.1em] text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400 active:scale-[0.97]"
                  >
                    {product.ctaLabel}
                  </Link>
                  {product.showDemo && (
                    <Link
                      to="/demofairepart"
                      className="group/link relative text-[13px] font-semibold uppercase tracking-[0.1em] text-white/80 transition-colors hover:text-white"
                    >
                      {t('home.products.ctaDemo')}
                      <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-terracotta-500 transition-transform duration-300 group-hover/link:scale-x-100" />
                    </Link>
                  )}
                </div>
              </article>
             </div>
            )
          })}
        </div>

        {/* Point d'arrivée du fil */}
        <div data-offer-end className="relative mx-auto mt-24 flex max-w-xl flex-col items-center text-center">
          <span aria-hidden data-offer-end-knot className="h-4 w-4 rounded-full bg-terracotta-500 shadow-[0_0_0_7px_rgba(201,111,90,0.18)]" />
          <p className="mt-8 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-white/60">
            <Check size={14} className="text-terracotta-500" />
            {t('home.products.uniquePriceLine')}
          </p>
          <Link
            to="/offres"
            className="mt-7 inline-flex rounded-full border border-terracotta-500/60 px-8 py-3.5 text-[13px] font-semibold uppercase tracking-[0.1em] text-white transition-all hover:-translate-y-0.5 hover:border-terracotta-500 hover:bg-terracotta-500"
          >
            {t('home.products.ctaAll')}
          </Link>
        </div>
      </div>
    </section>
  )
}
