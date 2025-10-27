// lib/utils/commission.ts

/**
 * Calculate commission splits: 10% member, 70% creator, 20% platform
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

  // Calculate splits with proper rounding
  const memberShare = Number((saleAmount * 0.10).toFixed(2));   // 10%
  const creatorShare = Number((saleAmount * 0.70).toFixed(2));  // 70%
  const platformShare = Number((saleAmount * 0.20).toFixed(2)); // 20%

  return {
    memberShare,
    creatorShare,
    platformShare,
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
