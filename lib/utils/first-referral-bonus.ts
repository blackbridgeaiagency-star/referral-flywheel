// lib/utils/first-referral-bonus.ts

/**
 * First Referral Bonus Configuration
 *
 * BUSINESS RULES:
 * - One-time bonus for FIRST successful referral
 * - Comes from platform's 20% share (doesn't affect creator's 70%)
 * - Confirmed after 30-day refund window
 * - Revoked if referral refunds
 */

export const FIRST_REFERRAL_BONUS_CONFIG = {
  // Bonus type: 'fixed' = flat amount, 'matched' = match commission, 'percentage' = % of commission
  BONUS_TYPE: 'fixed' as 'fixed' | 'matched' | 'percentage',

  // Fixed bonus amount ($5)
  FIXED_AMOUNT: 5.00,

  // If using percentage of first commission (50% = double their first commission)
  PERCENTAGE_OF_COMMISSION: 0.50,

  // Maximum bonus (cap for matched/percentage)
  MAX_BONUS: 10.00,

  // Minimum commission to qualify for bonus
  MIN_COMMISSION_TO_QUALIFY: 1.00,

  // Days to wait before confirming (refund window)
  CONFIRMATION_WINDOW_DAYS: 30,
} as const;

export type BonusStatus =
  | 'pending_confirmation'  // Referral made, waiting for refund window
  | 'confirmed'            // Refund window passed, ready to pay
  | 'paid'                 // Bonus paid out
  | 'revoked'              // Referral refunded, bonus revoked
  | 'ineligible';          // Not their first referral

export interface FirstReferralBonusResult {
  bonusAmount: number;
  bonusType: string;
  status: BonusStatus;
  confirmAt: Date;
  message: string;
}

/**
 * Calculate first referral bonus amount based on configuration
 */
export function calculateFirstReferralBonus(commissionAmount: number): number {
  const config = FIRST_REFERRAL_BONUS_CONFIG;

  switch (config.BONUS_TYPE) {
    case 'fixed':
      return config.FIXED_AMOUNT;

    case 'matched':
      // Match their first commission, up to max
      return Math.min(commissionAmount, config.MAX_BONUS);

    case 'percentage':
      // Percentage of their first commission, up to max
      const percentBonus = commissionAmount * config.PERCENTAGE_OF_COMMISSION;
      return Math.min(percentBonus, config.MAX_BONUS);

    default:
      return config.FIXED_AMOUNT;
  }
}

/**
 * Get confirmation date (30 days from now)
 */
export function getConfirmationDate(): Date {
  const confirmAt = new Date();
  confirmAt.setDate(confirmAt.getDate() + FIRST_REFERRAL_BONUS_CONFIG.CONFIRMATION_WINDOW_DAYS);
  return confirmAt;
}

/**
 * Check if commission amount qualifies for first referral bonus
 */
export function isEligibleForBonus(commissionAmount: number): boolean {
  return commissionAmount >= FIRST_REFERRAL_BONUS_CONFIG.MIN_COMMISSION_TO_QUALIFY;
}

/**
 * Format bonus status for display
 */
export function formatBonusStatus(status: BonusStatus): {
  label: string;
  color: string;
  icon: string;
} {
  const statusMap: Record<BonusStatus, { label: string; color: string; icon: string }> = {
    pending_confirmation: {
      label: 'Pending',
      color: 'yellow',
      icon: 'Clock',
    },
    confirmed: {
      label: 'Confirmed',
      color: 'green',
      icon: 'CheckCircle',
    },
    paid: {
      label: 'Paid',
      color: 'green',
      icon: 'DollarSign',
    },
    revoked: {
      label: 'Revoked',
      color: 'red',
      icon: 'XCircle',
    },
    ineligible: {
      label: 'Not Eligible',
      color: 'gray',
      icon: 'MinusCircle',
    },
  };

  return statusMap[status];
}
