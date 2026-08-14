import { desc, eq } from "drizzle-orm";
import { projects, voiceNotes, type Project } from "@db/schema";
import { getDb } from "./connection";

export async function findProjectById(projectId: number) {
  return getDb().query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
}

export async function findProjectBySlug(slug: string) {
  return getDb().query.projects.findFirst({
    where: eq(projects.slug, slug),
    with: {
      user: true,
      questionnaire: true,
      rsvpConfig: true,
    },
  });
}

/** Projet courant du client, avec tout ce qu'il faut pour la timeline. */
export async function findCurrentProjectFull(userId: number) {
  const rows = await getDb().query.projects.findMany({
    where: eq(projects.userId, userId),
    orderBy: desc(projects.createdAt),
    limit: 1,
    with: {
      order: true,
      questionnaire: true,
      voiceNotes: { orderBy: desc(voiceNotes.createdAt) },
      auditEvents: true,
    },
  });
  const project = rows.at(0);
  if (project) {
    project.auditEvents.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
  }
  return project;
}

/** Liste Kanban admin : projets + client + commande + complétion. */
export async function findAllProjects() {
  return getDb().query.projects.findMany({
    orderBy: desc(projects.updatedAt),
    with: {
      user: true,
      order: true,
      questionnaire: true,
      media: true,
      messages: true,
    },
  });
}

/** Fiche 360° admin. */
export async function findProject360(projectId: number) {
  const project = await getDb().query.projects.findFirst({
    where: eq(projects.id, projectId),
    with: {
      order: true,
      user: true,
      questionnaire: true,
      voiceNotes: true,
      media: true,
      scenarioProposals: true,
      videoVersions: true,
      messages: true,
      auditEvents: true,
      rsvpConfig: true,
      rsvpResponses: true,
    },
  });
  if (project) {
    project.scenarioProposals.sort((a, b) => a.ordre - b.ordre);
    project.videoVersions.sort((a, b) => b.version - a.version);
    project.messages.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
    project.auditEvents.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
  }
  return project;
}

export async function updateProjectStatus(
  projectId: number,
  status: Project["status"],
) {
  const progressByStatus: Record<Project["status"], number> = {
    ONBOARDING: 5,
    QUESTIONNAIRE: 20,
    SCENARIOS: 40,
    PRODUCTION: 65,
    REVIEW: 85,
    DELIVERED: 100,
  };
  await getDb()
    .update(projects)
    .set({ status, progress: progressByStatus[status] })
    .where(eq(projects.id, projectId));
}

export async function updateProjectTemplate(
  projectId: number,
  template: Project["template"],
) {
  await getDb().update(projects).set({ template }).where(eq(projects.id, projectId));
}

export type ProjectStatus = Project["status"];
