import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { adminQuery, authedQuery, createRouter } from "./middleware";
import {
  computeAmount,
  createOrder,
  createProject,
  findAllOrders,
  findOrderById,
  findOrdersByUser,
  updateOrderPaymentStatus,
} from "./queries/orders";
import { actorOf, logAudit, notifyUser } from "./queries/helpers";
import { sendEmail } from "./lib/email";
import { orderConfirmationEmail } from "./lib/emailTemplates";

/** Même format que formatOrderNumber côté client (src/components/commerce/pricing.ts) — dupliqué à dessein plutôt qu'importé : ce fichier reste pur frontend. */
function formatOrderNumber(orderId: number, date: Date): string {
  return `FL-${date.getFullYear()}-${String(orderId).padStart(4, "0")}`;
}

export const productEnum = z.enum(["FAIRE_PART", "SAVE_THE_DATE"]);
export const projectStatusEnum = z.enum([
  "ONBOARDING",
  "QUESTIONNAIRE",
  "SCENARIOS",
  "PRODUCTION",
  "REVIEW",
  "DELIVERED",
]);
export const templateEnum = z.enum(["editorial", "cinema", "minimal"]);

function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export const ordersRouter = createRouter({
  // Simule un paiement réussi : commande paid + projet ONBOARDING + audit.
  createCheckout: authedQuery
    .input(
      z.object({
        product: productEnum,
        optionIds: z.array(z.string()).default([]),
        names: z.string().max(255).optional(), // ex. "Anna & Théo"
        weddingDate: z.coerce.date().optional(),
        venue: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { amountCents, options } = await computeAmount(
        input.product,
        input.optionIds,
      );
      const orderId = await createOrder({
        userId: ctx.user.id,
        product: input.product,
        options,
        amountCents,
        paymentStatus: "paid",
        stripeRef: `test_${nanoid(16)}`, // paiement simulé (pas de vrai Stripe)
      });
      const slugBase = slugify(input.names ?? ctx.user.name ?? "projet") || "projet";
      const projectId = await createProject({
        orderId,
        userId: ctx.user.id,
        status: "ONBOARDING",
        slug: `${slugBase}-${nanoid(6).toLowerCase()}`,
        weddingDate: input.weddingDate ?? null,
        venue: input.venue ?? null,
        progress: 5,
      });
      await logAudit(projectId, actorOf(ctx.user), "order.paid", {
        orderId,
        product: input.product,
        amountCents,
        options: input.optionIds,
      });
      await logAudit(projectId, "system", "project.created", { orderId });
      await notifyUser(ctx.user.id, "order.confirmed", { orderId, projectId });
      // Ne bloque jamais la commande : sendEmail ne lève jamais (cf.
      // api/lib/email.ts) et ce await ne fait qu'attendre son retour, pas
      // relancer une erreur. Pas de "lien pour créer votre espace" ici — le
      // compte existe déjà (authedQuery : la commande exige d'être connecté).
      if (ctx.user.email) {
        await sendEmail(
          orderConfirmationEmail({
            to: ctx.user.email,
            coupleNames: input.names ?? "",
            orderRef: formatOrderNumber(orderId, new Date()),
            amountCents,
          }),
        );
      }
      return { orderId, projectId, amountCents };
    }),

  myOrders: authedQuery.query(({ ctx }) => findOrdersByUser(ctx.user.id)),

  adminList: adminQuery.query(() => findAllOrders()),

  adminUpdateStatus: adminQuery
    .input(
      z.object({
        orderId: z.number().int().positive(),
        paymentStatus: z.enum(["pending", "paid", "failed", "refunded"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const order = await findOrderById(input.orderId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });
      await updateOrderPaymentStatus(input.orderId, input.paymentStatus);
      for (const project of order.projects) {
        await logAudit(
          project.id,
          actorOf(ctx.user),
          "order.payment_status_changed",
          { orderId: input.orderId, paymentStatus: input.paymentStatus },
        );
      }
      return { success: true };
    }),
});
