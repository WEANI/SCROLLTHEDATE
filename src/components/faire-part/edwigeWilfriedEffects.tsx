import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent, ReactNode } from 'react'
import { useCountdown, type ProgrammeItem } from './DetailsSombre'

/**
 * Refonte bespoke de plusieurs sections de faire-part — date (lettres qui
 * se recomposent + compte à rebours en Fraunces variable), programme
 * (défilement horizontal épinglé), lieu (loupe magnétique sur carte SVG à
 * deux calques), RSVP (sceau de cire pressé), plus « Notre histoire »
 * (paragraphe qui s'encre au scroll + galerie photo en défilement
 * horizontal épinglé) et « Foire aux questions » (accordéon), ajoutées
 * ensuite. Conçue au départ pour Edwige & Wilfried, puis généralisée
 * (palette en `BespokePalette`, cf. plus bas) pour être réutilisée par
 * Léa & Olivier avec leur propre thème — d'où le nom de fichier resté
 * `edwigeWilfriedEffects.tsx` mais le contenu maintenant partagé. Branché
 * via les slots `renderDate`/`renderLieu`/`renderProgramme`/
 * `renderDressCode`/`renderRsvp`/`renderBeforeRsvp`/`renderBeforeRsvp2` de
 * DetailsSombre — cf. ce fichier pour pourquoi ces sections sortent du
 * système de thème générique plutôt que d'être une variation de plus.
 *
 * `BespokePalette` — toutes les couleurs identitaires de cette refonte,
 * paramétrables par couple via `BespokePaletteProvider` (Context — plus
 * simple que de faire passer `palette` en prop à travers chaque composant
 * imbriqué, cf. `usePalette` ci-dessous). Deux rôles d'encre distincts :
 * `ink`/`inkRgb` pour le texte posé DIRECTEMENT sur le fond de la page du
 * couple (case Date transparente, Notre histoire, Dress code — sombre
 * chez Edwige & Wilfried dont la page est claire, crème chez Léa & Olivier
 * dont la page est sombre) ; `inkOnCard`/`inkOnCardRgb` pour le texte posé
 * sur les cartes claires (Lieu, Programme, questions de la FAQ) qui
 * restent claires quel que soit le couple — donc la même encre sombre
 * fonctionne pour les deux, jamais besoin de varier ce rôle.
 */
export type BespokePalette = {
  /** Fond de la case Lieu, de la piste Programme et des cartes FAQ — clair chez Edwige & Wilfried (page claire), sombre chez Léa & Olivier (page sombre) : pas une couleur neutre invariante, adaptée au thème de la page. */
  bg: string
  /** Fond de la case Date — transparent pour les deux couples (se fond dans le fond de la page). */
  bgDate: string
  bgProgramme: string
  /** Crème du sceau RSVP (reste sombre/bordeaux pour les deux couples, jamais reconverti en clair) — texte des initiales. */
  cream: string
  /** Texte posé directement sur le fond de la page du couple (pas sur une carte) — varie par couple. */
  ink: string
  inkRgb: string
  /** Texte posé sur les cartes Lieu/Programme/FAQ (cf. `bg` ci-dessus) — varie par couple avec `bg`, pas figé sombre : sombre sur carte claire (Edwige & Wilfried), clair sur carte sombre (Léa & Olivier). */
  inkOnCard: string
  inkOnCardRgb: string
  /** Traits de la carte SVG du Lieu (routes, hachures de vignes) — même logique que `inkOnCard`, doit rester lisible sur `bg`. */
  mapLine: string
  /** Accent secondaire (pulse du compte à rebours, mots-clés qui s'encrent, point sur la carte). */
  bordeaux: string
  bordeauxRgb: string
  /** Accent principal (anneaux, filets, sceau/dégradés dorés). */
  gold: string
  goldRgb: string
  /** Titres de section (« La date », « Le Lieu »…) — doré chez Edwige & Wilfried ; blanc/crème chez Léa & Olivier (demande client, pour se détacher du rouge déjà très présent ailleurs sur leur page). Rôle séparé de `gold` : `gold` reste utilisé ailleurs (anneaux, filets) même quand les titres passent en blanc. */
  sectionTitle: string
  /** Chiffre de l'heure dans la piste du Programme — bordeaux (accent secondaire) chez Edwige & Wilfried ; crème chez Léa & Olivier (demande client : l'heure en blanc, le titre en rouge — cf. `stepLabel`). Rôle séparé de `bordeaux`/`gold` car le bon accent à utiliser ici diffère par couple. */
  timelineAccent: string
  /** Titre de l'étape sous l'heure (« La cérémonie »…) dans la piste du Programme — même teinte que le reste du texte de carte chez Edwige & Wilfried (`inkOnCard`) ; rouge principal chez Léa & Olivier (demande client, pour inverser heure/titre par rapport à `inkOnCard`). Rôle séparé d'`inkOnCard` : celui-ci reste utilisé ailleurs (Lieu, FAQ, Dress code) même quand le titre du Programme passe au rouge. */
  stepLabel: string
  /**
   * Sceau de cire RSVP — 3 teintes pour son dégradé radial (clair au
   * centre, sombre au bord). Rôle distinct de `gold`/`bordeaux` : chez
   * Edwige & Wilfried le sceau reste rouge (accent secondaire de la page)
   * même si l'accent principal ailleurs est doré ; chez Léa & Olivier
   * c'est l'inverse (leur accent principal EST déjà rouge) — un simple
   * alias de gold/bordeaux n'aurait pas fonctionné pour les deux.
   */
  seal: string
  sealLight: string
  sealDark: string
}

export const EW_PALETTE: BespokePalette = {
  bg: '#f3ead9',
  bgDate: 'transparent',
  bgProgramme: '#f3ead9',
  cream: '#f3ead9',
  ink: '#2E2620',
  inkRgb: '46, 38, 32',
  inkOnCard: '#2E2620',
  inkOnCardRgb: '46, 38, 32',
  mapLine: '#5C4A3A',
  bordeaux: '#b02634',
  bordeauxRgb: '176, 38, 52',
  gold: '#c9a961',
  goldRgb: '201, 169, 97',
  sectionTitle: '#c9a961',
  timelineAccent: '#b02634',
  stepLabel: '#2E2620',
  seal: '#b02634',
  sealLight: '#c8394a',
  sealDark: '#7c1a26',
}

const PaletteContext = createContext<BespokePalette>(EW_PALETTE)

/** Fournit la palette à toute la sous-arborescence — englobe à la fois `EwEffectsStyles` et les composants qui consomment `usePalette()`, cf. FairePartEdwigeWilfried.tsx / FairePartLeaOlivier.tsx. */
export function BespokePaletteProvider({ palette, children }: { palette: BespokePalette; children: ReactNode }) {
  return <PaletteContext.Provider value={palette}>{children}</PaletteContext.Provider>
}

function usePalette() {
  return useContext(PaletteContext)
}

/** Titre de section (« La date », « Le Lieu », « RSVP »…) — même traitement visuel que « Le Programme », factorisé pour ne pas le répéter 4 fois. */
function EwLabel({ children }: { children: string }) {
  const p = usePalette()
  return (
    <p className="mb-7 text-center text-[19px] italic" style={{ color: p.sectionTitle }}>
      {children}
    </p>
  )
}

