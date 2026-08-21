import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'

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
 * Reveal au scroll : chaque bloc se déclenche une fois, individuellement,
 * quand il entre dans le viewport (IntersectionObserver via
 * `useRevealOnScroll`, même mécanique que `PhotoSplitCinematique` juste
 * au-dessus dans le corps de page). À l'intérieur d'un bloc, ses éléments
 * apparaissent en cascade (fondu + léger glissement vers le haut, cf.
 * `staggerStyle`) plutôt que tous d'un coup — un bloc à un seul élément
 * (ex. Dress code) dégénère naturellement en simple fondu, pas de cas
 * particulier à gérer. Respecte `prefers-reduced-motion` : le contenu
 * apparaît directement, sans cascade.
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

/** Déclenche `revealed` une seule fois, quand `ref` entre dans le viewport — cf. le même hook dans PhotoSplitCinematique. */
function useRevealOnScroll(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [revealed, setRevealed] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (reducedMotion) {
      setRevealed(true)
      return
    }
    const el = ref.current
    if (!el || revealed) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setRevealed(true)
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [revealed, threshold, reducedMotion])

  return { ref, revealed, reducedMotion }
}

/**
 * Style d'un élément à l'index `i` d'une cascade — fondu + léger glissement
 * vers le haut, retardé de `i * stepMs`. `i=0` seul (bloc sans liste
 * interne, ex. Dress code) se comporte comme un simple fondu.
 */
function staggerStyle(i: number, revealed: boolean, reducedMotion: boolean, stepMs = 90): CSSProperties {
  if (reducedMotion) return {}
  return {
    opacity: revealed ? 1 : 0,
    transform: revealed ? 'translateY(0)' : 'translateY(14px)',
    transition: 'opacity 0.6s cubic-bezier(0.22,1,0.36,1), transform 0.6s cubic-bezier(0.22,1,0.36,1)',
    transitionDelay: `${i * stepMs}ms`,
  }
}

/** Porte l'IntersectionObserver d'un bloc et fournit `revealed`/`reducedMotion` à son contenu, pour que ses éléments internes puissent cascader. */
function RevealBlock({ children }: { children: (revealed: boolean, reducedMotion: boolean) => ReactNode }) {
  const { ref, revealed, reducedMotion } = useRevealOnScroll()
  return <div ref={ref}>{children(revealed, reducedMotion)}</div>
}

/** Bronze du cachet de cire de l'ouverture (charte FELICITI) — réutilisé comme 3e couleur des confettis, pas une couleur inventée pour l'occasion. */
const CONFETTI_GOLD = '#A6845C'

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace('#', '')
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Explosion de confettis carrés depuis le centre de `originEl` — physique
 * simple en JS (gravité + rotation + fondu), frame-rate indépendante (delta
 * temps réel, pas un compte de frames). Nœuds DOM créés/animés/retirés en
 * dehors de React (transitoire, ~1,1s, pas d'intérêt à passer par un
 * re-render) — pattern déjà établi dans ce fichier pour tout ce qui est
 * purement visuel et jetable.
 */
