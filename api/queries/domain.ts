import { and, desc, eq, sql } from "drizzle-orm";
import {
  media,
  messages,
  projects,
  rsvpConfig,
  rsvpResponses,
  scenarioProposals,
  videoVersions,
  voiceNotes,
  type InsertMedia,
  type InsertMessage,
  type InsertRsvpResponse,
  type InsertScenarioProposal,
  type InsertVideoVersion,
  type InsertVoiceNote,
  type Media,
  type Message,
  type RsvpResponse,
  type ScenarioProposal,
  type VideoVersion,
  type VoiceNote,
} from "@db/schema";
import { getDb } from "./connection";

// ---------------------------------------------------------------- media ----
export async function addMedia(data: InsertMedia) {
  const [{ id }] = await getDb()
    .insert(media)
    .values(data)
    .returning({ id: media.id });
  return id;
}

export async function findMediaByProject(projectId: number) {
  return getDb()
    .select()
    .from(media)
    .where(eq(media.projectId, projectId))
    .orderBy(desc(media.createdAt));
}

export async function updateMediaStatus(
  mediaId: number,
  status: Media["status"],
) {
  await getDb().update(media).set({ status }).where(eq(media.id, mediaId));
}

/**
 * Supprime un média, scopé au projet propriétaire (le client ne peut
 * supprimer que ses propres fichiers). Renvoie `true` si une ligne a
 * effectivement été supprimée.
 */
export async function deleteMedia(mediaId: number, projectId: number) {
  const deleted = await getDb()
    .delete(media)
    .where(and(eq(media.id, mediaId), eq(media.projectId, projectId)))
    .returning({ id: media.id });
  return deleted.length > 0;
}

// ------------------------------------------------------------ voiceNotes ----
export async function addVoiceNote(data: InsertVoiceNote) {
  const [{ id }] = await getDb()
    .insert(voiceNotes)
    .values(data)
    .returning({ id: voiceNotes.id });
  return id;
}

export async function findVoiceNotesByProject(projectId: number) {
  return getDb()
    .select()
    .from(voiceNotes)
    .where(eq(voiceNotes.projectId, projectId))
    .orderBy(desc(voiceNotes.createdAt));
}

export async function updateVoiceNoteStatus(
  voiceNoteId: number,
  status: VoiceNote["status"],
) {
  await getDb()
    .update(voiceNotes)
    .set({ status })
    .where(eq(voiceNotes.id, voiceNoteId));
}

// ------------------------------------------------------------- scenarios ----
export async function findScenariosByProject(projectId: number) {
  const rows = await getDb()
    .select()
    .from(scenarioProposals)
    .where(eq(scenarioProposals.projectId, projectId));
  return rows.sort((a, b) => a.ordre - b.ordre);
}

export async function replaceScenarios(
  projectId: number,
  proposals: Omit<InsertScenarioProposal, "projectId" | "status" | "sentAt">[],
) {
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx
      .delete(scenarioProposals)
      .where(eq(scenarioProposals.projectId, projectId));
    if (proposals.length > 0) {
      await tx.insert(scenarioProposals).values(
        proposals.map((p) => ({
          ...p,
          projectId,
          status: "pending" as const,
          sentAt: new Date(),
        })),
      );
    }
  });
}

export async function updateScenarioStatus(
  scenarioId: number,
  status: ScenarioProposal["status"],
  extra?: { chosenAt?: Date | null; clientComment?: string },
) {
  await getDb()
    .update(scenarioProposals)
    .set({ status, ...extra })
    .where(eq(scenarioProposals.id, scenarioId));
}

// ---------------------------------------------------------------- videos ----
export async function findVideosByProject(projectId: number) {
  const rows = await getDb()
    .select()
    .from(videoVersions)
    .where(eq(videoVersions.projectId, projectId));
  return rows.sort((a, b) => b.version - a.version);
}

