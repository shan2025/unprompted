ALTER TABLE "users" DROP CONSTRAINT "users_email_or_phone";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_or_phone" CHECK ("users"."email" is not null or "users"."phone" is not null or "users"."deleted_at" is not null);