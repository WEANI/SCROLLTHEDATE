/**
 * Mesure d'audience — Plausible Analytics, sans cookie (aucun identifiant
 * déposé chez le visiteur, aucun suivi d'un site à l'autre).
 *
 * ÉTEINTE tant que `VITE_PLAUSIBLE_DOMAIN` n'est pas renseignée dans les
 * variables de Railway (valeur : le domaine déclaré dans Plausible, par
 * exemple `scrollthedate.com`). Raison : aucune donnée ne doit partir vers
 * Plausible avant que le compte existe, et la politique de confidentialité
 * et l'avis cookies doivent dire la vérité dans les deux états — ils lisent
 * `analyticsEnabled` pour choisir leur texte (cf. Confidentialite.tsx,
 * CookieNotice.tsx).
 *
 * Plausible lit tout seul les liens suivis (`?utm_source=instagram…`) et
 * suit les changements de page de l'application. À régler dans Plausible :
 * exclure /admin et /espace des statistiques.
 */
export const PLAUSIBLE_DOMAIN = (import.meta.env.VITE_PLAUSIBLE_DOMAIN as string | undefined)?.trim() || ''
export const analyticsEnabled = PLAUSIBLE_DOMAIN !== ''

export function loadAnalytics() {
  if (!analyticsEnabled || typeof document === 'undefined') return
  if (document.querySelector('script[data-domain]')) return
  const s = document.createElement('script')
  s.defer = true
  s.dataset.domain = PLAUSIBLE_DOMAIN
  s.src = 'https://plausible.io/js/script.js'
  document.head.appendChild(s)
}

// ---------------------------------------------------------------------------
// Mesure d'audience MAISON (18/10/2026) — toujours active, indépendante de
// Plausible. Aucun cookie, rien d'écrit sur l'appareil du visiteur : le
// serveur calcule une empreinte anonyme qui change chaque jour (cf. table
// siteEvents, db/schema.ts, et api/siteEventsRoute.ts). Les pages /admin,
// /espace, /login et les faire-part publiés sont ignorées par le serveur.
//
// Exception unique au « rien sur l'appareil » : un administrateur connecté
// marque SON navigateur (`std:notrack`) pour ne pas gonfler les chiffres
// avec ses propres visites — cf. AdminShell.
// ---------------------------------------------------------------------------

type SiteEvent = {
  k: 'pageview' | 'engagement' | 'click' | 'event'
  n?: string
  p: string
  t?: string
  r?: string
  us?: string
  um?: string
  uc?: string
  l?: string
  z?: string
  s?: number
  d?: number
}

const NO_TRACK_KEY = 'std:notrack'

/** Le navigateur d'un administrateur n'est jamais mesuré (cf. AdminShell). */
export function markAdminBrowser() {
  try {
    window.localStorage.setItem(NO_TRACK_KEY, '1')
  } catch {
    /* stockage indisponible : tant pis, ses visites seront comptées */
  }
}

function trackingOff(): boolean {
  if (typeof window === 'undefined') return true
  if (import.meta.env.DEV) return true
  try {
    return window.localStorage.getItem(NO_TRACK_KEY) === '1'
  } catch {
    return false
  }
}

/** Espaces privés et faire-part publiés : jamais mesurés ici (le serveur les ignore aussi). */
const EXCLUDED_PATHS = /^\/(admin|espace|login|definir-mot-de-passe|faire-part)(\/|$)/

function send(e: SiteEvent) {
  if (trackingOff() || EXCLUDED_PATHS.test(window.location.pathname)) return
  const body = JSON.stringify(e)
  try {
    if (navigator.sendBeacon?.('/api/t', new Blob([body], { type: 'text/plain' }))) return
  } catch {
    /* repli ci-dessous */
  }
  fetch('/api/t', { method: 'POST', body, keepalive: true, headers: { 'content-type': 'text/plain' } }).catch(() => {})
}

