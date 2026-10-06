/**
 * Habillage des sections du faire-part — fonds, illustrations, séparateurs,
 * animations d'apparition et styles de titre.
 *
 * Catalogue retenu par le client le 05/10/2026 parmi les propositions de la
 * maquette « Habillage des sections du faire-part ». Rien n'est une image :
 * tout est dessiné en CSS ou en SVG à partir de la palette du couple, donc
 * chaque élément change de couleur avec elle et ne pèse rien au chargement.
 *
 * Répartition des choix, pensée comme une papeterie :
 *  - le FOND et l'ILLUSTRATION se choisissent section par section (chaque
 *    section a son ambiance : le dress code n'est pas le RSVP) ;
 *  - le SÉPARATEUR, l'ANIMATION et le STYLE DE TITRE valent pour toute la
 *    page — ce sont eux qui donnent son unité, les changer par section
 *    donnerait un patchwork.
 *
 * Rendu : section-decor.css (fonds, séparateurs, titres, animations) et
 * SectionDecorParts.tsx (illustrations en SVG, découpage du titre).
 */

import { createContext, useContext, type CSSProperties } from 'react'

export interface DecorOption {
  id: string
  label: string
  desc: string
}

/** Les 10 sections du corps du faire-part, dans l'ordre où l'invité les découvre (cf. DetailsSombre.tsx). */
export const FAIRE_PART_SECTIONS: { id: string; label: string }[] = [
  { id: 'date', label: 'La date' },
  { id: 'lieu', label: 'Le lieu' },
  { id: 'programme', label: 'Le programme' },
  { id: 'histoire', label: 'Notre histoire' },
  { id: 'dresscode', label: 'Dress code' },
  { id: 'menu', label: 'Menu du dîner' },
  { id: 'hebergements', label: 'Hébergements' },
  { id: 'listemariage', label: 'Liste de mariage' },
  { id: 'faq', label: 'Questions fréquentes' },
  { id: 'rsvp', label: 'RSVP' },
]

/**
 * Fonds de section. `animated` : le motif bouge en continu — à réserver à
 * une ou deux sections, sinon la page fatigue à la lecture.
 */
export const SECTION_BACKGROUNDS: (DecorOption & { animated?: boolean })[] = [
  { id: '', label: 'Aucun', desc: 'Le fond de la page, sans habillage' },
  { id: 'aquarelle', label: 'Aquarelle', desc: 'Deux taches de couleur très diluées' },
  { id: 'aube', label: "Dégradé d'aube", desc: 'Le fond se teinte vers le bas' },
  { id: 'halo', label: 'Halo', desc: 'Une lumière douce derrière le texte' },
  { id: 'dechire', label: 'Bord déchiré', desc: 'La section posée comme une feuille frangée' },
  { id: 'satin', label: 'Satin drapé', desc: 'Plis de soie et reflet en travers' },
  { id: 'bougies', label: 'Lueur de bougies', desc: 'Halos flous, lumière de dîner' },
  { id: 'anneaux', label: 'Anneaux en filigrane', desc: 'Deux alliances, très estompées' },
  { id: 'petales', label: 'Pétales qui tombent', desc: 'La pluie de pétales de la sortie', animated: true },
  { id: 'coeurs', label: 'Petits cœurs', desc: 'Discrets, ils descendent en se balançant', animated: true },
  { id: 'confettis', label: 'Confettis', desc: 'Festif — plutôt pour la fin de page', animated: true },
  { id: 'poussiere', label: 'Poussière dorée', desc: 'De fines paillettes qui montent', animated: true },
  { id: 'feuilles', label: 'Feuilles qui tombent', desc: 'Feuillage léger, esprit bohème', animated: true },
]

/** Illustrations au trait, posées au-dessus du titre de section. */
export const SECTION_ILLUSTRATIONS: DecorOption[] = [
  { id: '', label: 'Aucune', desc: 'Pas de dessin au-dessus du titre' },
  { id: 'alliances', label: 'Alliances', desc: 'Deux anneaux — la cérémonie' },
  { id: 'champagne', label: 'Coupes de champagne', desc: "Vin d'honneur, liste de mariage" },
  { id: 'solitaire', label: 'Bague de fiançailles', desc: "Le solitaire, pour l'annonce" },
  { id: 'colombes', label: 'Colombes', desc: 'Deux oiseaux face à face' },
  { id: 'piece_montee', label: 'Pièce montée', desc: 'Trois étages et un cœur au sommet' },
  { id: 'arche', label: 'Arche de cérémonie', desc: 'Le décor sous lequel on se dit oui' },
  { id: 'noeud', label: 'Nœud de ruban', desc: 'Papeterie, cadeaux, liste de mariage' },
  { id: 'couvert', label: 'Couvert dressé', desc: 'Assiette, fourchette, couteau — le dîner' },
]

