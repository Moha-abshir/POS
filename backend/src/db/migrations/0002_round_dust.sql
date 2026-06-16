CREATE TABLE "restock_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"is_ordered" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "restock_items_variant_business_unique" UNIQUE("business_id","variant_id")
);
--> statement-breakpoint
ALTER TABLE "restock_items" ADD CONSTRAINT "restock_items_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restock_items" ADD CONSTRAINT "restock_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restock_items" ADD CONSTRAINT "restock_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "restock_items_business_idx" ON "restock_items" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "restock_items_variant_idx" ON "restock_items" USING btree ("variant_id");