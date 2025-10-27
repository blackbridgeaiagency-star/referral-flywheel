// app/api/admin/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { withRateLimit } from '@/lib/security/rate-limit-utils';
import { cache } from '@/lib/cache/redis';

export async function GET(request: NextRequest) {
  return withRateLimit(request, async () => {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';

    // Calculate date range
    const now = new Date();
    let startDate = new Date();

    switch (range) {
      case '24h':
        startDate.setHours(now.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    try {
      // Try to get from cache first
      const cacheKey = `admin:stats:${range}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        return NextResponse.json(cached);
      }

      // Parallel queries for efficiency
      const [
        totalRevenue,
        periodRevenue,
        totalMembers,
        activeMembers,
        pendingCommissions,
        fraudAlerts,
        recentActivity
      ] = await Promise.all([
        // Total platform revenue (20% of all sales)
        prisma.commission.aggregate({
          where: { status: 'paid' },
          _sum: { platformShare: true }
        }),

        // Period revenue
        prisma.commission.aggregate({
          where: {
            status: 'paid',
            createdAt: { gte: startDate }
          },
          _sum: { platformShare: true }
        }),

        // Total members
        prisma.member.count(),

        // Active members (had activity in period)
        prisma.member.count({
          where: {
            OR: [
              { lastActive: { gte: startDate } },
              { createdAt: { gte: startDate } }
            ]
          }
        }),

        // Pending commissions
        prisma.commission.aggregate({
          where: { status: 'pending' },
          _sum: { memberShare: true },
          _count: true
        }),

        // Fraud alerts (high risk members)
        prisma.member.count({
          where: {
            OR: [
              { globalReferralsRank: { lte: 5 } }, // Top referrers (check for abuse)
              { lifetimeEarnings: { gte: 1000 } }, // High earners
            ]
          }
        }),

        // Recent activity
        prisma.commission.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            member: {
              select: {
                username: true,
                referralCode: true
              }
            }
          }
        })
      ]);

      // Calculate monthly revenue
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyRevenue = await prisma.commission.aggregate({
        where: {
          status: 'paid',
          createdAt: { gte: firstDayOfMonth }
        },
        _sum: { platformShare: true }
      });

      // Check system health
      const systemHealth = await checkSystemHealth();

      const stats = {
        totalRevenue: totalRevenue._sum.platformShare || 0,
        monthlyRevenue: monthlyRevenue._sum.platformShare || 0,
        periodRevenue: periodRevenue._sum.platformShare || 0,
        totalMembers,
        activeMembers,
        totalCommissions: pendingCommissions._count || 0,
        pendingPayouts: pendingCommissions._sum.memberShare || 0,
        fraudAlerts,
        systemHealth,
        recentActivity: recentActivity.map(c => ({
          id: c.id,
          amount: c.saleAmount,
          memberShare: c.memberShare,
          username: c.member?.username,
          createdAt: c.createdAt
        }))
      };

      // Cache for 5 minutes
      await cache.set(cacheKey, stats, 300);

      return NextResponse.json(stats);
    } catch (error) {
      console.error('Admin stats error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch admin stats' },
        { status: 500 }
      );
    }
  }, 'STRICT'); // Strict rate limiting for admin endpoints
}

// Check system health
async function checkSystemHealth(): Promise<'healthy' | 'degraded' | 'down'> {
  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;

    // Check Redis
    const cacheStats = await cache.getStats();
    if (!cacheStats?.connected) {
      return 'degraded';
    }

    return 'healthy';
  } catch (error) {
    console.error('System health check failed:', error);
    return 'down';
  }
}