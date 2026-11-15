CREATE TABLE "work_drafts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"kind" text NOT NULL,
	"target_slug" text DEFAULT '' NOT NULL,
	"payload" jsonb NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "work_drafts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "evidence_review" jsonb;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "moderation_reason" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "evidence_review" jsonb;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "moderation_reason" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "work_drafts" ADD CONSTRAINT "work_drafts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "work_drafts_user_idx" ON "work_drafts" USING btree ("user_id","updated_at");