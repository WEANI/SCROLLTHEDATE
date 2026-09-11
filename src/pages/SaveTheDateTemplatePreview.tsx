import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, ChevronDown, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { trpc } from '@/providers/trpc'
import HeroScrub from '@/components/hero-scrub/HeroScrub'
import { getHeroFont, useGoogleFont } from '@/components/hero-scrub/heroDecor'
import { useSeo } from '@/hooks/useSeo'
import { formatEuros } from '@/components/commerce/pricing'
import { parseTemplateOverrides, resolveSaveTheDateTemplate } from '@contracts/saveTheDateTemplates'

/** Prix fixe "sur un modèle", cf. TEMPLATE_PRICE_CENTS (api/ordersRouter.ts) — dupliqué à dessein, ce fichier reste pur frontend et ne peut pas importer de code serveur. */
const TEMPLATE_PRICE_CENTS = 9900

/**
 * Invite à défiler — sans elle, un visiteur qui arrive sur un aperçu de
 * modèle peut rester face à la première image sans comprendre que le
 * scroll fait avancer la vidéo (cf. échange du 12/09/2026). `position:
 * fixed` (pas `absolute`) : reste ancrée en bas de l'écran pendant que le
 * cadre du hero défile sous elle (lui-même `position: sticky`). Disparaît
 * dès le premier vrai scroll, une fois pour toutes — jamais de fondu qui
 * revient perturber la lecture plus bas dans la vidéo.
 */
function ScrollHint() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    function onScroll() {
      if (window.scrollY > 50) setVisible(false)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 bottom-7 z-40 flex flex-col items-center gap-2 transition-opacity duration-500',
        visible ? 'opacity-100' : 'opacity-0',
      )}
      aria-hidden
    >
      <span className="rounded-full bg-black/30 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
        Scrollez pour découvrir
      </span>
      <ChevronDown size={20} className="motion-safe:animate-bounce text-white/80" />
    </div>
  )
}

/**
 * Aperçu plein écran d'UN modèle Save the Date — cf. doc de
 * contracts/saveTheDateTemplates.ts. Structure calquée sur la page save the
 * date dédiée d'un vrai projet (cf. FairePart.tsx, branche `isStd` : hero
 * HeroScrub + footer léger, aucun corps de page) puisque c'est exactement
 * l'expérience que ce modèle donnera une fois un vrai projet créé à partir
 * de lui — seuls les prénoms/la date changeront alors.
 *
 * Paramétrée par `:slug` plutôt qu'un fichier par modèle : ajouter un
 * modèle n'exige de toucher que le catalogue de données, jamais ce
 * composant.
 */
export default function SaveTheDateTemplatePreview() {
  const { slug } = useParams<{ slug: string }>()
  // Textes/timings pilotables depuis Réglages → Modèles Save the Date, cf.
  // doc de contracts/saveTheDateTemplates.ts.
  const overridesQ = trpc.settings.get.useQuery({ key: 'saveTheDateTemplates' })
  const template = resolveSaveTheDateTemplate(slug, parseTemplateOverrides(overridesQ.data?.value))
  // Police du titre du hero (bibliothèque "mariage", cf. heroDecor.ts) —
  // appelé inconditionnellement (règle des hooks), no-op si `fontId` est
  // vide/absent.
  const heroFont = getHeroFont(template?.fontId)
  useGoogleFont(template?.fontId)

  useSeo({
    title: template ? `Modèle ${template.name} — Save the Date · Scroll The Date` : 'Modèle introuvable · Scroll The Date',
    description: template?.description ?? '',
    path: `/save-the-date-modeles/${slug ?? ''}`,
  })

  if (!template) {
    return (
      <section className="mx-auto max-w-lg px-6 py-32 text-center">
        <p className="font-display text-[26px] italic">Ce modèle n'existe pas (plus).</p>
        <Link
          to="/save-the-date-modeles"
          className="mt-6 inline-flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-terracotta-500 hover:text-terracotta-400"
        >
          <ArrowLeft size={14} />
          Retour aux modèles
        </Link>
      </section>
    )
  }

  return (
    <div style={{ background: template.theme.pageBg }}>
      <header className="absolute inset-x-0 top-0 z-40 flex items-center justify-between px-6 py-5">
        <Link
          to="/save-the-date-modeles"
          className="inline-flex items-center gap-2 rounded-full bg-black/25 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-sm transition-colors hover:bg-black/40"
        >
          <ArrowLeft size={13} />
          Modèles
        </Link>
        <Link to="/" aria-label="Scroll The Date — accueil" className="rounded-full bg-black/25 px-4 py-2 backdrop-blur-sm">
          <img src="/logo.svg" alt="Scroll The Date" className="h-6 w-auto brightness-0 invert" />
        </Link>
      </header>

      <ScrollHint />

      <HeroScrub
        theme={template.theme}
        chapters={template.chapters}
        video={{ desktopSrc: template.desktopSrc, posterSrc: template.posterSrc, frames: template.frames }}
        trackHeightVh={800}
        tailVh={100}
        ariaLabel={`Modèle Save the Date — ${template.name}`}
        overlayGraphic={template.overlayGraphic}
        fontFamily={heroFont?.fontFamily}
        textAnimation={template.textAnimation}
        filter={template.filter}
      />

      <footer className="bg-anthracite-950 px-6 py-16 text-center">
        <p className="font-display text-[26px] italic text-white sm:text-[32px]">{template.name}</p>
        <p className="mx-auto mt-3 max-w-md text-[14px] leading-[1.6] text-white/55">{template.description}</p>
        <p className="mx-auto mt-6 max-w-md text-[13px] leading-[1.6] text-white/40">
          Prix unique, quel que soit le nombre d'invités. Vos prénoms et votre date remplacent ceux de l'exemple —
          votre page est prête en quelques minutes.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            to={`/commander?produit=save-the-date&modele=${template.slug}`}
            className="inline-flex items-center gap-2 rounded-full bg-terracotta-500 px-8 py-3.5 text-[13px] font-semibold uppercase tracking-[0.1em] text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400 active:scale-[0.97]"
          >
            Commander ce modèle — {formatEuros(TEMPLATE_PRICE_CENTS)}
          </Link>
          <a
            href="https://wa.me/33600000000"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.1em] text-white/70 transition-colors hover:text-white"
          >
            <MessageCircle size={15} />
            Une question ?
          </a>
        </div>
        <Link
          to="/save-the-date-modeles"
          className="mt-6 inline-block text-[12px] font-medium text-white/40 transition-colors hover:text-white/70"
        >
          Voir les autres modèles
        </Link>
      </footer>
    </div>
  )
}
