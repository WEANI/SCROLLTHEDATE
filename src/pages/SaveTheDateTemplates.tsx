import { useState } from 'react'
import { Link } from 'react-router'
import { useSeo } from '@/hooks/useSeo'
import { SAVE_THE_DATE_TEMPLATES } from '@/data/saveTheDateTemplates'

/**
 * Bibliothèque de modèles Save the Date « sur un modèle » (99 €, cf.
 * SaveTheDateDigital.tsx) — index public des montages déjà prêts, cf. doc
 * de src/data/saveTheDateTemplates.ts pour le contexte complet. Reste dans
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
        {SAVE_THE_DATE_TEMPLATES.map((tpl) => (
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
            className="h-full w-full object-cover"
            src={videoSrc}
            poster={posterSrc}
            autoPlay
            muted
            loop
            playsInline
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
