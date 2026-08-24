import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminQuery, authedQuery, createRouter } from "./middleware";
import {
  addVideoVersion,
  findVideosByProject,
  updateVideoVersion,
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
import { videoDeliveredEmail, adminAlertEmail } from "./lib/emailTemplates";
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

const timecodedComments = z
  .array(z.object({ timecode: z.string(), comment: z.string() }))
  .optional();

export const videosRouter = createRouter({
  // Lecture : un client sans projet n'est pas une erreur (ex. juste après
  // signup, avant toute commande) — liste vide, comme projects.myProject.
  listMine: authedQuery.query(async ({ ctx }) => {
    const project = await findCurrentProject(ctx.user.id);
    if (!project) return [];
    // Le client ne voit que les versions envoyées / approuvées / finales
    const versions = await findVideosByProject(project.id);
    return versions.filter((v) => v.status !== "draft");
  }),

  // Upload admin d'une version (filigrane par défaut tant que non approuvée).
  adminAddVersion: adminQuery
    .input(
      z.object({
        projectId: z.number().int().positive(),
        url: z.string().min(1),
        posterUrl: z.string().min(1).optional(),
        watermark: z.boolean().default(true),
        status: z.enum(["draft", "sent", "final"]).default("sent"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await findProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      const existing = await findVideosByProject(input.projectId);
      const version = (existing.at(0)?.version ?? 0) + 1;
      const videoId = await addVideoVersion({
        projectId: input.projectId,
        version,
        url: input.url,
        posterUrl: input.posterUrl,
        watermark: input.watermark,
        status: input.status,
      });
      if (input.status === "sent" && project.status === "PRODUCTION") {
        await updateProjectStatus(project.id, "REVIEW");
      }
      await logAudit(project.id, actorOf(ctx.user), "video.version_added", {
        videoId,
        version,
        watermark: input.watermark,
        status: input.status,
      });
      if (input.status === "sent") {
        await notifyUser(project.userId, "video.sent", {
          projectId: project.id,
          slug: project.slug,
          version,
        });
        const owner = await findUserById(project.userId);
        if (owner?.email) {
          await sendEmail(
            videoDeliveredEmail({
              to: owner.email,
              coupleNames: owner.name ?? "",
              slug: project.slug,
            }),
          );
        }
      }
      return { videoId, version };
    }),

  clientApprove: authedQuery
    .input(z.object({ videoId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const project = await requireCurrentProject(ctx.user.id);
      const videos = await findVideosByProject(project.id);
      const video = videos.find((v) => v.id === input.videoId);
      if (!video) throw new TRPCError({ code: "NOT_FOUND" });
      await updateVideoVersion(input.videoId, {
        status: "approved",
        watermark: false,
      });
      if (project.status === "REVIEW") {
        await updateProjectStatus(project.id, "DELIVERED");
      }
      await logAudit(project.id, actorOf(ctx.user), "video.approved", {
        videoId: input.videoId,
        version: video.version,
      });
      await notifyAdmins("video.approved", {
        projectId: project.id,
        slug: project.slug,
        version: video.version,
      });
      if (env.ownerEmail) {
        await sendEmail(
          adminAlertEmail({
            to: env.ownerEmail,
            title: "Vidéo approuvée par le client",
            detail: `Version ${video.version}`,
            projectSlug: project.slug,
          }),
        );
      }
      return { success: true };
    }),

  // Commentaire timecodé optionnel : [{ timecode, comment }]
  clientRequestChanges: authedQuery
    .input(
      z.object({
        videoId: z.number().int().positive(),
        comments: timecodedComments,
        message: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await requireCurrentProject(ctx.user.id);
      const videos = await findVideosByProject(project.id);
      const video = videos.find((v) => v.id === input.videoId);
      if (!video) throw new TRPCError({ code: "NOT_FOUND" });
      await updateVideoVersion(input.videoId, {
        clientComment: input.comments ?? null,
      });
      await logAudit(project.id, actorOf(ctx.user), "video.changes_requested", {
        videoId: input.videoId,
        version: video.version,
        comments: input.comments,
        message: input.message,
      });
      await notifyAdmins("video.changes_requested", {
        projectId: project.id,
        slug: project.slug,
        version: video.version,
        message: input.message,
      });
      if (env.ownerEmail) {
        await sendEmail(
          adminAlertEmail({
            to: env.ownerEmail,
            title: "Retouches vidéo demandées",
            detail: `Version ${video.version}${input.message ? ` — "${input.message}"` : ""}`,
            projectSlug: project.slug,
          }),
        );
      }
      return { success: true };
    }),
});
