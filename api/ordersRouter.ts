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
import { actorOf, logAudit } from "./queries/helpers";
import { stripe, isStripeConfigured } from "./lib/stripe";

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
  // Crée un PaymentIntent Stripe RÉEL (mode test tant que STRIPE_SECRET_KEY
  // est une clé sk_test_) + une commande "pending" + le projet associé.
  // Le paiement n'est confirmé — commande → "paid", email de confirmation —
  // que par le webhook Stripe (api/webhooks/stripe.ts), jamais ici : cette
  // mutation ne fait que PRÉPARER le paiement, elle ne l'exécute pas.
  // `clientSecret` sert au frontend à monter Stripe Elements et à confirmer
  // le paiement directement avec Stripe, sans jamais faire transiter les
  // données de carte par nos serveurs.
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
      if (!isStripeConfigured() || !stripe) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Le paiement en ligne n'est pas encore configuré. Contactez-nous pour finaliser votre commande.",
        });
      }
      const { amountCents, options } = await computeAmount(
        input.product,
        input.optionIds,
      );

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: "eur",
        // automatic_payment_methods plutôt qu'un payment_method_types figé
        // en dur : les moyens de paiement activables évoluent depuis le
        // tableau de bord Stripe, sans redéploiement.
        automatic_payment_methods: { enabled: true },
        metadata: {
          userId: String(ctx.user.id),
          product: input.product,
          names: input.names ?? "",
        },
      });

      const orderId = await createOrder({
        userId: ctx.user.id,
        product: input.product,
        options,
        amountCents,
        paymentStatus: "pending",
        stripeRef: paymentIntent.id,
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
      await logAudit(projectId, actorOf(ctx.user), "order.created", {
        orderId,
        product: input.product,
        amountCents,
        options: input.optionIds,
      });
      await logAudit(projectId, "system", "project.created", { orderId });

      return {
        orderId,
        projectId,
        amountCents,
        clientSecret: paymentIntent.client_secret,
      };
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
