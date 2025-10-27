// lib/queries/creator.ts
import { prisma } from '@/lib/db/prisma';
import { subDays, startOfMonth, startOfYear, startOfDay } from 'date-fns';

/**
 * Get revenue metrics for creator dashboard
 */
export async function getCreatorRevenueMetrics(creatorId: string) {
  try {
    const monthStart = startOfMonth(new Date());

    // Get all-time and monthly revenue in parallel
    const [allTimeResult, monthlyResult, commissionCount] = await Promise.all([
      // All-time revenue
      prisma.commission.aggregate({
        where: {
          creatorId,
          status: 'paid',
        },
        _sum: {
          saleAmount: true,
          creatorShare: true,
        },
        _count: true,
      }),

      // Monthly revenue
      prisma.commission.aggregate({
        where: {
          creatorId,
          status: 'paid',
          createdAt: { gte: monthStart },
        },
        _sum: {
          saleAmount: true,
          creatorShare: true,
        },
        _count: true,
      }),

      // Total paid commissions for average calculation
      prisma.commission.count({
        where: {
          creatorId,
          status: 'paid',
        },
      }),
    ]);

    const totalRevenue = allTimeResult._sum.saleAmount || 0;
    const totalCreatorEarnings = allTimeResult._sum.creatorShare || 0;
    const monthlyRevenue = monthlyResult._sum.saleAmount || 0;
    const monthlyCreatorEarnings = monthlyResult._sum.creatorShare || 0;

    // Calculate average sale value
    const avgSaleValue =
      commissionCount > 0 ? totalRevenue / commissionCount : 0;

    console.log('✅ Creator revenue metrics fetched:', {
      creatorId,
      totalRevenue,
      monthlyRevenue,
      commissions: commissionCount,
    });

    return {
      totalRevenue,
      totalCreatorEarnings,
      monthlyRevenue,
      monthlyCreatorEarnings,
      avgSaleValue,
      totalCommissions: commissionCount,
      monthlyCommissions: monthlyResult._count,
    };
  } catch (error) {
    console.error('❌ Error fetching creator revenue metrics:', error);
    // Return zeros on error - graceful degradation
    return {
      totalRevenue: 0,
      totalCreatorEarnings: 0,
      monthlyRevenue: 0,
      monthlyCreatorEarnings: 0,
      avgSaleValue: 0,
      totalCommissions: 0,
      monthlyCommissions: 0,
    };
  }
}

/**
 * Get top performing members (by earnings or referrals)
 */
export async function getTopPerformers(
  creatorId: string,
  sortBy: 'earnings' | 'referrals' = 'earnings',
  limit: number = 10
) {
  try {
    const orderBy =
      sortBy === 'earnings'
        ? { lifetimeEarnings: 'desc' as const }
        : { totalReferred: 'desc' as const };

    const topMembers = await prisma.member.findMany({
      where: {
        creatorId,
      },
      select: {
        id: true,
        username: true,
        email: true,
        referralCode: true,
        lifetimeEarnings: true,
        monthlyEarnings: true,
        totalReferred: true,
        monthlyReferred: true,
        currentTier: true,
        createdAt: true,
      },
      orderBy,
      take: limit,
    });

    console.log(`✅ Top ${sortBy} performers fetched:`, {
      creatorId,
      count: topMembers.length,
    });

    return topMembers;
  } catch (error) {
    console.error(`❌ Error fetching top ${sortBy} performers:`, error);
    return [];
  }
}

/**
 * Get community stats for creator dashboard
 */
