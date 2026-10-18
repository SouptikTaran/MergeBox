CREATE TABLE "drive_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"google_subject" text NOT NULL,
	"email" text NOT NULL,
	"encrypted_refresh_token" text NOT NULL,
	"scopes" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "drive_accounts_google_subject_unique" UNIQUE("google_subject")
);
--> statement-breakpoint
ALTER TABLE "oauth_transactions" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "oauth_transactions" ADD COLUMN "session_hash" text;--> statement-breakpoint
ALTER TABLE "oauth_transactions" ADD COLUMN "expected_subject" text;--> statement-breakpoint
ALTER TABLE "drive_accounts" ADD CONSTRAINT "drive_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "drive_accounts_user_idx" ON "drive_accounts" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "oauth_transactions" ADD CONSTRAINT "oauth_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_transactions" ADD CONSTRAINT "oauth_transactions_session_hash_sessions_token_hash_fk" FOREIGN KEY ("session_hash") REFERENCES "public"."sessions"("token_hash") ON DELETE cascade ON UPDATE no action;