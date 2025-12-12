// lib/whop/index.ts
/**
 * Whop API Integration Index
 *
 * Exports all Whop API capabilities:
 * - REST API v2 (api-client.ts) - Memberships, Companies, Users
 * - GraphQL (graphql-messaging.ts) - Direct Messages
 * - Push Notifications (notifications.ts) - App notifications
 * - Checkout Sessions (checkout.ts) - Affiliate attribution
 */

// REST API v2 Client
export {
  getCompany,
  getCompanyMemberships,
  getMembership,
  getUser,
  sendDirectMessage,
  getProduct,
  WhopAPI,
} from './api-client';
export type { WhopCompany, WhopMembership, WhopUser, WhopProduct } from './api-client';

// GraphQL Direct Messaging
export {
  sendGraphQLDirectMessage,
  sendWelcomeDM,
  sendCommissionEarnedDM,
  sendTierUpgradeDM,
  sendFirstReferralBonusDM,
} from './graphql-messaging';
export type { GraphQLDMResult } from './graphql-messaging';

// Push Notifications
export {
  sendPushNotification,
  notifyWelcome,
  notifyCommissionEarned,
  notifyTierUpgrade,
  notifyFirstReferral,
  notifyRankChange,
  notifyMilestone,
  notifyAnnouncement,
} from './notifications';
export type { PushNotificationOptions, PushNotificationResult } from './notifications';

// Checkout Sessions
export {
  createCheckoutSession,
  createReferralCheckout,
  generateAffiliateUrl,
  generateAffiliateUrlFromRoute,
} from './checkout';
export type { CheckoutSessionOptions, CheckoutSessionResult } from './checkout';

// Messaging (combines GraphQL DM + REST fallback)
export { sendWelcomeMessage } from './messaging';

// Creator sync utilities
export {
  fetchCreatorDataFromWhop,
  syncCreatorWithWhop,
  syncAllCreatorsWithWhop,
  createCreatorWithWhopData,
} from './sync-creator';
export type { SyncedCreatorData } from './sync-creator';

// Transfers API (Automated Payouts)
export {
  createTransfer,
  payCommission,
  checkPayoutEligibility,
  batchPayCommissions,
  WhopTransfers,
} from './transfers';
export type { TransferOptions, TransferResult, PayoutEligibility } from './transfers';
