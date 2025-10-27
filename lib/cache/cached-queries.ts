// lib/cache/cached-queries.ts
import { prisma } from '../db/prisma';
import { cache, CACHE_CONFIG, CacheInvalidation } from './redis';

/**
 * Cached leaderboard query with Redis
 */
export async function getCachedLeaderboard(
  type: 'community' | 'global',
  creatorId?: string,
  limit: number = 50
) {
  const key = `${CACHE_CONFIG.PREFIXES.LEADERBOARD}${type}:${creatorId || 'all'}:${limit}`;

  return cache.wrap(
    key,
    async () => {
      const where = type === 'community' && creatorId ? { creatorId } : {};

      const members = await prisma.member.findMany({
        where,
        select: {
          id: true,
          username: true,
          referralCode: true,
          lifetimeEarnings: true,
          totalReferred: true,
        },
        orderBy: {
          totalReferred: 'desc',
        },
        take: limit,
      });

      // Calculate ranks
      return members.map((member, index) => ({
        ...member,
        rank: index + 1,
      }));
    },
    CACHE_CONFIG.TTL.MEDIUM
  );
}

/**
 * Cached member stats with Redis
 */
export async function getCachedMemberStats(memberId: string) {
  const key = `${CACHE_CONFIG.PREFIXES.STATS}member:${memberId}`;

  return cache.wrap(
    key,
    async () => {
      const member = await prisma.member.findUnique({
        where: { id: memberId },
        select: {
          lifetimeEarnings: true,
          monthlyEarnings: true,
          totalReferred: true,
          monthlyReferred: true,
          globalEarningsRank: true,
          globalReferralsRank: true,
          communityRank: true,
          currentTier: true,
          rewardsClaimed: true,
          nextMilestone: true,
        },
      });

      if (!member) {
        throw new Error('Member not found');
      }

      return member;
    },
    CACHE_CONFIG.TTL.SHORT
  );
}

/**
 * Cached creator revenue stats with Redis
 */
export async function getCachedCreatorRevenue(creatorId: string) {
  const key = `${CACHE_CONFIG.PREFIXES.CREATOR}revenue:${creatorId}`;

  return cache.wrap(
    key,
    async () => {
      // Get current date for monthly calculations
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Parallel queries for efficiency
      const [totalRevenue, monthlyRevenue, memberCount] = await Promise.all([
        // Total revenue from paid commissions
        prisma.commission.aggregate({
          where: {
            creatorId,
            status: 'paid',
          },
          _sum: {
            saleAmount: true,
          },
        }),

        // Monthly revenue
        prisma.commission.aggregate({
          where: {
            creatorId,
            status: 'paid',
            createdAt: { gte: firstDayOfMonth },
          },
          _sum: {
            saleAmount: true,
          },
        }),

        // Total members
        prisma.member.count({
          where: { creatorId },
        }),
      ]);

      return {
        totalRevenue: totalRevenue._sum.saleAmount || 0,
        monthlyRevenue: monthlyRevenue._sum.saleAmount || 0,
        memberCount,
        averageRevenuePerMember: memberCount > 0
          ? (totalRevenue._sum.saleAmount || 0) / memberCount
          : 0,
      };
    },
    CACHE_CONFIG.TTL.MEDIUM
  );
}

/**
 * Cached earnings history for charts
 */
