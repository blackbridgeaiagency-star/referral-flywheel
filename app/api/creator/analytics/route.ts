// app/api/creator/analytics/route.ts
/**
 * Enhanced Creator Analytics API
 *
 * Returns comprehensive analytics for the creator dashboard including:
 * - Revenue metrics with growth calculations
 * - Referral metrics with conversion rates
 * - Top performers with detailed stats
 * - Time series data for charts
 * - Commission breakdown by tier
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db/prisma';
import { startOfDay, subDays, startOfMonth, subMonths, format } from 'date-fns';
import logger from '../../../../lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ========================================
// TYPE DEFINITIONS
// ========================================

interface CreatorAnalytics {
  // Revenue metrics
  totalRevenue: number;
  revenueGrowth: number;
  averageOrderValue: number;
  monthlyRevenue: number;

  // Referral metrics
  totalReferrals: number;
  referralGrowth: number;
  conversionRate: number;
  totalClicks: number;

  // Top performers
  topReferrers: Array<{
    memberId: string;
    username: string;
    referrals: number;
    revenue: number;
    commissionEarned: number;
    tier: string;
  }>;

  // Time series data (for charts)
  dailyRevenue: Array<{ date: string; amount: number }>;
  dailyReferrals: Array<{ date: string; count: number }>;

  // Commission breakdown by tier
  totalCommissionsPaid: number;
  pendingCommissions: number;
  commissionByTier: {
    starter: number;
    ambassador: number;
    elite: number;
  };

  // Period info
  period: string;
  periodDays: number;
}

// ========================================
// HELPER FUNCTIONS
// ========================================

function getPeriodDays(period: string): number {
  switch (period) {
    case '7d': return 7;
    case '30d': return 30;
    case '90d': return 90;
    case 'all': return 365 * 10; // 10 years as "all time"
    default: return 30;
  }
}

function getPeriodStartDate(period: string): Date {
  const days = getPeriodDays(period);
  return startOfDay(subDays(new Date(), days));
}

function getPreviousPeriodDates(period: string): { start: Date; end: Date } {
  const days = getPeriodDays(period);
  const end = startOfDay(subDays(new Date(), days));
  const start = startOfDay(subDays(end, days));
  return { start, end };
}

// ========================================
// MAIN API HANDLER
// ========================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const period = searchParams.get('period') || '30d';

    if (!companyId) {
      return NextResponse.json(
        { error: 'Missing companyId parameter' },
        { status: 400 }
      );
    }

    // Find creator
    const creator = await prisma.creator.findFirst({
      where: {
        OR: [
          { companyId },
          { productId: companyId },
        ],
      },
      select: { id: true, companyName: true },
    });

    if (!creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      );
    }

    // Calculate date ranges
    const periodStart = getPeriodStartDate(period);
    const previousPeriod = getPreviousPeriodDates(period);
    const periodDays = getPeriodDays(period);

    // ========================================
    // PARALLEL DATA FETCHING (Performance)
    // ========================================
    const [
      currentPeriodCommissions,
      previousPeriodCommissions,
      allTimeCommissions,
      currentPeriodReferrals,
      previousPeriodReferrals,
      activeClicks,
      topPerformersData,
      pendingCommissionsData,
    ] = await Promise.all([
      // Current period commissions
      prisma.commission.findMany({
        where: {
          creatorId: creator.id,
          status: 'paid',
          createdAt: { gte: periodStart },
        },
        select: {
          saleAmount: true,
          memberShare: true,
          appliedTier: true,
          createdAt: true,
        },
      }),

      // Previous period commissions (for growth calculation)
      prisma.commission.findMany({
        where: {
          creatorId: creator.id,
          status: 'paid',
          createdAt: {
            gte: previousPeriod.start,
            lt: previousPeriod.end,
          },
        },
        select: {
          saleAmount: true,
        },
      }),

      // All-time commissions (for total revenue)
      prisma.commission.aggregate({
        where: {
          creatorId: creator.id,
          status: 'paid',
        },
        _sum: {
          saleAmount: true,
          memberShare: true,
        },
        _count: true,
      }),

      // Current period referrals (new members)
      prisma.member.count({
        where: {
          creatorId: creator.id,
          memberOrigin: { in: ['referred', 'whop_affiliate'] },
          createdAt: { gte: periodStart },
        },
      }),

      // Previous period referrals
      prisma.member.count({
        where: {
          creatorId: creator.id,
          memberOrigin: { in: ['referred', 'whop_affiliate'] },
          createdAt: {
            gte: previousPeriod.start,
            lt: previousPeriod.end,
          },
        },
      }),

      // Active attribution clicks
      prisma.attributionClick.count({
        where: {
          member: { creatorId: creator.id },
          expiresAt: { gte: new Date() },
        },
      }),

      // Top performers with earnings
      prisma.commission.groupBy({
        by: ['memberId'],
        where: {
          creatorId: creator.id,
          status: 'paid',
        },
        _sum: {
          memberShare: true,
          saleAmount: true,
        },
        _count: true,
        orderBy: {
          _sum: {
            memberShare: 'desc',
          },
        },
        take: 10,
      }),

      // Pending commissions
      prisma.commission.aggregate({
        where: {
          creatorId: creator.id,
          status: 'pending',
        },
        _sum: {
          memberShare: true,
        },
      }),
    ]);

    // ========================================
    // CALCULATE METRICS
    // ========================================

    // Revenue metrics
    const currentRevenue = currentPeriodCommissions.reduce(
      (sum, c) => sum + c.saleAmount,
      0
    );
    const previousRevenue = previousPeriodCommissions.reduce(
      (sum, c) => sum + c.saleAmount,
      0
    );
    const revenueGrowth = previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : currentRevenue > 0 ? 100 : 0;

    const totalRevenue = allTimeCommissions._sum.saleAmount || 0;
    const avgOrderValue = allTimeCommissions._count > 0
      ? totalRevenue / allTimeCommissions._count
      : 0;

    // Referral metrics
    const referralGrowth = previousPeriodReferrals > 0
      ? ((currentPeriodReferrals - previousPeriodReferrals) / previousPeriodReferrals) * 100
      : currentPeriodReferrals > 0 ? 100 : 0;

    // Total referrals all-time
    const totalReferrals = await prisma.member.count({
      where: {
        creatorId: creator.id,
        memberOrigin: { in: ['referred', 'whop_affiliate'] },
      },
    });

    // Conversion rate
    const totalClicksAllTime = await prisma.attributionClick.count({
      where: {
        member: { creatorId: creator.id },
      },
    });
    const conversionRate = totalClicksAllTime > 0
      ? (totalReferrals / totalClicksAllTime) * 100
      : 0;

    // ========================================
    // COMMISSION BY TIER
    // ========================================
    const commissionByTier = {
      starter: 0,
      ambassador: 0,
      elite: 0,
    };

    currentPeriodCommissions.forEach(c => {
      const tier = c.appliedTier || 'starter';
      if (tier in commissionByTier) {
        commissionByTier[tier as keyof typeof commissionByTier] += c.memberShare;
      }
    });

    // ========================================
    // TIME SERIES DATA
    // ========================================

    // Daily revenue aggregation
    const dailyRevenueMap = new Map<string, number>();
    const dailyReferralsMap = new Map<string, number>();

    // Initialize all days with 0
    for (let i = 0; i < Math.min(periodDays, 90); i++) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      dailyRevenueMap.set(date, 0);
      dailyReferralsMap.set(date, 0);
    }

    // Fill in actual revenue data
    currentPeriodCommissions.forEach(c => {
      const date = format(c.createdAt, 'yyyy-MM-dd');
      const current = dailyRevenueMap.get(date) || 0;
      dailyRevenueMap.set(date, current + c.saleAmount);
    });

    // Get daily referrals
    const referralsByDay = await prisma.member.groupBy({
      by: ['createdAt'],
      where: {
        creatorId: creator.id,
        memberOrigin: { in: ['referred', 'whop_affiliate'] },
        createdAt: { gte: periodStart },
      },
      _count: true,
    });

    // Note: This groups by exact timestamp, we need to aggregate by day
    const referralDates = await prisma.member.findMany({
      where: {
        creatorId: creator.id,
        memberOrigin: { in: ['referred', 'whop_affiliate'] },
        createdAt: { gte: periodStart },
      },
      select: { createdAt: true },
    });

    referralDates.forEach(r => {
      const date = format(r.createdAt, 'yyyy-MM-dd');
      const current = dailyReferralsMap.get(date) || 0;
      dailyReferralsMap.set(date, current + 1);
    });

    // Convert to sorted arrays
    const dailyRevenue = Array.from(dailyRevenueMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const dailyReferrals = Array.from(dailyReferralsMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ========================================
    // TOP PERFORMERS WITH DETAILS
    // ========================================
    const memberIds = topPerformersData.map(p => p.memberId);
    const memberDetails = await prisma.member.findMany({
      where: { id: { in: memberIds } },
      select: {
        id: true,
        username: true,
        totalReferred: true,
        commissionTier: true,
      },
    });

    const memberMap = new Map(memberDetails.map(m => [m.id, m]));

    const topReferrers = topPerformersData.map(p => {
      const member = memberMap.get(p.memberId);
      return {
        memberId: p.memberId,
        username: member?.username || 'Unknown',
        referrals: member?.totalReferred || 0,
        revenue: p._sum.saleAmount || 0,
        commissionEarned: p._sum.memberShare || 0,
        tier: member?.commissionTier || 'starter',
      };
    });

    // ========================================
    // BUILD RESPONSE
    // ========================================
    const analytics: CreatorAnalytics = {
      // Revenue
      totalRevenue,
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
      averageOrderValue: Math.round(avgOrderValue * 100) / 100,
      monthlyRevenue: currentRevenue,

      // Referrals
      totalReferrals,
      referralGrowth: Math.round(referralGrowth * 10) / 10,
      conversionRate: Math.round(conversionRate * 10) / 10,
      totalClicks: totalClicksAllTime,

      // Top performers
      topReferrers,

      // Time series
      dailyRevenue,
      dailyReferrals,

      // Commissions
      totalCommissionsPaid: allTimeCommissions._sum.memberShare || 0,
      pendingCommissions: pendingCommissionsData._sum.memberShare || 0,
      commissionByTier,

      // Period info
      period,
      periodDays,
    };

    logger.info(`Analytics fetched for creator ${creator.companyName}`, {
      period,
      totalRevenue,
      totalReferrals,
    });

    return NextResponse.json(analytics);

  } catch (error) {
    logger.error('Error fetching creator analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
