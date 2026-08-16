/**
 * Contenu du faire-part « Edwige & Wilfried » — première page réelle
 * construite depuis le pipeline FELICITI (cf. instructions-page-edwige-
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
export const WEDDING_DATE_SHORT = '21 déc 27'
export const CEREMONY_TIME = '16h00'
export const VENUE_NAME = 'One&Only The Palm'
export const VENUE_LOCATION = 'Dubaï'

/**
 * Accent pastel — proposition, pas une donnée client (aucun hex fourni par
 * le couple). Rose poudré retenu par défaut parmi les deux candidats du
 * brief ; teinte profonde dérivée pour les usages texte/CTA (contraste AA
 * sur fond clair). À valider avec le couple avant mise en production
 * définitive (cf. points ouverts, section 4 des instructions).
 */
export const ACCENT_PALE = '#E8C9C4' // rose poudré — fonds, filets, puces
export const ACCENT_DEEP = '#B9776C' // même teinte, assombrie — texte, CTA, icônes

/** Bloc payload — texte du formulaire, verbatim, jamais reformulé. */
export const PAYLOAD_FIELDS: { label: string; value: string }[] = [
  { label: 'Date', value: WEDDING_DATE_LABEL },
  { label: 'Lieu', value: `${VENUE_NAME}, ${VENUE_LOCATION}` },
  { label: 'Heure de cérémonie', value: CEREMONY_TIME },
  { label: 'Dress code', value: 'Couleurs pastel' },
]

export const RSVP_CTA_LABEL = 'Répondre à l’invitation'

/**
 * Overlays répartis sur trois plans précis du film (cf. instructions §2.A,
 * skill v0.38) — jamais bakés dans la vidéo, jamais au même endroit que le
 * plan final. Fenêtres [from, to] repérées à l'image sur
 * edwige-wilfried-hero.mp4 (946 frames / 24 fps ≈ 39,4167 s) :
 *
 * - Chapitre 0 « prénoms » : juste après l'ouverture de l'enveloppe,
 *   pendant le tunnel de lumière (flare + particules dorées avant que le
 *   sablier ne se forme) — repéré entre 2,5 s et 5,0 s. Typo display seule,
 *   sans date : apparition douce, pas de rule/sub pour rester léger.
 * - Chapitre 1 « date, heure, lieu » : sur le plan des pétales tombant
 *   devant les structures en plexiglass, avant le fondu vers le sablier —
 *   repéré entre 13,0 s et 15,8 s. Date en gros display (WEDDING_DATE_SHORT,
 *   volontairement plus grande que l'heure — demande client), heure + lieu
 *   réunis en sub.
 * - Chapitre 2 « dress code » : sur le plan du sablier à fond bleu, juste
 *   avant le second tunnel de lumière qui bascule vers la plage — repéré
 *   entre 18,0 s et 21,0 s (fond vire du blanc cassé au bleu autour de
 *   17,5 s, y reste jusqu'à ~21,5 s).
 * - Plan final tenu (vue aérienne du lieu, dernières secondes) : aucun
 *   couple n'a fourni de phrase signature → laissé sans overlay, tel que
 *   permis par le brief ("peut rester sans texte"). Les vides entre
 *   chapitres sont intentionnels — même logique de zones silencieuses que
 *   sur /demo (cf. findActiveChapterIndex, qui retourne -1 hors fenêtre).
 */
export const HERO_CHAPTERS: HeroChapter[] = [
  {
    id: 0,
    kind: 'text',
    from: 2.5 / 39.4167,
    to: 5.0 / 39.4167,
    eyebrow: COUPLE_INITIALS,
    segments: [{ text: BRIDE }, { text: '&', accent: true }, { text: GROOM }],
  },
  {
    // Date en segment display (grande, > heure — demande client) : la
    // forme courte WEDDING_DATE_SHORT reste sûre à cette taille, contrairement
    // à "décembre" en entier (vérifié à l'écran, cf. historique). Heure et
    // lieu réunis en sub, plus petits.
    id: 1,
    kind: 'text',
    from: 13.0 / 39.4167,
    to: 15.8 / 39.4167,
    segments: [{ text: WEDDING_DATE_SHORT }],
    rule: true,
    sub: `${CEREMONY_TIME} · ${VENUE_NAME}, ${VENUE_LOCATION}`,
  },
  {
    // "Couleurs" seul (8 lettres) déborde de ~4px du stage à cette taille de
    // display sur viewport large — même défaut que "décembre" plus haut.
    // "Pastel" seul, plus court, reste dans la marge de sécurité observée
    // avec "Wilfried" (le mot le plus long qui tienne sans y toucher).
    id: 2,
    kind: 'text',
    from: 18.0 / 39.4167,
    to: 21.0 / 39.4167,
    eyebrow: 'Dress code',
    segments: [{ text: 'Pastel', accent: true }],
  },
]
