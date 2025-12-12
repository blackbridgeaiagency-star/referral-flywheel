// app/api/admin/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db/prisma';
import { isAdmin } from '../../../../lib/whop/simple-auth';
import logger from '../../../../lib/logger';


export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Admin Analytics API
 *
 * Provides comprehensive metrics for platform monitoring:
 * - Funnel metrics (clicks → conversions)
 * - Revenue tracking (total, refunded, net)
 * - Member lifecycle (active, trial, cancelled)
 * - Payment health (failures, revenue at risk)
 * - Webhook processing health
 *
 * SECURITY: Requires admin authentication
 */
export async function GET(request: NextRequest) {
  // SECURITY: Verify admin access
  if (!await isAdmin()) {
    logger.warn('[ADMIN] Unauthorized access attempt to /api/admin/analytics');
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Calculate webhook success rate
    const totalWebhooks = await prisma.webhookEvent.count();
    const processedWebhooks = await prisma.webhookEvent.count({
      where: { processed: true, errorMessage: null },
    });
    const failedWebhooks = await prisma.webhookEvent.count({
      where: { errorMessage: { not: null } },
    });
    const webhookSuccessRate = totalWebhooks > 0
      ? ((processedWebhooks / totalWebhooks) * 100).toFixed(2)
      : '100.00';

    // Full funnel metrics
    const analytics = {
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // ATTRIBUTION FUNNEL
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      attribution: {
        totalClicks: await prisma.attributionClick.count(),
        activeClicks: await prisma.attributionClick.count({
          where: { expiresAt: { gte: new Date() } },
        }),
        expiredClicks: await prisma.attributionClick.count({
          where: { expiresAt: { lt: new Date() } },
        }),
        convertedClicks: await prisma.attributionClick.count({
          where: { converted: true },
        }),
      },

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // CONVERSIONS
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      conversions: {
        totalReferredMembers: await prisma.member.count({
          where: { memberOrigin: 'referred' },
        }),
        totalOrganicMembers: await prisma.member.count({
          where: { memberOrigin: 'organic' },
        }),
        totalMembers: await prisma.member.count(),
      },

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // REVENUE ($ tracked)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      revenue: {
        totalRevenue: await prisma.commission.aggregate({
          _sum: { saleAmount: true },
          where: { status: 'paid' },
        }).then(r => r._sum.saleAmount || 0),

        totalRefunded: await prisma.refund.aggregate({
          _sum: { refundAmount: true },
        }).then(r => r._sum.refundAmount || 0),

        netRevenue: await prisma.commission.aggregate({
          _sum: { saleAmount: true },
          where: { status: 'paid' },
        }).then(async (commissions) => {
          const total = commissions._sum.saleAmount || 0;
          const refunded = await prisma.refund.aggregate({
            _sum: { refundAmount: true },
          }).then(r => r._sum.refundAmount || 0);
          return total - refunded;
        }),

        // Commission splits
        memberCommissions: await prisma.commission.aggregate({
          _sum: { memberShare: true },
          where: { status: 'paid' },
        }).then(r => r._sum.memberShare || 0),

        creatorCommissions: await prisma.commission.aggregate({
          _sum: { creatorShare: true },
          where: { status: 'paid' },
        }).then(r => r._sum.creatorShare || 0),

        platformCommissions: await prisma.commission.aggregate({
          _sum: { platformShare: true },
          where: { status: 'paid' },
        }).then(r => r._sum.platformShare || 0),
      },

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // MEMBER LIFECYCLE
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      lifecycle: {
        activeMembers: await prisma.memberLifecycle.count({
          where: { currentStatus: 'active' },
        }),
        trialMembers: await prisma.memberLifecycle.count({
          where: { currentStatus: 'trial' },
        }),
        cancelledMembers: await prisma.memberLifecycle.count({
          where: { currentStatus: 'cancelled' },
        }),
        refundedMembers: await prisma.memberLifecycle.count({
          where: { currentStatus: 'refunded' },
        }),
        suspendedMembers: await prisma.memberLifecycle.count({
          where: { currentStatus: 'suspended' },
        }),

        // Financial health
        averageLTV: await prisma.memberLifecycle.aggregate({
          _avg: { lifetimeValue: true },
        }).then(r => r._avg.lifetimeValue || 0),

        averageNetValue: await prisma.memberLifecycle.aggregate({
          _avg: { netValue: true },
        }).then(r => r._avg.netValue || 0),

        totalLTV: await prisma.memberLifecycle.aggregate({
          _sum: { lifetimeValue: true },
        }).then(r => r._sum.lifetimeValue || 0),

        totalNetValue: await prisma.memberLifecycle.aggregate({
          _sum: { netValue: true },
        }).then(r => r._sum.netValue || 0),
      },

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // PAYMENT HEALTH
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      paymentHealth: {
        activeFailures: await prisma.paymentFailure.count({
          where: { resolved: false },
        }),
        resolvedFailures: await prisma.paymentFailure.count({
          where: { resolved: true },
        }),
        totalFailures: await prisma.paymentFailure.count(),

        revenueAtRisk: await prisma.paymentFailure.aggregate({
          _sum: { expectedAmount: true },
          where: { resolved: false },
        }).then(r => r._sum.expectedAmount || 0),

        // Failure reasons breakdown
        failureReasons: await prisma.paymentFailure.groupBy({
          by: ['failureReason'],
          _count: { failureReason: true },
          where: { resolved: false },
        }),
      },

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // REFUND ANALYTICS
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      refunds: {
        totalRefunds: await prisma.refund.count(),
        pendingRefunds: await prisma.refund.count({
          where: { status: 'pending' },
        }),
        processedRefunds: await prisma.refund.count({
          where: { status: 'processed' },
        }),
        failedRefunds: await prisma.refund.count({
          where: { status: 'failed' },
        }),

        totalRefundAmount: await prisma.refund.aggregate({
          _sum: { refundAmount: true },
        }).then(r => r._sum.refundAmount || 0),

        // Refund reasons breakdown
        refundReasons: await prisma.refund.groupBy({
          by: ['reason'],
          _count: { reason: true },
          _sum: { refundAmount: true },
        }),
      },

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // SHARE ACTIVITY
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      sharing: {
        totalShares: await prisma.shareEvent.count(),

        // Platform breakdown
        sharesByPlatform: await prisma.shareEvent.groupBy({
          by: ['platform'],
          _count: { platform: true },
        }),
      },

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // WEBHOOK HEALTH
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      webhooks: {
        totalReceived: totalWebhooks,
        successfullyProcessed: processedWebhooks,
        failed: failedWebhooks,
        successRate: `${webhookSuccessRate}%`,

        // Event type breakdown
        eventTypeBreakdown: await prisma.webhookEvent.groupBy({
          by: ['eventType'],
          _count: { eventType: true },
        }),

        // Recent failures (last 10)
        recentFailures: await prisma.webhookEvent.findMany({
          where: { errorMessage: { not: null } },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            eventType: true,
            errorMessage: true,
            retryCount: true,
            createdAt: true,
          },
        }),
      },

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // PLATFORM GROWTH
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      growth: {
        totalCreators: await prisma.creator.count(),
        activeCreators: await prisma.creator.count({
          where: { isActive: true },
        }),

        // Creators with most referrals
        topCreators: await prisma.creator.findMany({
          orderBy: { totalReferrals: 'desc' },
          take: 10,
          select: {
            companyName: true,
            totalReferrals: true,
            totalRevenue: true,
            monthlyRevenue: true,
          },
        }),

        // Top referring members
        topReferrers: await prisma.member.findMany({
          orderBy: { totalReferred: 'desc' },
          take: 10,
          select: {
            username: true,
            referralCode: true,
            totalReferred: true,
            lifetimeEarnings: true,
          },
        }),
      },

      // Metadata
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(analytics);
  } catch (error: any) {
    logger.error('❌ Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics', message: error.message },
      { status: 500 }
    );
  }
}