/**
 * Styles globaux partagés par les 4 composants (keyframes, `@property --p`
 * pour l'anneau du sceau, CSS scroll-driven du programme) — injectés une
 * seule fois via ce composant, monté une fois par FairePartEdwigeWilfried
 * à côté de DetailsSombre. Un seul `<style>`, pas un par composant qui le
 * consomme (ils sont tous montés simultanément sur la même page).
 */
export function EwEffectsStyles() {
  const p = usePalette()
  return (
    <style>{`
      @property --p {
        syntax: '<number>';
        inherits: true;
        initial-value: 0;
      }
      @keyframes ew-ping {
        0% { box-shadow: 0 0 0 0 rgba(${p.bordeauxRgb}, 0.55); }
        100% { box-shadow: 0 0 0 18px rgba(${p.bordeauxRgb}, 0); }
      }
      @keyframes ew-fade-in {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @supports (view-timeline-name: --x) {
        /* nommée sur le CONTENEUR EXTERNE (230vh), pas sur la piste (100vh,
           épinglée) : c'est lui qui doit fournir toute la plage de scroll
           « contenue », cf. animation-range ci-dessous sur la piste qui la
           référence. */
        .ew-hprog-outer {
          view-timeline-name: --ew-progress;
          view-timeline-axis: block;
        }
        .ew-hprog-track[data-native="1"] {
          animation-name: ew-hprog-scroll;
          animation-duration: 1ms; /* ignorée avec un view-timeline, requise pour une syntaxe valide */
          animation-timing-function: linear;
          animation-fill-mode: both;
          animation-timeline: --ew-progress;
          animation-range: contain 0% contain 100%;
        }
      }
      @keyframes ew-hprog-scroll {
        from { transform: translateX(0); }
        to { transform: translateX(calc(-100% + 100cqw)); }
      }

      /* Photos de Notre histoire — même mécanique que la piste du
         Programme (view-timeline nommé sur le conteneur épinglé,
         translateX sur la piste) — nom de timeline distinct
         (--ew-photos-progress) pour ne pas entrer en conflit avec
         --ew-progress (Programme) si les deux sections sont montées
         simultanément sur la page. */
      @supports (view-timeline-name: --x) {
        .ew-photos-outer {
          view-timeline-name: --ew-photos-progress;
          view-timeline-axis: block;
        }
        .ew-photos-track[data-native="1"] {
          animation-name: ew-photos-scroll;
          animation-duration: 1ms;
          animation-timing-function: linear;
          animation-fill-mode: both;
          animation-timeline: --ew-photos-progress;
          animation-range: contain 0% contain 100%;
        }
      }
      @keyframes ew-photos-scroll {
        from { transform: translateX(0); }
        to { transform: translateX(calc(-100% + 100cqw)); }
      }

      /* Notre histoire — chaque mot part à 12% d'opacité et « s'encre »
         (opacité pleine) au fur et à mesure qu'il traverse le viewport, de
         façon réversible (on peut remonter). CSS natif : chaque span porte
         SON PROPRE view-timeline (sujet = lui-même, pas un ancêtre nommé
         comme pour la piste horizontale du programme — ici chaque mot doit
         s'animer selon SA PROPRE traversée, pas celle d'un conteneur
         commun) via animation-timeline: view(), réversible par nature
         (contrairement à une animation classique, la progression suit
         directement le scroll dans les deux sens, rien à gérer en plus).
         Plage 10%-90% de la traversée (pas 5%-42%, jugé trop rapide/pas
         ressenti au scroll) — l'encrage s'étale sur presque tout le
         passage du mot dans le viewport, effet plus lent et perceptible. */
      .ew-word-ink {
        opacity: 0.12;
      }
      @supports (animation-timeline: view()) {
        .ew-word-ink {
          animation-name: ew-word-ink-anim;
          animation-duration: 1ms; /* ignorée avec un view-timeline, requise pour une syntaxe valide */
          animation-fill-mode: both;
          animation-timeline: view();
          animation-range: cover 10% cover 90%;
        }
      }
      @keyframes ew-word-ink-anim {
        from { opacity: 0.12; }
        to { opacity: 1; }
      }
      /* Repli JS (cf. NotreHistoire, IntersectionObserver à seuils
         multiples) : bascule discrète d'une classe plutôt qu'un scrub
         continu — suffisant en repli, avec une petite transition pour ne
         pas être un pur « pop ». */
      .ew-word-ink.ew-inked {
        opacity: 1;
        transition: opacity 0.4s ease;
      }
      @media (prefers-reduced-motion: reduce) {
        .ew-word-ink {
          opacity: 1;
          animation: none;
        }
      }
    `}</style>
  )
}

/* ------------------------------------------------------------------ */
/* 1. Date — lettres qui se recomposent + compte à rebours variable    */
/* ------------------------------------------------------------------ */

/**
 * Titre en lettres qui se recomposent — chaque caractère part d'une
 * position/rotation/échelle aléatoire (translate ±120px, rotate ±40°,
 * scale 1.6, blur 14px) et « atterrit » à sa place, delay = index × 40ms,
 * 1,6s, cubic-bezier(.22,1,.36,1). Positions aléatoires calculées UNE FOIS
 * (useMemo, pas à chaque rendu) — sinon l'état "avant révélation" bougerait
 * sous les yeux à chaque re-render (ex. tick du countdown, qui vit dans le
 * même composant parent) au lieu de rester stable jusqu'au déclenchement.
 */
