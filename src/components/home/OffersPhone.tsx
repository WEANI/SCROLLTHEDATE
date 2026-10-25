import { useRef } from 'react'
import { Link } from 'react-router'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { useLanguage } from '@/i18n/LanguageContext'
import { formatEuros, getProduct, TEMPLATE_PRICE_CENTS, usePricing } from '@/components/commerce/pricing'

gsap.registerPlugin(ScrollTrigger, useGSAP)

/**
 * Ouverture de la section « Nos offres » (26/10/2026) : un téléphone épinglé
 * diffuse la vidéo de présentation des offres (enveloppe terracotta qui s'ouvre,
 * puis les trois offres), image par image au rythme du défilement — comme le
 * haut de page. Des étiquettes reprennent chaque offre à côté du téléphone.
 *
 * Source : « Videos marketing/offres-enveloppe » (composition HTML rendue en
 * 25 s, 9:16) ; séquence 12 im/s dans public/nos-offres-frames. ⚠️ Les prix
 * sont inscrits DANS la vidéo (99 / 149 / 299 €) : si un prix change dans
 * l'admin, il faut aussi re-rendre la vidéo (les étiquettes, elles, suivent).
 */
const FRAMES = { baseUrl: '/nos-offres-frames/', count: 300 }
const DURATION = 25
/** Fenêtres des étiquettes, en secondes de vidéo (alignées sur ses scènes). */
const LABEL_WINDOWS: [number, number][] = [
  [6.5, 10.6],
  [10.6, 14.8],
  [14.8, 19.4],
  [19.4, 22.4],
]

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const seg = (p: number, a: number, b: number) => {
  const t = clamp01((p - a) / (b - a))
  return t * t * (3 - 2 * t)
}

