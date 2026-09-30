import { z } from "zod";
import { adminQuery, authedQuery, createRouter, publicQuery } from "./middleware";
import {
  deviceOf,
  findGlobalViewStats,
  findProjectViewStats,
  hourBucketOf,
  recordInviteView,
  referrerHostOf,
  visitorFingerprint,
} from "./queries/inviteViews";
import { findProjectBySlug } from "./queries/projects";
import { findProjectForUser } from "./queries/helpers";

/**
 * Ouvertures des pages publiques — cf. doc de `inviteViews` (db/schema.ts)
 * et de api/queries/inviteViews.ts pour le parti pris de confidentialité
 * (aucun cookie, sel qui tourne chaque jour).
 */
export const viewsRouter = createRouter({
  /**
   * Enregistre une ouverture. Appelé par la page publique au chargement.
   * Volontairement silencieux : une statistique ne doit JAMAIS empêcher un
   * invité de voir le faire-part, donc toute erreur est avalée.
   */
  record: publicQuery
    .input(z.object({ slug: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const project = await findProjectBySlug(input.slug);
        if (!project || project.status !== "DELIVERED") return { ok: false };

        const h = ctx.req.headers;
        // IP réelle derrière le proxy Railway ; repli sur une chaîne vide —
        // l'empreinte reste valable, simplement moins discriminante.
        const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "";
        const ua = h.get("user-agent") ?? "";
        const selfHost = (() => {
          try {
            return new URL(ctx.req.url).hostname;
          } catch {
            return null;
          }
        })();

        await recordInviteView({
          projectId: project.id,
          visitorHash: visitorFingerprint(ip, ua),
          hourBucket: hourBucketOf(),
          referrerHost: referrerHostOf(h.get("referer"), selfHost),
          device: deviceOf(ua),
        });
        return { ok: true };
      } catch {
        return { ok: false };
      }
    }),

  /** Statistiques d'ouverture d'UN projet du client connecté (espace client). */
  myProjectViews: authedQuery
    .input(z.object({ projectId: z.number().int().positive().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const project = await findProjectForUser(ctx.user.id, input?.projectId);
      if (!project) return null;
      return findProjectViewStats(project.id);
    }),

  /** Vue d'ensemble admin, tous projets confondus. */
  adminOverview: adminQuery
    .input(z.object({ days: z.number().int().min(7).max(365).default(90) }).optional())
    .query(async ({ input }) => findGlobalViewStats(input?.days ?? 90)),
});
