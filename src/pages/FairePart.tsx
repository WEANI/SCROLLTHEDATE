import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Loader2 } from 'lucide-react'
import { trpc } from '@/providers/trpc'
import PayloadSection from '@/components/faire-part/PayloadSection'
import PhotosSection from '@/components/faire-part/PhotosSection'
import ClosingSection from '@/components/faire-part/ClosingSection'
import PhotoSplitCinematique from '@/components/faire-part/PhotoSplitCinematique'
import DetailsSombre, { parseFaqItem, parseProgrammeItem } from '@/components/faire-part/DetailsSombre'
import HeroScrub from '@/components/hero-scrub/HeroScrub'
import { HERO_THEMES } from '@/components/hero-scrub/themes'
import type { HeroChapter } from '@/components/hero-scrub/types'
import {
  BespokePaletteProvider,
  DressCodeCard,
  EW_PALETTE,
  EwEffectsStyles,
  FoireAuxQuestions,
  HorizontalProgramme,
  LieuMagnifier,
  ListeDeMariage,
  LodgingCascadeCard,
  MenuDuDiner,
  NotreHistoire,
  rsvpThemeFromPalette,
  ScatterDateCard,
  WaxSealRsvp,
  type BespokePalette,
} from '@/components/faire-part/edwigeWilfriedEffects'

/**
 * Faire-part client — page publique dynamique, une par projet réel (par
 * opposition à `/demo` et aux pages câblées en dur comme
 * FairePartLeaOlivier/FairePartEdwigeWilfried). Alimentée par
 * `projects.getPublicInvite` : vidéo hero (première version livrée non
 * filigranée) + réponses du questionnaire marquées "affiché sur le
 * faire-part" + palette/timings posés par le studio (Phase 2/3 de
 * PLAN-GENERALISATION-THEMES.md, local, non commité). Hors du `Layout`
 * public — pas de Navbar/Footer marketing devant les invités.
 *
 * Généralisation bespoke (Phase 4) : cette page reprend la STRUCTURE de
 * Léa & Olivier/Edwige & Wilfried (DetailsSombre + composants bespoke de
 * edwigeWilfriedEffects.tsx) plutôt que la pile de cartes générique
 * d'origine — même moteur, données réelles à la place des constantes
 * câblées en dur. Deux systèmes de couleurs cohabitent volontairement,
 * comme sur les pages câblées en dur elles-mêmes :
 * - `theme` (HeroTheme, catalogue HERO_THEMES existant, piloté par
 *   `project.template`) : chrome du hero scrub, fond de page, thème de
 *   PayloadSection/ClosingSection — INCHANGÉ par rapport à l'ancienne
 *   version de cette page. L'ancien sélecteur de template reste actif
 *   tant que la Phase 5 ne l'a pas retiré.
 * - `palette` (BespokePalette, posée par le studio en Phase 2, ou
 *   EW_PALETTE en repli sobre si pas encore validée) : couleurs internes
 *   des composants bespoke (date, lieu, programme, dress code,
 *   hébergements, histoire, FAQ, sceau RSVP), via BespokePaletteProvider.
 *
 * Chaque section bespoke ne s'affiche que si sa donnée existe (géré par
 * DetailsSombre pour programme/dressCode/lodging, ici pour histoire/FAQ/
 * photo d'ouverture) — jamais de contenu inventé.
 */
