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
});
