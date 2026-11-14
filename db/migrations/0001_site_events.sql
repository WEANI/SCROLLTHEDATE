CREATE TABLE "site_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"kind" varchar(16) NOT NULL,
	"name" varchar(40),
	"path" varchar(200) NOT NULL,
	"target" varchar(300),
	"visitorHash" varchar(64) NOT NULL,
	"referrerHost" varchar(120),
	"utmSource" varchar(80),
	"utmMedium" varchar(80),
	"utmCampaign" varchar(120),
	"device" varchar(10),
	"browser" varchar(20),
	"os" varchar(20),
	"lang" varchar(10),
	"tz" varchar(60),
	"seconds" integer,
	"depth" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "site_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "site_events_created_idx" ON "site_events" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "site_events_visitor_idx" ON "site_events" USING btree ("visitorHash");--> statement-breakpoint
CREATE POLICY "service_role full access" ON "site_events" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);