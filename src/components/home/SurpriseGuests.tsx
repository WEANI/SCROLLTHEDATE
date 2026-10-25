import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/i18n/LanguageContext'

gsap.registerPlugin(ScrollTrigger, useGSAP)

/**
 * « Surprenez vos invités » (26/10/2026) — un enregistrement d'écran réel :
 * le lien reçu sur WhatsApp, la page qui s'ouvre, puis la vidéo qu'on fait
 * défiler. Diffusé dans un téléphone épinglé, image par image au rythme du
 * défilement (séquence 12 im/s dans public/surprenez-frames, barre d'état et
 * fin d'enregistrement retirées ; original dans « Modèles Save the Date/
 * sources-originales »).
 *
 * Sur ordinateur : texte et 3 étapes à gauche (l'étape en cours s'allume),
 * téléphone à droite. Sur mobile : titre en haut, téléphone le plus grand
 * possible dessous — pas d'étiquettes (un téléphone trop petit dans le
 * téléphone était illisible, cf. retour du 26/10/2026 sur « Nos offres »).
 */
const FRAMES = { baseUrl: '/surprenez-frames/', count: 311 }
const DURATION = 25.9
/** Étapes, en secondes d'enregistrement : lien reçu, page ouverte, défilement. */
const STEP_WINDOWS: [number, number][] = [
  [0, 3.4],
  [3.4, 5.5],
  [5.5, DURATION + 1],
]

export default function SurpriseGuests() {
  const { t } = useLanguage()
  const rootRef = useRef<HTMLElement>(null)

  const steps = [
    { title: t('home.surprise.step1Title'), text: t('home.surprise.step1Text') },
    { title: t('home.surprise.step2Title'), text: t('home.surprise.step2Text') },
    { title: t('home.surprise.step3Title'), text: t('home.surprise.step3Text') },
  ]

  useGSAP(
    () => {
      const root = rootRef.current
      if (!root) return
      const canvas = root.querySelector<HTMLCanvasElement>('canvas')
      const screen = canvas?.parentElement
      const ctx = canvas?.getContext('2d')
      if (!canvas || !screen || !ctx) return
      const stepEls = gsap.utils.toArray<HTMLElement>('[data-surprise-step]', root)
      const hint = root.querySelector<HTMLElement>('[data-surprise-hint]')

      // Images chargées seulement à l'approche de la section (10 Mo au total).
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
        stepEls.forEach((el, i) => {
          const [a, b] = STEP_WINDOWS[i]
          el.classList.toggle('is-on', time >= a && time < b)
          el.classList.toggle('is-done', time >= b)
        })
        if (hint) gsap.set(hint, { autoAlpha: 1 - Math.min(1, time / 1.5) })
      }

      window.addEventListener('resize', fit)
      ScrollTrigger.create({ trigger: root, start: 'top bottom+=1200', once: true, onEnter: load })

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        load()
        render(0.5)
        return () => window.removeEventListener('resize', fit)
      }

      render(0)
      ScrollTrigger.create({
        trigger: root,
        start: 'top top',
        end: () => (window.innerWidth < 1024 ? '+=320%' : '+=380%'),
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
    <section ref={rootRef} id="surprenez-vos-invites" aria-labelledby="surprise-title" className="relative h-[100svh] overflow-hidden bg-anthracite-900">
      <div className="mx-auto flex h-full max-w-[1200px] items-center gap-16 px-6 pt-20 max-lg:flex-col max-lg:justify-center max-lg:gap-5 max-lg:pt-[88px] lg:px-12">
        {/* Texte */}
        <div className="flex-1 max-lg:text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-300">{t('home.surprise.kicker')}</p>
          <h2 id="surprise-title" className="font-display mt-3 text-[clamp(2rem,4vw,3.6rem)] font-light leading-[1.05] text-white max-lg:text-[clamp(1.6rem,7vw,2.2rem)]">
            {t('home.surprise.title')}
          </h2>
          <p className="mt-5 max-w-md text-[15px] leading-[1.7] text-white/65 max-lg:hidden">{t('home.surprise.text')}</p>
          <ol className="mt-10 flex flex-col gap-6 max-lg:hidden">
            {steps.map((s, i) => (
              <li
                key={i}
                data-surprise-step
                className={cn(
                  'group flex gap-5 opacity-40 transition-opacity duration-500 [&.is-done]:opacity-60 [&.is-on]:opacity-100',
                )}
              >
                <span className="font-display flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/20 text-[17px] text-white/70 transition-colors duration-500 group-[.is-on]:border-terracotta-500 group-[.is-on]:bg-terracotta-500 group-[.is-on]:text-white">
                  {i + 1}
                </span>
                <span>
                  <span className="font-display block text-[22px] font-light leading-tight text-white">{s.title}</span>
                  <span className="mt-1 block text-[14px] leading-relaxed text-white/60">{s.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* Téléphone */}
        <div className="relative flex-none">
          <div className="relative w-[min(300px,calc((100svh-150px)*0.47))] rounded-[46px] bg-[#0d0d0f] p-[10px] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.85),inset_0_0_0_1.5px_rgba(255,255,255,0.08)] max-lg:w-[min(86vw,calc((100svh-215px)*0.47))]">
            <span aria-hidden className="absolute left-1/2 top-[16px] z-[5] h-[22px] w-[30%] -translate-x-1/2 rounded-xl bg-[#0d0d0f]" />
            <div className="relative aspect-[608/1264] w-full overflow-hidden rounded-[36px] bg-black pt-0">
              <canvas className="block h-full w-full" role="img" aria-label={t('home.surprise.videoAlt')} />
            </div>
          </div>
          <p data-surprise-hint className="absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] uppercase tracking-[0.18em] text-white/35 max-lg:hidden">
            {t('home.surprise.hint')}
          </p>
        </div>
      </div>
    </section>
  )
}
