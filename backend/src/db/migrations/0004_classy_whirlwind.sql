CREATE INDEX "categories_business_idx" ON "categories" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "otps_email_idx" ON "otps" USING btree ("email");--> statement-breakpoint
CREATE INDEX "otps_expires_at_idx" ON "otps" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "product_units_product_idx" ON "product_units" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "products_business_idx" ON "products" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_business_idx" ON "sessions" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "users_business_idx" ON "users" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_name_business_unique" UNIQUE("business_id","name");--> statement-breakpoint
ALTER TABLE "product_units" ADD CONSTRAINT "product_units_name_product_unique" UNIQUE("product_id","name");--> statement-breakpoint
ALTER TABLE "product_units" ADD CONSTRAINT "selling_price_check" CHECK ("product_units"."selling_price" >= 0);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "cost_price_check" CHECK ("products"."cost_price" >= 0);