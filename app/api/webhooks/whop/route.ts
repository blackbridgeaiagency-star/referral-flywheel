// app/api/webhooks/whop/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '../../../../lib/db/prisma';
import { generateReferralCode } from '../../../../lib/utils/referral-code';
import { calculateCommission } from '../../../../lib/utils/commission';
import { checkAttribution } from '../../../../lib/utils/attribution';
import { sendWelcomeMessage } from '../../../../lib/whop/messaging';
import { withRetry, shouldRetry } from '../../../../lib/utils/webhook-retry';
import { withRateLimit } from '../../../../lib/security/rate-limit-utils';
import logger from '../../../../lib/logger';
import {
  isSubscriptionPayment,
  normalizeBillingPeriod,
  calculateMonthlyValue,
  getBillingPeriodLabel,
} from '../../../../lib/utils/billing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Apply rate limiting for webhook endpoint
  return withRateLimit(request, async () => {
    let webhookEvent: any = null;

    try {
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 1. VALIDATE WEBHOOK SIGNATURE
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const body = await request.text();
      const signature = request.headers.get('whop-signature');
      const secret = process.env.WHOP_WEBHOOK_SECRET!;

      // Require signature in production
      if (!signature) {
        // Allow unsigned webhooks only in development
        if (process.env.NODE_ENV === 'production') {
          logger.error('Missing webhook signature in production');
          return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
        } else {
          logger.warn('No signature (development mode)');
        }
      } else {
        // Validate signature
        const expectedSignature = crypto
          .createHmac('sha256', secret)
          .update(body)
          .digest('hex');

        if (signature !== expectedSignature) {
          logger.error('Invalid webhook signature');
          return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }
      }

      const payload = JSON.parse(body);

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 2. LOG EVERY WEBHOOK EVENT (even if we don't process yet)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      webhookEvent = await prisma.webhookEvent.create({
        data: {
          eventType: payload.action,
          whopEventId: payload.id || null,
          payload: payload,
          processed: false,
        },
      });

      logger.webhook(` Webhook received: ${payload.action} (ID: ${webhookEvent.id})`);

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 3. ROUTE TO APPROPRIATE HANDLER
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      let result;

      switch (payload.action) {
        case 'app_payment.succeeded':
        case 'payment.succeeded':
          result = await handlePaymentSucceeded(payload.data, webhookEvent.id, request);
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
          logger.warn(`  Unhandled webhook type: ${payload.action}`);
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

    } catch (error: any) {
      logger.error('❌ Webhook processing error:', error);

      // Log the error but don't block webhook
      if (webhookEvent) {
        await prisma.webhookEvent.update({
          where: { id: webhookEvent.id },
          data: {
            errorMessage: error.message,
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
// HANDLER: Payment Succeeded (Initial & Recurring)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handlePaymentSucceeded(data: any, webhookEventId: string, request: NextRequest) {
  logger.info(' Processing payment.succeeded...');

  // Validate required fields
  if (!data || !data.membership_id || !data.company_id || !data.id) {
    logger.error('❌ Missing required webhook data:', { data });
    return { ok: false, error: 'Missing required webhook data' };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🔒 SUBSCRIPTION-ONLY FILTER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const isSubscription = isSubscriptionPayment(
    data.plan_type,
    data.membership_id,
    data.billing_period
  );

  if (!isSubscription) {
    logger.debug('⏭️  Skipping non-subscription payment');
    return {
      ok: true,
      skipped: true,
      reason: 'Not a subscription payment',
    };
  }

  // Normalize billing period
  const billingPeriod = normalizeBillingPeriod(data.billing_period);

  // ✅ IDEMPOTENCY CHECK
  const existingCommission = await prisma.commission.findUnique({
    where: { whopPaymentId: data.id }
  });

  if (existingCommission) {
    logger.debug(`⏭️ Payment ${data.id} already processed (idempotent)`);
    return {
      ok: true,
      message: 'Payment already processed',
      commissionId: existingCommission.id
    };
  }

  // Check if member already exists
  const existingMember = await prisma.member.findUnique({
    where: { membershipId: data.membership_id }
  });

  if (existingMember) {
    // Handle recurring payment for existing member
    logger.info(' Recurring payment for:', existingMember.username);
    await handleRecurringPayment(
      existingMember,
      data,
      billingPeriod,
      data.plan_type || 'subscription'
    );
    return { ok: true };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // NEW MEMBER - Check for attribution
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const attribution = await checkAttribution(request);

  // Generate privacy-safe referral code (no PII exposure)
  const referralCode = generateReferralCode();

  // Get username for display purposes (but not for the code)
  let username = 'user';
  if (data.username) {
    username = data.username;
  } else if (data.email) {
    username = data.email.split('@')[0];
  }

  // Get or create creator
  let creator = await prisma.creator.findUnique({
    where: { companyId: data.company_id }
  });

  if (!creator) {
    creator = await prisma.creator.create({
      data: {
        companyId: data.company_id,
        companyName: data.company_name || 'Community',
        productId: data.product_id,
      }
    });
  }

  const subscriptionPrice = data.final_amount ? data.final_amount / 100 : 49.99;
  const memberOrigin = attribution ? 'referred' : 'organic';
  const memberMonthlyValue = calculateMonthlyValue(subscriptionPrice, billingPeriod as any);

  // Create member with lifecycle
  const member = await prisma.member.create({
    data: {
      userId: data.user_id || `test_${Date.now()}`,
      membershipId: data.membership_id,
      email: data.email || 'test@example.com',
      username: username,
      referralCode,
      referredBy: attribution?.referralCode || null,
      creatorId: creator.id,
      subscriptionPrice,
      memberOrigin,
      billingPeriod,
      monthlyValue: memberMonthlyValue,
    },
  });

  // Create lifecycle record
  await prisma.memberLifecycle.create({
    data: {
      memberId: member.id,
      convertedAt: new Date(),
      currentStatus: 'active',
      lifetimeValue: subscriptionPrice,
      netValue: subscriptionPrice,
    },
  });

  logger.info(`Member created: ${member.referralCode} (${memberOrigin})`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PROCESS COMMISSION IF REFERRED
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (attribution && data.final_amount) {
    logger.info(' Processing commission for referred member...');
    await withRetry(
      () => processCommission({
        referrerCode: attribution.referralCode,
        saleAmount: data.final_amount / 100,
        paymentId: data.id,
        membershipId: data.membership_id,
        creatorId: creator.id,
        attributionId: attribution.id,
        billingPeriod: billingPeriod,
        productType: data.plan_type || 'subscription',
      }),
      {
        maxAttempts: 3,
        baseDelay: 1000,
        onRetry: (attempt, error) => {
          logger.debug(`⏳ Retrying commission processing (attempt ${attempt}):`, error.message);
        }
      }
    );
  }

  // Send welcome message
  await sendWelcomeMessage(member, creator);
  await prisma.member.update({
    where: { id: member.id },
    data: { welcomeMessageSent: true }
  });

  return { ok: true };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HANDLER: Payment Refunded (CRITICAL!)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handlePaymentRefunded(data: any, webhookEventId: string) {
  logger.info(' Processing refund...');

  const { id: refundId, payment_id: paymentId, amount, reason } = data;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 1: Find the original commission
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const originalCommission = await prisma.commission.findUnique({
    where: { whopPaymentId: paymentId },
    include: {
      member: true, // The referrer
      creator: true,
    },
  });

  if (!originalCommission) {
    logger.error(`❌ Cannot refund - no commission found for payment ${paymentId}`);
    return { ok: false, error: 'Commission not found' };
  }

  // Check if already refunded
  const existingRefund = await prisma.refund.findUnique({
    where: { whopRefundId: refundId },
  });

  if (existingRefund) {
    logger.debug('⏭️  Refund already processed');
    return { ok: true, message: 'Already refunded' };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 2: Calculate reversed amounts
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const refundAmount = amount / 100; // Convert cents to dollars
  const isFullRefund = Math.abs(refundAmount - originalCommission.saleAmount) < 0.01;

  let memberShareReversed, creatorShareReversed, platformShareReversed;

  if (isFullRefund) {
    // Full refund - reverse entire commission
    memberShareReversed = originalCommission.memberShare;
    creatorShareReversed = originalCommission.creatorShare;
    platformShareReversed = originalCommission.platformShare;
  } else {
    // Partial refund - calculate proportional reversal
    const refundRatio = refundAmount / originalCommission.saleAmount;
    memberShareReversed = originalCommission.memberShare * refundRatio;
    creatorShareReversed = originalCommission.creatorShare * refundRatio;
    platformShareReversed = originalCommission.platformShare * refundRatio;
  }

  logger.debug(`
    ═══════════════════════════════════════
    💸 REFUND PROCESSING
    ───────────────────────────────────────
    Original Sale: $${originalCommission.saleAmount}
    Refund Amount: $${refundAmount}
    Type: ${isFullRefund ? 'FULL' : 'PARTIAL'}
    ───────────────────────────────────────
    Reversing:
    - Member (${originalCommission.member.username}): -$${memberShareReversed.toFixed(2)}
    - Creator: -$${creatorShareReversed.toFixed(2)}
    - Platform: -$${platformShareReversed.toFixed(2)}
    ═══════════════════════════════════════
  `);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 3: Execute refund (atomic transaction)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  await prisma.$transaction(async (tx) => {
    // Create refund record
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

    // Deduct from referrer's earnings (EDGE CASE: Allow negative balance)
    await tx.member.update({
      where: { id: originalCommission.memberId },
      data: {
        lifetimeEarnings: { decrement: memberShareReversed },
        monthlyEarnings: { decrement: memberShareReversed },
        // NOTE: Do NOT decrement totalReferred - they still made the referral
      },
    });

    // Deduct from creator's revenue
    await tx.creator.update({
      where: { id: originalCommission.creatorId },
      data: {
        totalRevenue: { decrement: refundAmount },
        monthlyRevenue: { decrement: refundAmount },
      },
    });

    // Update purchaser member lifecycle if found
    const purchaserMember = await tx.member.findUnique({
      where: { membershipId: data.membership_id },
      include: { lifecycle: true },
    });

    if (purchaserMember && purchaserMember.lifecycle) {
      await tx.memberLifecycle.update({
        where: { memberId: purchaserMember.id },
        data: {
          totalRefunded: { increment: refundAmount },
          netValue: { decrement: refundAmount },
          currentStatus: isFullRefund ? 'refunded' : 'active',
        },
      });
    }

    // Update commission status
    await tx.commission.update({
      where: { id: originalCommission.id },
      data: {
        status: isFullRefund ? 'refunded' : 'partial_refund',
      },
    });
  });

  logger.info('Refund processed successfully');

  return {
    ok: true,
    refundAmount,
    memberShareReversed,
    creatorShareReversed,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HANDLER: Membership Created
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handleMembershipCreated(data: any, webhookEventId: string) {
  logger.info(' Membership created (event logged)');
  // This is typically followed by payment.succeeded, so we just log it
  return { ok: true, message: 'Event logged' };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HANDLER: Membership Deleted (Cancellation)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handleMembershipDeleted(data: any, webhookEventId: string) {
  logger.info(' Member cancelled...');

  const member = await prisma.member.findUnique({
    where: { membershipId: data.membership_id },
  });

  if (!member) return { ok: false, error: 'Member not found' };

  // Update lifecycle
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

  // Record payment failure
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

  logger.warn(`  Payment failure recorded for ${member.username}`);

  return { ok: true };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HANDLER: Trial Started
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handleTrialStarted(data: any, webhookEventId: string) {
  logger.info(' Trial started...');

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
  logger.debug('⏰ Trial ended...');

  const member = await prisma.member.findUnique({
    where: { membershipId: data.membership_id },
  });

  if (!member) return { ok: false, error: 'Member not found' };

  await prisma.memberLifecycle.update({
    where: { memberId: member.id },
    data: {
      trialEndedAt: new Date(),
      // Status will be updated by next event (payment or cancellation)
    },
  });

  return { ok: true };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HANDLER: Subscription Cancelled (different from membership.deleted)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handleSubscriptionCancelled(data: any, webhookEventId: string) {
  logger.info(' Subscription cancelled...');

  // Similar to membership.deleted
  return handleMembershipDeleted(data, webhookEventId);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPER: Process commission (10/70/20 split)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function processCommission({
  referrerCode,
  saleAmount,
  paymentId,
  membershipId,
  creatorId,
  attributionId,
  billingPeriod,
  productType,
}: {
  referrerCode: string;
  saleAmount: number;
  paymentId: string;
  membershipId: string;
  creatorId: string;
  attributionId: string;
  billingPeriod: string | null;
  productType: string;
}) {
  // Find referrer
  const referrer = await prisma.member.findUnique({
    where: { referralCode: referrerCode }
  });

  if (!referrer) {
    logger.error('❌ Referrer not found:', referrerCode);
    return;
  }

  // Calculate splits (10/70/20)
  const { memberShare, creatorShare, platformShare } = calculateCommission(saleAmount);

  // Calculate monthly value for MRR tracking
  const monthlyValue = calculateMonthlyValue(saleAmount, billingPeriod as any);

  // Create commission record
  await prisma.commission.create({
    data: {
      whopPaymentId: paymentId,
      whopMembershipId: membershipId,
      saleAmount,
      memberShare,
      creatorShare,
      platformShare,
      paymentType: 'initial',
      status: 'paid',
      paidAt: new Date(),
      memberId: referrer.id,
      creatorId,
      productType,
      billingPeriod,
      monthlyValue,
      attributionClick: {
        connect: { id: attributionId }
      }
    }
  });

  // Check if this is referrer's first successful referral
  const isFirstReferral = referrer.totalReferred === 0;

  // Update referrer stats AND creator cached stats in parallel
  await Promise.all([
    // Update referrer stats
    prisma.member.update({
      where: { id: referrer.id },
      data: {
        lifetimeEarnings: { increment: memberShare },
        monthlyEarnings: { increment: memberShare },
        totalReferred: { increment: 1 },
        monthlyReferred: { increment: 1 },
      }
    }),

    // Update creator cached stats
    prisma.creator.update({
      where: { id: creatorId },
      data: {
        totalReferrals: { increment: 1 },
        totalRevenue: { increment: saleAmount },
        monthlyRevenue: { increment: saleAmount },
      }
    }),

    // Mark attribution as converted
    prisma.attributionClick.update({
      where: { id: attributionId },
      data: {
        converted: true,
        conversionValue: saleAmount,
        convertedAt: new Date(),
      }
    }),
  ]);

  logger.info(` Commission processed: $${memberShare} → ${referrerCode}`);

  // 🎉 First referral success celebration
  if (isFirstReferral) {
    logger.info(` FIRST REFERRAL SUCCESS for ${referrerCode}!`);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPER: Handle recurring payment (only process if referred)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handleRecurringPayment(
  member: any,
  data: any,
  billingPeriod: string | null,
  productType: string
) {
  // Validate data
  if (!data.final_amount || !data.id) {
    logger.error('❌ Missing required data in recurring payment webhook');
    return;
  }

  // ✅ IDEMPOTENCY CHECK for recurring payments
  const existingCommission = await prisma.commission.findUnique({
    where: { whopPaymentId: data.id }
  });

  if (existingCommission) {
    logger.debug(`⏭️ Recurring payment ${data.id} already processed`);
    return;
  }

  // Update lifecycle
  const lifecycle = await prisma.memberLifecycle.findUnique({
    where: { memberId: member.id },
  });

  if (lifecycle) {
    const saleAmount = data.final_amount / 100;
    await prisma.memberLifecycle.update({
      where: { memberId: member.id },
      data: {
        lifetimeValue: { increment: saleAmount },
        netValue: { increment: saleAmount },
      },
    });
  }

  // ONLY process commission if this member was referred (ignore organic members)
  if (member.referredBy) {
    logger.info(' Processing recurring commission for referred member...');
    const referrer = await prisma.member.findUnique({
      where: { referralCode: member.referredBy }
    });

    if (referrer) {
      const saleAmount = data.final_amount / 100;
      const { memberShare, creatorShare, platformShare } = calculateCommission(saleAmount);

      // Calculate monthly value for MRR tracking
      const monthlyValue = calculateMonthlyValue(saleAmount, billingPeriod as any);

      // Create recurring commission and update stats in parallel
      await Promise.all([
        // Create recurring commission
        prisma.commission.create({
          data: {
            whopPaymentId: data.id,
            whopMembershipId: data.membership_id,
            saleAmount,
            memberShare,
            creatorShare,
            platformShare,
            paymentType: 'recurring',
            status: 'paid',
            paidAt: new Date(),
            memberId: referrer.id,
            creatorId: member.creatorId,
            productType,
            billingPeriod,
            monthlyValue,
          }
        }),

        // Update referrer earnings
        prisma.member.update({
          where: { id: referrer.id },
          data: {
            lifetimeEarnings: { increment: memberShare },
            monthlyEarnings: { increment: memberShare },
          }
        }),

        // Update creator cached stats (recurring revenue)
        prisma.creator.update({
          where: { id: member.creatorId },
          data: {
            totalRevenue: { increment: saleAmount },
            monthlyRevenue: { increment: saleAmount },
          }
        }),
      ]);

      logger.info(` Recurring commission: $${memberShare} → ${referrer.referralCode}`);
    }
  } else {
    logger.debug('✔️  Organic member recurring payment - no commission to process');
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'Webhook endpoint is alive',
    timestamp: new Date().toISOString()
  });
}
