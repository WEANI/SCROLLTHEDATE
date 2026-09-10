import { and, desc, eq } from "drizzle-orm";
import { projects, voiceNotes, type Project } from "@db/schema";
import { getDb } from "./connection";
import type { HeroChapterTiming, HeroCustomCard } from "../../contracts/bespokePalette";

export async function findProjectById(projectId: number) {
  return getDb().query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
}

/**
 * Produit commandé (FAIRE_PART / SAVE_THE_DATE) pour un projet — sert à
 * valider côté serveur que le nombre de chapitres du hero envoyé
 * correspond bien à ce que ce projet attend (cf. adminSetHeroChapters,
 * projectsRouter.ts) avant d'écrire en base, plutôt que d'accepter
 * n'importe quel tableau de 2 ou 3 chapitres valide pour l'UN OU L'AUTRE
 * produit sans le recouper avec le produit RÉEL du projet — bug reproduit
 * en conditions réelles le 08/09/2026 (commande 25, Yasmine & Adam :
 * un tableau à 3 éléments, resté d'avant l'ajout de l'onglet Save the
 * Date, avait fini réenregistré tel quel malgré un projet à 2 chapitres
 * attendus, faisant retomber le hero sur son repli générique).
 */
export async function findProjectProduct(projectId: number) {
  const row = await getDb().query.projects.findFirst({
    where: eq(projects.id, projectId),
    columns: { id: true },
    with: { order: { columns: { product: true } } },
  });
  return row?.order?.product ?? null;
}

export async function findProjectBySlug(slug: string) {
  return getDb().query.projects.findFirst({
    where: eq(projects.slug, slug),
    with: {
      user: true,
      questionnaire: true,
      rsvpConfig: true,
      // `order` : sert à distinguer FAIRE_PART / SAVE_THE_DATE côté page
      // publique (cf. projectsRouter.getPublicInvite → champ `product`,
      // FairePart.tsx qui rend une page très différente pour un save the
      // date — hero + footer, sans les sections du corps).
      order: { columns: { product: true } },
    },
  });
}

/**
 * Projet du client, avec tout ce qu'il faut pour la timeline — celui
 * explicitement choisi (`projectId`, vérifié appartenir à `userId`) via le
 * sélecteur de projet de l'espace client, ou par défaut le plus récent
 * (comportement historique, seule option avant qu'un même compte puisse
 * accumuler plusieurs projets).
 */
export async function findCurrentProjectFull(userId: number, projectId?: number) {
  const rows = await getDb().query.projects.findMany({
    where:
      projectId != null
        ? and(eq(projects.userId, userId), eq(projects.id, projectId))
        : eq(projects.userId, userId),
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

/**
 * Résumé de TOUS les projets d'un client, du plus récent au plus ancien —
 * pour le sélecteur de projet (espace client), affiché seulement quand un
 * compte en a plusieurs (ex. plusieurs commandes au fil du temps). Couple/
 * produit dérivés d'`order`/`questionnaire` (pas de colonne dédiée sur
 * `projects`), même source que `findAllProjects` (Kanban admin).
 */
export async function findProjectsSummaryByUser(userId: number) {
  const rows = await getDb().query.projects.findMany({
    where: eq(projects.userId, userId),
    orderBy: desc(projects.createdAt),
    with: {
      order: { columns: { product: true } },
      questionnaire: { columns: { answers: true } },
    },
  });
  return rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    status: p.status,
    product: p.order?.product ?? null,
    coupleNames:
      (p.questionnaire?.answers as Record<string, unknown> | null)?.[
        "couple.prenoms"
      ] as string | undefined ?? null,
    createdAt: p.createdAt,
  }));
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

/**
 * Palette bespoke posée à la main par le studio (cf. commentaire sur la
 * colonne, db/schema.ts). `string | boolean` (pas juste `string`) depuis
 * l'ajout de `heroClosingEnabled` — seul champ non-couleur de
 * BespokePaletteInput.
 */
export async function updateProjectPalette(
  projectId: number,
  palette: Record<string, string | boolean>,
) {
  await getDb().update(projects).set({ palette }).where(eq(projects.id, projectId));
}

/** Timings des 3 chapitres du hero, en secondes — cf. commentaire sur la colonne, db/schema.ts. */
export async function updateProjectHeroChapters(
  projectId: number,
  heroChapters: HeroChapterTiming[],
) {
  await getDb().update(projects).set({ heroChapters }).where(eq(projects.id, projectId));
}

/** Cartes de texte overlay libres, en plus des chapitres fixes — cf. commentaire sur la colonne, db/schema.ts. */
export async function updateProjectHeroCustomCards(
  projectId: number,
  heroCustomCards: HeroCustomCard[],
) {
  await getDb().update(projects).set({ heroCustomCards }).where(eq(projects.id, projectId));
}

export type ProjectStatus = Project["status"];
