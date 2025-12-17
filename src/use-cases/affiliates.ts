import { randomBytes } from "crypto";
import {
  createAffiliate,
  getAffiliateByUserId,
  getAffiliateByCode,
  createAffiliateReferral,
  updateAffiliateBalances,
  createAffiliatePayout,
  getAffiliateByStripeSession,
  updateAffiliateProfile,
  getAffiliateStats,
  getAffiliateReferrals,
  getAffiliatePayouts,
  getMonthlyAffiliateEarnings,
  getAllAffiliatesWithStats,
  getAffiliateById,
  getEligibleAffiliatesForAutoPayout,
  createAffiliatePayoutWithStripeTransfer,
  getPayoutByStripeTransferId,
  updateAffiliateStripeAccount,
  getAffiliateByStripeAccountId,
} from "~/data-access/affiliates";
import { ApplicationError } from "./errors";
import { AFFILIATE_CONFIG } from "~/config";
import { stripe } from "~/lib/stripe";
import { determineStripeAccountStatus } from "~/utils/stripe-status";

export async function registerAffiliateUseCase({
  userId,
  paymentMethod,
  paymentLink,
}: {
  userId: number;
  paymentMethod: "link" | "stripe";
  paymentLink?: string;
}) {
  // Check if user already is an affiliate
  const existingAffiliate = await getAffiliateByUserId(userId);
  if (existingAffiliate) {
    throw new ApplicationError(
      "You are already registered as an affiliate",
      "ALREADY_REGISTERED"
    );
  }

  // Validate payment link if using link method
  if (paymentMethod === "link") {
    if (!paymentLink || paymentLink.length < 10) {
      throw new ApplicationError(
        "Please provide a valid payment link",
        "INVALID_PAYMENT_LINK"
      );
    }

    // Validate it's a URL
    try {
      new URL(paymentLink);
    } catch {
      throw new ApplicationError(
        "Payment link must be a valid URL",
        "INVALID_PAYMENT_LINK"
      );
    }
  }

  // Generate unique affiliate code
  const affiliateCode = await generateUniqueAffiliateCode();

  // Create affiliate
  const affiliate = await createAffiliate({
    userId,
    affiliateCode,
    paymentMethod,
    paymentLink: paymentLink && paymentLink.length > 0 ? paymentLink : null,
    commissionRate: AFFILIATE_CONFIG.COMMISSION_RATE,
    totalEarnings: 0,
    paidAmount: 0,
    unpaidBalance: 0,
    isActive: true,
  });

  return affiliate;
}

export async function validateAffiliateCodeUseCase(code: string) {
  if (!code) return null;

  const affiliate = await getAffiliateByCode(code);
  if (!affiliate || !affiliate.isActive) {
    return null;
  }

  return affiliate;
}

export async function updateAffiliatePaymentLinkUseCase({
  userId,
  paymentMethod,
  paymentLink,
}: {
  userId: number;
  paymentMethod: "link" | "stripe";
  paymentLink?: string;
}) {
  const affiliate = await getAffiliateByUserId(userId);
  if (!affiliate) {
    throw new ApplicationError(
      "You are not registered as an affiliate",
      "NOT_AFFILIATE"
    );
  }

  // Validate payment link if using link method
  if (paymentMethod === "link") {
    if (!paymentLink || paymentLink.length < 10) {
      throw new ApplicationError(
        "Please provide a valid payment link",
        "INVALID_PAYMENT_LINK"
      );
    }

    try {
      new URL(paymentLink);
    } catch {
      throw new ApplicationError(
        "Payment link must be a valid URL",
        "INVALID_PAYMENT_LINK"
      );
    }
  }

  // Update payment method and link in database
  return updateAffiliateProfile(affiliate.id, {
    paymentMethod,
    paymentLink: paymentLink && paymentLink.length > 0 ? paymentLink : null,
  });
}

export async function adminToggleAffiliateStatusUseCase({
  affiliateId,
  isActive,
}: {
  affiliateId: number;
  isActive: boolean;
}) {
  return updateAffiliateProfile(affiliateId, { isActive });
}

