/**
 * Whop Webhook Type Definitions
 *
 * Properly typed interfaces for Whop webhook payloads.
 * Replaces `any` types with proper type safety.
 */

/**
 * Base webhook payload structure
 */
export interface WhopWebhookPayload {
  id: string;
  action: WhopWebhookAction;
  data: WhopWebhookData;
  created_at?: string;
}

/**
 * All supported webhook actions
 */
export type WhopWebhookAction =
  | 'membership.went_valid'
  | 'membership.created'
  | 'membership.deleted'
  | 'membership.cancelled'
  | 'payment.succeeded'
  | 'payment.failed'
  | 'payment.refunded'
  | 'app_payment.succeeded'
  | 'app_payment.failed'
  | 'app_payment.refunded'
  | 'app_membership.created'
  | 'app_membership.deleted'
  | 'app_subscription.trial_started'
  | 'app_subscription.trial_ended'
  | 'app_subscription.cancelled'
  | 'subscription.trial_started'
  | 'subscription.trial_ended'
  | 'subscription.cancelled';

/**
 * Common data fields shared across webhook types
 */
export interface WhopWebhookDataBase {
  id?: string;
  membership_id?: string;
  company_id?: string;
  company?: string;
  company_name?: string;
  product_id?: string;
  product?: string;
  user_id?: string;
  user?: string;
  email?: string;
  username?: string;
}

/**
 * Membership webhook data
 * Note: company_id OR company may be present (Whop API inconsistency)
 */
export interface WhopMembershipData extends WhopWebhookDataBase {
  id: string;
  membership_id?: string;
  company_id?: string;  // Made optional since 'company' can be used as fallback
  product_id?: string;
  user_id?: string;
  email?: string;
  username?: string;
  status?: 'active' | 'cancelled' | 'expired';
  valid?: boolean;
  affiliate_username?: string;
}

/**
 * Payment webhook data
 */
export interface WhopPaymentData extends WhopWebhookDataBase {
  id: string;
  membership_id: string;
  company_id: string;
  product_id?: string;
  user_id?: string;
  final_amount: number;
  currency?: string;
  plan_type?: string;
  billing_period?: 'monthly' | 'yearly' | 'weekly' | 'quarterly' | 'lifetime';
  payment_method?: string;
}

/**
 * Refund webhook data
 */
export interface WhopRefundData extends WhopWebhookDataBase {
  id: string;
  payment_id: string;
  amount: number;
  reason?: string;
}

/**
 * Payment failure data
 */
export interface WhopPaymentFailureData extends WhopWebhookDataBase {
  id: string;
  membership_id: string;
  amount: number;
  failure_reason?: string;
  attempt_number?: number;
}

/**
 * Trial data
 */
export interface WhopTrialData extends WhopWebhookDataBase {
  membership_id: string;
  trial_start_date?: string;
  trial_end_date?: string;
}

/**
 * Union type for all possible webhook data types
 */
export type WhopWebhookData =
  | WhopMembershipData
  | WhopPaymentData
  | WhopRefundData
  | WhopPaymentFailureData
  | WhopTrialData;

/**
 * Membership API response from Whop
 */
export interface WhopMembershipApiResponse {
  id: string;
  user_id: string;
  product_id: string;
  company_id: string;
  status: string;
  valid: boolean;
  affiliate_username?: string;
  user?: {
    id: string;
    username?: string;
    email?: string;
  };
  username?: string;
  email?: string;
}

/**
 * Commission calculation result
 */
export interface CommissionCalculation {
  memberShare: number;
  creatorShare: number;
  platformShare: number;
  appliedTier: 'starter' | 'ambassador' | 'elite';
  appliedMemberRate: number;
}

/**
 * Process commission parameters
 */
export interface ProcessCommissionParams {
  referrer: {
    id: string;
    userId: string;
    username: string;
    referralCode: string;
    totalReferred: number;
  };
  saleAmount: number;
  paymentId: string;
  membershipId: string;
  creatorId: string;
  billingPeriod: string | null;
  productType: string;
  paymentType: 'initial' | 'recurring';
}

/**
 * Member data for creation
 */
export interface MemberCreateData {
  userId: string;
  membershipId: string;
  email: string;
  username: string;
  whopUsername: string | null;
  referralCode: string;
  referredBy: string | null;
  whopAffiliateUsername: string | null;
  creatorId: string;
  memberOrigin: 'organic' | 'whop_affiliate' | 'direct_link';
  subscriptionPrice?: number;
  billingPeriod?: string | null;
  monthlyValue?: number;
}

/**
 * Webhook handler result
 */
export interface WebhookHandlerResult {
  ok: boolean;
  message?: string;
  error?: string;
  memberId?: string;
  referralCode?: string;
  memberOrigin?: string;
  affiliateUsername?: string | null;
  commissionId?: string;
  skipped?: boolean;
  reason?: string;
  // Refund-specific fields
  refundAmount?: number;
  memberShareReversed?: number;
  creatorShareReversed?: number;
}

/**
 * Type guard to check if data is payment data
 */
export function isPaymentData(data: WhopWebhookData): data is WhopPaymentData {
  return 'final_amount' in data && typeof data.final_amount === 'number';
}

/**
 * Type guard to check if data is refund data
 */
export function isRefundData(data: WhopWebhookData): data is WhopRefundData {
  return 'payment_id' in data && 'amount' in data;
}

/**
 * Type guard to check if data is membership data
 */
export function isMembershipData(data: WhopWebhookData): data is WhopMembershipData {
  return 'membership_id' in data || ('id' in data && !('final_amount' in data) && !('payment_id' in data));
}
