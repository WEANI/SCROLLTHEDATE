# Template — faire-part client bespoke

Ce fichier documente comment reproduire l'architecture du faire-part de
**Léa & Olivier** (et d'Edwige & Wilfried, qui partage la même base) pour un
nouveau couple client. Objectif : dupliquer 2 fichiers, remplir le contenu
réel du couple, enregistrer une route, ajouter les assets — sans retoucher
au moteur partagé.

À chaque fois qu'un nouveau couple bespoke est livré, aligner ce fichier
(nouvelles couleurs de `BespokePalette`, nouveaux pièges rencontrés, etc.).

---

## 1. Vue d'ensemble de l'architecture

```
src/pages/FairePartLeaOlivier.tsx          ← page (câblage, 1 par couple)
src/components/faire-part/
  leaOlivierContent.ts                     ← contenu + thème + palette (1 par couple)
  edwigeWilfriedEffects.tsx                ← moteur PARTAGÉ (bespoke) — ne pas dupliquer
  DetailsSombre.tsx                        ← conteneur à slots PARTAGÉ — ne pas dupliquer
  PayloadSection.tsx                       ← wrapper RSVP/thème PARTAGÉ — ne pas dupliquer
src/App.tsx                                ← 1 route statique par couple
public/                                    ← assets photo/vidéo du couple
```

**Un nouveau couple = 2 nouveaux fichiers (page + content) + 1 route + des
assets.** Le moteur (`edwigeWilfriedEffects.tsx`, `DetailsSombre.tsx`,
`PayloadSection.tsx`) ne doit jamais être dupliqué ni modifié pour un
couple en particulier — toute variation passe par `BespokePalette` (cf. §4)
ou par les props de contenu (texte, photos, items) que chaque composant
bespoke accepte déjà.

Pourquoi ce découpage : chaque faire-part est une page réelle livrée à un
client (pas une démo générique), mais la mécanique (compte à rebours qui se
recompose, programme en défilement épinglé, loupe magnétique sur la carte,
sceau de cire, galerie photo épinglée, FAQ, dress code animé) est identique
d'un couple à l'autre — seuls le contenu et la palette changent.

---

## 2. Checklist pour un nouveau couple

1. **Choisir un slug** — ex. `prenom1-prenom2` (kebab-case, sans accents).
2. **Dupliquer `leaOlivierContent.ts`** → `src/components/faire-part/{slug}Content.ts`,
   remplir avec le vrai contenu du couple (§3).
3. **Dupliquer `FairePartLeaOlivier.tsx`** → `src/pages/FairePart{Prenom1}{Prenom2}.tsx`,
   remplacer les imports par ceux du nouveau fichier content (§3).
4. **Enregistrer la route** dans `src/App.tsx` (§5).
5. **Déposer les assets** dans `public/` avec le préfixe du slug (§6).
6. **Choisir/adapter la palette** (`{SLUG}_PALETTE`) — départ recommandé :
   copier `EW_PALETTE` (thème clair) ou `LAO_PALETTE` (thème sombre) selon
   la charte du couple, puis n'ajuster que l'accent principal et les 2-3
   champs qui en dépendent (§4).
7. `npx tsc -b --force` — doit rester propre.
8. Vérifier dans le navigateur (`/faire-part/{slug}`) — scroller toute la
   page, tester le RSVP (maintenir le sceau ~1,5s), vérifier qu'**aucun
   autre couple n'a changé visuellement** (E&W et L&O doivent rester
   identiques à eux-mêmes après l'ajout d'un 3e couple).
9. Ne pousser qu'après confirmation explicite du client sur chaque section
   (palette, textes, photos) — ne jamais inventer de contenu (histoire,
   FAQ, hébergements) sans l'accord du couple ; à défaut de vrai texte,
   laisser la section absente plutôt que d'inventer (cf. `NotreHistoire`
   qui accepte `photos={[]}`).

---

## 3. Templates copiables

### 3.1 `src/components/faire-part/{slug}Content.ts`

