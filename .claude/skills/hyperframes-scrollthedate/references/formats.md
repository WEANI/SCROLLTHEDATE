# Formats — Scroll The Date

Le produit vit sur un téléphone tenu à la verticale. **Le 9:16 est le format de référence**, les
autres sont des déclinaisons.

## Table des formats

| Usage | Ratio | `data-width` × `data-height` | fps | Durée type |
|---|---|---|---|---|
| **Montage hero** (modèle Save the Date) | 9:16 | 1080 × 1920 | 30 | 24–32 s |
| Teaser partageable (WhatsApp, SMS) | 9:16 | 1080 × 1920 | 30 | 10–20 s |
| Reels / TikTok / Stories | 9:16 | 1080 × 1920 | 30 | 15–40 s |
| Feed Instagram | 1:1 | 1080 × 1080 | 30 | 15–30 s |
| Hero du site / YouTube | 16:9 | 1920 × 1080 | 30 | libre |

## Safe-areas

| Canal | Haut | Bas | Pourquoi |
|---|---|---|---|
| Reels / TikTok / Stories | ~220 px | ~320 px | pseudo, légende, boutons de l'app |
| WhatsApp (statut) | ~180 px | ~220 px | barre de progression, champ de réponse |
| Feed 1:1 | ~80 px | ~80 px | marges de sécurité |
| 16:9 site / YouTube | ~60 px | ~60 px | contrôles du lecteur |

Le contenu clé (prénoms, date, CTA) reste dans la safe-area. Le décor peut déborder.

## Cas particulier : le montage hero

Un montage hero n'est **pas** soumis aux safe-areas des réseaux : il s'affiche dans un cadre 9:16
au sein d'une page web, sans interface par-dessus. En revanche il a deux contraintes que les
autres formats n'ont pas :

1. **Les textes ne sont pas dans la vidéo** (cf. LA règle du SKILL.md) — donc l'image doit
   réserver des zones respirantes là où les blocs vont se poser, sans motif chargé.
2. **La vidéo est scrubbée au doigt**, pas lue. Elle doit donc être encodée pour un seek image par
   image (fps constant, keyframes serrées) ET doublée d'une séquence de frames — voir
   `montage-hero.md`.

## Décliner une vidéo

Composer d'abord le 9:16, puis décliner :

- **9:16 → 1:1** : recomposer, ne pas recadrer une composition finie (les textes seraient rognés).
  La même composition avec `data-width="1080" data-height="1080"` et une grille adaptée.
- **9:16 → 16:9** : idem. Le 16:9 laisse de la place latérale — c'est le bon format pour montrer
  le téléphone ET du texte à côté.
- Un recadrage FFmpeg (`fit.py --aspect`) ne s'applique qu'à un **rush**, jamais à une composition
  rendue.
