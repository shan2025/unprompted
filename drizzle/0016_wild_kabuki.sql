CREATE TABLE "direct_messages" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "direct_messages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"sender_id" integer NOT NULL,
	"recipient_id" integer NOT NULL,
	"body" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "direct_messages_distinct_members" CHECK ("direct_messages"."sender_id" <> "direct_messages"."recipient_id"),
	CONSTRAINT "direct_messages_body_length" CHECK (char_length("direct_messages"."body") between 1 and 2000)
);
--> statement-breakpoint
ALTER TABLE "direct_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "direct_messages_sender_idx" ON "direct_messages" USING btree ("sender_id","recipient_id","id");--> statement-breakpoint
CREATE INDEX "direct_messages_recipient_idx" ON "direct_messages" USING btree ("recipient_id","sender_id","id");