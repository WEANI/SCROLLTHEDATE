import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminQuery, authedQuery, createRouter } from "./middleware";
import {
  addMedia,
  addVoiceNote,
  deleteMedia,
  findMediaByProject,
  findVoiceNotesByProject,
  updateMediaStatus,
  updateVoiceNoteStatus,
} from "./queries/domain";
import { actorOf, findCurrentProject, logAudit } from "./queries/helpers";
import { findProjectById } from "./queries/projects";

async function requireCurrentProject(userId: number) {
  const project = await findCurrentProject(userId);
  if (!project)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Aucun projet pour cet utilisateur",
    });
  return project;
}

export const mediaRouter = createRouter({
  // Métadonnées + URL (chemin public/ ou dataURI) — pas de S3 en V1.
  addMedia: authedQuery
    .input(
      z.object({
        type: z.enum(["photo", "video"]),
        url: z.string().min(1),
        filename: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await requireCurrentProject(ctx.user.id);
      const mediaId = await addMedia({
        projectId: project.id,
        type: input.type,
        url: input.url,
        filename: input.filename ?? null,
        status: "received",
      });
      await logAudit(project.id, actorOf(ctx.user), "media.uploaded", {
        mediaId,
        type: input.type,
        filename: input.filename,
      });
      return { mediaId };
    }),

  // Lecture : un client sans projet n'est pas une erreur (ex. juste après
  // signup, avant toute commande) — liste vide, comme projects.myProject.
  // requireCurrentProject (qui lève NOT_FOUND) reste réservé aux mutations
  // ci-dessus/dessous, où l'absence de projet est réellement anormale.
  listMine: authedQuery.query(async ({ ctx }) => {
    const project = await findCurrentProject(ctx.user.id);
    if (!project) return [];
    return findMediaByProject(project.id);
  }),

  deleteMine: authedQuery
    .input(z.object({ mediaId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const project = await requireCurrentProject(ctx.user.id);
      const removed = await deleteMedia(input.mediaId, project.id);
      if (!removed)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Média introuvable",
        });
      await logAudit(project.id, actorOf(ctx.user), "media.deleted", {
        mediaId: input.mediaId,
      });
      return { success: true };
    }),

  adminUpdateStatus: adminQuery
    .input(
      z.object({
        mediaId: z.number().int().positive(),
        status: z.enum(["received", "validated", "rejected"]),
      }),
    )
    .mutation(async ({ input }) => {
      await updateMediaStatus(input.mediaId, input.status);
      return { success: true };
    }),
});

export const voiceNotesRouter = createRouter({
  // dataURI audio base64 accepté en V1 (pas de stockage objet).
  save: authedQuery
    .input(
      z.object({
        url: z.string().min(1),
        durationSec: z.number().int().min(0).default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await requireCurrentProject(ctx.user.id);
      const voiceNoteId = await addVoiceNote({
        projectId: project.id,
        url: input.url,
        durationSec: input.durationSec,
        status: "received",
      });
      await logAudit(project.id, actorOf(ctx.user), "voice_note.received", {
        voiceNoteId,
        durationSec: input.durationSec,
      });
      return { voiceNoteId };
    }),

  list: authedQuery.query(async ({ ctx }) => {
    const project = await requireCurrentProject(ctx.user.id);
    return findVoiceNotesByProject(project.id);
  }),

  adminUpdateStatus: adminQuery
    .input(
      z.object({
        voiceNoteId: z.number().int().positive(),
        status: z.enum(["received", "processed", "archived"]),
      }),
    )
    .mutation(async ({ input }) => {
      await updateVoiceNoteStatus(input.voiceNoteId, input.status);
      return { success: true };
    }),

  adminListForProject: adminQuery
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const project = await findProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      return findVoiceNotesByProject(input.projectId);
    }),
});
