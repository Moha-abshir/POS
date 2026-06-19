CREATE TYPE "public"."mpesa_account_type" AS ENUM('TILL', 'PAYBILL');--> statement-breakpoint
CREATE TYPE "public"."customer_type" AS ENUM('INDIVIDUAL', 'BUSINESS');--> statement-breakpoint
CREATE TYPE "public"."extended_payment_method" AS ENUM('CASH', 'MPESA', 'CREDIT', 'SPLIT');--> statement-breakpoint
CREATE TYPE "public"."mpesa_env" AS ENUM('SANDBOX', 'PRODUCTION');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('PENDING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TABLE "business_mpesa_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"account_name" varchar(100) NOT NULL,
	"account_type" "mpesa_account_type" NOT NULL,
	"shortcode" varchar(20) NOT NULL,
	"consumer_key" text NOT NULL,
	"consumer_secret" text NOT NULL,
	"passkey" text NOT NULL,
	"environment" "mpesa_env" DEFAULT 'SANDBOX' NOT NULL,
	"account_reference_template" varchar(100),
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "mpesa_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"mpesa_account_id" uuid NOT NULL,
	"checkout_request_id" varchar(100),
	"merchant_request_id" varchar(100),
	"transaction_code" varchar(50),
	"phone_number" varchar(20),
	"amount" numeric(12, 2) NOT NULL,
	"status" "transaction_status" DEFAULT 'PENDING' NOT NULL,
	"result_code" integer,
	"result_desc" text,
	"raw_callback_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mpesa_transactions_checkout_request_id_unique" UNIQUE("checkout_request_id"),
	CONSTRAINT "mpesa_transactions_transaction_code_unique" UNIQUE("transaction_code")
);
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "type" "customer_type" DEFAULT 'INDIVIDUAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "has_active_credit" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "status" "transaction_status" DEFAULT 'COMPLETED' NOT NULL;--> statement-breakpoint
ALTER TABLE "business_mpesa_accounts" ADD CONSTRAINT "business_mpesa_accounts_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_mpesa_accounts" ADD CONSTRAINT "business_mpesa_accounts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_mpesa_accounts" ADD CONSTRAINT "business_mpesa_accounts_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mpesa_transactions" ADD CONSTRAINT "mpesa_transactions_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mpesa_transactions" ADD CONSTRAINT "mpesa_transactions_mpesa_account_id_business_mpesa_accounts_id_fk" FOREIGN KEY ("mpesa_account_id") REFERENCES "public"."business_mpesa_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mpesa_acc_bus_idx" ON "business_mpesa_accounts" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_default_mpesa_acc" ON "business_mpesa_accounts" USING btree ("business_id") WHERE "business_mpesa_accounts"."is_default" = true AND "business_mpesa_accounts"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "mpesa_trans_payment_idx" ON "mpesa_transactions" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "mpesa_trans_checkout_idx" ON "mpesa_transactions" USING btree ("checkout_request_id");