```ts
import type { HeroChapter, HeroTheme } from '@/components/hero-scrub/types'
import type { PayloadTheme, RsvpTheme } from './PayloadSection'
import type { ClosingTheme } from './ClosingSection'
import { parseProgrammeItem, type ProgrammeItem } from './DetailsSombre'
import type { BespokePalette } from './edwigeWilfriedEffects'

export const SLUG = '{slug}' // ex. 'chloe-antoine'

export const BRIDE = '{Prénom 1}'
export const GROOM = '{Prénom 2}'
export const WEDDING_DATE_LABEL = '{ex. 12 juin 2028}'
/** Forme courte — hero scrub uniquement. */
export const WEDDING_DATE_SHORT = '{ex. 12 juin 28}'
export const CEREMONY_TIME = '{ex. 15h00}'
/** Date+heure ISO — source unique pour le bloc date ET le compte à rebours. */
export const WEDDING_DATETIME = '{ex. 2028-06-12T15:00:00+02:00}'
export const VENUE_NAME = '{nom du lieu}'
export const VENUE_LOCATION = '{ville}'
export const VENUE_ADDRESS = '{adresse complète}'
export const DRESS_CODE = '{ex. Élégant champêtre}'

// Omettre entièrement si le couple n'a pas encore fourni cette info —
// jamais de placeholder inventé (cf. `lodging?` optionnel sur DetailsSombre).
export const LODGING_OPTIONS = [
  '{Nom hôtel 1} ({ville})',
  '{Nom hôtel 2} ({ville})',
]

/** Programme fourni verbatim par le couple — format "Horaire — Titre — Détail". */
const PROGRAMME_RAW = [
  '{15h00} — {Cérémonie} — {détail optionnel}',
  '{17h00} — {Cocktail} — {détail optionnel}',
]
export const PROGRAMME: ProgrammeItem[] = PROGRAMME_RAW.map(parseProgrammeItem)

/**
 * Thème du hero scrub — départ recommandé : copier une charte existante
 * (MINIMAL_THEME pour un thème clair, CINEMA_ROUGE_THEME pour un thème
 * sombre) puis n'ajuster que `accent`. Ne PAS créer une nouvelle valeur
 * d'enum `id`/`label` générique dans hero-scrub/themes.ts pour un couple
 * en particulier — cette déclinaison reste locale à ce fichier, comme
 * CINEMA_ROUGE_THEME pour Léa & Olivier.
 */
export const {SLUG_UPPER}_THEME: HeroTheme = {
  id: 'cinema', // ou 'minimal' — l'ambiance générique la plus proche
  label: '{Ambiance} — {Prénom 1} & {Prénom 2}',
  colorScheme: 'dark', // ou 'light'
  frameBg: '#000000',
  pageBg: '#000000',
  vignette: 'linear-gradient(180deg, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.82) 100%)',
  accent: '#000000',
  textPrimary: '#F3EAD9',
  textSecondary: '#BBAFA9',
  cardBg: 'rgba(21, 16, 15, 0.55)',
  cardBorder: 'rgba(247, 241, 236, 0.12)',
  cardShadow: '0 24px 60px rgba(0, 0, 0, 0.4)',
  dotInactive: 'rgba(247, 241, 236, 0.10)',
}

export const PAYLOAD_THEME: Partial<PayloadTheme> = {
  sectionBg: '{= {SLUG_UPPER}_THEME.pageBg}',
  cardBg: 'rgba(255, 255, 255, 0.05)', // ou 'rgba(0,0,0,0.03)' sur page claire
  cardBorder: 'rgba(232, 196, 196, 0.14)',
  accent: '{= {SLUG_UPPER}_THEME.accent}',
  accentHover: '{teinte accent + ~10% plus clair}',
  heading: '#F3EAD9',
  text: '#F3EAD9',
}

export const RSVP_THEME: Partial<RsvpTheme> = {
  modalBg: '{pageBg légèrement plus clair, même écart que dans leaOlivierContent.ts}',
  shadow: '0 24px 64px rgba(0, 0, 0, 0.55)',
  heading: '#F3EAD9',
  text: '#F3EAD9',
  textMuted: '#BBAFA9',
  accent: '{= PAYLOAD_THEME.accent}',
  accentHover: '{= PAYLOAD_THEME.accentHover}',
  accentSoft: 'rgba(0, 0, 0, 0.18)',
  inputBg: 'rgba(255, 255, 255, 0.05)',
  inputBorder: 'rgba(232, 196, 196, 0.14)',
  inputText: '#F3EAD9',
  inputPlaceholder: 'rgba(187, 175, 169, 0.6)',
}

export const CLOSING_THEME: Partial<ClosingTheme> = {
  bg: '{= {SLUG_UPPER}_THEME.pageBg}',
  border: 'rgba(255, 255, 255, 0.10)',
  heading: '#F3EAD9',
  accent: '{= PAYLOAD_THEME.accent}',
  text: '#BBAFA9',
}

/** Photo d'ouverture (portrait recommandé, ratio conservé — cf. PhotoSplitCinematique). */
export const OPENING_PHOTO = {
  src: '/{slug}-photo-1.jpg',
  alt: '{Prénom 1} & {Prénom 2}',
}

export const RSVP_CTA_LABEL = 'Répondre à l’invitation'

/**
 * Overlays du hero scrub — 3 chapitres repérés À L'IMAGE sur la vidéo
 * réelle du couple (jamais des timecodes devinés). Process : lire la
 * vidéo image par image (ou à 0.25x) et noter le [from, to] en secondes
 * pour chaque moment où le texte doit apparaître, PUIS convertir en
 * fraction de la durée totale (VIDEO_DURATION_S = frames / fps).
 */
const VIDEO_DURATION_S = 0 /* {nb frames} */ / 24 /* fps réel du fichier */

export const HERO_CHAPTERS: HeroChapter[] = [
  {
    id: 0,
    kind: 'text',
    from: 0 / VIDEO_DURATION_S,
    to: 0 / VIDEO_DURATION_S,
    segments: [{ text: BRIDE }, { text: '&', accent: true }, { text: GROOM }],
    segmentLayout: 'stack',
    titleSize: 'lg',
    sub: 'vous invite à leur mariage',
  },
  {
    id: 1,
    kind: 'text',
    from: 0 / VIDEO_DURATION_S,
    to: 0 / VIDEO_DURATION_S,
    segments: [{ text: WEDDING_DATE_SHORT }],
    rule: true,
    subLines: [CEREMONY_TIME, `${VENUE_NAME}, ${VENUE_LOCATION}`],
    subSize: 'md',
    sub: DRESS_CODE,
  },
  {
    id: 2,
    kind: 'text',
    from: 0 / VIDEO_DURATION_S,
    to: 1,
    lead: 'Nous sommes ravis de partager ce moment avec vous',
    segments: [{ text: BRIDE }, { text: '&', accent: true }, { text: GROOM }],
  },
]

/**
 * `BespokePalette` — cf. §4 de TEMPLATE-FAIRE-PART.md pour le rôle de
 * chaque champ. Départ recommandé : copier EW_PALETTE (page claire) ou
 * LAO_PALETTE (page sombre) depuis edwigeWilfriedEffects.tsx /
 * leaOlivierContent.ts, puis n'ajuster que gold/bordeaux/seal (l'accent
 * du couple) — bg/ink/inkOnCard n'ont besoin de changer que si le couple
 * choisit l'AUTRE polarité (clair↔sombre) que le modèle copié.
 */
export const {SLUG_UPPER}_PALETTE: BespokePalette = {
  bg: '#000000',
  bgDate: 'transparent',
  bgProgramme: '#000000',
  cream: '#F3EAD9',
  ink: '#F3EAD9',
  inkRgb: '243, 234, 217',
  inkOnCard: '#F3EAD9',
  inkOnCardRgb: '243, 234, 217',
  mapLine: '#F3EAD9',
  bordeaux: '#000000',
  bordeauxRgb: '0, 0, 0',
  gold: '#000000',
  goldRgb: '0, 0, 0',
  sectionTitle: '#F3EAD9',
  timelineAccent: '#000000',
  stepLabel: '#F3EAD9',
  seal: '#000000',
  sealLight: '#000000',
  sealDark: '#000000',
}

// Texte non fourni par le couple = SECTION ABSENTE, jamais de placeholder
// inventé. Dès que le vrai texte arrive, remplir ici (cf. LAO_HISTOIRE_TEXT
// pour le format attendu) et passer `photos`/`text`/`keywords` à
// <NotreHistoire /> dans la page.
export const {SLUG_UPPER}_HISTOIRE_TEXT = ''
export const {SLUG_UPPER}_HISTOIRE_KEYWORDS: string[] = []

export const {SLUG_UPPER}_FAQ_ITEMS: { q: string; a: string }[] = [
  { q: 'Y a-t-il un parking disponible ?', a: '{réponse adaptée au lieu}' },
  { q: 'Puis-je venir accompagné(e) ?', a: '{réponse}' },
  { q: 'À quelle heure faut-il arriver ?', a: '{réponse adaptée à CEREMONY_TIME}' },
]

/** Dérivées du dress code textuel — 2 ou 3 teintes réelles, jamais une 3e couleur inventée pour remplir la mise en page. */
export const {SLUG_UPPER}_DRESS_CODE_COLORS = ['#000000', '#000000']

export const VENUE_PHOTO = '/{slug}-lieu-photo.jpg'
export const GALLERY_PHOTOS = ['/{slug}-gallery-1.jpg', '/{slug}-gallery-2.jpg', '/{slug}-gallery-3.jpg']
```

