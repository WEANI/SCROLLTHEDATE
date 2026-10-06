import type { CSSProperties, ReactNode } from 'react'
import { useGoogleFont } from '@/components/hero-scrub/heroDecor'
import './section-decor.css'
import {
  SECTION_KICKERS,
  SectionDecorContext,
  backgroundLayerClass,
  sectionDecorRootProps,
  useSectionDecor,
  type SectionDecor,
} from './sectionDecor'

/**
 * Pièces de l'habillage des sections : le calque de fond, les illustrations,
 * les séparateurs et les titres. Le catalogue est dans sectionDecor.ts, le
 * dessin dans section-decor.css.
 *
 * Les tracés SVG ci-dessous sont repris tels quels de la maquette
 * d'habillage validée le 05/10/2026 — ils sont écrits à la main une fois
 * pour toutes, pas recalculés à l'exécution. Ils n'ont aucune couleur
 * propre : `currentColor` leur donne l'accent de la palette.
 */

/** Fournit le choix d'habillage du projet à toute la page (cf. FairePart.tsx). */
export function SectionDecorProvider({ decor, children }: { decor: SectionDecor; children: ReactNode }) {
  return <SectionDecorContext.Provider value={decor}>{children}</SectionDecorContext.Provider>
}

/* ------------------------------------------------------------------ */
/* Illustrations                                                       */
/* ------------------------------------------------------------------ */

