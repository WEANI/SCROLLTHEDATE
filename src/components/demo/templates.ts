/**
 * Constantes partagées de la page démo « Anna & Théo ».
 * Contenu statique de secours (mode dégradé si le backend ne répond pas).
 */

export const DEMO_SLUG = 'anna-theo'

/** Date du mariage — samedi 20 juin 2026, 15h00 (heure de Paris). */
export const WEDDING_DATE = new Date('2026-06-20T15:00:00+02:00')

export const WEDDING_DATE_LABEL = 'Samedi 20 juin 2026'
export const VENUE_NAME = 'Domaine de Varenne'
export const VENUE_ADDRESS = 'Domaine de Varenne, 13210 Saint-Rémy-de-Provence'
export const MAPS_URL =
  'https://www.google.com/maps/search/?api=1&query=Domaine+de+Varenne+Saint-R%C3%A9my-de-Provence'

export type DemoTemplate = 'editorial' | 'cinema' | 'minimal'

export const TEMPLATE_STORAGE_KEY = 'felicity-demo-template'

export const TEMPLATES: { id: DemoTemplate; label: string; thumb: string }[] = [
  { id: 'editorial', label: 'Éditorial', thumb: '/template-editorial.jpg' },
  { id: 'cinema', label: 'Cinéma', thumb: '/template-cinema.jpg' },
  { id: 'minimal', label: 'Minimal', thumb: '/template-minimal.jpg' },
]

export function loadTemplate(): DemoTemplate {
  if (typeof window === 'undefined') return 'editorial'
  const v = window.localStorage.getItem(TEMPLATE_STORAGE_KEY)
  return v === 'cinema' || v === 'minimal' ? v : 'editorial'
}

export function saveTemplate(t: DemoTemplate) {
  try {
    window.localStorage.setItem(TEMPLATE_STORAGE_KEY, t)
  } catch {
    /* stockage indisponible — ignorer */
  }
}

/** Jeu de classes par template pour les sections « corps » du faire-part. */
export interface SectionTheme {
  /** Fond de section standard */
  section: string
  /** Fond de section alterné (programme, RSVP…) */
  sectionAlt: string
  /** Kicker uppercase */
  kicker: string
  /** Titres H2/H3 */
  heading: string
  /** Corps de texte */
  body: string
  /** Texte secondaire / méta */
  muted: string
  /** Cards sur la section */
  card: string
  /** Bordures / liserés */
  border: string
  /** Typographie condensée façon affiche (cinéma) */
  condensed: boolean
  /** Fond photo plein écran (cinéma) */
  photoBg: boolean
}

export const SECTION_THEMES: Record<DemoTemplate, SectionTheme> = {
  editorial: {
    section: 'bg-anthracite-900',
    sectionAlt: 'bg-anthracite-800',
    kicker: 'text-terracotta-300',
    heading: 'text-white',
    body: 'text-white/75',
    muted: 'text-white/50',
    card: 'bg-anthracite-800 border border-anthracite-700',
    border: 'border-anthracite-700',
    condensed: false,
    photoBg: false,
  },
  cinema: {
    section: 'bg-anthracite-950',
    sectionAlt: 'bg-anthracite-950',
    kicker: 'text-terracotta-400',
    heading: 'text-white uppercase',
    body: 'text-white/80',
    muted: 'text-white/55',
    card: 'bg-anthracite-950/70 border border-white/15 backdrop-blur-sm',
    border: 'border-white/15',
    condensed: true,
    photoBg: true,
  },
  minimal: {
    section: 'bg-neutral-100',
    sectionAlt: 'bg-white',
    kicker: 'text-terracotta-500',
    heading: 'text-ink',
    body: 'text-ink/75',
    muted: 'text-neutral-500',
    card: 'bg-white border border-neutral-200 shadow-[0_8px_32px_rgba(27,27,30,0.08)]',
    border: 'border-neutral-200',
    condensed: false,
    photoBg: false,
  },
}
