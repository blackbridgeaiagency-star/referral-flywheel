// lib/utils/earnings-calculator.ts

/**
 * Earnings Calculator Utility
 *
 * Calculates projected earnings based on referral counts to motivate members.
 * Uses tiered commission rates and real community pricing data.
 *
 * Key psychological framing:
 * - Show lifetime value, not just percentage
 * - Highlight "membership pays for itself" breakpoint
 * - Use concrete dollar amounts
 */

import { COMMISSION_TIERS, getCommissionTier, CommissionTierName } from './tiered-commission';

export interface CalculatorInput {
  avgSubscriptionPrice: number;      // Average price in the community
  userSubscriptionPrice?: number;    // What the user pays (for break-even calc)
  retentionRate?: number;            // Assume 1.0 (100%) if not provided
}

export interface EarningsProjection {
  referralCount: number;
  tier: CommissionTierName;
  commissionRate: number;
  monthlyEarnings: number;
  yearlyEarnings: number;
  paysForMembership: boolean;
  monthsToPayOff: number | null;
  surplusPerMonth: number;           // How much extra after membership is covered
}

/**
 * Calculate projected earnings for a specific referral count
 */
export function calculateEarningsProjection(
  referralCount: number,
  input: CalculatorInput
): EarningsProjection {
  const {
    avgSubscriptionPrice,
    userSubscriptionPrice = avgSubscriptionPrice,
    retentionRate = 1.0
  } = input;

  // Get tier and commission rate for this referral count
  const tier = getCommissionTier(referralCount);

  // Monthly earnings = referrals * avg price * retention * commission rate
  const monthlyEarnings = Number(
    (referralCount * avgSubscriptionPrice * retentionRate * tier.memberRate).toFixed(2)
  );

  // Yearly earnings (assuming stable referrals)
  const yearlyEarnings = Number((monthlyEarnings * 12).toFixed(2));

  // Does it pay for membership?
  const paysForMembership = monthlyEarnings >= userSubscriptionPrice;

  // How many months to cover membership cost (if starting from current referrals)
  const monthsToPayOff = monthlyEarnings > 0
    ? Math.ceil(userSubscriptionPrice / monthlyEarnings)
    : null;

  // Surplus after membership is covered
  const surplusPerMonth = paysForMembership
    ? Number((monthlyEarnings - userSubscriptionPrice).toFixed(2))
    : 0;

  return {
    referralCount,
    tier: tier.tierName,
    commissionRate: tier.memberRate,
    monthlyEarnings,
    yearlyEarnings,
    paysForMembership,
    monthsToPayOff,
    surplusPerMonth,
  };
}

/**
 * Get the break-even referral count (where membership pays for itself)
 */
export function getBreakEvenReferrals(input: CalculatorInput): number {
  const { avgSubscriptionPrice, userSubscriptionPrice = avgSubscriptionPrice } = input;
  const baseRate = COMMISSION_TIERS[0].memberRate; // Start with bronze rate (10%)

  // Break-even: referrals * avgPrice * rate >= userPrice
  // referrals >= userPrice / (avgPrice * rate)
  return Math.ceil(userSubscriptionPrice / (avgSubscriptionPrice * baseRate));
}

/**
 * Generate projection table for key milestones
 */
export function generateProjectionTable(
  input: CalculatorInput,
  maxReferrals: number = 100
): EarningsProjection[] {
  // Key milestones aligned with tier thresholds
  const milestones = [1, 3, 5, 10, 15, 25, 35, 50, 75, 100].filter(n => n <= maxReferrals);

  return milestones.map(count => calculateEarningsProjection(count, input));
}

/**
 * Get motivational message based on current state
 */
export function getMotivationalMessage(
  currentReferrals: number,
  input: CalculatorInput
): {
  type: 'success' | 'close' | 'building' | 'start';
  title: string;
  subtitle: string;
} {
  const projection = calculateEarningsProjection(currentReferrals, input);
  const breakEven = getBreakEvenReferrals(input);
  const referralsToBreakEven = breakEven - currentReferrals;

  if (projection.paysForMembership) {
    return {
      type: 'success',
      title: 'FREE Membership!',
      subtitle: `Plus $${projection.surplusPerMonth.toFixed(0)}/mo profit`,
    };
  }

  if (referralsToBreakEven <= 2) {
    return {
      type: 'close',
      title: 'Almost There!',
      subtitle: `Just ${referralsToBreakEven} more referral${referralsToBreakEven === 1 ? '' : 's'} to break even`,
    };
  }

  if (currentReferrals > 0) {
    return {
      type: 'building',
      title: 'Building Momentum',
      subtitle: `${referralsToBreakEven} referrals to free membership`,
    };
  }

  return {
    type: 'start',
    title: 'Start Earning',
    subtitle: `${breakEven} referrals = free membership`,
  };
}

/**
 * Format earnings for psychological impact
 * Uses framing that emphasizes value
 */
export function formatEarningsDisplay(projection: EarningsProjection): {
  monthly: string;
  yearly: string;
  perReferral: string;
  lifetimeValue: string;
} {
  const perReferral = projection.referralCount > 0
    ? projection.monthlyEarnings / projection.referralCount
    : 0;

  // Assume 2-year average lifetime for "lifetime value" display
  const avgLifetimeMonths = 24;
  const lifetimeValue = projection.monthlyEarnings * avgLifetimeMonths;

  return {
    monthly: `$${projection.monthlyEarnings.toFixed(0)}/mo`,
    yearly: `$${projection.yearlyEarnings.toFixed(0)}/yr`,
    perReferral: `$${perReferral.toFixed(2)}/mo per referral`,
    lifetimeValue: `$${lifetimeValue.toFixed(0)} potential lifetime earnings`,
  };
}

/**
 * Calculate "what if" scenarios for the calculator UI
 */
export function calculateWhatIfScenarios(
  currentReferrals: number,
  input: CalculatorInput
): {
  current: EarningsProjection;
  plus5: EarningsProjection;
  plus10: EarningsProjection;
  double: EarningsProjection;
} {
  return {
    current: calculateEarningsProjection(currentReferrals, input),
    plus5: calculateEarningsProjection(currentReferrals + 5, input),
    plus10: calculateEarningsProjection(currentReferrals + 10, input),
    double: calculateEarningsProjection(Math.max(currentReferrals * 2, 1), input),
  };
}
