// Types partagés des pages admin-suite (miroir des réponses des routers tRPC).

export type ProjectStatus =
  | "ONBOARDING"
  | "QUESTIONNAIRE"
  | "SCENARIOS"
  | "PRODUCTION"
  | "REVIEW"
  | "DELIVERED";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export type ProductId = "FAIRE_PART" | "SAVE_THE_DATE";

export interface AdminUser {
  id: number;
  name: string | null;
  email: string | null;
  role: "user" | "admin";
  createdAt: string | Date;
  lastSignInAt?: string | Date;
}

export interface AdminOrder {
  id: number;
  userId: number;
  product: ProductId;
  options: { id: string; label: string; priceCents: number }[] | null;
  amountCents: number;
  paymentStatus: PaymentStatus;
  stripeRef: string | null;
  createdAt: string | Date;
  user?: AdminUser;
  projects?: AdminProject[];
}

export interface AdminMessage {
  id: number;
  projectId: number;
  senderRole: "customer" | "admin";
  body: string;
  attachments: { url: string; filename?: string; mimeType?: string }[] | null;
  internal: boolean;
  readAt: string | Date | null;
  createdAt: string | Date;
}

export interface AdminQuestionnaire {
  id: number;
  projectId: number;
  answers: Record<string, unknown> | null;
  completionPct: number;
  updatedAt: string | Date;
}

export interface AdminProject {
  id: number;
  orderId: number;
  userId: number;
  status: ProjectStatus;
  weddingDate: string | Date | null;
  venue: string | null;
  progress: number;
  slug: string;
  template: "editorial" | "cinema" | "minimal";
  createdAt: string | Date;
  updatedAt: string | Date;
  user?: AdminUser;
  order?: AdminOrder;
  questionnaire?: AdminQuestionnaire | null;
  media?: { id: number; type: string; url: string; filename: string | null; status: string }[];
  messages?: AdminMessage[];
}

export interface InboxThread {
  project: { id: number; slug: string; status: ProjectStatus; createdAt: string | Date };
  user: AdminUser;
  lastMessage: AdminMessage | null;
  unreadCount: number;
  messageCount: number;
}

export interface FormQuestion {
  id: string;
  step: number;
  type: string;
  label: string;
  placeholder?: string;
  help?: string;
  required?: boolean;
  showOnInvite?: boolean;
}

export interface FormTemplate {
  id: number;
  name: string;
  questions: FormQuestion[];
  active: boolean;
  createdAt: string | Date;
}

export interface CompletionStat {
  id: string;
  label: string;
  step: number;
  required: boolean;
  answered: number;
  total: number;
  completionPct: number;
}

export interface ProductSetting {
  id: ProductId;
  name: string;
  priceCents: number;
  description?: string;
  durationMin?: number;
  revisionsIncluded?: number;
  features?: string[];
  visible?: boolean;
  installments?: boolean;
}

export interface OptionSetting {
  id: string;
  label: string;
  priceCents: number;
  visible?: boolean;
}

export interface AnalyticsOverview {
  periodDays: number;
  revenueCents: number;
  prevRevenueCents: number;
  orderCount: number;
  prevOrderCount: number;
  avgBasketCents: number;
  conversionByProduct: {
    product: ProductId;
    orders: number;
    revenueCents: number;
    share: number;
  }[];
  avgProductionDays: number | null;
  deliveredCount: number;
  questionnaireAvgCompletion: number;
  questionnaireCount: number;
  rsvp: { yes: number; no: number; maybe: number; guests: number };
}

export interface RsvpStatRow {
  projectId: number;
  attending: "yes" | "no" | "maybe";
  count: number;
  plusOnes: number;
}

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  ONBOARDING: "Onboarding",
  QUESTIONNAIRE: "Questionnaire",
  SCENARIOS: "Scénarios",
  PRODUCTION: "Production",
  REVIEW: "Validation",
  DELIVERED: "Livré",
};

export const PROJECT_STATUS_ORDER: ProjectStatus[] = [
  "ONBOARDING",
  "QUESTIONNAIRE",
  "SCENARIOS",
  "PRODUCTION",
  "REVIEW",
  "DELIVERED",
];

export const PRODUCT_LABEL: Record<ProductId, string> = {
  FAIRE_PART: "Faire-part",
  SAVE_THE_DATE: "Save the Date",
};

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  pending: "En attente",
  paid: "Payée",
  failed: "Échouée",
  refunded: "Remboursée",
};

export const QUESTION_TYPES: { value: string; label: string }[] = [
  { value: "text", label: "Texte court" },
  { value: "textarea", label: "Texte long" },
  { value: "date", label: "Date" },
  { value: "list", label: "Liste" },
  { value: "toggle", label: "Oui / non" },
  { value: "color", label: "Pastilles couleur" },
  { value: "cards", label: "Choix cards" },
];
