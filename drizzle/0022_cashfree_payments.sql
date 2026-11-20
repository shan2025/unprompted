CREATE TABLE "payments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "payments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"provider" text NOT NULL,
	"provider_order_id" text NOT NULL,
	"listing_id" integer NOT NULL,
	"buyer_id" integer NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	CONSTRAINT "payments_provider_order_id_unique" UNIQUE("provider_order_id")
);
--> statement-breakpoint
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payments_listing_idx" ON "payments" USING btree ("listing_id","status","created_at");--> statement-breakpoint
CREATE INDEX "payments_buyer_idx" ON "payments" USING btree ("buyer_id");