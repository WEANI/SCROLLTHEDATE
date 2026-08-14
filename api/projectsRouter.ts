import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminQuery, authedQuery, createRouter } from "./middleware";
import { projectStatusEnum, templateEnum } from "./ordersRouter";
import {
  findAllProjects,
  findCurrentProjectFull,
  findProject360,
  findProjectById,
  updateProjectStatus,
  updateProjectTemplate,
} from "./queries/projects";
import { actorOf, logAudit, notifyUser } from "./queries/helpers";

export const projectsRouter = createRouter({
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