function ScatterTitle({ text, revealed, reducedMotion }: { text: string; revealed: boolean; reducedMotion: boolean }) {
  const p = usePalette()
  const chars = useMemo(() => text.split(''), [text])
  const offsets = useMemo(
    () => chars.map(() => ({ dx: (Math.random() * 2 - 1) * 120, dy: (Math.random() * 2 - 1) * 120, rot: (Math.random() * 2 - 1) * 40 })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [text],
  )

  return (
    <p className="font-display whitespace-nowrap text-[36px] italic leading-[1.2] sm:text-[46px]" aria-label={text}>
      {chars.map((ch, i) => (
        <span
          key={i}
          aria-hidden
          className="inline-block"
          style={
            reducedMotion
              ? { color: p.ink }
              : {
                  color: p.ink,
                  transform: revealed
                    ? 'translate(0, 0) rotate(0deg) scale(1)'
                    : `translate(${offsets[i].dx}px, ${offsets[i].dy}px) rotate(${offsets[i].rot}deg) scale(1.6)`,
                  filter: revealed ? 'blur(0px)' : 'blur(14px)',
                  opacity: revealed ? 1 : 0,
                  transition: 'transform 1.6s cubic-bezier(.22,1,.36,1), filter 1.6s cubic-bezier(.22,1,.36,1), opacity 1.6s cubic-bezier(.22,1,.36,1)',
                  transitionDelay: `${i * 40}ms`,
                }
          }
        >
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </p>
  )
}

/**
 * Anneau de progression circulaire — un des 4 (jours/heures/min/sec) du
 * compte à rebours. Arc doré (accent demandé en retour client, bordeaux à
 * l'origine) qui se remplit proportionnellement au
 * temps restant dans le cycle de l'unité (`value / max`), pas au temps
 * écoulé : `value` DIMINUE à l'approche du mariage (23h restantes sur 24,
 * puis 22h, etc.), donc l'anneau se VIDE à mesure que l'unité s'épuise —
 * lecture immédiate, cohérent avec la logique déjà en place pour Léa &
 * Olivier (cf. ProgressRing dans DetailsSombre.tsx, non exporté — palette
 * différente ici, donc dupliqué plutôt que réexposé). `strokeLinecap`
 * rond + transition sur `strokeDashoffset` pour l'animation de
 * remplissage à chaque tick. Chiffre serif (Fraunces) au centre, label en
 * micro-capitales espacées en dessous.
 */
function EwRing({ value, max, label, size = 76 }: { value: number; max: number; label: string; size?: number }) {
  const p = usePalette()
  const strokeWidth = 4
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const fraction = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
  const offset = circumference * (1 - fraction)
  const digitSize = value >= 100 ? 17 : 22

  // À chaque tick (changement de `value`), le chiffre « gonfle » en graisse
  // (Fraunces variable, wght 300→800 + SOFT 100→0) et vire bordeaux pendant
  // 450ms avant de revenir — repris de l'ancien PulseDigit (avant le
  // passage aux anneaux SVG), maintenant appliqué au chiffre à l'intérieur
  // de l'anneau plutôt qu'à un chiffre nu.
  const [pulsing, setPulsing] = useState(false)
  const prev = useRef(value)

  useEffect(() => {
    if (prev.current === value) return
    prev.current = value
    setPulsing(true)
    const id = window.setTimeout(() => setPulsing(false), 450)
    return () => window.clearTimeout(id)
  }, [value])

  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={`rgba(${p.inkRgb}, 0.12)`} strokeWidth={strokeWidth} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={p.gold}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.6s linear' }}
          />
        </svg>
        <div
          className="font-display tabular-nums absolute inset-0 flex items-center justify-center"
          style={{
            color: pulsing ? p.bordeaux : p.ink,
            fontSize: digitSize,
            fontVariationSettings: pulsing ? "'wght' 800, 'SOFT' 0" : "'wght' 300, 'SOFT' 100",
            transition: 'font-variation-settings 450ms ease, color 450ms ease',
          }}
          aria-hidden
        >
          {String(value).padStart(2, '0')}
        </div>
      </div>
      <span className="text-[10px] uppercase tracking-[0.22em]" style={{ color: `rgba(${p.inkRgb}, 0.55)` }}>
        {label}
      </span>
    </div>
  )
}

export function ScatterDateCard({
  weddingDateTime,
  revealed,
  reducedMotion,
}: {
  weddingDateTime: string
  revealed: boolean
  reducedMotion: boolean
}) {
  const p = usePalette()
  const targetMs = new Date(weddingDateTime).getTime()
  const date = new Date(weddingDateTime)
  const month = date.toLocaleDateString('fr-FR', { month: 'long' })
  const day = date.getDate()
  const year = date.getFullYear()
  // Jour en chiffres + année, sans le jour de la semaine (retiré sur
  // retour client — "Mardi 21 décembre 2027" → "21 décembre 2027").
  const title = `${day} ${month} ${year}`
  const { d, h, m, s } = useCountdown(targetMs)
  // Capté une seule fois au montage — sinon, en recalculant max=d à chaque
  // rendu, l'anneau des jours resterait à 100% en permanence (numérateur et
  // dénominateur toujours égaux), cf. même logique côté DetailsSombre.
  const initialDays = useRef(d)

  return (
    <>
      <EwLabel>La date</EwLabel>
      <div className="rounded-2xl px-6 py-9 text-center" style={{ background: p.bgDate }}>
        <ScatterTitle text={title} revealed={revealed} reducedMotion={reducedMotion} />

        {/* filet doré dégradé — s'étire sous le titre une fois les lettres posées */}
        <div
          className="mx-auto mt-5 h-px w-32"
          style={{
            background: `linear-gradient(90deg, transparent, ${p.gold}, transparent)`,
            transform: reducedMotion || revealed ? 'scaleX(1)' : 'scaleX(0)',
            transition: reducedMotion ? 'none' : 'transform 0.8s cubic-bezier(.22,1,.36,1)',
            transitionDelay: reducedMotion ? '0ms' : `${title.length * 40 + 300}ms`,
          }}
          aria-hidden
        />

        <div className="mt-8 flex justify-center gap-5" aria-label={`Compte à rebours jusqu'au ${title}`}>
          <EwRing value={revealed ? d : 0} max={initialDays.current || 1} label="Jours" />
          <EwRing value={revealed ? h : 0} max={24} label="Heures" />
          <EwRing value={revealed ? m : 0} max={60} label="Min" />
          <EwRing value={revealed ? s : 0} max={60} label="Sec" />
        </div>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* 2. Programme — défilement horizontal épinglé                        */
/* ------------------------------------------------------------------ */

function StepCard({ item }: { item: ProgrammeItem }) {
  const p = usePalette()
  return (
    <div className="flex h-full flex-col justify-center px-2" style={{ width: 'min(400px, 74cqw)', flex: '0 0 auto' }}>
      <div className="mb-5 h-px w-10" style={{ background: `rgba(${p.inkOnCardRgb}, 0.15)` }} aria-hidden />
      <p className="font-display mt-3 text-[52px] leading-none" style={{ color: p.timelineAccent, fontVariationSettings: "'wght' 200" }}>
        {item.time}
      </p>
      <p className="font-display mt-3 text-[20px] italic" style={{ color: p.stepLabel }}>
        {item.label}
      </p>
      {item.sub && (
        <p className="mt-2 text-[14px]" style={{ color: `rgba(${p.inkOnCardRgb}, 0.55)` }}>
          {item.sub}
        </p>
      )}
    </div>
  )
}

/**
 * Piste horizontale épinglée — conteneur externe de 230vh, section sticky
 * top:0 de 100vh à l'intérieur (`container-type: inline-size` pour que les
 * étapes en `cqw` se dimensionnent sur SA largeur, `clip-path: inset(0)`
 * pour rogner la piste sans casser le sticky, cf. demande). Deux moteurs :
 *
 * - CSS natif (`animation-timeline`) quand `@supports` le confirme — pris
 *   en charge par `data-native="1"` + la classe `.ew-hprog-track` définie
 *   dans `EwEffectsStyles` : le navigateur pilote seul le `translateX` en
 *   fonction du scroll, aucun JS après le montage.
 * - Fallback JS (écouteur de scroll + rAF) sinon : progression calculée
 *   depuis la position du conteneur externe (230vh − 100vh de piste utile),
 *   appliquée en mutation directe de `style.transform` (pas de re-render
 *   React à 60fps).
 *
 * `prefers-reduced-motion` : aucun des deux — la piste redevient un simple
 * scroll horizontal natif avec `scroll-snap`, sans épinglage.
 */
export function HorizontalProgramme({
  programme,
  revealed,
  reducedMotion,
}: {
  programme: ProgrammeItem[]
  revealed: boolean
  reducedMotion: boolean
}) {
  const p = usePalette()
  const outerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [nativeSupported, setNativeSupported] = useState(false)

  useEffect(() => {
    setNativeSupported(typeof CSS !== 'undefined' && !!CSS.supports && CSS.supports('view-timeline-name: --x'))
  }, [])

  useEffect(() => {
    if (reducedMotion || nativeSupported) return
    const outer = outerRef.current
    const track = trackRef.current
    if (!outer || !track) return

    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const rect = outer.getBoundingClientRect()
        const total = rect.height - window.innerHeight
        const progress = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0
        const visibleWidth = track.parentElement?.clientWidth ?? window.innerWidth
        const maxShift = track.scrollWidth - visibleWidth
        track.style.transform = `translateX(${-progress * maxShift}px)`
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [nativeSupported, reducedMotion])

  const label = (
    <div style={reducedMotion ? undefined : { opacity: revealed ? 1 : 0, transform: revealed ? 'translateY(0)' : 'translateY(14px)', transition: 'opacity 0.6s cubic-bezier(.22,1,.36,1), transform 0.6s cubic-bezier(.22,1,.36,1)' }}>
      <p className="mb-7 text-center text-[19px] italic" style={{ color: p.sectionTitle }}>
        Le Programme
      </p>
    </div>
  )

  if (reducedMotion) {
    return (
      <section>
        {label}
        <div
          className="-mx-6 flex gap-6 overflow-x-auto px-6 pb-4 sm:mx-0 sm:px-0"
          style={{ background: p.bgProgramme, scrollSnapType: 'x mandatory', containerType: 'inline-size', borderRadius: 16, paddingTop: 24, paddingBottom: 24 }}
        >
          {programme.map((item, i) => (
            <div key={i} style={{ scrollSnapAlign: 'start' }}>
              <StepCard item={item} />
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section>
      {label}
      {/* rupture de la colonne étroite (max-w-420 hérité de DetailsSombre) pour un vrai plein-large, cf. demande */}
      <div ref={outerRef} className="ew-hprog-outer relative ml-[calc(50%-50vw)] w-screen" style={{ height: '230vh' }}>
        <div className="sticky top-0 h-screen overflow-hidden" style={{ containerType: 'inline-size', clipPath: 'inset(0)', background: p.bgProgramme }}>
          <div
            ref={trackRef}
            className="ew-hprog-track flex h-full items-center gap-10 px-[8cqw]"
            data-native={nativeSupported ? '1' : '0'}
            style={{ width: 'max-content', willChange: 'transform' }}
          >
            {programme.map((item, i) => (
              <StepCard key={i} item={item} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 3. Lieu — loupe magnétique sur carte SVG à deux calques              */
/* ------------------------------------------------------------------ */

/**
 * Carte stylisée : routes brunes organiques, rivière dorée en courbe de
 * Bézier, hachures de vignes fines — jamais un vrai plan.
 * `brightness(0.5)` du calque flouté (assombrir un fond déjà sombre)
 * retenu au départ ; devenu `brightness(1.08)` (léger délavage plutôt
 * qu'un assombrissement) une fois le fond de la carte passé en clair —
 * `brightness(0.5)` aurait viré la carte au gris boueux hors de la loupe.
 */
function StyledMapSvg({ blurred }: { blurred: boolean }) {
  const p = usePalette()
  return (
    <svg
      viewBox="0 0 240 200"
      className="absolute inset-0 h-full w-full"
      style={blurred ? { filter: 'blur(14px) saturate(0.3) brightness(1.08)' } : undefined}
      aria-hidden
    >
      <rect width="240" height="200" fill={p.bg} />
      <path d="M-10,150 Q50,120 82,155 T180,118 T260,138" stroke={p.mapLine} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.65" />
      <path d="M-10,58 Q60,90 102,54 T220,68" stroke={p.mapLine} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5" />
      {/* rivière dorée, courbe de Bézier */}
      <path d="M0,168 C60,140 110,190 170,150 C200,128 220,110 240,96" stroke={p.gold} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.75" />
      {/* hachures de vignes — parcelles en traits fins parallèles */}
      {Array.from({ length: 16 }).map((_, i) => {
        const x = 26 + (i % 8) * 11
        const y = 10 + Math.floor(i / 8) * 8
        return <line key={i} x1={x} y1={y} x2={x + 6} y2={y + 14} stroke={p.mapLine} strokeWidth="1" opacity="0.4" />
      })}
    </svg>
  )
}

/**
 * Loupe magnétique — deux calques identiques de la même carte SVG
 * empilés : le dessous flouté/désaturé en permanence, le dessus net mais
 * masqué par un `radial-gradient` de 150px centré sur `--mx`/`--my` (vraies
 * variables CSS, mises à jour en mutation directe — pas de re-render React
 * à chaque pointermove). Un anneau doré matérialise la loupe et suit le
 * curseur ; le curseur système est masqué dans la section. Sans pointeur
 * (mobile, jamais de pointermove), la loupe dérive seule sur une
 * trajectoire de Lissajous jusqu'au premier toucher.
 */
export function LieuMagnifier({
  venueName,
  venueAddress,
  mapsUrl,
  photoSrc = '/edwige-wilfried-lieu-photo.jpg',
}: {
  venueName: string
  venueAddress: string
  mapsUrl: string
  /** Photo au-dessus de la carte dynamique — fournie par Edwige & Wilfried (valeur par défaut, historique) ; omise si vide (cf. Léa & Olivier, aucune photo de lieu fournie pour l'instant). */
  photoSrc?: string
}) {
  const p = usePalette()
  const containerRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const maskRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const setPos = (xPct: number, yPct: number) => {
      el.style.setProperty('--mx', `${xPct}%`)
      el.style.setProperty('--my', `${yPct}%`)
      if (ringRef.current) {
        ringRef.current.style.left = `${xPct}%`
        ringRef.current.style.top = `${yPct}%`
      }
    }

    let usingPointer = false
    let driftT = 0
    let driftRAF = 0

    const drift = () => {
      if (usingPointer) return
      driftT += 0.006
      setPos(50 + 30 * Math.sin(driftT * 1.3), 50 + 24 * Math.sin(driftT * 2.1 + 1))
      driftRAF = requestAnimationFrame(drift)
    }

    const onPointerMove = (e: globalThis.PointerEvent) => {
      usingPointer = true
      cancelAnimationFrame(driftRAF)
      const rect = el.getBoundingClientRect()
      const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100))
      const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100))
      setPos(x, y)
    }

    setPos(50, 46)
    if (!reducedMotion) {
      el.addEventListener('pointermove', onPointerMove)
      driftRAF = requestAnimationFrame(drift)
    }
    return () => {
      el.removeEventListener('pointermove', onPointerMove)
      cancelAnimationFrame(driftRAF)
    }
  }, [])

  return (
    <>
      <EwLabel>Le Lieu</EwLabel>
      {/* Photo du lieu — fournie par la cliente, au-dessus de la carte
          dynamique (loupe magnétique). Même traitement visuel (rounded-2xl,
          même ratio) pour que les deux blocs s'enchaînent comme une seule
          pièce plutôt que deux éléments disparates. */}
      {photoSrc && <img src={photoSrc} alt={venueName} className="mb-5 aspect-[6/5] w-full rounded-2xl object-cover" />}
      <div
        ref={containerRef}
        className="relative aspect-[6/5] w-full overflow-hidden rounded-2xl [cursor:none]"
        style={{ background: p.bg, ['--mx' as string]: '50%', ['--my' as string]: '46%' } as CSSProperties}
      >
        <StyledMapSvg blurred />
        <div
          ref={maskRef}
          className="absolute inset-0 [-webkit-mask-image:radial-gradient(circle_150px_at_var(--mx)_var(--my),black_60%,transparent_100%)] [mask-image:radial-gradient(circle_150px_at_var(--mx)_var(--my),black_60%,transparent_100%)]"
        >
          <StyledMapSvg blurred={false} />
        </div>

        {/* anneau doré — matérialise la loupe, suit --mx/--my */}
        <div
          ref={ringRef}
          className="pointer-events-none absolute h-[150px] w-[150px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
          style={{ borderColor: p.gold, boxShadow: `0 0 24px rgba(${p.goldRgb}, 0.25)` }}
          aria-hidden
        />

        {/* point bordeaux — pulse en boucle (box-shadow ping) à l'emplacement du lieu */}
        <div
          className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ left: '50%', top: '46%', background: p.bordeaux, animation: 'ew-ping 2.2s cubic-bezier(0,0,0.2,1) infinite' }}
          aria-hidden
        />

        <div className="absolute left-5 top-5 max-w-[70%]">
          <p className="font-display text-[24px] italic leading-[1.15]" style={{ color: p.inkOnCard }}>
            {venueName}
          </p>
          <p className="mt-1 text-[13px]" style={{ color: `rgba(${p.inkOnCardRgb}, 0.65)` }}>
            {venueAddress}
          </p>
        </div>

        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-5 left-5 inline-flex items-center gap-1.5 text-[12.5px] font-semibold underline underline-offset-4"
          style={{ color: p.gold, textDecorationColor: p.gold }}
        >
          Voir sur la carte <span aria-hidden>→</span>
        </a>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* 4. Notre histoire — mots qui s'encrent au scroll                     */
/* ------------------------------------------------------------------ */

/**
 * Texte fourni ni par le couple ni par l'utilisateur — cette section a été
 * demandée uniquement par sa mécanique (mots qui s'encrent au scroll),
 * sans texte réel. Paragraphe générique écrit pour satisfaire la demande
 * technique (26ch de large, mots-clés « oui »/« verres »/« chandelles »/
 * « aube » intégrés naturellement pour qu'ils s'encrent en bordeaux comme
 * spécifié) — À REMPLACER par la vraie histoire du couple dès qu'elle est
 * fournie, ce n'est pas un texte définitif.
 */
const EW_HISTOIRE_TEXT =
  'Un jour, nos regards se sont trouvés. Nous avons dit oui à cette évidence, entre deux verres levés à la légèreté du monde. Depuis, chaque soir ressemble à une promesse — chandelles allumées, mots murmurés jusqu’à l’aube.'

const EW_HISTOIRE_KEYWORDS = ['oui', 'verres', 'chandelles', 'aube']

const normalizeWord = (w: string) => w.toLowerCase().replace(/[.,;:!?—«»"'’]/g, '')

/**
 * Paragraphe en Cormorant Garamond dans la demande d'origine — cette police
 * n'est chargée nulle part sur ce projet (uniquement Fraunces/Jost/Space
 * Grotesk, cf. index.html) ; en ajouter une 3e serif juste pour ce
 * paragraphe aurait cassé la cohérence typographique du reste de la page
 * pour un rendu très proche. Fraunces (`font-display`, déjà la police
 * serif du site) reprise à la place.
 *
 * Chaque mot dans son propre `<span className="ew-word-ink">` (cf.
 * EwEffectsStyles pour l'animation) — crème à 12% d'opacité par défaut,
 * bordeaux pour les mots-clés (même logique de couleur statique + seule
 * l'opacité anime, cf. doc de la classe CSS). `useEffect` : repli JS
 * seulement si le CSS natif (`animation-timeline: view()`) n'est pas
 * supporté — sinon rien à faire, le CSS pilote seul.
 */
export function NotreHistoire({
  text = EW_HISTOIRE_TEXT,
  keywords = EW_HISTOIRE_KEYWORDS,
  photos = [],
}: {
  /** Texte non fourni par défaut ni par le couple ni par l'utilisateur — À REMPLACER, cf. doc plus haut. Rendu paramétrable pour que chaque couple ait son propre texte (et ses propres mots-clés). */
  text?: string
  keywords?: string[]
  /** Galerie sous le texte — omise par défaut (vide), à fournir explicitement par la page (cf. Léa & Olivier ; retirée d'Edwige & Wilfried sur retour client bien qu'ils en avaient une). */
  photos?: string[]
}) {
  // Nommée `palette` (pas `p`, la convention du fichier) : `p` désigne déjà
  // l'élément DOM du paragraphe dans le useEffect juste en dessous.
  const palette = usePalette()
  const keywordSet = useMemo(() => new Set(keywords), [keywords])
  const pRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const nativeSupported = typeof CSS !== 'undefined' && !!CSS.supports && CSS.supports('animation-timeline: view()')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (nativeSupported || reducedMotion) return

    const p = pRef.current
    if (!p) return
    const spans = Array.from(p.querySelectorAll<HTMLElement>('.ew-word-ink'))

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle('ew-inked', entry.intersectionRatio > 0.15)
        })
      },
      // seuils multiples : l'observer doit re-déclencher à chaque petite
      // variation du ratio de recouvrement (pas juste 0/1) pour un effet
      // réversible qui suit le scroll, pas un simple aller simple.
      { threshold: Array.from({ length: 21 }, (_, i) => i / 20) },
    )
    spans.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [])

  // Un retour à la ligne à la fin de chaque phrase (split sur ". ", point
  // gardé collé à la phrase précédente) plutôt qu'un seul bloc qui
  // retourne à la ligne uniquement selon la largeur du conteneur — demandé
  // pour rythmer la lecture. L'index continue across phrases pour garder
  // des clés uniques, le scroll-ink (par mot) n'en dépend pas.
  const sentences = text.split(/(?<=\.) /).map((s) => s.split(' '))

  return (
    // plein cadre (sort de la colonne étroite max-w-420 héritée de
    // DetailsSombre), même technique que la piste du programme (cf.
    // HorizontalProgramme). Fond transparent (et non plus #0d0a08) sur
    // retour client : la section doit se fondre dans le fond clair de la
    // page (même mécanisme que la case Date), pas trancher comme une bande
    // sombre. Positionnée juste avant RSVP via le slot `renderBeforeRsvp`
    // (cf. FairePartEdwigeWilfried.tsx) — déplacée depuis avant Le
    // Programme sur retour client.
    <section className="relative ml-[calc(50%-50vw)] w-screen py-20" style={{ background: 'transparent' }}>
      <EwLabel>Notre histoire</EwLabel>
      <div className="mx-auto max-w-[26ch]">
        <p
          ref={pRef}
          className="font-display text-center italic"
          style={{ fontSize: 'clamp(1.6rem, 4vw, 2.8rem)', lineHeight: 1.6 }}
        >
          {sentences.map((sentenceWords, si) => (
            <span key={si} className="block" style={{ marginBottom: si < sentences.length - 1 ? '1em' : 0 }}>
              {sentenceWords.map((raw, i) => (
                <span
                  key={i}
                  className="ew-word-ink inline"
                  style={{ color: keywordSet.has(normalizeWord(raw)) ? palette.bordeaux : palette.ink }}
                >
                  {raw}{' '}
                </span>
              ))}
            </span>
          ))}
        </p>
      </div>
      {photos.length > 0 && <HorizontalPhotos photos={photos} />}
    </section>
  )
}

/**
 * Galerie photo — même mécanique que la piste épinglée du Programme
 * (HorizontalProgramme, cf. plus haut) : conteneur externe grand, cadre
 * `sticky` plein-écran, piste translatée horizontalement au scroll (le
 * client a d'abord demandé « scroll vertical », puis corrigé en
 * horizontal — cf. échange). Même triple implémentation : CSS natif
 * (`animation-timeline`, cf. EwEffectsStyles) en priorité, repli JS
 * (scroll + rAF) si non supporté, et défilement horizontal natif simple
 * (pas d'épinglage) si `prefers-reduced-motion`.
 *
 * `max-h-*` + `max-w-*` (pas `h-*` fixe) sur chaque photo : les photos
 * sont au format paysage (~4:3) — une hauteur fixe en vh les fait
 * déborder en largeur sur un écran étroit (mobile), coupant l'image sur
 * les côtés (constaté avec une vraie capture mobile). Avec les deux
 * contraintes en max + `w-auto`/`h-auto`, le navigateur choisit
 * lui-même la dimension limitante et la photo tient entière.
 */
function HorizontalPhotos({ photos }: { photos: string[] }) {
  const outerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [nativeSupported, setNativeSupported] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    setNativeSupported(typeof CSS !== 'undefined' && !!CSS.supports && CSS.supports('view-timeline-name: --x'))
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  useEffect(() => {
    if (reducedMotion || nativeSupported) return
    const outer = outerRef.current
    const track = trackRef.current
    if (!outer || !track) return

    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const rect = outer.getBoundingClientRect()
        const total = rect.height - window.innerHeight
        const progress = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0
        const visibleWidth = track.parentElement?.clientWidth ?? window.innerWidth
        const maxShift = track.scrollWidth - visibleWidth
        track.style.transform = `translateX(${-progress * maxShift}px)`
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [nativeSupported, reducedMotion])

  if (reducedMotion) {
    return (
      <div className="-mx-6 mt-14 flex gap-6 overflow-x-auto px-6 pb-4 sm:mx-0 sm:px-0" style={{ scrollSnapType: 'x mandatory' }}>
        {photos.map((src, i) => (
          <img
            key={i}
            src={src}
            alt=""
            className="h-auto max-h-[60vh] w-auto max-w-[84vw] shrink-0 rounded-2xl object-contain"
            style={{ scrollSnapAlign: 'start' }}
            loading="lazy"
          />
        ))}
      </div>
    )
  }

  return (
    <div ref={outerRef} className="ew-photos-outer relative mt-14 ml-[calc(50%-50vw)] w-screen" style={{ height: '230vh' }}>
      <div className="sticky top-0 h-screen overflow-hidden" style={{ containerType: 'inline-size' }}>
        <div
          ref={trackRef}
          className="ew-photos-track flex h-full"
          data-native={nativeSupported ? '1' : '0'}
          style={{ width: 'max-content', willChange: 'transform' }}
        >
          {/* Une diapo = 100cqw pile (pas juste la largeur naturelle de la
              photo) : la piste fait alors exactement N × 100cqw, et
              `translateX(calc(-100% + 100cqw))` s'arrête pile sur le bord
              gauche de la dernière diapo — aucun bout de la photo
              précédente ne dépasse plus dans le cadre à la fin du scroll
              (constaté sur mobile avant ce correctif). Chaque photo reste
              entière dans sa diapo via `object-contain`. */}
          {photos.map((src, i) => (
            <div key={i} className="flex h-full w-[100cqw] shrink-0 items-center justify-center px-[8cqw]">
              <img
                src={src}
                alt=""
                className="h-auto max-h-[72vh] w-auto max-w-full rounded-2xl object-contain"
                style={{ boxShadow: '0 12px 40px rgba(46,38,32,0.22)' }}
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 5. RSVP — sceau de cire pressé                                       */
/* ------------------------------------------------------------------ */

/**
 * Éclaboussure de 8 gouttelettes de cire — même technique que
 * spawnConfetti dans DetailsSombre.tsx (nœuds DOM hors React, physique
 * simple en JS), particules plus petites/rondes, trajet plus court.
 * `colors` en paramètre (pas `usePalette()`) : fonction utilitaire pure,
 * pas un composant — les hooks n'y sont pas utilisables, cf. l'appelant
 * (WaxSealRsvp) qui lui passe `[p.bordeaux, p.gold]`.
 */
function spawnDroplets(originEl: HTMLElement, colors: [string, string]) {
  const rect = originEl.getBoundingClientRect()
  const originX = rect.left + rect.width / 2
  const originY = rect.top + rect.height / 2
  const COUNT = 8
  const DURATION = 700
  const GRAVITY = 700

  const container = document.createElement('div')
  container.style.cssText = 'position:fixed; inset:0; pointer-events:none; z-index:9999; overflow:hidden;'
  document.body.appendChild(container)

  const particles = Array.from({ length: COUNT }, (_, i) => {
    const angle = (i / COUNT) * Math.PI * 2 + Math.random() * 0.4
    const speed = 140 + Math.random() * 160
    const size = 4 + Math.random() * 4
    const el = document.createElement('div')
    el.style.cssText = `position:absolute; width:${size}px; height:${size}px; border-radius:50%; background:${
      colors[i % colors.length]
    }; left:${originX}px; top:${originY}px;`
    container.appendChild(el)
    return { x: 0, y: 0, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 60, el }
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
      p.el.style.transform = `translate(${p.x}px, ${p.y}px)`
      p.el.style.opacity = String(Math.max(0, 1 - t))
    }
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

const HOLD_MS = 1400

/**
 * Bouton sceau de cire — appui maintenu 1,4s (pointerdown→pointerup,
 * `setPointerCapture` pour continuer à recevoir les événements même si le
 * doigt/curseur dérive hors du bouton). L'anneau (`conic-gradient` piloté
 * par la variable CSS `--p`, `@property`-déclarée dans EwEffectsStyles pour
 * être proprement interpolable en transition) est mis à jour en mutation
 * directe du DOM à chaque frame — pas de re-render React pendant l'appui,
 * seul du CSS anime à 60fps. Relâché trop tôt : `--p` retombe à 0 avec un
 * easing ressort. Complété : le sceau s'écrase (scale ressort),
 * `spawnDroplets` gicle, vibration longue, message doré en fondu.
 * Accessible clavier (Espace maintenu = même logique que pointerdown/up).
 */
export function WaxSealRsvp({
  label,
  weddingDateLabel,
  initials = 'É · W',
  onClick,
}: {
  label: string
  weddingDateLabel: string
  /** Initiales gravées au centre du sceau — « É · W » par défaut (Edwige & Wilfried, valeur d'origine avant que ce composant devienne partagé). */
  initials?: string
  onClick: () => void
}) {
  const p = usePalette()
  const btnRef = useRef<HTMLButtonElement>(null)
  const sealRef = useRef<HTMLSpanElement>(null)
  const [holding, setHolding] = useState(false)
  const [sealed, setSealed] = useState(false)
  const [squash, setSquash] = useState(false)
  const rafRef = useRef(0)
  const startRef = useRef(0)
  const lastQuarter = useRef(-1)

  const setRingProgress = (p: number) => {
    btnRef.current?.style.setProperty('--p', String(p))
    if (sealRef.current) sealRef.current.style.transform = `scale(${1 + p * 0.06})`
  }

  const tick = (now: number) => {
    const p = Math.min(1, (now - startRef.current) / HOLD_MS)
    setRingProgress(p)
    const quarter = Math.floor(p * 4)
    if (quarter > lastQuarter.current) {
      lastQuarter.current = quarter
      if (navigator.vibrate) navigator.vibrate(10)
    }
    if (p >= 1) {
      complete()
      return
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  const startHold = () => {
    if (sealed) return
    setHolding(true)
    if (btnRef.current) btnRef.current.style.transition = 'none'
    startRef.current = performance.now()
    lastQuarter.current = -1
    rafRef.current = requestAnimationFrame(tick)
  }

  const cancelHold = () => {
    cancelAnimationFrame(rafRef.current)
    setHolding(false)
    if (btnRef.current) {
      btnRef.current.style.transition = '--p 0.6s cubic-bezier(.34,1.56,.64,1)'
    }
    setRingProgress(0)
    if (sealRef.current) sealRef.current.style.transform = 'scale(1)'
  }

  const complete = () => {
    cancelAnimationFrame(rafRef.current)
    setHolding(false)
    setSealed(true)
    setSquash(true)
    if (navigator.vibrate) navigator.vibrate(40)
    if (btnRef.current) spawnDroplets(btnRef.current, [p.bordeaux, p.gold])
    window.setTimeout(() => setSquash(false), 500)
    onClick()
  }

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    startHold()
  }
  const onPointerUp = () => {
    if (!sealed) cancelHold()
  }
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.code === 'Space' && !holding && !sealed) {
      e.preventDefault()
      startHold()
    }
  }
  const onKeyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.code === 'Space' && !sealed) cancelHold()
  }

  return (
    <>
      <EwLabel>RSVP</EwLabel>
      <p className="mb-6 text-center text-[15px] leading-[1.6]" style={{ color: `rgba(${p.inkRgb}, 0.75)` }}>
        Nous serions honorés de vous compter parmi nous pour partager ce moment unique de notre vie.
      </p>
      <div className="flex flex-col items-center gap-5">
        <button
          ref={btnRef}
          type="button"
          aria-label={sealed ? 'Réponse scellée' : `${label} — maintenir l'appui`}
          disabled={sealed}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          className="relative flex h-[150px] w-[150px] select-none items-center justify-center rounded-full outline-none"
          style={
            {
              ['--p' as string]: 0,
              background: `conic-gradient(${p.gold} calc(var(--p) * 360deg), rgba(${p.goldRgb}, 0.18) calc(var(--p) * 360deg))`,
            } as CSSProperties
          }
        >
          <span
            ref={sealRef}
            className="flex h-[128px] w-[128px] items-center justify-center"
            style={{
              borderRadius: '47% 53% 50% 50% / 52% 48% 52% 48%',
              background: `radial-gradient(circle at 35% 30%, ${p.sealLight}, ${p.seal} 60%, ${p.sealDark} 100%)`,
              boxShadow: 'inset 0 6px 14px rgba(0,0,0,0.45), inset 0 -4px 10px rgba(255,255,255,0.08)',
              transform: squash ? 'scale(0.94)' : holding ? undefined : 'scale(1)',
              transition: squash ? 'transform 0.5s cubic-bezier(.34,1.56,.64,1)' : holding ? 'none' : 'transform 0.6s cubic-bezier(.34,1.56,.64,1)',
            }}
          >
            <span className="font-display italic text-[22px]" style={{ color: p.cream }}>
              {initials}
            </span>
          </span>
        </button>

        <p
          className="min-h-[1.6em] text-center text-[13.5px]"
          style={
            sealed
              ? { color: p.gold, fontStyle: 'italic', animation: 'ew-fade-in 0.8s ease forwards' }
              : { color: `rgba(${p.inkRgb}, 0.55)`, textTransform: 'uppercase', letterSpacing: '0.16em', fontSize: 12 }
          }
        >
          {sealed ? `Scellé. On vous attend le ${weddingDateLabel}.` : 'Maintenir pour sceller'}
        </p>
      </div>
    </>
  )
}

// 6. Foire aux questions — accordéon, sous RSVP -----------------------

/**
 * Contenu PROVISOIRE : seules les 3 questions ont été fournies par la
 * cliente (capture d'écran de maquette) — pas de réponses. Réponses
 * génériques plausibles écrites en attendant le vrai texte du couple,
 * signalées comme telles ici pour ne pas être oubliées.
 */
const EW_FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'Y a-t-il un parking disponible ?',
    a: 'Un parking est disponible sur place. Nous vous communiquerons les modalités précises avant le jour J.',
  },
  {
    q: 'Puis-je venir accompagné(e) ?',
    a: "Le nombre de places étant compté, merci de vous en tenir aux personnes indiquées sur votre invitation. N'hésitez pas à nous contacter pour toute question.",
  },
  {
    q: 'À quelle heure faut-il arriver ?',
    a: "Nous vous recommandons d'arriver un peu avant le début de la cérémonie afin de vous installer tranquillement.",
  },
]

function FaqItemCard({ item, open, onToggle }: { item: { q: string; a: string }; open: boolean; onToggle: () => void }) {
  const p = usePalette()
  return (
    <div className="overflow-hidden rounded-2xl shadow-[0_1px_3px_rgba(46,38,32,0.08)]" style={{ background: p.bg }}>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span className="font-display text-[16px] italic" style={{ color: p.inkOnCard }}>
          {item.q}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className="shrink-0 transition-transform duration-300"
          style={{ transform: open ? 'rotate(180deg)' : 'none', color: p.inkOnCard, opacity: 0.5 }}
        >
          <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <p className="px-6 pb-5 text-[14px] leading-[1.6]" style={{ color: `rgba(${p.inkOnCardRgb}, 0.7)` }}>
            {item.a}
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Section « Foire aux questions » — accordéon crème/blanc (cf. maquette
 * fournie), positionnée sous RSVP via le slot `renderAfterRsvp` de
 * DetailsSombre. Une seule question ouverte à la fois plutôt qu'un état
 * par carte — plus lisible sur une section courte (3 questions).
 */
export function FoireAuxQuestions({ items = EW_FAQ_ITEMS }: { items?: { q: string; a: string }[] }) {
  const p = usePalette()
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section>
      <EwLabel>Foire aux questions</EwLabel>
      <p className="mb-8 text-center text-[13px]" style={{ color: `rgba(${p.inkRgb}, 0.55)` }}>
        Tout ce que vous devez savoir
      </p>
      <div className="flex flex-col gap-4">
        {items.map((item, i) => (
          <FaqItemCard key={item.q} item={item} open={openIndex === i} onToggle={() => setOpenIndex(openIndex === i ? null : i)} />
        ))}
      </div>
    </section>
  )
}

// 7. Dress code — teintes suggérées -------------------------------------

/**
 * 3 teintes pastel approximant la capture fournie par la cliente (lavande,
 * beige, rose) — à ajuster si elle a des références précises (Pantone,
 * nuancier). Le texte de description et le footnote "Merci d'éviter le
 * blanc" reprennent tels quels ceux visibles sur la capture, pas inventés.
 */
const EW_DRESS_CODE_COLORS = ['#B9A3CC', '#D8B99A', '#E8A9BC']

/**
 * Remplace le rendu par défaut de DetailsSombre (juste `dressCode` en texte
 * brut) — mêmes conventions typographiques que le reste de la page
 * (EwLabel pour le titre, pas de script font : Fraunces reste la seule
 * serif chargée sur ce projet, cf. NotreHistoire pour le même choix).
 */
/**
 * Pastille avec anneau qui se trace — choisie parmi 3 propositions
 * d'animation (nuancier en éventail / goutte qui s'épanouit / anneau qui
 * se trace), prototypées dans un fichier HTML autonome puis validées par
 * la cliente. Reprend exactement la mécanique des 4 anneaux du compte à
 * rebours (EwRing plus haut) — SVG, stroke-dasharray/dashoffset, cercle
 * qui se dessine — pour un écho visuel direct plutôt qu'un 5e mécanisme
 * d'animation différent sur la même page. Séquence par pastille (delay =
 * index × 180ms) : l'anneau se trace en premier (550ms), puis la pastille
 * se remplit par un scale ressort une fois le tracé terminé.
 */
function DressCodeSwatch({ color, index, revealed, reducedMotion }: { color: string; index: number; revealed: boolean; reducedMotion: boolean }) {
  const p = usePalette()
  const size = 52
  const strokeWidth = 2
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const ringDelay = index * 300
  const ringDuration = 1300
  const swatchDelay = ringDelay + ringDuration

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={p.gold}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={reducedMotion || revealed ? 0 : circumference}
          style={{
            transition: reducedMotion ? 'none' : `stroke-dashoffset ${ringDuration}ms ease`,
            transitionDelay: reducedMotion ? '0ms' : `${ringDelay}ms`,
          }}
        />
      </svg>
      <span
        className="absolute rounded-full"
        style={{
          inset: 4,
          background: color,
          boxShadow: '0 2px 6px rgba(46,38,32,0.18)',
          border: '2px solid #fff',
          transform: reducedMotion || revealed ? 'scale(1)' : 'scale(0)',
          transition: reducedMotion ? 'none' : 'transform 0.4s cubic-bezier(.34,1.56,.64,1)',
          transitionDelay: reducedMotion ? '0ms' : `${swatchDelay}ms`,
        }}
      />
    </div>
  )
}

export function DressCodeCard({
  dressCode,
  colors = EW_DRESS_CODE_COLORS,
  revealed = true,
  reducedMotion = false,
}: {
  dressCode: string
  /** Teintes des pastilles — 3 par défaut (pastel, cf. doc plus haut) ; non fournies pour Léa & Olivier, dérivées de leur dress code textuel « Rouge et noir » (2 teintes, pas 3 : pas de 3e couleur inventée). */
  colors?: string[]
  revealed?: boolean
  reducedMotion?: boolean
}) {
  const p = usePalette()
  return (
    <section className="text-center">
      <EwLabel>Dress Code</EwLabel>
      <p className="text-[15px] leading-[1.6]" style={{ color: `rgba(${p.inkRgb}, 0.75)` }}>
        {dressCode}
      </p>
      <p className="mt-8 mb-5 text-[12px] uppercase tracking-[0.16em]" style={{ color: `rgba(${p.inkRgb}, 0.5)` }}>
        Teintes suggérées
      </p>
      <div className="flex items-center justify-center gap-4">
        {colors.map((c, i) => (
          <DressCodeSwatch key={c} color={c} index={i} revealed={revealed} reducedMotion={reducedMotion} />
        ))}
      </div>
      <p className="mt-6 font-display text-[13px] italic" style={{ color: `rgba(${p.inkRgb}, 0.45)` }}>
        Merci d'éviter le blanc, réservé aux mariés
      </p>
    </section>
  )
}

/**
 * Hébergements en cartes qui apparaissent en cascade — « proposition 1 »
 * du prototype HTML autonome (fondu + léger glissement vers le haut,
 * décalé de 150ms par carte), validée par Léa & Olivier. Chaque entrée de
 * `lodging` est du texte libre du type "Nom (Lieu)" (cf. LODGING_OPTIONS) ;
 * on sépare nom et lieu pour l'affichage en carte si ce gabarit matche,
 * sinon on retombe sur le texte brut en une seule ligne — jamais de contenu
 * inventé. Le déclenchement au scroll (`revealed`) est le même mécanisme
 * que le reste de la page (RevealBlock côté DetailsSombre) : pas un 2e
 * système d'animation, juste une transition CSS pilotée par ce booléen.
 */
export function LodgingCascadeCard({
  lodging,
  revealed = true,
  reducedMotion = false,
}: {
  lodging: string[]
  revealed?: boolean
  reducedMotion?: boolean
}) {
  const p = usePalette()
  return (
    <section className="text-center">
      <EwLabel>Hébergements</EwLabel>
      <div className="mx-auto flex max-w-[420px] flex-col gap-3">
        {lodging.map((item, i) => {
          const match = /^(.+?)\s*\((.+)\)$/.exec(item)
          const name = match ? match[1] : item
          const place = match ? match[2] : null
          return (
            <div
              key={item}
              className="rounded-2xl px-6 py-4 text-left"
              style={{
                background: p.bg,
                opacity: reducedMotion || revealed ? 1 : 0,
                transform: reducedMotion || revealed ? 'translateY(0)' : 'translateY(18px)',
                transition: reducedMotion
                  ? 'none'
                  : 'opacity 0.6s cubic-bezier(0.22,1,0.36,1), transform 0.6s cubic-bezier(0.22,1,0.36,1)',
                transitionDelay: reducedMotion ? '0ms' : `${i * 150}ms`,
              }}
            >
              <p className="font-display text-[16px] italic" style={{ color: p.inkOnCard }}>
                {name}
              </p>
              {place && (
                <p className="mt-0.5 text-[13px]" style={{ color: `rgba(${p.inkOnCardRgb}, 0.6)` }}>
                  {place}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