### 3.2 `src/pages/FairePart{Prenom1}{Prenom2}.tsx`

Dupliquer `src/pages/FairePartLeaOlivier.tsx` (thème sombre) ou
`src/pages/FairePartEdwigeWilfried.tsx` (thème clair) selon la polarité
choisie, puis :

- Remplacer tous les imports `leaOlivierContent` (ou `edwigeWilfriedContent`)
  par `{slug}Content`.
- Remplacer `LAO_PALETTE` par `{SLUG_UPPER}_PALETTE` dans
  `<BespokePaletteProvider palette={...}>`.
- Remplacer `COUPLE_NAMES`, `document.title`, le `<meta color-scheme>`
  (`only dark` ou `only light` selon la polarité), les chemins vidéo
  (`desktopSrc`/`posterSrc`), `trackHeightVh` (mesuré sur la vraie durée
  de la vidéo du couple).
- `renderLodging`/`renderBeforeRsvp`/`renderBeforeRsvp2` : ne garder QUE
  les slots pour lesquels une vraie donnée existe (cf. `lodging={undefined}`
  sur Edwige & Wilfried, qui n'a pas cette info — jamais une section vide
  ou inventée).
- Le composant `initials` de `<WaxSealRsvp initials="{L · O}" />` : 2
  initiales séparées par « · », dans le même style que les couples
  existants.

