/**
 * Health check endpoint
 * Monitor database, cache, and system health
 *
 * GET /api/health
 *
 * Returns:
 * - 200 OK: All systems healthy
 * - 503 Service Unavailable: Database or critical service down
 */

import { NextResponse } from 'next/server';
import { checkDatabaseHealth, getConnectionPoolStats } from '@/lib/db/queries-optimized';
import { getCacheStats } from '@/lib/cache';

export const dynamic = 'force-dynamic';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: {
      healthy: boolean;
      latency: number; // ms
      connectionPool?: {
        total: number;
        active: number;
        idle: number;
        waiting: number;
      };
    };
    cache: {
      healthy: boolean;
      size: number;
      hitRate?: number;
    };
    materializedViews?: {
      memberStats: boolean;
      creatorAnalytics: boolean;
    };
  };
  version: string;
  environment: string;
}

export async function GET() {
  const start = Date.now();

  try {
    // Check database health
    const dbHealth = await checkDatabaseHealth();
    let poolStats;
    try {
      poolStats = await getConnectionPoolStats();
    } catch (error) {
      console.warn('Failed to get connection pool stats:', error);
    }

    // Check cache health
    const cacheStats = getCacheStats();

    // Check materialized views exist
    let materializedViewsStatus;
    try {
      const { prismaOptimized } = await import('@/lib/db/queries-optimized');
      const viewCheck = await prismaOptimized.$queryRaw<Array<{ exists: boolean }>>`
        SELECT EXISTS (
          SELECT 1 FROM pg_matviews WHERE matviewname = 'member_stats_mv'
        ) as exists
      `;
      const memberStatsExists = viewCheck[0]?.exists || false;

      const viewCheck2 = await prismaOptimized.$queryRaw<Array<{ exists: boolean }>>`
        SELECT EXISTS (
          SELECT 1 FROM pg_matviews WHERE matviewname = 'creator_analytics_mv'
        ) as exists
      `;
      const creatorAnalyticsExists = viewCheck2[0]?.exists || false;

      materializedViewsStatus = {
        memberStats: memberStatsExists,
        creatorAnalytics: creatorAnalyticsExists,
      };
    } catch (error) {
      console.warn('Failed to check materialized views:', error);
      materializedViewsStatus = {
        memberStats: false,
        creatorAnalytics: false,
      };
    }

    // Determine overall health status
    const allViewsHealthy = materializedViewsStatus.memberStats && materializedViewsStatus.creatorAnalytics;
    const status = !dbHealth.healthy
      ? 'unhealthy'
      : !allViewsHealthy
      ? 'degraded'
      : 'healthy';

    const healthStatus: HealthStatus = {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: {
          healthy: dbHealth.healthy,
          latency: dbHealth.latency,
          connectionPool: poolStats,
        },
        cache: {
          healthy: true,
          size: cacheStats.size,
          hitRate: cacheStats.hitRate,
        },
        materializedViews: materializedViewsStatus,
      },
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
    };

    const responseTime = Date.now() - start;

    // Return appropriate status code
    const statusCode = status === 'unhealthy' ? 503 : 200;

    return NextResponse.json(
      {
        ...healthStatus,
        responseTime,
      },
      {
        status: statusCode,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Response-Time': `${responseTime}ms`,
        },
      }
    );
  } catch (error) {
    console.error('Health check failed:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - start,
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  }
}
