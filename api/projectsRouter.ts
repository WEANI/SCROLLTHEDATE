import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminQuery, authedQuery, createRouter, publicQuery } from "./middleware";
import { projectStatusEnum, templateEnum } from "./ordersRouter";
import { bespokePaletteSchema, heroChaptersSchema } from "../contracts/bespokePalette";
import { QUESTIONNAIRE_KEYS } from "../contracts/questionnaireKeys";
import {
  findAllProjects,
  findCurrentProjectFull,
  findProject360,
  findProjectById,
  findProjectBySlug,
  updateProjectHeroChapters,
  updateProjectPalette,
  updateProjectStatus,
  updateProjectTemplate,
} from "./queries/projects";
import { findVideosByProject } from "./queries/domain";
import { actorOf, logAudit, notifyUser } from "./queries/helpers";
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
      return {
        slug: project.slug,
        status: project.status,
        template: project.template,
        weddingDate: project.weddingDate,
        heroVideoUrl: heroVideo.url,
        heroPosterUrl: heroVideo.posterUrl,
        coupleNames: str("couple.prenoms"),
        venueName: str("jourj.lieu_ceremonie") ?? project.venue,
        ceremonyTime: str("jourj.heure"),
        dressCode: str("jourj.dress_code"),
        dressCodeCouleur: str("jourj.dress_code_couleur"),
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
        // Posés à la main par le studio (StudioPanel, Phase 2) — jamais
        // générés ici. `null` tant que non validés : la page publique
        // (Phase 4) doit alors retomber sur une palette par défaut sobre.
        palette: project.palette,
        heroChapters: project.heroChapters,
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
  myProject: authedQuery.query(async ({ ctx }) => {
    const project = await findCurrentProjectFull(ctx.user.id);
    return project ?? null;
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

  // Timings des 3 chapitres du hero vidéo, repérés à l'image par le
  // studio sur le montage livré — cf. commentaire sur la colonne,
  // db/schema.ts.
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
      await updateProjectHeroChapters(input.projectId, input.heroChapters);
      await logAudit(input.projectId, actorOf(ctx.user), "project.hero_chapters_changed", {});
      return { success: true };
    }),
});
