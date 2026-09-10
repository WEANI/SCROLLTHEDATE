import { useEffect } from 'react'

/**
 * Bibliothèque de décors du hero — piochée dans les 2 fichiers de référence
 * fournis le 10/09/2026 (overlays-graphiques.html, polices-overlay.html) :
 * un sous-ensemble curaté plutôt que l'intégralité (~100 polices, formules
 * d'annonce toutes faites, comptes à rebours…) — les formules d'annonce
 * elles-mêmes n'ont pas besoin d'un système dédié, le texte libre des
 * cartes personnalisées (cf. CustomCardsEditor, StudioPanel.tsx) les couvre
 * déjà telles quelles (copier-coller la formule voulue dans une carte).
 *
 * Piloté depuis Studio → Palette & Hero → "Texte overlay du hero" :
 * `heroOverlayGraphic` (décor graphique, cf. HERO_OVERLAY_GRAPHICS) et
 * `heroFontId` (police du titre, cf. HERO_FONTS) sur BespokePalette.
 */

/**
 * Décors graphiques sans texte, superposables au hero — CSS porté de
 * overlays-graphiques.html (classes renommées `hs-ov-*`, préfixe du fichier
 * cf. hero-scrub.css). Exclus volontairement : les indices de scroll
 * (souris, flèche, ligne pointillée) qui feraient doublon avec le "Scroll"
 * déjà affiché par HeroScrub.tsx, et la barre de progression/vague qui ne
 * sont pas des décors mais des éléments d'interface.
 */
export const HERO_OVERLAY_GRAPHICS: { id: string; label: string }[] = [
  { id: 'corners', label: "Crochets d'angle" },
  { id: 'dots', label: 'Grille de points' },
  { id: 'cross', label: 'Croix dispersées' },
  { id: 'ring', label: 'Anneau pointillé rotatif' },
  { id: 'pulse', label: 'Onde sonar' },
  { id: 'orb', label: 'Halos lumineux flous' },
  { id: 'noise', label: 'Grain / texture' },
  { id: 'vignette', label: 'Vignette (assombrit les bords)' },
  { id: 'shapes', label: 'Formes flottantes' },
  { id: 'diagonal', label: 'Lignes diagonales' },
  { id: 'arc', label: 'Arc de cercle en coin' },
  { id: 'sparkle', label: 'Étoiles scintillantes' },
]

export interface HeroFontOption {
  id: string
  label: string
  category: string
  /** Valeur CSS complète (famille + repli), posée sur `--hs-font-family`. */
  fontFamily: string
  /** Paramètre `family=` de l'URL Google Fonts (poids/italique inclus si besoin), cf. FairePart.tsx qui charge UNIQUEMENT la police choisie par ce projet, jamais les autres. */
  googleFontsFamily: string
  italic?: boolean
}

/**
 * Polices du TITRE du hero uniquement (segments — prénoms, "Save the
 * date"…) — pas de l'eyebrow/lead/sub, qui restent dans les polices du
 * site : un pairing titre+label complet aurait doublé la complexité pour
 * un gain marginal, cf. doc du champ `heroFontId` dans BespokePalette.
 */
