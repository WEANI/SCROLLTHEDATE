import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminQuery, authedQuery, createRouter, publicQuery } from "./middleware";
import { projectStatusEnum, templateEnum } from "./ordersRouter";
import {
  findAllProjects,
  findCurrentProjectFull,
  findProject360,
  findProjectById,
  findProjectBySlug,
  updateProjectStatus,
  updateProjectTemplate,
} from "./queries/projects";
import { findVideosByProject } from "./queries/domain";
import { actorOf, logAudit, notifyUser } from "./queries/helpers";

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
      const heroVideo = videos.find((v) => !v.watermark) ?? null;
      if (!heroVideo) return null;
      const answers =
        (project.questionnaire?.answers as Record<string, unknown> | null) ??
        {};
      const str = (key: string) =>
        typeof answers[key] === "string" && (answers[key] as string).trim()
          ? (answers[key] as string)
          : null;
      return {
        slug: project.slug,
        template: project.template,
        weddingDate: project.weddingDate,
        heroVideoUrl: heroVideo.url,
        heroPosterUrl: heroVideo.posterUrl,
        coupleNames: str("couple.prenoms"),
        venueName: str("jourj.lieu_ceremonie") ?? project.venue,
        ceremonyTime: str("jourj.heure"),
        dressCode: str("jourj.dress_code"),
        practicalInfo: str("jourj.infos_pratiques"),
      };
    }),

  // Projet courant du client connecté, avec timeline (audit) + commande.
  myProject: authedQuery.query(({ ctx }) =>
    findCurrentProjectFull(ctx.user.id),
  ),

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
});
