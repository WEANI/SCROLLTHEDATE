import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminQuery, authedQuery, createRouter } from "./middleware";
import {
  computeCompletionPct,
  findActiveFormTemplate,
  findAllFormTemplates,
  findQuestionnaireByProject,
  markQuestionnaireSubmitted,
  saveFormTemplate,
  upsertQuestionnaire,
} from "./queries/questionnaire";
import {
  actorOf,
  findCurrentProject,
  logAudit,
  notifyAdmins,
} from "./queries/helpers";
import { env } from "./lib/env";
import { sendEmail } from "./lib/email";
import { adminAlertEmail } from "./lib/emailTemplates";
import {
  findAllProjects,
  updateProjectStatus,
  updateProjectTemplate,
} from "./queries/projects";
import { templateEnum } from "./ordersRouter";

const answersSchema = z.record(z.string(), z.unknown());

/**
 * Question « Ambiance souhaitée » du questionnaire — la réponse du client
 * pilote directement le thème de son faire-part (cf. syncTemplateFromAmbiance
 * et src/components/hero-scrub/themes.ts, dont les id sont alignés sur les
 * valeurs de `projectTemplateEnum`).
 */
const AMBIANCE_QUESTION_ID = "style.ambiance";

/**
 * `answers` est un jsonb libre, et deux formats de réponse coexistent en
 * base : la valeur brute écrite par l'UI actuelle ("cinema") et le libellé
 * affiché, accentué et capitalisé, présent sur des projets plus anciens
 * ("Cinéma", "Éditorial"). On ramène les deux à la valeur de l'enum plutôt
 * que d'ignorer silencieusement la seconde forme.
 */
function normalizeAmbiance(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

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

/**
 * Reporte le choix d'ambiance du client sur `projects.template` (le thème
 * réellement rendu par la page faire-part). Sans ça, la question « Ambiance
 * souhaitée » n'avait aucun effet : seul un admin pouvait changer le thème
 * depuis le Studio, et tout projet gardait le défaut "editorial".
 *
 * Ne synchronise QUE si le client vient de (re)choisir une ambiance, pas à
 * chaque sauvegarde : le questionnaire s'enregistre en autosave et renvoie
 * les réponses fusionnées, donc écrire systématiquement écraserait à la
 * première frappe du client tout ajustement manuel fait par l'admin dans le
 * Studio. Un changement explicite d'ambiance, lui, reste prioritaire — c'est
 * une intention fraîche du client.
 */
async function syncTemplateFromAmbiance(
  project: { id: number; template: string },
  previousAnswers: Record<string, unknown>,
  mergedAnswers: Record<string, unknown>,
  actor: string,
) {
  const previous = previousAnswers[AMBIANCE_QUESTION_ID];
  const next = mergedAnswers[AMBIANCE_QUESTION_ID];
  if (next === previous) return;

  // Ne jamais écrire dans l'enum sans valider (jsonb libre côté réponses).
  const parsed = templateEnum.safeParse(normalizeAmbiance(next));
  if (!parsed.success || parsed.data === project.template) return;

  await updateProjectTemplate(project.id, parsed.data);
  await logAudit(project.id, actor, "project.template_changed", {
    from: project.template,
    to: parsed.data,
    source: "questionnaire",
  });
}

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
      const previousAnswers =
        (existing?.answers as Record<string, unknown> | null) ?? {};
      const merged = { ...previousAnswers, ...input.answers };
      const completionPct = computeCompletionPct(merged, template);
      await upsertQuestionnaire(project.id, merged, completionPct);
      await syncTemplateFromAmbiance(
        project,
        previousAnswers,
        merged,
        actorOf(ctx.user),
      );
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

  /**
   * Validation explicite par le client : « j'ai fini, vous pouvez lancer la
   * production ». Distinct de `save`, qui tourne en autosave à chaque frappe
   * et ne dit rien de l'intention du client.
   *
   * Volontairement autorisée même à moins de 100 % (beaucoup de questions
   * sont facultatives) — le taux de complétion part dans l'alerte pour que
   * le studio voie tout de suite s'il manque des éléments. Le questionnaire
   * reste modifiable ensuite : le client peut corriger puis revalider, ce
   * qui réémet une alerte.
   */
  submit: authedQuery.mutation(async ({ ctx }) => {
    const project = await requireCurrentProject(ctx.user.id);
    const existing = await findQuestionnaireByProject(project.id);
    if (!existing) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Répondez à au moins une question avant de valider.",
      });
    }

    const updated = await markQuestionnaireSubmitted(project.id);
    const completionPct = updated?.completionPct ?? existing.completionPct;
    const isResubmission = Boolean(existing.submittedAt);

    await logAudit(project.id, actorOf(ctx.user), "questionnaire.submitted", {
      completionPct,
      isResubmission,
    });
    await notifyAdmins("questionnaire.submitted", {
      projectId: project.id,
      slug: project.slug,
      completionPct,
    });

    if (env.ownerEmail) {
      await sendEmail(
        adminAlertEmail({
          to: env.ownerEmail,
          title: isResubmission
            ? "Questionnaire mis à jour"
            : "Questionnaire validé — prêt pour la production",
          detail:
            completionPct >= 100
              ? "Toutes les réponses sont là, la vidéo du faire-part peut être lancée."
              : `Validé par le client à ${completionPct} % de complétion — vérifiez les réponses manquantes avant de lancer la production.`,
          projectSlug: project.slug,
        }),
      );
    }

    return { submittedAt: updated?.submittedAt ?? new Date(), completionPct };
  }),

  // `?? null` : findActiveFormTemplate (findFirst) renvoie `undefined` tant
  // qu'aucun template n'est actif — React Query v5 interdit qu'une query se
  // résolve avec `undefined` et le transforme en erreur générique côté
  // client (cf. le même correctif sur projects.myProject, où ce piège a été
  // diagnostiqué en détail).
  getActiveTemplate: authedQuery.query(async () => (await findActiveFormTemplate()) ?? null),

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
