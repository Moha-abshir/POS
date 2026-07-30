CREATE TYPE "public"."banking_customer_type" AS ENUM('BANKER', 'LOAN_CLIENT');--> statement-breakpoint
CREATE TABLE "banking_customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(50),
	"type" "banking_customer_type" DEFAULT 'BANKER' NOT NULL,
	"balance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "banking_transactions" ADD COLUMN "banking_customer_id" uuid;--> statement-breakpoint
ALTER TABLE "banking_customers" ADD CONSTRAINT "banking_customers_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "banking_customers_business_idx" ON "banking_customers" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "banking_customers_phone_unique" ON "banking_customers" USING btree ("business_id","phone") WHERE "banking_customers"."deleted_at" IS NULL AND "banking_customers"."phone" IS NOT NULL AND "banking_customers"."phone" != '';--> statement-breakpoint
ALTER TABLE "banking_transactions" ADD CONSTRAINT "banking_transactions_banking_customer_id_banking_customers_id_fk" FOREIGN KEY ("banking_customer_id") REFERENCES "public"."banking_customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "banking_transactions_banking_customer_idx" ON "banking_transactions" USING btree ("banking_customer_id");