export default function FairePart() {
  const { slug } = useParams<{ slug: string }>()
  const query = trpc.projects.getPublicInvite.useQuery(
    { slug: slug ?? '' },
    { enabled: !!slug, retry: false, refetchOnWindowFocus: false, staleTime: 60_000 },
  )

  const invite = query.data
  const palette = (invite?.palette as BespokePalette | null) ?? EW_PALETTE

  // Détecte si la palette bespoke définit un fond sombre : luminance < 40 %
  // → bascule sur le thème "cinema" (sombre) au lieu du thème stocké en base,
  // sinon tout le chrome (texte, cartes, ombres) reste clair et illisible.
  const hasDarkBespokeBg = (() => {
    const hex = palette.bg?.match(/^#([0-9a-f]{6})$/i)?.[1]
    if (!hex) return false
    const r = parseInt(hex.slice(0, 2), 16) / 255
    const g = parseInt(hex.slice(2, 4), 16) / 255
    const b = parseInt(hex.slice(4, 6), 16) / 255
    return 0.299 * r + 0.587 * g + 0.114 * b < 0.4
  })()
  const templateKey = hasDarkBespokeBg ? 'cinema' : ((invite?.template as keyof typeof HERO_THEMES) ?? 'cinema')
  const theme = HERO_THEMES[templateKey] ?? HERO_THEMES.cinema

  // Si la palette bespoke définit un fond, il prévaut sur le pageBg du thème
  const effectivePageBg = palette.bg && palette.bg !== EW_PALETTE.bg ? palette.bg : theme.pageBg

  // Timings du hero (Phase 2) sont stockés en SECONDES, pas en ratio
  // [0,1] — il faut la durée réelle de la vidéo livrée pour les
  // convertir (cf. contracts/bespokePalette.ts::heroChapterTimingSchema).
  // Sondée uniquement si des timings existent : les projets sans palette/
  // timings validés (repli generique ci-dessous) n'ont pas besoin
  // d'attendre cette étape.
  const studioChapters =
    invite?.heroChapters && Array.isArray(invite.heroChapters) && invite.heroChapters.length === 3
      ? (invite.heroChapters as { fromSec: number; toSec: number }[])
      : null
  const [videoDuration, setVideoDuration] = useState<number | null>(null)
  useEffect(() => {
    if (!invite || !studioChapters) return
    const probe = document.createElement('video')
    probe.preload = 'metadata'
    probe.src = invite.heroVideoUrl
    probe.onloadedmetadata = () => setVideoDuration(probe.duration)
    return () => {
      probe.onloadedmetadata = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invite?.heroVideoUrl, !!studioChapters])

  // Aspect ratio réel de la photo d'ouverture — inconnu à l'avance
  // (contrairement aux couples câblés en dur, dont le fichier et son
  // ratio exact sont connus au moment d'écrire le code) : PhotoSplitCinematique
  // stretche ses moitiés à la taille de leur boîte, un ratio faux déforme
  // visiblement l'image (cf. sa doc). Repli 4/5 (portrait sobre) le temps
  // que l'image réelle charge.
  const [openingRatio, setOpeningRatio] = useState('4 / 5')
  useEffect(() => {
    const src = invite?.photoOuverture
    if (!src) return
    const img = new Image()
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) setOpeningRatio(`${img.naturalWidth} / ${img.naturalHeight}`)
    }
    img.src = src
  }, [invite?.photoOuverture])

  useEffect(() => {
    if (!invite) return
    document.title = invite.coupleNames ? `${invite.coupleNames} · Scroll The Date` : 'Scroll The Date'
    const meta = document.createElement('meta')
    meta.name = 'color-scheme'
    // Lu depuis le thème, jamais déduit de son id : "editorial" est clair
    // lui aussi, un test `id === 'minimal'` l'aurait déclaré sombre et
    // aurait rouvert l'inversion dark mode sur mobile.
    meta.content = theme.colorScheme === 'light' ? 'only light' : 'only dark'
    document.head.appendChild(meta)
    return () => {
      document.title = 'Scroll The Date'
      document.head.removeChild(meta)
    }
  }, [invite, theme.colorScheme])

  if (query.isLoading || (studioChapters && videoDuration === null)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-anthracite-950">
        <Loader2 className="animate-spin text-terracotta-500" size={28} />
      </div>
    )
  }

  // Pas de projet à ce slug, ou pas encore de vidéo livrée aux invités —
  // état neutre plutôt qu'une erreur (un lien peut circuler avant que tout
  // soit prêt).
  if (!invite) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-anthracite-950 px-6 text-center">
        <p className="font-display text-2xl italic text-white">Ce faire-part n'est pas encore disponible.</p>
        <p className="max-w-sm text-[14px] text-white/60">
          Le lien est peut-être arrivé un peu tôt — revenez un peu plus tard.
        </p>
        <Link to="/" className="mt-2 text-[13px] font-medium uppercase tracking-[0.1em] text-terracotta-400">
          Scroll The Date — accueil
        </Link>
      </div>
    )
  }

  const coupleNames = invite.coupleNames ?? 'Les mariés'
  // "Anna & Théo" → segments ["Anna", "&" (accent), "Théo"] pour le rendu du
  // hero ; si le format ne s'y prête pas (pas de " & "/" et " détecté), on
  // affiche le nom tel quel, sans accent — dégradé propre plutôt qu'un
  // découpage hasardeux.
  const nameParts = coupleNames.split(/\s+(&|et)\s+/i)
  const segments =
    nameParts.length === 3
      ? [{ text: nameParts[0] }, { text: nameParts[1], accent: true }, { text: nameParts[2] }]
      : [{ text: coupleNames }]
  const eyebrowInitials = nameParts.length === 3 ? `${nameParts[0][0]} & ${nameParts[2][0]}` : undefined
  // Format dédié au sceau RSVP (WaxSealRsvp) — " · " plutôt que " & ",
  // demande client d'origine (cf. Léa & Olivier "L · O") ; une valeur
  // réelle toujours fournie (jamais `undefined`), sans quoi le composant
  // retomberait sur son défaut d'origine "É · W" (Edwige & Wilfried).
  const sealInitials = nameParts.length === 3 ? `${nameParts[0][0]} · ${nameParts[2][0]}` : coupleNames.slice(0, 1).toUpperCase()

  const weddingDateShort = invite.weddingDate
    ? new Date(invite.weddingDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : undefined
  // DetailsSombre/ScatterDateCard exigent une date+heure ISO (pour le
  // compte à rebours) — `ceremonyTime` est un texte libre ("17h00", "à
  // 15h30"…), pas une heure structurée : on tente une extraction simple,
  // et on retombe sur minuit si le format ne correspond pas plutôt que de
  // planter. Léger flou assumé (le compte à rebours vise minuit au lieu
  // de l'heure exacte) plutôt qu'une donnée inventée.
  const weddingDateTime = (() => {
    const d = invite.weddingDate ? new Date(invite.weddingDate) : new Date()
    const m = invite.ceremonyTime?.match(/(\d{1,2})\s*[h:]\s*(\d{1,2})?/)
    d.setHours(m ? Number(m[1]) : 0, m?.[2] ? Number(m[2]) : 0, 0, 0)
    return d.toISOString()
  })()

  const programme = invite.programme.map(parseProgrammeItem)
  const faqItems = invite.faq.map(parseFaqItem)

  // Teintes des pastilles « Dress code » : la palette posée au studio
  // (curatée, jusqu'à 3 teintes) prévaut sur l'unique couleur choisie par
  // le couple dans le questionnaire — même logique que `effectivePageBg`
  // ci-dessus pour `palette.bg`/`paletteFond`. À défaut des deux,
  // `undefined` laisse DressCodeCard retomber sur ses teintes par défaut.
  const dressCodeColors = (() => {
    const fromPalette = [palette.dressCode1, palette.dressCode2, palette.dressCode3].filter(
      (c): c is string => !!c,
    )
    if (fromPalette.length > 0) return fromPalette
    return invite.dressCodeCouleur ? [invite.dressCodeCouleur] : undefined
  })()

  // "Menu du dîner" (DetailsSombre, slot `renderMenu`) : absent tant
  // qu'aucune des 4 sous-sections n'a de contenu — jamais de contenu
  // inventé, cf. MenuDuDiner (edwigeWilfriedEffects.tsx).
  const hasMenu =
    invite.menuCocktail.length > 0 ||
    invite.menuEntree.length > 0 ||
    invite.menuPlat.length > 0 ||
    invite.menuDessert.length > 0

  const chapters: HeroChapter[] =
    studioChapters && videoDuration
      ? [
          {
            id: 0,
            kind: 'text',
            from: studioChapters[0].fromSec / videoDuration,
            to: studioChapters[0].toSec / videoDuration,
            segments,
            segmentLayout: 'stack',
            titleSize: 'lg',
            sub: 'vous invite à leur mariage',
          },
          {
            id: 1,
            kind: 'text',
            from: studioChapters[1].fromSec / videoDuration,
            to: studioChapters[1].toSec / videoDuration,
            segments: weddingDateShort ? [{ text: weddingDateShort }] : [],
            rule: true,
            subLines: [invite.ceremonyTime, invite.venueName].filter((x): x is string => !!x),
            subSize: 'md',
            sub: invite.dressCode ?? undefined,
          },
          {
            id: 2,
            kind: 'text',
            from: studioChapters[2].fromSec / videoDuration,
            to: studioChapters[2].toSec / videoDuration,
            lead: 'Nous sommes ravis de partager ce moment avec vous',
            segments,
          },
        ]
      : [
          // Repli générique (pas de timings studio validés) — comportement
          // historique inchangé de cette page : un seul chapitre de clôture.
          {
            id: 0,
            kind: 'text',
            from: 0.9,
            to: 1,
            eyebrow: eyebrowInitials,
            segments,
            rule: true,
            sub: weddingDateShort,
          },
        ]

  return (
    <BespokePaletteProvider palette={palette}>
    <div style={{ background: effectivePageBg }}>
      <EwEffectsStyles />
      <header className="absolute inset-x-0 top-0 z-40 flex items-center justify-center px-6 py-5">
        <Link to="/" aria-label="Scroll The Date — accueil" className="rounded-full bg-black/25 px-4 py-2 backdrop-blur-sm">
          <img src="/logo.svg" alt="Scroll The Date" className="h-6 w-auto brightness-0 invert" />
        </Link>
      </header>

      <div className="relative">
        <HeroScrub
          theme={theme}
          chapters={chapters}
          video={{ desktopSrc: invite.heroVideoUrl, posterSrc: invite.heroPosterUrl ?? undefined }}
          trackHeightVh={800}
          tailVh={100}
          ariaLabel={`Faire-part — ${coupleNames}`}
        />
        {invite.status !== 'DELIVERED' && (
          <>
            <div
              aria-hidden="true"
              className="pointer-events-none fixed inset-0 z-[2] opacity-[0.12]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(-35deg, transparent 0 90px, rgba(255,255,255,0) 90px 92px), repeating-linear-gradient(-35deg, transparent 0 180px, rgba(255,255,255,0.9) 180px 181px)",
              }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none fixed inset-0 z-[2] flex rotate-[-18deg] flex-wrap content-center justify-center gap-x-16 gap-y-10 opacity-[0.14]"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <span key={i} className="whitespace-nowrap text-lg font-bold tracking-[0.2em] text-white">
                  SCROLL THE DATE — APERÇU
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Le corps de page recouvre le plan final au lieu de s'enchaîner en
          dessous — même mécanique que sur les pages câblées en dur (cf.
          FairePartLeaOlivier pour l'explication complète du calcul
          -100vh). Couleurs dérivées du thème de l'ambiance (HeroTheme),
          pas de la palette bespoke : ce bloc reste le chrome de page,
          inchangé par rapport à l'ancienne version de cette page. */}
      <div
        className="relative z-10 -mt-[100vh] rounded-t-[32px]"
        style={{
          background: effectivePageBg,
          boxShadow:
            theme.colorScheme === 'dark'
              ? '0 -24px 60px rgba(0, 0, 0, 0.5)'
              : '0 -24px 60px rgba(46, 38, 32, 0.18)',
        }}
      >
        {/* Photo d'ouverture — uniquement si le couple en a fourni une
            (question facultative, cf. Phase 1). Colonne centrée à largeur
            limitée plutôt que pleine largeur : cf. FairePartLeaOlivier
            pour pourquoi (portrait, object-fit aurait coupé les têtes). */}
        {invite.photoOuverture && (
          <section className="px-6 pt-16 sm:pt-20" aria-label="Photo du couple">
            <figure className="mx-auto max-w-[420px]">
              <PhotoSplitCinematique src={invite.photoOuverture} alt={coupleNames} aspectRatio={openingRatio} />
            </figure>
          </section>
        )}

        <PayloadSection
          slug={invite.slug}
          coupleNames={coupleNames}
          theme={{
            sectionBg: effectivePageBg,
            cardBg: theme.cardBg,
            cardBorder: theme.cardBorder,
            accent: theme.accent,
            accentHover: theme.accent,
            heading: theme.textPrimary,
            text: theme.textPrimary,
          }}
          rsvpTheme={rsvpThemeFromPalette(palette)}
          eyebrow={null}
          heading="Nous nous marions"
          headingCascade
        >
          {(openRsvp) => (
            <DetailsSombre
              weddingDateTime={weddingDateTime}
              venueName={invite.venueName ?? 'Lieu à confirmer'}
              // La question "Lieu de cérémonie + adresse" collecte les deux
              // dans un seul champ libre (cf. Phase 1) — pas de 2e ligne
              // distincte à fournir ici plutôt que de dupliquer le même
              // texte ou d'inventer un découpage hasardeux.
              venueAddress=""
              programme={programme}
              dressCode={invite.dressCode ?? undefined}
              lodging={invite.hebergements}
              openRsvp={openRsvp}
              theme={{
                ink: theme.textPrimary,
                inkSoft: theme.textSecondary,
                accent: theme.accent,
                line: theme.cardBorder,
              }}
              renderDate={(_accent, revealed, reducedMotion) => (
                <ScatterDateCard weddingDateTime={weddingDateTime} revealed={revealed} reducedMotion={reducedMotion} />
              )}
              renderLieu={({ venueName, venueAddress, mapsUrl }) => (
                <LieuMagnifier
                  venueName={venueName}
                  venueAddress={venueAddress}
                  mapsUrl={mapsUrl}
                  photoSrc={invite.photoLieu ?? ''}
                />
              )}
              renderProgramme={(items, _accent, revealed, reducedMotion) => (
                <HorizontalProgramme programme={items} revealed={revealed} reducedMotion={reducedMotion} />
              )}
              renderDressCode={(dressCode, _accent, revealed, reducedMotion) => (
                <DressCodeCard dressCode={dressCode} colors={dressCodeColors} revealed={revealed} reducedMotion={reducedMotion} />
              )}
              renderLodging={(lodging, _accent, revealed, reducedMotion) => (
                <LodgingCascadeCard lodging={lodging} revealed={revealed} reducedMotion={reducedMotion} />
              )}
              renderBeforeRsvp={
                invite.histoire
                  ? () => <NotreHistoire text={invite.histoire!} keywords={invite.histoireMotsCles} photos={invite.galeriePhotos} />
                  : undefined
              }
              renderMenu={
                hasMenu
                  ? () => (
                      <MenuDuDiner
                        cocktail={invite.menuCocktail}
                        entree={invite.menuEntree}
                        plat={invite.menuPlat}
                        dessert={invite.menuDessert}
                      />
                    )
                  : undefined
              }
              renderBeforeFaq={
                invite.listeMariageLien
                  ? () => (
                      <ListeDeMariage
                        link={invite.listeMariageLien!}
                        message={invite.listeMariageMessage ?? undefined}
                      />
                    )
                  : undefined
              }
              renderBeforeRsvp2={faqItems.length > 0 ? () => <FoireAuxQuestions items={faqItems} /> : undefined}
              renderRsvp={({ label, onClick }) => (
                <WaxSealRsvp label={label} weddingDateLabel={weddingDateShort ?? ''} initials={sealInitials} onClick={onClick} />
              )}
            />
          )}
        </PayloadSection>
        <PhotosSection bg={effectivePageBg} />
        <ClosingSection
          coupleNames={coupleNames}
          theme={{
            bg: effectivePageBg,
            border: theme.cardBorder,
            heading: theme.textPrimary,
            accent: theme.accent,
            text: theme.textSecondary,
          }}
        />
      </div>
    </div>
    </BespokePaletteProvider>
  )
}