async function generateUniqueAffiliateCode(): Promise<string> {
  let attempts = 0;

  while (attempts < AFFILIATE_CONFIG.AFFILIATE_CODE_RETRY_ATTEMPTS) {
    // Generate a random affiliate code
    const bytes = randomBytes(6);
    const code = bytes
      .toString("base64")
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, AFFILIATE_CONFIG.AFFILIATE_CODE_LENGTH)
      .toUpperCase();

    // Ensure it's exactly the required length (pad if needed)
    const paddedCode = code.padEnd(AFFILIATE_CONFIG.AFFILIATE_CODE_LENGTH, "0");

    // Check if this code is already in use
    const existingAffiliate = await getAffiliateByCode(paddedCode);
    if (!existingAffiliate) {
      return paddedCode;
    }

    attempts++;
  }

  throw new ApplicationError(
    "Unable to generate unique affiliate code after multiple attempts",
    "CODE_GENERATION_FAILED"
  );
}

export async function processAffiliateReferralUseCase({
  affiliateCode,
  purchaserId,
  stripeSessionId,
  amount,
}: {
  affiliateCode: string;
  purchaserId: number;
  stripeSessionId: string;
  amount: number;
}) {
  // Import database for transaction support
  const { database } = await import("~/db");
  
  return await database.transaction(async (tx) => {
    // Get affiliate by code (using the imported function which uses the main database)
    const affiliate = await getAffiliateByCode(affiliateCode);
    if (!affiliate) {
      console.warn(`Invalid affiliate code: ${affiliateCode} for purchase ${stripeSessionId}`);
      return null;
    }

    // Check for self-referral
    if (affiliate.userId === purchaserId) {
      console.warn(`Self-referral attempted by user ${purchaserId} for session ${stripeSessionId}`);
      return null;
    }

    // Check if this session was already processed (database unique constraint also helps with race conditions)
    const existingReferral = await getAffiliateByStripeSession(stripeSessionId);
    if (existingReferral) {
      console.warn(`Duplicate Stripe session: ${stripeSessionId} already processed`);
      return null;
    }

    // Calculate commission
    const commission = Math.floor((amount * affiliate.commissionRate) / 100);

    // Create referral record
    const referral = await createAffiliateReferral({
      affiliateId: affiliate.id,
      purchaserId,
      stripeSessionId,
      amount,
      commission,
      isPaid: false,
    });

    // Update affiliate balances
    await updateAffiliateBalances(affiliate.id, commission, commission);

    return referral;
  });
}

export async function recordAffiliatePayoutUseCase({
  affiliateId,
  amount,
  paymentMethod,
  transactionId,
  notes,
  paidBy,
}: {
  affiliateId: number;
  amount: number;
  paymentMethod: string;
  transactionId?: string;
  notes?: string;
  paidBy: number;
}) {
  // Validate minimum payout
  if (amount < AFFILIATE_CONFIG.MINIMUM_PAYOUT) {
    throw new ApplicationError(
      `Minimum payout amount is $${AFFILIATE_CONFIG.MINIMUM_PAYOUT / 100}`,
      "MINIMUM_PAYOUT_NOT_MET"
    );
  }

  // Create payout record (this also updates balances and marks referrals as paid)
  const payout = await createAffiliatePayout({
    affiliateId,
    amount,
    paymentMethod,
    transactionId: transactionId || null,
    notes: notes || null,
    paidBy,
  });

  return payout;
}

/**
 * Process automatic payout for a single affiliate via Stripe Connect.
 * Validates eligibility, creates Stripe transfer, and records payout in database.
 */
