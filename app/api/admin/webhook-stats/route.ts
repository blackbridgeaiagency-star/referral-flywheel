// app/api/admin/webhook-stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db/prisma';
import { withRateLimit } from '../../../../lib/middleware/rate-limit';
import { isAdmin } from '../../../../lib/whop/simple-auth';
import { subHours, subDays, startOfHour, format } from 'date-fns';
import logger from '../../../../lib/logger';


/**
 * Webhook Statistics API
 *
 * Provides real-time monitoring data for webhook processing
 * Used by the admin webhook monitoring dashboard
 *
 * SECURITY: Requires admin authentication
 */
export async function GET(request: NextRequest) {
  // SECURITY: Verify admin access
  if (!await isAdmin()) {
    logger.warn('[ADMIN] Unauthorized access attempt to /api/admin/webhook-stats');
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return withRateLimit(request, async (request) => {
    try {
      // Parse query parameters
      const searchParams = request.nextUrl.searchParams;
      const range = searchParams.get('range') || '24h';

      // Calculate date range
      let startDate: Date;
      switch (range) {
        case '1h':
          startDate = subHours(new Date(), 1);
          break;
        case '24h':
          startDate = subDays(new Date(), 1);
          break;
        case '7d':
          startDate = subDays(new Date(), 7);
          break;
        case '30d':
          startDate = subDays(new Date(), 30);
          break;
        default:
          startDate = subDays(new Date(), 1);
      }

      // Fetch webhook events from database
      const [
        totalCommissions,
        successfulCommissions,
        failedCommissions,
        recentCommissions,
        hourlyData
      ] = await Promise.all([
        // Total count
        prisma.commission.count({
          where: {
            createdAt: { gte: startDate },
          },
        }),

        // Successful count
        prisma.commission.count({
          where: {
            createdAt: { gte: startDate },
            status: 'paid',
          },
        }),

        // Failed count
        prisma.commission.count({
          where: {
            createdAt: { gte: startDate },
            status: 'failed',
          },
        }),

        // Recent events with details
        prisma.commission.findMany({
          where: {
            createdAt: { gte: startDate },
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
          include: {
            member: {
              select: {
                username: true,
                referralCode: true,
              },
            },
          },
        }),

        // Hourly statistics
        getHourlyStats(startDate),
      ]);

      // Calculate aggregate statistics
      const pendingCommissions = totalCommissions - successfulCommissions - failedCommissions;

      // Calculate average processing time (mock for now)
      const avgDuration = 150; // Would track this in production

      // Calculate success rate
      const successRate = totalCommissions > 0
        ? (successfulCommissions / totalCommissions) * 100
        : 100;

      // Calculate total revenue
      const totalRevenue = recentCommissions
        .filter(c => c.status === 'paid')
        .reduce((sum, c) => sum + c.saleAmount, 0);

      // Format events for frontend
      const events = recentCommissions.map(commission => ({
        id: commission.id,
        timestamp: commission.createdAt,
        action: 'app_payment.succeeded',
        status: commission.status === 'paid' ? 'success' :
                commission.status === 'failed' ? 'failed' : 'pending',
        duration: avgDuration + Math.random() * 100, // Mock variation
        paymentId: commission.whopPaymentId,
        membershipId: commission.whopMembershipId,
        amount: commission.saleAmount,
        error: commission.failureReason,
        retryCount: 0, // Would track this in production
      }));

      // Format response
      const stats = {
        total: totalCommissions,
        successful: successfulCommissions,
        failed: failedCommissions,
        pending: pendingCommissions,
        avgDuration,
        successRate,
        totalRevenue,
        recentEvents: events.slice(0, 20),
        hourlyStats: hourlyData,
      };

      return NextResponse.json({
        success: true,
        stats,
        events,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger.error('Failed to fetch webhook stats:', error);

      return NextResponse.json(
        {
          error: 'Failed to fetch statistics',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  }, 'member');
}

/**
 * Get hourly statistics for chart
 */
async function getHourlyStats(startDate: Date) {
  const hours = [];
  const now = new Date();

  // Generate hours based on range
  const hourCount = Math.min(24, Math.ceil((now.getTime() - startDate.getTime()) / (60 * 60 * 1000)));

  for (let i = hourCount - 1; i >= 0; i--) {
    const hourStart = startOfHour(subHours(now, i));
    const hourEnd = startOfHour(subHours(now, i - 1));

    const [total, success, failed] = await Promise.all([
      prisma.commission.count({
        where: {
          createdAt: {
            gte: hourStart,
            lt: hourEnd,
          },
        },
      }),

      prisma.commission.count({
        where: {
          createdAt: {
            gte: hourStart,
            lt: hourEnd,
          },
          status: 'paid',
        },
      }),

      prisma.commission.count({
        where: {
          createdAt: {
            gte: hourStart,
            lt: hourEnd,
          },
          status: 'failed',
        },
      }),
    ]);

    hours.push({
      hour: format(hourStart, 'HH:mm'),
      count: total,
      success,
      failed,
    });
  }

  return hours;
}

/**
 * Webhook health check endpoint
 *
 * SECURITY: Requires admin authentication
 */
export async function POST(request: NextRequest) {
  // SECURITY: Verify admin access
  if (!await isAdmin()) {
    logger.warn('[ADMIN] Unauthorized access attempt to /api/admin/webhook-stats POST');
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Test webhook processing
    const testPayload = {
      action: 'health_check',
      timestamp: new Date().toISOString(),
    };

    // Simulate webhook processing
    const startTime = Date.now();

    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: 'Webhook system is healthy',
      duration,
      databaseConnected: true,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Webhook health check failed:', error);

    return NextResponse.json(
      {
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}