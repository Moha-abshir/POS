ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "is_payment_locked" boolean DEFAULT false NOT NULL;
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "payment_lock_reason" text;
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "payment_amount_due" numeric(12, 2);
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "payment_locked_at" timestamp with time zone;
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "payment_status" varchar(30) DEFAULT 'normal' NOT NULL;