export const HERO_FONTS: HeroFontOption[] = [
  { id: 'anton', label: 'Anton', category: "Titres d'impact", fontFamily: "'Anton', Impact, sans-serif", googleFontsFamily: 'Anton' },
  { id: 'bebas', label: 'Bebas Neue', category: "Titres d'impact", fontFamily: "'Bebas Neue', sans-serif", googleFontsFamily: 'Bebas+Neue' },
  { id: 'archivo-black', label: 'Archivo Black', category: "Titres d'impact", fontFamily: "'Archivo Black', sans-serif", googleFontsFamily: 'Archivo+Black' },
  { id: 'syne', label: 'Syne', category: "Titres d'impact", fontFamily: "'Syne', sans-serif", googleFontsFamily: 'Syne:wght@800' },
  { id: 'playfair', label: 'Playfair Display', category: 'Serifs éditoriaux', fontFamily: "'Playfair Display', Georgia, serif", googleFontsFamily: 'Playfair+Display:ital@1', italic: true },
  { id: 'cormorant-garamond', label: 'Cormorant Garamond', category: 'Serifs éditoriaux', fontFamily: "'Cormorant Garamond', Georgia, serif", googleFontsFamily: 'Cormorant+Garamond:ital@1', italic: true },
  { id: 'libre-caslon', label: 'Libre Caslon Text', category: 'Serifs éditoriaux', fontFamily: "'Libre Caslon Text', Georgia, serif", googleFontsFamily: 'Libre+Caslon+Text' },
  { id: 'cinzel', label: 'Cinzel', category: 'Luxe & classique', fontFamily: "'Cinzel', Georgia, serif", googleFontsFamily: 'Cinzel' },
  { id: 'marcellus', label: 'Marcellus', category: 'Luxe & classique', fontFamily: "'Marcellus', Georgia, serif", googleFontsFamily: 'Marcellus' },
  { id: 'italiana', label: 'Italiana', category: 'Luxe & classique', fontFamily: "'Italiana', Georgia, serif", googleFontsFamily: 'Italiana' },
  { id: 'great-vibes', label: 'Great Vibes', category: 'Calligraphies mariage', fontFamily: "'Great Vibes', cursive", googleFontsFamily: 'Great+Vibes' },
  { id: 'alex-brush', label: 'Alex Brush', category: 'Calligraphies mariage', fontFamily: "'Alex Brush', cursive", googleFontsFamily: 'Alex+Brush' },
  { id: 'allura', label: 'Allura', category: 'Calligraphies mariage', fontFamily: "'Allura', cursive", googleFontsFamily: 'Allura' },
  { id: 'parisienne', label: 'Parisienne', category: 'Calligraphies mariage', fontFamily: "'Parisienne', cursive", googleFontsFamily: 'Parisienne' },
  { id: 'sacramento', label: 'Sacramento', category: 'Calligraphies mariage', fontFamily: "'Sacramento', cursive", googleFontsFamily: 'Sacramento' },
  { id: 'dancing-script', label: 'Dancing Script', category: 'Calligraphies mariage', fontFamily: "'Dancing Script', cursive", googleFontsFamily: 'Dancing+Script' },
  { id: 'cinzel-decorative', label: 'Cinzel Decorative', category: 'Calligraphies mariage', fontFamily: "'Cinzel Decorative', serif", googleFontsFamily: 'Cinzel+Decorative' },
  { id: 'eb-garamond', label: 'EB Garamond', category: 'Serifs formels', fontFamily: "'EB Garamond', Georgia, serif", googleFontsFamily: 'EB+Garamond:ital@1', italic: true },
  { id: 'cormorant', label: 'Cormorant', category: 'Serifs formels', fontFamily: "'Cormorant', Georgia, serif", googleFontsFamily: 'Cormorant:ital@1', italic: true },
]

export function getHeroFont(id: string | undefined): HeroFontOption | null {
  if (!id) return null
  return HERO_FONTS.find((f) => f.id === id) ?? null
}

/**
 * Charge dynamiquement la police choisie (Google Fonts) — UNIQUEMENT celle-
 * là, jamais les ~19 autres du catalogue (coût réseau nul pour tout projet
 * qui n'en utilise aucune). Utilisé à la fois par FairePart.tsx (page
 * publique) et StudioPanel.tsx (aperçu du champ au studio) — même chemin de
 * chargement, pas de risque de divergence entre ce que voit le studio et
 * ce que voit l'invité. Pas de nettoyage au démontage : un <link> déjà posé
 * ne coûte rien de plus (cache HTTP), et un autre endroit de la page peut
 * en avoir besoin en même temps (déduplication par `data-hero-font`).
 */
export function useGoogleFont(id: string | undefined) {
  useEffect(() => {
    const font = getHeroFont(id)
    if (!font) return
    if (document.querySelector(`link[data-hero-font="${font.id}"]`)) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${font.googleFontsFamily}&display=swap`
    link.dataset.heroFont = font.id
    document.head.appendChild(link)
  }, [id])
}
