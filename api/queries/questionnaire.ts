import { desc, eq } from "drizzle-orm";
import {
  formTemplates,
  questionnaires,
  type FormTemplate,
} from "@db/schema";
import { getDb } from "./connection";

export type FormQuestion = {
  id: string;
  step: number;
  type: string;
  label: string;
  placeholder?: string;
  help?: string;
  required?: boolean;
  showOnInvite?: boolean;
};

export async function findQuestionnaireByProject(projectId: number) {
  return getDb().query.questionnaires.findFirst({
    where: eq(questionnaires.projectId, projectId),
  });
}

export async function upsertQuestionnaire(
  projectId: number,
  answers: Record<string, unknown>,
  completionPct: number,
) {
  const db = getDb();
  await db
    .insert(questionnaires)
    .values({ projectId, answers, completionPct })
    .onConflictDoUpdate({
      target: questionnaires.projectId,
      set: { answers, completionPct },
    });
}

/**
 * Marque le questionnaire comme validé par le client, et renvoie la ligne
 * à jour. Réécrit la date à chaque validation : un client qui corrige une
 * réponse puis revalide doit produire une nouvelle alerte côté studio.
 */
export async function markQuestionnaireSubmitted(projectId: number) {
  const rows = await getDb()
    .update(questionnaires)
    .set({ submittedAt: new Date() })
    .where(eq(questionnaires.projectId, projectId))
    .returning();
  return rows.at(0);
}

export async function findActiveFormTemplate() {
  return getDb().query.formTemplates.findFirst({
    where: eq(formTemplates.active, true),
  });
}

export async function findAllFormTemplates() {
  return getDb().query.formTemplates.findMany({
    orderBy: desc(formTemplates.createdAt),
  });
}

export async function saveFormTemplate(data: {
  id?: number;
  name: string;
  questions: FormQuestion[];
  active: boolean;
}) {
  const db = getDb();
  if (data.active) {
    // Un seul template actif à la fois
    await db.update(formTemplates).set({ active: false });
  }
  if (data.id) {
    await db
      .update(formTemplates)
      .set({
        name: data.name,
        questions: data.questions,
        active: data.active,
      })
      .where(eq(formTemplates.id, data.id));
    return data.id;
  }
  const [{ id }] = await db
    .insert(formTemplates)
    .values({
      name: data.name,
      questions: data.questions,
      active: data.active,
    })
    .returning({ id: formTemplates.id });
  return id;
}

/** Calcule le % de complétion à partir du template actif. */
export function computeCompletionPct(
  answers: Record<string, unknown>,
  template: FormTemplate | undefined,
): number {
  const questions = (template?.questions ?? []) as FormQuestion[];
  if (questions.length === 0) {
    return Object.keys(answers).length > 0 ? 50 : 0;
  }
  const answered = questions.filter((q) => {
    const v = answers[q.id];
    if (v === undefined || v === null) return false;
    if (typeof v === "string") return v.trim().length > 0;
    if (Array.isArray(v)) return v.length > 0;
    return true;
  }).length;
  return Math.round((answered / questions.length) * 100);
}
