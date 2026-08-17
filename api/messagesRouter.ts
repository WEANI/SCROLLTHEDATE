import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminQuery, authedQuery, createRouter } from "./middleware";
import {
  addMessage,
  findAdminInbox,
  findMessagesByProject,
  markThreadRead,
} from "./queries/domain";
import {
  actorOf,
  findCurrentProject,
  logAudit,
  notifyAdmins,
  notifyUser,
} from "./queries/helpers";
import { findProjectById } from "./queries/projects";

const attachmentsSchema = z
  .array(
    z.object({
      url: z.string(),
      filename: z.string().optional(),
      mimeType: z.string().optional(),
    }),
  )
  .optional();

/** Résout le projet cible : client → son projet courant ; admin → projectId requis. */
async function resolveProject(
  user: { id: number; role: string },
  projectId?: number,
) {
  if (user.role === "admin") {
    if (!projectId)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "projectId requis pour un admin",
      });
    const project = await findProjectById(projectId);
    if (!project) throw new TRPCError({ code: "NOT_FOUND" });
    return project;
  }
  const project = await findCurrentProject(user.id);
  if (!project)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Aucun projet pour cet utilisateur",
    });
  return project;
}

export const messagesRouter = createRouter({
  listThread: authedQuery
    .input(z.object({ projectId: z.number().int().positive().optional() }))
    .query(async ({ ctx, input }) => {
      // Lecture côté client : pas de projet n'est pas une erreur (ex. juste
      // après signup, avant toute commande) — fil vide, comme
      // projects.myProject. resolveProject (qui lève NOT_FOUND/BAD_REQUEST)
      // reste utilisé pour l'admin, où projectId est requis, et pour send().
      if (ctx.user.role !== "admin") {
        const project = await findCurrentProject(ctx.user.id);
        if (!project) return [];
        return findMessagesByProject(project.id, false);
      }
      const project = await resolveProject(ctx.user, input.projectId);
      return findMessagesByProject(project.id, true);
    }),

  send: authedQuery
    .input(
      z.object({
        projectId: z.number().int().positive().optional(),
        body: z.string().min(1),
        attachments: attachmentsSchema,
        internal: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await resolveProject(ctx.user, input.projectId);
      const isAdmin = ctx.user.role === "admin";
      const internal = isAdmin && input.internal; // notes internes réservées admin
      const messageId = await addMessage({
        projectId: project.id,
        senderRole: isAdmin ? "admin" : "customer",
        body: input.body,
        attachments: input.attachments ?? null,
        internal,
      });
      if (!internal) {
        await logAudit(
          project.id,
          actorOf(ctx.user),
          isAdmin ? "message.admin_sent" : "message.customer_sent",
          { messageId },
        );
        if (isAdmin) {
          await notifyUser(project.userId, "message.received", {
            projectId: project.id,
            slug: project.slug,
          });
        } else {
          await notifyAdmins("message.received", {
            projectId: project.id,
            slug: project.slug,
          });
        }
      }
      return { messageId };
    }),

  // Marque comme lus les messages de l'autre rôle du fil.
  markRead: authedQuery
    .input(z.object({ projectId: z.number().int().positive().optional() }))
    .mutation(async ({ ctx, input }) => {
      const project = await resolveProject(ctx.user, input.projectId);
      await markThreadRead(
        project.id,
        ctx.user.role === "admin" ? "customer" : "admin",
      );
      return { success: true };
    }),

  adminInbox: adminQuery.query(() => findAdminInbox()),
});
