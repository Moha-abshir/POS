CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"category" varchar(100) NOT NULL,
	"description" text,
	"amount" numeric(12, 2) NOT NULL,
	"expense_date" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "expenses_amount_check" CHECK ("expenses"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "sale_items" ADD COLUMN "cost_price" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
UPDATE "sale_items" SET "cost_price" = COALESCE((SELECT "cost_price" FROM "product_variants" WHERE "product_variants"."id" = "sale_items"."variant_id"), 0);--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expenses_business_idx" ON "expenses" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "expenses_date_idx" ON "expenses" USING btree ("expense_date");--> statement-breakpoint
CREATE INDEX "damaged_goods_business_damaged_at_idx" ON "damaged_goods" USING btree ("business_id","damaged_at");--> statement-breakpoint
CREATE INDEX "payments_business_paid_at_idx" ON "payments" USING btree ("business_id","paid_at");--> statement-breakpoint
CREATE INDEX "purchases_business_purchased_at_idx" ON "purchases" USING btree ("business_id","purchased_at");--> statement-breakpoint
CREATE INDEX "sales_business_sold_at_idx" ON "sales" USING btree ("business_id","sold_at");--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_cost_price_check" CHECK ("sale_items"."cost_price" >= 0);