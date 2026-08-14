import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../api/router";

// ---------------------------------------------------------------------------
// Types inférés du routeur tRPC (source de vérité : api/*Router.ts)
// ---------------------------------------------------------------------------
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type AdminProject = RouterOutputs["projects"]["adminList"][number];
export type Project360 = RouterOutputs["projects"]["adminGet"];
export type AdminOrder = RouterOutputs["orders"]["adminList"][number];
export type AdminOverview = RouterOutputs["analytics"]["adminOverview"];
export type InboxThread = RouterOutputs["messages"]["adminInbox"][number];
export type AppNotification = RouterOutputs["notifications"]["listMine"][number];

export type ProjectStatus = AdminProject["status"];

// ---------------------------------------------------------------------------
// Statuts du pipeline
// ---------------------------------------------------------------------------
export const PIPELINE: { status: ProjectStatus; label: string; accent?: boolean }[] = [
  { status: "ONBOARDING", label: "Nouveau" },
  { status: "QUESTIONNAIRE", label: "Questionnaire" },
  { status: "SCENARIOS", label: "Scénarios" },
  { status: "PRODUCTION", label: "Production" },
  { status: "REVIEW", label: "Validation filigrane", accent: true },
  { status: "DELIVERED", label: "Livré" },
];

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  ONBOARDING: "Nouveau",
  QUESTIONNAIRE: "Questionnaire",
  SCENARIOS: "Scénarios",
  PRODUCTION: "Production",
  REVIEW: "Validation filigrane",
  DELIVERED: "Livré",
};

export const STATUS_BADGE_CLASS: Record<ProjectStatus, string> = {
  ONBOARDING: "bg-info/15 text-info",
  QUESTIONNAIRE: "bg-pending/15 text-pending",
  SCENARIOS: "bg-pending/15 text-pending",
  PRODUCTION: "bg-terracotta-500/15 text-terracotta-500",
  REVIEW: "bg-terracotta-500/15 text-terracotta-500",
  DELIVERED: "bg-success/15 text-success",
};

// ---------------------------------------------------------------------------
// Formats
// ---------------------------------------------------------------------------
export function orderRef(id: number) {
  return `FL-2026-${String(id).padStart(4, "0")}`;
}

export function formatEuro(cents: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(d));
}

export function formatDateTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
}

export function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function daysSince(d: Date | string | null | undefined) {
  if (!d) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000));
}

export function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** Noms du couple dérivés du slug ("anna-theo-x1y2z3" → "Anna & Théo"). */
export function coupleNamesFromSlug(slug: string) {
  const parts = slug.split("-");
  // Le suffixe nanoid (6 chars) termine le slug
  const last = parts.at(-1);
  const names = last && /^[a-z0-9]{6}$/.test(last) ? parts.slice(0, -1) : parts;
  return names.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ") || slug;
}

export function productLabel(product: AdminOrder["product"]) {
  return product === "FAIRE_PART" ? "Faire-part" : "Save the Date";
}

export function pctDelta(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/** Nombre de messages clients non lus sur un projet de la liste admin. */
export function unreadMessages(project: AdminProject) {
  return project.messages.filter((m) => m.senderRole === "customer" && !m.readAt).length;
}
