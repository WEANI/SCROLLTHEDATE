import { trpc } from '@/providers/trpc'

/**
 * Tarifs & produits Félicity — consommés depuis `settings.get` (clés "products",
 * "options", "texts") avec repli sur les valeurs validées du design si la query
 * échoue ou si la forme des données ne correspond pas.
 */

export type ProductId = 'FAIRE_PART' | 'SAVE_THE_DATE'

export interface ProductSetting {
  id: ProductId
  name: string
  priceCents: number
  description?: string
  features?: string[]
}

export interface CheckoutOption {
  id: string
  label: string
  priceCents: number
}

export interface SiteTexts {
  baseline?: string
  contactWhatsApp?: string
  deliveryEstimateDays?: number
}

export const FALLBACK_PRODUCTS: ProductSetting[] = [
  { id: 'FAIRE_PART', name: 'Faire-part digital', priceCents: 34900 },
  { id: 'SAVE_THE_DATE', name: 'Save the Date digital', priceCents: 14900 },
]

export const FALLBACK_OPTIONS: CheckoutOption[] = [
  { id: 'revisions', label: 'Révisions illimitées', priceCents: 6000 },
  { id: 'sous-titres', label: 'Sous-titres FR/EN', priceCents: 4000 },
  { id: 'version-courte', label: 'Version courte réseaux', priceCents: 9000 },
]

export const FALLBACK_TEXTS: Required<SiteTexts> = {
  baseline: 'Votre histoire, racontée en images.',
  contactWhatsApp: '+33600000000',
  deliveryEstimateDays: 21,
}

/** "349 €" / "49,67 €" (décimales uniquement si nécessaire). */
export function formatEuros(cents: number, forceDecimals = false): string {
  const hasDecimals = forceDecimals || cents % 100 !== 0
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  }).format(cents / 100)
}

/** "FL-2026-0142" à partir de l'id numérique de commande. */
export function formatOrderNumber(orderId: number, date: Date = new Date()): string {
  return `FL-${date.getFullYear()}-${String(orderId).padStart(4, '0')}`
}

/** Extrait l'id numérique depuis "FL-2026-0142" (null si format invalide). */
export function parseOrderNumber(ref: string | null | undefined): number | null {
  if (!ref) return null
  const match = /^FL-(\d{4})-(\d{1,8})$/i.exec(ref.trim())
  if (!match) return null
  const id = Number.parseInt(match[2], 10)
  return Number.isFinite(id) && id > 0 ? id : null
}

export function whatsappHref(phone: string, message?: string): string {
  const digits = phone.replace(/\D/g, '')
  const base = `https://wa.me/${digits}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}

function asProducts(value: unknown): ProductSetting[] | null {
  if (!Array.isArray(value)) return null
  const list = value.filter(
    (p): p is ProductSetting =>
      !!p &&
      typeof p === 'object' &&
      ((p as ProductSetting).id === 'FAIRE_PART' || (p as ProductSetting).id === 'SAVE_THE_DATE') &&
      typeof (p as ProductSetting).name === 'string' &&
      typeof (p as ProductSetting).priceCents === 'number',
  )
  return list.length > 0 ? list : null
}

function asOptions(value: unknown): CheckoutOption[] | null {
  if (!Array.isArray(value)) return null
  const list = value.filter(
    (o): o is CheckoutOption =>
      !!o &&
      typeof o === 'object' &&
      typeof (o as CheckoutOption).id === 'string' &&
      typeof (o as CheckoutOption).label === 'string' &&
      typeof (o as CheckoutOption).priceCents === 'number',
  )
  return list.length > 0 ? list : null
}

function asTexts(value: unknown): SiteTexts | null {
  if (!value || typeof value !== 'object') return null
  return value as SiteTexts
}

const QUERY_OPTS = { staleTime: 5 * 60 * 1000, retry: 1 } as const

/**
 * Produits, options et textes du site (via `settings.get`, fallback design).
 * Ne bloque jamais l'UI : en cas d'erreur, les valeurs de repli sont utilisées.
 */
export function usePricing() {
  const productsQuery = trpc.settings.get.useQuery({ key: 'products' }, QUERY_OPTS)
  const optionsQuery = trpc.settings.get.useQuery({ key: 'options' }, QUERY_OPTS)
  const textsQuery = trpc.settings.get.useQuery({ key: 'texts' }, QUERY_OPTS)

  const products = asProducts(productsQuery.data?.value) ?? FALLBACK_PRODUCTS
  const options = asOptions(optionsQuery.data?.value) ?? FALLBACK_OPTIONS
  const remoteTexts = asTexts(textsQuery.data?.value)
  const texts: Required<SiteTexts> = {
    baseline: remoteTexts?.baseline ?? FALLBACK_TEXTS.baseline,
    contactWhatsApp: remoteTexts?.contactWhatsApp ?? FALLBACK_TEXTS.contactWhatsApp,
    deliveryEstimateDays: remoteTexts?.deliveryEstimateDays ?? FALLBACK_TEXTS.deliveryEstimateDays,
  }

  return {
    products,
    options,
    texts,
    isLoading: productsQuery.isLoading || optionsQuery.isLoading,
    isError: productsQuery.isError || optionsQuery.isError,
  }
}

export function getProduct(products: ProductSetting[], id: ProductId): ProductSetting {
  return products.find((p) => p.id === id) ?? FALLBACK_PRODUCTS.find((p) => p.id === id) ?? FALLBACK_PRODUCTS[0]
}

/** Slug URL ↔ id produit (`?produit=faire-part|save-the-date`). */
export function productIdFromSlug(slug: string | null | undefined): ProductId | null {
  if (slug === 'faire-part') return 'FAIRE_PART'
  if (slug === 'save-the-date') return 'SAVE_THE_DATE'
  return null
}

export function productSlug(id: ProductId): string {
  return id === 'FAIRE_PART' ? 'faire-part' : 'save-the-date'
}
