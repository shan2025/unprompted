CREATE TABLE "direct_message_reactions" (
	"message_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"emoji" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "direct_message_reactions_message_id_user_id_pk" PRIMARY KEY("message_id","user_id"),
	CONSTRAINT "direct_message_reactions_emoji_length" CHECK (char_length("direct_message_reactions"."emoji") between 1 and 16)
);
--> statement-breakpoint
ALTER TABLE "direct_message_reactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "direct_messages" ADD COLUMN "edited_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "direct_message_reactions" ADD CONSTRAINT "direct_message_reactions_message_id_direct_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."direct_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_message_reactions" ADD CONSTRAINT "direct_message_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;