---

## 4. `BespokePalette` — rôle de chaque champ

Référence : `src/components/faire-part/edwigeWilfriedEffects.tsx` (le
type `BespokePalette` porte la documentation complète en JSDoc, ce tableau
n'en est qu'un résumé). Ne jamais ajouter un champ pour un seul couple sans
lui donner une valeur par défaut qui reproduit EXACTEMENT le rendu actuel
dans `EW_PALETTE` (zéro régression visuelle pour les couples existants).

| Champ | Rôle | Varie comment entre couples |
|---|---|---|
| `bg` / `bgProgramme` | Fond des cartes Lieu/Programme/FAQ | Clair si page claire, sombre si page sombre |
| `bgDate` | Fond de la case Date | Toujours transparent |
| `cream` | Texte des initiales du sceau RSVP | Reste crème pour tous |
| `ink` / `inkRgb` | Texte posé DIRECTEMENT sur le fond de page | Sombre si page claire, crème si page sombre |
| `inkOnCard` / `inkOnCardRgb` | Texte posé sur les cartes (`bg`) | Suit la polarité de `bg`, pas figé |
| `mapLine` | Traits de la carte SVG du Lieu | Suit `inkOnCard` |
| `bordeaux` / `gold` | Accents secondaire/principal (anneaux, filets, mots-clés) | Couleurs du couple |
| `sectionTitle` | Titres de section (« Le Lieu »…) | Doré ou crème selon lisibilité |
| `timelineAccent` | Couleur de l'HEURE dans le Programme | Distinct de `bordeaux`/`gold` — le bon accent ici dépend du couple |
| `stepLabel` | Couleur du TITRE d'étape sous l'heure | Distinct d'`inkOnCard` — peut devenir l'accent du couple |
| `seal` / `sealLight` / `sealDark` | Dégradé radial du sceau de cire | Toujours un rouge/bordeaux, jamais doré même si `gold` est l'accent principal du couple |

---

## 5. Route (`src/App.tsx`)

```tsx
import FairePart{Prenom1}{Prenom2} from '@/pages/FairePart{Prenom1}{Prenom2}'
// ...
<Route path="/faire-part/{slug}" element={<FairePart{Prenom1}{Prenom2} />} />
```

À placer **avant** `<Route path="/faire-part/:slug" element={<FairePart />} />`
(react-router priorise les segments statiques, mais autant garder les
routes câblées en dur groupées et lisibles).

Penser aussi à ajouter une carte sur `/demofairepart`
(`src/pages/DemoFairePart.tsx`, tableau `FAIRE_PARTS`) si cette page doit
apparaître dans le sommaire des faire-part livrés.

---

## 6. Assets (`public/`)

