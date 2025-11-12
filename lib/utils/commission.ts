// lib/utils/commission.ts

/**
 * Calculate commission and tracking metrics
 *
 * BUSINESS MODEL (V1 Launch):
 * - Platform fee: 10% of referred sales (what we charge creators)
 * - Member rewards: Creator decides (we suggest ~10%, tracked but not paid by us)
 * - Creator keeps: 90% - whatever they choose to reward members
 *
 * NOTE: memberShare and creatorShare are tracked for analytics/suggestions,
 * but actual member payments are handled by creators themselves.
 *
 * @throws {Error} If sale amount is negative or exceeds maximum allowed
 */
export function calculateCommission(saleAmount: number) {
  // ========================================
  // P0 CRITICAL: Input Validation
  // ========================================
  if (saleAmount < 0) {
    throw new Error('Sale amount cannot be negative');
  }

  if (saleAmount > 1000000) {
    throw new Error('Sale amount exceeds maximum allowed ($1,000,000)');
  }

  if (!Number.isFinite(saleAmount)) {
    throw new Error('Sale amount must be a valid number');
  }

  // Platform fee: 10% (what we actually charge)
  const platformShare = Number((saleAmount * 0.10).toFixed(2)); // 10%

  // Suggested member reward: 10% (tracked for analytics, not auto-paid)
  const memberShare = Number((saleAmount * 0.10).toFixed(2));   // 10% (suggested)

  // Creator keeps: 90% minus whatever they choose to reward
  // We show 80% assuming they follow our 10% suggestion
  const creatorShare = Number((saleAmount * 0.80).toFixed(2));  // 80%

  return {
    memberShare,      // Suggested member reward (for tracking/reports)
    creatorShare,     // What creator keeps after both fees
    platformShare,    // What we charge (10%)
    total: memberShare + creatorShare + platformShare,
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}
