import { useEffect } from 'react'
import { Link } from 'react-router'
import PayloadSection from '@/components/faire-part/PayloadSection'
import PhotosSection from '@/components/faire-part/PhotosSection'
import ClosingSection from '@/components/faire-part/ClosingSection'
import HeroScrub from '@/components/hero-scrub/HeroScrub'
import {
  CINEMA_ROUGE_THEME,
  CLOSING_THEME,
  HERO_CHAPTERS,
  OPENING_PHOTO,
  PAYLOAD_FIELDS,
  PAYLOAD_THEME,
  RSVP_CTA_LABEL,
  SLUG,
} from '@/components/faire-part/leaOlivierContent'

const COUPLE_NAMES = 'Léa & Olivier'

/**
 * Faire-part « Léa & Olivier » — page livrée depuis le pipeline
 * SCROLL THE DATE (cf. instructions-page-lea-olivier.md). Page client
 * réelle, pas une démo marketing : rendue hors du `Layout` public (pas de
 * Navbar/Footer commerciaux — cf. ClosingSection) avec un en-tête minimal,
 * à la façon de `/login`. `<meta color-scheme>` posé en direct (directive
 * non négociable du skill, anti-inversion dark mode mobile) — "only dark"
 * ici, contrairement à Edwige & Wilfried ("only light") : cf. instructions
 * §3, ce couple appelle un fond sombre (ambiance Cinéma, dress code
 * rouge/noir), pas la charte claire de Minimal.
 */
export default function FairePartLeaOlivier() {
  useEffect(() => {
    document.title = 'Léa & Olivier — 15 août 2026 · Scroll The Date'

    const meta = document.createElement('meta')
    meta.name = 'color-scheme'
    meta.content = 'only dark'
    document.head.appendChild(meta)

    return () => {
      document.title = 'Scroll The Date'
      document.head.removeChild(meta)
    }
  }, [])

  return (
    <div style={{ background: CINEMA_ROUGE_THEME.pageBg }}>
      {/* En-tête minimal — pas le Navbar marketing du site public. Pastille
          sombre translucide pour rester lisible quelle que soit l'image du
          scrub derrière (sceau de cire sombre comme tunnel de lumière). */}
      <header className="absolute inset-x-0 top-0 z-40 flex items-center justify-center px-6 py-5">
        <Link
          to="/"
          aria-label="Scroll The Date — accueil"
          className="rounded-full bg-black/25 px-4 py-2 backdrop-blur-sm"
        >
          <img src="/logo.svg" alt="Scroll The Date" className="h-6 w-auto brightness-0 invert" />
        </Link>
      </header>

      <HeroScrub
        theme={CINEMA_ROUGE_THEME}
        chapters={HERO_CHAPTERS}
        video={{
          desktopSrc: '/lea-olivier-hero.mp4',
          posterSrc: '/lea-olivier-hero-poster.jpg',
        }}
        trackHeightVh={1060}
        tailVh={100}
        ariaLabel="Faire-part — Léa & Olivier"
      />

      {/* Le corps de page recouvre le plan final au lieu de s'enchaîner en
          dessous — même mécanique que sur Edwige & Wilfried (cf. ce fichier
          pour l'explication complète) : `.hs-frame` reste épinglé en
          `position: sticky` tant que la piste de scrub (960vh) n'est pas
          épuisée, et ce bloc, tiré vers le haut via une marge négative,
          glisse depuis le bas pour refermer progressivement le cadre vidéo.
          -100vh (pas -20vh, cf. Edwige & Wilfried pour l'explication
          complète du calcul) : le recouvrement doit être COMPLET pile au
          moment où `.hs-frame` se libère de son épinglage — -20vh ne
          comblait que 20 % de la hauteur d'écran à ce moment-là, laissant
          un vrai trou visible. Ombre en noir pur (pas la teinte brune
          utilisée sur Edwige & Wilfried) : cohérente avec un fond déjà
          sombre. */}
      <div
        className="relative z-10 -mt-[100vh] rounded-t-[32px] shadow-[0_-24px_60px_rgba(0,0,0,0.5)]"
        style={{ background: PAYLOAD_THEME.sectionBg }}
      >
        {/* Photo d'ouverture — première chose vue après le film, avant les
            informations pratiques. Colonne centrée à largeur limitée plutôt
            qu'une image pleine largeur : cette photo est un PORTRAIT
            (1000x1768) — étalée sur toute la largeur d'un écran desktop,
            `object-cover` la rognait si violemment qu'il ne restait que les
            bustes, têtes coupées (constaté à l'écran). En colonne, le
            cadrage vertical d'origine est conservé intact, et l'ensemble
            fait écho à la colonne 9:16 du hero juste au-dessus. */}
        <section className="px-6 pt-16 sm:pt-20" aria-label="Photo du couple">
          <figure className="mx-auto max-w-[420px]">
            <img
              src={OPENING_PHOTO.src}
              alt={OPENING_PHOTO.alt}
              width={1000}
              height={1768}
              className="w-full rounded-[20px] object-cover shadow-[0_24px_60px_rgba(27,21,18,0.18)]"
              loading="lazy"
              decoding="async"
            />
          </figure>
        </section>

        <PayloadSection
          slug={SLUG}
          coupleNames={COUPLE_NAMES}
          fields={PAYLOAD_FIELDS}
          rsvpCtaLabel={RSVP_CTA_LABEL}
          theme={PAYLOAD_THEME}
        />
        <PhotosSection bg={PAYLOAD_THEME.sectionBg} />
        <ClosingSection coupleNames={COUPLE_NAMES} theme={CLOSING_THEME} />
      </div>
    </div>
  )
}
