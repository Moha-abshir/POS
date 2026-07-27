ALTER TABLE "businesses" ADD COLUMN "product_mode" varchar(50) DEFAULT 'ADVANCED' NOT NULL;--> statement-breakpoint
ALTER TABLE "variant_units" ADD COLUMN "minimum_price" numeric(12, 2);