/** Séparateur entre deux sections — un seul pour toute la page. */
export const SECTION_SEPARATORS: DecorOption[] = [
  { id: '', label: 'Actuel', desc: 'Filet et trois losanges' },
  { id: 'filet', label: 'Filet fin', desc: 'Un trait court, centré' },
  { id: 'losange', label: 'Filet et losange', desc: 'Un petit losange au milieu' },
  { id: 'coeur', label: 'Filet et cœur', desc: 'Un petit cœur entre deux traits' },
  { id: 'alliances', label: 'Filet et alliances', desc: 'Deux anneaux entrelacés' },
  { id: 'ruban', label: 'Nœud de ruban', desc: 'Le nœud du bouquet, en miniature' },
  { id: 'perles', label: 'Rang de perles', desc: 'Neuf perles, la plus grosse au centre' },
  { id: 'sceau', label: 'Sceau de cire', desc: 'Le cachet, entre deux filets' },
]

/** Entrée en scène d'une section quand l'invité arrive dessus — une seule pour toute la page. */
export const SECTION_REVEALS: DecorOption[] = [
  { id: '', label: 'Cascade (actuel)', desc: 'Chaque élément apparaît après le précédent' },
  { id: 'blur', label: 'Flou puis net', desc: 'Comme une mise au point' },
  { id: 'curtain', label: 'Rideau', desc: 'La section se dévoile de haut en bas' },
  { id: 'ink', label: "Tache d'encre", desc: 'Révélation en cercle depuis le centre' },
  { id: 'letters', label: 'Lettre par lettre', desc: "Le titre s'écrit, puis le reste" },
  { id: 'line', label: 'Filet puis texte', desc: "Le trait se dessine d'abord" },
]

/** Style des titres « La date », « Le Programme »… — un seul pour toute la page. */
export const SECTION_TITLES: DecorOption[] = [
  { id: '', label: 'Actuel', desc: 'Italique centré' },
  { id: 'capitales', label: 'Capitales espacées', desc: 'Gravé, très éditorial' },
  { id: 'calli', label: 'Calligraphie', desc: 'Manuscrite' },
  { id: 'filets', label: 'Entre deux filets', desc: 'Encadré par deux traits' },
  { id: 'surtitre', label: 'Surtitre et titre', desc: 'Une petite ligne au-dessus' },
  { id: 'initiale', label: 'Grande initiale', desc: 'Lettre géante en filigrane' },
]

/**
 * Surtitres du style « Surtitre et titre » — écrits ici plutôt que déduits
 * du titre : « Où nous retrouver » ne se devine pas depuis « Le Lieu ».
 */
export const SECTION_KICKERS: Record<string, string> = {
  date: 'Notez-le',
  lieu: 'Où nous retrouver',
  programme: 'Le déroulé',
  histoire: 'Comment tout a commencé',
  dresscode: 'Ce qu’on vous suggère',
  menu: 'À table',
  hebergements: 'Où dormir',
  listemariage: 'Votre présence suffit',
  faq: 'Vous vous demandez',
  rsvp: 'Dites-nous tout',
}

export const isAnimatedBackground = (id: string) =>
  SECTION_BACKGROUNDS.some((b) => b.id === id && b.animated)

/** Choix d'habillage d'un projet — stocké dans la palette (cf. bespokePalette.ts). */
export interface SectionDecor {
  /** Par section : identifiant de fond (SECTION_BACKGROUNDS). */
  bgs: Record<string, string>
  /** Par section : identifiant d'illustration (SECTION_ILLUSTRATIONS). */
  illus: Record<string, string>
  separator: string
  reveal: string
  titleStyle: string
}

export const BLANK_SECTION_DECOR: SectionDecor = { bgs: {}, illus: {}, separator: '', reveal: '', titleStyle: '' }

/* ------------------------------------------------------------------ */
/* Le choix d'habillage du projet, fourni à toute la page              */
/* ------------------------------------------------------------------ */

