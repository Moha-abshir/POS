CREATE TABLE "businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"sector" varchar(100),
	"phone" varchar(50),
	"location" text,
	"is_setup_complete" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categories" DROP CONSTRAINT "categories_name_unique";--> statement-breakpoint
ALTER TABLE "product_units" DROP CONSTRAINT "product_units_product_id_products_id_fk";
--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "business_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "product_units" ADD COLUMN "business_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "business_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "business_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "business_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "first_name" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_name" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "mobile_number" varchar(50);--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_units" ADD CONSTRAINT "product_units_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_units" ADD CONSTRAINT "product_units_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;