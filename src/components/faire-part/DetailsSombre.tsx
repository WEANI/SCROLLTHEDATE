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
 * au-dessus et en dessous (`my-16`). Ce choix délibéré est ce qui garde le
 * filet visuellement centré entre les sections : un espacement ad hoc
 * différent au-dessus/en dessous de chaque bloc l'aurait décentré (c'était
 * le bug avant ce commentaire — mb-8 sur le filet + marges internes
 * disparates sur les blocs). Espacement volontairement généreux (128px de
 * bloc à bloc, encore agrandi sur retour client) pour un rendu plus épuré —
 * dépasse même le fichier fourni par le client (108px).
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
 * IMPORTANT — `programme` : section rendue uniquement si `programme` est
 * fourni — jamais de contenu inventé. Ne rien passer tant que le couple
 * n'a pas répondu.
 */

/**
 * Question "Programme de la journée" — ajoutée au template actif en
 * Phase 1 du plan de généralisation bespoke (question `list`, cf.
 * contracts/questionnaireKeys.ts::QUESTIONNAIRE_KEYS.programme — l'admin
 * a généré un ID non sémantique, pas `jourj.programme` comme prévu au
 * départ). `getPublicInvite` (api/projectsRouter.ts) renvoie les réponses
 * telles quelles, en `string[]`, un élément par ligne au format
 * "Horaire — Titre — Détail" (`sub` optionnel) — à parser AVEC
 * `parseProgrammeItem` ci-dessous côté page publique (FairePart.tsx, pas
 * ici côté serveur : l'API se contente d'extraire, jamais de mettre en
 * forme) avant de passer le résultat en `programme` à ce composant.
 */
export type ProgrammeItem = { time: string; label: string; sub?: string }

/** Parse un élément de liste "16h00 — Cérémonie — Au jardin" (sub optionnel). */
export function parseProgrammeItem(raw: string): ProgrammeItem {
  const [time = '', label = '', ...rest] = raw.split(' — ').map((s) => s.trim())
  return { time, label, sub: rest.join(' — ') || undefined }
}

/**
 * Parse un élément de liste FAQ "Peut-on venir avec nos enfants ? — Bien
 * sûr, ravis de les accueillir." en `{ q, a }` — même convention " — " que
 * `parseProgrammeItem` ci-dessus, pour la question `list` "Questions
 * fréquentes de vos invités" (cf. contracts/questionnaireKeys.ts::faq).
 * Utilisé côté page publique (FairePart.tsx), jamais côté `getPublicInvite`
 * — cf. doc de `parseProgrammeItem`, l'API se contente d'extraire.
 */
