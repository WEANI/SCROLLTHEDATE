CREATE TYPE "public"."media_status" AS ENUM('received', 'validated', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('photo', 'video');--> statement-breakpoint
CREATE TYPE "public"."message_sender_role" AS ENUM('customer', 'admin');--> statement-breakpoint
CREATE TYPE "public"."order_payment_status" AS ENUM('pending', 'paid', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."order_product" AS ENUM('FAIRE_PART', 'SAVE_THE_DATE');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('ONBOARDING', 'QUESTIONNAIRE', 'SCENARIOS', 'PRODUCTION', 'REVIEW', 'DELIVERED');--> statement-breakpoint
CREATE TYPE "public"."project_template" AS ENUM('editorial', 'cinema', 'minimal');--> statement-breakpoint
CREATE TYPE "public"."rsvp_attending" AS ENUM('yes', 'no', 'maybe');--> statement-breakpoint
CREATE TYPE "public"."scenario_proposal_status" AS ENUM('pending', 'chosen', 'changes_requested');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."video_version_status" AS ENUM('draft', 'sent', 'approved', 'final');--> statement-breakpoint
CREATE TYPE "public"."voice_note_status" AS ENUM('received', 'processed', 'archived');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"projectId" bigint NOT NULL,
	"actor" varchar(255) NOT NULL,
	"action" varchar(255) NOT NULL,
	"meta" jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "form_templates" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"questions" jsonb NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "form_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "invite_views" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"projectId" bigint NOT NULL,
	"visitorHash" varchar(64) NOT NULL,
	"hourBucket" varchar(16) NOT NULL,
	"referrerHost" varchar(120),
	"device" varchar(10),
	"viewedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invite_views" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "media" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"projectId" bigint NOT NULL,
	"type" "media_type" NOT NULL,
	"url" text NOT NULL,
	"filename" varchar(500),
	"status" "media_status" DEFAULT 'received' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "messages" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"projectId" bigint NOT NULL,
	"senderRole" "message_sender_role" NOT NULL,
	"body" text NOT NULL,
	"attachments" jsonb,
	"internal" boolean DEFAULT false NOT NULL,
	"readAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"userId" bigint NOT NULL,
	"type" varchar(100) NOT NULL,
	"payload" jsonb,
	"readAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "orders" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"userId" bigint NOT NULL,
	"amountCents" integer NOT NULL,
	"paymentStatus" "order_payment_status" DEFAULT 'pending' NOT NULL,
	"stripeRef" varchar(255),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "projects" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"orderId" bigint NOT NULL,
	"userId" bigint NOT NULL,
	"product" "order_product" NOT NULL,
	"options" jsonb,
	"amountCents" integer NOT NULL,
	"templateSlug" varchar(100),
	"status" "project_status" DEFAULT 'ONBOARDING' NOT NULL,
	"weddingDate" timestamp with time zone,
	"venue" varchar(500),
	"progress" integer DEFAULT 0 NOT NULL,
	"slug" varchar(255) NOT NULL,
	"template" "project_template" DEFAULT 'editorial' NOT NULL,
	"palette" jsonb,
	"heroChapters" jsonb,
	"heroCustomCards" jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "questionnaires" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"projectId" bigint NOT NULL,
	"answers" jsonb,
	"completionPct" integer DEFAULT 0 NOT NULL,
	"submittedAt" timestamp with time zone,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "questionnaires" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "rsvp_config" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"projectId" bigint NOT NULL,
	"questions" jsonb,
	"enabled" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rsvp_config" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "rsvp_responses" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"projectId" bigint NOT NULL,
	"guestName" varchar(255) NOT NULL,
	"email" varchar(320),
	"attending" "rsvp_attending" NOT NULL,
	"adults" integer DEFAULT 1 NOT NULL,
	"children" integer DEFAULT 0 NOT NULL,
	"plusOnes" integer DEFAULT 0 NOT NULL,
	"allergies" text,
	"song" varchar(500),
	"message" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rsvp_responses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "scenario_proposals" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"projectId" bigint NOT NULL,
	"ordre" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"summary" text,
	"moodboard" jsonb,
	"status" "scenario_proposal_status" DEFAULT 'pending' NOT NULL,
	"sentAt" timestamp with time zone,
	"chosenAt" timestamp with time zone,
	"clientComment" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scenario_proposals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" jsonb,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "site_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"authUserId" uuid,
	"name" varchar(255),
	"email" varchar(320),
	"avatar" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastSignInAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_authUserId_unique" UNIQUE("authUserId")
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "video_versions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"projectId" bigint NOT NULL,
	"version" integer NOT NULL,
	"url" text NOT NULL,
	"posterUrl" text,
	"kind" varchar(20) DEFAULT 'video' NOT NULL,
	"frameCount" integer,
	"frameFps" integer,
	"frameBaseUrl" text,
	"watermark" boolean DEFAULT true NOT NULL,
	"status" "video_version_status" DEFAULT 'draft' NOT NULL,
	"clientComment" jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "video_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "voice_notes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"projectId" bigint NOT NULL,
	"url" text NOT NULL,
	"durationSec" integer DEFAULT 0 NOT NULL,
	"status" "voice_note_status" DEFAULT 'received' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "voice_notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_views" ADD CONSTRAINT "invite_views_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_orderId_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questionnaires" ADD CONSTRAINT "questionnaires_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvp_config" ADD CONSTRAINT "rsvp_config_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvp_responses" ADD CONSTRAINT "rsvp_responses_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenario_proposals" ADD CONSTRAINT "scenario_proposals_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_versions" ADD CONSTRAINT "video_versions_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_notes" ADD CONSTRAINT "voice_notes_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_project_idx" ON "audit_events" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "invite_views_project_idx" ON "invite_views" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "invite_views_viewed_idx" ON "invite_views" USING btree ("viewedAt");--> statement-breakpoint
CREATE UNIQUE INDEX "invite_views_dedupe_idx" ON "invite_views" USING btree ("projectId","visitorHash","hourBucket");--> statement-breakpoint
CREATE INDEX "media_project_idx" ON "media" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "messages_project_idx" ON "messages" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "orders_user_idx" ON "orders" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "projects_user_idx" ON "projects" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "projects_status_idx" ON "projects" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_slug_idx" ON "projects" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "questionnaires_project_idx" ON "questionnaires" USING btree ("projectId");--> statement-breakpoint
CREATE UNIQUE INDEX "rsvp_config_project_idx" ON "rsvp_config" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "rsvp_responses_project_idx" ON "rsvp_responses" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "scenario_proposals_project_idx" ON "scenario_proposals" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "video_versions_project_idx" ON "video_versions" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "voice_notes_project_idx" ON "voice_notes" USING btree ("projectId");--> statement-breakpoint
CREATE POLICY "service_role full access" ON "audit_events" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "service_role full access" ON "form_templates" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "service_role full access" ON "invite_views" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "service_role full access" ON "media" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "service_role full access" ON "messages" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "service_role full access" ON "notifications" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "service_role full access" ON "orders" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "service_role full access" ON "projects" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "service_role full access" ON "questionnaires" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "service_role full access" ON "rsvp_config" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "service_role full access" ON "rsvp_responses" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "service_role full access" ON "scenario_proposals" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "service_role full access" ON "site_settings" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "service_role full access" ON "users" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "service_role full access" ON "video_versions" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "service_role full access" ON "voice_notes" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);