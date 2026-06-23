ALTER TABLE "cash_drawer_sessions" ADD COLUMN "resolution_status" varchar(20) DEFAULT 'UNRESOLVED' NOT NULL;--> statement-breakpoint
ALTER TABLE "cash_drawer_sessions" ADD COLUMN "resolution_type" varchar(30);--> statement-breakpoint
ALTER TABLE "cash_drawer_sessions" ADD COLUMN "resolved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "cash_drawer_sessions" ADD COLUMN "resolved_by_id" uuid;--> statement-breakpoint
ALTER TABLE "cash_drawer_sessions" ADD COLUMN "resolution_notes" text;--> statement-breakpoint
ALTER TABLE "cash_drawer_sessions" ADD COLUMN "resolution_reference_id" uuid;--> statement-breakpoint
ALTER TABLE "cash_drawer_sessions" ADD CONSTRAINT "cash_drawer_sessions_resolved_by_id_users_id_fk" FOREIGN KEY ("resolved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;