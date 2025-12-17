ALTER TABLE "app_affiliate" ALTER COLUMN "paymentLink" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "app_affiliate_payout" ADD COLUMN "stripeTransferId" text;--> statement-breakpoint
ALTER TABLE "app_affiliate" ADD COLUMN "paymentMethod" text DEFAULT 'link' NOT NULL;--> statement-breakpoint
ALTER TABLE "app_affiliate" ADD COLUMN "stripeConnectAccountId" text;--> statement-breakpoint
ALTER TABLE "app_affiliate" ADD COLUMN "stripeAccountStatus" text DEFAULT 'not_started' NOT NULL;--> statement-breakpoint
ALTER TABLE "app_affiliate" ADD COLUMN "stripeChargesEnabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "app_affiliate" ADD COLUMN "stripePayoutsEnabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "app_affiliate" ADD COLUMN "stripeDetailsSubmitted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "app_affiliate" ADD COLUMN "lastStripeSync" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX "payouts_stripe_transfer_idx" ON "app_affiliate_payout" USING btree ("stripeTransferId");--> statement-breakpoint
CREATE UNIQUE INDEX "affiliates_stripe_account_idx" ON "app_affiliate" USING btree ("stripeConnectAccountId");