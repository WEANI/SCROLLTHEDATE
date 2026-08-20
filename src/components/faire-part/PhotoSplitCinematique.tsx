import { useEffect, useRef, useState } from 'react'

/**
 * PhotoSplitCinematique — effet demandé pour la photo d'ouverture du corps
 * de page : la photo est coupée en deux au centre, la moitié gauche entre
 * depuis le bord gauche de l'écran, la moitié droite depuis le bord droit
 * (décalage sur la droite, cf. `halfStagger`), elles se rejoignent au
 * centre, puis un léger zoom (Ken Burns) se déclenche après la fusion, avec
 * une traînée de lumière qui balaie la jointure au moment où les deux
 * moitiés se touchent.
 *
 * Adapté du composant/démo fournis par le client (PhotoSplitCinematique.tsx
 * + photo-split-cinematique.html) — mécanique CSS conservée à l'identique
 * (les deux moitiés sont des `background-image` en `background-size: 200%
 * 100%`, pas des `<img>` recadrées : c'est ce qui permet à l'image de se
 * reconstituer pile à la jointure). Adaptations au reste du projet :
 *
 * - Déclenchement une seule fois au scroll via IntersectionObserver, comme
 *   la démo — mais respecte aussi `prefers-reduced-motion`, comme
 *   `HeroScrub` (cf. ce composant) : sur un utilisateur qui a demandé moins
 *   de mouvement, la photo apparaît directement assemblée, sans le split.
 * - `rounded`/`shadow`/`placeholderBg` sont des props (pas des classes
 *   Tailwind câblées en dur dans le composant) : cohérent avec le pattern
 *   `theme`/`bg` déjà utilisé par PayloadSection/PhotosSection sur ces
 *   pages, et ça évite un conflit de classes Tailwind (deux classes
 *   `rounded-*` sur le même élément, l'ordre de la cascade générée n'étant
 *   pas fiable) si un appelant veut un rendu différent.
 * - `halfDuration`/`halfStagger`/`zoomDelay` exposent le rythme du
 *   glissement — demandé après coup (Léa & Olivier voulaient un rendu plus
 *   lent et cinématique que le timing d'origine de la démo, 1300ms/120ms).
 *   Par défaut, tout le reste de la chorégraphie (zoomDelay, delay de la
 *   traînée de lumière côté Tailwind) est calé proportionnellement sur
 *   `halfDuration` — si vous rallongez encore le glissement, ajustez
 *   `zoomDelay` dans le même rapport (~0,28 × la durée totale de fusion,
 *   `halfStagger + halfDuration`) pour que le zoom démarre toujours vers la
 *   fin de la fusion, pas pendant qu'elle est encore visiblement en cours.
 *
 * IMPORTANT — `aspectRatio` doit correspondre au ratio RÉEL du fichier
 * photo : les moitiés sont stretchées exactement à la taille de leur boîte
 * (`background-size: 200% 100%`), pas recadrées en `object-fit: cover`. Un
 * ratio différent du fichier réel déforme visiblement l'image.
 */

type PhotoSplitCinematiqueProps = {
  src: string
  alt: string
  /** Ratio CSS largeur/hauteur du fichier photo réel, ex "1000 / 1768". */
  aspectRatio: string
  /** Fraction du bloc visible avant déclenchement (0 à 1). */
  threshold?: number
  /** Durée du glissement de chaque moitié, en ms. */
  halfDuration?: number
  /** Décalage de la moitié droite après la gauche, en ms. */
  halfStagger?: number
  /** Délai avant le zoom Ken Burns post-fusion, en ms. */
  zoomDelay?: number
  rounded?: string
  shadow?: string
  placeholderBg?: string
  className?: string
}

export default function PhotoSplitCinematique({
  src,
  alt,
  aspectRatio,
  threshold = 0.35,
  // Rythme "plus lent, plus cinématique" — la démo d'origine était à
  // 1300ms/120ms/400ms, jugée trop rapide sur cette page.
  halfDuration = 2000,
  halfStagger = 180,
  zoomDelay = 600,
  rounded = '20px',
  shadow = '0 24px 60px rgba(0, 0, 0, 0.45)',
  placeholderBg = '#080606',
  className = '',
}: PhotoSplitCinematiqueProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [revealed, setRevealed] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    // Mouvement réduit demandé : la photo apparaît directement assemblée,
    // pas de split à jouer — cf. HeroScrub pour le même principe côté hero.
    if (reducedMotion) {
      setRevealed(true)
      return
    }

    const el = ref.current
    if (!el || revealed) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setRevealed(true)
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [revealed, threshold, reducedMotion])

  return (
    <div
      ref={ref}
      role="img"
      aria-label={alt}
      className={`relative w-full overflow-hidden ${className}`}
      style={{ aspectRatio, borderRadius: rounded, background: placeholderBg, boxShadow: shadow }}
    >
      {/* conteneur interne : porte le zoom post-fusion, pas les moitiés
          (sinon la jointure se désaligne pendant le zoom) */}
      <div
        className="absolute inset-0 transition-transform duration-[2600ms] ease-out"
        style={{
          transitionDelay: reducedMotion ? '0ms' : `${zoomDelay}ms`,
          transform: revealed ? 'scale(1.06)' : 'scale(1)',
        }}
      >
        <div
          className="absolute left-0 top-0 h-full w-1/2 bg-no-repeat transition-transform ease-[cubic-bezier(0.19,1,0.22,1)]"
          style={{
            backgroundImage: `url(${src})`,
            backgroundSize: '200% 100%',
            backgroundPosition: 'left top',
            transitionDuration: reducedMotion ? '0ms' : `${halfDuration}ms`,
            transform: revealed ? 'translateX(0) scale(1)' : 'translateX(-115%) scale(1.04)',
          }}
        />
        <div
          className="absolute right-0 top-0 h-full w-1/2 bg-no-repeat transition-transform ease-[cubic-bezier(0.19,1,0.22,1)]"
          style={{
            backgroundImage: `url(${src})`,
            backgroundSize: '200% 100%',
            backgroundPosition: 'right top',
            // la droite suit la gauche de `halfStagger` ms
            transitionDelay: reducedMotion ? '0ms' : `${halfStagger}ms`,
            transitionDuration: reducedMotion ? '0ms' : `${halfDuration}ms`,
            transform: revealed ? 'translateX(0) scale(1)' : 'translateX(115%) scale(1.04)',
          }}
        />
      </div>

      {/* traînée de lumière sur la jointure au moment de la fusion —
          masquée d'entrée en mouvement réduit plutôt que jouée sans le
          split qui la justifie */}
      {!reducedMotion && (
        <div
          className={`pointer-events-none absolute left-1/2 top-0 h-full w-2/5 -translate-x-1/2 blur-[2px] ${
            revealed ? 'animate-light-leak' : 'opacity-0'
          }`}
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,220,210,0.55), transparent)',
          }}
        />
      )}
    </div>
  )
}
