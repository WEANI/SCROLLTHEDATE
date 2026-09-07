/**
 * Types partagés du hero scrub — utilisés aussi bien par le catalogue de
 * thèmes (cf. themes.ts) que par le contenu propre à chaque faire-part
 * (cf. src/components/demo/demoContent.ts, .../faire-part/*Content.ts).
 */

export interface HeroChapter {
  id: number
  kind: 'text' | 'list' | 'card'
  /** Fenêtre de progression [from, to] du scrub où ce chapitre est affiché. */
  from: number
  to: number
  /** Paragraphe libre affiché avant l'eyebrow/le titre, casse normale (pas de majuscules forcées) — ex. phrase de clôture. */
  lead?: string
  eyebrow?: string
  /** Segments du titre : texte brut ou accentué (couleur d'accent du thème). */
  segments?: { text: string; accent?: boolean }[]
  /** 'inline' (défaut) : les segments s'enchaînent et ne retombent à la ligne que si la largeur l'impose. 'stack' : chaque segment sur sa propre ligne, garanti (ex. "&" seul entre deux prénoms, quelle que soit la largeur du cadre). */
  segmentLayout?: 'inline' | 'stack'
  /**
   * `segmentLayout: 'inline'` uniquement — force les segments sur UNE
   * seule ligne en réduisant leur taille de police si besoin (mesure la
   * largeur réelle du texte vs. l'espace disponible, cf. FitOneLineText
   * dans HeroScrub.tsx), plutôt que de laisser le texte retomber à la
   * ligne. Pour un texte dont le nombre de caractères varie par projet et
   * qui NE DOIT PAS se scinder (ex. prénoms du save the date, "Yasmine &
   * Adam" — cf. échange du 08/09/2026).
   */
  fitOneLine?: boolean
  /** 'md' (défaut, clamp jusqu'à 46px) ou 'lg' (clamp jusqu'à 56px) — vérifier l'absence de débordement à l'écran avant de choisir 'lg' sur un mot long. */
  titleSize?: 'md' | 'lg'
  sub?: string
  /** Alternative à `sub` : plusieurs lignes, chacune séparée par le même filet que `rule`. */
  subLines?: string[]
  /** Taille de `sub`/`subLines` — 'sm' (défaut, 14px) ou 'md' (18px). */
  subSize?: 'sm' | 'md'
  rule?: boolean
  items?: string[]
  card?: { mono: string; title: string; sub: string }
}

/**
 * Un thème = une charte complète du hero scrub (fond, vignette, accent,
 * texte, carte) — cf. themes.ts pour le catalogue. Ajouter un thème n'exige
 * de toucher ni HeroScrub.tsx ni hero-scrub.css, seulement themes.ts.
 */
export interface HeroTheme {
  id: string
  /** Nom affiché (ex. dans le questionnaire "Ambiance souhaitée"). */
  label: string
  /**
   * Clair ou sombre — porté par le thème plutôt que déduit de son `id` au
   * cas par cas : la page faire-part pose `<meta color-scheme>` d'après
   * cette valeur (anti-inversion dark mode mobile, directive du skill).
   * Un test du type `id === 'minimal' ? 'light' : 'dark'` se trompe dès
   * qu'on ajoute un thème clair — c'était le cas d'"editorial".
   */
  colorScheme: 'light' | 'dark'
  frameBg: string
  /**
   * Fond du corps de page (sous/autour du hero) — souvent très proche de
   * `frameBg` sans lui être identique (le cadre vidéo se détache
   * légèrement). Porté par le thème pour la même raison que `colorScheme`.
   */
  pageBg: string
  /** Valeur CSS complète du gradient de vignette du cadre. */
  vignette: string
  accent: string
  textPrimary: string
  textSecondary: string
  /** Fond flouté de la carte (rgba avec alpha). */
  cardBg: string
  cardBorder: string
  cardShadow: string
  /** Points de repère de chapitre à l'état inactif. */
  dotInactive: string
}

export interface HeroVideoConfig {
  desktopSrc: string
  /** Optionnel — si absent, `desktopSrc` sert aussi sur mobile (un seul montage livré). */
  mobileSrc?: string
  /** Optionnel — un projet réel peut ne pas encore avoir d'affiche définie pour sa vidéo finale. */
  posterSrc?: string
  /**
   * Séquence d'images plutôt qu'un fichier vidéo unique (cf.
   * api/lib/videoFrames.ts, FrameSequence.ts) — quand présent, prévaut sur
   * `desktopSrc`/`mobileSrc` : HeroScrub dessine sur un <canvas> au lieu de
   * piloter une balise <video>. `desktopSrc` reste toujours fourni par
   * l'appelant (repli historique) même quand `frames` est utilisé.
   */
  frames?: { baseUrl: string; count: number; fps: number }
}
