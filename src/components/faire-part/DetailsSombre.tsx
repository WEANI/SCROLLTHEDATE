import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * DetailsSombre — bloc « détails » du faire-part en thème sombre (noir/
 * rouge, cohérent avec l'enveloppe + le sceau de cire de l'intro), rendu à
 * la place de la pile de cartes Date/Heure/Lieu/Dress code/Hébergements
 * par défaut de `PayloadSection` (cf. son prop `children`, qui fournit
 * `openRsvp` pour rouvrir le même Dialog RSVP). Adapté du fichier fourni
 * par le client (faire-part-details-theme-sombre.html) — structure et
 * rythme visuel conservés (filets décoratifs, compte à rebours, frise du
 * programme), converti en classes Tailwind + couleurs pilotées par
 * `theme` plutôt que les `:root` CSS de la démo, pour rester cohérent avec
 * le reste du projet (cf. PayloadTheme/ClosingTheme). Couleurs par défaut
 * reprises de CINEMA_ROUGE_THEME/PAYLOAD_THEME (leaOlivierContent.ts)
 * plutôt que la palette de la démo autonome — un seul rouge sur la page,
 * pas deux nuances proches.
 *
 * Sections rendues uniquement si leurs données sont fournies (`programme`,
 * `dressCode`, `lodging`) — jamais de contenu inventé. Un filet décoratif
 * précède chaque section VISIBLE (calculé sur un tableau `blocks`, pas des
 * `<Divider />` placés à la main) pour ne jamais laisser un double-filet si
 * une section est absente.
 *
 * Rythme vertical : chaque bloc (date+compte à rebours, Le Lieu, chaque
 * section optionnelle, RSVP) est rendu SANS marge externe — c'est le filet
 * qui porte, seul, tout l'espacement entre deux blocs, à parts égales
 * au-dessus et en dessous (`my-14`). Ce choix délibéré est ce qui garde le
 * filet visuellement centré entre les sections : un espacement ad hoc
 * différent au-dessus/en dessous de chaque bloc l'aurait décentré (c'était
 * le bug avant ce commentaire — mb-8 sur le filet + marges internes
 * disparates sur les blocs). Espacement volontairement généreux (112px de
 * bloc à bloc) pour un rendu plus épuré — proche du fichier fourni par le
 * client (108px).
 *
 * IMPORTANT — `programme` : la frise horaire (Accueil/Cérémonie/Cocktail/
 * Dîner/Soirée…) n'existe pas encore dans le modèle de données. Ne rien
 * inventer ici : la section reste masquée tant qu'aucun `programme` n'est
 * fourni. cf. le schéma proposé en commentaire au-dessus de `ProgrammeItem`
 * ci-dessous pour l'ajouter proprement (question `list` générique,
 * infra déjà existante côté questionnaire — aucune migration DB requise).
 */

/**
 * Schéma proposé pour « Le Programme » (pas encore implémenté) :
 * ajouter une question `{ id: 'jourj.programme', step: 3, type: 'list',
 * label: 'Programme de la journée', help: 'Un moment par ligne — Horaire —
 * Titre — Détail (optionnel), ex. 16h00 — Cérémonie — Au jardin',
 * showOnInvite: true }` au template de formulaire actif (via Admin →
 * Formulaires, aucun code ni migration nécessaire : `formTemplates.
 * questions` est déjà un jsonb éditable, et le type "list" a déjà son UI
 * de saisie répétable côté client comme côté admin — cf. jourj.hebergements
 * pour le même pattern). Les réponses arriveraient comme `string[]`, un
 * élément par ligne au format "Horaire — Titre — Détail", à parser avec
 * `parseProgrammeItem` ci-dessous côté `getPublicInvite` avant de les
 * passer en `programme` ici.
 */
export type ProgrammeItem = { time: string; label: string; sub?: string }

/** Parse un élément de liste "16h00 — Cérémonie — Au jardin" (sub optionnel). */
export function parseProgrammeItem(raw: string): ProgrammeItem {
  const [time = '', label = '', ...rest] = raw.split(' — ').map((s) => s.trim())
  return { time, label, sub: rest.join(' — ') || undefined }
}

export interface DetailsSombreTheme {
  ink: string
  inkSoft: string
  accent: string
  line: string
}

