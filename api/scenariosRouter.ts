import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminQuery, authedQuery, createRouter } from "./middleware";
import {
  findScenariosByProject,
  replaceScenarios,
  updateScenarioStatus,
} from "./queries/domain";
import {
  actorOf,
  findCurrentProject,
  logAudit,
  notifyAdmins,
  notifyUser,
} from "./queries/helpers";
import { findProjectById, updateProjectStatus } from "./queries/projects";
import { findUserById } from "./queries/orders";
import { sendEmail } from "./lib/email";
import { scenariosReadyEmail, adminAlertEmail } from "./lib/emailTemplates";
import { env } from "./lib/env";

async function requireCurrentProject(userId: number) {
  const project = await findCurrentProject(userId);
  if (!project)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Aucun projet pour cet utilisateur",
    });
  return project;
}

const moodboardSchema = z
  .array(z.object({ url: z.string(), caption: z.string().optional() }))
  .optional();

export const scenariosRouter = createRouter({
  // Lecture : un client sans projet n'est pas une erreur (ex. juste après
  // signup, avant toute commande) — liste vide, comme projects.myProject.
  // requireCurrentProject (qui lève NOT_FOUND) reste réservé aux mutations
  // ci-dessous, où l'absence de projet est réellement anormale.
  listMine: authedQuery.query(async ({ ctx }) => {
    const project = await findCurrentProject(ctx.user.id);
    if (!project) return [];
    return findScenariosByProject(project.id);
  }),

  adminList: adminQuery
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(({ input }) => findScenariosByProject(input.projectId)),

  // Créer/remplacer les 3 propositions + notification client.
  adminCreate: adminQuery
    .input(
      z.object({
        projectId: z.number().int().positive(),
        proposals: z
          .array(
            z.object({
              ordre: z.number().int().min(1).max(3),
              title: z.string().min(1).max(255),
              summary: z.string().min(1),
              moodboard: moodboardSchema,
            }),
          )
          .length(3),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await findProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      await replaceScenarios(
        input.projectId,
        input.proposals.map((p) => ({
          ordre: p.ordre,
          title: p.title,
          summary: p.summary,
          moodboard: p.moodboard ?? null,
        })),
      );
      if (project.status === "QUESTIONNAIRE" || project.status === "ONBOARDING") {
        await updateProjectStatus(project.id, "SCENARIOS");
      }
      await logAudit(project.id, actorOf(ctx.user), "scenarios.sent", {
        count: input.proposals.length,
        titles: input.proposals.map((p) => p.title),
      });
      await notifyUser(project.userId, "scenarios.sent", {
        projectId: project.id,
        slug: project.slug,
      });
      const owner = await findUserById(project.userId);
      if (owner?.email) {
        await sendEmail(
          scenariosReadyEmail({
            to: owner.email,
            coupleNames: owner.name ?? "",
            slug: project.slug,
          }),
        );
      }
      return { success: true };
    }),

  // Choix définitif du client → passage en PRODUCTION + notification admin.
  choose: authedQuery
    .input(z.object({ scenarioId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const project = await requireCurrentProject(ctx.user.id);
      const scenarios = await findScenariosByProject(project.id);
      const scenario = scenarios.find((s) => s.id === input.scenarioId);
      if (!scenario) throw new TRPCError({ code: "NOT_FOUND" });
      await updateScenarioStatus(input.scenarioId, "chosen", {
        chosenAt: new Date(),
      });
      if (project.status === "SCENARIOS") {
        await updateProjectStatus(project.id, "PRODUCTION");
      }
      await logAudit(project.id, actorOf(ctx.user), "scenario.chosen", {
        scenarioId: input.scenarioId,
        title: scenario.title,
      });
      await notifyAdmins("scenario.chosen", {
        projectId: project.id,
        slug: project.slug,
        title: scenario.title,
      });
      if (env.ownerEmail) {
        await sendEmail(
          adminAlertEmail({
            to: env.ownerEmail,
            title: "Scénario choisi",
            detail: `« ${scenario.title} »`,
            projectSlug: project.slug,
          }),
        );
      }
      return { success: true };
    }),

  requestChanges: authedQuery
    .input(
      z.object({
        scenarioId: z.number().int().positive(),
        comment: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await requireCurrentProject(ctx.user.id);
      const scenarios = await findScenariosByProject(project.id);
      const scenario = scenarios.find((s) => s.id === input.scenarioId);
      if (!scenario) throw new TRPCError({ code: "NOT_FOUND" });
      await updateScenarioStatus(input.scenarioId, "changes_requested", {
        clientComment: input.comment,
      });
      await logAudit(project.id, actorOf(ctx.user), "scenario.changes_requested", {
        scenarioId: input.scenarioId,
        title: scenario.title,
        comment: input.comment,
      });
      await notifyAdmins("scenario.changes_requested", {
        projectId: project.id,
        slug: project.slug,
        title: scenario.title,
        comment: input.comment,
      });
      if (env.ownerEmail) {
        await sendEmail(
          adminAlertEmail({
            to: env.ownerEmail,
            title: "Retouches demandées",
            detail: `« ${scenario.title} » — "${input.comment}"`,
            projectSlug: project.slug,
          }),
        );
      }
      return { success: true };
    }),
});
