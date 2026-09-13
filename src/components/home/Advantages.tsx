import { useRef, useSyncExternalStore } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { cn } from '@/lib/utils'

gsap.registerPlugin(ScrollTrigger, useGSAP)

/**
 * `mobileImage` optionnel — recadrage portrait (1080×1920, 9:16) dédié pour
 * chaque panneau, cf. échange du 12/09/2026 : les visuels desktop (2048×1152,
 * 16:9) sont affichés en `object-cover` plein écran (cf. JSX plus bas), donc
 * en portrait mobile l'essentiel de la largeur de la photo d'origine est
 * rogné. Tant qu'aucun visuel mobile n'est fourni pour un panneau, on
 * retombe simplement sur `image` (comportement identique à avant ce
 * changement — aucune régression tant que `mobileImage` n'est pas renseigné).
 */
const PANELS: {
  image: string
  mobileImage?: string
  title: string[]
  accentLast: boolean
  tagline: string
}[] = [
  {
    // Triptyque (13/09/2026) : les 3 tiers d'une seule photo panoramique
    // (2752×1536), découpée pour que le sujet (le voile) traverse
    // visuellement les 3 panneaux — sensation de continuité pendant le
    // glissement horizontal. `gallery-1.jpg`/`gallery-*-mobile.jpg`
    // (partagés avec Gallery.tsx plus bas) ne sont plus utilisés ici, mais
    // pas supprimés.
    //
    // `mobileImage` recadré à part (640×1536, ratio ~0,417) plutôt que de
    // réutiliser `image` (917×1536, ratio ~0,597) : ce 2e ratio est plus
    // large que celui de la plupart des écrans de téléphone, donc
    // `object-cover` rognait aussi la LARGEUR (pas seulement la hauteur)
    // pour remplir un viewport portrait — un rognage différent selon la
    // hauteur exacte de chaque appareil, qui cassait le raccord entre
    // panneaux (le voile ne se retrouvait plus à la bonne position d'un
    // panneau à l'autre). Un ratio plus étroit que n'importe quel écran de
    // téléphone courant garantit qu'`object-cover` ne rogne plus jamais la
    // largeur — seulement la hauteur, ce qui ne casse pas le raccord
    // horizontal.
    image: '/advantages-1.jpg',
    mobileImage: '/advantages-1-mobile.jpg',
    title: ['La', 'surprise'],
    accentLast: false,
    tagline: "Vos invités s'attendent à du papier. Ils reçoivent un film.",
  },
  {
    image: '/advantages-2.jpg',
    mobileImage: '/advantages-2-mobile.jpg',
    title: ["L'originalité"],
    accentLast: false,
    tagline: 'Votre histoire, votre ton, vos images. Rien de générique.',
  },
  {
    image: '/advantages-3.jpg',
    mobileImage: '/advantages-3-mobile.jpg',
    title: ["L'unique"],
    accentLast: true,
    tagline: 'Chaque faire-part est créé à la main, pour un seul couple : vous.',
  },
]

