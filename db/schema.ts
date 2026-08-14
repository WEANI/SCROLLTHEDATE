import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  pgPolicy,
  bigserial,
  bigint,
  integer,
  varchar,
  text,
  jsonb,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Policy standard : accès total pour service_role (le backend applicatif se
// connecte avec ce rôle et bypass RLS nativement chez Supabase — cette policy
// documente juste l'intention). Aucune policy pour anon/authenticated tant
// que l'app n'utilise pas Supabase Auth : RLS bloque leur accès par défaut.
// Voir aussi db/schema.ts → chaque table `.enableRLS()`.
const serviceRoleFullAccess = () =>
  pgPolicy("service_role full access", {
    as: "permissive",
    to: "service_role",
    for: "all",
    using: sql`true`,
    withCheck: sql`true`,
  });

// ---------------------------------------------------------------------------
// Enums Postgres — noms et valeurs alignés sur les `create type ... as enum`
// appliqués côté Supabase (migration felicity_schema_init).
// ---------------------------------------------------------------------------
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const orderProductEnum = pgEnum("order_product", [
  "FAIRE_PART",
  "SAVE_THE_DATE",
]);
export const orderPaymentStatusEnum = pgEnum("order_payment_status", [
  "pending",
  "paid",
  "failed",
  "refunded",
]);
export const projectStatusEnum = pgEnum("project_status", [
  "ONBOARDING",
  "QUESTIONNAIRE",
  "SCENARIOS",
  "PRODUCTION",
  "REVIEW",
  "DELIVERED",
]);
export const projectTemplateEnum = pgEnum("project_template", [
  "editorial",
  "cinema",
  "minimal",
]);
export const voiceNoteStatusEnum = pgEnum("voice_note_status", [
  "received",
  "processed",
  "archived",
]);
export const mediaTypeEnum = pgEnum("media_type", ["photo", "video"]);
export const mediaStatusEnum = pgEnum("media_status", [
  "received",
  "validated",
  "rejected",
]);
export const scenarioProposalStatusEnum = pgEnum("scenario_proposal_status", [
  "pending",
  "chosen",
  "changes_requested",
]);
export const videoVersionStatusEnum = pgEnum("video_version_status", [
  "draft",
  "sent",
  "approved",
  "final",
]);
export const rsvpAttendingEnum = pgEnum("rsvp_attending", [
  "yes",
  "no",
  "maybe",
]);
export const messageSenderRoleEnum = pgEnum("message_sender_role", [
  "customer",
  "admin",
]);

export const users = pgTable(
  "users",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    unionId: varchar("unionId", { length: 255 }).notNull().unique(),
    name: varchar("name", { length: 255 }),
    email: varchar("email", { length: 320 }),
    avatar: text("avatar"),
    role: userRoleEnum("role").default("user").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    lastSignInAt: timestamp("lastSignInAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  () => ({
    servicePolicy: serviceRoleFullAccess(),
  }),
).enableRLS();

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ---------------------------------------------------------------------------
// Félicity — modèle métier (design.md §7)
// FK vers PK bigserial → bigint("col", { mode: "number" })
// ---------------------------------------------------------------------------

export const orders = pgTable(
  "orders",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: bigint("userId", { mode: "number" })
      .notNull()
      .references(() => users.id),
    product: orderProductEnum("product").notNull(),
    // Options choisies au checkout : [{ id, label, priceCents }]
    options: jsonb("options"),
    amountCents: integer("amountCents").notNull(),
    paymentStatus: orderPaymentStatusEnum("paymentStatus")
      .default("pending")
      .notNull(),
    stripeRef: varchar("stripeRef", { length: 255 }),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index("orders_user_idx").on(table.userId),
    servicePolicy: serviceRoleFullAccess(),
  }),
).enableRLS();

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

