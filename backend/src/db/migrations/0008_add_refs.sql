ALTER TABLE "categories" DROP CONSTRAINT "categories_name_business_unique";--> statement-breakpoint
ALTER TABLE "product_units" DROP CONSTRAINT "product_units_name_product_unique";--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "invoice_ref" text;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "mpesa_ref" varchar(50);