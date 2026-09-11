import { useRef, useState } from 'react'
import type { SyntheticEvent } from 'react'
import { Link } from 'react-router'
import { Play } from 'lucide-react'
import { trpc } from '@/providers/trpc'
import { useSeo } from '@/hooks/useSeo'
import { parseTemplateOverrides, resolveSaveTheDateTemplates } from '@contracts/saveTheDateTemplates'

/**
 * Durée de l'aperçu en boucle sur la carte — volontairement court (cf.
 * échange du 12/09/2026) : donne juste un avant-goût plutôt que la vidéo
 * complète (40-60 s, se rebouclerait de toute façon), et incite à cliquer
 * "Voir le modèle" pour découvrir la suite en plein écran.
 */
const CARD_PREVIEW_SECONDS = 5

/**
 * Bibliothèque de modèles Save the Date « sur un modèle » (99 €, cf.
 * SaveTheDateDigital.tsx) — index public des montages déjà prêts, cf. doc
 * de contracts/saveTheDateTemplates.ts pour le contexte complet. Reste dans
 * le Layout public (Navbar/Footer), même principe que DemoFairePart.tsx :
 * un sommaire qui renvoie vers l'aperçu plein écran de chaque modèle
 * (SaveTheDateTemplatePreview.tsx), pas un modèle en lui-même.
 *
 * Volontairement pas de bouton "Commander" sur les cartes — cf. doc du
 * fichier de données, la commande d'un modèle précis n'est pas encore
 * câblée dans /commander.
 */
export default function SaveTheDateTemplates() {
  useSeo({
    title: 'Modèles Save the Date — Scroll The Date',
    description:
      "La bibliothèque de modèles Save the Date Scroll The Date : des montages déjà prêts, où seuls vos prénoms et votre date changent.",
    path: '/save-the-date-modeles',
  })

  // Textes/timings pilotables depuis Réglages → Modèles Save the Date (cf.
  // doc de contracts/saveTheDateTemplates.ts) — repli silencieux sur les
  // défauts codés en dur tant que la requête n'a pas répondu ou si aucune
  // surcharge n'a jamais été enregistrée.
  const overridesQ = trpc.settings.get.useQuery({ key: 'saveTheDateTemplates' })
  const templates = resolveSaveTheDateTemplates(parseTemplateOverrides(overridesQ.data?.value))

  return (
    <section className="mx-auto max-w-[1100px] px-6 pb-32 pt-16 sm:pt-20">
      <p className="text-center text-[12px] uppercase tracking-[0.18em] text-terracotta-300">Sur un modèle</p>
      <h1 className="mt-4 text-center font-display text-[34px] italic leading-[1.1] sm:text-[54px]">
        Les modèles Save the Date
      </h1>
      <p className="mx-auto mt-4 max-w-[520px] text-center text-[15px] leading-[1.6] text-neutral-500">
        Un montage déjà prêt, où seuls vos prénoms et votre date changent — parcourez-les comme le feraient vos
        invités. D'autres modèles arrivent régulièrement.
      </p>

      <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((tpl) => (
          <TemplateCard key={tpl.slug} slug={tpl.slug} name={tpl.name} tagline={tpl.tagline} accent={tpl.theme.accent} posterSrc={tpl.posterSrc} videoSrc={tpl.desktopSrc} />
        ))}

        {/* Case vide — annonce explicitement que la bibliothèque grandit, plutôt que de laisser une grille qui semble juste incomplète. */}
        <div className="flex flex-col items-center justify-center gap-2 rounded-[20px] border border-dashed border-anthracite-700 p-8 text-center">
          <p className="font-display text-[15px] italic text-neutral-500">D'autres modèles bientôt</p>
          <p className="text-[13px] text-neutral-500">Écrivez-nous si vous avez une ambiance en tête.</p>
        </div>
      </div>
    </section>
  )
}

function TemplateCard({
  slug,
  name,
  tagline,
  accent,
  posterSrc,
  videoSrc,
}: {
  slug: string
  name: string
  tagline: string
  accent: string
  posterSrc: string
  videoSrc: string
}) {
  const [failed, setFailed] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Reboucle sur les CARD_PREVIEW_SECONDS premières secondes seulement —
  // cf. doc de la constante plus haut. `timeupdate` plutôt que `loop`
  // natif (qui rejouerait la vidéo entière) : on ne veut jamais montrer la
  // fin du montage ici, seulement un avant-goût.
  function handleTimeUpdate(e: SyntheticEvent<HTMLVideoElement>) {
    if (e.currentTarget.currentTime >= CARD_PREVIEW_SECONDS) {
      e.currentTarget.currentTime = 0
      void e.currentTarget.play()
    }
  }

  return (
    <Link
      to={`/save-the-date-modeles/${slug}`}
      className="group relative block overflow-hidden rounded-[20px] border border-anthracite-700 bg-anthracite-900 transition-all duration-300 ease-out hover:-translate-y-1"
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = accent)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = '')}
    >
      <div className="relative aspect-[9/16] w-full overflow-hidden bg-anthracite-950">
        {!failed ? (
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            src={videoSrc}
            poster={posterSrc}
            autoPlay
            muted
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onError={() => setFailed(true)}
          />
        ) : (
          <img src={posterSrc} alt="" className="h-full w-full object-cover" loading="lazy" />
        )}
        <span
          className="absolute inset-x-0 top-0 h-[3px] opacity-85 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: accent }}
          aria-hidden
        />

        {/* Voile + bouton "aperçu" — toujours visible (pas seulement au
            survol, absent sur tactile) : signale d'emblée que ce n'est
            qu'un avant-goût et qu'il y a plus à voir en cliquant. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end bg-gradient-to-t from-black/70 via-black/0 to-black/0 pb-5 opacity-90 transition-opacity duration-300 group-hover:opacity-100">
          <span
            className="flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-sm transition-transform duration-300 group-hover:scale-110"
            style={{ background: `${accent}E6` }}
          >
            <Play size={16} className="ml-0.5 text-white" fill="currentColor" />
          </span>
          <span className="mt-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/90">
            Voir le modèle en entier
          </span>
        </div>
      </div>
      <div className="p-6">
        <p className="font-display text-[22px] italic leading-[1.15]">{name}</p>
        <p className="mt-1.5 text-[13px] text-neutral-500">{tagline}</p>
        <span className="mt-5 inline-flex items-center gap-2 text-[13px] font-medium">
          Voir le modèle
          <span
            className="transition-transform duration-300 group-hover:translate-x-1"
            style={{ color: accent }}
            aria-hidden
          >
            →
          </span>
        </span>
      </div>
    </Link>
  )
}
