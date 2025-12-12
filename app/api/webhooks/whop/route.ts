// app/api/webhooks/whop/route.ts
// Strategy B: Whop-Native Attribution
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '../../../../lib/db/prisma';
import { generateReferralCode } from '../../../../lib/utils/referral-code';
import { calculateCommission } from '../../../../lib/utils/commission';
import { calculateTieredCommission, getTierInfo } from '../../../../lib/utils/tiered-commission';
import { sendWelcomeMessage } from '../../../../lib/whop/messaging';
import { withRetry } from '../../../../lib/utils/webhook-retry';
import { withRateLimit } from '../../../../lib/security/rate-limit-utils';
import { updateMemberRankings } from '../../../../lib/utils/rank-updater';
import logger from '../../../../lib/logger';
import {
  isSubscriptionPayment,
  normalizeBillingPeriod,
  calculateMonthlyValue,
} from '../../../../lib/utils/billing';
import type {
  WhopWebhookPayload,
  WhopPaymentData,
  WhopMembershipData,
  WhopRefundData,
  WebhookHandlerResult,
} from '../../../../types/whop-webhooks';

// Type for webhook event from database
interface WebhookEventRecord {
  id: string;
  eventType: string;
  whopEventId: string | null;
  payload: unknown;
  processed: boolean;
}

// Type for member with creator relation
interface MemberWithCreator {
  id: string;
  userId: string;
  username: string;
  referralCode: string;
  referredBy: string | null;
  whopAffiliateUsername: string | null;
  creatorId: string;
  subscriptionPrice: number;
  totalReferred: number;
  creator: {
    id: string;
    companyId: string;
    companyName: string;
    defaultSubscriptionPrice: number;
  } | null;
}
// NEW: Push notifications for key events
import {
  notifyWelcome,
  notifyCommissionEarned,
  notifyTierUpgrade,
  notifyFirstReferral,
  notifyMilestone,
  notifyPaymentProcessed,
} from '../../../../lib/whop/notifications';
// NEW: GraphQL DMs for personal messages
import {
  sendTierUpgradeDM,
  sendFirstReferralBonusDM,
  sendCommissionEarnedDM,
  sendMilestoneDM,
  sendPaymentProcessedDM,
} from '../../../../lib/whop/graphql-messaging';
// NEW: Transfers API for automated payouts
import { payCommission as payCommissionTransfer, checkPayoutEligibility } from '../../../../lib/whop/transfers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Whop API configuration
const WHOP_API_KEY = process.env.WHOP_API_KEY;
const WHOP_API_BASE = 'https://api.whop.com/api/v2';

