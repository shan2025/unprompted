ALTER TABLE "listings" ADD COLUMN "product_type" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "gallery" jsonb DEFAULT '[]'::jsonb NOT NULL;