export const projects = pgTable(
  "projects",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    orderId: bigint("orderId", { mode: "number" })
      .notNull()
      .references(() => orders.id),
    userId: bigint("userId", { mode: "number" })
      .notNull()
      .references(() => users.id),
    status: projectStatusEnum("status").default("ONBOARDING").notNull(),
    weddingDate: timestamp("weddingDate", { withTimezone: true }),
    venue: varchar("venue", { length: 500 }),
    progress: integer("progress").default(0).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    template: projectTemplateEnum("template").default("editorial").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdx: index("projects_user_idx").on(table.userId),
    statusIdx: index("projects_status_idx").on(table.status),
    slugIdx: uniqueIndex("projects_slug_idx").on(table.slug),
    servicePolicy: serviceRoleFullAccess(),
  }),
).enableRLS();

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

export const questionnaires = pgTable(
  "questionnaires",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    projectId: bigint("projectId", { mode: "number" })
      .notNull()
      .references(() => projects.id),
    // Réponses indexées par id de question : { [questionId]: value }
    answers: jsonb("answers"),
    completionPct: integer("completionPct").default(0).notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    projectIdx: uniqueIndex("questionnaires_project_idx").on(table.projectId),
    servicePolicy: serviceRoleFullAccess(),
  }),
).enableRLS();

export type Questionnaire = typeof questionnaires.$inferSelect;
export type InsertQuestionnaire = typeof questionnaires.$inferInsert;

export const voiceNotes = pgTable(
  "voice_notes",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    projectId: bigint("projectId", { mode: "number" })
      .notNull()
      .references(() => projects.id),
    url: text("url").notNull(),
    durationSec: integer("durationSec").default(0).notNull(),
    status: voiceNoteStatusEnum("status").default("received").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    projectIdx: index("voice_notes_project_idx").on(table.projectId),
    servicePolicy: serviceRoleFullAccess(),
  }),
).enableRLS();

export type VoiceNote = typeof voiceNotes.$inferSelect;
export type InsertVoiceNote = typeof voiceNotes.$inferInsert;

export const media = pgTable(
  "media",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    projectId: bigint("projectId", { mode: "number" })
      .notNull()
      .references(() => projects.id),
    type: mediaTypeEnum("type").notNull(),
    url: text("url").notNull(),
    filename: varchar("filename", { length: 500 }),
    status: mediaStatusEnum("status").default("received").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    projectIdx: index("media_project_idx").on(table.projectId),
    servicePolicy: serviceRoleFullAccess(),
  }),
).enableRLS();

export type Media = typeof media.$inferSelect;
export type InsertMedia = typeof media.$inferInsert;

export const scenarioProposals = pgTable(
  "scenario_proposals",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    projectId: bigint("projectId", { mode: "number" })
      .notNull()
      .references(() => projects.id),
    ordre: integer("ordre").notNull(), // 1..3
    title: varchar("title", { length: 255 }).notNull(),
    summary: text("summary"),
    // Moodboard : [{ url, caption? }] + meta (durée estimée, tags ambiance)
    moodboard: jsonb("moodboard"),
    status: scenarioProposalStatusEnum("status")
      .default("pending")
      .notNull(),
    sentAt: timestamp("sentAt", { withTimezone: true }),
    chosenAt: timestamp("chosenAt", { withTimezone: true }),
    clientComment: text("clientComment"),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    projectIdx: index("scenario_proposals_project_idx").on(table.projectId),
    servicePolicy: serviceRoleFullAccess(),
  }),
).enableRLS();

export type ScenarioProposal = typeof scenarioProposals.$inferSelect;
export type InsertScenarioProposal = typeof scenarioProposals.$inferInsert;

export const videoVersions = pgTable(
  "video_versions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    projectId: bigint("projectId", { mode: "number" })
      .notNull()
      .references(() => projects.id),
    version: integer("version").notNull(),
    url: text("url").notNull(),
    watermark: boolean("watermark").default(true).notNull(),
    status: videoVersionStatusEnum("status").default("draft").notNull(),
    // Commentaire timecodé du client : [{ timecode, comment }]
    clientComment: jsonb("clientComment"),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    projectIdx: index("video_versions_project_idx").on(table.projectId),
    servicePolicy: serviceRoleFullAccess(),
  }),
).enableRLS();

export type VideoVersion = typeof videoVersions.$inferSelect;
export type InsertVideoVersion = typeof videoVersions.$inferInsert;

