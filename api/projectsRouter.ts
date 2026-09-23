import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminQuery, authedQuery, createRouter, publicQuery } from "./middleware";
import { projectStatusEnum, templateEnum } from "./ordersRouter";
import {
  bespokePaletteSchema,
  heroChaptersSchema,
  heroCustomCardsSchema,
  heroVerticalAlignSchema,
  type HeroChapterTiming,
  type HeroCustomCard,
} from "../contracts/bespokePalette";
import { QUESTIONNAIRE_KEYS } from "../contracts/questionnaireKeys";
import {
  findAllProjects,
  findCurrentProjectFull,
  findProject360,
  findProjectById,
  findProjectBySlug,
  findProjectProduct,
  findProjectsSummaryByUser,
  updateProjectHeroChapters,
  updateProjectHeroCustomCards,
  updateProjectPalette,
  updateProjectStatus,
  updateProjectTemplate,
  updateProjectWeddingDate,
} from "./queries/projects";
import { findVideosByProject } from "./queries/domain";
import { actorOf, findProjectForUser, logAudit, notifyUser } from "./queries/helpers";
import { findUserById } from "./queries/orders";
import { sendEmail } from "./lib/email";
import { projectStatusChangedEmail } from "./lib/emailTemplates";

export const projectsRouter = createRouter({
  // Faire-part public (par slug) — sans auth. Rendu du hero scrub +
  // section payload d'un vrai projet livré : vidéo finale (première version
  // non filigranée, cf. videos.clientApprove) + réponses du questionnaire
  // marquées "affiché sur le faire-part". Renvoie `null` tant qu'aucune
  // vidéo livrable n'existe (projet pas encore prêt à être montré aux
  // invités) plutôt qu'une erreur — le front affiche alors un état neutre.
  getPublicInvite: publicQuery
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ input }) => {
      const project = await findProjectBySlug(input.slug);
      if (!project) return null;
      const videos = await findVideosByProject(project.id);
      // Priorité : version non filigranée (finale/approuvée), sinon dernière
      // version envoyée (filigranée, visible avec overlay sur le faire-part
      // tant que le projet n'est pas DELIVERED).
      const heroVideo =
        videos.find((v) => !v.watermark) ??
        videos.find((v) => v.status === "sent" || v.status === "final") ??
        null;
      if (!heroVideo) return null;
      const answers =
        (project.questionnaire?.answers as Record<string, unknown> | null) ??
        {};
      const str = (key: string) =>
        typeof answers[key] === "string" && (answers[key] as string).trim()
          ? (answers[key] as string)
          : null;
      // Questions `type: "list"` (programme, hébergements, FAQ, mots-clés)
      // — un tableau de chaînes, une ligne par élément (cf.
      // src/pages/espace/Questionnaire.tsx, le rendu `list`). Renvoyées
      // ici TELLES QUELLES, pas encore découpées en objets : le format
      // par élément ("Horaire — Titre — Détail" pour le programme,
      // "Question — Réponse" pour la FAQ) reste un texte libre saisi par
      // le couple, à interpréter côté page publique au moment du rendu
      // (Phase 4, avec `parseProgrammeItem`/équivalent — cf.
      // DetailsSombre.tsx) plutôt qu'ici : cette fonction ne fait
      // qu'extraire des données, jamais les mettre en forme visuelle.
      const list = (key: string): string[] => {
        const v = answers[key];
        return Array.isArray(v)
          ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
          : [];
      };
      // jourj.dress_code_couleur : question `color` avec maxColors (cf.
      // Questionnaire.tsx) — historiquement une seule couleur (chaîne),
      // désormais jusqu'à 3 (tableau). Les deux formats coexistent en base
      // selon la date de la réponse, jamais de migration a posteriori :
      // une ancienne chaîne unique est ramenée à un tableau à un élément.
      const colorList = (key: string): string[] => {
        const v = answers[key];
        if (typeof v === "string" && v.trim()) return [v];
        return Array.isArray(v)
          ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
          : [];
      };
      return {
        slug: project.slug,
        status: project.status,
        template: project.template,
        // Distingue FAIRE_PART / SAVE_THE_DATE — cf. FairePart.tsx, qui
        // rend une page très différente pour un save the date (hero +
        // footer uniquement, cf. échange du 07/09/2026).
        product: project.product,
        weddingDate: project.weddingDate,
        heroVideoUrl: heroVideo.url,
        heroPosterUrl: heroVideo.posterUrl,
        // Mode "frames" (cf. api/lib/videoFrames.ts) — `null` pour une
        // version en mode "video" (historique, comportement inchangé) :
        // HeroScrub retombe alors sur la balise <video> avec heroVideoUrl.
        heroFrames:
          heroVideo.kind === "frames" && heroVideo.frameBaseUrl && heroVideo.frameCount && heroVideo.frameFps
            ? { baseUrl: heroVideo.frameBaseUrl, count: heroVideo.frameCount, fps: heroVideo.frameFps }
            : null,
        coupleNames: str("couple.prenoms"),
        venueName: str("jourj.lieu_ceremonie") ?? project.venue,
        ceremonyTime: str("jourj.heure"),
        dressCode: str("jourj.dress_code"),
        dressCodeCouleurs: colorList("jourj.dress_code_couleur"),
        practicalInfo: str("jourj.infos_pratiques"),
        // Généralisation bespoke (PLAN-GENERALISATION-THEMES.md, Phase 3)
        // — sections optionnelles : `null`/`[]` si le couple n'a pas
        // répondu, jamais de contenu inventé. Les 3 photos de la galerie
        // (`q_mtaf...`, cf. contracts/questionnaireKeys.ts) sont déjà des
        // data URI complètes — stockées directement comme réponse (cf.
        // PhotoQuestionField, Questionnaire.tsx), donc `str()` suffit,
        // aucune résolution de média séparée à faire.
        histoire: str(QUESTIONNAIRE_KEYS.histoire),
        histoireMotsCles: list(QUESTIONNAIRE_KEYS.histoireMotsCles),
        galeriePhotos: [
          str(QUESTIONNAIRE_KEYS.galeriePhoto1),
          str(QUESTIONNAIRE_KEYS.galeriePhoto2),
          str(QUESTIONNAIRE_KEYS.galeriePhoto3),
        ].filter((x): x is string => x !== null),
        programme: list(QUESTIONNAIRE_KEYS.programme),
        hebergements: list("jourj.hebergements"),
        faq: list(QUESTIONNAIRE_KEYS.faq),
        photoLieu: str(QUESTIONNAIRE_KEYS.photoLieu),
        photoOuverture: str(QUESTIONNAIRE_KEYS.photoOuverture),
        // "Menu du dîner" et "Liste de mariage" (modifications a faire.md)
        // — mêmes conventions que ci-dessus : `list`/`str` bruts, jamais de
        // contenu inventé, absents (`[]`/`null`) tant que le couple n'a pas
        // répondu. Le lien de cagnotte fait foi pour "Liste de mariage" —
        // pas d'IBAN, cf. doc de ListeDeMariage (edwigeWilfriedEffects.tsx).
        menuCocktail: list("jourj.menu_cocktail"),
        menuEntree: list("jourj.menu_entree"),
        menuPlat: list("jourj.menu_plat"),
        menuDessert: list("jourj.menu_dessert"),
        listeMariageLien: str("jourj.liste_mariage_lien"),
        listeMariageMessage: str("jourj.liste_mariage_message"),
        // Posés à la main par le studio (StudioPanel, Phase 2) — jamais
        // générés ici. `null` tant que non validés : la page publique
        // (Phase 4) doit alors retomber sur une palette par défaut sobre.
        palette: project.palette,
        heroChapters: project.heroChapters,
        // Cartes de texte overlay libres, ajoutées à la main par le studio
        // en plus des chapitres fixes ci-dessus — cf. commentaire sur la
        // colonne, db/schema.ts. `[]` par défaut (jamais `null` renvoyé,
        // pour que FairePart.tsx puisse toujours faire `.map()` sans test).
        heroCustomCards: (project.heroCustomCards as HeroCustomCard[] | null) ?? [],
      };
    }),

  // Projet courant du client connecté, avec timeline (audit) + commande.
  // `?? null` est déterminant, pas cosmétique : findCurrentProjectFull
  // renvoie `undefined` via `rows.at(0)` quand le client n'a encore aucun
  // projet (ex. juste après signup, avant toute commande) — un cas
  // parfaitement normal, pas une erreur. React Query v5 interdit qu'une
  // query se résolve avec `undefined` (réservé en interne à "pas encore de
  // données") et transforme silencieusement ce cas en erreur générique
  // côté client — jamais visible côté serveur (tRPC transmet `undefined`
  // sans broncher), donc invisible à tout test qui interroge l'API
  // directement. C'est ce qui produisait "Une erreur est survenue" sur
  // Tableau de bord et Projet & scénarios pour tout compte sans commande.
  myProject: authedQuery
    .input(z.object({ projectId: z.number().int().positive().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const project = await findCurrentProjectFull(ctx.user.id, input?.projectId);
      return project ?? null;
    }),

  // Résumé de tous les projets du client connecté — alimente le sélecteur
  // de projet de l'espace client (masqué si un seul projet, cf.
  // ProjectSelectionProvider). Liste vide si aucune commande, comme
  // myProject.
  myProjects: authedQuery.query(async ({ ctx }) => {
    return findProjectsSummaryByUser(ctx.user.id);
  }),

  // Personnalisation d'un Save the Date par le client lui-même, APRÈS
  // achat (cf. échange du 21/09/2026 : "je souhaite ajouter un bloc date
  // indépendant... coté client ils ne peuvent personnaliser que : la date,
  // les prénoms, les couleurs de texte et police, emplacement du texte, et
  // animation d'apparition"). Volontairement une allow-list explicite de
  // champs, PAS `adminSetPalette`/`adminSetHeroChapters` réutilisés avec
  // une autre policy : le timing (fromSec/toSec) et tout le reste (cadre,
  // fond de carte, couleur du "&"…) doivent rester HORS DE PORTÉE de ce
  // endpoint, quoi qu'il arrive — le schéma d'entrée ci-dessous ne connaît
  // même pas ces champs, impossible de les faire passer par erreur.
  updateMySaveTheDatePersonalization: authedQuery
    .input(
      z.object({
        projectId: z.number().int().positive().optional(),
        weddingDate: z.coerce.date().optional(),
        chapter1TextColor: z.string().optional(),
        chapter1Position: heroVerticalAlignSchema.optional(),
        chapter2TextColor: z.string().optional(),
        chapter2Position: heroVerticalAlignSchema.optional(),
        dateTextColor: z.string().optional(),
        datePosition: heroVerticalAlignSchema.optional(),
        fontId: z.string().optional(),
        textAnimation: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await findProjectForUser(ctx.user.id, input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      // N'a de sens que pour un Save the Date "sur un modèle" — un
      // faire-part bespoke n'a ni palette de blocs fixes ni ce concept de
      // bloc "date" (scénarios/montage sur mesure, cf. Projet.tsx).
      const product = await findProjectProduct(project.id);
      if (product !== "SAVE_THE_DATE") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Personnalisation réservée aux commandes Save the Date.",
        });
      }

      // Palette : merge allow-listé sur la palette déjà en base (JAMAIS un
      // remplacement complet — `updateProjectPalette` écrase toute la
      // colonne, cf. sa doc). Couleur par bloc (1/2) + police/animation
      // pour tout le hero, cf. contracts/bespokePalette.ts.
      const existingPalette =
        project.palette && typeof project.palette === "object"
          ? (project.palette as Record<string, string | boolean>)
          : {};
      const nextPalette = { ...existingPalette };
      let paletteChanged = false;
      if (input.chapter1TextColor !== undefined) {
        nextPalette.stdSaveTheDateTextColor = input.chapter1TextColor;
        paletteChanged = true;
      }
      if (input.chapter2TextColor !== undefined) {
        nextPalette.stdNamesDateTextColor = input.chapter2TextColor;
        paletteChanged = true;
      }
      if (input.fontId !== undefined) {
        nextPalette.heroFontId = input.fontId;
        paletteChanged = true;
      }
      if (input.textAnimation !== undefined) {
        nextPalette.heroTextAnimation = input.textAnimation;
        paletteChanged = true;
      }
      if (paletteChanged) await updateProjectPalette(project.id, nextPalette);

      // heroChapters : ne réassigne QUE `.position` aux index fournis,
      // JAMAIS `.fromSec`/`.toSec` (décidés exclusivement par l'admin) —
      // cf. doc du endpoint ci-dessus.
      if (input.chapter1Position || input.chapter2Position) {
        const existingChapters = (project.heroChapters as HeroChapterTiming[] | null) ?? [];
        if (existingChapters.length === 2) {
          const nextChapters: HeroChapterTiming[] = [
            input.chapter1Position ? { ...existingChapters[0], position: input.chapter1Position } : existingChapters[0],
            input.chapter2Position ? { ...existingChapters[1], position: input.chapter2Position } : existingChapters[1],
          ];
          await updateProjectHeroChapters(project.id, nextChapters);
        }
      }

      // Bloc "date" (carte heroCustomCards kind:'date', cf.
      // contracts/saveTheDateTemplates.ts::dateBlockEnabled) — ignoré
      // silencieusement si ce modèle n'a pas ce bloc (commande passée
      // avant son introduction, ou modèle où l'admin ne l'a pas activé) :
      // le client n'a alors simplement rien à personnaliser ici, pas une
      // erreur.
      if (input.dateTextColor !== undefined || input.datePosition !== undefined) {
        const existingCards = (project.heroCustomCards as HeroCustomCard[] | null) ?? [];
        const dateCardIdx = existingCards.findIndex((c) => c.kind === "date");
        if (dateCardIdx !== -1) {
          const nextCards = [...existingCards];
          nextCards[dateCardIdx] = {
            ...nextCards[dateCardIdx],
            ...(input.dateTextColor !== undefined ? { textColor: input.dateTextColor } : null),
            ...(input.datePosition !== undefined ? { position: input.datePosition } : null),
          };
          await updateProjectHeroCustomCards(project.id, nextCards);
        }
      }

      if (input.weddingDate) await updateProjectWeddingDate(project.id, input.weddingDate);

      await logAudit(project.id, actorOf(ctx.user), "project.save_the_date_personalized", {});
      return { success: true };
    }),

  // Kanban admin : projets + client + commande + complétion questionnaire.
  adminList: adminQuery.query(() => findAllProjects()),

  // Fiche 360° : order + user + questionnaire + media + voice_notes +
  // scenarios + videos + messages + audit + rsvp.
  adminGet: adminQuery
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const project = await findProject360(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      return project;
    }),

  adminUpdateStatus: adminQuery
    .input(
      z.object({
        projectId: z.number().int().positive(),
        status: projectStatusEnum,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await findProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      await updateProjectStatus(input.projectId, input.status);
      await logAudit(input.projectId, actorOf(ctx.user), "project.status_changed", {
        from: project.status,
        to: input.status,
      });
      await notifyUser(project.userId, "project.status_changed", {
        projectId: project.id,
        slug: project.slug,
        status: input.status,
      });
      const owner = await findUserById(project.userId);
      if (owner?.email) {
        await sendEmail(
          projectStatusChangedEmail({
            to: owner.email,
            coupleNames: owner.name ?? "",
            status: input.status,
          }),
        );
      }
      return { success: true };
    }),

  adminSetTemplate: adminQuery
    .input(
      z.object({
        projectId: z.number().int().positive(),
        template: templateEnum,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await findProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      await updateProjectTemplate(input.projectId, input.template);
      await logAudit(input.projectId, actorOf(ctx.user), "project.template_changed", {
        from: project.template,
        to: input.template,
      });
      return { success: true };
    }),

  // Généralisation bespoke (PLAN-GENERALISATION-THEMES.md, Phase 2) — le
  // studio pose les 19 champs à la main dans StudioPanel, éventuellement
  // pré-remplis par suggestPalette() côté client, jamais générés côté
  // serveur : cf. commentaire sur la colonne, db/schema.ts.
  adminSetPalette: adminQuery
    .input(
      z.object({
        projectId: z.number().int().positive(),
        palette: bespokePaletteSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await findProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      await updateProjectPalette(input.projectId, input.palette);
      await logAudit(input.projectId, actorOf(ctx.user), "project.palette_changed", {});
      return { success: true };
    }),

  // Timings des chapitres du hero vidéo, repérés à l'image par le studio
  // sur le montage livré — 3 pour un faire-part, 2 pour un save the date
  // (cf. commentaire sur la colonne, db/schema.ts).
  adminSetHeroChapters: adminQuery
    .input(
      z.object({
        projectId: z.number().int().positive(),
        heroChapters: heroChaptersSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await findProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      // Recoupe la longueur envoyée avec le produit RÉEL du projet plutôt
      // que de faire confiance au client — le schéma d'entrée accepte 2 OU
      // 3 chapitres (l'un ou l'autre produit), sans savoir lequel ce
      // PROJET attend précisément. Sans ce garde-fou, un tableau au
      // mauvais format (resté d'avant un changement de produit, ou d'un
      // bug client) s'enregistre tel quel — cf. bug reproduit le
      // 08/09/2026 (commande 25).
      const product = await findProjectProduct(input.projectId);
      const expectedCount = product === "SAVE_THE_DATE" ? 2 : 3;
      if (input.heroChapters.length !== expectedCount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Ce projet attend ${expectedCount} chapitres, reçu ${input.heroChapters.length}.`,
        });
      }
      await updateProjectHeroChapters(input.projectId, input.heroChapters);
      await logAudit(input.projectId, actorOf(ctx.user), "project.hero_chapters_changed", {});
      return { success: true };
    }),

  // Cartes de texte overlay LIBRES, en plus des chapitres fixes ci-dessus —
  // cf. commentaire sur la colonne, db/schema.ts. Aucune contrainte de
  // longueur liée au produit (contrairement à adminSetHeroChapters) : un
  // faire-part comme un save the date peuvent en avoir 0 à 10.
  adminSetHeroCustomCards: adminQuery
    .input(
      z.object({
        projectId: z.number().int().positive(),
        heroCustomCards: heroCustomCardsSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await findProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      await updateProjectHeroCustomCards(input.projectId, input.heroCustomCards);
      await logAudit(input.projectId, actorOf(ctx.user), "project.hero_custom_cards_changed", {});
      return { success: true };
    }),
});
