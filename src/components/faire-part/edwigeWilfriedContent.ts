/**
 * Contenu du faire-part « Edwige & Wilfried » — première page réelle
 * construite depuis le pipeline SCROLL THE DATE (cf. instructions-page-edwige-
 * wilfried_1.md, skill v0.38). Architecture à deux niveaux (skill Étape 5) :
 * hero scrub quasi muet avec overlays répartis sur des plans précis du film
 * (pas seulement à la fin, cf. HERO_CHAPTERS ci-dessous) + corps de page
 * statique (payload verbatim, photos, clôture) — à distinguer du gabarit
 * `/demo` (Anna & Théo) qui, lui, empile toutes les infos en overlays vidéo.
 * Ambiance couple : Minimal + pastel (cf. section 3 des instructions) →
 * thème "minimal" (cf. src/components/hero-scrub/themes.ts), pas "cinema"
 * (réservé aux couples en ambiance Cinéma comme /demo).
 */

import type { HeroChapter } from '@/components/hero-scrub/types'
import { parseProgrammeItem, type ProgrammeItem } from './DetailsSombre'

export const SLUG = 'edwige-wilfried'

export const COUPLE_INITIALS = 'E & W'
export const BRIDE = 'Edwige'
export const GROOM = 'Wilfried'
export const WEDDING_DATE_LABEL = '21 décembre 2027'
/**
 * Forme courte de la date — hero scrub uniquement (chapitre 1 ci-dessous),
 * où elle porte le gros texte display : demandé plus grande que l'heure, et
 * "décembre" en entier à cette taille dépasse la colonne vidéo étroite (cf.
 * historique). Le bloc payload du corps de page, lui, reste verbatim en
 * WEDDING_DATE_LABEL — cette forme courte n'y est jamais utilisée.
 */
export const WEDDING_DATE_SHORT = '21 déc. 27'
export const CEREMONY_TIME = '16h00'
export const VENUE_NAME = 'One&Only The Palm'
export const VENUE_LOCATION = 'Dubaï'
/**
 * Date+heure ISO — source unique du bloc date et du compte à rebours de
 * DetailsSombre (cf. FairePartEdwigeWilfried.tsx), dérivée de
 * WEDDING_DATE_LABEL/CEREMONY_TIME ci-dessus sans rien changer à la date
 * elle-même. +04:00 = heure du Golfe (Dubaï, lieu de la cérémonie, sans
 * heure d'été) — CEREMONY_TIME est l'heure locale du lieu, pas celle de la
 * France.
 */
export const WEDDING_DATETIME = '2027-12-21T16:00:00+04:00'
// Texte + repris tels quels de la maquette fournie par la cliente pour la
// refonte de la section Dress code (cf. DressCodeCard dans
// edwigeWilfriedEffects.tsx) — remplace l'ancien "Couleurs pastel".
export const DRESS_CODE = 'Une tenue élégante est souhaitée pour célébrer ce moment dans une belle ambiance.'

/**
 * Accent pastel — proposition, pas une donnée client (aucun hex fourni par
 * le couple). Rose poudré retenu par défaut parmi les deux candidats du
 * brief ; teinte profonde dérivée pour les usages texte/CTA (contraste AA
 * sur fond clair). À valider avec le couple avant mise en production
 * définitive (cf. points ouverts, section 4 des instructions).
 */
export const ACCENT_PALE = '#E8C9C4' // rose poudré — fonds, filets, puces
export const ACCENT_DEEP = '#B9776C' // même teinte, assombrie — texte, CTA, icônes

/**
 * Photo d'ouverture du corps de page — placée AVANT le bloc payload, en
 * transition entre le plan final du film et les informations pratiques
 * (même emplacement/effet que chez Léa & Olivier, cf. leaOlivierContent.ts).
 * Ratio portrait 520x936 conservé (dimensions réelles du fichier fourni par
 * le couple) — obligatoire pour PhotoSplitCinematique, qui étire les
 * moitiés à la taille exacte de leur boîte plutôt que de recadrer en
 * object-fit: cover.
 */
export const OPENING_PHOTO = {
  src: '/edwige-wilfried-photo-1.png',
  alt: 'Edwige & Wilfried, front contre front',
}

/**
 * Galerie sous « Notre histoire » — réintroduite (le couple avait d'abord
 * demandé son retrait, cf. commit bd54c88, puis fourni ces 3 photos).
 * Fournie explicitement à NotreHistoire.photos (défaut = [] sinon, cf.
 * edwigeWilfriedEffects.tsx).
 */
export const GALLERY_PHOTOS = [
  '/edwige-wilfried-gallery-1.png',
  '/edwige-wilfried-gallery-2.png',
  '/edwige-wilfried-gallery-3.png',
]

export const RSVP_CTA_LABEL = 'Répondre à l’invitation'

