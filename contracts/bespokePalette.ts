import { z } from "zod";

/**
 * Schéma partagé des 22 champs de `BespokePalette` (cf.
 * src/components/faire-part/edwigeWilfriedEffects.tsx pour le rôle exact
 * de chaque champ — fond des cartes, encre, accents, sceau, dress code…) —
 * utilisé côté serveur pour valider `projects.adminSetPalette` et côté
 * client (StudioPanel, suggestPalette) pour typer le formulaire admin. Ne
 * réexporte pas le type `BespokePalette` du composant React (pas
 * importable depuis l'API, cf. séparation api//src actée ailleurs dans
 * ce repo) : cette liste de clés doit être tenue à la main en phase avec
 * lui si un champ est ajouté un jour des deux côtés.
 */
export const bespokePaletteSchema = z.object({
  bg: z.string(),
  bgDate: z.string(),
  bgProgramme: z.string(),
  cream: z.string(),
  ink: z.string(),
  inkRgb: z.string(),
  inkOnCard: z.string(),
  inkOnCardRgb: z.string(),
  mapLine: z.string(),
  bordeaux: z.string(),
  bordeauxRgb: z.string(),
  gold: z.string(),
  goldRgb: z.string(),
  sectionTitle: z.string(),
  timelineAccent: z.string(),
  stepLabel: z.string(),
  seal: z.string(),
  sealLight: z.string(),
  sealDark: z.string(),
  // Pastilles « Teintes suggérées » de la section Dress code — 1 à 3
  // teintes, chaîne vide = non définie (DressCodeCard retombe alors sur
  // ses teintes pastel par défaut). Pas de compagnon *Rgb : utilisées
  // telles quelles en background CSS, jamais en rgba() mélangé.
  dressCode1: z.string(),
  dressCode2: z.string(),
  dressCode3: z.string(),
  // Texte overlay du hero (segments/sub des chapitres de HeroScrub, cf.
  // FairePart.tsx où ces 3 champs fusionnent avec le HeroTheme par défaut
  // (cinema/minimal/editorial) et le texte codé en dur des chapitres.
  // Chaîne vide = non défini : `heroTextColor`/`heroCardBg` retombent alors
  // sur le thème (et, pour la carte, sur transparent — nouveau défaut) ;
  // `heroInviteText` retombe sur l'absence de texte (plus de "vous invite
  // à leur mariage" par défaut, cf. échange du 06/09/2026).
  // `.default("")` (contrairement aux autres champs ci-dessus) : une
  // palette déjà enregistrée AVANT l'ajout de ces 3 champs (toutes les
  // palettes existantes en base au 06/09/2026) ne les porte pas du tout —
  // chargée telle quelle dans le formulaire studio (cast TS, pas de
  // validation à la lecture), ils y restent `undefined`. tRPC/JSON omet
  // les clés `undefined` à l'envoi : le payload de sauvegarde en arrivait
  // à ne plus les porter DU TOUT, rejeté par ce même schéma (`z.string()`
  // sans défaut refuse une clé manquante) — "Échec de l'enregistrement de
  // la palette" reproduit en conditions réelles sur une palette existante.
  // `.default("")` absorbe ce cas (et tout futur bundle client en retard).
  heroTextColor: z.string().default(""),
  heroCardBg: z.string().default(""),
  heroInviteText: z.string().default(""),
  // Chapitre de clôture du hero (repli générique de FairePart.tsx, affiché
  // de p=0.9 à p=1 quand le projet n'a pas de `heroChapters` studio validés
  // — prénoms + date, cf. FairePart.tsx) — `true` par défaut pour ne rien
  // changer sur les projets existants (dont Yasmine & Adam avant ce
  // champ), togglable au studio (cf. échange du 07/09/2026 : ce chapitre
  // n'a pas de sens pour tous les montages, ex. une vidéo qui se termine
  // déjà sur un plan de clôture explicite). Ne concerne QUE ce repli — le
  // chapitre "détails pratiques" du chemin studioChapters reste piloté par
  // son propre timing, déjà optionnel via ce mécanisme (fenêtre dégénérée
  // = jamais actif, cf. commit du fix générique HeroScrub.tsx).
  heroClosingEnabled: z.boolean().default(true),
  // Save the date UNIQUEMENT — couleur de texte / fond de carte propres à
  // chacun des 2 blocs (cf. FairePart.tsx, HeroChapter.textColorOverride/
  // cardBgOverride) plutôt que la seule paire heroTextColor/heroCardBg
  // partagée, qui s'applique aux DEUX blocs à la fois — demande explicite
  // pour pouvoir les distinguer (cf. échange du 08/09/2026). Chaîne vide =
  // non défini, retombe sur heroTextColor/heroCardBg (eux-mêmes retombant
  // sur le thème/transparent) — mêmes champs édités dans l'onglet "Save
  // the Date" de StudioPanel, pas dans "Palette & Hero".
  stdSaveTheDateTextColor: z.string().default(""),
  stdSaveTheDateCardBg: z.string().default(""),
  stdNamesDateTextColor: z.string().default(""),
  stdNamesDateCardBg: z.string().default(""),
  // Décor du hero — cf. src/components/hero-scrub/heroDecor.ts (bibliothèque
  // ajoutée le 10/09/2026). Chaîne vide = aucun décor / police du site
  // (Fraunces), comportement inchangé. `heroFontId` ne change QUE le titre
  // du hero (segments), pas l'eyebrow/lead/sub — cf. doc de heroDecor.ts.
  heroOverlayGraphic: z.string().default(""),
  heroFontId: z.string().default(""),
});

