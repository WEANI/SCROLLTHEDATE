import { z } from "zod";
import {
  adminQuery,
  authedQuery,
  createRouter,
  publicQuery,
} from "./middleware";
import { adminOverview } from "./queries/analytics";
import {
  markAllNotificationsRead,
  markNotificationRead,
  findNotificationsByUser,
} from "./queries/analytics";
import { getSiteSetting, upsertSiteSetting } from "./queries/orders";
import { isEmailConfigured } from "./lib/email";
import { isStripeConfigured } from "./lib/stripe";
import { env } from "./lib/env";

export const analyticsRouter = createRouter({
  adminOverview: adminQuery
    .input(z.object({ days: z.number().int().min(1).max(365).default(30) }))
    .query(({ input }) => adminOverview(input.days)),
});

export const notificationsRouter = createRouter({
  listMine: authedQuery.query(({ ctx }) =>
    findNotificationsByUser(ctx.user.id),
  ),

  markRead: authedQuery
    .input(z.object({ notificationId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await markNotificationRead(input.notificationId, ctx.user.id);
      return { success: true };
    }),

  markAllRead: authedQuery.mutation(async ({ ctx }) => {
    await markAllNotificationsRead(ctx.user.id);
    return { success: true };
  }),
});

export const settingsRouter = createRouter({
  // Public : produits & prix (+ textes) pour les pages offres/checkout.
  get: publicQuery
    .input(
      z
        .object({ key: z.string().min(1).max(100).default("products") })
        .optional(),
    )
    .query(async ({ input }) => {
      const key = input?.key ?? "products";
      return { key, value: await getSiteSetting(key) };
    }),

  adminUpdate: adminQuery
    .input(
      z.object({
        key: z.string().min(1).max(100),
        value: z.unknown(),
      }),
    )
    .mutation(async ({ input }) => {
      await upsertSiteSetting(input.key, input.value);
      return { success: true };
    }),

  // État RÉEL de l'intégration email (Resend), pour la carte "Email
  // transactionnel" du panneau admin — cf. api/lib/email.ts. Remplace un
  // état auparavant codé en dur ("connecté", "domaine vérifié") qui ne
  // reflétait rien de réel : aucun service d'emailing n'existait.
  emailStatus: adminQuery.query(() => ({ configured: isEmailConfigured() })),

  // État RÉEL de l'intégration Stripe, pour la carte "Stripe" du panneau
  // admin — cf. api/lib/stripe.ts. Même correction que emailStatus
  // ci-dessus : remplace un statut "connecté" codé en dur qui s'affichait
  // que Stripe soit configuré ou non. `mode` distingue test/live à partir
  // du préfixe de la clé secrète (jamais renvoyée elle-même au client).
  stripeStatus: adminQuery.query(() => ({
    configured: isStripeConfigured(),
    mode: env.stripeSecretKey.startsWith("sk_live_")
      ? ("live" as const)
      : env.stripeSecretKey.startsWith("sk_test_")
        ? ("test" as const)
        : null,
  })),
});
