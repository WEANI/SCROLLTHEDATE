import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminQuery, authedQuery, createRouter } from "./middleware";
import {
  computeCompletionPct,
  findActiveFormTemplate,
  findAllFormTemplates,
  findQuestionnaireByProject,
  saveFormTemplate,
  upsertQuestionnaire,
} from "./queries/questionnaire";
import {
  actorOf,
  findCurrentProject,
  logAudit,
} from "./queries/helpers";
import { findAllProjects, updateProjectStatus } from "./queries/projects";

const answersSchema = z.record(z.string(), z.unknown());

const questionSchema = z.object({
  id: z.string().min(1),
  step: z.number().int().min(1).max(4),
  type: z.string().min(1),
  label: z.string().min(1),
  placeholder: z.string().optional(),
  help: z.string().optional(),
  required: z.boolean().default(false),
  showOnInvite: z.boolean().default(false),
});

async function requireCurrentProject(userId: number) {
  const project = await findCurrentProject(userId);
  if (!project)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Aucun projet pour cet utilisateur",
    });
  return project;
}

export const questionnaireRouter = createRouter({
  get: authedQuery.query(async ({ ctx }) => {
    const project = await requireCurrentProject(ctx.user.id);
    const questionnaire = await findQuestionnaireByProject(project.id);
    return { project, questionnaire: questionnaire ?? null };
  }),

  // Autosave partiel : merge des réponses + recalcul du % de complétion.
  save: authedQuery
    .input(z.object({ answers: answersSchema }))
    .mutation(async ({ ctx, input }) => {
      const project = await requireCurrentProject(ctx.user.id);
      const existing = await findQuestionnaireByProject(project.id);
      const template = await findActiveFormTemplate();
      const merged = {
        ...((existing?.answers as Record<string, unknown> | null) ?? {}),
        ...input.answers,
      };
      const completionPct = computeCompletionPct(merged, template);
      await upsertQuestionnaire(project.id, merged, completionPct);
      // Première sauvegarde → le projet passe en QUESTIONNAIRE
      if (project.status === "ONBOARDING") {
        await updateProjectStatus(project.id, "QUESTIONNAIRE");
        await logAudit(
          project.id,
          actorOf(ctx.user),
          "questionnaire.started",
          { completionPct },
        );
      }
      if (completionPct === 100 && project.status === "QUESTIONNAIRE") {
        await logAudit(
          project.id,
          actorOf(ctx.user),
          "questionnaire.completed",
          { completionPct },
        );
      }
      return { completionPct };
    }),

  getActiveTemplate: authedQuery.query(() => findActiveFormTemplate()),

  adminListTemplates: adminQuery.query(() => findAllFormTemplates()),

  adminSaveTemplate: adminQuery
    .input(
      z.object({
        id: z.number().int().positive().optional(),
        name: z.string().min(1).max(255),
        questions: z.array(questionSchema),
        active: z.boolean().default(false),
      }),
    )
    .mutation(({ input }) => saveFormTemplate(input)),

  // Taux de complétion par question (tous projets confondus).
  adminCompletionStats: adminQuery.query(async () => {
    const projects = await findAllProjects();
    const template = await findActiveFormTemplate();
    const questions =
      (template?.questions as z.infer<typeof questionSchema>[] | null) ?? [];
    const withQuestionnaire = projects.filter((p) => p.questionnaire);
    const stats = questions.map((q) => {
      const answered = withQuestionnaire.filter((p) => {
        const answers =
          (p.questionnaire?.answers as Record<string, unknown> | null) ?? {};
        const v = answers[q.id];
        if (v === undefined || v === null) return false;
        if (typeof v === "string") return v.trim().length > 0;
        if (Array.isArray(v)) return v.length > 0;
        return true;
      }).length;
      return {
        id: q.id,
        label: q.label,
        step: q.step,
        required: q.required,
        answered,
        total: withQuestionnaire.length,
        completionPct:
          withQuestionnaire.length > 0
            ? Math.round((answered / withQuestionnaire.length) * 100)
            : 0,
      };
    });
    return {
      template: template ?? null,
      projectCount: withQuestionnaire.length,
      avgCompletionPct:
        withQuestionnaire.length > 0
          ? Math.round(
              withQuestionnaire.reduce(
                (sum, p) => sum + (p.questionnaire?.completionPct ?? 0),
                0,
              ) / withQuestionnaire.length,
            )
          : 0,
      stats,
    };
  }),
});