export type BespokePaletteInput = z.infer<typeof bespokePaletteSchema>;

/** Un timing de chapitre du hero, en secondes dans la vidéo livrée (pas un ratio [0,1] — la conversion se fait au rendu, une fois la durée réelle de la vidéo connue côté lecteur, cf. Phase 4 du plan). */
export const heroChapterTimingSchema = z.object({
  fromSec: z.number().min(0),
  toSec: z.number().min(0),
});

/**
 * 3 chapitres pour un faire-part (ouverture / détails pratiques / clôture,
 * cf. `HERO_CHAPTERS` dans leaOlivierContent.ts), 2 pour un save the date
 * ("Save the date" / prénoms+date, cf. échange du 07/09/2026 —
 * FairePart.tsx rend une page dédiée bien plus courte pour ce produit). Le
 * contenu textuel de chaque chapitre reste généré depuis les réponses du
 * questionnaire (Phase 3, prénoms, date, lieu…) ou fixe ("Save the date")
 * — seuls les timings sont saisis ici par le studio, faute de pouvoir les
 * déduire automatiquement d'un montage vidéo livré. Un projet est
 * TOUJOURS l'un ou l'autre (jamais les deux), déterminé par
 * `orders.product` — pas de risque de confondre les deux formes une fois
 * stockées.
 */
const heroChaptersFairePartSchema = z.tuple([
  heroChapterTimingSchema,
  heroChapterTimingSchema,
  heroChapterTimingSchema,
]);
const heroChaptersSaveTheDateSchema = z.tuple([heroChapterTimingSchema, heroChapterTimingSchema]);
export const heroChaptersSchema = z.union([heroChaptersFairePartSchema, heroChaptersSaveTheDateSchema]);

export type HeroChaptersInput = z.infer<typeof heroChaptersSchema>;
/** Variante à 3 éléments — typage précis pour l'éditeur de timings faire-part (StudioPanel), qui indexe jusqu'à `[2]`. */
export type HeroChaptersFairePartInput = z.infer<typeof heroChaptersFairePartSchema>;
/** Variante à 2 éléments — typage précis pour l'éditeur de timings save the date (StudioPanel). */
export type HeroChaptersSaveTheDateInput = z.infer<typeof heroChaptersSaveTheDateSchema>;

/**
 * Carte de texte overlay LIBRE — en plus des chapitres fixes ci-dessus
 * (ouverture/détails/clôture ou "Save the date"/prénoms+date), ajoutée à la
 * main par le studio pour personnaliser un projet au-delà de cette
 * structure figée (cf. échange du 10/09/2026). `text` : contenu libre,
 * jamais dérivé du questionnaire — contrairement aux chapitres fixes.
 * `id` : chaîne stable côté client (généré à l'ajout, cf. StudioPanel),
 * sert de clé React et distingue chaque carte dans le tableau, y compris
 * après réordonnancement/suppression.
 */
export const heroCustomCardSchema = z.object({
  id: z.string().min(1),
  fromSec: z.number().min(0),
  toSec: z.number().min(0),
  text: z.string().min(1).max(280),
});
/** Plafonné à 10 : au-delà, plus un outil de personnalisation qu'un risque réel côté produit — évite un payload sans limite. */
export const heroCustomCardsSchema = z.array(heroCustomCardSchema).max(10);

export type HeroCustomCard = z.infer<typeof heroCustomCardSchema>;
export type HeroCustomCardsInput = z.infer<typeof heroCustomCardsSchema>;
