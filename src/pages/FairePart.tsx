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
import { getHeroFont, useGoogleFont } from '@/components/hero-scrub/heroDecor'
import type { HeroChapterTiming } from '@contracts/bespokePalette'
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
/**
 * Bandeau "SCROLL THE DATE — APERÇU" tant qu'un projet (faire-part ou save
 * the date) n'est pas DELIVERED — extrait pour être partagé entre les deux
 * pages (`FairePart` ci-dessous, rendu très différent selon `isStd`, cf.
 * doc de son `return`).
 */
function PreviewWatermark() {
  return (
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
  )
}

/**
 * Pied de page du save the date — pas le Footer marketing complet (nav,
 * offres, réassurance…), qui n'a pas sa place sur une page destinée aux
 * invités : juste le nom du site en lien vers l'accueil, cf. échange du
 * 08/09/2026.
 */
function SaveTheDateFooter() {
  return (
    <footer className="bg-anthracite-950 px-6 py-10 text-center">
      <Link
        to="/"
        className="text-[13px] font-semibold uppercase tracking-[0.2em] text-white/80 transition-colors hover:text-white"
      >
        Scroll The Date
      </Link>
    </footer>
  )
}

export default function FairePart() {
  const { slug } = useParams<{ slug: string }>()
  const query = trpc.projects.getPublicInvite.useQuery(
    { slug: slug ?? '' },
    { enabled: !!slug, retry: false, refetchOnWindowFocus: false, staleTime: 60_000 },
  )

  const invite = query.data
  const palette = (invite?.palette as BespokePalette | null) ?? EW_PALETTE
  // Police du titre du hero (Studio → Palette & Hero → "Police du titre",
  // cf. heroDecor.ts) — charge UNIQUEMENT celle choisie par ce projet.
  // `undefined` (rien choisi) : useGoogleFont ne fait rien, HeroScrub
  // retombe sur la police du site (Fraunces).
  const heroFont = getHeroFont(palette.heroFontId)
  useGoogleFont(palette.heroFontId)
  // Save the date : page dédiée bien plus courte — hero + footer
  // uniquement, pas de corps (programme/lieu/RSVP/menu/FAQ…), cf. échange
  // du 07/09/2026. `product` vient de orders.product (getPublicInvite),
  // pas d'une colonne dédiée sur `projects` : un projet est toujours l'un
  // ou l'autre, jamais les deux.
  const isStd = invite?.product === 'SAVE_THE_DATE'

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

  // Texte overlay du hero (Studio → Palette & Hero) : `heroCardBg` prévaut
  // sur `theme.cardBg`, avec `transparent` en dernier repli — plus de fond
  // opaque par défaut sur la carte floutée du hero, cf. échange du
  // 06/09/2026 (auparavant le thème posait toujours un fond visible,
  // souvent blanc, jamais piloté par la palette du couple). `heroTextColor`
  // s'applique uniformément au texte principal ET secondaire de la carte
  // (titre, lead, sub) — un seul champ, pas de nuance fine demandée.
  const effectiveHeroTheme = {
    ...theme,
    cardBg: palette.heroCardBg || 'transparent',
    ...(palette.heroTextColor
      ? { textPrimary: palette.heroTextColor, textSecondary: palette.heroTextColor }
      : null),
  }

  // Timings du hero (Phase 2) sont stockés en SECONDES, pas en ratio
  // [0,1] — il faut la durée réelle de la vidéo livrée pour les
  // convertir (cf. contracts/bespokePalette.ts::heroChapterTimingSchema).
  // Sondée uniquement si des timings existent : les projets sans palette/
  // timings validés (repli generique ci-dessous) n'ont pas besoin
  // d'attendre cette étape.
  // 2 chapitres pour un save the date ("Save the date" / prénoms+date), 3
  // pour un faire-part (ouverture / détails pratiques / clôture) — cf.
  // contracts/bespokePalette.ts::heroChaptersSchema.
  const expectedChapterCount = isStd ? 2 : 3
  const studioChapters =
    invite?.heroChapters && Array.isArray(invite.heroChapters) && invite.heroChapters.length === expectedChapterCount
      ? (invite.heroChapters as HeroChapterTiming[])
      : null
  // Cartes de texte overlay libres (Studio → Palette & Hero) — leurs
  // timings sont eux aussi en secondes (mêmes raisons que studioChapters
  // ci-dessus), donc elles ont besoin de `videoDuration` au même titre.
  const hasCustomCards = !!invite?.heroCustomCards && invite.heroCustomCards.length > 0
  const [videoDuration, setVideoDuration] = useState<number | null>(null)
  useEffect(() => {
    if (!invite || !(studioChapters || hasCustomCards)) return
    // Mode "frames" (cf. api/lib/videoFrames.ts) : `heroVideoUrl` pointe sur
    // la 1ère image (valeur de compat), pas un fichier vidéo — une sonde
    // <video> dessus ne charge jamais de métadonnées, `onloadedmetadata` ne
    // se déclenche jamais, et la page restait bloquée indéfiniment sur le
    // loader ci-dessous (studioChapters non vide + videoDuration jamais
    // sorti de `null`). La durée se calcule directement à partir du nombre
    // d'images et du fps, pas besoin de sonder quoi que ce soit.
    if (invite.heroFrames) {
      setVideoDuration(invite.heroFrames.count / invite.heroFrames.fps)
      return
    }
    const probe = document.createElement('video')
    probe.preload = 'metadata'
    probe.src = invite.heroVideoUrl
    probe.onloadedmetadata = () => setVideoDuration(probe.duration)
    return () => {
      probe.onloadedmetadata = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invite?.heroVideoUrl, invite?.heroFrames, !!studioChapters, hasCustomCards])

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

  if (query.isLoading || ((studioChapters || hasCustomCards) && videoDuration === null)) {
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
  // Jour/mois/année séparés — chapitre "Détails pratiques" du hero (cf.
  // échange du 07/09/2026 : uniquement la date, une ligne par partie,
  // plus d'heure/lieu/dress code dans ce chapitre). `weddingDateShort`
  // ci-dessus reste utilisé tel quel ailleurs (sceau RSVP, repli clôture).
  const weddingDateParts = invite.weddingDate
    ? (() => {
        const d = new Date(invite.weddingDate)
        return {
          day: d.toLocaleDateString('fr-FR', { day: 'numeric' }),
          month: d.toLocaleDateString('fr-FR', { month: 'long' }),
          year: d.toLocaleDateString('fr-FR', { year: 'numeric' }),
        }
      })()
    : null
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
  // (curatée, jusqu'à 3 teintes) prévaut sur les couleurs choisies par le
  // couple dans le questionnaire (jusqu'à 3 aussi désormais, cf.
  // MultiColorQuestionField, Questionnaire.tsx) — même logique que
  // `effectivePageBg` ci-dessus pour `palette.bg`/`paletteFond`. À défaut
  // des deux, `undefined` laisse DressCodeCard retomber sur ses teintes
  // par défaut.
  const dressCodeColors = (() => {
    const fromPalette = [palette.dressCode1, palette.dressCode2, palette.dressCode3].filter(
      (c): c is string => !!c,
    )
    if (fromPalette.length > 0) return fromPalette
    return invite.dressCodeCouleurs.length > 0 ? invite.dressCodeCouleurs : undefined
  })()

  // "Menu du dîner" (DetailsSombre, slot `renderMenu`) : absent tant
  // qu'aucune des 4 sous-sections n'a de contenu — jamais de contenu
  // inventé, cf. MenuDuDiner (edwigeWilfriedEffects.tsx).
  const hasMenu =
    invite.menuCocktail.length > 0 ||
    invite.menuEntree.length > 0 ||
    invite.menuPlat.length > 0 ||
    invite.menuDessert.length > 0

  const baseChapters: HeroChapter[] = isStd
    ? // Save the date — 2 chapitres fixes (cf. échange du 07/09/2026) :
      // "Save the date" seul, puis les prénoms (une ligne, "&") + la date
      // juste en dessous. Pas de repli à 1 chapitre unique quand les
      // timings studio ne sont pas encore réglés : les deux textes restent
      // distincts, juste tous deux positionnés en toute fin de scroll.
      studioChapters && videoDuration
      ? [
          {
            id: 0,
            kind: 'text',
            from: studioChapters[0].fromSec / videoDuration,
            to: studioChapters[0].toSec / videoDuration,
            verticalAlign: studioChapters[0].position,
            segments: [{ text: 'Save the date' }],
            titleSize: 'lg',
            // Couleur propre à ce bloc (Studio → Save the Date), vide =
            // retombe sur le texte overlay commun (Palette & Hero). Fond
            // de carte INDÉPENDANT du réglage commun (contrairement à la
            // couleur) : vide = transparent, point — cf. échange du
            // 08/09/2026, ce champ ne doit jamais hériter silencieusement
            // d'un fond pensé pour le faire-part.
            textColorOverride: palette.stdSaveTheDateTextColor || undefined,
            cardBgOverride: palette.stdSaveTheDateCardBg || 'transparent',
          },
          {
            id: 1,
            kind: 'text',
            from: studioChapters[1].fromSec / videoDuration,
            to: studioChapters[1].toSec / videoDuration,
            verticalAlign: studioChapters[1].position,
            // Prénoms sur une seule ligne, quitte à réduire leur taille de
            // police si besoin (`fitOneLine`, cf. HeroScrub.tsx) — jamais
            // scindés sur 2 lignes, contrairement au faire-part. `rule` +
            // `subLines`/`subSize: 'md'` (18px, au lieu du `sub` figé à
            // 14px) : la date reste plus discrète que les prénoms
            // (28-56px) tout en étant nettement plus lisible que 14px, cf.
            // échange du 08/09/2026.
            segments,
            fitOneLine: true,
            rule: true,
            subLines: weddingDateShort ? [weddingDateShort] : undefined,
            subSize: 'md',
            textColorOverride: palette.stdNamesDateTextColor || undefined,
            cardBgOverride: palette.stdNamesDateCardBg || 'transparent',
          },
        ]
      : [
          {
            id: 0,
            kind: 'text',
            from: 0.8,
            to: 0.9,
            segments: [{ text: 'Save the date' }],
            titleSize: 'lg',
            // Couleur propre à ce bloc (Studio → Save the Date), vide =
            // retombe sur le texte overlay commun (Palette & Hero). Fond
            // de carte INDÉPENDANT du réglage commun (contrairement à la
            // couleur) : vide = transparent, point — cf. échange du
            // 08/09/2026, ce champ ne doit jamais hériter silencieusement
            // d'un fond pensé pour le faire-part.
            textColorOverride: palette.stdSaveTheDateTextColor || undefined,
            cardBgOverride: palette.stdSaveTheDateCardBg || 'transparent',
          },
          {
            id: 1,
            kind: 'text',
            from: 0.9,
            to: 1,
            // Prénoms sur une seule ligne, quitte à réduire leur taille de
            // police si besoin (`fitOneLine`, cf. HeroScrub.tsx) — jamais
            // scindés sur 2 lignes, contrairement au faire-part. `rule` +
            // `subLines`/`subSize: 'md'` (18px, au lieu du `sub` figé à
            // 14px) : la date reste plus discrète que les prénoms
            // (28-56px) tout en étant nettement plus lisible que 14px, cf.
            // échange du 08/09/2026.
            segments,
            fitOneLine: true,
            rule: true,
            subLines: weddingDateShort ? [weddingDateShort] : undefined,
            subSize: 'md',
            textColorOverride: palette.stdNamesDateTextColor || undefined,
            cardBgOverride: palette.stdNamesDateCardBg || 'transparent',
          },
        ]
    : studioChapters && videoDuration
      ? [
          {
            id: 0,
            kind: 'text',
            from: studioChapters[0].fromSec / videoDuration,
            to: studioChapters[0].toSec / videoDuration,
            verticalAlign: studioChapters[0].position,
            segments,
            segmentLayout: 'stack',
            titleSize: 'lg',
            // Vide par défaut (plus de "vous invite à leur mariage" codé en
            // dur, cf. échange du 06/09/2026) — éditable au studio via
            // palette.heroInviteText (Palette & Hero → Texte overlay).
            sub: palette.heroInviteText || undefined,
          },
          {
            id: 1,
            kind: 'text',
            from: studioChapters[1].fromSec / videoDuration,
            to: studioChapters[1].toSec / videoDuration,
            verticalAlign: studioChapters[1].position,
            // Uniquement la date — jour/mois/année, une ligne chacun (cf.
            // échange du 07/09/2026). Plus d'heure/lieu/dress code ici.
            segments: weddingDateParts
              ? [{ text: weddingDateParts.day }, { text: weddingDateParts.month }, { text: weddingDateParts.year }]
              : [],
            segmentLayout: 'stack',
          },
          // Ancien chapitre de clôture (id 2, "Nous sommes ravis de partager
          // ce moment avec vous" + prénoms) retiré — cf. échange du
          // 06/09/2026 : tant que son timing studio n'est pas réglé (encore
          // {fromSec:0,toSec:0} par défaut), la fenêtre dégénérée [0,0] le
          // faisait apparaître dès le tout début du scroll (cas particulier
          // "dernier chapitre" de `findActiveChapterIndex`, qui inclut p=0),
          // avant même le chapitre d'ouverture ci-dessus.
        ]
      : // `!== false` (pas juste la valeur) : une palette déjà enregistrée
        // avant l'ajout de ce champ (cf. `palette` casté directement depuis
        // le JSONB stocké, sans passer par le schéma zod qui n'aurait
        // appliqué son défaut qu'à l'enregistrement) n'a `heroClosingEnabled`
        // ni à `true` ni à `false` : `undefined`. Un simple `if
        // (palette.heroClosingEnabled)` aurait alors désactivé le chapitre
        // de clôture sur TOUS les projets existants, pas seulement ceux où
        // le studio le décoche explicitement.
        palette.heroClosingEnabled !== false
        ? [
            // Repli générique (pas de timings studio validés) — comportement
            // historique inchangé de cette page : un seul chapitre de
            // clôture. Optionnel (palette.heroClosingEnabled, Studio →
            // Palette & Hero) depuis l'échange du 07/09/2026 : n'a pas de
            // sens pour tous les montages (ex. Yasmine & Adam, dont la
            // vidéo se termine déjà sur un plan de clôture explicite).
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
        : []

  // Cartes de texte overlay libres (Studio → Palette & Hero), en plus des
  // chapitres fixes ci-dessus — texte tel quel (`lead`, un paragraphe
  // libre sans mise en forme de titre imposée), converties en ratio [0,1]
  // comme les chapitres fixes. `id` décalé à 1000+ : ne doit jamais
  // entrer en collision avec les id 0/1/2 des chapitres fixes ci-dessus
  // (utilisés comme clé React, cf. HeroScrub.tsx). Ignorées tant que
  // `videoDuration` n'est pas connu (cf. hasCustomCards plus haut, qui
  // bloque déjà le chargement de la page dans ce cas).
  const customChapters: HeroChapter[] = videoDuration
    ? (invite.heroCustomCards ?? []).map((card, i) => ({
        id: 1000 + i,
        kind: 'text' as const,
        from: card.fromSec / videoDuration,
        to: card.toSec / videoDuration,
        lead: card.text,
        verticalAlign: card.position,
      }))
    : []
  const chapters: HeroChapter[] = [...baseChapters, ...customChapters]

  // Save the date : page dédiée — hero + footer uniquement, aucune des
  // sections de corps ci-dessous (PayloadSection/DetailsSombre/Photos/
  // Closing) — cf. échange du 07/09/2026. `return` séparé plutôt qu'un
  // enchevêtrement de conditions dans le JSX du faire-part : les deux
  // pages divergent presque entièrement au-delà du hero lui-même.
  if (isStd) {
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
              theme={effectiveHeroTheme}
              chapters={chapters}
              video={{
                desktopSrc: invite.heroVideoUrl,
                posterSrc: invite.heroPosterUrl ?? undefined,
                frames: invite.heroFrames ?? undefined,
              }}
              trackHeightVh={800}
              tailVh={100}
              ariaLabel={`Save the date — ${coupleNames}`}
              overlayGraphic={palette.heroOverlayGraphic || undefined}
              fontFamily={heroFont?.fontFamily}
              textAnimation={palette.heroTextAnimation || undefined}
              filter={palette.heroFilter || undefined}
            />
            {invite.status !== 'DELIVERED' && <PreviewWatermark />}
          </div>

          <SaveTheDateFooter />
        </div>
      </BespokePaletteProvider>
    )
  }

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
          theme={effectiveHeroTheme}
          chapters={chapters}
          video={{
            desktopSrc: invite.heroVideoUrl,
            posterSrc: invite.heroPosterUrl ?? undefined,
            frames: invite.heroFrames ?? undefined,
          }}
          trackHeightVh={800}
          tailVh={100}
          ariaLabel={`Faire-part — ${coupleNames}`}
          overlayGraphic={palette.heroOverlayGraphic || undefined}
          fontFamily={heroFont?.fontFamily}
          textAnimation={palette.heroTextAnimation || undefined}
          filter={palette.heroFilter || undefined}
        />
        {invite.status !== 'DELIVERED' && <PreviewWatermark />}
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