export async function processAutomaticPayoutsUseCase({
  affiliateId,
  systemUserId,
}: {
  affiliateId: number;
  systemUserId: number; // Admin/system user ID to record as paidBy
}): Promise<{
  success: boolean;
  transferId?: string;
  amount?: number;
  error?: string;
}> {
  try {
    // Get affiliate details
    const affiliate = await getAffiliateById(affiliateId);
    if (!affiliate) {
      return { success: false, error: "Affiliate not found" };
    }

    // Validate Stripe Connect is enabled
    if (!affiliate.stripeConnectAccountId) {
      return { success: false, error: "Affiliate has no Stripe Connect account" };
    }

    if (!affiliate.stripePayoutsEnabled) {
      return { success: false, error: "Stripe payouts not enabled for this affiliate" };
    }

    // Validate minimum balance
    if (affiliate.unpaidBalance < AFFILIATE_CONFIG.MINIMUM_PAYOUT) {
      return {
        success: false,
        error: `Balance ($${affiliate.unpaidBalance / 100}) below minimum payout ($${AFFILIATE_CONFIG.MINIMUM_PAYOUT / 100})`,
      };
    }

    if (!affiliate.isActive) {
      return { success: false, error: "Affiliate account is not active" };
    }

    const payoutAmount = affiliate.unpaidBalance;

    // Create Stripe Transfer to connected account
    const transfer = await stripe.transfers.create({
      amount: payoutAmount,
      currency: "usd",
      destination: affiliate.stripeConnectAccountId,
      metadata: {
        affiliateId: affiliate.id.toString(),
        affiliateCode: affiliate.affiliateCode,
        payoutType: "automatic",
      },
    });

    // Check for duplicate transfer (idempotency)
    const existingPayout = await getPayoutByStripeTransferId(transfer.id);
    if (existingPayout) {
      console.warn(`Duplicate transfer detected: ${transfer.id}`);
      return { success: true, transferId: transfer.id, amount: payoutAmount };
    }

    // Record payout in database
    await createAffiliatePayoutWithStripeTransfer({
      affiliateId: affiliate.id,
      amount: payoutAmount,
      paymentMethod: "stripe_connect",
      stripeTransferId: transfer.id,
      notes: "Automatic payout via Stripe Connect",
      paidBy: systemUserId,
    });

    console.log(
      `Automatic payout processed for affiliate ${affiliate.id}: $${payoutAmount / 100}, transfer ${transfer.id}`
    );

    return {
      success: true,
      transferId: transfer.id,
      amount: payoutAmount,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Failed to process automatic payout for affiliate ${affiliateId}:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Process automatic payouts for all eligible affiliates.
 * Used by admin to trigger batch processing.
 *
 * Implements controlled concurrency (3 at a time) with rate limiting
 * to respect Stripe API limits and prevent overwhelming the system.
 */
export async function processAllAutomaticPayoutsUseCase({
  systemUserId,
}: {
  systemUserId: number;
}): Promise<{
  processed: number;
  successful: number;
  failed: number;
  results: Array<{
    affiliateId: number;
    success: boolean;
    transferId?: string;
    amount?: number;
    error?: string;
  }>;
}> {
  const eligibleAffiliates = await getEligibleAffiliatesForAutoPayout(
    AFFILIATE_CONFIG.MINIMUM_PAYOUT
  );

  const results: Array<{
    affiliateId: number;
    success: boolean;
    transferId?: string;
    amount?: number;
    error?: string;
  }> = [];

  // Process in batches to avoid overwhelming Stripe API
  // Conservative limit: 3 concurrent payouts respects Stripe rate limits
  const CONCURRENT_PAYOUTS = 3;
  // Delay between batches to further respect rate limits
  const BATCH_DELAY_MS = 1000;

  for (let i = 0; i < eligibleAffiliates.length; i += CONCURRENT_PAYOUTS) {
    const batch = eligibleAffiliates.slice(i, i + CONCURRENT_PAYOUTS);

    // Process this batch concurrently
    const batchResults = await Promise.all(
      batch.map(async (affiliate) => {
        const result = await processAutomaticPayoutsUseCase({
          affiliateId: affiliate.id,
          systemUserId,
        });
        return { affiliateId: affiliate.id, ...result };
      })
    );

    results.push(...batchResults);

    // Add delay between batches to respect rate limits (skip after last batch)
    if (i + CONCURRENT_PAYOUTS < eligibleAffiliates.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  return {
    processed: results.length,
    successful: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  };
}

/**
 * Sync Stripe Connect account status from Stripe API.
 * Called when account.updated webhook is received or manually by user.
 */
export async function syncStripeAccountStatusUseCase(
  stripeAccountId: string
): Promise<{
  success: boolean;
  affiliate?: Awaited<ReturnType<typeof getAffiliateByStripeAccountId>>;
  error?: string;
}> {
  try {
    // Get affiliate by Stripe account ID
    const affiliate = await getAffiliateByStripeAccountId(stripeAccountId);
    if (!affiliate) {
      return { success: false, error: "No affiliate found with this Stripe account ID" };
    }

    // Fetch account details from Stripe
    const account = await stripe.accounts.retrieve(stripeAccountId);

    // Determine account status
    const status = determineStripeAccountStatus(account);

    // Update affiliate record
    const updated = await updateAffiliateStripeAccount(affiliate.id, {
      stripeAccountStatus: status,
      stripeChargesEnabled: account.charges_enabled ?? false,
      stripePayoutsEnabled: account.payouts_enabled ?? false,
      stripeDetailsSubmitted: account.details_submitted ?? false,
      lastStripeSync: new Date(),
    });

    console.log(
      `Synced Stripe account status for affiliate ${affiliate.id}: status=${status}, payouts=${account.payouts_enabled}`
    );

    return { success: true, affiliate: updated };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Failed to sync Stripe account ${stripeAccountId}:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Refresh Stripe account status for a user's affiliate account.
 * Called manually by the user from the dashboard.
 */
export async function refreshStripeAccountStatusForUserUseCase(
  userId: number
): Promise<{
  success: boolean;
  error?: string;
}> {
  const affiliate = await getAffiliateByUserId(userId);
  if (!affiliate) {
    return { success: false, error: "User is not an affiliate" };
  }

  if (!affiliate.stripeConnectAccountId) {
    return { success: false, error: "No Stripe Connect account linked" };
  }

  return syncStripeAccountStatusUseCase(affiliate.stripeConnectAccountId);
}

export async function getAffiliateAnalyticsUseCase(userId: number) {
  const affiliate = await getAffiliateByUserId(userId);
  if (!affiliate) {
    throw new ApplicationError(
      "You are not registered as an affiliate",
      "NOT_AFFILIATE"
    );
  }

  const [stats, referrals, payouts, monthlyEarnings] = await Promise.all([
    getAffiliateStats(affiliate.id),
    getAffiliateReferrals(affiliate.id),
    getAffiliatePayouts(affiliate.id),
    getMonthlyAffiliateEarnings(affiliate.id),
  ]);

  return {
    affiliate,
    stats,
    referrals,
    payouts,
    monthlyEarnings,
  };
}

export async function adminGetAllAffiliatesUseCase() {
  return getAllAffiliatesWithStats();
}

async function generateUniqueAffiliateCode(): Promise<string> {
  let attempts = 0;
  
  while (attempts < AFFILIATE_CONFIG.AFFILIATE_CODE_RETRY_ATTEMPTS) {
    // Generate a random affiliate code
    const bytes = randomBytes(6);
    const code = bytes
      .toString("base64")
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, AFFILIATE_CONFIG.AFFILIATE_CODE_LENGTH)
      .toUpperCase();

    // Ensure it's exactly the required length (pad if needed)
    const paddedCode = code.padEnd(AFFILIATE_CONFIG.AFFILIATE_CODE_LENGTH, "0");
    
    // Check if this code is already in use
    const existingAffiliate = await getAffiliateByCode(paddedCode);
    if (!existingAffiliate) {
      return paddedCode;
    }
    
    attempts++;
  }
  
  throw new ApplicationError(
    "Unable to generate unique affiliate code after multiple attempts",
    "CODE_GENERATION_FAILED"
  );
}
