import { Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/i18n/LanguageContext'

/**
 * RSVP — « le tableau de bord » (proposition A, choisie le 26/10/2026) : une
 * maquette statique de ce que reçoivent les mariés, avec trois repères
 * numérotés et leur légende. Volontairement sans animation : le côté invité
 * est déjà montré par « Surprenez vos invités ».
 *
 * Tout ce qui est montré existe vraiment dans l'espace client (compteurs,
 * tableau des réponses, export CSV). Noms et chiffres : exemples fictifs,
 * signalés comme tels. L'ancienne promesse de relances par e-mail a été
 * retirée — la fonctionnalité n'existe pas.
 */

type Row = { name: string; yes: boolean; adults: string; kids: string; allergyKey: string; noteKey: string }
const ROWS: Row[] = [
  { name: 'Sarah Lopez', yes: true, adults: '2', kids: '1', allergyKey: 'nuts', noteKey: 'note1' },
  { name: 'Famille Benali', yes: true, adults: '2', kids: '2', allergyKey: '', noteKey: 'note2' },
  { name: 'Thomas Nguyen', yes: false, adults: '—', kids: '—', allergyKey: '', noteKey: 'note3' },
  { name: 'Inès Morel', yes: true, adults: '1', kids: '0', allergyKey: 'veggie', noteKey: 'note4' },
]

function Marker({ n, className }: { n: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'mr-1.5 inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-terracotta-500 align-middle text-[10.5px] font-semibold tracking-normal text-white',
        className,
      )}
    >
      {n}
    </span>
  )
}

export default function RsvpTeaser() {
  const { t } = useLanguage()
  const k = (key: string) => t(`home.rsvpTeaser.${key}`)

  const TILES = [
    { label: k('tilePresent'), value: '86', on: true },
    { label: k('tileAbsent'), value: '12' },
    { label: k('tilePending'), value: '24' },
    { label: k('tileKids'), value: '9' },
  ]

  return (
    <section id="rsvp" aria-labelledby="rsvp-title" className="grain bg-anthracite-950 py-28 lg:py-40">
      <div className="mx-auto max-w-[1180px] px-6 lg:px-12">
        <div className="grid items-end gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-300">{k('kicker')}</p>
            <h2 id="rsvp-title" className="font-display mt-5 text-[clamp(2.2rem,4.6vw,3.8rem)] font-light leading-[1.06] tracking-[-0.015em] text-white">
              {k('titleLead')} <em className="italic text-terracotta-300">{k('titleEm')}</em>
            </h2>
          </div>
          <p className="max-w-[34rem] text-[15.5px] leading-[1.7] text-white/60">{k('intro')}</p>
        </div>

        {/* Maquette du tableau de bord */}
        <div className="mt-14 overflow-hidden rounded-[14px] bg-[#FBF8F3] text-[#2B2420] shadow-[0_40px_90px_-40px_rgba(0,0,0,0.8)]">
          <div className="flex items-center gap-2 border-b border-black/5 bg-[#EFE9E0] px-4 py-3">
            <i className="h-2.5 w-2.5 rounded-full bg-[#D9CFC2]" />
            <i className="h-2.5 w-2.5 rounded-full bg-[#D9CFC2]" />
            <i className="h-2.5 w-2.5 rounded-full bg-[#D9CFC2]" />
            <span className="ml-2.5 text-[12px] text-[#8A7B6E]">{k('dashBar')}</span>
          </div>
          <div className="p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-display text-2xl">Anna &amp; Théo</p>
                <p className="mt-1 text-[12.5px] text-[#8A7B6E]">{k('dashDate')}</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#2B2420] px-4 py-2.5 text-[12px] font-semibold tracking-[0.04em] text-white">
                <Marker n={3} className="mr-0" />
                <Download size={14} aria-hidden />
                {k('export')}
              </span>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-3.5">
              {TILES.map((tile) => (
                <div key={tile.label} className="rounded-[10px] border border-black/5 bg-white p-4">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-[#8A7B6E]">{tile.label}</p>
                  <p className={cn('font-display mt-2 text-[38px] font-light leading-none', tile.on && 'text-terracotta-500')}>{tile.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 overflow-x-auto rounded-[10px] border border-black/5 bg-white">
              <table className="w-full min-w-[300px] border-collapse text-left text-[13.5px]">
                <thead>
                  <tr className="whitespace-nowrap bg-[#F6F1EA] text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8A7B6E]">
                    <th className="px-3.5 py-3">{k('colGuest')}</th>
                    <th className="px-3.5 py-3"><Marker n={1} />{k('colAnswer')}</th>
                    <th className="px-3.5 py-3 max-md:hidden">{k('colAdults')}</th>
                    <th className="px-3.5 py-3 max-md:hidden">{k('colKids')}</th>
                    <th className="px-3.5 py-3"><Marker n={2} />{k('colAllergies')}</th>
                    <th className="px-3.5 py-3 max-lg:hidden">{k('colNote')}</th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row) => (
                    <tr key={row.name} className="border-t border-black/5">
                      <td className="px-3.5 py-3">{row.name}</td>
                      <td className="px-3.5 py-3">
                        <span
                          className={cn(
                            'inline-block rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold',
                            row.yes ? 'bg-terracotta-500/15 text-[#A9533F]' : 'bg-neutral-200 text-neutral-600',
                          )}
                        >
                          {row.yes ? k('yes') : k('no')}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 max-md:hidden">{row.adults}</td>
                      <td className="px-3.5 py-3 max-md:hidden">{row.kids}</td>
                      <td className="px-3.5 py-3">{row.allergyKey ? k(`allergy_${row.allergyKey}`) : '—'}</td>
                      <td className="px-3.5 py-3 italic text-[#6E6056] max-lg:hidden">{k(row.noteKey)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Légende des repères */}
        <ol className="mt-7 grid gap-3 md:grid-cols-3 md:gap-4">
          {[k('legend1'), k('legend2'), k('legend3')].map((text, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[14px] text-white/65">
              <span aria-hidden className="inline-flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-terracotta-500 text-[11px] font-semibold text-white">
                {i + 1}
              </span>
              {text}
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[11px] tracking-[0.04em] text-white/40">{k('example')}</p>
      </div>
    </section>
  )
}
