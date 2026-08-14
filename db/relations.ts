import { relations } from "drizzle-orm";
import {
  users,
  orders,
  projects,
  questionnaires,
  voiceNotes,
  media,
  scenarioProposals,
  videoVersions,
  rsvpConfig,
  rsvpResponses,
  messages,
  notifications,
  auditEvents,
} from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  projects: many(projects),
  notifications: many(notifications),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  order: one(orders, { fields: [projects.orderId], references: [orders.id] }),
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  questionnaire: one(questionnaires, {
    fields: [projects.id],
    references: [questionnaires.projectId],
  }),
  voiceNotes: many(voiceNotes),
  media: many(media),
  scenarioProposals: many(scenarioProposals),
  videoVersions: many(videoVersions),
  rsvpConfig: one(rsvpConfig, {
    fields: [projects.id],
    references: [rsvpConfig.projectId],
  }),
  rsvpResponses: many(rsvpResponses),
  messages: many(messages),
  auditEvents: many(auditEvents),
}));

export const questionnairesRelations = relations(questionnaires, ({ one }) => ({
  project: one(projects, {
    fields: [questionnaires.projectId],
    references: [projects.id],
  }),
}));

export const voiceNotesRelations = relations(voiceNotes, ({ one }) => ({
  project: one(projects, {
    fields: [voiceNotes.projectId],
    references: [projects.id],
  }),
}));

export const mediaRelations = relations(media, ({ one }) => ({
  project: one(projects, { fields: [media.projectId], references: [projects.id] }),
}));

export const scenarioProposalsRelations = relations(
  scenarioProposals,
  ({ one }) => ({
    project: one(projects, {
      fields: [scenarioProposals.projectId],
      references: [projects.id],
    }),
  }),
);

export const videoVersionsRelations = relations(videoVersions, ({ one }) => ({
  project: one(projects, {
    fields: [videoVersions.projectId],
    references: [projects.id],
  }),
}));

export const rsvpConfigRelations = relations(rsvpConfig, ({ one }) => ({
  project: one(projects, {
    fields: [rsvpConfig.projectId],
    references: [projects.id],
  }),
}));

export const rsvpResponsesRelations = relations(rsvpResponses, ({ one }) => ({
  project: one(projects, {
    fields: [rsvpResponses.projectId],
    references: [projects.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  project: one(projects, {
    fields: [messages.projectId],
    references: [projects.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const auditEventsRelations = relations(auditEvents, ({ one }) => ({
  project: one(projects, {
    fields: [auditEvents.projectId],
    references: [projects.id],
  }),
}));
