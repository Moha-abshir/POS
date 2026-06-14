ALTER TABLE "purchases" DROP COLUMN "notes";--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_name_business_unique" UNIQUE("business_id","name");--> statement-breakpoint
ALTER TABLE "product_units" ADD CONSTRAINT "product_units_name_product_unique" UNIQUE("product_id","name");