export function parseFaqItem(raw: string): { q: string; a: string } {
  const [q = '', ...rest] = raw.split(' — ').map((s) => s.trim())
  return { q, a: rest.join(' — ') }
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

/**
 * Fond des tuiles flip-clock et de la carte SVG du Lieu — volontairement
 * une constante fixe, pas un champ de thème : ce sont des « écrans »/
 * cartes à contraste fort (façon horloge digitale), qui restent sombres
 * même sur une page au thème clair (cf. Edwige & Wilfried) plutôt que de
 * se fondre dans la page — un choix délibéré, pas une valeur à varier par
 * couple.
 */
const CARD_DARK_BG = '#1A1211'

function Divider({ color }: { color: string }) {
  return (
    <div className="my-16 flex items-center justify-center gap-2.5" style={{ color }} aria-hidden>
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
 * Style d'un élément à l'index `i` d'une cascade — fondu + léger glissement,
 * retardé de `i * stepMs`. `axis='up'` (défaut, tous les blocs existants) :
 * glisse vers le haut, comme avant. `axis='right'` (Le Programme
 * uniquement) : glisse depuis la droite, cf. LieuMap pour la même logique
 * de paramètre optionnel n'affectant que son seul appelant. `i=0` seul
 * (bloc sans liste interne, ex. Dress code) se comporte comme un simple
 * fondu quel que soit l'axe.
 */
function staggerStyle(
  i: number,
  revealed: boolean,
  reducedMotion: boolean,
  axis: 'up' | 'right' = 'up',
  stepMs = 90,
): CSSProperties {
  if (reducedMotion) return {}
  const hidden = axis === 'right' ? 'translateX(28px)' : 'translateY(14px)'
  const shown = axis === 'right' ? 'translateX(0)' : 'translateY(0)'
  return {
    opacity: revealed ? 1 : 0,
    transform: revealed ? shown : hidden,
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
 * dehors de React (transitoire, ~1,3s, pas d'intérêt à passer par un
 * re-render) — pattern déjà établi dans ce fichier pour tout ce qui est
 * purement visuel et jetable.
 *
 * Réglages revus après retour vidéo (l'explosion passait quasi inaperçue,
 * cf. RsvpButton pour l'autre partie du correctif — le Dialog s'ouvrait
 * par-dessus avant qu'on ait le temps de la voir) : plus de particules,
 * plus de vitesse et de dispersion, plus grosses.
 */
function spawnConfetti(originEl: HTMLElement, colors: string[]) {
  const rect = originEl.getBoundingClientRect()
  const originX = rect.left + rect.width / 2
  const originY = rect.top + rect.height / 2
  const COUNT = 56
  const DURATION = 1300
  const GRAVITY = 950 // px/s²

  const container = document.createElement('div')
  container.style.cssText = 'position:fixed; inset:0; pointer-events:none; z-index:9999; overflow:hidden;'
  document.body.appendChild(container)

  const particles = Array.from({ length: COUNT }, () => {
    const angle = Math.random() * Math.PI * 2
    const speed = 260 + Math.random() * 460
    const size = 7 + Math.random() * 8
    const el = document.createElement('div')
    el.style.cssText = `position:absolute; width:${size}px; height:${size}px; background:${
      colors[Math.floor(Math.random() * colors.length)]
    }; left:${originX}px; top:${originY}px; will-change:transform,opacity;`
    container.appendChild(el)
    return {
      x: 0,
      y: 0,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 320, // biais vers le haut à l'explosion, avant que la gravité reprenne
      rot: Math.random() * 360,
      vrot: (Math.random() - 0.5) * 900, // deg/s
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
 *
 * `onClick` (ouverture du Dialog RSVP) est volontairement retardé de
 * `CONFETTI_TO_DIALOG_DELAY_MS` après le déclenchement des confettis —
 * repéré sur une vidéo réelle (mobile) que le Dialog s'ouvrait quasi
 * instantanément par-dessus l'explosion, la rendant invisible. Ce délai
 * laisse le pic de l'explosion se voir sur la page avant que le Dialog ne
 * la recouvre.
 */
const CONFETTI_TO_DIALOG_DELAY_MS = 550

function RsvpButton({
  label,
  accent,
  confettiSecondary,
  onClick,
}: {
  label: string
  accent: string
  /** 2e couleur des confettis (avec `accent` et l'or de marque) — doit contraster avec le fond de la page, cf. DetailsSombre. */
  confettiSecondary: string
  onClick: () => void
}) {
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
    if (btnRef.current) spawnConfetti(btnRef.current, [accent, confettiSecondary, CONFETTI_GOLD])
    window.setTimeout(onClick, CONFETTI_TO_DIALOG_DELAY_MS)
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

/**
 * Carte sombre + crème fixes pour le bloc date+compte à rebours —
 * indépendants de `theme` volontairement : demandé identique sur toutes
 * les pages quel que soit le thème du couple (cf. Edwige & Wilfried, thème
 * clair par ailleurs). Reprend les valeurs déjà établies de Léa & Olivier
 * (CINEMA_ROUGE_THEME) plutôt que d'inventer une 2e palette sombre.
 * L'accent (arc + chiffre), lui, N'EST PAS fixe — passé en prop depuis
 * `theme.accent` (cf. DateCountdownCard) : demandé rouge bordeaux pour
 * Léa & Olivier, rose pour Edwige & Wilfried — seule la carte reste
 * délibérément sombre partout, pas la couleur d'accent.
 */
const DATE_INK = '#F5EFEA'
const DATE_INK_SOFT = '#BBAFA9'

/**
 * Anneau de progression circulaire — arc qui se remplit proportionnellement
 * à `value / max` (ex. 45 secondes sur 60 = arc aux 3/4),
 * `stroke-linecap="round"` (bouts arrondis, pas carrés), animé via
 * `stroke-dashoffset` (technique standard : dasharray = circonférence
 * complète, dashoffset = la part non dessinée). Piste de fond toujours
 * visible en filigrane pour situer l'arc. Chiffre serif au centre (HTML,
 * pas du texte SVG — plus simple à aligner/styler), taille réduite au-delà
 * de 2 chiffres (le compteur de jours peut monter à 3 chiffres).
 */
function ProgressRing({
  value,
  max,
  label,
  accent,
  size = 72,
}: {
  value: number
  max: number
  label: string
  accent: string
  size?: number
}) {
  const strokeWidth = 4
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const fraction = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
  const offset = circumference * (1 - fraction)
  const digitSize = value >= 100 ? 15 : 19

  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(247, 241, 236, 0.14)" strokeWidth={strokeWidth} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={accent}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.6s linear' }}
          />
        </svg>
        <div
          className="font-display absolute inset-0 flex items-center justify-center font-semibold"
          style={{ color: DATE_INK, fontSize: digitSize }}
          aria-hidden
        >
          {value}
        </div>
      </div>
      <div className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: DATE_INK_SOFT }}>
        {label}
      </div>
    </div>
  )
}

/**
 * Bloc date + compte à rebours — section minimaliste : date complète en
 * grand serif italique, révélée par dé-floutage (blur 12px→0 + fondu)
 * plutôt que le glissement générique de `staggerStyle` (traitement à part,
 * cf. plus bas), puis 4 anneaux de progression (jours/heures/min/sec) sous
 * une carte sombre fixe, à l'accent du thème du couple (`accent`, cf.
 * DATE_INK ci-dessus pour ce qui reste fixe).
 *
 * `max` de chaque anneau : heures/minutes/secondes sur leur cycle naturel
 * (24/60/60) ; jours sur le total de jours restants CAPTÉ UNE FOIS AU
 * MONTAGE (`initialDays`, ref) — sinon, en recalculant `max = d` à chaque
 * rendu, l'anneau des jours resterait à 100% en permanence (le numérateur
 * et le dénominateur seraient toujours égaux), ce qui viderait de son sens
 * la seule progression réellement longue et donc la plus lisible des 4.
 */
function DateCountdownCard({
  weddingDateTime,
  accent,
  revealed,
  reducedMotion,
}: {
  weddingDateTime: string
  accent: string
  revealed: boolean
  reducedMotion: boolean
}) {
  const targetMs = new Date(weddingDateTime).getTime()
  const date = new Date(weddingDateTime)
  const fullDate = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const { d, h, m, s } = useCountdown(targetMs)
  const initialDays = useRef(d)

  // Avant révélation, chaque anneau part de 0 (même la fraction réelle)
  // pour que le premier remplissage se voie comme une entrée, pas comme un
  // état déjà acquis — cf. la même logique pour le fondu/flou de la date.
  const ring = (value: number, max: number, label: string) => (
    <ProgressRing value={revealed ? value : 0} max={max} label={label} accent={accent} />
  )

  return (
    <div className="rounded-2xl px-6 py-9 text-center" style={{ background: CARD_DARK_BG }}>
      <p
        className="font-display whitespace-nowrap text-[20px] italic leading-[1.2] sm:text-[26px]"
        style={{
          color: DATE_INK,
          filter: reducedMotion || revealed ? 'blur(0px)' : 'blur(12px)',
          opacity: reducedMotion || revealed ? 1 : 0,
          transition: reducedMotion ? 'none' : 'filter 1s ease-out, opacity 1s ease-out',
        }}
      >
        {fullDate}
      </p>

      <div className="mt-8 flex justify-center gap-3" aria-label={`Compte à rebours jusqu'au ${fullDate}`}>
        {ring(d, initialDays.current || 1, 'Jours')}
        {ring(h, 24, 'Heures')}
        {ring(m, 60, 'Min')}
        {ring(s, 60, 'Sec')}
      </div>
    </div>
  )
}

/**
 * Carte stylisée du Lieu — dessinée en SVG (fond sombre, routes en traits
 * bruns organiques), pas de tuiles Google Maps (le vrai plan reste
 * accessible via le lien "Voir sur la carte"). Pin rouge qui tombe du haut
 * avec un rebond élastique (cubic-bezier(.34,1.56,.64,1) — la même courbe
 * « back out » que le retour du bouton RSVP magnétique, cf. RsvpButton :
 * un seul langage de mouvement « élastique » sur toute la page, pas deux
 * qui se ressemblent sans être identiques), puis deux anneaux concentriques
 * pulsent en boucle depuis sa base. Tout démarre une fois `revealed`
 * (fourni par le RevealBlock du bloc "Le Lieu", même IntersectionObserver
 * que le reste de la cascade) — les anneaux ne sont montés qu'à ce
 * moment-là, pas juste masqués, pour ne pas animer hors écran.
 */
function LieuMap({ revealed, reducedMotion, accent }: { revealed: boolean; reducedMotion: boolean; accent: string }) {
  return (
    <div className="w-full overflow-hidden rounded-2xl" style={{ background: CARD_DARK_BG }}>
      <svg viewBox="0 0 240 200" className="block w-full" role="img" aria-label="Carte stylisée du lieu">
        {/* routes organiques — traits bruns, jamais un vrai plan */}
        <path d="M-10,152 Q50,120 82,155 T180,118 T260,138" stroke="#5C4A3A" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.7" />
        <path d="M-10,58 Q60,90 102,54 T220,68" stroke="#4A3A2E" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.55" />
        <path d="M42,-10 Q30,80 72,120 T60,210" stroke="#5C4A3A" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeDasharray="1 7" opacity="0.5" />
        <path d="M190,-10 Q168,70 202,130 T170,210" stroke="#4A3A2E" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeDasharray="1 7" opacity="0.45" />

        {revealed && !reducedMotion && (
          <>
            <circle cx="120" cy="140" r="9" fill="none" stroke={accent} strokeWidth="1.5" className="animate-pulse-ring" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
            <circle
              cx="120"
              cy="140"
              r="9"
              fill="none"
              stroke={accent}
              strokeWidth="1.5"
              className="animate-pulse-ring"
              style={{ transformBox: 'fill-box', transformOrigin: 'center', animationDelay: '1.2s' }}
            />
          </>
        )}

        {/* pin — tombe du haut, rebond élastique au repos */}
        <g
          style={{
            transform: reducedMotion || revealed ? 'translateY(0)' : 'translateY(-70px)',
            opacity: reducedMotion ? 1 : revealed ? 1 : 0,
            transition: reducedMotion ? 'none' : 'transform 0.9s cubic-bezier(.34,1.56,.64,1), opacity 0.4s ease',
          }}
        >
          <path d="M120,140c0,0-24-28-24-48c0-13,11-24,24-24c13,0,24,11,24,24C144,112,120,140,120,140z" fill={accent} />
          <circle cx="120" cy="92" r="9" fill={CARD_DARK_BG} />
        </g>
      </svg>
    </div>
  )
}

/** Exporté — réutilisé tel quel par edwigeWilfriedEffects.tsx (compte à rebours à poids variable), pas de 2e implémentation. */
export function useCountdown(targetMs: number) {
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
  confettiSecondary = '#F3EAD9',
  openRsvp,
  theme,
  renderDate,
  renderLieu,
  renderProgramme,
  renderDressCode,
  renderLodging,
  renderBeforeRsvp,
  renderBeforeRsvp2,
  renderRsvp,
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
  /** 2e couleur des confettis RSVP — défaut = crème, pensé pour un fond sombre. Sur un thème clair (cf. Edwige & Wilfried), passer une teinte qui contraste avec la page (ex. le rose poudré du thème). */
  confettiSecondary?: string
  openRsvp: () => void
  theme?: Partial<DetailsSombreTheme>
  /**
   * Emplacements (slots) qui remplacent le rendu par défaut d'un bloc —
   * opt-in, tous `undefined` par défaut (Léa & Olivier, comportement
   * inchangé). Ajoutés pour Edwige & Wilfried, dont la refonte (titre en
   * lettres qui se recomposent, programme en défilement horizontal épinglé,
   * lieu en loupe magnétique, RSVP en sceau de cire pressé) diverge trop du
   * design par défaut pour rester une variation de thème — cf.
   * edwigeWilfriedEffects.tsx. Chaque slot reçoit `revealed`/`reducedMotion`
   * du même RevealBlock que le rendu par défaut qu'il remplace : un seul
   * mécanisme de déclenchement au scroll pour toute la page, pas deux.
   */
  renderDate?: (accent: string, revealed: boolean, reducedMotion: boolean) => ReactNode
  renderLieu?: (
    props: { venueName: string; venueAddress: string; mapsUrl: string; accent: string },
    revealed: boolean,
    reducedMotion: boolean,
  ) => ReactNode
  renderProgramme?: (programme: ProgrammeItem[], accent: string, revealed: boolean, reducedMotion: boolean) => ReactNode
  renderDressCode?: (dressCode: string, accent: string, revealed: boolean, reducedMotion: boolean) => ReactNode
  renderLodging?: (lodging: string[], accent: string, revealed: boolean, reducedMotion: boolean) => ReactNode
  /**
   * Blocs additionnels insérés juste avant RSVP, dans l'ordre — pas un
   * remplacement d'un bloc existant comme les 4 slots ci-dessus, mais des
   * EN PLUS (cf. Edwige & Wilfried « Notre histoire » puis
   * « Foire aux questions », toutes deux avant RSVP). Chacun garde son
   * propre filet + RevealBlock (donc son propre déclenchement au scroll),
   * comme n'importe quel autre bloc — `renderBeforeRsvp2` n'est qu'un 2e
   * emplacement du même type, pas un mécanisme différent.
   */
  renderBeforeRsvp?: (revealed: boolean, reducedMotion: boolean) => ReactNode
  renderBeforeRsvp2?: (revealed: boolean, reducedMotion: boolean) => ReactNode
  renderRsvp?: (
    props: { label: string; accent: string; onClick: () => void },
    revealed: boolean,
    reducedMotion: boolean,
  ) => ReactNode
}) {
  const t = { ...DEFAULT_DETAILS_THEME, ...theme }
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venueName} ${venueAddress}`)}`

  // Tous les blocs, dans l'ordre — chacun précédé d'un filet et rendu dans
  // son propre RevealBlock (cf. rendu plus bas), aucune marge externe sur
  // les blocs eux-mêmes (cf. doc en tête de fichier). Les blocs optionnels
  // ne sont ajoutés que si leurs données sont réelles. Chaque bloc est une
  // fonction (revealed, reducedMotion) => JSX plutôt que du JSX déjà rendu
  // — il lui faut ces deux valeurs pour faire cascader ses propres
  // éléments internes (cf. staggerStyle).
  const blocks: ((revealed: boolean, reducedMotion: boolean) => ReactNode)[] = [
    (revealed, reducedMotion) =>
      renderDate ? (
        renderDate(t.accent, revealed, reducedMotion)
      ) : (
        <DateCountdownCard weddingDateTime={weddingDateTime} accent={t.accent} revealed={revealed} reducedMotion={reducedMotion} />
      ),

    (revealed, reducedMotion) =>
      renderLieu ? (
        renderLieu({ venueName, venueAddress, mapsUrl, accent: t.accent }, revealed, reducedMotion)
      ) : (
        <section>
          <div style={staggerStyle(0, revealed, reducedMotion)}>
            <SectionLabel accent={t.accent}>Le Lieu</SectionLabel>
          </div>
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-7">
            <div className="w-full sm:w-[46%]" style={staggerStyle(1, revealed, reducedMotion)}>
              <LieuMap revealed={revealed} reducedMotion={reducedMotion} accent={t.accent} />
            </div>
            <div className="w-full text-center sm:w-[54%] sm:text-left">
              <p
                className="font-display text-[28px] italic leading-[1.15]"
                style={{ color: t.ink, ...staggerStyle(2, revealed, reducedMotion) }}
              >
                {venueName}
              </p>
              <p className="mt-2 text-[15px]" style={{ color: t.inkSoft, ...staggerStyle(3, revealed, reducedMotion) }}>
                {venueAddress}
              </p>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold underline underline-offset-4"
                style={{ color: t.accent, textDecorationColor: t.accent, ...staggerStyle(4, revealed, reducedMotion) }}
              >
                Voir sur la carte <span aria-hidden>→</span>
              </a>
            </div>
          </div>
        </section>
      ),
  ]

  if (programme && programme.length > 0) {
    blocks.push((revealed, reducedMotion) =>
      renderProgramme ? (
        renderProgramme(programme, t.accent, revealed, reducedMotion)
      ) : (
        <section>
          <div style={staggerStyle(0, revealed, reducedMotion)}>
            <SectionLabel accent={t.accent}>Le Programme</SectionLabel>
          </div>
          <div className="relative">
            {/* rail — toujours visible, sert de piste au remplissage */}
            <div className="absolute left-[5px] top-0 bottom-0 w-[2px]" style={{ background: t.line }} aria-hidden />
            {/* remplissage rouge — hauteur 0→100% une fois la section révélée */}
            <div
              className="absolute left-[5px] top-0 w-[2px]"
              style={{
                background: t.accent,
                height: reducedMotion || revealed ? '100%' : '0%',
                transition: reducedMotion ? 'none' : 'height 1.4s cubic-bezier(0.22,1,0.36,1)',
              }}
              aria-hidden
            />
            <ol className="relative pl-[26px]">
              {programme.map((item, i) => (
                <li key={i} className="relative pb-8 last:pb-0" style={staggerStyle(i + 1, revealed, reducedMotion, 'right')}>
                  {/* puce circulaire cerclée de rouge, sur le rail */}
                  <span
                    className="absolute -left-[26px] top-0.5 h-3 w-3 rounded-full border-2"
                    style={{ borderColor: t.accent, background: CARD_DARK_BG }}
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
          </div>
        </section>
      ),
    )
  }
  if (dressCode) {
    blocks.push((revealed, reducedMotion) =>
      renderDressCode ? (
        renderDressCode(dressCode, t.accent, revealed, reducedMotion)
      ) : (
        <section>
          <div style={staggerStyle(0, revealed, reducedMotion)}>
            <SectionLabel accent={t.accent}>Dress code</SectionLabel>
          </div>
          <p className="text-center text-[16px]" style={{ color: t.ink, ...staggerStyle(1, revealed, reducedMotion) }}>
            {dressCode}
          </p>
        </section>
      ),
    )
  }
  if (lodging && lodging.length > 0) {
    blocks.push((revealed, reducedMotion) =>
      renderLodging ? (
        renderLodging(lodging, t.accent, revealed, reducedMotion)
      ) : (
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
      ),
    )
  }

  if (renderBeforeRsvp) {
    blocks.push((revealed, reducedMotion) => renderBeforeRsvp(revealed, reducedMotion))
  }

  if (renderBeforeRsvp2) {
    blocks.push((revealed, reducedMotion) => renderBeforeRsvp2(revealed, reducedMotion))
  }

  blocks.push((revealed, reducedMotion) =>
    renderRsvp ? (
      renderRsvp({ label: rsvpCtaLabel, accent: t.accent, onClick: openRsvp }, revealed, reducedMotion)
    ) : (
      <section>
        <div style={staggerStyle(0, revealed, reducedMotion)}>
          <SectionLabel accent={t.accent}>RSVP</SectionLabel>
        </div>
        <p className="mb-4 text-center text-[15px] leading-[1.6]" style={{ color: t.inkSoft, ...staggerStyle(1, revealed, reducedMotion) }}>
          {rsvpText}
        </p>
        <div style={staggerStyle(2, revealed, reducedMotion)}>
          <RsvpButton label={rsvpCtaLabel} accent={t.accent} confettiSecondary={confettiSecondary} onClick={openRsvp} />
        </div>
      </section>
    ),
  )

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