/** Le Provider qui l'alimente vit dans SectionDecorParts.tsx (il rend du JSX). */
export const SectionDecorContext = createContext<SectionDecor>(BLANK_SECTION_DECOR)
export function useSectionDecor() {
  return useContext(SectionDecorContext)
}

/** Chaleur d'une couleur : moyenne du rouge et du vert, moins le bleu. */
function warmth(hex: string): number {
  const n = Number.parseInt(hex.replace('#', ''), 16)
  if (!Number.isFinite(n)) return 0
  return (((n >> 16) & 255) + ((n >> 8) & 255)) / 2 - (n & 255)
}

/**
 * Les huit variables que lit toute la feuille section-decor.css, à poser une
 * seule fois sur le conteneur de la page. Le paramètre est typé par les
 * seuls champs lus, pour ne pas faire dépendre ce module de l'interface
 * complète `BespokePalette` (qui vit dans edwigeWilfriedEffects.tsx, lequel
 * importe ce fichier).
 *
 * `--fpd-warm` est le plus chaud des deux accents : les fonds « dorés »
 * (lueur de bougies, poussière dorée) doivent rester dorés, or les palettes
 * ne rangent pas toujours l'or en accent principal — sur une palette nuit,
 * prendre l'accent principal donnait un fond rouge.
 */
function sectionDecorVars(
  palette: { bg: string; ink: string; inkRgb: string; gold: string; bordeaux: string },
  pageBg: string,
): CSSProperties {
  const acc = palette.gold
  const acc2 = palette.bordeaux
  return {
    '--fpd-bg': pageBg,
    '--fpd-card': palette.bg,
    '--fpd-ink': palette.ink,
    '--fpd-soft': `rgba(${palette.inkRgb}, 0.62)`,
    '--fpd-acc': acc,
    '--fpd-acc2': acc2,
    '--fpd-warm': warmth(acc) >= warmth(acc2) ? acc : acc2,
    '--fpd-line': 'color-mix(in srgb, var(--fpd-acc) 45%, transparent)',
  } as CSSProperties
}

/**
 * Un fond est-il sombre ? Luminance relative approchée, suffisante pour le
 * seul usage qu'on en fait : choisir un grain de papier noir ou blanc (sur
 * un fond nuit, un grain noir ne se voit pas).
 */
function isDarkBg(color: string): boolean {
  const hex = color.trim().replace('#', '')
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex
  const n = Number.parseInt(full, 16)
  if (full.length !== 6 || !Number.isFinite(n)) return false
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.45
}

/**
 * Classe et variables à poser sur le conteneur de la page du faire-part :
 * un seul endroit, et tout l'habillage en dessous sait se peindre.
 */
export function sectionDecorRootProps(
  palette: { bg: string; ink: string; inkRgb: string; gold: string; bordeaux: string },
  pageBg: string,
): { className: string; style: CSSProperties } {
  return {
    className: `fpd-page${isDarkBg(pageBg) ? ' fpd-dark' : ''}`,
    style: sectionDecorVars(palette, pageBg),
  }
}

/** Traduit les champs d'habillage d'une palette en choix exploitables par les composants. */
export function sectionDecorFromPalette(palette: {
  sectionBgs?: Record<string, string>
  sectionIllus?: Record<string, string>
  sectionSeparator?: string
  sectionReveal?: string
  sectionTitleStyle?: string
}): SectionDecor {
  return {
    bgs: palette.sectionBgs ?? {},
    illus: palette.sectionIllus ?? {},
    separator: palette.sectionSeparator ?? '',
    reveal: palette.sectionReveal ?? '',
    titleStyle: palette.sectionTitleStyle ?? '',
  }
}

/* ------------------------------------------------------------------ */
/* Le calque de fond                                                   */
/* ------------------------------------------------------------------ */

/**
 * Classes du calque de fond d'une section, ou `null` s'il n'y a pas de fond
 * (la section reste alors sur le fond de la page, comme aujourd'hui).
 */
export function backgroundLayerClass(bgId: string): string | null {
  if (!bgId) return null
  const animated = isAnimatedBackground(bgId)
  // Les fonds animés tombent, sauf la poussière dorée qui monte.
  const sense = bgId === 'poussiere' ? 'fpd-rise' : 'fpd-fall'
  return `fpd-layer fpd-bg-${bgId}${animated ? ` fpd-bg-anim ${sense}` : ''}`
}