/**
 * Programme de la journée — fourni verbatim par le couple, non reformulé
 * (même règle que le reste du payload, cf. PayloadSection). Même format
 * brut "Horaire — Titre — Détail" parsé par `parseProgrammeItem` que Léa &
 * Olivier — cf. leaOlivierContent.ts pour le schéma proposé côté
 * questionnaire (`jourj.programme`, pas encore implémenté).
 */
const PROGRAMME_RAW = [
  '15h30 — Bienvenue — Accueil et bienvenue au domaine',
  '16h00 — La cérémonie — Le moment le plus spéciale de la journée',
  '17h00 — Apéritif — Accueil des invités',
  '19h30 — Dîner — Repas et festivités',
  '23h00 — Decoupe du gateau — Un doux moment',
  '23h30 — La Fête — Nous danserons jusqu’a tard',
  '4h30 — Au revoir — Fin d’une journée inoubliable',
]
export const PROGRAMME: ProgrammeItem[] = PROGRAMME_RAW.map(parseProgrammeItem)

/**
 * Thème du bloc détails (DetailsSombre — cf. FairePartEdwigeWilfried.tsx) —
 * reprend telles quelles les couleurs déjà établies de MINIMAL_THEME
 * (hero-scrub/themes.ts), aucune nouvelle couleur introduite. `line` =
 * cardBorder de ce même thème (rose poudré à faible opacité, cohérent avec
 * les filets déjà utilisés dans le hero). DetailsSombre garde volontairement
 * ses cartes (tuiles flip-clock, carte du Lieu) sombres même ici — cf. sa
 * doc, un choix délibéré de contraste, pas une valeur de thème.
 */
export const DETAILS_THEME = {
  ink: '#2E2620',
  inkSoft: '#6B5F53',
  accent: ACCENT_DEEP,
  line: 'rgba(184, 119, 108, 0.22)',
}

/**
 * Overlays répartis sur trois plans précis du film (cf. instructions §2.A,
 * skill v0.38, + ajustements de mise en page demandés après livraison —
 * l'accroche du chapitre 0, le chapitre « dress code » et l'accroche de
 * clôture ont été retirés sur retour client, cf. plus bas ; le chapitre
 * « date/heure/lieu » a été déplacé et simplifié à date seule).
 * Fenêtres [from, to] repérées à l'image sur edwige-wilfried-hero.mp4
 * (946 frames / 24 fps ≈ 39,4167 s) :
 *
 * - Chapitre 0 « prénoms » : juste après l'ouverture de l'enveloppe,
 *   pendant le tunnel de lumière (flare + particules dorées avant que le
 *   sablier ne se forme) — repéré entre 2,5 s et 5,0 s. Prénoms empilés
 *   (segmentLayout "stack") — "&" seul sur sa ligne, jamais collé à un
 *   prénom, quelle que soit la largeur du cadre — en display agrandi
 *   (titleSize "lg").
 * - Chapitre 1 « date » : repositionné sur le plan du sablier (sable qui
 *   s'écoule, fond bleu) plutôt que sur les pétales — à la toute fin de ce
 *   plan, juste avant qu'il se brouille pour basculer vers le second tunnel
 *   de lumière puis la plage — repéré entre 18,0 s et 21,0 s (le fond vire
 *   du blanc cassé au bleu autour de 17,5 s, y reste jusqu'à ~21,5 s ;
 *   c'était la fenêtre de l'ancien chapitre « dress code », retiré). Heure
 *   et lieu retirés — date seule (WEDDING_DATE_SHORT).
 * - Chapitre 2 « clôture » : après le plan final tenu (vue aérienne du
 *   lieu), dans ses dernières secondes — repéré entre 37,4 s et 39,4 s
 *   (fin de piste), pour laisser d'abord le plan respirer sans texte
 *   quelques secondes avant la carte de clôture.
 * Les vides entre chapitres sont intentionnels — même logique de zones
 * silencieuses que sur /demo (cf. findActiveChapterIndex, qui retourne -1
 * hors fenêtre).
 */
export const HERO_CHAPTERS: HeroChapter[] = [
  {
    id: 0,
    kind: 'text',
    from: 2.5 / 39.4167,
    to: 5.0 / 39.4167,
    segments: [{ text: BRIDE }, { text: '&', accent: true }, { text: GROOM }],
    segmentLayout: 'stack',
    titleSize: 'lg',
  },
  {
    id: 1,
    kind: 'text',
    from: 18.0 / 39.4167,
    to: 21.0 / 39.4167,
    segments: [{ text: WEDDING_DATE_SHORT }],
  },
  {
    id: 2,
    kind: 'text',
    from: 37.4 / 39.4167,
    to: 1,
    segments: [{ text: BRIDE }, { text: '&', accent: true }, { text: GROOM }],
  },
]