function spawnConfetti(originEl: HTMLElement, colors: string[]) {
  const rect = originEl.getBoundingClientRect()
  const originX = rect.left + rect.width / 2
  const originY = rect.top + rect.height / 2
  const COUNT = 32
  const DURATION = 1100
  const GRAVITY = 900 // px/s²

  const container = document.createElement('div')
  container.style.cssText = 'position:fixed; inset:0; pointer-events:none; z-index:9999; overflow:hidden;'
  document.body.appendChild(container)

  const particles = Array.from({ length: COUNT }, () => {
    const angle = Math.random() * Math.PI * 2
    const speed = 160 + Math.random() * 260
    const size = 6 + Math.random() * 6
    const el = document.createElement('div')
    el.style.cssText = `position:absolute; width:${size}px; height:${size}px; background:${
      colors[Math.floor(Math.random() * colors.length)]
    }; left:${originX}px; top:${originY}px; will-change:transform,opacity;`
    container.appendChild(el)
    return {
      x: 0,
      y: 0,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 200, // biais vers le haut à l'explosion, avant que la gravité reprenne
      rot: Math.random() * 360,
      vrot: (Math.random() - 0.5) * 720, // deg/s
      el,
    }
  })

  const start = performance.now()
  let last = start

  function frame(now: number) {
    const dt = Math.min(0.032, (now - last) / 1000)
    last = now
    const t = (now - start) / DURATION
    if (t >= 1) {
      container.remove()
      return
    }
    for (const p of particles) {
      p.vy += GRAVITY * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.rot += p.vrot * dt
      p.el.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${p.rot}deg)`
      p.el.style.opacity = String(Math.max(0, 1 - t))
    }
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

/**
 * Bouton RSVP magnétique + halo + confettis — desktop uniquement
 * (`hover: hover` et `pointer: fine`, vérifié une fois au montage) : sur
 * tactile, un bouton qui suit un curseur qui n'existe pas n'a pas de sens,
 * et une magnétisation ratée sur un doigt donnerait un bouton qui « fuit »
 * au tap. Sur tactile, le bouton reste un bouton normal — les confettis,
 * eux, se déclenchent partout (au clic comme au tap).
 *
 * Magnétisme : distance curseur↔centre du bouton mesurée à chaque
 * mousemove sur `window` (le rayon de 120px dépasse la taille du bouton,
 * il faut donc écouter plus large que le bouton lui-même) ; dans le rayon,
 * translation = décalage × 0,35 (proportionnelle à la distance, sans
 * transition — suivi instantané) ; hors rayon, translation ramenée à zéro
 * *avec* une transition à easing « back out » (dépasse légèrement puis
 * revient) pour le retour élastique demandé.
 */
function RsvpButton({ label, accent, onClick }: { label: string; accent: string; onClick: () => void }) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const [magnet, setMagnet] = useState({ x: 0, y: 0, active: false, snap: true })

  useEffect(() => {
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    if (!canHover) return

    const RADIUS = 120
    const PULL = 0.35

    const onMove = (e: MouseEvent) => {
      const btn = btnRef.current
      if (!btn) return
      const rect = btn.getBoundingClientRect()
      const dx = e.clientX - (rect.left + rect.width / 2)
      const dy = e.clientY - (rect.top + rect.height / 2)
      const dist = Math.hypot(dx, dy)
      if (dist <= RADIUS) {
        setMagnet({ x: dx * PULL, y: dy * PULL, active: true, snap: false })
      } else {
        setMagnet({ x: 0, y: 0, active: false, snap: true })
      }
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const handleClick = () => {
    if (btnRef.current) spawnConfetti(btnRef.current, [accent, '#F5EFEA', CONFETTI_GOLD])
    onClick()
  }

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={handleClick}
      className="mx-auto block w-max rounded-full px-[26px] py-3 text-[12.5px] font-semibold uppercase tracking-[0.04em] text-white"
      style={{
        background: accent,
        transform: `translate(${magnet.x}px, ${magnet.y}px)`,
        transition: magnet.snap
          ? 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.35s ease'
          : 'box-shadow 0.35s ease',
        boxShadow: magnet.active ? `0 0 42px 8px ${hexToRgba(accent, 0.5)}` : `0 0 0 0 ${hexToRgba(accent, 0)}`,
      }}
    >
      {label}
    </button>
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

  // Tous les blocs, dans l'ordre — chacun précédé d'un filet et rendu dans
  // son propre RevealBlock (cf. rendu plus bas), aucune marge externe sur
  // les blocs eux-mêmes (cf. doc en tête de fichier). Les blocs optionnels
  // ne sont ajoutés que si leurs données sont réelles. Chaque bloc est une
  // fonction (revealed, reducedMotion) => JSX plutôt que du JSX déjà rendu
  // — il lui faut ces deux valeurs pour faire cascader ses propres
  // éléments internes (cf. staggerStyle).
  const blocks: ((revealed: boolean, reducedMotion: boolean) => ReactNode)[] = [
    (revealed, reducedMotion) => (
      <div className="text-center">
        <div style={staggerStyle(0, revealed, reducedMotion)}>
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
            <div key={label} className="flex items-center gap-2" style={staggerStyle(i + 1, revealed, reducedMotion)}>
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
      </div>
    ),

    (revealed, reducedMotion) => (
      <section>
        <div style={staggerStyle(0, revealed, reducedMotion)}>
          <SectionLabel accent={t.accent}>Le Lieu</SectionLabel>
        </div>
        <p
          className="font-display mb-2.5 text-center text-[30px] italic"
          style={{ color: t.ink, ...staggerStyle(1, revealed, reducedMotion) }}
        >
          {venueName}
        </p>
        <p className="mb-4.5 text-center text-[15px]" style={{ color: t.inkSoft, ...staggerStyle(2, revealed, reducedMotion) }}>
          {venueAddress}
        </p>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mx-auto block w-max rounded-full border px-[22px] py-2.5 text-center text-[12.5px]"
          style={{ borderColor: t.accent, color: t.ink, ...staggerStyle(3, revealed, reducedMotion) }}
        >
          voir sur la carte
        </a>
      </section>
    ),
  ]

  if (programme && programme.length > 0) {
    blocks.push((revealed, reducedMotion) => (
      <section>
        <div style={staggerStyle(0, revealed, reducedMotion)}>
          <SectionLabel accent={t.accent}>Le Programme</SectionLabel>
        </div>
        <ol className="ml-[9px] border-l-2 pl-[18px]" style={{ borderColor: t.line }}>
          {programme.map((item, i) => (
            <li key={i} className="relative pb-8 last:pb-0" style={staggerStyle(i + 1, revealed, reducedMotion)}>
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
      </section>
    ))
  }
  if (dressCode) {
    blocks.push((revealed, reducedMotion) => (
      <section>
        <div style={staggerStyle(0, revealed, reducedMotion)}>
          <SectionLabel accent={t.accent}>Dress code</SectionLabel>
        </div>
        <p className="text-center text-[16px]" style={{ color: t.ink, ...staggerStyle(1, revealed, reducedMotion) }}>
          {dressCode}
        </p>
      </section>
    ))
  }
  if (lodging && lodging.length > 0) {
    blocks.push((revealed, reducedMotion) => (
      <section>
        <div style={staggerStyle(0, revealed, reducedMotion)}>
          <SectionLabel accent={t.accent}>Hébergements</SectionLabel>
        </div>
        <ul className="list-none p-0 text-center">
          {lodging.map((item, i) => (
            <li key={item} className="py-[5px] text-[15px]" style={{ color: t.inkSoft, ...staggerStyle(i + 1, revealed, reducedMotion) }}>
              <span style={{ color: t.accent }}>• </span>
              {item}
            </li>
          ))}
        </ul>
      </section>
    ))
  }

  blocks.push((revealed, reducedMotion) => (
    <section>
      <div style={staggerStyle(0, revealed, reducedMotion)}>
        <SectionLabel accent={t.accent}>RSVP</SectionLabel>
      </div>
      <p className="mb-4 text-center text-[15px] leading-[1.6]" style={{ color: t.inkSoft, ...staggerStyle(1, revealed, reducedMotion) }}>
        {rsvpText}
      </p>
      <div style={staggerStyle(2, revealed, reducedMotion)}>
        <RsvpButton label={rsvpCtaLabel} accent={t.accent} onClick={openRsvp} />
      </div>
    </section>
  ))

  return (
    <div className="mx-auto max-w-[420px] text-left">
      {blocks.map((renderBlock, i) => (
        <div key={i}>
          <Divider color={t.accent} />
          <RevealBlock>{renderBlock}</RevealBlock>
        </div>
      ))}
    </div>
  )
}
