import type { Lang } from '@/i18n/LanguageContext'

// ---------------------------------------------------------------------------
// Helpers de formatage & libellés métier — espace client (FR/EN)
// Les libellés viennent des dictionnaires i18n (espace.*) : ces fonctions
// prennent `t` (et parfois `lang` pour le formatage natif Intl) en
// paramètre plutôt que d'appeler useLanguage() elles-mêmes — ce sont de
// simples fonctions, pas des hooks, réutilisées aussi bien dans des
// composants React que dans des libellés construits en dehors du rendu.
// ---------------------------------------------------------------------------

function locale(lang: Lang) {
  return lang === 'en' ? 'en-GB' : 'fr-FR'
}

export function formatDate(
  d: Date | string | null | undefined,
  opts?: Intl.DateTimeFormatOptions,
  lang: Lang = 'fr',
) {
  if (!d) return '—'
  const date = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(locale(lang), opts ?? { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateShort(d: Date | string | null | undefined, lang: Lang = 'fr') {
  return formatDate(d, { day: '2-digit', month: '2-digit' }, lang)
}

export function formatTime(d: Date | string | null | undefined, lang: Lang = 'fr') {
  if (!d) return ''
  const date = d instanceof Date ? d : new Date(d)
  return date.toLocaleTimeString(locale(lang), { hour: '2-digit', minute: '2-digit' })
}

export function formatPrice(cents: number | null | undefined, lang: Lang = 'fr') {
  if (cents == null) return '—'
  return (cents / 100).toLocaleString(locale(lang), { style: 'currency', currency: 'EUR' })
}

export function formatDuration(sec: number) {
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatDurationLong(sec: number) {
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  if (m === 0) return `${s} s`
  return s > 0 ? `${m} min ${String(s).padStart(2, '0')}` : `${m} min`
}

export function formatTimecode(sec: number) {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function daysUntil(d: Date | string | null | undefined): number | null {
  if (!d) return null
  const date = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(date.getTime())) return null
  const diff = date.getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86_400_000))
}

// ---------------------------------------------------------------------------
// Libellés métier
// ---------------------------------------------------------------------------

type T = (key: string) => string

const STATUS_KEY: Record<string, string> = {
  ONBOARDING: 'espace.status.onboarding',
  QUESTIONNAIRE: 'espace.status.questionnaire',
  SCENARIOS: 'espace.status.scenarios',
  PRODUCTION: 'espace.status.production',
  REVIEW: 'espace.status.review',
  DELIVERED: 'espace.status.delivered',
}

export function projectStatusLabel(status: string, t: T): string {
  const key = STATUS_KEY[status]
  return key ? t(key) : status
}

const PRODUCT_KEY: Record<string, string> = {
  FAIRE_PART: 'espace.product.fairePart',
  SAVE_THE_DATE: 'espace.product.saveTheDate',
}

export function productLabel(product: string, t: T): string {
  const key = PRODUCT_KEY[product]
  return key ? t(key) : product
}

export const TEMPLATE_VIGNETTE: Record<string, string> = {
  editorial: '/template-editorial.jpg',
  cinema: '/template-cinema.jpg',
  minimal: '/template-minimal.jpg',
}

const TEMPLATE_KEY: Record<string, string> = {
  editorial: 'espace.template.editorial',
  cinema: 'espace.template.cinema',
  minimal: 'espace.template.minimal',
}

export function templateLabel(template: string, t: T): string {
  const key = TEMPLATE_KEY[template]
  return key ? t(key) : template
}

export const WHATSAPP_NUMBER = '33600000000'

/** Message WhatsApp pré-rempli du fallback micro indisponible — traduit (cf. VoiceRecorder). */
export function voiceNoteWhatsappUrl(lang: Lang): string {
  const message =
    lang === 'en'
      ? 'Hello Scroll The Date, here is my voice note for our invitation!'
      : 'Bonjour Scroll The Date, voici ma note vocale pour notre faire-part !'
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}

/** Libellé lisible d'un événement d'audit (timeline projet). */
export function auditLabel(action: string, meta: unknown, t: T): string {
  const m = (meta ?? {}) as Record<string, unknown>
  switch (action) {
    case 'order.paid':
      return t('espace.audit.orderPaid')
    case 'project.created':
      return t('espace.audit.projectCreated')
    case 'questionnaire.started':
      return t('espace.audit.questionnaireStarted')
    case 'questionnaire.completed':
      return t('espace.audit.questionnaireCompleted')
    case 'media.uploaded':
      return m.filename ? `${t('espace.audit.mediaUploadedPrefix')} ${String(m.filename)}` : t('espace.audit.mediaUploaded')
    case 'voice_note.received':
      return t('espace.audit.voiceNoteReceived')
    case 'scenarios.sent':
      return t('espace.audit.scenariosSent')
    case 'scenario.chosen':
      return m.title ? `${t('espace.audit.scenarioChosenPrefix')} « ${String(m.title)} »` : t('espace.audit.scenarioChosen')
    case 'scenario.changes_requested':
      return t('espace.audit.scenarioChangesRequested')
    case 'video.version_added':
      return `${t('espace.audit.videoVersionAddedPrefix')} ${String(m.version ?? '')}`
    case 'video.approved':
      return t('espace.audit.videoApproved')
    case 'video.changes_requested':
      return t('espace.audit.videoChangesRequested')
    case 'project.status_changed':
      return `${t('espace.audit.statusChangedPrefix')} « ${projectStatusLabel(String(m.to), t)} »`
    case 'project.template_changed':
      return `${t('espace.audit.templateChangedPrefix')} « ${templateLabel(String(m.to), t)} »`
    case 'rsvp.config_saved':
      return t('espace.audit.rsvpConfigSaved')
    case 'rsvp.submitted':
      return t('espace.audit.rsvpSubmitted')
    case 'message.admin_sent':
      return t('espace.audit.messageAdminSent')
    case 'message.customer_sent':
      return t('espace.audit.messageCustomerSent')
    default:
      return action
  }
}

/** Libellé lisible d'une notification. */
export function notificationLabel(type: string, t: T): { title: string; detail?: string } {
  switch (type) {
    case 'scenarios.sent':
      return { title: t('espace.notif.scenariosSentTitle'), detail: t('espace.notif.scenariosSentDetail') }
    case 'scenarios.updated':
      return { title: t('espace.notif.scenariosUpdatedTitle'), detail: t('espace.notif.scenariosUpdatedDetail') }
    case 'video.sent':
      return { title: t('espace.notif.videoSentTitle'), detail: t('espace.notif.videoSentDetail') }
    case 'project.status_changed':
      return { title: t('espace.notif.statusChangedTitle'), detail: t('espace.notif.statusChangedDetail') }
    case 'message.received':
      return { title: t('espace.notif.messageReceivedTitle'), detail: t('espace.notif.messageReceivedDetail') }
    case 'order.confirmed':
      // Sans ce cas, un client qui venait de payer voyait « Notification »
      // suivi du code technique brut « order.confirmed ».
      return { title: t('espace.notif.orderConfirmedTitle'), detail: t('espace.notif.orderConfirmedDetail') }
    default:
      return { title: t('espace.notif.defaultTitle'), detail: type }
  }
}

/**
 * Page de l'espace client vers laquelle mène chaque notification. Les
 * libellés ci-dessus annonçaient déjà la destination (« À découvrir dans
 * Projet & scénarios ») alors que rien n'était cliquable — le clic y mène
 * désormais réellement.
 */
export function notificationHref(type: string): string | null {
  switch (type) {
    case 'scenarios.sent':
    case 'scenarios.updated':
      return '/espace/projet#scenarios'
    case 'video.sent':
      return '/espace/projet#video'
    case 'project.status_changed':
      return '/espace/projet'
    case 'message.received':
      return '/espace/messages'
    case 'order.confirmed':
      return '/espace/commandes'
    case 'rsvp.submitted':
      return '/espace/rsvp'
    default:
      return null
  }
}

/** Chemin de la page produit d'un projet — cf. ProductSpace (pages/espace). */
export function productPath(product: string | null): string {
  return product === 'SAVE_THE_DATE' ? '/espace/save-the-date' : '/espace/faire-part'
}
