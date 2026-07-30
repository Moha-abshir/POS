ALTER TABLE "banking_transactions" DROP CONSTRAINT "banking_transactions_customer_id_customers_id_fk";
--> statement-breakpoint
DROP INDEX "banking_transactions_banking_customer_idx";--> statement-breakpoint
DROP INDEX "banking_transactions_customer_idx";--> statement-breakpoint
ALTER TABLE "banking_transactions" ALTER COLUMN "banking_customer_id" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "banking_transactions_customer_idx" ON "banking_transactions" USING btree ("banking_customer_id");--> statement-breakpoint
ALTER TABLE "banking_transactions" DROP COLUMN "customer_id";