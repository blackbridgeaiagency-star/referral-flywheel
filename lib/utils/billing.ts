/**
 * Billing Period Utilities
 * Handles monthly value calculations for different subscription types
 */

export type BillingPeriod = 'monthly' | 'annual' | 'lifetime' | null;
export type ProductType = 'subscription' | 'one_time' | 'course';

/**
 * Calculate monthly recurring value based on billing period
 *
 * @param saleAmount - The full payment amount
 * @param billingPeriod - monthly, annual, lifetime, or null
 * @returns Monthly value for MRR calculations
 *
 * Examples:
 * - Monthly $49.99 → $49.99/month
 * - Annual $499 → $41.58/month ($499/12)
 * - Lifetime $999 → $999 (one-time, added to total but not MRR)
 */
export function calculateMonthlyValue(
  saleAmount: number,
  billingPeriod: BillingPeriod
): number | null {
  if (!billingPeriod) {
    // One-time purchases have no monthly value
    return null;
  }

  switch (billingPeriod) {
    case 'monthly':
      // Monthly subscriptions: use full amount
      return saleAmount;

    case 'annual':
      // Annual subscriptions: divide by 12 for MRR
      return saleAmount / 12;

    case 'lifetime':
      // Lifetime: Add to total revenue but not to MRR
      // Return null to indicate no recurring monthly value
      return null;

    default:
      console.warn(`Unknown billing period: ${billingPeriod}`);
      return null;
  }
}

/**
 * Determine if a payment should be tracked in the referral system
 * Only subscription payments (not one-time products)
 *
 * @param productType - subscription, one_time, course
 * @param membershipId - Whop membership ID (only present for subscriptions)
 * @param billingPeriod - monthly, annual, lifetime
 * @returns true if should be tracked
 */
export function isSubscriptionPayment(
  productType?: string,
  membershipId?: string,
  billingPeriod?: string
): boolean {
  // Check 1: productType is explicitly "subscription"
  if (productType === 'subscription') {
    return true;
  }

  // Check 2: Has membership_id (Whop only provides this for subscriptions)
  if (membershipId) {
    return true;
  }

  // Check 3: Has billing_period (only subscriptions have this)
  if (billingPeriod && ['monthly', 'annual', 'lifetime'].includes(billingPeriod)) {
    return true;
  }

  // Default: Not a subscription
  return false;
}

/**
 * Normalize billing period string from Whop
 * Whop might send variations, we normalize to our standard format
 */
export function normalizeBillingPeriod(period?: string): BillingPeriod {
  if (!period) return null;

  const normalized = period.toLowerCase().trim();

  if (normalized.includes('month')) return 'monthly';
  if (normalized.includes('annual') || normalized.includes('year')) return 'annual';
  if (normalized.includes('lifetime') || normalized.includes('forever')) return 'lifetime';

  return null;
}

/**
 * Get human-readable description of billing period
 */
export function getBillingPeriodLabel(period: BillingPeriod): string {
  switch (period) {
    case 'monthly':
      return 'Monthly subscription';
    case 'annual':
      return 'Annual subscription';
    case 'lifetime':
      return 'Lifetime access';
    default:
      return 'One-time purchase';
  }
}

/**
 * Calculate how this payment affects MRR
 *
 * @param saleAmount - Full payment amount
 * @param billingPeriod - Billing period
 * @param paymentType - initial or recurring
 * @returns Object with MRR impact details
 */
export function calculateMRRImpact(
  saleAmount: number,
  billingPeriod: BillingPeriod,
  paymentType: 'initial' | 'recurring'
) {
  const monthlyValue = calculateMonthlyValue(saleAmount, billingPeriod);

  return {
    // Add to total revenue?
    addToTotalRevenue: true,

    // Add to MRR? (only if has monthly value AND is initial payment)
    addToMRR: monthlyValue !== null && paymentType === 'initial',

    // Monthly value for MRR calc
    monthlyValue,

    // Human-readable impact
    description: monthlyValue
      ? `+$${monthlyValue.toFixed(2)}/month to MRR`
      : 'One-time revenue (no MRR impact)',
  };
}