| Fichier | Convention | Notes |
|---|---|---|
| `{slug}-hero.mp4` | vidéo scrub desktop | Mesurer précisément durée/fps réels pour `VIDEO_DURATION_S` |
| `{slug}-hero-poster.jpg` | poster/premier frame | Affiché avant que la vidéo charge |
| `{slug}-photo-1.jpg` | photo d'ouverture (portrait) | Ratio conservé, cf. `PhotoSplitCinematique` |
| `{slug}-lieu-photo.jpg` | photo du lieu | Fournie par le couple, jamais générée |
| `{slug}-gallery-{1,2,3}.jpg` | galerie « Notre histoire » | 3 photos fournies par le couple |

Toute photo fournie par le client : convertir/optimiser en JPEG qualité
85, largeur max ~1000px (`Image.open(...).convert('RGB')` + `.save(...,
quality=85, optimize=True)` en Python/PIL) avant de déposer dans `public/`.

---

## 7. Pièges déjà rencontrés (à ne pas reproduire)

- **Ne jamais coder en dur un chemin de photo dans un composant partagé**
  (`edwigeWilfriedEffects.tsx`) — toujours un prop avec une valeur par
  défaut (cf. `LieuMagnifier({ photoSrc = '/edwige-wilfried-lieu-photo.jpg' })`).
  Sans ce prop, la photo du 1er couple fuite sur la page du 2e.
  **Piège corollaire** (rencontré sur Camille & Adrien) : passer
  `photoSrc={undefined}` explicitement pour dire « pas de photo » NE
  SUFFIT PAS — un défaut de paramètre JS se déclenche aussi sur
  `undefined` explicite, donc la fuite se produit quand même. Passer
  `photoSrc=""` (chaîne vide) à la place : `undefined` ⇒ défaut appliqué,
  `""` ⇒ défaut ignoré ET `photoSrc &&` (le composant) reste falsy, donc
  l'image ne s'affiche pas.
- **Galerie photo en défilement horizontal épinglé** (`HorizontalPhotos`) —
  chaque slide doit être un conteneur `w-[100cqw] shrink-0` avec la photo
  centrée dedans (`object-contain`), jamais une image dimensionnée à son
  contenu naturel : sinon la largeur totale de la piste n'est pas un
  multiple exact de la largeur du cadre, et la diapositive précédente
  "bave" en fin de scroll.
- **Toute nouvelle couleur ajoutée à `BespokePalette`** doit d'abord
  recevoir sa valeur par défaut dans `EW_PALETTE` (reproduisant EXACTEMENT
  le rendu actuel d'Edwige & Wilfried) avant d'être utilisée ailleurs —
  sinon le couple existant change de rendu par effet de bord.
- **Contenu manquant = section absente, jamais inventée** (histoire,
  hébergements, FAQ) — cf. `lodging?` optionnel, `NotreHistoire` qui
  accepte `photos={[]}`.
- **Captures d'écran en développement** : ce projet utilise Lenis (smooth
  scroll) — après un `scrollIntoView` programmatique, WAIT ~1s avant de
  capturer, et s'assurer que l'onglet est bien celui au premier plan
  (`tabs_select`) avant `screenshot`, sinon la capture peut montrer un état
  non à jour.

---

## 8. Historique

- 2026-08 — Version initiale, extraite après la refonte bespoke commune à
  Edwige & Wilfried et Léa & Olivier (palette généralisée en
  `BespokePalette` + Context).
- 2026-08 — 3e couple bespoke : Camille & Adrien (`camilleAdrienContent.ts`
  + `FairePartCamilleAdrien.tsx`, dupliqués depuis Léa & Olivier — thème
  sombre). Nouveau : le rôle `gold` de `BespokePalette` (nommé pour
  l'accent doré d'Edwige & Wilfried) porte ici un bleu marine moyen — un
  couple peut explicitement exclure le doré (champ formulaire) sans que le
  champ change de sens, cf. sa doc dans `edwigeWilfriedEffects.tsx`. Sceau
  RSVP en gris/argent (`seal`/`sealLight`/`sealDark`) plutôt que le rouge
  déjà utilisé par les deux couples précédents — repris du sceau réellement
  visible dans la vidéo du couple (première fois que cette teinte est
  dérivée de la vidéo plutôt que choisie par défaut). 3 couleurs de dress
  code (pas 2) quand le couple en nomme 3 explicitement — `DressCodeCard`
  n'imposait déjà aucune limite, juste jamais testé au-delà de 2. Aucune
  photo d'ouverture ni "Notre histoire" sur cette page : ni l'une ni
  l'autre fournies avec cette livraison (la photo d'ouverture mentionnée
  dans les instructions comme "jointe" ne l'était pas dans les faits) —
  section absente plutôt qu'inventée, conformément à la règle déjà en
  place.
