/**
 * Section photos — skill Étape 5.B.2 : zone prévue dans le template, mais
 * gardée vide/masquée tant qu'aucune photo n'est livrée par le couple (cf.
 * instructions §2.B.2 : « non fournie par ce couple dans le test »). Se
 * contente de ne rien afficher plutôt que de laisser un bloc vide — dès que
 * des photos arrivent, c'est ici, dans le corps après le hero, qu'elles
 * vivent (jamais dans le hero scrub).
 */
export default function PhotosSection({
  photos = [],
  bg = '#FBF7F1',
}: {
  photos?: { src: string; alt: string }[]
  /** Fond de section — dérivé du thème du couple, cf. PayloadSection.PayloadTheme. */
  bg?: string
}) {
  if (photos.length === 0) return null

  return (
    <section className="px-6 pb-24 lg:pb-32" style={{ background: bg }} aria-label="Photos">
      <div className="mx-auto grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-3">
        {photos.map((photo) => (
          <img
            key={photo.src}
            src={photo.src}
            alt={photo.alt}
            className="aspect-[3/4] w-full rounded-xl object-cover"
          />
        ))}
      </div>
    </section>
  )
}
