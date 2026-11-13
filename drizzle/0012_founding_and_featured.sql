ALTER TABLE "listings" ADD COLUMN "featured_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "featured_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "founding" boolean DEFAULT false NOT NULL;