const ILLUSTRATION_ART: Record<string, { viewBox: string; art: ReactNode }> = {
  alliances: { viewBox: '0 0 140 70', art: <><circle cx="60" cy="40" r="16"/><circle cx="80" cy="40" r="16"/><path d="M60 18 L64 22 L60 26 L56 22 Z" fill="currentColor" fillOpacity=".25"/><path d="M60 24 L60 26"/></> },
  champagne: { viewBox: '0 0 140 70', art: <><g transform="translate(60 14) rotate(-14)"><path d="M-6 0 L6 0 L4.5 22 Q2 27 0 28 Q-2 27 -4.5 22 Z"/><path d="M0 28 L0 46 M-7 46 L7 46"/><path d="M-5 8 L5 8" strokeOpacity=".5"/></g><g transform="translate(80 14) rotate(14)"><path d="M-6 0 L6 0 L4.5 22 Q2 27 0 28 Q-2 27 -4.5 22 Z"/><path d="M0 28 L0 46 M-7 46 L7 46"/><path d="M-5 8 L5 8" strokeOpacity=".5"/></g><circle cx="70" cy="6" r="1.4" fill="currentColor"/><circle cx="64" cy="3" r=".9" fill="currentColor"/><circle cx="76" cy="3" r=".9" fill="currentColor"/></> },
  solitaire: { viewBox: '0 0 140 70', art: <><circle cx="70" cy="50" r="13"/><path d="M56 26h28l-7-10H63z"/><path d="M56 26 70 42 84 26"/><path d="M63 16 66 26 70 42 74 26 77 16"/><path d="M66 26h8"/><path d="M62 36l-3 4M78 36l3 4"/></> },
  colombes: { viewBox: '0 0 140 70', art: <><g transform="translate(30 24)"><path d="M22 10C14 7 5 10 2 16c4 3 12 4 18 1 3-1.6 4-5 2-7Z"/><circle cx="24" cy="8" r="3.2"/><path d="M27 7.4 32 8.6 27 10"/><circle cx="25.4" cy="7" r=".8" fill="currentColor" stroke="none"/><path d="M17 9C16 4 18.5.6 23-1c-2 4.4-3.4 7.6-4.4 10.6Z"/><path d="M2 16-4 12M2 16-5 15.4M2 16-4 19"/></g><g transform="translate(110 24) scale(-1 1)"><path d="M22 10C14 7 5 10 2 16c4 3 12 4 18 1 3-1.6 4-5 2-7Z"/><circle cx="24" cy="8" r="3.2"/><path d="M27 7.4 32 8.6 27 10"/><circle cx="25.4" cy="7" r=".8" fill="currentColor" stroke="none"/><path d="M17 9C16 4 18.5.6 23-1c-2 4.4-3.4 7.6-4.4 10.6Z"/><path d="M2 16-4 12M2 16-5 15.4M2 16-4 19"/></g><path transform="translate(65 32) scale(1.2)" d="M5 9.3C-.6 5.2.2 1.2 2.6 1.2 3.9 1.2 4.7 2.1 5 2.9 5.3 2.1 6.1 1.2 7.4 1.2 9.8 1.2 10.6 5.2 5 9.3Z" fill="currentColor" stroke="none"/></> },
  piece_montee: { viewBox: '0 0 140 70', art: <><path d="M42 64h56"/><path d="M48 64V52a2 2 0 0 1 2-2h40a2 2 0 0 1 2 2v12"/><path d="M56 50V40a2 2 0 0 1 2-2h24a2 2 0 0 1 2 2v10"/><path d="M62 38V30a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8"/><path d="M49 56a5.4 5.4 0 0 0 10.8 0 5.4 5.4 0 0 0 10.8 0 5.4 5.4 0 0 0 10.8 0 5.4 5.4 0 0 0 10.8 0"/><path d="M57 44a3.4 3.4 0 0 0 6.8 0 3.4 3.4 0 0 0 6.8 0 3.4 3.4 0 0 0 6.8 0 3.4 3.4 0 0 0 6.8 0"/><path d="M63 34a3.7 3.7 0 0 0 7.4 0 3.7 3.7 0 0 0 7.4 0"/><path transform="translate(65 14) scale(1)" d="M5 9.3C-.6 5.2.2 1.2 2.6 1.2 3.9 1.2 4.7 2.1 5 2.9 5.3 2.1 6.1 1.2 7.4 1.2 9.8 1.2 10.6 5.2 5 9.3Z" fill="currentColor" stroke="none"/></> },
  arche: { viewBox: '0 0 140 70', art: <><path d="M40 66V38a30 26 0 0 1 60 0v28"/><ellipse cx="40.0" cy="32.5" rx="5.5" ry="2" transform="rotate(270.0 40.0 32.5)"/><ellipse cx="40.0" cy="32.5" rx="5.5" ry="3.4000000000000004" transform="rotate(-90.0 40.0 32.5)"/><ellipse cx="45.2" cy="36.3" rx="5.5" ry="3.4000000000000004" transform="rotate(-18.0 45.2 36.3)"/><ellipse cx="43.2" cy="42.4" rx="5.5" ry="3.4000000000000004" transform="rotate(54.0 43.2 42.4)"/><ellipse cx="36.8" cy="42.4" rx="5.5" ry="3.4000000000000004" transform="rotate(126.0 36.8 42.4)"/><ellipse cx="34.8" cy="36.3" rx="5.5" ry="3.4000000000000004" transform="rotate(198.0 34.8 36.3)"/><circle cx="40" cy="38" r="2.0" fill="currentColor" stroke="none"/><ellipse cx="43.2" cy="24.7" rx="5.5" ry="2" transform="rotate(288.0 43.2 24.7)"/><ellipse cx="49.0" cy="18.3" rx="5.5" ry="2" transform="rotate(306.0 49.0 18.3)"/><ellipse cx="56.8" cy="13.7" rx="5.5" ry="2" transform="rotate(324.0 56.8 13.7)"/><ellipse cx="52.4" cy="11.5" rx="5.5" ry="3.4000000000000004" transform="rotate(-90.0 52.4 11.5)"/><ellipse cx="57.6" cy="15.3" rx="5.5" ry="3.4000000000000004" transform="rotate(-18.0 57.6 15.3)"/><ellipse cx="55.6" cy="21.4" rx="5.5" ry="3.4000000000000004" transform="rotate(54.0 55.6 21.4)"/><ellipse cx="49.1" cy="21.4" rx="5.5" ry="3.4000000000000004" transform="rotate(126.0 49.1 21.4)"/><ellipse cx="47.1" cy="15.3" rx="5.5" ry="3.4000000000000004" transform="rotate(198.0 47.1 15.3)"/><circle cx="52.366442431225806" cy="16.965558146251368" r="2.0" fill="currentColor" stroke="none"/><ellipse cx="66.0" cy="11.6" rx="5.5" ry="2" transform="rotate(342.0 66.0 11.6)"/><ellipse cx="75.5" cy="12.0" rx="5.5" ry="2" transform="rotate(360.0 75.5 12.0)"/><ellipse cx="84.5" cy="15.0" rx="5.5" ry="2" transform="rotate(378.0 84.5 15.0)"/><ellipse cx="79.3" cy="7.8" rx="5.5" ry="3.4000000000000004" transform="rotate(-90.0 79.3 7.8)"/><ellipse cx="84.5" cy="11.6" rx="5.5" ry="3.4000000000000004" transform="rotate(-18.0 84.5 11.6)"/><ellipse cx="82.5" cy="17.7" rx="5.5" ry="3.4000000000000004" transform="rotate(54.0 82.5 17.7)"/><ellipse cx="76.0" cy="17.7" rx="5.5" ry="3.4000000000000004" transform="rotate(126.0 76.0 17.7)"/><ellipse cx="74.0" cy="11.6" rx="5.5" ry="3.4000000000000004" transform="rotate(198.0 74.0 11.6)"/><circle cx="79.27050983124842" cy="13.272530576326005" r="2.0" fill="currentColor" stroke="none"/><ellipse cx="92.1" cy="20.2" rx="5.5" ry="2" transform="rotate(396.0 92.1 20.2)"/><ellipse cx="97.5" cy="27.2" rx="5.5" ry="2" transform="rotate(414.0 97.5 27.2)"/><ellipse cx="100.2" cy="35.2" rx="5.5" ry="2" transform="rotate(432.0 100.2 35.2)"/><ellipse cx="98.5" cy="24.5" rx="5.5" ry="3.4000000000000004" transform="rotate(-90.0 98.5 24.5)"/><ellipse cx="103.8" cy="28.3" rx="5.5" ry="3.4000000000000004" transform="rotate(-18.0 103.8 28.3)"/><ellipse cx="101.8" cy="34.4" rx="5.5" ry="3.4000000000000004" transform="rotate(54.0 101.8 34.4)"/><ellipse cx="95.3" cy="34.4" rx="5.5" ry="3.4000000000000004" transform="rotate(126.0 95.3 34.4)"/><ellipse cx="93.3" cy="28.3" rx="5.5" ry="3.4000000000000004" transform="rotate(198.0 93.3 28.3)"/><circle cx="98.53169548885461" cy="29.96555814625136" r="2.0" fill="currentColor" stroke="none"/><ellipse cx="100.0" cy="43.5" rx="5.5" ry="2" transform="rotate(450.0 100.0 43.5)"/><path d="M40 50q10 8 10 18"/><path d="M100 50q-10 8-10 18"/></> },
  noeud: { viewBox: '0 0 140 70', art: <><path d="M70 34C57 25 42 29 44 38c2 9 17 8 26 0"/><path d="M70 34c13-9 28-5 26 4-2 9-17 8-26 0"/><ellipse cx="70" cy="35" rx="4.6" ry="4"/><path d="M67 39c-5 10-9 15-13 20l7-2 1 6"/><path d="M73 39c5 10 9 15 13 20l-7-2-1 6"/></> },
  couvert: { viewBox: '0 0 140 70', art: <><circle cx="70" cy="40" r="17"/><circle cx="70" cy="40" r="12.5"/><path d="M62 46l8-14 8 14"/><path d="M44 24v9c0 3 1.5 4 3 4.5V56"/><path d="M44 24v9M47 24v9M50 24v9c0 3-1.5 4-3 4.5"/><path d="M93 56V24c4 2 5 8 5 12s-1 6-5 6"/></> },
}

