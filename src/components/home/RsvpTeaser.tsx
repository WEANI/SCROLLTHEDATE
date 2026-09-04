import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

const RECEIVED = [
  { label: 'Présence', text: 'oui, non — précisée par invités.' },
  { label: 'Adultes et enfants', text: 'le nombre exact, pour adapter tables et plan de salle.' },
  { label: 'Allergies et régimes', text: 'un champ libre, rempli par chaque invité lui-même.' },
  { label: 'Un mot pour vous', text: 'félicitations et petits messages reçus avec chaque réponse.' },
]

const AFTER = [
  {
    title: 'Un tableau de bord toujours à jour',
    text: 'Les réponses s’y rangent en direct. Vous le consultez quand vous voulez, sans rien faire.',
  },
  {
    title: 'Un export en un clic',
    text: 'Le tableau complet, prêt à transmettre à votre traiteur ou à votre lieu de réception.',
  },
  {
    title: 'Des relances écrites pour vous',
    text: 'Les invités sans réponse reçoivent un rappel par email. Vous n’avez rien à rédiger.',
  },
]

/** RSVP — argument différenciant, juste au-dessus de « Nos offres ». */
export default function RsvpTeaser() {
  return (
    <section className="grain bg-anthracite-950 py-32 lg:py-44">
      <motion.div
        className="mx-auto max-w-[1440px] px-6 lg:px-12"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-15%' }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
      >
        <motion.p
          variants={{ hidden: { y: 16, opacity: 0 }, show: { y: 0, opacity: 1, transition: { duration: 0.6 } } }}
          className="mb-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-300"
        >
          RSVP
        </motion.p>
        <motion.h2
          variants={{ hidden: { y: 24, opacity: 0 }, show: { y: 0, opacity: 1, transition: { duration: 0.7 } } }}
          className="font-display max-w-2xl text-[clamp(2.4rem,5vw,4.5rem)] font-light leading-[1.05] tracking-[-0.015em] text-white"
        >
          Gestion <em className="italic text-terracotta-300">rapide</em> des réponses des invités
        </motion.h2>
        <motion.p
          variants={{ hidden: { y: 16, opacity: 0 }, show: { y: 0, opacity: 1, transition: { duration: 0.7 } } }}
          className="mt-6 max-w-xl text-[15px] leading-[1.65] text-white/60"
        >
          Vos invités répondent depuis votre lien, en deux clics. Vous recevez le tableau à jour,
          réponse après réponse, tout se range au fur et à mesure.
        </motion.p>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <motion.div
            variants={{
              hidden: { y: 32, opacity: 0 },
              show: { y: 0, opacity: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
            }}
            className="rounded-lg bg-anthracite-800 p-8 lg:p-10"
          >
            <p className="font-display text-2xl font-medium text-white">
              Les informations pour chaque invité
            </p>
            <ul className="mt-6 flex flex-col gap-4">
              {RECEIVED.map((item) => (
                <li key={item.label} className="flex items-start gap-3 text-[14.5px] leading-[1.6] text-white/70">
                  <Check size={16} className="mt-1 shrink-0 text-terracotta-500" />
                  <span>
                    <span className="font-semibold text-white">{item.label}</span> — {item.text}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            variants={{
              hidden: { y: 32, opacity: 0 },
              show: { y: 0, opacity: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay: 0.1 } },
            }}
            className="rounded-lg bg-anthracite-800 p-8 lg:p-10"
          >
            <p className="font-display text-2xl font-medium text-white">Depuis votre tableau de bord</p>
            <div className="mt-6 flex flex-col gap-6">
              {AFTER.map((item) => (
                <div key={item.title}>
                  <p className="text-[15px] font-semibold text-white">{item.title}</p>
                  <p className="mt-1 text-[14.5px] leading-[1.6] text-white/60">{item.text}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  )
}