export async function getCachedEarningsHistory(
  memberId: string,
  days: number = 30
) {
  const key = `${CACHE_CONFIG.PREFIXES.EARNINGS}history:${memberId}:${days}`;

  return cache.wrap(
    key,
    async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const commissions = await prisma.commission.findMany({
        where: {
          memberId,
          status: 'paid',
          createdAt: { gte: startDate },
        },
        select: {
          createdAt: true,
          memberShare: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      // Group by date
      const grouped = commissions.reduce((acc, commission) => {
        const date = commission.createdAt.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = 0;
        }
        acc[date] += commission.memberShare;
        return acc;
      }, {} as Record<string, number>);

      // Fill in missing dates with zeros
      const result = [];
      const currentDate = new Date(startDate);
      const endDate = new Date();

      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        result.push({
          date: dateStr,
          earnings: grouped[dateStr] || 0,
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return result;
    },
    CACHE_CONFIG.TTL.SHORT
  );
}

/**
 * Cached referral list
 */
export async function getCachedReferrals(memberId: string, limit: number = 10) {
  const key = `${CACHE_CONFIG.PREFIXES.REFERRALS}list:${memberId}:${limit}`;

  return cache.wrap(
    key,
    async () => {
      const referredMembers = await prisma.member.findMany({
        where: { referredBy: memberId },
        select: {
          id: true,
          username: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      });

      // Get commission data for each referral
      // Note: We're looking for commissions earned by the referrer (memberId) from this specific referred member
      // This would require tracking which commission came from which referred member, which isn't in the schema
      // For now, we'll just show the referred member without commission details
      const referralsWithCommissions = await Promise.all(
        referredMembers.map(async (referral) => {
          // Since we can't directly link commissions to referred members,
          // we'll return empty commission data
          const commissions: { memberShare: number; createdAt: Date }[] = [];

          return {
            username: referral.username,
            totalEarnings: commissions.reduce((sum, c) => sum + c.memberShare, 0),
            paymentCount: commissions.length,
            firstPaymentDate: commissions[0]?.createdAt || referral.createdAt,
          };
        })
      );

      return referralsWithCommissions;
    },
    CACHE_CONFIG.TTL.SHORT
  );
}

/**
 * Cached commission analytics
 */
export async function getCachedCommissionAnalytics(
  creatorId: string,
  timeframe: 'day' | 'week' | 'month' | 'year' = 'month'
) {
  const key = `${CACHE_CONFIG.PREFIXES.ANALYTICS}commission:${creatorId}:${timeframe}`;

  return cache.wrap(
    key,
    async () => {
      const now = new Date();
      let startDate: Date;

      switch (timeframe) {
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
      }

      const commissions = await prisma.commission.findMany({
        where: {
          creatorId,
          createdAt: { gte: startDate },
        },
        select: {
          saleAmount: true,
          memberShare: true,
          creatorShare: true,
          platformShare: true,
          status: true,
          createdAt: true,
        },
      });

      const analytics = {
        totalCommissions: commissions.length,
        paidCommissions: commissions.filter(c => c.status === 'paid').length,
        pendingCommissions: commissions.filter(c => c.status === 'pending').length,
        totalRevenue: commissions.reduce((sum, c) => sum + c.saleAmount, 0),
        memberPayouts: commissions.reduce((sum, c) => sum + c.memberShare, 0),
        creatorRevenue: commissions.reduce((sum, c) => sum + c.creatorShare, 0),
        platformRevenue: commissions.reduce((sum, c) => sum + c.platformShare, 0),
        averageSaleAmount: commissions.length > 0
          ? commissions.reduce((sum, c) => sum + c.saleAmount, 0) / commissions.length
          : 0,
      };

      return analytics;
    },
    CACHE_CONFIG.TTL.MEDIUM
  );
}

/**
 * Warm up cache with frequently accessed data
 */
export async function warmUpCache(creatorId?: string) {
  console.log('🔥 Warming up cache...');

  try {
    // Warm up global leaderboard
    await getCachedLeaderboard('global', undefined, 100);

    // If creatorId provided, warm up creator-specific data
    if (creatorId) {
      await Promise.all([
        getCachedLeaderboard('community', creatorId, 50),
        getCachedCreatorRevenue(creatorId),
        getCachedCommissionAnalytics(creatorId, 'month'),
      ]);
    }

    console.log('✅ Cache warmed up successfully');
  } catch (error) {
    console.error('❌ Cache warm-up failed:', error);
  }
}

/**
 * Cache maintenance - clear old entries
 */
export async function performCacheMaintenance() {
  console.log('🧹 Performing cache maintenance...');

  try {
    // Get cache stats
    const stats = await cache.getStats();
    console.log('📊 Cache stats:', stats);

    // Clear old analytics data (older than 1 day)
    await cache.deletePattern(`${CACHE_CONFIG.PREFIXES.ANALYTICS}*`);

    console.log('✅ Cache maintenance completed');
  } catch (error) {
    console.error('❌ Cache maintenance failed:', error);
  }
}

// Export cache invalidation helpers for use in mutations
export { CacheInvalidation };