/** Description lue par les lecteurs d'écran — un dessin muet n'apporte rien. */
const ILLUSTRATION_LABELS: Record<string, string> = {
  alliances: 'Deux alliances',
  champagne: 'Deux coupes de champagne',
  solitaire: 'Une bague de fiançailles',
  colombes: 'Deux colombes',
  piece_montee: 'Une pièce montée',
  arche: 'Une arche de cérémonie fleurie',
  noeud: 'Un nœud de ruban',
  couvert: 'Un couvert dressé'
}

/** Illustration au trait posée au-dessus du titre d'une section. */
export function SectionIllustration({ id }: { id: string }) {
  const art = ILLUSTRATION_ART[id]
  if (!art) return null
  return (
    <svg
      className="fpd-orn"
      viewBox={art.viewBox}
      role="img"
      aria-label={ILLUSTRATION_LABELS[id] ?? ''}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {art.art}
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Séparateurs                                                         */
/* ------------------------------------------------------------------ */

const SEPARATOR_ART: Record<string, { viewBox: string; width: number; art: ReactNode }> = {
  alliances: { viewBox: '0 0 80 18', width: 92, art: <><path d="M2 9h22"/><path d="M56 9h22"/><circle cx="33" cy="9" r="6"/><circle cx="45" cy="9" r="6"/></> },
  coeur: { viewBox: '0 0 80 18', width: 92, art: <><path d="M2 9h24"/><path d="M54 9h24"/><path transform="translate(31 3) scale(1.8)" d="M5 9.3C-.6 5.2.2 1.2 2.6 1.2 3.9 1.2 4.7 2.1 5 2.9 5.3 2.1 6.1 1.2 7.4 1.2 9.8 1.2 10.6 5.2 5 9.3Z" fill="currentColor" stroke="none"/></> },
  ruban: { viewBox: '0 0 80 18', width: 92, art: <><path d="M2 9h20"/><path d="M58 9h20"/><path d="M40 9C34 4 26 6 27 10c1 4 9 4 13 0"/><path d="M40 9c6-5 14-3 13 1-1 4-9 4-13 0"/><ellipse cx="40" cy="9.4" rx="2.4" ry="2.1"/><path d="M38 11l-3 6M42 11l3 6"/></> },
  perles: { viewBox: '0 0 80 18', width: 86, art: <><circle cx="8" cy="9" r="2.2" fill="currentColor" stroke="none" fillOpacity="0.75"/><circle cx="16" cy="9" r="2.2" fill="currentColor" stroke="none" fillOpacity="0.75"/><circle cx="24" cy="9" r="2.2" fill="currentColor" stroke="none" fillOpacity="0.75"/><circle cx="32" cy="9" r="2.8" fill="currentColor" stroke="none" fillOpacity="0.75"/><circle cx="40" cy="9" r="3.4" fill="currentColor" stroke="none" fillOpacity="1"/><circle cx="48" cy="9" r="2.8" fill="currentColor" stroke="none" fillOpacity="0.75"/><circle cx="56" cy="9" r="2.2" fill="currentColor" stroke="none" fillOpacity="0.75"/><circle cx="64" cy="9" r="2.2" fill="currentColor" stroke="none" fillOpacity="0.75"/><circle cx="72" cy="9" r="2.2" fill="currentColor" stroke="none" fillOpacity="0.75"/></> },
  sceau: { viewBox: '0 0 80 22', width: 92, art: <><path d="M2 11h22"/><path d="M56 11h22"/><path d="M48.8 11.0L46.8 14.3L45.5 17.9L41.7 18.4L38.0 19.6L35.3 16.9L32.1 14.8L32.4 11.0L32.1 7.2L35.3 5.1L38.0 2.4L41.7 3.6L45.5 4.1L46.8 7.7Z" fill="currentColor" stroke="none" fillOpacity=".9"/><circle cx="40" cy="11" r="5.2" stroke="var(--fpd-bg)" strokeWidth="1"/></> },
}

const SEPARATOR_LABELS: Record<string, string> = {
  alliances: 'Deux alliances',
  coeur: 'Un cœur',
  ruban: 'Un nœud de ruban',
  perles: 'Un rang de perles',
  sceau: 'Un sceau de cire'
}

/**
 * Le séparateur d'origine : un filet, trois losanges, un filet. Reste piloté
 * par une couleur passée en paramètre (et non par la palette) parce qu'il
 * est antérieur à l'habillage : dans DetailsSombre c'est l'accent du thème,
 * pas celui de la palette.
 */
export function DefaultDivider({ color }: { color: string }) {
  return (
    <div className="my-16 flex items-center justify-center gap-2.5" style={{ color }} aria-hidden>
      <span className="h-px max-w-24 flex-1" style={{ background: 'linear-gradient(to right, transparent, currentColor 45%, currentColor 55%, transparent)' }} />
      <span className="h-[5px] w-[5px] rotate-45" style={{ background: 'currentColor' }} />
      <span className="h-[9px] w-[9px] rotate-45" style={{ background: 'currentColor' }} />
      <span className="h-[5px] w-[5px] rotate-45" style={{ background: 'currentColor' }} />
      <span className="h-px max-w-24 flex-1" style={{ background: 'linear-gradient(to left, transparent, currentColor 45%, currentColor 55%, transparent)' }} />
    </div>
  )
}

/**
 * Séparateur entre deux sections. `id` vide = le filet-et-trois-losanges
 * d'origine, rendu par DetailsSombre lui-même (il dépend de sa couleur de
 * thème) : ce composant ne gère que les remplaçants.
 */
export function SectionSeparator({ id }: { id: string }) {
  if (id === 'filet') return <div className="fpd-sep" aria-hidden><span className="fpd-sep-filet" /></div>
  if (id === 'losange') {
    return (
      <div className="fpd-sep fpd-sep-losange" aria-hidden>
        <i /><b /><i />
      </div>
    )
  }
  const art = SEPARATOR_ART[id]
  if (!art) return null
  return (
    <div className="fpd-sep">
      <svg
        className="fpd-sep-svg"
        style={{ width: art.width }}
        viewBox={art.viewBox}
        role="img"
        aria-label={SEPARATOR_LABELS[id] ?? ''}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {art.art}
      </svg>
    </div>
  )
}

/** Illustration de la section nommée, d'après l'habillage du projet. À utiliser quand le titre n'est pas rendu par `SectionTitle` (titre-bouton dépliant). */
export function SectionIllustrationFor({ section }: { section: string }) {
  const { illus } = useSectionDecor()
  return <SectionIllustration id={illus[section] ?? ''} />
}

/* ------------------------------------------------------------------ */
/* Titres de section                                                   */
/* ------------------------------------------------------------------ */

/**
 * Découpe le titre en lettres pour l'animation « lettre par lettre ».
 * L'espace devient insécable : chaque lettre est `inline-block`, et un
 * espace normal se replierait entre deux blocs.
 */
function Letters({ text }: { text: string }) {
  return (
    <>
      {Array.from(text).map((ch, i) => (
        <span key={i} className="fpd-ch" style={{ '--j': i } as CSSProperties}>
          {ch === ' ' ? '\u00a0' : ch}
        </span>
      ))}
    </>
  )
}

/**
 * Titre d'une section (« La date », « Le Lieu », « RSVP »…), avec son
 * illustration éventuelle au-dessus.
 *
 * `section` identifie la section dans l'habillage du projet (cf.
 * FAIRE_PART_SECTIONS) : c'est elle qui décide de l'illustration et du
 * surtitre. Le style, lui, est commun à toute la page.
 */
export function SectionTitle({
  section,
  color,
  children,
}: {
  section: string
  color: string
  children: string
}) {
  const decor = useSectionDecor()
  const style = decor.titleStyle
  // La calligraphie est la seule à demander une police hors de celles du
  // site : chargée à la demande, et seulement si ce style est retenu.
  useGoogleFont(style === 'calli' ? 'great-vibes' : undefined)
  const illustration = decor.illus[section] ?? ''
  const splitLetters = decor.reveal === 'letters'
  const titleStyle = { '--fpd-title': color, color } as CSSProperties

  let title: ReactNode
  if (style === 'surtitre') {
    const kicker = SECTION_KICKERS[section]
    title = (
      <p className="fpd-ti fpd-ti-surtitre" style={titleStyle}>
        {kicker ? <span className="fpd-k">{kicker}</span> : null}
        <span className="fpd-n">{splitLetters ? <Letters text={children} /> : children}</span>
      </p>
    )
  } else if (style === 'initiale') {
    title = (
      <p className="fpd-ti fpd-ti-initiale" style={titleStyle}>
        <span className="fpd-big" aria-hidden>
          {children.trim().charAt(0).toUpperCase()}
        </span>
        <span>{splitLetters ? <Letters text={children} /> : children}</span>
      </p>
    )
  } else {
    title = (
      <p className={`fpd-ti${style ? ` fpd-ti-${style}` : ''}`} style={titleStyle}>
        {/* Les filets sont des pseudo-éléments : le texte a besoin de son
            propre conteneur pour ne pas s'étirer entre eux. */}
        {style === 'filets' ? <span>{splitLetters ? <Letters text={children} /> : children}</span> : splitLetters ? <Letters text={children} /> : children}
      </p>
    )
  }

  if (!illustration) return title
  return (
    <>
      <SectionIllustration id={illustration} />
      {title}
    </>
  )
}

/**
 * Même habillage de titre, mais en `<span>` : pour les deux sections dont
 * le titre EST un bouton dépliant (Notre histoire, Menu du dîner). Un `<p>`
 * dans un `<button>` serait du HTML invalide, et les styles de
 * `SectionTitle` posent une mise en page de bloc (marge, flex en colonne)
 * qui casserait l'alignement du titre avec son chevron.
 *
 * Deux conséquences assumées : l'illustration se pose au-dessus du bouton
 * (via `SectionIllustrationFor`, pas ici), et le style « surtitre et titre »
 * retombe sur le titre seul — empiler deux lignes dans un contrôle
 * cliquable rendrait la zone de clic confuse.
 */
export function SectionTitleInline({ children }: { children: string }) {
  const decor = useSectionDecor()
  const style = decor.titleStyle
  useGoogleFont(style === 'calli' ? 'great-vibes' : undefined)
  const text = decor.reveal === 'letters' ? <Letters text={children} /> : children

  if (style === 'initiale') {
    return (
      <span className="fpd-tib fpd-tib-initiale">
        <span className="fpd-big" aria-hidden>
          {children.trim().charAt(0).toUpperCase()}
        </span>
        <span>{text}</span>
      </span>
    )
  }
  const variant = style && style !== 'surtitre' ? ` fpd-tib-${style}` : ''
  return <span className={`fpd-tib${variant}`}>{text}</span>
}

/* ------------------------------------------------------------------ */
/* Aperçu pour le studio                                              */
/* ------------------------------------------------------------------ */

/**
 * Vignette d'aperçu d'un habillage — utilisée par le studio pour montrer
 * chaque entrée des bibliothèques.
 *
 * Elle monte EXACTEMENT les mêmes classes et les mêmes composants que la
 * vraie page : pas de rendu approché à maintenir en double, et ce que le
 * studio voit est ce que l'invité verra. Le fond est posé en `inset: 0`
 * plutôt qu'en pleine largeur (la vignette n'est pas la page) — seule
 * différence, et elle n'a pas d'incidence sur le motif, dimensionné en
 * `cqw`, donc relatif à la vignette.
 *
 * `aria-hidden` : c'est une image du réglage, le réglage lui-même est déjà
 * nommé par le bouton qui porte la vignette.
 */
export function SectionDecorPreview({
  palette,
  pageBg,
  decor,
  section,
  title,
}: {
  palette: { bg: string; ink: string; inkRgb: string; gold: string; bordeaux: string }
  pageBg: string
  decor: SectionDecor
  section: string
  title: string
}) {
  const root = sectionDecorRootProps(palette, pageBg)
  const layer = backgroundLayerClass(decor.bgs[section] ?? '')
  return (
    <div
      className={`fpd-preview ${root.className}`}
      style={{ ...root.style, background: pageBg, color: palette.ink }}
      aria-hidden
    >
      <SectionDecorProvider decor={decor}>
        <div className={`fpd-sec${layer ? ' has-bg' : ''}${decor.reveal ? ` fpd-rv-${decor.reveal}` : ''} is-in`}>
          {layer ? <span className={layer} /> : null}
          {decor.reveal === 'line' ? <span className="fpd-rule" /> : null}
          <div className="fpd-body">
            <SectionTitle section={section} color={palette.gold}>
              {title}
            </SectionTitle>
            <p className="fpd-preview-l1">Domaine des Oliviers</p>
            <p className="fpd-preview-l2">Route de Gordes · Provence</p>
          </div>
        </div>
      </SectionDecorProvider>
    </div>
  )
}
