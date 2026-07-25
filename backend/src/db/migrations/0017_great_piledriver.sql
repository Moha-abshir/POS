ALTER TYPE "public"."customer_type" ADD VALUE 'EMPLOYEE';--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "base_salary" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "period_owed" varchar(50);