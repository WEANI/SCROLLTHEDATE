import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { adminQuery, authedQuery, createRouter, publicQuery } from "./middleware";
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
import { createGuestUser, findUserByEmail } from "./queries/users";
import { stripe, isStripeConfigured } from "./lib/stripe";
import { allowRequest, clientIp } from "./lib/rateLimit";

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
  createCheckout: publicQuery
    .input(
      z.object({
        product: productEnum,
        optionIds: z.array(z.string()).default([]),
        names: z.string().max(255).optional(), // ex. "Anna & Théo"
        weddingDate: z.coerce.date().optional(),
        venue: z.string().max(500).optional(),
        // Obligatoire pour un acheteur non connecté (checkout invité) :
        // c'est l'adresse à laquelle le compte sera créé après paiement.
        // Ignoré si l'appelant est déjà authentifié — son compte fait foi.
        email: z.string().email().max(320).optional(),
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

      // Procédure publique depuis le passage au checkout invité : sans compte
      // obligatoire, plus rien n'empêchait d'enchaîner les PaymentIntents.
      if (!allowRequest(`checkout:${clientIp(ctx.req.headers)}`, 10, 60_000)) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Trop de tentatives. Patientez une minute avant de réessayer.",
        });
      }

      // Utilisateur de la commande : le compte connecté, ou une ligne `users`
      // créée à la volée pour l'invité (sans compte Supabase Auth — celui-ci
      // n'est créé qu'après paiement confirmé, cf. webhooks/stripe.ts).
      let user = ctx.user;
      let createdGuest = false;
      if (!user) {
        const email = input.email?.trim().toLowerCase();
        if (!email) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Une adresse email est nécessaire pour finaliser la commande.",
          });
        }
        const existing = await findUserByEmail(email);
        if (existing?.authUserId) {
          // Un vrai compte existe déjà pour cette adresse : laisser commander
          // en invité reviendrait à offrir l'accès à l'espace d'autrui à
          // quiconque connaît son email.
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "Un compte existe déjà avec cette adresse. Connectez-vous pour finaliser votre commande.",
          });
        }
        // `existing` sans authUserId = invité déjà passé par ici (paiement
        // abandonné, puis nouvelle tentative) : on réutilise sa ligne.
        user = existing ?? (await createGuestUser({ email, name: input.names ?? null }));
        createdGuest = !existing;
      }

      const { amountCents, options } = await computeAmount(
        input.product,
        input.optionIds,
      );

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: "eur",
        // Carte uniquement : `automatic_payment_methods: { enabled: true }`
        // faisait apparaître tous les moyens de paiement activés sur le
        // compte Stripe (Klarna, Bancontact, Amazon Pay, MB WAY…), avec
        // Klarna pré-sélectionné par défaut au lieu de la carte — jamais
        // voulu pour ce produit. Si un autre moyen de paiement est
        // souhaité un jour, l'ajouter explicitement ici plutôt que de
        // rouvrir la liste automatique.
        payment_method_types: ["card"],
        metadata: {
          userId: String(user.id),
          product: input.product,
          names: input.names ?? "",
        },
      });

      const orderId = await createOrder({
        userId: user.id,
        product: input.product,
        options,
        amountCents,
        paymentStatus: "pending",
        stripeRef: paymentIntent.id,
      });
      const slugBase = slugify(input.names ?? user.name ?? "projet") || "projet";
      const projectId = await createProject({
        orderId,
        userId: user.id,
        status: "ONBOARDING",
        slug: `${slugBase}-${nanoid(6).toLowerCase()}`,
        weddingDate: input.weddingDate ?? null,
        venue: input.venue ?? null,
        progress: 5,
      });
      if (createdGuest) {
        await logAudit(projectId, "system", "user.guest_created", {
          userId: user.id,
        });
      }
      await logAudit(projectId, actorOf(user), "order.created", {
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
