import { authRouter } from "./auth-router";
import { createRouter, publicQuery } from "./middleware";
import { ordersRouter } from "./ordersRouter";
import { projectsRouter } from "./projectsRouter";
import { questionnaireRouter } from "./questionnaireRouter";
import { mediaRouter, voiceNotesRouter } from "./mediaRouter";
import { scenariosRouter } from "./scenariosRouter";
import { videosRouter } from "./videosRouter";
import { messagesRouter } from "./messagesRouter";
import { rsvpRouter } from "./rsvpRouter";
import {
  analyticsRouter,
  notificationsRouter,
  settingsRouter,
} from "./miscRouters";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  orders: ordersRouter,
  projects: projectsRouter,
  questionnaire: questionnaireRouter,
  media: mediaRouter,
  voiceNotes: voiceNotesRouter,
  scenarios: scenariosRouter,
  videos: videosRouter,
  messages: messagesRouter,
  rsvp: rsvpRouter,
  analytics: analyticsRouter,
  notifications: notificationsRouter,
  settings: settingsRouter,
});

export type AppRouter = typeof appRouter;
