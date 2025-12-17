import { createServerFileRoute } from "@tanstack/react-start/server";
import { stripe } from "~/lib/stripe";
import { updateUserToPremiumUseCase } from "~/use-cases/users";
import {
  processAffiliateReferralUseCase,
  processAutomaticPayoutsUseCase,
  syncStripeAccountStatusUseCase,
} from "~/use-cases/affiliates";
import {
  getAffiliateByCode,
  getPayoutByStripeTransferId,
} from "~/data-access/affiliates";
import { env } from "~/utils/env";
import { trackAnalyticsEvent } from "~/data-access/analytics";
import { AFFILIATE_CONFIG } from "~/config";

// System user ID for automatic payouts (configured via environment variable)
const SYSTEM_USER_ID = env.SYSTEM_USER_ID;

const webhookSecret = env.STRIPE_WEBHOOK_SECRET!;

export const ServerRoute = createServerFileRoute("/api/stripe/webhook").methods(
  {
    POST: async ({ request }) => {
      const sig = request.headers.get("stripe-signature");

      if (!sig) {
        console.error("Webhook Error: Missing stripe-signature header");
        return new Response(
          JSON.stringify({ error: "Missing stripe-signature header" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const payload = await request.text();

      try {
        const event = stripe.webhooks.constructEvent(
          payload,
          sig,
          webhookSecret
        );

        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object;
            const userId = session.metadata?.userId;
            const affiliateCode = session.metadata?.affiliateCode;
            const analyticsSessionId = session.metadata?.analyticsSessionId;

            if (userId) {
              await updateUserToPremiumUseCase(parseInt(userId));
              console.log(`Updated user ${userId} to premium status`);
              
              // Track purchase completion in analytics
              if (analyticsSessionId) {
                try {
                  await trackAnalyticsEvent({
                    sessionId: analyticsSessionId,
                    userId: parseInt(userId),
                    eventType: 'purchase_completed',
                    pagePath: '/success',
                    metadata: {
                      amount: session.amount_total,
                      stripeSessionId: session.id,
                      affiliateCode,
                    },
                  });
                  console.log(`Tracked purchase completion for analytics session ${analyticsSessionId}`);
                } catch (error) {
                  console.error('Failed to track purchase completion:', error);
                  // Don't fail the webhook for analytics errors
                }
              }
              
              // Process affiliate referral if code exists
              if (affiliateCode && session.amount_total) {
                try {
                  const referral = await processAffiliateReferralUseCase({
                    affiliateCode,
                    purchaserId: parseInt(userId),
                    stripeSessionId: session.id,
                    amount: session.amount_total,
                  });

                  if (referral) {
                    console.log(`Successfully processed affiliate referral for code ${affiliateCode}, session ${session.id}, commission: $${referral.commission / 100}`);

                    // Trigger automatic payout if affiliate is eligible
                    // Check if balance >= minimum and Stripe Connect is enabled
                    try {
                      const affiliate = await getAffiliateByCode(affiliateCode);
                      if (
                        affiliate &&
                        affiliate.stripePayoutsEnabled &&
                        affiliate.unpaidBalance >= AFFILIATE_CONFIG.MINIMUM_PAYOUT
                      ) {
                        console.log(
                          `Triggering automatic payout for affiliate ${affiliate.id} (balance: $${affiliate.unpaidBalance / 100})`
                        );
                        const payoutResult = await processAutomaticPayoutsUseCase({
                          affiliateId: affiliate.id,
                          systemUserId: SYSTEM_USER_ID,
                        });
                        if (payoutResult.success) {
                          console.log(
                            `Automatic payout successful for affiliate ${affiliate.id}: $${(payoutResult.amount ?? 0) / 100}, transfer ${payoutResult.transferId}`
                          );
                        } else {
                          console.warn(
                            `Automatic payout skipped for affiliate ${affiliate.id}: ${payoutResult.error}`
                          );
                        }
                      }
                    } catch (payoutError) {
                      console.error(
                        `Failed to process automatic payout for affiliate after referral:`,
                        payoutError instanceof Error ? payoutError.message : String(payoutError)
                      );
                      // Don't fail webhook for payout errors
                    }
                  } else {
                    console.warn(`Affiliate referral not processed for code ${affiliateCode}, session ${session.id} - likely duplicate, self-referral, or invalid code`);
                  }
                } catch (error) {
                  console.error(`Failed to process affiliate referral for code ${affiliateCode}, session ${session.id}:`, {
                    error: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined,
                    affiliateCode,
                    purchaserId: userId,
                    sessionId: session.id,
                    amount: session.amount_total,
                  });
                  // Don't fail the webhook for affiliate errors - user upgrade should succeed
                }
              }
            }

            console.log("Payment successful:", session.id);
            break;
          }

          // Handle Stripe Connect account updates
          case "account.updated": {
            const account = event.data.object;
            console.log(`Stripe Connect account updated: ${account.id}`);

            try {
              const result = await syncStripeAccountStatusUseCase(account.id);
              if (result.success) {
                console.log(
                  `Successfully synced Stripe account ${account.id}: payouts=${account.payouts_enabled}, charges=${account.charges_enabled}`
                );
              } else {
                console.warn(`Could not sync Stripe account ${account.id}: ${result.error}`);
              }
            } catch (error) {
              console.error(
                `Error syncing Stripe account ${account.id}:`,
                error instanceof Error ? error.message : String(error)
              );
              // Don't fail webhook for sync errors
            }
            break;
          }

          // Handle successful transfers (for logging)
          case "transfer.created": {
            const transfer = event.data.object;
            console.log(
              `Stripe transfer created: ${transfer.id}, amount: $${transfer.amount / 100}, destination: ${transfer.destination}`
            );

            // Log transfer details for auditing
            const metadata = transfer.metadata || {};
            if (metadata.affiliateId) {
              console.log(
                `Transfer ${transfer.id} is for affiliate ${metadata.affiliateId} (code: ${metadata.affiliateCode})`
              );
            }
            break;
          }

          default: {
            // Handle transfer.failed and other events that may not be in the type definitions
            const eventType = event.type as string;
            if (eventType === "transfer.failed") {
              const transfer = (event as unknown as { data: { object: { id: string; amount: number; destination: string; metadata?: Record<string, string> } } }).data.object;
              console.error(
                `Stripe transfer FAILED: ${transfer.id}, amount: $${transfer.amount / 100}, destination: ${transfer.destination}`
              );

              // Log error details for admin notification
              const metadata = transfer.metadata || {};
              if (metadata.affiliateId) {
                console.error(
                  `Failed transfer ${transfer.id} was for affiliate ${metadata.affiliateId} (code: ${metadata.affiliateCode}). Manual intervention may be required.`
                );
              }

              // Check if we have a payout record for this transfer
              try {
                const existingPayout = await getPayoutByStripeTransferId(transfer.id);
                if (existingPayout) {
                  console.error(
                    `Payout record ${existingPayout.id} exists for failed transfer ${transfer.id}. Admin should review and potentially reverse.`
                  );
                }
              } catch (error) {
                console.error(`Error checking payout record for failed transfer:`, error);
              }
            }
            break;
          }
        }

        return new Response(JSON.stringify({ received: true }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        console.error("Webhook Error:", err);
        return new Response(
          JSON.stringify({ error: "Webhook handler failed" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },
  }
);
