import { CalendarHeart, Clapperboard, Infinity as InfinityIcon, MapPin, QrCode, Rss } from 'lucide-react'

/**
 * Catalogue des 2 produits — source unique consommée par la card d'accueil
 * (Products.tsx) ET le hero des pages produit dédiées (FairePartDigital.tsx
 * / SaveTheDateDigital.tsx), pour éviter de dupliquer le listing à 3
 * endroits (cf. le souci de dérive déjà rencontré cette session avec des
 * types dupliqués). Fichier séparé (et pas exporté depuis Products.tsx) :
 * un fichier qui exporte à la fois un composant et une constante casse le
 * Fast Refresh (react-refresh/only-export-components).
 *
 * Les prix affichés ici sont indicatifs (mise en page) — le prix RÉEL
 * facturé vient toujours de `usePricing()`/`getProduct()`
 * (src/components/commerce/pricing.ts), qui lit la base de données live.
 */
export const PRODUCTS = [
  {
    id: 'SAVE_THE_DATE' as const,
    name: 'Save the Date digital',
    price: '149 €',
    tagline: 'Pour annoncer, des mois avant.',
    // Vers la page produit dédiée plutôt que directement /commander — cf.
    // échange du 13/09/2026 (même correction que la carte de comparaison
    // d'Offres.tsx) : cette carte n'a pas de quoi commander à elle seule
    // (pas de choix de formule ni de vidéo démo), SaveTheDateDigital.tsx
    // s'en charge avec son propre bouton de commande.
    cta: '/save-the-date-digital',
    recommended: false,
    features: [
      { icon: Clapperboard, label: 'Vidéo courte personnalisée (40 s)' },
      { icon: CalendarHeart, label: 'Votre page personnalisée' },
      { icon: CalendarHeart, label: "Page d'annonce avec date & lieu" },
      { icon: InfinityIcon, label: 'Lien illimité, partageable partout' },
      { icon: QrCode, label: 'QR code pour vos supports papier' },
    ],
  },
  {
    id: 'FAIRE_PART' as const,
    name: 'Faire-part digital',
    price: '299 €',
    tagline: 'Pour inviter, pour de vrai.',
    // Vers la page produit dédiée plutôt que directement /commander —
    // même correction que Save the Date ci-dessus (cf. échange du
    // 13/09/2026).
    cta: '/faire-part-digital',
    recommended: true,
    features: [
      { icon: Clapperboard, label: 'Vidéo cinématique complète (60 s)' },
      { icon: CalendarHeart, label: 'Votre page personnalisée + tableau de bord' },
      { icon: MapPin, label: 'Programme, lieu & hébergements, dress code' },
      { icon: Rss, label: 'RSVP intégré, réponses en temps réel' },
      { icon: InfinityIcon, label: 'Lien illimité + QR code' },
    ],
  },
]
