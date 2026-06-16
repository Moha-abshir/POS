ALTER TABLE "purchase_items" ADD COLUMN "unit_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_unit_id_variant_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."variant_units"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "purchase_items_unit_idx" ON "purchase_items" USING btree ("unit_id");