export default function OffersPhone() {
  const { t } = useLanguage()
  const { products } = usePricing()
  const rootRef = useRef<HTMLElement>(null)

  const labels = [
    { side: 'left', title: t('home.offersPhone.l1Title'), price: formatEuros(TEMPLATE_PRICE_CENTS), text: t('home.offersPhone.l1Text') },
    { side: 'right', title: t('home.offersPhone.l2Title'), price: formatEuros(getProduct(products, 'SAVE_THE_DATE').priceCents), text: t('home.offersPhone.l2Text') },
    { side: 'left', title: t('home.offersPhone.l3Title'), price: formatEuros(getProduct(products, 'FAIRE_PART').priceCents), text: t('home.offersPhone.l3Text') },
    { side: 'right', title: t('home.offersPhone.l4Title'), price: '', text: t('home.offersPhone.l4Text') },
  ]

  useGSAP(
    () => {
      const root = rootRef.current
      if (!root) return
      const canvas = root.querySelector<HTMLCanvasElement>('canvas')
      const screen = canvas?.parentElement
      const ctx = canvas?.getContext('2d')
      if (!canvas || !screen || !ctx) return
      const labelEls = gsap.utils.toArray<HTMLElement>('[data-offer-label]', root)
      const cta = root.querySelector<HTMLElement>('[data-offer-cta]')
      const hint = root.querySelector<HTMLElement>('[data-offer-hint]')

      // Images chargées seulement à l'approche de la section (7 Mo au total).
      const imgs: HTMLImageElement[] = []
      let cur = 0
      let last = -1
      const draw = (idx: number) => {
        let k = Math.min(idx, imgs.length - 1)
        while (k > 0 && !(imgs[k]?.complete && imgs[k].naturalWidth)) k--
        const im = imgs[k]
        if (!im || !im.complete || !im.naturalWidth || k === last) return
        last = k
        const s = Math.max(canvas.width / im.naturalWidth, canvas.height / im.naturalHeight)
        const w = im.naturalWidth * s
        const h = im.naturalHeight * s
        ctx.drawImage(im, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h)
      }
      const fit = () => {
        const dpr = Math.min(2, window.devicePixelRatio || 1)
        canvas.width = Math.round(screen.clientWidth * dpr)
        canvas.height = Math.round(screen.clientHeight * dpr)
        last = -1
        draw(cur)
      }
      const load = () => {
        if (imgs.length) return
        for (let i = 1; i <= FRAMES.count; i++) {
          const im = new Image()
          im.decoding = 'async'
          im.src = `${FRAMES.baseUrl}${String(i).padStart(5, '0')}.jpg`
          if (i === 1) im.onload = fit
          imgs.push(im)
        }
      }

      const render = (p: number) => {
        const time = p * DURATION
        cur = Math.min(FRAMES.count - 1, Math.round(p * (FRAMES.count - 1)))
        draw(cur)
        labelEls.forEach((el, i) => {
          const [a, b] = LABEL_WINDOWS[i]
          const v = seg(time, a + 0.2, a + 0.9) * (1 - seg(time, b - 0.6, b))
          gsap.set(el, { autoAlpha: v, y: (1 - v) * 14 })
        })
        if (cta) gsap.set(cta, { autoAlpha: seg(time, 22.6, 24.2) })
        if (hint) gsap.set(hint, { autoAlpha: 1 - seg(time, 0.2, 1.5) })
      }

      window.addEventListener('resize', fit)
      ScrollTrigger.create({ trigger: root, start: 'top bottom+=1200', once: true, onEnter: load })

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        load()
        render(1)
        return () => window.removeEventListener('resize', fit)
      }

      render(0)
      ScrollTrigger.create({
        trigger: root,
        start: 'top top',
        end: () => (window.innerWidth < 820 ? '+=380%' : '+=450%'),
        pin: true,
        anticipatePin: 1,
        scrub: 0.5,
        invalidateOnRefresh: true,
        onUpdate: (st) => render(st.progress),
      })
      return () => window.removeEventListener('resize', fit)
    },
    { scope: rootRef },
  )

  return (
    <section ref={rootRef} id="offres" aria-labelledby="offers-title" className="relative h-[100svh] overflow-hidden bg-anthracite-900">
      <div className="pointer-events-none absolute inset-x-0 top-[96px] px-6 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-300">{t('home.offersPhone.kicker')}</p>
        <h2 id="offers-title" className="font-display mt-3 text-[clamp(2rem,3.6vw,3rem)] font-light leading-[1.05] text-white">
          {t('home.offersPhone.titleLead')} <em className="italic text-terracotta-300">{t('home.offersPhone.titleEm')}</em>.
        </h2>
      </div>

      {labels.map((l, i) => (
        <div
          key={i}
          className={
            'absolute max-[819px]:bottom-[4.5%] max-[819px]:left-1/2 max-[819px]:w-[86vw] max-[819px]:-translate-x-1/2 min-[820px]:w-60 ' +
            (l.side === 'left' ? 'min-[820px]:right-[calc(50%+190px)]' : 'min-[820px]:left-[calc(50%+190px)]') +
            ' ' +
            ['min-[820px]:top-[44%]', 'min-[820px]:top-[52%]', 'min-[820px]:top-[44%]', 'min-[820px]:top-[58%]'][i]
          }
        >
         <div
          data-offer-label
          className={
            'invisible flex items-center gap-3.5 max-[819px]:flex-col max-[819px]:gap-1 max-[819px]:text-center ' +
            (l.side === 'left' ? 'min-[820px]:flex-row-reverse min-[820px]:text-right' : '')
          }
         >
          <span aria-hidden className="h-2.5 w-2.5 flex-none rounded-full bg-terracotta-500 shadow-[0_0_0_6px_rgba(201,111,90,0.18)] max-[819px]:hidden" />
          <p>
            <span className="font-display block text-[24px] font-light italic leading-tight text-white">{l.title}</span>
            {l.price && <span className="font-display mt-1 block text-[34px] font-light leading-none text-terracotta-300 max-[819px]:text-[26px]">{l.price}</span>}
            <span className="mt-1.5 block text-[12.5px] leading-relaxed text-white/60">{l.text}</span>
          </p>
         </div>
        </div>
      ))}

      <div className="absolute left-1/2 top-[calc(50%+70px)] -translate-x-1/2 -translate-y-1/2 max-[819px]:top-[calc(50%+24px)]">
        <div className="relative aspect-[9/19.2] w-[min(290px,60vw,calc((100svh-290px)*9/19.2))] rounded-[44px] bg-[#0d0d0f] p-[11px] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.85),inset_0_0_0_1.5px_rgba(255,255,255,0.08)] max-[819px]:w-[min(230px,56vw,calc((100svh-300px)*9/19.2))]">
          <span aria-hidden className="absolute left-1/2 top-[18px] z-[5] h-[22px] w-[84px] -translate-x-1/2 rounded-xl bg-[#0d0d0f]" />
          <div className="relative h-full w-full overflow-hidden rounded-[34px] bg-[#FBF6EE]">
            <canvas className="block h-full w-full" role="img" aria-label={t('home.offersPhone.videoAlt')} />
          </div>
        </div>
      </div>

      <div data-offer-cta className="invisible absolute left-[calc(50%+190px)] top-[calc(50%+30px)] max-[819px]:bottom-[4%] max-[819px]:left-1/2 max-[819px]:top-auto max-[819px]:-translate-x-1/2">
        <Link
          to="/offres"
          className="inline-flex whitespace-nowrap rounded-full bg-terracotta-500 px-7 py-3.5 text-[13px] font-semibold uppercase tracking-[0.1em] text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400"
        >
          {t('home.offersPhone.cta')}
        </Link>
      </div>
      <p data-offer-hint className="absolute bottom-[4%] left-1/2 -translate-x-1/2 text-[11px] uppercase tracking-[0.18em] text-white/35">
        {t('home.offersPhone.hint')}
      </p>
    </section>
  )
}
