ALTER TABLE "subscription" ADD COLUMN "management_token" text;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "payment_token" text;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "failed_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "next_retry_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
CREATE INDEX "subscription_status_idx" ON "subscription" USING btree ("status");