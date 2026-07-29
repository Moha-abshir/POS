CREATE TABLE "banking_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"type" varchar(20) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"balance_after" numeric(12, 2) NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "is_banking_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "banking_transactions" ADD CONSTRAINT "banking_transactions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "banking_transactions" ADD CONSTRAINT "banking_transactions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "banking_transactions" ADD CONSTRAINT "banking_transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "banking_transactions_business_idx" ON "banking_transactions" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "banking_transactions_customer_idx" ON "banking_transactions" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "banking_transactions_created_at_idx" ON "banking_transactions" USING btree ("created_at");