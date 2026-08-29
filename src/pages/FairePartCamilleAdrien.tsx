import { useEffect } from 'react'
import { Link } from 'react-router'
import PayloadSection from '@/components/faire-part/PayloadSection'
import PhotosSection from '@/components/faire-part/PhotosSection'
import ClosingSection from '@/components/faire-part/ClosingSection'
import PhotoSplitCinematique from '@/components/faire-part/PhotoSplitCinematique'
import DetailsSombre from '@/components/faire-part/DetailsSombre'
import HeroScrub from '@/components/hero-scrub/HeroScrub'
import {
  BespokePaletteProvider,
  DressCodeCard,
  EwEffectsStyles,
  FoireAuxQuestions,
  HorizontalProgramme,
  LieuMagnifier,
  LodgingCascadeCard,
  NotreHistoire,
  ScatterDateCard,
  WaxSealRsvp,
} from '@/components/faire-part/edwigeWilfriedEffects'
import {
  BRETON_MARINE_THEME,
  CA_DRESS_CODE_COLORS,
  CA_FAQ_ITEMS,
  CA_HISTOIRE_KEYWORDS,
  CA_HISTOIRE_TEXT,
  CA_PALETTE,
  CLOSING_THEME,
  COUPLE_INITIALS,
  DRESS_CODE,
  GALLERY_PHOTOS,
  HERO_CHAPTERS,
  LODGING_OPTIONS,
  OPENING_PHOTO,
  OPENING_PHOTO_ASPECT_RATIO,
  PAYLOAD_THEME,
  PROGRAMME,
  RSVP_CTA_LABEL,
  RSVP_THEME,
  SLUG,
  VENUE_ADDRESS,
  VENUE_NAME,
  WEDDING_DATE_LABEL,
  WEDDING_DATETIME,
} from '@/components/faire-part/camilleAdrienContent'

const COUPLE_NAMES = 'Camille & Adrien'

/**
 * Faire-part « Camille & Adrien » — page livrée depuis le pipeline
 * SCROLL THE DATE (cf. instructions-page-camille-adrien.md), sur
 * l'architecture bespoke partagée (cf. TEMPLATE-FAIRE-PART.md) — dupliquée
 * depuis FairePartLeaOlivier.tsx (thème sombre, plus proche de ce couple
 * qu'Edwige & Wilfried) puis adaptée : palette bleu marine/cuivre
 * (camilleAdrienContent.ts), photo d'ouverture + galerie (2 photos) reçues
 * après coup — la galerie vit dans « Notre histoire » (texte provisoire,
 * cf. camilleAdrienContent.ts), demandé explicitement à cet endroit plutôt
 * que dans une grille séparée. Page client réelle, pas une démo
 * marketing : rendue hors du `Layout`
 * public (pas de Navbar/Footer commerciaux) avec un en-tête minimal, à la
 * façon de `/login`. `<meta color-scheme>` "only dark" — fond sombre
 * explicitement demandé par le couple (instructions §3).
 */