/** Avantages — 3 panneaux horizontaux pleine hauteur, section épinglée 250vh. */
// Même seuil que le reste du site (ScrubHero.tsx) — choisit `mobileImage`
// plutôt que `image` en dessous de 768px, quand un visuel dédié existe.
// `useSyncExternalStore` plutôt que useState+useEffect (pattern de
// ScrubHero.tsx) : la règle `react-hooks/set-state-in-effect` (nouvelle
// depuis la mise à jour vers eslint-plugin-react-hooks 7, dérivée du React
// Compiler) refuse le setState synchrone dans un effet — c'est justement
// l'outil prévu pour se synchroniser à une API navigateur externe.
function subscribeToMobileBreakpoint(onChange: () => void) {
  const mq = window.matchMedia('(max-width: 767px)')
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

function getIsMobileSnapshot() {
  return window.matchMedia('(max-width: 767px)').matches
}

export default function Advantages() {
  const rootRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const isMobile = useSyncExternalStore(subscribeToMobileBreakpoint, getIsMobileSnapshot, () => false)

  useGSAP(
    () => {
      const track = trackRef.current
      if (!track) return

      // Palier immobile (HOLD) par panneau + glissement horizontal
      // (TRANSITION) entre deux — cf. échange du 13/09/2026 : avant ce
      // correctif, le track glissait en continu sur toute la durée du
      // timeline (un seul tween linéaire de bout en bout), donc le texte
      // n'avait jamais de moment où l'image restait immobile pour le lire :
      // il commençait à apparaître alors que le panneau suivant était déjà
      // en train d'arriver. Ici, aucun tween n'anime `x` pendant la fenêtre
      // de hold d'un panneau (GSAP conserve simplement la valeur courante) —
      // le texte apparaît entièrement PENDANT ce palier, avant que la
      // transition vers le panneau suivant ne démarre.
      // Amplitude de la parallaxe interne — cf. échange du 13/09/2026 :
      // un décalage de ±40px (réglage desktop d'origine) dépasse largement
      // la marge de débord fournie par `scale-110` sur un écran mobile
      // étroit (ex. ~19px de marge de chaque côté pour un viewport à
      // 390px) — l'image se décale alors au-delà de son cadre et laisse
      // apparaître le fond derrière elle, visible comme une coupure noire
      // pile à la jonction entre panneaux (particulièrement gênant
      // maintenant que les 3 images forment un triptyque continu). Amplitude
      // réduite sur mobile pour rester largement sous cette marge.
      const PARALLAX = isMobile ? 12 : 40
      const HOLD = 1
      const TRANSITION = 0.5
      const holdStart = (i: number) => i * (HOLD + TRANSITION)
      const totalDuration = (PANELS.length - 1) * (HOLD + TRANSITION) + HOLD
      // Réglage d'origine : 250 % de scroll pour une durée totale de
      // `PANELS.length` (3) unités de timeline — conservé en ratio pour que
      // le nouveau total (paliers inclus, donc plus long) reçoive
      // proportionnellement plus de distance de scroll. Sans ça, le même
      // geste de scroll ferait défiler les paliers aussi vite qu'avant,
      // annulant le bénéfice du correctif.
      const PERCENT_PER_UNIT = 250 / PANELS.length

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: rootRef.current,
          start: 'top top',
          end: `+=${Math.round(totalDuration * PERCENT_PER_UNIT)}%`,
          pin: true,
          scrub: 1,
          // Cf. ScrubHero : force le recalcul des sections épinglées de haut
          // en bas (héros = 3, HowItWorks = 2, ici = 1).
          refreshPriority: 1,
        },
      })

      // Largeur RÉELLE d'un panneau (mesurée dans le DOM) plutôt que
      // `window.innerWidth` — cf. échange du 13/09/2026 : un fin trait
      // sombre restait visible à la jonction entre panneaux sur mobile
      // malgré une photo source parfaitement continue à cet endroit (vérifié
      // pixel à pixel). `100vw` (largeur CSS réelle des panneaux, via
      // `w-screen`) peut différer de quelques pixels de `window.innerWidth`
      // sur certains mobiles (barre d'adresse, scrollbar) — un écart minime
      // suffit à décaler le panneau suivant de quelques pixels par rapport à
      // son cadrage prévu, laissant entrevoir le bord de l'image adjacente.
      // Mesurer la largeur réellement rendue élimine cet écart à la source.
      const panelWidth = () => track.children[0]?.getBoundingClientRect().width ?? window.innerWidth

      for (let i = 0; i < PANELS.length - 1; i++) {
        tl.to(track, { x: () => -(i + 1) * panelWidth(), ease: 'none', duration: TRANSITION }, holdStart(i) + HOLD)
      }

      PANELS.forEach((_, i) => {
        // Reveal du texte au début du palier — jamais pendant une
        // transition — avec de la marge avant la fin du hold pour laisser
        // le texte pleinement lisible un instant avant que le panneau ne
        // reparte.
        const revealStart = holdStart(i) + 0.1
        tl.fromTo(
          `.panel-${i} .adv-char`,
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, stagger: 0.03, duration: 0.45, ease: 'power3.out' },
          revealStart,
        )
        tl.fromTo(
          `.panel-${i} .adv-tagline`,
          { y: 24, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' },
          revealStart + 0.15,
        )
        // Parallaxe interne de l'image — sur toute la fenêtre où le panneau
        // est à l'écran (son éventuelle transition d'entrée, son hold, son
        // éventuelle transition de sortie). Même sens pour les 3 panneaux
        // (cf. échange du 13/09/2026 — alterner gauche/droite d'un panneau à
        // l'autre donnait une impression décousue).
        const enterStart = i === 0 ? 0 : holdStart(i) - TRANSITION
        const exitEnd = i === PANELS.length - 1 ? holdStart(i) + HOLD : holdStart(i) + HOLD + TRANSITION
        tl.fromTo(
          `.panel-${i} .adv-img`,
          { x: PARALLAX },
          { x: -PARALLAX, ease: 'none', duration: exitEnd - enterStart },
          enterStart,
        )
      })
    },
    { scope: rootRef, dependencies: [isMobile] },
  )

  return (
    <section ref={rootRef} className="relative">
      <div style={{ height: '100dvh' }} className="overflow-hidden">
        <div ref={trackRef} className="flex h-full will-change-transform" style={{ width: `${PANELS.length * 100}vw` }}>
          {PANELS.map((panel, i) => (
            <article key={panel.tagline} className={cn(`panel-${i} relative h-full w-screen shrink-0 overflow-hidden`)}>
              <img
                src={isMobile && panel.mobileImage ? panel.mobileImage : panel.image}
                alt=""
                loading="lazy"
                className="adv-img absolute inset-0 h-full w-full scale-125 object-cover will-change-transform"
              />
              <div className="absolute inset-0 bg-anthracite-950/55" />
              <div className="grain relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
                <h2 className="font-display text-[clamp(3rem,8vw,7rem)] font-light leading-none tracking-[-0.02em] text-white [perspective:800px]">
                  {panel.title.map((word, wi) => (
                    <span key={wi} className="inline-block whitespace-pre">
                      {word.split('').map((char, ci) => (
                        <span
                          key={ci}
                          className={cn(
                            'adv-char inline-block will-change-transform',
                            panel.accentLast && wi === panel.title.length - 1 && 'italic text-terracotta-300',
                          )}
                        >
                          {char}
                        </span>
                      ))}
                      {wi < panel.title.length - 1 ? ' ' : ''}
                    </span>
                  ))}
                </h2>
                <p className="adv-tagline mt-8 max-w-lg text-[17px] leading-[1.65] text-white/85">
                  {panel.tagline}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
