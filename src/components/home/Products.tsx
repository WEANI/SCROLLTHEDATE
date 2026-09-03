import { useRef } from 'react'
import { Link } from 'react-router'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { CalendarHeart, Check, Clapperboard, Infinity as InfinityIcon, MapPin, QrCode, Rss } from 'lucide-react'
import { cn } from '@/lib/utils'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const PRODUCTS = [
  {
    name: 'Save the Date digital',
    price: '149 €',
    tagline: 'Pour annoncer, des mois avant.',
    cta: '/commander?produit=save-the-date',
    recommended: false,
    features: [
      { icon: Clapperboard, label: 'Vidéo courte personnalisée (40 s)' },
      { icon: CalendarHeart, label: 'Votre page personnalisée' },
      { icon: CalendarHeart, label: "Page d'annonce avec date & lieu" },
      { icon: InfinityIcon, label: 'Lien illimité, partageable partout' },
      { icon: QrCode, label: 'QR code pour vos supports papier' },
    ],
  },
  {
    name: 'Faire-part digital',
    price: '349 €',
    tagline: 'Pour inviter, pour de vrai.',
    cta: '/commander?produit=faire-part',
    recommended: true,
    features: [
      { icon: Clapperboard, label: 'Vidéo cinématique complète (60 s)' },
      { icon: CalendarHeart, label: 'Votre page personnalisée + tableau de bord' },
      { icon: MapPin, label: 'Programme, lieu & hébergements, dress code' },
      { icon: Rss, label: 'RSVP intégré, réponses en temps réel' },
      { icon: InfinityIcon, label: 'Lien illimité + QR code' },
    ],
  },
]

/** Les deux produits — cards calmes sur fond anthracite-900. */
export default function Products() {
  const rootRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      gsap.fromTo(
        '.product-card',
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.15,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: { trigger: rootRef.current, start: 'top 75%' },
        },
      )
      gsap.fromTo(
        '.products-title',
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: { trigger: rootRef.current, start: 'top 80%' },
        },
      )
    },
    { scope: rootRef },
  )

  return (
    <section ref={rootRef} className="grain bg-anthracite-900 py-32 lg:py-44">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-12">
        <p className="products-title mb-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-300">
          Nos offres
        </p>
        <h2 className="products-title font-display max-w-3xl text-[clamp(2.4rem,5vw,4.5rem)] font-light leading-[1.05] tracking-[-0.015em] text-white">
          Deux façons de <em className="italic text-terracotta-300">surprendre</em>.
        </h2>

        <div className="mt-16 grid gap-8 lg:grid-cols-2">
          {PRODUCTS.map((product) => (
            <article
              key={product.name}
              className={cn(
                'product-card group relative flex flex-col overflow-hidden rounded-lg bg-anthracite-800 p-8 transition-transform duration-500 hover:-translate-y-1.5 lg:p-10',
              )}
            >
              {/* Liseré haut terracotta sur la recommandée */}
              <span
                aria-hidden
                className={cn(
                  'absolute inset-x-0 top-0 h-0.5 origin-left bg-terracotta-500 transition-transform duration-500',
                  product.recommended ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100',
                )}
              />
              {product.recommended && (
                // Bloc normal au-dessus du titre sur mobile (jamais de
                // chevauchement possible, quelle que soit la largeur du
                // titre) ; repasse en pastille flottante en haut à droite
                // à partir de lg, où la carte est assez large pour ça.
                <span className="animate-badge-pulse mb-4 inline-block self-start rounded-full bg-terracotta-500 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white lg:absolute lg:right-8 lg:top-8 lg:mb-0">
                  Le plus choisi
                </span>
              )}

              <h3 className="font-display text-3xl font-medium tracking-[-0.01em] text-white lg:text-4xl">
                {product.name}
              </h3>
              <p className="font-display tabular mt-4 text-5xl font-light text-terracotta-300">
                {product.price}
              </p>
              <p className="mt-3 text-sm font-medium text-white/60">{product.tagline}</p>

              <ul className="mt-8 flex flex-col gap-4">
                {product.features.map((feature) => (
                  <li key={feature.label} className="flex items-center gap-3 text-[15px] text-white/80">
                    <feature.icon size={18} strokeWidth={1.75} className="shrink-0 text-terracotta-500" />
                    {feature.label}
                  </li>
                ))}
              </ul>

              <p className="mt-8 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-white/50">
                <Check size={14} className="text-terracotta-500" />
                Prix unique — quel que soit le nombre d'invités
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-5">
                <Link
                  to={product.cta}
                  className="rounded-full bg-terracotta-500 px-7 py-3 text-[13px] font-semibold uppercase tracking-[0.1em] text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400 active:scale-[0.97]"
                >
                  Commander
                </Link>
                <Link
                  to="/demo"
                  className="group/link relative text-[13px] font-semibold uppercase tracking-[0.1em] text-white/80 transition-colors hover:text-white"
                >
                  Voir la démo
                  <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-terracotta-500 transition-transform duration-300 group-hover/link:scale-x-100" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