export const rsvpConfig = pgTable(
  "rsvp_config",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    projectId: bigint("projectId", { mode: "number" })
      .notNull()
      .references(() => projects.id),
    // { deadline?, askPlusOnes, askAllergies, askSong, askMessage }
    questions: jsonb("questions"),
    enabled: boolean("enabled").default(false).notNull(),
  },
  (table) => ({
    projectIdx: uniqueIndex("rsvp_config_project_idx").on(table.projectId),
    servicePolicy: serviceRoleFullAccess(),
  }),
).enableRLS();

export type RsvpConfig = typeof rsvpConfig.$inferSelect;
export type InsertRsvpConfig = typeof rsvpConfig.$inferInsert;

export const rsvpResponses = pgTable(
  "rsvp_responses",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    projectId: bigint("projectId", { mode: "number" })
      .notNull()
      .references(() => projects.id),
    guestName: varchar("guestName", { length: 255 }).notNull(),
    email: varchar("email", { length: 320 }),
    attending: rsvpAttendingEnum("attending").notNull(),
    plusOnes: integer("plusOnes").default(0).notNull(),
    allergies: text("allergies"),
    song: varchar("song", { length: 500 }),
    message: text("message"),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    projectIdx: index("rsvp_responses_project_idx").on(table.projectId),
    servicePolicy: serviceRoleFullAccess(),
  }),
).enableRLS();

export type RsvpResponse = typeof rsvpResponses.$inferSelect;
export type InsertRsvpResponse = typeof rsvpResponses.$inferInsert;

export const messages = pgTable(
  "messages",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    projectId: bigint("projectId", { mode: "number" })
      .notNull()
      .references(() => projects.id),
    senderRole: messageSenderRoleEnum("senderRole").notNull(),
    body: text("body").notNull(),
    // Pièces jointes : [{ url, filename, mimeType? }]
    attachments: jsonb("attachments"),
    // Note interne admin — jamais visible côté client
    internal: boolean("internal").default(false).notNull(),
    readAt: timestamp("readAt", { withTimezone: true }),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    projectIdx: index("messages_project_idx").on(table.projectId),
    servicePolicy: serviceRoleFullAccess(),
  }),
).enableRLS();

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

export const notifications = pgTable(
  "notifications",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: bigint("userId", { mode: "number" })
      .notNull()
      .references(() => users.id),
    type: varchar("type", { length: 100 }).notNull(),
    payload: jsonb("payload"),
    readAt: timestamp("readAt", { withTimezone: true }),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index("notifications_user_idx").on(table.userId),
    servicePolicy: serviceRoleFullAccess(),
  }),
).enableRLS();

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

export const auditEvents = pgTable(
  "audit_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    projectId: bigint("projectId", { mode: "number" })
      .notNull()
      .references(() => projects.id),
    actor: varchar("actor", { length: 255 }).notNull(), // ex. "customer:12", "admin:3", "system"
    action: varchar("action", { length: 255 }).notNull(),
    meta: jsonb("meta"),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    projectIdx: index("audit_events_project_idx").on(table.projectId),
    servicePolicy: serviceRoleFullAccess(),
  }),
).enableRLS();

export type AuditEvent = typeof auditEvents.$inferSelect;
export type InsertAuditEvent = typeof auditEvents.$inferInsert;

// Templates de questionnaire éditables par l'admin
export const formTemplates = pgTable(
  "form_templates",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    // [{ id, step, type, label, placeholder?, help?, required, showOnInvite }]
    questions: jsonb("questions").notNull(),
    active: boolean("active").default(false).notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  () => ({
    servicePolicy: serviceRoleFullAccess(),
  }),
).enableRLS();

export type FormTemplate = typeof formTemplates.$inferSelect;
export type InsertFormTemplate = typeof formTemplates.$inferInsert;

// Configuration du site : produits & prix, textes, intégrations
export const siteSettings = pgTable(
  "site_settings",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    key: varchar("key", { length: 100 }).notNull().unique(),
    value: jsonb("value"),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  () => ({
    servicePolicy: serviceRoleFullAccess(),
  }),
).enableRLS();

export type SiteSetting = typeof siteSettings.$inferSelect;
export type InsertSiteSetting = typeof siteSettings.$inferInsert;
