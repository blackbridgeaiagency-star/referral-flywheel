// lib/utils/commission.ts

import { BASE_RATES, COMMISSION_LIMITS } from '../constants/commission';

// Re-export formatCurrency from the SINGLE SOURCE OF TRUTH
// This maintains backwards compatibility for existing imports
export { formatCurrency } from '../constants/metrics';

/**
 * Calculate commission splits (10/70/20 model)
 *
 * BUSINESS MODEL:
 * - Member commission: 10% of sale (lifetime recurring to referrer)
 * - Creator keeps: 70% of sale
 * - Platform fee: 20% of sale (what we charge creators)
 *
 * Total: 10% + 70% + 20% = 100%
 *
 * NOTE: This uses BASE_RATES from lib/constants/commission.ts (SSOT)
 * For tiered commission rates, use calculateTieredCommission from tiered-commission.ts
 *
 * @throws {Error} If sale amount is negative or exceeds maximum allowed
 */
export function calculateCommission(saleAmount: number) {
  // ========================================
  // P0 CRITICAL: Input Validation (uses constants from SSOT)
  // ========================================
  if (saleAmount < 0) {
    throw new Error('Sale amount cannot be negative');
  }

  if (saleAmount > COMMISSION_LIMITS.MAX_SALE_AMOUNT) {
    throw new Error(`Sale amount exceeds maximum allowed ($${COMMISSION_LIMITS.MAX_SALE_AMOUNT.toLocaleString()})`);
  }

  if (!Number.isFinite(saleAmount)) {
    throw new Error('Sale amount must be a valid number');
  }

  // Member commission: 10% (lifetime recurring to referrer)
  const memberShare = Number((saleAmount * BASE_RATES.MEMBER).toFixed(2));

  // Creator keeps: 70%
  const creatorShare = Number((saleAmount * BASE_RATES.CREATOR).toFixed(2));

  // Platform fee: 20% (what we charge)
  const platformShare = Number((saleAmount * BASE_RATES.PLATFORM).toFixed(2));

  return {
    memberShare,      // 10% to referring member
    creatorShare,     // 70% to creator
    platformShare,    // 20% to platform
    total: memberShare + creatorShare + platformShare,
  };
}