export async function POST(request: NextRequest) {
  return withRateLimit(request, async () => {
    let webhookEvent: WebhookEventRecord | null = null;

    try {
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 1. VALIDATE WEBHOOK SIGNATURE
      // SECURITY: Always require signature verification - no bypass allowed
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const body = await request.text();
      const signature = request.headers.get('whop-signature');
      const secret = process.env.WHOP_WEBHOOK_SECRET;

      // SECURITY: Reject if webhook secret is not configured
      if (!secret) {
        logger.error('[SECURITY] WHOP_WEBHOOK_SECRET not configured - rejecting webhook');
        return NextResponse.json(
          { error: 'Webhook secret not configured' },
          { status: 500 }
        );
      }

      // SECURITY: Reject if signature is missing
      if (!signature) {
        logger.error('[SECURITY] Missing webhook signature - rejecting request');
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
      }

      // Verify signature
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');

      if (signature !== expectedSignature) {
        logger.error('[SECURITY] Invalid webhook signature - rejecting request');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }

      const payload = JSON.parse(body);

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 1.5. REPLAY ATTACK PREVENTION - Check webhook timestamp
      // SECURITY: Reject webhooks older than 5 minutes to prevent replay attacks
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const eventTimestamp = payload.created_at || payload.timestamp;
      if (eventTimestamp) {
        const eventTime = new Date(eventTimestamp);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        if (eventTime < fiveMinutesAgo) {
          logger.warn(`[SECURITY] Webhook timestamp too old: ${eventTimestamp} - possible replay attack`);
          return NextResponse.json(
            { error: 'Event too old' },
            { status: 400 }
          );
        }
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 2. LOG EVERY WEBHOOK EVENT
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      webhookEvent = await prisma.webhookEvent.create({
        data: {
          eventType: payload.action,
          whopEventId: payload.id || null,
          payload: payload,
          processed: false,
        },
      });

      logger.webhook(`Webhook received: ${payload.action} (ID: ${webhookEvent.id})`);

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 3. ROUTE TO APPROPRIATE HANDLER
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      let result;

      switch (payload.action) {
        case 'membership.went_valid':
          // NEW: This is the key event for Strategy B
          result = await handleMembershipWentValid(payload.data, webhookEvent.id);
          break;

        case 'app_payment.succeeded':
        case 'payment.succeeded':
          result = await handlePaymentSucceeded(payload.data, webhookEvent.id);
          break;

        case 'app_payment.failed':
        case 'payment.failed':
          result = await handlePaymentFailed(payload.data, webhookEvent.id);
          break;

        case 'app_payment.refunded':
        case 'payment.refunded':
          result = await handlePaymentRefunded(payload.data, webhookEvent.id);
          break;

        case 'app_membership.created':
        case 'membership.created':
          result = await handleMembershipCreated(payload.data, webhookEvent.id);
          break;

        case 'app_membership.deleted':
        case 'membership.deleted':
        case 'membership.cancelled':
          result = await handleMembershipDeleted(payload.data, webhookEvent.id);
          break;

        case 'app_subscription.trial_started':
        case 'subscription.trial_started':
          result = await handleTrialStarted(payload.data, webhookEvent.id);
          break;

        case 'app_subscription.trial_ended':
        case 'subscription.trial_ended':
          result = await handleTrialEnded(payload.data, webhookEvent.id);
          break;

        case 'app_subscription.cancelled':
        case 'subscription.cancelled':
          result = await handleSubscriptionCancelled(payload.data, webhookEvent.id);
          break;

        default:
          logger.warn(`Unhandled webhook type: ${payload.action}`);
          result = { ok: true, message: 'Event logged but not processed' };
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 4. MARK WEBHOOK AS PROCESSED
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          processed: true,
          processedAt: new Date(),
        },
      });

      return NextResponse.json(result);

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Webhook processing error:', error);

      if (webhookEvent) {
        await prisma.webhookEvent.update({
          where: { id: webhookEvent.id },
          data: {
            errorMessage: errorMessage,
            retryCount: { increment: 1 },
          },
        }).catch(err => logger.error('Failed to log error:', err));
      }

      return NextResponse.json(
        { error: 'Webhook processing failed' },
        { status: 500 }
      );
    }
  }, 'WEBHOOK');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STRATEGY B: Fetch membership details from Whop API
// Returns: { affiliateUsername, memberUsername } - both auto-fetched!
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface MembershipDetails {
  affiliateUsername: string | null;
  memberUsername: string | null;
  memberEmail: string | null;
}

