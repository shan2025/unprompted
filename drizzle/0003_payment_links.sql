ALTER TABLE "listings" ADD COLUMN "payment_url" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_reference" text DEFAULT '' NOT NULL;