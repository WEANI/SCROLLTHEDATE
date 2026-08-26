// ---------------------------------------------------------------------------
// Helpers de formatage & libellés métier — espace client (fr-FR)
// ---------------------------------------------------------------------------

export function formatDate(d: Date | string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!d) return '—'
  const date = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('fr-FR', opts ?? { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateShort(d: Date | string | null | undefined) {
  return formatDate(d, { day: '2-digit', month: '2-digit' })
}

export function formatTime(d: Date | string | null | undefined) {
  if (!d) return ''
  const date = d instanceof Date ? d : new Date(d)
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export function formatPrice(cents: number | null | undefined) {
  if (cents == null) return '—'
  return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
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

export const PROJECT_STATUS_LABEL: Record<string, string> = {
  ONBOARDING: 'Premiers pas',
  QUESTIONNAIRE: 'Questionnaire',
  SCENARIOS: 'Scénarios en cours',
  PRODUCTION: 'Montage',
  REVIEW: 'À valider',
  DELIVERED: 'Livré ✓',
}

export const PRODUCT_LABEL: Record<string, string> = {
  FAIRE_PART: 'Faire-part digital',
  SAVE_THE_DATE: 'Save the Date digital',
}

export const TEMPLATE_VIGNETTE: Record<string, string> = {
  editorial: '/template-editorial.jpg',
  cinema: '/template-cinema.jpg',
  minimal: '/template-minimal.jpg',
}

export const TEMPLATE_LABEL: Record<string, string> = {
  editorial: 'Éditorial',
  cinema: 'Cinéma',
  minimal: 'Minimal',
}

export const WHATSAPP_NUMBER = '33600000000'
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  'Bonjour Scroll The Date, voici ma note vocale pour notre faire-part !',
)}`

/** Libellé lisible d'un événement d'audit (timeline projet). */
export function auditLabel(action: string, meta?: unknown): string {
  const m = (meta ?? {}) as Record<string, unknown>
  switch (action) {
    case 'order.paid':
      return 'Commande confirmée'
    case 'project.created':
      return 'Votre projet est créé'
    case 'questionnaire.started':
      return 'Questionnaire commencé'
    case 'questionnaire.completed':
      return 'Questionnaire complété'
    case 'media.uploaded':
      return m.filename ? `Photo reçue — ${String(m.filename)}` : 'Média reçu'
    case 'voice_note.received':
      return 'Note vocale reçue'
    case 'scenarios.sent':
      return 'Vos scénarios ont été envoyés'
    case 'scenario.chosen':
      return m.title ? `Scénario choisi — « ${String(m.title)} »` : 'Scénario choisi'
    case 'scenario.changes_requested':
      return 'Modification de scénario demandée'
    case 'video.version_added':
      return `Vidéo filigrane envoyée — version ${String(m.version ?? '')}`
    case 'video.approved':
      return 'Vidéo approuvée'
    case 'video.changes_requested':
      return 'Modifications vidéo demandées'
    case 'project.status_changed':
      return `Étape « ${PROJECT_STATUS_LABEL[String(m.to)] ?? String(m.to)} »`
    case 'project.template_changed':
      return `Ambiance « ${TEMPLATE_LABEL[String(m.to)] ?? String(m.to)} »`
    case 'rsvp.config_saved':
      return 'Configuration RSVP enregistrée'
    case 'rsvp.submitted':
      return 'Nouvelle réponse RSVP'
    case 'message.admin_sent':
      return 'Message de Scroll The Date'
    case 'message.customer_sent':
      return 'Message envoyé à Scroll The Date'
    default:
      return action
  }
}

/** Libellé lisible d'une notification. */
export function notificationLabel(type: string): { title: string; detail?: string } {
  switch (type) {
    case 'scenarios.sent':
      return { title: 'Vos scénarios sont arrivés', detail: 'À découvrir dans Projet & scénarios' }
    case 'video.sent':
      return { title: 'Votre vidéo filigrane est prête', detail: 'Validez-la depuis Projet & scénarios' }
    case 'project.status_changed':
      return { title: 'Votre projet avance', detail: 'Une nouvelle étape vient de commencer' }
    case 'message.received':
      return { title: 'Nouveau message de Scroll The Date', detail: 'Élise vous a répondu' }
    default:
      return { title: 'Notification', detail: type }
  }
}