export async function getCommunityStats(creatorId: string) {
  try {
    const [memberStats, attributionStats, creator, shareCount] = await Promise.all([
      // Member counts and averages
      prisma.member.aggregate({
        where: { creatorId },
        _count: true,
        _avg: {
          totalReferred: true,
          lifetimeEarnings: true,
        },
      }),

      // Attribution stats (converted vs total)
      prisma.attributionClick.groupBy({
        by: ['converted'],
        where: {
          member: {
            creatorId,
          },
        },
        _count: true,
      }),

      // Get cached creator stats
      prisma.creator.findUnique({
        where: { id: creatorId },
        select: {
          totalReferrals: true,
          totalRevenue: true,
          monthlyRevenue: true,
        },
      }),

      // 🆕 Count total shares by all members
      prisma.shareEvent.count({
        where: {
          member: {
            creatorId,
          },
        },
      }),
    ]);

    const totalMembers = memberStats._count;
    const avgReferralsPerMember = memberStats._avg.totalReferred || 0;
    const avgEarningsPerMember = memberStats._avg.lifetimeEarnings || 0;

    // Calculate attribution rate
    const convertedClicks =
      attributionStats.find((stat) => stat.converted)?._count || 0;
    const totalClicks = attributionStats.reduce(
      (sum, stat) => sum + stat._count,
      0
    );
    const organicSignups = totalMembers - convertedClicks;
    const attributionRate =
      totalMembers > 0 ? (convertedClicks / totalMembers) * 100 : 0;

    console.log('✅ Community stats fetched:', {
      creatorId,
      totalMembers,
      convertedClicks,
      organicSignups,
    });

    return {
      totalMembers,
      avgReferralsPerMember,
      avgEarningsPerMember,
      totalClicks,
      convertedClicks,
      organicSignups,
      attributionRate,
      // Include cached creator stats
      totalReferrals: creator?.totalReferrals || 0,
      totalRevenue: creator?.totalRevenue || 0,
      monthlyRevenue: creator?.monthlyRevenue || 0,
      totalSharesSent: shareCount, // 🆕 NEW METRIC
    };
  } catch (error) {
    console.error('❌ Error fetching community stats:', error);
    return {
      totalMembers: 0,
      avgReferralsPerMember: 0,
      avgEarningsPerMember: 0,
      totalClicks: 0,
      convertedClicks: 0,
      organicSignups: 0,
      attributionRate: 0,
      totalReferrals: 0,
      totalRevenue: 0,
      monthlyRevenue: 0,
      totalSharesSent: 0, // 🆕 NEW
    };
  }
}

/**
 * Get monthly revenue breakdown (organic vs referrals)
 */
