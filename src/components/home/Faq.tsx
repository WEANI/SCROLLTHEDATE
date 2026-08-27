import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MessageCircle, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

const FAQ_ITEMS = [
  {
    q: 'Combien de temps pour recevoir notre faire-part ?',
    a: "Comptez environ 21 jours entre votre questionnaire complété et la livraison. Vous validez un scénario, puis une version filigrane de la vidéo avant la version finale — rien ne part sans votre accord.",
  },
  {
    q: 'Et si la vidéo ne me plaît pas ?',
    a: "C'est justement pour ça que vous validez d'abord un scénario parmi plusieurs propositions, puis une version filigrane. Des retouches sont incluses. Nous ajustons jusqu'à ce que ce soit vous.",
  },
  {
    q: "Combien d'invités peuvent recevoir le faire-part ?",
    a: "Autant que vous voulez. Le lien est illimité et le prix est unique, que vous invitiez 20 ou 300 personnes. Partagez-le par WhatsApp, SMS, email ou QR code sur vos supports papier.",
  },
  {
    q: 'Puis-je modifier le faire-part après livraison ?',
    a: "Oui. Date, lieu, programme, hébergements : les informations pratiques restent modifiables depuis votre espace client jusqu'au jour J. Les changements sont en ligne instantanément.",
  },
  {
    q: 'Comment se passent les RSVP ?',
    a: "Vos invités répondent directement sur le faire-part : présence, accompagnants, allergies, même leur chanson pour la soirée. Vous suivez les réponses en temps réel dans votre espace client.",
  },
]

/** FAQ — 2 colonnes : titre + CTA WhatsApp / accordéon 6 questions. */
export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="bg-anthracite-900 py-32 lg:py-44">
      <div className="mx-auto grid max-w-[1440px] gap-16 px-6 lg:grid-cols-[40fr_60fr] lg:px-12">
        <div>
          <p className="mb-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-300">
            FAQ
          </p>
          <h2 className="font-display text-[clamp(2.4rem,5vw,4.5rem)] font-light leading-[1.05] tracking-[-0.015em] text-white">
            Vos <em className="italic text-terracotta-300">questions</em>.
          </h2>
          <p className="mt-6 max-w-sm text-[15px] leading-[1.65] text-white/60">
            Une question plus précise sur votre projet ? Notre équipe répond en personne,
            généralement dans l'heure.
          </p>
          <a
            href="https://wa.me/33600000000"
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-flex items-center gap-2 rounded-full border border-anthracite-700 px-6 py-3 text-[13px] font-semibold uppercase tracking-[0.1em] text-white transition-all hover:-translate-y-0.5 hover:border-terracotta-500 hover:text-terracotta-300"
          >
            <MessageCircle size={16} className="text-terracotta-500" />
            Discuter sur WhatsApp
          </a>
        </div>

        <motion.ul
          className="flex flex-col"
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-15%' }}
        >
          {FAQ_ITEMS.map((item, i) => {
            const open = openIndex === i
            return (
              <motion.li
                key={item.q}
                variants={{
                  hidden: { y: 24, opacity: 0 },
                  show: { y: 0, opacity: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
                }}
                className="border-b border-anthracite-700 first:border-t"
              >
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenIndex(open ? null : i)}
                  className="flex w-full items-center justify-between gap-6 py-6 text-left"
                >
                  <span
                    className={cn(
                      'font-display text-xl font-normal transition-colors lg:text-2xl',
                      open ? 'text-terracotta-300' : 'text-white',
                    )}
                  >
                    {item.q}
                  </span>
                  <motion.span
                    animate={{ rotate: open ? 45 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-anthracite-700 text-terracotta-500"
                  >
                    <Plus size={16} />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-2xl pb-7 text-[15px] leading-[1.65] text-white/65">{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            )
          })}
        </motion.ul>
      </div>
    </section>
  )
}
