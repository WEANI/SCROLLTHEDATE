import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ProductId } from '@/components/commerce/pricing'

/**
 * Panier réel — cf. échange du 22/09/2026 ("je voudrais qu'il ai un vrai
 * panier sur le site"). État 100 % frontend (même esprit que
 * `LanguageContext.tsx` — pas de nouvelle dépendance d'état), persisté en
 * `localStorage` : le panier n'existe QUE côté navigateur tant qu'il n'est
 * pas payé, aucune table "panier" en base (cf. plan — un paiement panier
 * crée directement plusieurs `orders`/`projects`, cf. api/ordersRouter.ts).
 *
 * Limité à UNE ligne par produit — le catalogue n'a que 2 produits fixes
 * (`FAIRE_PART` / `SAVE_THE_DATE`), chacun avec une seule configuration
 * d'options à la fois : ajouter un produit déjà présent REMPLACE sa
 * configuration plutôt que d'empiler une 2e ligne identique. Pas de gestion
 * de quantités — non pertinent pour ce catalogue.
 */

export interface CartLine {
  product: ProductId
  optionIds: string[]
  /** Commande "sur un modèle" (cf. contracts/saveTheDateTemplates.ts) — verrouille les options, prix fixe. */
  templateSlug?: string
}

interface CartContextValue {
  items: CartLine[]
  count: number
  /** Ajoute une ligne, ou remplace la configuration existante pour ce produit. */
  addOrReplace: (line: CartLine) => void
  removeProduct: (product: ProductId) => void
  updateOptions: (product: ProductId, optionIds: string[]) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)
const STORAGE_KEY = 'scrollthedate:cart'

function loadCart(): CartLine[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (l): l is CartLine =>
        !!l &&
        typeof l === 'object' &&
        ((l as CartLine).product === 'FAIRE_PART' || (l as CartLine).product === 'SAVE_THE_DATE') &&
        Array.isArray((l as CartLine).optionIds),
    )
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLine[]>(loadCart)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      /* localStorage indisponible (navigation privée stricte…) — le panier ne survivra pas au rechargement, sans bloquer la session en cours. */
    }
  }, [items])

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.length,
      addOrReplace: (line) =>
        setItems((prev) => {
          const rest = prev.filter((l) => l.product !== line.product)
          return [...rest, line]
        }),
      removeProduct: (product) => setItems((prev) => prev.filter((l) => l.product !== product)),
      updateOptions: (product, optionIds) =>
        setItems((prev) => prev.map((l) => (l.product === product ? { ...l, optionIds } : l))),
      clear: () => setItems([]),
    }),
    [items],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart() doit être utilisé sous <CartProvider>')
  return ctx
}
