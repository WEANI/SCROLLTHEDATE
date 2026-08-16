import { useEffect } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, Clock3, Info, MapPin, Shirt } from 'lucide-react'
import DemoBanner from '@/components/demo/DemoBanner'
import RsvpSection from '@/components/demo/RsvpSection'
import {
  COUPLE_INITIALS,
  COUPLE_NAMES,
  DRESS_CODE,
  LODGING_OPTIONS,
  PRACTICAL_INFO,
  SCHEDULE_ITEMS,
  VENUE_ADDRESS,
  VENUE_LOCATION,
  VENUE_NAME,
  WEDDING_DATE_SHORT,
} from '@/components/demo/demoContent'

/**
 * Page « infos complètes » — aperçu de l'option payante (30€) « Page
 * supplémentaire avec toutes les informations du mariage ». Accessible
 * depuis la section RSVP du hero scrub (lien discret au-dessus du bouton
 * « Confirmer ma présence »). Reprend la charte du nouveau hero (fond
 * #17130F/#1D1813, accent corail #C97A5C, Fraunces italique + Jost) plutôt
 * que l'ancien système de 3 templates (éditorial/cinéma/minimal) : une
 * seule page, cohérente avec le reste du faire-part démo.
 */
export default function DemoInfos() {
  useEffect(() => {
    document.title = 'Toutes les informations — Anna & Théo · Scroll The Date (démo)'
    return () => {
      document.title = 'Scroll The Date'
    }
  }, [])

  return (
    <div className="bg-[#17130F]">
      <DemoBanner />

      {/* En-tête */}
      <header className="mx-auto max-w-2xl px-6 pb-16 pt-36 text-center lg:pt-44">
        <Link
          to="/demo"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.1em] text-[#B8AC9C] transition-colors hover:text-[#C97A5C]"
        >
          <ArrowLeft size={13} /> Retour au faire-part
        </Link>
        <div className="mx-auto mt-8 flex h-14 w-14 items-center justify-center rounded-full border border-[#C97A5C] font-display text-[17px] italic text-[#C97A5C]">
          {COUPLE_INITIALS}
        </div>
        <h1 className="font-display mt-6 text-[clamp(2.2rem,5vw,3.2rem)] font-normal italic leading-[1.1] text-[#F5EEE4]">
          {COUPLE_NAMES}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[15px] font-light leading-[1.7] text-[#B8AC9C]">
          Ont l'honneur de vous convier à la cérémonie de leur mariage qui se déroulera
        </p>
        <p className="font-display mt-3 text-[clamp(1.4rem,3vw,1.8rem)] font-normal text-[#F5EEE4]">
          {WEDDING_DATE_SHORT}
        </p>
      </header>

      {/* Le lieu */}
      <InfoSection icon={MapPin} eyebrow="Le lieu" title={VENUE_NAME}>
        <p className="text-[15px] font-light leading-[1.8] text-[#B8AC9C]">
          {VENUE_LOCATION}
          <br />
          {VENUE_ADDRESS}
        </p>
      </InfoSection>

      {/* Déroulé — timeline verticale (ligne + puces reliant chaque temps fort). */}
      <InfoSection icon={Clock3} eyebrow="Déroulé" title="Le programme de la journée">
        <div className="relative mx-auto max-w-sm pl-9 text-left">
          <div className="absolute left-[7px] top-[7px] bottom-[7px] w-px bg-[rgba(255,244,232,0.14)]" aria-hidden />
          <div className="flex flex-col gap-9">
            {SCHEDULE_ITEMS.map((item) => (
              <div key={item.time} className="relative">
                <span
                  className="absolute -left-9 top-[3px] flex h-[15px] w-[15px] items-center justify-center rounded-full border-2 border-[#C97A5C] bg-[#17130F]"
                  aria-hidden
                />
                <span className="font-display block text-[17px] italic leading-none text-[#C97A5C]">
                  {item.time}
                </span>
                <span className="mt-1.5 block text-[14px] font-light text-[#F5EEE4]">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </InfoSection>

      {/* Dress code */}
      <InfoSection icon={Shirt} eyebrow="Dress code" title={DRESS_CODE.title}>
        <p className="text-[15px] font-light leading-[1.8] text-[#B8AC9C]">{DRESS_CODE.detail}</p>
      </InfoSection>

      {/* Hébergements */}
      <InfoSection icon={MapPin} eyebrow="Où loger" title="Hébergements suggérés">
        <div className="grid gap-3 sm:grid-cols-3">
          {LODGING_OPTIONS.map((lodging) => (
            <div
              key={lodging.name}
              className="rounded-xl border border-[rgba(255,244,232,0.08)] bg-[#241E17] px-5 py-5 text-left"
            >
              <p className="text-[14px] font-medium text-[#F5EEE4]">{lodging.name}</p>
              <p className="mt-1 text-[12px] uppercase tracking-[0.08em] text-[#C97A5C]">{lodging.distance}</p>
              <p className="mt-2 text-[13px] font-light leading-snug text-[#B8AC9C]">{lodging.note}</p>
            </div>
          ))}
        </div>
      </InfoSection>

      {/* Infos pratiques */}
      <InfoSection icon={Info} eyebrow="À savoir" title="Infos pratiques">
        <ul className="flex flex-col gap-3 text-left">
          {PRACTICAL_INFO.map((line) => (
            <li key={line} className="flex gap-3 text-[14px] font-light leading-[1.7] text-[#B8AC9C]">
              <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-[#C97A5C]" aria-hidden />
              {line}
            </li>
          ))}
        </ul>
      </InfoSection>

      {/* RSVP — même formulaire que sur le faire-part */}
      <RsvpSection showInfosLink={false} />
    </div>
  )
}

function InfoSection({
  icon: Icon,
  eyebrow,
  title,
  children,
}: {
  icon: typeof MapPin
  eyebrow: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="border-t border-[rgba(255,244,232,0.06)] px-6 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#C97A5C]/10 text-[#C97A5C]">
          <Icon size={16} />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#C97A5C]">{eyebrow}</p>
        <h2 className="font-display mt-3 mb-6 text-[clamp(1.4rem,3vw,1.8rem)] font-normal text-[#F5EEE4]">
          {title}
        </h2>
        {children}
      </div>
    </section>
  )
}