export default function FairePartCamilleAdrien() {
  useEffect(() => {
    document.title = `${COUPLE_NAMES} — ${WEDDING_DATE_LABEL} · Scroll The Date`

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
    <BespokePaletteProvider palette={CA_PALETTE}>
      <div style={{ background: BRETON_MARINE_THEME.pageBg }}>
        <EwEffectsStyles />
        {/* En-tête minimal — pas le Navbar marketing du site public. Pastille
            sombre translucide pour rester lisible quelle que soit l'image du
            scrub derrière (enveloppe claire comme tunnel de lumière). */}
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
          theme={BRETON_MARINE_THEME}
          chapters={HERO_CHAPTERS}
          video={{
            desktopSrc: '/camille-adrien-hero.mp4',
            posterSrc: '/camille-adrien-hero-poster.jpg',
          }}
          trackHeightVh={1090}
          tailVh={100}
          ariaLabel="Faire-part — Camille & Adrien"
        />

        {/* Le corps de page recouvre le plan final au lieu de s'enchaîner en
            dessous — même mécanique que Léa & Olivier / Edwige & Wilfried
            (cf. ces fichiers pour l'explication complète du calcul
            -mt-[100vh]/tailVh). Ombre en noir pur, cohérente avec un fond
            déjà sombre. */}
        <div
          className="relative z-10 -mt-[100vh] rounded-t-[32px] shadow-[0_-24px_60px_rgba(0,0,0,0.5)]"
          style={{ background: BRETON_MARINE_THEME.pageBg }}
        >
          {/* Photo d'ouverture — reçue après coup (cf. camilleAdrienContent.ts).
              Même traitement que Léa & Olivier : colonne centrée à largeur
              limitée (photo PORTRAIT, pas plein-large) pour conserver son
              cadrage d'origine et faire écho à la colonne 9:16 du hero
              juste au-dessus. */}
          <section className="px-6 pt-16 sm:pt-20" aria-label="Photo du couple">
            <figure className="mx-auto max-w-[420px]">
              <PhotoSplitCinematique
                src={OPENING_PHOTO.src}
                alt={OPENING_PHOTO.alt}
                aspectRatio={OPENING_PHOTO_ASPECT_RATIO}
              />
            </figure>
          </section>

          <PayloadSection
            slug={SLUG}
            coupleNames={COUPLE_NAMES}
            rsvpCtaLabel={RSVP_CTA_LABEL}
            theme={PAYLOAD_THEME}
            rsvpTheme={RSVP_THEME}
            eyebrow={null}
            heading="Nous nous marions"
            headingCascade
          >
            {(openRsvp) => (
              <DetailsSombre
                weddingDateTime={WEDDING_DATETIME}
                venueName={VENUE_NAME}
                venueAddress={VENUE_ADDRESS}
                programme={PROGRAMME}
                dressCode={DRESS_CODE}
                lodging={LODGING_OPTIONS}
                rsvpCtaLabel={RSVP_CTA_LABEL}
                openRsvp={openRsvp}
                theme={{
                  ink: BRETON_MARINE_THEME.textPrimary,
                  inkSoft: BRETON_MARINE_THEME.textSecondary,
                  accent: BRETON_MARINE_THEME.accent,
                  line: PAYLOAD_THEME.cardBorder,
                }}
                renderDate={(_accent, revealed, reducedMotion) => (
                  <ScatterDateCard weddingDateTime={WEDDING_DATETIME} revealed={revealed} reducedMotion={reducedMotion} />
                )}
                renderLieu={({ venueName, venueAddress, mapsUrl }) => (
                  // Pas de photo du lieu fournie — `photoSrc=""` (PAS
                  // `undefined` : un défaut de paramètre JS se déclenche
                  // aussi sur `undefined` explicite, ce qui laissait fuiter
                  // la photo d'Edwige & Wilfried malgré le prop présent —
                  // bug constaté à l'écran puis corrigé ; chaîne vide =
                  // `photoSrc &&` dans LieuMagnifier reste falsy, image omise).
                  <LieuMagnifier venueName={venueName} venueAddress={venueAddress} mapsUrl={mapsUrl} photoSrc="" />
                )}
                renderProgramme={(programme, _accent, revealed, reducedMotion) => (
                  <HorizontalProgramme programme={programme} revealed={revealed} reducedMotion={reducedMotion} />
                )}
                renderDressCode={(dressCode, _accent, revealed, reducedMotion) => (
                  <DressCodeCard dressCode={dressCode} colors={CA_DRESS_CODE_COLORS} revealed={revealed} reducedMotion={reducedMotion} />
                )}
                renderLodging={(lodging, _accent, revealed, reducedMotion) => (
                  <LodgingCascadeCard lodging={lodging} revealed={revealed} reducedMotion={reducedMotion} />
                )}
                renderBeforeRsvp={() => (
                  <NotreHistoire text={CA_HISTOIRE_TEXT} keywords={CA_HISTOIRE_KEYWORDS} photos={GALLERY_PHOTOS} />
                )}
                renderBeforeRsvp2={() => <FoireAuxQuestions items={CA_FAQ_ITEMS} />}
                renderRsvp={({ label, onClick }) => (
                  <WaxSealRsvp label={label} weddingDateLabel={WEDDING_DATE_LABEL} initials={COUPLE_INITIALS} onClick={onClick} />
                )}
              />
            )}
          </PayloadSection>
          <PhotosSection bg={PAYLOAD_THEME.sectionBg} />
          <ClosingSection coupleNames={COUPLE_NAMES} theme={CLOSING_THEME} />
        </div>
      </div>
    </BespokePaletteProvider>
  )
}
