ALTER TABLE "admins" DROP CONSTRAINT "admins_email_unique";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_email_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "admins_email_lower_idx" ON "admins" USING btree (LOWER("email"));--> statement-breakpoint
CREATE INDEX "cash_drawer_sessions_closed_by_idx" ON "cash_drawer_sessions" USING btree ("closed_by_id");--> statement-breakpoint
CREATE INDEX "cash_drawer_sessions_resolved_by_idx" ON "cash_drawer_sessions" USING btree ("resolved_by_id");--> statement-breakpoint
CREATE INDEX "mpesa_trans_account_idx" ON "mpesa_transactions" USING btree ("mpesa_account_id");--> statement-breakpoint
CREATE INDEX "variants_business_idx" ON "product_variants" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_idx" ON "users" USING btree (LOWER("email"));--> statement-breakpoint
CREATE INDEX "units_business_idx" ON "variant_units" USING btree ("business_id");