// Page en cours : temps passé visible et défilement maximal, envoyés en la quittant.
let currentPath: string | null = null
let visibleSince = 0
let visibleMs = 0
let maxDepth = 0
let firstPageview = true

function scrollDepth(): number {
  const doc = document.documentElement
  const scrollable = doc.scrollHeight - window.innerHeight
  if (scrollable <= 0) return 100
  return Math.min(100, Math.round((window.scrollY / scrollable) * 100))
}

function flushEngagement() {
  if (!currentPath) return
  if (visibleSince) visibleMs += Date.now() - visibleSince
  visibleSince = document.visibilityState === 'visible' ? Date.now() : 0
  const s = Math.min(1800, Math.round(visibleMs / 1000))
  if (s >= 1) send({ k: 'engagement', p: currentPath, s, d: maxDepth })
  visibleMs = 0
}

/** À appeler à chaque changement de page (cf. SiteTracker dans App.tsx). */
export function trackPageview(path: string) {
  if (path === currentPath) return
  flushEngagement()
  currentPath = path
  visibleMs = 0
  visibleSince = document.visibilityState === 'visible' ? Date.now() : 0
  maxDepth = 0
  const e: SiteEvent = { k: 'pageview', p: path }
  if (firstPageview) {
    // Provenance : seulement sur la 1re page de la visite.
    firstPageview = false
    const qs = new URLSearchParams(window.location.search)
    e.r = document.referrer || undefined
    e.us = qs.get('utm_source') || undefined
    e.um = qs.get('utm_medium') || undefined
    e.uc = qs.get('utm_campaign') || undefined
  }
  e.l = (navigator.language || '').slice(0, 10) || undefined
  try {
    e.z = Intl.DateTimeFormat().resolvedOptions().timeZone || undefined
  } catch {
    /* fuseau inconnu */
  }
  send(e)
}

/** Étape du tunnel de vente : add_to_cart, checkout_start, payment_success. */
export function trackEvent(name: string, target?: string) {
  send({ k: 'event', n: name, p: window.location.pathname, t: target })
}

/** Libellé d'un clic : adresse du lien (sans paramètres), ou texte du bouton. */
function describeClick(el: Element): { n: string; t: string } | null {
  const custom = el.closest('[data-track]')?.getAttribute('data-track')
  if (el instanceof HTMLAnchorElement && el.href) {
    if (el.protocol === 'mailto:') return { n: 'outbound', t: 'mailto:' + el.href.slice(7).split('?')[0] }
    if (el.protocol === 'tel:') return { n: 'outbound', t: el.href }
    try {
      const u = new URL(el.href, window.location.href)
      if (u.origin === window.location.origin) return { n: 'link', t: custom || u.pathname + u.hash }
      return { n: 'outbound', t: custom || u.hostname.replace(/^www\./, '') + u.pathname.replace(/\/$/, '') }
    } catch {
      return null
    }
  }
  const label = custom || el.getAttribute('aria-label') || (el.textContent || '').replace(/\s+/g, ' ').trim()
  return label ? { n: 'button', t: label.slice(0, 80) } : null
}

let started = false

/** Branche les écouteurs globaux (clics, défilement, départ de la page) — une seule fois. */
export function startSiteTracking() {
  if (started || typeof window === 'undefined') return
  started = true
  document.addEventListener(
    'click',
    (ev) => {
      const el = (ev.target as Element | null)?.closest?.('a, button, [role="button"], [data-track]')
      if (!el || el.closest('[data-notrack]')) return
      const c = describeClick(el)
      if (c) send({ k: 'click', n: c.n, p: window.location.pathname, t: c.t })
    },
    { capture: true, passive: true },
  )
  window.addEventListener(
    'scroll',
    () => {
      const d = scrollDepth()
      if (d > maxDepth) maxDepth = d
    },
    { passive: true },
  )
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushEngagement()
    else visibleSince = Date.now()
  })
  window.addEventListener('pagehide', flushEngagement)
}