const DEFAULT_DETAILS_THEME: DetailsSombreTheme = {
  ink: '#F5EFEA',
  inkSoft: '#BBAFA9',
  accent: '#8B1E28',
  line: 'rgba(247, 241, 236, 0.14)',
}

function Divider({ color }: { color: string }) {
  return (
    <div className="my-14 flex items-center justify-center gap-2.5" style={{ color }} aria-hidden>
      <span className="h-px max-w-24 flex-1" style={{ background: `linear-gradient(to right, transparent, currentColor 45%, currentColor 55%, transparent)` }} />
      <span className="h-[5px] w-[5px] rotate-45" style={{ background: 'currentColor' }} />
      <span className="h-[9px] w-[9px] rotate-45" style={{ background: 'currentColor' }} />
      <span className="h-[5px] w-[5px] rotate-45" style={{ background: 'currentColor' }} />
      <span className="h-px max-w-24 flex-1" style={{ background: `linear-gradient(to left, transparent, currentColor 45%, currentColor 55%, transparent)` }} />
    </div>
  )
}

function SectionLabel({ children, accent }: { children: ReactNode; accent: string }) {
  return (
    <p className="mb-7 text-center text-[19px] italic" style={{ color: accent }}>
      {children}
    </p>
  )
}

function useCountdown(targetMs: number) {
  const compute = () => {
    const diff = Math.max(0, targetMs - Date.now())
    return {
      d: Math.floor(diff / 86400000),
      h: Math.floor((diff % 86400000) / 3600000),
      m: Math.floor((diff % 3600000) / 60000),
      s: Math.floor((diff % 60000) / 1000),
    }
  }
  const [parts, setParts] = useState(compute)

  useEffect(() => {
    const id = window.setInterval(() => setParts(compute()), 1000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetMs])

  return parts
}

export default function DetailsSombre({
  weddingDateTime,
  venueName,
  venueAddress,
  programme,
  dressCode,
  lodging,
  rsvpText = 'Nous serions honorés de vous compter parmi nous pour partager ce moment unique de notre vie.',
  rsvpCtaLabel = 'Répondre à l’invitation',
  openRsvp,
  theme,
}: {
  /** Date + heure ISO du mariage, ex "2026-08-15T16:00:00+02:00" — source unique pour le bloc date ET le compte à rebours. */
  weddingDateTime: string
  venueName: string
  venueAddress: string
  /** Frise horaire — absente tant qu'aucune vraie donnée n'existe, cf. schéma proposé en tête de fichier. Jamais de placeholder. */
  programme?: ProgrammeItem[]
  dressCode?: string
  lodging?: string[]
  rsvpText?: string
  rsvpCtaLabel?: string
  openRsvp: () => void
  theme?: Partial<DetailsSombreTheme>
}) {
  const t = { ...DEFAULT_DETAILS_THEME, ...theme }
  const targetMs = new Date(weddingDateTime).getTime()
  const date = new Date(weddingDateTime)
  const weekday = date.toLocaleDateString('fr-FR', { weekday: 'long' })
  const day = date.toLocaleDateString('fr-FR', { day: 'numeric' })
  const month = date.toLocaleDateString('fr-FR', { month: 'long' })
  const year = date.toLocaleDateString('fr-FR', { year: 'numeric' })
  const { d, h, m, s } = useCountdown(targetMs)
  const pad = (n: number) => String(n).padStart(2, '0')
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venueName} ${venueAddress}`)}`

  // Tous les blocs, dans l'ordre — chacun précédé d'un filet (cf. rendu
  // plus bas), aucune marge externe sur les blocs eux-mêmes (cf. doc en
  // tête de fichier). Les blocs optionnels ne sont ajoutés que si leurs
  // données sont réelles.
  const blocks: ReactNode[] = [
    <div key="date-countdown" className="text-center">
      <div className="flex items-center justify-center gap-3.5">
        <div className="flex-1 border-t pt-2" style={{ borderColor: t.line }}>
          <span className="text-[18px] uppercase tracking-[0.08em] capitalize" style={{ color: t.inkSoft }}>
            {weekday}
          </span>
        </div>
        <div className="font-display text-[54px] italic leading-none" style={{ color: t.ink }}>
          {day}
        </div>
        <div className="flex-1 border-t pt-2" style={{ borderColor: t.line }}>
          <span className="text-[18px] uppercase tracking-[0.08em] capitalize" style={{ color: t.inkSoft }}>
            {month}
          </span>
        </div>
      </div>
      <div className="mt-1.5 text-[19px]" style={{ color: t.inkSoft }}>
        {year}
      </div>

      <div
        className="mt-6 flex justify-center gap-2"
        aria-label={`Compte à rebours jusqu'au ${weekday} ${day} ${month} ${year}`}
      >
        {([
          [d, 'JOURS'],
          [h, 'HRS'],
          [m, 'MIN'],
          [s, 'SEC'],
        ] as const).map(([value, label], i) => (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && (
              <span className="self-center pb-5 text-xl" style={{ color: t.line }} aria-hidden>
                :
              </span>
            )}
            <div className="text-center">
              <div className="relative min-w-[58px] rounded-[5px] border px-1 py-2.5" style={{ borderColor: t.line, background: '#1a1211' }}>
                <span className="font-mono text-[26px] font-bold tracking-[2px]" style={{ color: t.accent }} aria-hidden>
                  {pad(value)}
                </span>
              </div>
              <div className="mt-1.5 font-mono text-[10px] tracking-[0.1em]" style={{ color: t.inkSoft }}>
                {label}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>,

    <section key="lieu">
      <SectionLabel accent={t.accent}>Le Lieu</SectionLabel>
      <p className="font-display mb-2.5 text-center text-[30px] italic" style={{ color: t.ink }}>
        {venueName}
      </p>
      <p className="mb-4.5 text-center text-[15px]" style={{ color: t.inkSoft }}>
        {venueAddress}
      </p>
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mx-auto block w-max rounded-full border px-[22px] py-2.5 text-center text-[12.5px]"
        style={{ borderColor: t.accent, color: t.ink }}
      >
        voir sur la carte
      </a>
    </section>,
  ]

  if (programme && programme.length > 0) {
    blocks.push(
      <section key="programme">
        <SectionLabel accent={t.accent}>Le Programme</SectionLabel>
        <ol className="ml-[9px] border-l-2 pl-[18px]" style={{ borderColor: t.line }}>
          {programme.map((item, i) => (
            <li key={i} className="relative pb-8 last:pb-0">
              <span
                className="absolute -left-[23px] top-1 h-[7px] w-[7px] rotate-45"
                style={{ background: t.accent }}
                aria-hidden
              />
              <p className="text-[18px] font-bold" style={{ color: t.ink }}>
                {item.time} — {item.label}
              </p>
              {item.sub && (
                <p className="mt-0.5 text-[14px]" style={{ color: t.inkSoft }}>
                  {item.sub}
                </p>
              )}
            </li>
          ))}
        </ol>
      </section>,
    )
  }
  if (dressCode) {
    blocks.push(
      <section key="dress-code">
        <SectionLabel accent={t.accent}>Dress code</SectionLabel>
        <p className="text-center text-[16px]" style={{ color: t.ink }}>
          {dressCode}
        </p>
      </section>,
    )
  }
  if (lodging && lodging.length > 0) {
    blocks.push(
      <section key="lodging">
        <SectionLabel accent={t.accent}>Hébergements</SectionLabel>
        <ul className="list-none p-0 text-center">
          {lodging.map((item) => (
            <li key={item} className="py-[5px] text-[15px]" style={{ color: t.inkSoft }}>
              <span style={{ color: t.accent }}>• </span>
              {item}
            </li>
          ))}
        </ul>
      </section>,
    )
  }

  blocks.push(
    <section key="rsvp">
      <SectionLabel accent={t.accent}>RSVP</SectionLabel>
      <p className="mb-4 text-center text-[15px] leading-[1.6]" style={{ color: t.inkSoft }}>
        {rsvpText}
      </p>
      <button
        type="button"
        onClick={openRsvp}
        className="mx-auto block w-max rounded-full px-[26px] py-3 text-[12.5px] font-semibold uppercase tracking-[0.04em] text-white"
        style={{ background: t.accent }}
      >
        {rsvpCtaLabel}
      </button>
    </section>,
  )

  return (
    <div className="mx-auto max-w-[420px] text-left">
      {blocks.map((block, i) => (
        <div key={i}>
          <Divider color={t.accent} />
          {block}
        </div>
      ))}
    </div>
  )
}