export async function getMonthlyRevenueBreakdown(creatorId: string) {
  try {
    const monthStart = startOfMonth(new Date());

    // Get member counts and subscription totals
    const [allMembers, referredMembers, organicMembers, allTimeCommissions, monthlyCommissions, activeClicks] = await Promise.all([
      // All members with subscription prices
      prisma.member.findMany({
        where: { creatorId },
        select: {
          subscriptionPrice: true,
          memberOrigin: true,
          createdAt: true,
        },
      }),

      // Referred members only
      prisma.member.count({
        where: {
          creatorId,
          memberOrigin: 'referred',
        },
      }),

      // Organic members only
      prisma.member.count({
        where: {
          creatorId,
          memberOrigin: 'organic',
        },
      }),

      // All-time revenue from ALL members (organic + referred)
      prisma.commission.aggregate({
        where: {
          creatorId,
          status: 'paid',
        },
        _sum: {
          saleAmount: true,
        },
      }),

      // Monthly revenue from commissions (this month's payments)
      prisma.commission.aggregate({
        where: {
          creatorId,
          status: 'paid',
          createdAt: { gte: monthStart },
        },
        _sum: {
          saleAmount: true,
        },
      }),

      // Active attribution clicks (within 30-day window)
      prisma.attributionClick.groupBy({
        by: ['converted'],
        where: {
          member: {
            creatorId,
          },
          expiresAt: { gte: new Date() },
        },
        _count: true,
      }),
    ]);

    // Calculate monthly revenue from ALL active members (organic + referred)
    const totalMonthlyRevenue = allMembers.reduce((sum, member) => sum + member.subscriptionPrice, 0);

    // Calculate revenue from referred members only (for contribution metric)
    const referredMembersData = allMembers.filter(m => m.memberOrigin === 'referred');
    const referralContribution = referredMembersData.reduce((sum, member) => sum + member.subscriptionPrice, 0);

    // Calculate total revenue all-time (from commission records + organic member subscriptions)
    const totalRevenue = allTimeCommissions._sum.saleAmount || 0;

    // Active subscription count (all current members)
    const activeSubscriptions = allMembers.length;

    // Calculate click metrics
    const totalActiveClicks = activeClicks.reduce((sum, stat) => sum + stat._count, 0);

    // IMPORTANT: For conversion rate, use actual referred members count
    // (not attribution clicks) since that's the true measure of conversions
    const actualConversions = referredMembers;

    console.log('✅ Monthly revenue breakdown fetched:', {
      creatorId,
      totalMonthlyRevenue,
      referralContribution,
      organicCount: organicMembers,
      referredCount: referredMembers,
      totalActiveClicks,
      actualConversions,
    });

    return {
      // All-time metrics
      totalRevenue,

      // Monthly metrics
      totalMonthlyRevenue,
      referralContribution,
      activeSubscriptions,

      // Member breakdown
      organicCount: organicMembers,
      referredCount: referredMembers,
      totalMembers: allMembers.length,

      // Click tracking (use referred members as true conversions)
      totalActiveClicks,
      convertedActiveClicks: actualConversions, // Use actual member count, not attribution click count
    };
  } catch (error) {
    console.error('❌ Error fetching monthly revenue breakdown:', error);
    return {
      totalRevenue: 0,
      totalMonthlyRevenue: 0,
      referralContribution: 0,
      activeSubscriptions: 0,
      organicCount: 0,
      referredCount: 0,
      totalMembers: 0,
      totalActiveClicks: 0,
      convertedActiveClicks: 0,
    };
  }
}

/**
 * Get all dashboard data in parallel (single database roundtrip)
 */
export async function getCreatorDashboardData(creatorId: string) {
  try {
    const [revenueBreakdown, topReferrers, communityStats] =
      await Promise.all([
        getMonthlyRevenueBreakdown(creatorId),
        getTopPerformers(creatorId, 'referrals', 10),
        getCommunityStats(creatorId),
      ]);

    console.log('✅ Creator dashboard data fetched:', { creatorId });

    return {
      revenueBreakdown,
      topReferrers,
      communityStats,
    };
  } catch (error) {
    console.error('❌ Error fetching creator dashboard data:', error);
    throw error; // Rethrow to show error page
  }
}

/**
 * Get today's stats for real-time dashboard updates
 */
export async function getTodayStats(creatorId: string) {
  try {
    const todayStart = startOfDay(new Date());

    const [newReferrals, todayClicks, todayRevenue] = await Promise.all([
      // New referred members today
      prisma.member.count({
        where: {
          creatorId,
          memberOrigin: 'referred',
          createdAt: { gte: todayStart },
        },
      }),

      // Attribution clicks today
      prisma.attributionClick.count({
        where: {
          member: { creatorId },
          createdAt: { gte: todayStart },
        },
      }),

      // Revenue from payments today
      prisma.commission.aggregate({
        where: {
          creatorId,
          status: 'paid',
          createdAt: { gte: todayStart },
        },
        _sum: { saleAmount: true },
      }),
    ]);

    console.log('✅ Today stats fetched:', {
      creatorId,
      newReferrals,
      todayClicks,
      todayRevenue: todayRevenue._sum.saleAmount || 0,
    });

    return {
      newReferrals,
      todayClicks,
      todayRevenue: todayRevenue._sum.saleAmount || 0,
    };
  } catch (error) {
    console.error('❌ Error fetching today stats:', error);
    return {
      newReferrals: 0,
      todayClicks: 0,
      todayRevenue: 0,
    };
  }
}