async function fetchMembershipDetails(membershipId: string): Promise<MembershipDetails> {
  const result: MembershipDetails = {
    affiliateUsername: null,
    memberUsername: null,
    memberEmail: null,
  };

  if (!WHOP_API_KEY) {
    logger.error('WHOP_API_KEY not configured');
    return result;
  }

  try {
    const response = await fetch(
      `${WHOP_API_BASE}/memberships/${membershipId}`,
      {
        headers: {
          'Authorization': `Bearer ${WHOP_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      logger.error(`Failed to fetch membership ${membershipId}: ${response.status}`);
      return result;
    }

    const data = await response.json();

    // Get affiliate who referred this member
    result.affiliateUsername = data.affiliate_username || null;

    // Get the member's OWN Whop username (for their future affiliate links)
    // Whop API returns user object with username
    result.memberUsername = data.user?.username || data.username || null;
    result.memberEmail = data.user?.email || data.email || null;

    if (result.affiliateUsername) {
      logger.info(`Found affiliate: ${result.affiliateUsername} for membership ${membershipId}`);
    }
    if (result.memberUsername) {
      logger.info(`Found member username: ${result.memberUsername} (auto-fetched from Whop API)`);
    }

    return result;

  } catch (error) {
    logger.error('Error fetching membership details:', error);
    return result;
  }
}

// Legacy function for backward compatibility
async function fetchAffiliateUsername(membershipId: string): Promise<string | null> {
  const details = await fetchMembershipDetails(membershipId);
  return details.affiliateUsername;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NEW HANDLER: membership.went_valid (Strategy B key event)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handleMembershipWentValid(data: WhopMembershipData, webhookEventId: string): Promise<WebhookHandlerResult> {
  logger.info('Processing membership.went_valid (Strategy B)...');

  const membershipId = data.id || data.membership_id;

  if (!membershipId) {
    logger.error('Missing membership_id in webhook data');
    return { ok: false, error: 'Missing membership_id' };
  }

  // Check if member already exists
  let member = await prisma.member.findUnique({
    where: { membershipId },
  });

  if (member) {
    // Member exists - might need to update affiliate info
    logger.info(`Member already exists: ${member.referralCode}`);

    // If member doesn't have affiliate attribution yet, try to fetch it
    if (!member.whopAffiliateUsername) {
      const affiliateUsername = await fetchAffiliateUsername(membershipId);
      if (affiliateUsername) {
        // Find the referrer by their whopUsername
        const referrer = await prisma.member.findUnique({
          where: { whopUsername: affiliateUsername },
        });

        if (referrer) {
          await prisma.member.update({
            where: { id: member.id },
            data: {
              whopAffiliateUsername: affiliateUsername,
              referredBy: referrer.referralCode,
              memberOrigin: 'whop_affiliate',
            },
          });
          logger.info(`Updated member ${member.referralCode} with affiliate: ${affiliateUsername}`);
        }
      }
    }

    return { ok: true, message: 'Member already exists' };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // NEW MEMBER - Auto-fetch ALL details from Whop API
  // This gets both: who referred them AND their own Whop username
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const membershipDetails = await fetchMembershipDetails(membershipId);
  const affiliateUsername = membershipDetails.affiliateUsername;
  const autoFetchedWhopUsername = membershipDetails.memberUsername;

  // Find referrer if affiliate exists
  let referrer = null;
  let referredByCode = null;
  let memberOrigin = 'organic';

  if (affiliateUsername) {
    referrer = await prisma.member.findUnique({
      where: { whopUsername: affiliateUsername },
    });

    if (referrer) {
      referredByCode = referrer.referralCode;
      memberOrigin = 'whop_affiliate';
      logger.info(`Attribution found: ${affiliateUsername} -> ${referredByCode}`);
    } else {
      // Affiliate username found but no matching member
      // This could be a direct Whop affiliate (not through our app)
      memberOrigin = 'whop_affiliate';
      logger.warn(`Affiliate ${affiliateUsername} not found in our system`);
    }
  }

  // Get or create creator
  const rawCompanyId = data.company_id || data.company;

  if (!rawCompanyId) {
    logger.error('Missing company_id in webhook data');
    return { ok: false, error: 'Missing company_id' };
  }

  // TypeScript narrowing: companyId is now guaranteed to be string
  const companyId: string = rawCompanyId;

  let creator = await prisma.creator.findUnique({
    where: { companyId },
  });

  if (!creator) {
    creator = await prisma.creator.create({
      data: {
        companyId,
        companyName: data.company_name || 'Community',
        productId: data.product_id || data.product || 'unknown',
      },
    });
  }

  // Generate referral code
  const referralCode = generateReferralCode();

  // Extract user info - prefer auto-fetched from API over webhook data
  const userId = data.user_id || data.user || `user_${membershipId}`;
  // SECURITY FIX (M4-SEC): Use crypto-random temp email instead of predictable pattern
  const tempEmailId = crypto.randomBytes(16).toString('hex');
  const email = membershipDetails.memberEmail || data.email || `pending-${tempEmailId}@temp.referralflywheel.com`;
  const username = autoFetchedWhopUsername || data.username || email.split('@')[0];

  // whopUsername is CRITICAL for Strategy B - auto-fetched from Whop API!
  const whopUsername = autoFetchedWhopUsername || data.username || null;

  if (whopUsername) {
    logger.info(`✅ Auto-captured Whop username: ${whopUsername} (no manual entry needed!)`);
  } else {
    logger.warn(`⚠️ Could not auto-fetch Whop username for ${membershipId}`);
  }

  // Create member
  member = await prisma.member.create({
    data: {
      userId,
      membershipId,
      email,
      username,
      whopUsername, // AUTO-FETCHED from Whop API - no manual entry needed!
      referralCode,
      referredBy: referredByCode,
      whopAffiliateUsername: affiliateUsername,
      creatorId: creator.id,
      memberOrigin,
      subscriptionPrice: 49.99, // Will be updated on payment
    },
  });

  logger.info(`Member created: ${referralCode} (${memberOrigin})`);

  // Create lifecycle record
  await prisma.memberLifecycle.create({
    data: {
      memberId: member.id,
      convertedAt: new Date(),
      currentStatus: 'active',
    },
  });

  // Send welcome message via DM
  await sendWelcomeMessage(member, creator);
  await prisma.member.update({
    where: { id: member.id },
    data: { welcomeMessageSent: true },
  });

  // NEW: Send push notification for welcome (non-blocking)
  notifyWelcome(companyId, userId, member.username).catch(err =>
    logger.error('Failed to send welcome push notification:', err)
  );

  return {
    ok: true,
    memberId: member.id,
    referralCode,
    memberOrigin,
    affiliateUsername,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HANDLER: Payment Succeeded
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handlePaymentSucceeded(data: WhopPaymentData, webhookEventId: string): Promise<WebhookHandlerResult> {
  logger.info('Processing payment.succeeded...');

  if (!data || !data.membership_id || !data.company_id || !data.id) {
    logger.error('Missing required webhook data:', { data });
    return { ok: false, error: 'Missing required webhook data' };
  }

  // TypeScript narrowing: Extract validated fields
  const validatedCompanyId: string = data.company_id;
  const validatedPaymentId: string = data.id;
  const validatedMembershipId: string = data.membership_id;

  // Subscription filter
  const isSubscription = isSubscriptionPayment(
    data.plan_type,
    data.membership_id,
    data.billing_period
  );

  if (!isSubscription) {
    logger.debug('Skipping non-subscription payment');
    return { ok: true, skipped: true, reason: 'Not a subscription payment' };
  }

  const billingPeriod = normalizeBillingPeriod(data.billing_period);

  // Idempotency check
  const existingCommission = await prisma.commission.findUnique({
    where: { whopPaymentId: data.id },
  });

  if (existingCommission) {
    logger.debug(`Payment ${data.id} already processed (idempotent)`);
    return { ok: true, message: 'Payment already processed', commissionId: existingCommission.id };
  }

  // Find existing member
  const existingMember = await prisma.member.findUnique({
    where: { membershipId: data.membership_id },
    include: { creator: true },
  });

  if (existingMember) {
    // Existing member - process recurring or update initial payment
    await handleMemberPayment(existingMember, data, billingPeriod);
    return { ok: true };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // NEW MEMBER from payment (fallback if membership.went_valid didn't fire)
  // Auto-fetch ALL details from Whop API (Strategy B)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  logger.info('Creating member from payment webhook (fallback)...');

  // Fetch FULL membership details from Whop API (Strategy B)
  // This gets both: who referred them AND their own Whop username
  const membershipDetails = await fetchMembershipDetails(data.membership_id);
  const affiliateUsername = membershipDetails.affiliateUsername;
  const autoFetchedWhopUsername = membershipDetails.memberUsername;

  // Find referrer
  let referrer = null;
  let referredByCode: string | null = null;
  let memberOrigin = 'organic';

  if (affiliateUsername) {
    referrer = await prisma.member.findUnique({
      where: { whopUsername: affiliateUsername },
    });

    if (referrer) {
      referredByCode = referrer.referralCode;
      memberOrigin = 'whop_affiliate';
    } else {
      memberOrigin = 'whop_affiliate';
    }
  }

  // Get or create creator
  let creator = await prisma.creator.findUnique({
    where: { companyId: validatedCompanyId },
  });

  if (!creator) {
    creator = await prisma.creator.create({
      data: {
        companyId: validatedCompanyId,
        companyName: data.company_name || 'Community',
        productId: data.product_id || 'unknown',
      },
    });
  }

  const referralCode = generateReferralCode();
  const subscriptionPrice = data.final_amount ? data.final_amount / 100 : 49.99;
  const memberMonthlyValue = calculateMonthlyValue(subscriptionPrice, billingPeriod as any);

  // Prefer auto-fetched username from API over webhook data
  let username = 'user';
  if (autoFetchedWhopUsername) {
    username = autoFetchedWhopUsername;
  } else if (data.username) {
    username = data.username;
  } else if (data.email) {
    username = data.email.split('@')[0];
  }

  // whopUsername is CRITICAL for Strategy B - auto-fetched from Whop API!
  const whopUsername = autoFetchedWhopUsername || data.username || null;

  if (whopUsername) {
    logger.info(`Auto-captured Whop username (fallback): ${whopUsername}`);
  } else {
    logger.warn(`Could not auto-fetch Whop username for ${data.membership_id}`);
  }

  // SECURITY FIX (M4-SEC): Use crypto-random temp email instead of predictable pattern
  const fallbackTempEmailId = crypto.randomBytes(16).toString('hex');
  const fallbackEmail = membershipDetails.memberEmail || data.email || `pending-${fallbackTempEmailId}@temp.referralflywheel.com`;

  const newMember = await prisma.member.create({
    data: {
      userId: data.user_id || `user_${Date.now()}`,
      membershipId: data.membership_id,
      email: fallbackEmail,
      username,
      whopUsername, // AUTO-FETCHED from Whop API - no manual entry needed!
      referralCode,
      referredBy: referredByCode,
      whopAffiliateUsername: affiliateUsername,
      creatorId: creator.id,
      subscriptionPrice,
      memberOrigin,
      billingPeriod,
      monthlyValue: memberMonthlyValue,
    },
  });

  // Create lifecycle
  await prisma.memberLifecycle.create({
    data: {
      memberId: newMember.id,
      convertedAt: new Date(),
      currentStatus: 'active',
      lifetimeValue: subscriptionPrice,
      netValue: subscriptionPrice,
    },
  });

  logger.info(`Member created from payment: ${referralCode} (${memberOrigin})`);

  // Process commission if referred
  if (referrer && data.final_amount) {
    await processCommission({
      referrer,
      saleAmount: data.final_amount / 100,
      paymentId: data.id,
      membershipId: data.membership_id,
      creatorId: creator.id,
      billingPeriod,
      productType: data.plan_type || 'subscription',
      paymentType: 'initial',
    });
  }

  // Send welcome message
  await sendWelcomeMessage(newMember, creator);
  await prisma.member.update({
    where: { id: newMember.id },
    data: { welcomeMessageSent: true },
  });

  return { ok: true };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPER: Process member payment (initial or recurring)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handleMemberPayment(
  member: MemberWithCreator,
  data: WhopPaymentData,
  billingPeriod: string | null
): Promise<void> {
  // Validate data
  if (!data.final_amount || !data.id) {
    logger.error('Missing required data in payment webhook');
    return;
  }

  const saleAmount = data.final_amount / 100;

  // Update member's subscription price if different
  if (member.subscriptionPrice !== saleAmount) {
    await prisma.member.update({
      where: { id: member.id },
      data: {
        subscriptionPrice: saleAmount,
        billingPeriod,
      },
    });
  }

  // Auto-update creator's default subscription price (from first payment or if changed)
  if (member.creator && member.creator.defaultSubscriptionPrice !== saleAmount) {
    await prisma.creator.update({
      where: { id: member.creator.id },
      data: {
        defaultSubscriptionPrice: saleAmount,
      },
    });
    logger.info(`Updated creator ${member.creator.companyName} default price to $${saleAmount}`);
  }

  // Update lifecycle
  const lifecycle = await prisma.memberLifecycle.findUnique({
    where: { memberId: member.id },
  });

  if (lifecycle) {
    await prisma.memberLifecycle.update({
      where: { memberId: member.id },
      data: {
        lifetimeValue: { increment: saleAmount },
        netValue: { increment: saleAmount },
      },
    });
  }

  // Process commission if referred
  if (member.referredBy) {
    const referrer = await prisma.member.findUnique({
      where: { referralCode: member.referredBy },
    });

    if (referrer) {
      // Determine if initial or recurring
      const existingCommissionsCount = await prisma.commission.count({
        where: { whopMembershipId: data.membership_id },
      });

      const paymentType = existingCommissionsCount === 0 ? 'initial' : 'recurring';

      await processCommission({
        referrer,
        saleAmount,
        paymentId: data.id,
        membershipId: data.membership_id,
        creatorId: member.creatorId,
        billingPeriod,
        productType: data.plan_type || 'subscription',
        paymentType,
      });
    }
  } else {
    logger.debug('Organic member payment - no commission to process');
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPER: Process commission with TIERED RATES (10%/15%/18%)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function processCommission({
  referrer,
  saleAmount,
  paymentId,
  membershipId,
  creatorId,
  billingPeriod,
  productType,
  paymentType,
}: {
  referrer: any;
  saleAmount: number;
  paymentId: string;
  membershipId: string;
  creatorId: string;
  billingPeriod: string | null;
  productType: string;
  paymentType: 'initial' | 'recurring';
}) {
  // Calculate TIERED splits based on referrer's total referrals
  // Starter (0-49): 10% member / 70% creator / 20% platform
  // Ambassador (50-99): 15% member / 70% creator / 15% platform
  // Elite (100+): 18% member / 70% creator / 12% platform
  const tieredResult = calculateTieredCommission(saleAmount, referrer.totalReferred || 0);
  const { memberShare, creatorShare, platformShare, appliedTier, appliedMemberRate } = tieredResult;

  // Calculate monthly value for MRR tracking
  const monthlyValue = calculateMonthlyValue(saleAmount, billingPeriod as any);

  // Check if first referral
  const isFirstReferral = paymentType === 'initial' && referrer.totalReferred === 0;

  // Create commission record with tier info
  // Status starts as 'pending_payout' - will be updated after transfer attempt
  const commission = await prisma.commission.create({
    data: {
      whopPaymentId: paymentId,
      whopMembershipId: membershipId,
      saleAmount,
      memberShare,
      creatorShare,
      platformShare,
      paymentType,
      status: 'pending_payout',
      memberId: referrer.id,
      creatorId,
      productType,
      billingPeriod,
      monthlyValue,
      appliedMemberRate,
      appliedPlatformRate: platformShare / saleAmount,
      appliedTier,
    },
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AUTO-PAYOUT: Attempt to pay commission via Whop Transfers API
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const creator = await prisma.creator.findUnique({ where: { id: creatorId } });
  const companyId = creator?.companyId;

  if (companyId && referrer.userId && memberShare > 0) {
    logger.info(`Attempting auto-payout for commission ${commission.id}: $${memberShare.toFixed(2)}`);

    // Try to pay the commission
    const payoutResult = await payCommissionTransfer(
      commission.id,
      memberShare,
      referrer.userId,
      companyId
    );

    if (payoutResult.success) {
      // Update commission status to 'paid'
      await prisma.commission.update({
        where: { id: commission.id },
        data: {
          status: 'paid',
          paidAt: new Date(),
        },
      });
      logger.info(`Commission ${commission.id} auto-paid successfully (Transfer: ${payoutResult.transferId})`);

      // Send payment processed notification (Push + DM)
      const paymentAmount = `$${memberShare.toFixed(2)}`;
      notifyPaymentProcessed(companyId, referrer.userId, paymentAmount, 'Whop Balance').catch(err =>
        logger.error('Failed to send payment processed notification:', err)
      );
      sendPaymentProcessedDM(referrer.userId, referrer.username, paymentAmount, 'Whop Balance').catch(err =>
        logger.error('Failed to send payment processed DM:', err)
      );
    } else {
      // Keep status as 'pending_payout' for manual retry or later processing
      logger.warn(`Auto-payout failed for commission ${commission.id}: ${payoutResult.error}`);

      // Log specific error codes that need attention
      if (payoutResult.errorCode === 'VALIDATION_ERROR') {
        logger.warn(`User ${referrer.userId} may not have payout method configured`);
      }
    }
  } else {
    // Cannot auto-pay - missing required info
    if (!companyId) {
      logger.warn(`Cannot auto-pay commission ${commission.id}: Missing company ID`);
    }
    if (!referrer.userId) {
      logger.warn(`Cannot auto-pay commission ${commission.id}: Missing referrer user ID`);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AUTO-COLLECT PLATFORM SHARE (20%) via Whop Transfers API
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const PLATFORM_USER_ID = process.env.PLATFORM_WHOP_USER_ID;

  if (companyId && PLATFORM_USER_ID && platformShare > 0) {
    logger.info(`Attempting platform share collection for commission ${commission.id}: $${platformShare.toFixed(2)}`);

    // Use different idempotence key for platform collection
    const platformPayoutResult = await payCommissionTransfer(
      `platform_${commission.id}`,  // Different key from member payout
      platformShare,
      PLATFORM_USER_ID,
      companyId
    );

    if (platformPayoutResult.success) {
      // Update commission with platform collection status
      await prisma.commission.update({
        where: { id: commission.id },
        data: {
          platformCollected: true,
          platformTransferId: platformPayoutResult.transferId,
          platformCollectedAt: new Date(),
        },
      });
      logger.info(`Platform share collected for commission ${commission.id}: $${platformShare.toFixed(2)} (Transfer: ${platformPayoutResult.transferId})`);
    } else {
      logger.warn(`Platform share collection failed for commission ${commission.id}: ${platformPayoutResult.error}`);
      // Platform collection failures are logged but don't block the process
      // Can be retried later via admin tools or cron job
    }
  } else if (!PLATFORM_USER_ID) {
    logger.warn(`Cannot collect platform share: PLATFORM_WHOP_USER_ID not configured`);
  }

  // Update referrer stats and creator stats
  const updateData: any = {
    lifetimeEarnings: { increment: memberShare },
    monthlyEarnings: { increment: memberShare },
  };

  // Only increment referral counts on initial payment
  if (paymentType === 'initial') {
    updateData.totalReferred = { increment: 1 };
    updateData.monthlyReferred = { increment: 1 };
  }

  await Promise.all([
    prisma.member.update({
      where: { id: referrer.id },
      data: updateData,
    }),
    prisma.creator.update({
      where: { id: creatorId },
      data: {
        totalReferrals: paymentType === 'initial' ? { increment: 1 } : undefined,
        totalRevenue: { increment: saleAmount },
        monthlyRevenue: { increment: saleAmount },
      },
    }),
  ]);

  // Log with tier info
  const tierEmoji = appliedTier === 'elite' ? '👑' : appliedTier === 'ambassador' ? '🌟' : '⭐';
  logger.info(`${tierEmoji} Commission processed: $${memberShare.toFixed(2)} (${(appliedMemberRate * 100).toFixed(0)}% ${appliedTier}) -> ${referrer.referralCode} (${paymentType})`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // NEW: PUSH NOTIFICATIONS & DMs FOR KEY EVENTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // companyId already fetched above for auto-payout

  if (companyId && referrer.userId) {
    // 1. Commission earned notification (Push + DM)
    const formattedAmount = `$${memberShare.toFixed(2)}`;
    notifyCommissionEarned(companyId, referrer.userId, formattedAmount, 'a new member').catch(err =>
      logger.error('Failed to send commission notification:', err)
    );
    // Also send DM for commission earned (more personal)
    sendCommissionEarnedDM(referrer.userId, referrer.username, formattedAmount, 'a new member').catch(err =>
      logger.error('Failed to send commission DM:', err)
    );

    // 2. First referral notification (Push + DM)
    if (isFirstReferral) {
      logger.info(`🎉 FIRST REFERRAL SUCCESS for ${referrer.referralCode}!`);
      notifyFirstReferral(companyId, referrer.userId, referrer.username).catch(err =>
        logger.error('Failed to send first referral notification:', err)
      );
      // Also send DM for first referral bonus
      sendFirstReferralBonusDM(referrer.userId, referrer.username, formattedAmount).catch(err =>
        logger.error('Failed to send first referral DM:', err)
      );
    }

    // 3. Check for tier upgrade (Push + DM)
    const newTotalReferrals = (referrer.totalReferred || 0) + (paymentType === 'initial' ? 1 : 0);
    const previousTier = getTierInfo(referrer.totalReferred || 0);
    const newTier = getTierInfo(newTotalReferrals);

    if (newTier.tierName !== previousTier.tierName) {
      // Tier upgrade detected!
      logger.info(`🎊 TIER UPGRADE: ${referrer.referralCode} upgraded to ${newTier.displayName}!`);
      notifyTierUpgrade(companyId, referrer.userId, newTier.displayName, newTier.rateFormatted).catch(err =>
        logger.error('Failed to send tier upgrade notification:', err)
      );
      // Also send DM for tier upgrade
      sendTierUpgradeDM(referrer.userId, referrer.username, newTier.displayName, newTier.rateFormatted, newTotalReferrals).catch(err =>
        logger.error('Failed to send tier upgrade DM:', err)
      );
    }

    // 4. Milestone notifications (Push + DM) - 10, 25, 50, 100, 250, 500, 1000 referrals
    const milestones = [10, 25, 50, 100, 250, 500, 1000];
    const nextMilestones: Record<number, number | undefined> = {
      10: 25, 25: 50, 50: 100, 100: 250, 250: 500, 500: 1000, 1000: undefined
    };
    for (const milestone of milestones) {
      if (newTotalReferrals === milestone) {
        logger.info(`🏆 MILESTONE REACHED: ${referrer.referralCode} hit ${milestone} referrals!`);
        // Push notification
        notifyMilestone(companyId, referrer.userId, milestone).catch(err =>
          logger.error(`Failed to send ${milestone} milestone notification:`, err)
        );
        // DM with more detail
        sendMilestoneDM(
          referrer.userId,
          referrer.username,
          milestone,
          undefined, // reward - could fetch from creator settings
          nextMilestones[milestone]
        ).catch(err =>
          logger.error(`Failed to send ${milestone} milestone DM:`, err)
        );
        break;
      }
    }
  } else {
    if (isFirstReferral) {
      logger.info(`🎉 FIRST REFERRAL SUCCESS for ${referrer.referralCode}!`);
    }
  }

  // Update rankings (non-blocking)
  updateMemberRankings(referrer.id).catch(err =>
    logger.error('Failed to update rankings:', err)
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HANDLER: Payment Refunded
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handlePaymentRefunded(data: WhopRefundData, webhookEventId: string): Promise<WebhookHandlerResult> {
  logger.info('Processing refund...');

  const { id: refundId, payment_id: paymentId, amount, reason } = data;

  const originalCommission = await prisma.commission.findUnique({
    where: { whopPaymentId: paymentId },
    include: {
      member: true,
      creator: true,
    },
  });

  if (!originalCommission) {
    logger.error(`Cannot refund - no commission found for payment ${paymentId}`);
    return { ok: false, error: 'Commission not found' };
  }

  // Check if already refunded
  const existingRefund = await prisma.refund.findUnique({
    where: { whopRefundId: refundId },
  });

  if (existingRefund) {
    logger.debug('Refund already processed');
    return { ok: true, message: 'Already refunded' };
  }

  // Calculate reversed amounts
  const refundAmount = amount / 100;
  const isFullRefund = Math.abs(refundAmount - originalCommission.saleAmount) < 0.01;

  let memberShareReversed, creatorShareReversed, platformShareReversed;

  if (isFullRefund) {
    memberShareReversed = originalCommission.memberShare;
    creatorShareReversed = originalCommission.creatorShare;
    platformShareReversed = originalCommission.platformShare;
  } else {
    const refundRatio = refundAmount / originalCommission.saleAmount;
    memberShareReversed = originalCommission.memberShare * refundRatio;
    creatorShareReversed = originalCommission.creatorShare * refundRatio;
    platformShareReversed = originalCommission.platformShare * refundRatio;
  }

  // Execute refund
  await prisma.$transaction(async (tx) => {
    await tx.refund.create({
      data: {
        commissionId: originalCommission.id,
        whopRefundId: refundId,
        whopPaymentId: paymentId,
        refundAmount,
        memberShareReversed,
        creatorShareReversed,
        platformShareReversed,
        reason: reason || 'refund_requested',
        status: 'processed',
        refundedAt: new Date(),
        processedAt: new Date(),
      },
    });

    await tx.member.update({
      where: { id: originalCommission.memberId },
      data: {
        lifetimeEarnings: { decrement: memberShareReversed },
        monthlyEarnings: { decrement: memberShareReversed },
      },
    });

    await tx.creator.update({
      where: { id: originalCommission.creatorId },
      data: {
        totalRevenue: { decrement: refundAmount },
        monthlyRevenue: { decrement: refundAmount },
      },
    });

    await tx.commission.update({
      where: { id: originalCommission.id },
      data: {
        status: isFullRefund ? 'refunded' : 'partial_refund',
      },
    });
  });

  logger.info('Refund processed successfully');

  updateMemberRankings(originalCommission.memberId).catch(err =>
    logger.error('Failed to update rankings after refund:', err)
  );

  return { ok: true, refundAmount, memberShareReversed, creatorShareReversed };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HANDLER: Membership Created
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handleMembershipCreated(data: any, webhookEventId: string) {
  logger.info('Membership created (event logged)');
  // This is typically followed by membership.went_valid or payment.succeeded
  return { ok: true, message: 'Event logged' };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HANDLER: Membership Deleted
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handleMembershipDeleted(data: any, webhookEventId: string) {
  logger.info('Member cancelled...');

  const member = await prisma.member.findUnique({
    where: { membershipId: data.membership_id },
  });

  if (!member) return { ok: false, error: 'Member not found' };

  await prisma.memberLifecycle.upsert({
    where: { memberId: member.id },
    create: {
      memberId: member.id,
      cancelledAt: new Date(),
      currentStatus: 'cancelled',
    },
    update: {
      cancelledAt: new Date(),
      currentStatus: 'cancelled',
    },
  });

  logger.info(`Marked member ${member.username} as cancelled`);

  return { ok: true };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HANDLER: Payment Failed
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handlePaymentFailed(data: any, webhookEventId: string) {
  logger.error('Payment failed...');

  const member = await prisma.member.findUnique({
    where: { membershipId: data.membership_id },
  });

  if (!member) return { ok: false, error: 'Member not found' };

  await prisma.paymentFailure.create({
    data: {
      memberId: member.id,
      whopPaymentId: data.id,
      failureReason: data.failure_reason || 'unknown',
      attemptNumber: data.attempt_number || 1,
      expectedAmount: data.amount / 100,
      failedAt: new Date(),
    },
  });

  logger.warn(`Payment failure recorded for ${member.username}`);

  return { ok: true };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HANDLER: Trial Started
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handleTrialStarted(data: any, webhookEventId: string) {
  logger.info('Trial started...');

  const member = await prisma.member.findUnique({
    where: { membershipId: data.membership_id },
  });

  if (!member) return { ok: false, error: 'Member not found' };

  await prisma.memberLifecycle.upsert({
    where: { memberId: member.id },
    create: {
      memberId: member.id,
      trialStartedAt: new Date(),
      currentStatus: 'trial',
    },
    update: {
      trialStartedAt: new Date(),
      currentStatus: 'trial',
    },
  });

  return { ok: true };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HANDLER: Trial Ended
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handleTrialEnded(data: any, webhookEventId: string) {
  logger.debug('Trial ended...');

  const member = await prisma.member.findUnique({
    where: { membershipId: data.membership_id },
  });

  if (!member) return { ok: false, error: 'Member not found' };

  await prisma.memberLifecycle.update({
    where: { memberId: member.id },
    data: { trialEndedAt: new Date() },
  });

  return { ok: true };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HANDLER: Subscription Cancelled
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handleSubscriptionCancelled(data: any, webhookEventId: string) {
  logger.info('Subscription cancelled...');
  return handleMembershipDeleted(data, webhookEventId);
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'Webhook endpoint is alive (Strategy B)',
    timestamp: new Date().toISOString(),
  });
}
