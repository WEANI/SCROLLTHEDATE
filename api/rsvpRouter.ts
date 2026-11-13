import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  adminQuery,
  authedQuery,
  createRouter,
  publicQuery,
} from "./middleware";
import {
  addRsvpResponse,
  findRsvpConfig,
  findRsvpResponsesByProject,
  findRsvpStats,
  upsertRsvpConfig,
} from "./queries/domain";
import { actorOf, findProjectForUser, logAudit } from "./queries/helpers";
import { findProjectBySlug } from "./queries/projects";
import { allowRequest, clientIp } from "./lib/rateLimit";

export const rsvpRouter = createRouter({
  // Données publiques du faire-part (par slug) — sans auth.
  getPublic: publicQuery
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ input }) => {
      const project = await findProjectBySlug(input.slug);
      if (!project || project.status !== "DELIVERED")
        throw new TRPCError({ code: "NOT_FOUND" });
      const answers =
        (project.questionnaire?.answers as Record<string, unknown> | null) ??
        {};
      return {
        slug: project.slug,
        template: project.template,
        weddingDate: project.weddingDate,
        venue: project.venue,
        names: (answers["couple.prenoms"] as string | undefined) ?? null,
        answers, // contenu éditorial du faire-part (questions "affiché sur le faire-part")
        rsvp: project.rsvpConfig
          ? {
              enabled: project.rsvpConfig.enabled,
              questions: project.rsvpConfig.questions,
            }
          : { enabled: false, questions: null },
      };
    }),

  // Soumission publique (invité, sans compte).
  submit: publicQuery
    .input(
      z.object({
        slug: z.string().min(1).max(200),
        guestName: z.string().trim().min(1).max(255),
        email: z.string().email().max(320).optional(),
        attending: z.enum(["yes", "no", "maybe"]),
        // Nombre exact d'adultes (l'invité principal inclus) et d'enfants
        // qui l'accompagnent, saisi dans RsvpForm (PayloadSection.tsx).
        // `plusOnes` reste calculé ici (adults - 1 + children) pour ne rien
        // casser des lectures existantes (stats admin, espace/Commandes.tsx).
        adults: z.number().int().min(0).max(20).default(1),
        children: z.number().int().min(0).max(20).default(0),
        allergies: z.string().max(2000).optional(),
        song: z.string().max(500).optional(),
        message: z.string().max(5000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Formulaire public sans compte : freine les envois automatisés en masse
      // (cf. api/lib/rateLimit.ts). 20 réponses / 10 min / IP couvre une
      // famille qui répond depuis le même wifi.
      if (!allowRequest(`rsvp:${clientIp(ctx.req.headers)}`, 20, 10 * 60_000)) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Trop de réponses envoyées. Patientez quelques minutes avant de réessayer.",
        });
      }
      const project = await findProjectBySlug(input.slug);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      if (project.rsvpConfig && !project.rsvpConfig.enabled)
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Les RSVP sont fermés pour ce faire-part",
        });
      const plusOnes = Math.max(0, input.adults - 1) + input.children;
      const responseId = await addRsvpResponse({
        projectId: project.id,
        guestName: input.guestName,
        email: input.email ?? null,
        attending: input.attending,
        adults: input.adults,
        children: input.children,
        plusOnes,
        allergies: input.allergies ?? null,
        song: input.song ?? null,
        message: input.message ?? null,
      });
      await logAudit(project.id, `guest:${input.guestName}`, "rsvp.submitted", {
        attending: input.attending,
        adults: input.adults,
        children: input.children,
      });
      return { responseId };
    }),

  // Liste des réponses du faire-part du client connecté. Lecture : un client
  // sans projet n'est pas une erreur (ex. juste après signup, avant toute
  // commande) — réponses vides, comme projects.myProject.
  listMine: authedQuery
    .input(z.object({ projectId: z.number().int().positive().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const project = await findProjectForUser(ctx.user.id, input?.projectId);
      if (!project) return { config: null, responses: [] };
      const responses = await findRsvpResponsesByProject(project.id);
      const config = await findRsvpConfig(project.id);
      return { config: config ?? null, responses };
    }),

  // Config RSVP du projet courant (client) — utilisé par le questionnaire étape 3.
  saveConfig: authedQuery
    .input(
      z.object({
        projectId: z.number().int().positive().optional(),
        enabled: z.boolean(),
        questions: z.record(z.string(), z.unknown()).default({}),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await findProjectForUser(ctx.user.id, input.projectId);
      if (!project)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Aucun projet pour cet utilisateur",
        });
      await upsertRsvpConfig(project.id, input.questions, input.enabled);
      await logAudit(project.id, actorOf(ctx.user), "rsvp.config_saved", {
        enabled: input.enabled,
      });
      return { success: true };
    }),

  // Stats RSVP pour l'analytique admin (par projet × statut).
  stats: adminQuery.query(() => findRsvpStats()),
});
