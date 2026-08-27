import { z } from "zod";

/**
 * Schéma partagé des 19 champs de `BespokePalette` (cf.
 * src/components/faire-part/edwigeWilfriedEffects.tsx pour le rôle exact
 * de chaque champ — fond des cartes, encre, accents, sceau…) — utilisé
 * côté serveur pour valider `projects.adminSetPalette` et côté client
 * (StudioPanel, suggestPalette) pour typer le formulaire admin. Ne
 * réexporte pas le type `BespokePalette` du composant React (pas
 * importable depuis l'API, cf. séparation api//src actée ailleurs dans
 * ce repo) : cette liste de clés doit être tenue à la main en phase avec
 * lui si un champ est ajouté un jour des deux côtés.
 */
export const bespokePaletteSchema = z.object({
  bg: z.string().min(1),
  bgDate: z.string().min(1),
  bgProgramme: z.string().min(1),
  cream: z.string().min(1),
  ink: z.string().min(1),
  inkRgb: z.string().min(1),
  inkOnCard: z.string().min(1),
  inkOnCardRgb: z.string().min(1),
  mapLine: z.string().min(1),
  bordeaux: z.string().min(1),
  bordeauxRgb: z.string().min(1),
  gold: z.string().min(1),
  goldRgb: z.string().min(1),
  sectionTitle: z.string().min(1),
  timelineAccent: z.string().min(1),
  stepLabel: z.string().min(1),
  seal: z.string().min(1),
  sealLight: z.string().min(1),
  sealDark: z.string().min(1),
});

export type BespokePaletteInput = z.infer<typeof bespokePaletteSchema>;

/** Un timing de chapitre du hero, en secondes dans la vidéo livrée (pas un ratio [0,1] — la conversion se fait au rendu, une fois la durée réelle de la vidéo connue côté lecteur, cf. Phase 4 du plan). */
export const heroChapterTimingSchema = z.object({
  fromSec: z.number().min(0),
  toSec: z.number().min(0),
});

/**
 * Exactement 3 chapitres — structure fixe du hero bespoke (ouverture /
 * détails pratiques / clôture, cf. `HERO_CHAPTERS` dans
 * leaOlivierContent.ts). Le contenu textuel de chaque chapitre reste
 * généré depuis les réponses du questionnaire (Phase 3, prénoms, date,
 * lieu…) — seuls les timings sont saisis ici par le studio, faute de
 * pouvoir les déduire automatiquement d'un montage vidéo livré.
 */
export const heroChaptersSchema = z.tuple([
  heroChapterTimingSchema,
  heroChapterTimingSchema,
  heroChapterTimingSchema,
]);

export type HeroChaptersInput = z.infer<typeof heroChaptersSchema>;
