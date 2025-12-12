// lib/whop/transfers.ts
/**
 * Whop Transfers API - Automated Commission Payouts
 *
 * Uses Whop's Transfers API to automatically pay commissions to affiliates.
 * POST https://api.whop.com/api/v2/transfers
 *
 * @see https://dev.whop.com/reference/create-transfer
 */

import logger from '../logger';

const WHOP_API_BASE = 'https://api.whop.com/api/v2';
const WHOP_API_KEY = process.env.WHOP_API_KEY;

// ============================================================================
// TYPES
// ============================================================================

export interface TransferOptions {
  /** Amount in dollars (e.g., 10.50) */
  amount: number;
  /** Currency code (e.g., 'usd') */
  currency: string;
  /** Company ID that pays (biz_xxx) */
  originId: string;
  /** User ID that receives payment (user_xxx) */
  destinationId: string;
  /** Unique key to prevent duplicate transfers */
  idempotenceKey: string;
  /** Description/notes for the transfer */
  notes?: string;
}

export interface TransferResult {
  success: boolean;
  transferId?: string;
  error?: string;
  errorCode?: string;
}

export interface PayoutEligibility {
  eligible: boolean;
  reason?: string;
  payoutMethodConfigured?: boolean;
}

interface WhopTransferResponse {
  id: string;
  amount: number;
  currency: string;
  origin_id: string;
  destination_id: string;
  status: string;
  created_at: number;
}

interface WhopUserPayoutInfo {
  id: string;
  payout_method_configured?: boolean;
  stripe_account_id?: string;
  can_receive_payouts?: boolean;
}

// ============================================================================
// CORE TRANSFER FUNCTION
// ============================================================================

/**
 * Create a transfer (payout) via Whop API
 *
 * @param options - Transfer configuration
 * @returns Transfer result with success status and transfer ID
 */
