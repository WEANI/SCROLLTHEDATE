import { useEffect } from 'react'
import { Link } from 'react-router'
import { trpc } from '@/providers/trpc'
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
  buildHeroChapters,
  CINEMA_ROUGE_THEME,
  CLOSING_THEME,
  DRESS_CODE,
  GALLERY_PHOTOS,
  HERO_VIDEO,
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
  VENUE_PHOTO,
  WEDDING_DATE_LABEL,
  WEDDING_DATETIME,
} from '@/components/faire-part/demoFairePart2Content'

/** Repli quand aucun nom n'a été saisi dans Réglages → Faire-part démo — jamais un prénom en dur (cf. échange du 13/09/2026). */
const FALLBACK_NAME = 'Demo Faire Part 2'

/** "Prénom & Prénom" → "P · P" ; sinon repli neutre — sceau de cire (WaxSealRsvp). */
function computeInitials(names: string): string {
  const parts = names.split(/\s+(&|et)\s+/i)
  return parts.length === 3 ? `${parts[0][0]} · ${parts[2][0]}` : 'D · 2'
}

/**
 * « Demo Faire Part 2 » — démo publique copiée du faire-part Léa & Olivier
 * (cf. doc de demoFairePart2Content.ts), listée sur /demofairepart. Rendue
 * hors du `Layout` public (pas de Navbar/Footer commerciaux) avec un
 * en-tête minimal, à la façon de `/login`. `<meta color-scheme>` posé en
 * direct — "only dark" (ambiance Cinéma, dress code rouge/noir).
 *
 * Les prénoms affichés viennent de Réglages → Faire-part démo
 * (site_settings, clé "demoFairePart2") plutôt que d'être câblés en dur —
 * vide par défaut (`FALLBACK_NAME` sert alors de titre neutre), cf.
 * échange du 13/09/2026.
 */
export default function DemoFairePart2() {
  const namesQ = trpc.settings.get.useQuery({ key: 'demoFairePart2' })
  const coupleNames = (namesQ.data?.value as { coupleNames?: string } | null)?.coupleNames?.trim() || FALLBACK_NAME

  useEffect(() => {
    document.title = `${coupleNames} · Scroll The Date`

    const meta = document.createElement('meta')
    meta.name = 'color-scheme'
    meta.content = 'only dark'
    document.head.appendChild(meta)

    return () => {
      document.title = 'Scroll The Date'
      document.head.removeChild(meta)
    }
  }, [coupleNames])

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
        chapters={buildHeroChapters(coupleNames)}
        video={HERO_VIDEO}
        trackHeightVh={1060}
        tailVh={100}
        ariaLabel={`Faire-part — ${coupleNames}`}
      />

      {/* Le corps de page recouvre le plan final au lieu de s'enchaîner en
          dessous — cf. historique git (page d'origine, Edwige & Wilfried)
          pour l'explication complète du calcul -100vh. Ombre en noir pur :
          cohérente avec un fond déjà sombre. */}
      <div
        className="relative z-10 -mt-[100vh] rounded-t-[32px] shadow-[0_-24px_60px_rgba(0,0,0,0.5)]"
        style={{ background: CINEMA_ROUGE_THEME.pageBg }}
      >
        <section className="px-6 pt-16 sm:pt-20" aria-label="Photo du couple">
          <figure className="mx-auto max-w-[420px]">
            <PhotoSplitCinematique
              src={OPENING_PHOTO.src}
              alt={OPENING_PHOTO.alt}
              aspectRatio="1000 / 1768"
            />
          </figure>
        </section>

        <PayloadSection
          slug={SLUG}
          coupleNames={coupleNames}
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
                <LieuMagnifier venueName={venueName} venueAddress={venueAddress} mapsUrl={mapsUrl} photoSrc={VENUE_PHOTO} />
              )}
              renderProgramme={(programme, _accent, revealed, reducedMotion) => (
                <HorizontalProgramme programme={programme} revealed={revealed} reducedMotion={reducedMotion} />
              )}
              renderDressCode={(dressCode, _accent, revealed, reducedMotion) => (
                <DressCodeCard dressCode={dressCode} colors={LAO_DRESS_CODE_COLORS} revealed={revealed} reducedMotion={reducedMotion} />
              )}
              renderLodging={(lodging, _accent, revealed, reducedMotion) => (
                <LodgingCascadeCard lodging={lodging} revealed={revealed} reducedMotion={reducedMotion} />
              )}
              renderBeforeRsvp={() => <NotreHistoire text={LAO_HISTOIRE_TEXT} keywords={LAO_HISTOIRE_KEYWORDS} photos={GALLERY_PHOTOS} />}
              renderBeforeRsvp2={() => <FoireAuxQuestions items={LAO_FAQ_ITEMS} />}
              renderRsvp={({ label, onClick }) => (
                <WaxSealRsvp label={label} weddingDateLabel={WEDDING_DATE_LABEL} initials={computeInitials(coupleNames)} onClick={onClick} />
              )}
            />
          )}
        </PayloadSection>
        <PhotosSection bg={PAYLOAD_THEME.sectionBg} />
        <ClosingSection coupleNames={coupleNames} theme={CLOSING_THEME} />
      </div>
    </div>
    </BespokePaletteProvider>
  )
}
