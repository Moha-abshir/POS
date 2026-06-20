CREATE TABLE "refund_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"refund_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"quantity" numeric(10, 3) NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"subtotal" numeric(12, 2) NOT NULL,
	CONSTRAINT "refund_items_quantity_check" CHECK ("refund_items"."quantity" > 0),
	CONSTRAINT "refund_items_unit_price_check" CHECK ("refund_items"."unit_price" >= 0),
	CONSTRAINT "refund_items_subtotal_check" CHECK ("refund_items"."subtotal" >= 0)
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"sale_id" uuid NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"reason" text,
	"refunded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "refunds_total_amount_check" CHECK ("refunds"."total_amount" >= 0)
);
--> statement-breakpoint
ALTER TABLE "refund_items" ADD CONSTRAINT "refund_items_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund_items" ADD CONSTRAINT "refund_items_refund_id_refunds_id_fk" FOREIGN KEY ("refund_id") REFERENCES "public"."refunds"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund_items" ADD CONSTRAINT "refund_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund_items" ADD CONSTRAINT "refund_items_unit_id_variant_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."variant_units"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "refund_items_business_idx" ON "refund_items" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "refund_items_refund_idx" ON "refund_items" USING btree ("refund_id");--> statement-breakpoint
CREATE INDEX "refund_items_variant_idx" ON "refund_items" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "refund_items_unit_idx" ON "refund_items" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "refunds_business_idx" ON "refunds" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "refunds_sale_idx" ON "refunds" USING btree ("sale_id");