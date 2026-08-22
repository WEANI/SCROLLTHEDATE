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
  NotreHistoire,
  ScatterDateCard,
  WaxSealRsvp,
} from '@/components/faire-part/edwigeWilfriedEffects'
import {
  CINEMA_ROUGE_THEME,
  CLOSING_THEME,
  DRESS_CODE,
  HERO_CHAPTERS,
  LAO_DRESS_CODE_COLORS,
  LAO_FAQ_ITEMS,
  LAO_HISTOIRE_KEYWORDS,
  LAO_HISTOIRE_TEXT,
  LAO_PALETTE,
  LODGING_OPTIONS,
  OPENING_PHOTO,
  PAYLOAD_THEME,
  PROGRAMME,
  RSVP_CTA_LABEL,
  RSVP_THEME,
  SLUG,
  VENUE_ADDRESS,
  VENUE_NAME,
  WEDDING_DATE_LABEL,
  WEDDING_DATETIME,
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
    // Dérivé de WEDDING_DATE_LABEL plutôt que redupliqué en dur ici — la
    // date changée pour 2027 avait laissé ce titre d'onglet en 2026,
    // repéré à l'occasion de cette correction.
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
    <BespokePaletteProvider palette={LAO_PALETTE}>
    <div style={{ background: CINEMA_ROUGE_THEME.pageBg }}>
      <EwEffectsStyles />
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
        style={{ background: CINEMA_ROUGE_THEME.pageBg }}
      >
        {/* Photo d'ouverture — première chose vue après le film, avant les
            informations pratiques. Colonne centrée à largeur limitée plutôt
            qu'une image pleine largeur : cette photo est un PORTRAIT
            (1000x1768) — étalée sur toute la largeur d'un écran desktop,
            `object-cover` la rognait si violemment qu'il ne restait que les
            bustes, têtes coupées (constaté à l'écran). En colonne, le
            cadrage vertical d'origine est conservé intact, et l'ensemble
            fait écho à la colonne 9:16 du hero juste au-dessus.
            Effet « split cinématique » demandé par le client : la photo se
            reconstitue en deux moitiés au scroll, une seule fois — cf.
            PhotoSplitCinematique pour le détail. aspectRatio="1000 / 1768"
            = dimensions réelles du fichier, obligatoire pour ce composant
            (il stretch les moitiés à la taille exacte de leur boîte, ne
            recadre pas en object-fit: cover). */}
        <section className="px-6 pt-16 sm:pt-20" aria-label="Photo du couple">
          <figure className="mx-auto max-w-[420px]">
            <PhotoSplitCinematique
              src={OPENING_PHOTO.src}
              alt={OPENING_PHOTO.alt}
              aspectRatio="1000 / 1768"
            />
          </figure>
        </section>

        {/* DetailsSombre (children de PayloadSection) remplace la pile de
            cartes Date/Heure/Lieu/Dress code/Hébergements par défaut —
            demande client du thème sombre (compte à rebours, frise du
            programme, lien carte). `programme` = PROGRAMME, fourni verbatim
            par le couple (cf. leaOlivierContent.ts) — câblé en dur comme le
            reste du payload de cette page en attendant la question
            `jourj.programme` proposée dans DetailsSombre.tsx. */}
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
                ink: CINEMA_ROUGE_THEME.textPrimary,
                inkSoft: CINEMA_ROUGE_THEME.textSecondary,
                accent: CINEMA_ROUGE_THEME.accent,
                line: PAYLOAD_THEME.cardBorder,
              }}
              renderDate={(_accent, revealed, reducedMotion) => (
                <ScatterDateCard weddingDateTime={WEDDING_DATETIME} revealed={revealed} reducedMotion={reducedMotion} />
              )}
              renderLieu={({ venueName, venueAddress, mapsUrl }) => (
                <LieuMagnifier venueName={venueName} venueAddress={venueAddress} mapsUrl={mapsUrl} photoSrc="" />
              )}
              renderProgramme={(programme, _accent, revealed, reducedMotion) => (
                <HorizontalProgramme programme={programme} revealed={revealed} reducedMotion={reducedMotion} />
              )}
              renderDressCode={(dressCode, _accent, revealed, reducedMotion) => (
                <DressCodeCard dressCode={dressCode} colors={LAO_DRESS_CODE_COLORS} revealed={revealed} reducedMotion={reducedMotion} />
              )}
              renderBeforeRsvp={() => <NotreHistoire text={LAO_HISTOIRE_TEXT} keywords={LAO_HISTOIRE_KEYWORDS} photos={[]} />}
              renderBeforeRsvp2={() => <FoireAuxQuestions items={LAO_FAQ_ITEMS} />}
              renderRsvp={({ label, onClick }) => (
                <WaxSealRsvp label={label} weddingDateLabel={WEDDING_DATE_LABEL} initials="L · O" onClick={onClick} />
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
