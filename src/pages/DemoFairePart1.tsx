import { useEffect } from 'react'
import { Link } from 'react-router'
import { trpc } from '@/providers/trpc'
import PayloadSection from '@/components/faire-part/PayloadSection'
import PhotosSection from '@/components/faire-part/PhotosSection'
import ClosingSection from '@/components/faire-part/ClosingSection'
import DetailsSombre from '@/components/faire-part/DetailsSombre'
import PhotoSplitCinematique from '@/components/faire-part/PhotoSplitCinematique'
import {
  BespokePaletteProvider,
  DressCodeCard,
  EW_PALETTE,
  EwEffectsStyles,
  FoireAuxQuestions,
  HorizontalProgramme,
  LieuMagnifier,
  NotreHistoire,
  rsvpThemeFromPalette,
  ScatterDateCard,
  WaxSealRsvp,
} from '@/components/faire-part/edwigeWilfriedEffects'
import HeroScrub from '@/components/hero-scrub/HeroScrub'
import { MINIMAL_THEME } from '@/components/hero-scrub/themes'
import {
  ACCENT_PALE,
  buildHeroChapters,
  DETAILS_THEME,
  DRESS_CODE,
  GALLERY_PHOTOS,
  HERO_VIDEO,
  OPENING_PHOTO,
  PROGRAMME,
  RSVP_CTA_LABEL,
  SLUG,
  VENUE_LOCATION,
  VENUE_NAME,
  WEDDING_DATE_LABEL,
  WEDDING_DATETIME,
} from '@/components/faire-part/demoFairePart1Content'

/** Repli quand aucun nom n'a été saisi dans Réglages → Faire-part démo — jamais un prénom en dur (cf. échange du 13/09/2026). */
const FALLBACK_NAME = 'Demo Faire Part 1'

/** "Prénom & Prénom" → "P · P" ; sinon repli neutre — sceau de cire (WaxSealRsvp). */
function computeInitials(names: string): string {
  const parts = names.split(/\s+(&|et)\s+/i)
  return parts.length === 3 ? `${parts[0][0]} · ${parts[2][0]}` : 'D · 1'
}

/**
 * « Demo Faire Part 1 » — démo publique copiée du faire-part Edwige &
 * Wilfried (cf. doc de demoFairePart1Content.ts), listée sur
 * /demofairepart. Rendue hors du `Layout` public (pas de Navbar/Footer
 * commerciaux) avec un en-tête minimal, à la façon de `/login`.
 * `<meta color-scheme>` posé en direct (directive non négociable du skill,
 * anti-inversion dark mode mobile).
 *
 * Les prénoms affichés viennent de Réglages → Faire-part démo
 * (site_settings, clé "demoFairePart1") plutôt que d'être câblés en dur —
 * vide par défaut (`FALLBACK_NAME` sert alors de titre neutre), cf.
 * échange du 13/09/2026.
 */
export default function DemoFairePart1() {
  const namesQ = trpc.settings.get.useQuery({ key: 'demoFairePart1' })
  const coupleNames = (namesQ.data?.value as { coupleNames?: string } | null)?.coupleNames?.trim() || FALLBACK_NAME

  useEffect(() => {
    document.title = `${coupleNames} · Scroll The Date`

    const meta = document.createElement('meta')
    meta.name = 'color-scheme'
    meta.content = 'only light'
    document.head.appendChild(meta)

    return () => {
      document.title = 'Scroll The Date'
      document.head.removeChild(meta)
    }
  }, [coupleNames])

  return (
    <BespokePaletteProvider palette={EW_PALETTE}>
    <div className="bg-[#FBF7F1]">
      <EwEffectsStyles />

      {/* En-tête minimal — pas le Navbar marketing du site public. Pastille
          sombre translucide pour rester lisible quelle que soit l'image du
          scrub derrière (l'enveloppe claire comme la scène dorée). */}
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
        theme={MINIMAL_THEME}
        chapters={buildHeroChapters(coupleNames)}
        video={HERO_VIDEO}
        trackHeightVh={800}
        tailVh={100}
        ariaLabel={`Faire-part — ${coupleNames}`}
      />

      {/* Le corps de page recouvre le plan final au lieu de s'enchaîner en
          dessous : `.hs-frame` (dans HeroScrub) reste épinglé en `position:
          sticky` tant que la piste de scrub (700vh) n'est pas épuisée — en
          tirant ce bloc vers le haut via une marge négative, son bord
          d'attaque entre dans le viewport un peu avant la fin de cette
          piste, pendant que la vidéo est donc encore épinglée dessous.
          -100vh (pas -20vh) : le recouvrement doit être COMPLET au moment où
          `.hs-frame` se libère de son épinglage — cf. historique git pour
          le détail du calcul (page d'origine, Edwige & Wilfried). */}
      <div className="relative z-10 -mt-[100vh] rounded-t-[32px] bg-[#FBF7F1] shadow-[0_-24px_60px_rgba(46,38,32,0.18)]">
        <section className="px-6 pt-16 sm:pt-20" aria-label="Photo du couple">
          <figure className="mx-auto max-w-[420px]">
            <PhotoSplitCinematique src={OPENING_PHOTO.src} alt={OPENING_PHOTO.alt} aspectRatio="520 / 936" />
          </figure>
        </section>

        <PayloadSection
          slug={SLUG}
          coupleNames={coupleNames}
          rsvpCtaLabel={RSVP_CTA_LABEL}
          rsvpTheme={rsvpThemeFromPalette(EW_PALETTE)}
          eyebrow={null}
          heading="Nous avons le plaisir de vous inviter à notre mariage"
          headingCascade
        >
          {(openRsvp) => (
            <DetailsSombre
              weddingDateTime={WEDDING_DATETIME}
              venueName={VENUE_NAME}
              venueAddress={VENUE_LOCATION}
              programme={PROGRAMME}
              dressCode={DRESS_CODE}
              rsvpCtaLabel={RSVP_CTA_LABEL}
              confettiSecondary={ACCENT_PALE}
              openRsvp={openRsvp}
              theme={DETAILS_THEME}
              renderDate={(_accent, revealed, reducedMotion) => (
                <ScatterDateCard weddingDateTime={WEDDING_DATETIME} revealed={revealed} reducedMotion={reducedMotion} />
              )}
              renderLieu={({ venueName, venueAddress, mapsUrl }) => (
                <LieuMagnifier venueName={venueName} venueAddress={venueAddress} mapsUrl={mapsUrl} />
              )}
              renderProgramme={(programme, _accent, revealed, reducedMotion) => (
                <HorizontalProgramme programme={programme} revealed={revealed} reducedMotion={reducedMotion} />
              )}
              renderDressCode={(dressCode, _accent, revealed, reducedMotion) => (
                <DressCodeCard dressCode={dressCode} revealed={revealed} reducedMotion={reducedMotion} />
              )}
              renderBeforeRsvp={() => <NotreHistoire photos={GALLERY_PHOTOS} />}
              renderBeforeRsvp2={() => <FoireAuxQuestions />}
              renderRsvp={({ label, onClick }) => (
                <WaxSealRsvp label={label} weddingDateLabel={WEDDING_DATE_LABEL} initials={computeInitials(coupleNames)} onClick={onClick} />
              )}
            />
          )}
        </PayloadSection>
        <PhotosSection />
        <ClosingSection coupleNames={coupleNames} />
      </div>
    </div>
    </BespokePaletteProvider>
  )
}