export async function addVideoVersion(data: InsertVideoVersion) {
  const [{ id }] = await getDb()
    .insert(videoVersions)
    .values(data)
    .returning({ id: videoVersions.id });
  return id;
}

export async function updateVideoVersion(
  videoId: number,
  set: Partial<Pick<VideoVersion, "status" | "watermark" | "clientComment">>,
) {
  await getDb()
    .update(videoVersions)
    .set(set)
    .where(eq(videoVersions.id, videoId));
}

// -------------------------------------------------------------- messages ----
export async function findMessagesByProject(
  projectId: number,
  includeInternal: boolean,
) {
  const db = getDb();
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.projectId, projectId))
    .orderBy(desc(messages.createdAt));
  const filtered = includeInternal ? rows : rows.filter((m) => !m.internal);
  return filtered.sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
}

export async function addMessage(data: InsertMessage) {
  const [{ id }] = await getDb()
    .insert(messages)
    .values(data)
    .returning({ id: messages.id });
  return id;
}

export async function markThreadRead(projectId: number, fromRole: Message["senderRole"]) {
  await getDb()
    .update(messages)
    .set({ readAt: new Date() })
    .where(
      sql`${messages.projectId} = ${projectId} AND ${messages.senderRole} = ${fromRole} AND ${messages.readAt} IS NULL`,
    );
}

/** Boîte de réception admin : 1 entrée par projet avec dernier message + non lus. */
export async function findAdminInbox() {
  const db = getDb();
  const rows = await db.query.projects.findMany({
    orderBy: desc(projects.updatedAt),
    with: {
      user: true,
      messages: true,
    },
  });
  return rows
    .map((p) => {
      const msgs = p.messages.sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      );
      const last = msgs.at(-1);
      const unread = msgs.filter(
        (m) => m.senderRole === "customer" && !m.readAt,
      ).length;
      return {
        project: { id: p.id, slug: p.slug, status: p.status, createdAt: p.createdAt },
        user: p.user,
        lastMessage: last ?? null,
        unreadCount: unread,
        messageCount: msgs.length,
      };
    })
    .filter((t) => t.messageCount > 0)
    .sort(
      (a, b) =>
        (b.lastMessage?.createdAt.getTime() ?? 0) -
        (a.lastMessage?.createdAt.getTime() ?? 0),
    );
}

// ------------------------------------------------------------------ rsvp ----
export async function findRsvpConfig(projectId: number) {
  return getDb().query.rsvpConfig.findFirst({
    where: eq(rsvpConfig.projectId, projectId),
  });
}

export async function upsertRsvpConfig(
  projectId: number,
  questions: Record<string, unknown>,
  enabled: boolean,
) {
  await getDb()
    .insert(rsvpConfig)
    .values({ projectId, questions, enabled })
    .onConflictDoUpdate({
      target: rsvpConfig.projectId,
      set: { questions, enabled },
    });
}

export async function addRsvpResponse(data: InsertRsvpResponse) {
  const [{ id }] = await getDb()
    .insert(rsvpResponses)
    .values(data)
    .returning({ id: rsvpResponses.id });
  return id;
}

export async function findRsvpResponsesByProject(projectId: number) {
  return getDb()
    .select()
    .from(rsvpResponses)
    .where(eq(rsvpResponses.projectId, projectId))
    .orderBy(desc(rsvpResponses.createdAt));
}

export async function findRsvpStats() {
  const rows = await getDb()
    .select({
      projectId: rsvpResponses.projectId,
      attending: rsvpResponses.attending,
      count: sql<number>`count(*)`.as("count"),
      plusOnes: sql<number>`coalesce(sum(${rsvpResponses.plusOnes}), 0)`.as(
        "plusOnes",
      ),
    })
    .from(rsvpResponses)
    .groupBy(rsvpResponses.projectId, rsvpResponses.attending);
  return rows;
}

export type { RsvpResponse, ScenarioProposal, VideoVersion };