export async function createTransfer(options: TransferOptions): Promise<TransferResult> {
  const { amount, currency, originId, destinationId, idempotenceKey, notes } = options;

  // Validate inputs
  if (!WHOP_API_KEY) {
    logger.error('WHOP_API_KEY not configured - cannot create transfer');
    return {
      success: false,
      error: 'API key not configured',
      errorCode: 'CONFIG_ERROR',
    };
  }

  if (amount <= 0) {
    logger.warn(`Invalid transfer amount: ${amount}`);
    return {
      success: false,
      error: 'Transfer amount must be greater than 0',
      errorCode: 'INVALID_AMOUNT',
    };
  }

  if (!originId || !destinationId) {
    logger.error('Missing origin or destination ID for transfer');
    return {
      success: false,
      error: 'Origin and destination IDs are required',
      errorCode: 'MISSING_IDS',
    };
  }

  try {
    logger.info(`Creating transfer: $${amount.toFixed(2)} from ${originId} to ${destinationId}`);

    const response = await fetch(`${WHOP_API_BASE}/transfers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHOP_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        currency: currency.toLowerCase(),
        origin_id: originId,
        destination_id: destinationId,
        idempotence_key: idempotenceKey,
        notes: notes || 'Commission payout via Referral Flywheel',
      }),
    });

    // Handle response
    if (!response.ok) {
      const errorText = await response.text();
      let errorData: any = {};

      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }

      // Map common error codes
      const errorCode = mapHttpErrorCode(response.status, errorData);

      logger.error(`Transfer failed (${response.status}):`, {
        error: errorData,
        originId,
        destinationId,
        amount,
      });

      return {
        success: false,
        error: errorData.message || errorData.error || `HTTP ${response.status}`,
        errorCode,
      };
    }

    const data: WhopTransferResponse = await response.json();

    logger.info(`Transfer successful: ${data.id} ($${amount.toFixed(2)} to ${destinationId})`);

    return {
      success: true,
      transferId: data.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Transfer request failed:', error);

    return {
      success: false,
      error: errorMessage,
      errorCode: 'NETWORK_ERROR',
    };
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Pay a commission to a referrer
 *
 * Creates a transfer from the creator's company to the referrer's user account.
 * Uses the commission ID as part of the idempotence key to prevent duplicates.
 *
 * @param commissionId - Our internal commission record ID
 * @param amount - Commission amount in dollars
 * @param recipientUserId - Whop user ID of the referrer (user_xxx)
 * @param companyId - Whop company ID that pays (biz_xxx)
 * @returns Transfer result
 */
export async function payCommission(
  commissionId: string,
  amount: number,
  recipientUserId: string,
  companyId: string
): Promise<TransferResult> {
  // Generate idempotence key based on commission ID
  // This ensures we never pay the same commission twice
  const idempotenceKey = `commission_${commissionId}`;

  logger.info(`Processing commission payout: ${commissionId} ($${amount.toFixed(2)})`);

  const result = await createTransfer({
    amount,
    currency: 'usd',
    originId: companyId,
    destinationId: recipientUserId,
    idempotenceKey,
    notes: `Commission payout for referral (Commission ID: ${commissionId})`,
  });

  if (result.success) {
    logger.info(`Commission ${commissionId} paid successfully (Transfer: ${result.transferId})`);
  } else {
    logger.error(`Commission ${commissionId} payout failed: ${result.error}`);
  }

  return result;
}

/**
 * Check if a user can receive payouts
 *
 * Verifies that the user has set up their payout method (Stripe Connect, etc.)
 *
 * @param userId - Whop user ID to check
 * @returns Eligibility status with reason if not eligible
 */
export async function checkPayoutEligibility(userId: string): Promise<PayoutEligibility> {
  if (!WHOP_API_KEY) {
    logger.error('WHOP_API_KEY not configured');
    return {
      eligible: false,
      reason: 'API configuration error',
    };
  }

  try {
    logger.info(`Checking payout eligibility for user: ${userId}`);

    const response = await fetch(`${WHOP_API_BASE}/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${WHOP_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      logger.error(`Failed to fetch user ${userId}: ${response.status}`);
      return {
        eligible: false,
        reason: `Failed to verify user: HTTP ${response.status}`,
      };
    }

    const data: { data?: WhopUserPayoutInfo } = await response.json();
    const user = data.data;

    if (!user) {
      return {
        eligible: false,
        reason: 'User not found',
      };
    }

    // Check payout eligibility based on available fields
    // Note: Whop API may have different field names - adjust as needed
    const hasPayoutMethod = user.payout_method_configured ||
                           user.stripe_account_id ||
                           user.can_receive_payouts;

    if (!hasPayoutMethod) {
      logger.info(`User ${userId} has not configured payout method`);
      return {
        eligible: false,
        reason: 'Payout method not configured. User needs to set up their payout details in Whop.',
        payoutMethodConfigured: false,
      };
    }

    logger.info(`User ${userId} is eligible for payouts`);
    return {
      eligible: true,
      payoutMethodConfigured: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Error checking payout eligibility for ${userId}:`, error);

    return {
      eligible: false,
      reason: `Eligibility check failed: ${errorMessage}`,
    };
  }
}

/**
 * Batch pay multiple commissions
 *
 * Processes multiple commission payouts sequentially with error handling.
 * Continues processing even if some payouts fail.
 *
 * @param commissions - Array of commission payout requests
 * @returns Results for each payout attempt
 */
export async function batchPayCommissions(
  commissions: Array<{
    commissionId: string;
    amount: number;
    recipientUserId: string;
    companyId: string;
  }>
): Promise<Array<{ commissionId: string; result: TransferResult }>> {
  const results: Array<{ commissionId: string; result: TransferResult }> = [];

  logger.info(`Processing batch payout: ${commissions.length} commissions`);

  for (const commission of commissions) {
    // Add small delay between requests to avoid rate limiting
    if (results.length > 0) {
      await delay(100);
    }

    const result = await payCommission(
      commission.commissionId,
      commission.amount,
      commission.recipientUserId,
      commission.companyId
    );

    results.push({
      commissionId: commission.commissionId,
      result,
    });
  }

  // Log summary
  const successful = results.filter(r => r.result.success).length;
  const failed = results.filter(r => !r.result.success).length;

  logger.info(`Batch payout complete: ${successful} successful, ${failed} failed`);

  return results;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Map HTTP status codes to error codes
 */
function mapHttpErrorCode(status: number, errorData: any): string {
  // Check for specific error codes in response
  if (errorData.code) {
    return errorData.code.toUpperCase();
  }

  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      // Idempotence key conflict - transfer already processed
      return 'DUPLICATE_TRANSFER';
    case 422:
      // Validation error - could be insufficient funds, invalid recipient, etc.
      return 'VALIDATION_ERROR';
    case 429:
      return 'RATE_LIMITED';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'SERVER_ERROR';
    default:
      return `HTTP_${status}`;
  }
}

/**
 * Async delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// EXPORTS
// ============================================================================

export const WhopTransfers = {
  createTransfer,
  payCommission,
  checkPayoutEligibility,
  batchPayCommissions,
};

export default WhopTransfers;
