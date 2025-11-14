// app/api/monitor/connections/route.ts
// Real-time database connection monitoring endpoint

import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get current connection stats from PostgreSQL
    const [
      activeConnections,
      connectionsByState,
      connectionsByApplication,
      databaseStats,
      poolerStats
    ] = await Promise.all([
      // Total active connections
      prisma.$queryRaw<any[]>`
        SELECT COUNT(*) as total
        FROM pg_stat_activity
        WHERE datname = current_database()
      `,

      // Connections grouped by state
      prisma.$queryRaw<any[]>`
        SELECT
          state,
          COUNT(*) as count,
          MAX(query_start) as last_query_time
        FROM pg_stat_activity
        WHERE datname = current_database()
        GROUP BY state
        ORDER BY count DESC
      `,

      // Connections by application
      prisma.$queryRaw<any[]>`
        SELECT
          application_name,
          COUNT(*) as count,
          string_agg(DISTINCT state, ', ') as states
        FROM pg_stat_activity
        WHERE datname = current_database()
        GROUP BY application_name
        ORDER BY count DESC
      `,

      // Database statistics
      prisma.$queryRaw<any[]>`
        SELECT
          numbackends as active_connections,
          xact_commit as total_commits,
          xact_rollback as total_rollbacks,
          blks_read as blocks_read,
          blks_hit as blocks_hit,
          tup_returned as rows_returned,
          tup_fetched as rows_fetched,
          conflicts as conflicts
        FROM pg_stat_database
        WHERE datname = current_database()
      `,

      // Connection pooler statistics (if using PgBouncer)
      prisma.$queryRaw<any[]>`
        SELECT
          COUNT(*) FILTER (WHERE state = 'active') as active,
          COUNT(*) FILTER (WHERE state = 'idle') as idle,
          COUNT(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
          COUNT(*) FILTER (WHERE state IS NULL) as available,
          COUNT(*) as total
        FROM pg_stat_activity
        WHERE datname = current_database()
      `.catch(() => null)
    ]);

    // Get connection limit from DATABASE_URL
    const dbUrl = process.env.DATABASE_URL || '';
    const connectionLimit = parseInt(dbUrl.match(/connection_limit=(\d+)/)?.[1] || '60');

    // Calculate connection usage percentage
    const currentConnections = Number(activeConnections[0]?.total || 0);
    const usagePercentage = Math.round((currentConnections / connectionLimit) * 100);

    // Determine health status
    let healthStatus: 'healthy' | 'warning' | 'critical';
    let recommendation = '';

    if (usagePercentage < 60) {
      healthStatus = 'healthy';
      recommendation = 'Connection pool is healthy. No action needed.';
    } else if (usagePercentage < 80) {
      healthStatus = 'warning';
      recommendation = 'Connection usage is elevated. Monitor closely and consider increasing connection_limit if this persists.';
    } else {
      healthStatus = 'critical';
      recommendation = 'Connection pool is nearly exhausted! Increase connection_limit immediately to prevent 500 errors.';
    }

    // Get long-running queries (potential connection hogs)
    const longRunningQueries = await prisma.$queryRaw<any[]>`
      SELECT
        pid,
        usename as username,
        application_name,
        client_addr as client_ip,
        state,
        query,
        EXTRACT(EPOCH FROM (now() - query_start))::INT as duration_seconds
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND state != 'idle'
        AND query_start < now() - interval '5 seconds'
      ORDER BY query_start ASC
      LIMIT 5
    `.catch(() => []);

    // Get connection history (last 10 minutes of activity)
    const connectionHistory = await prisma.$queryRaw<any[]>`
      SELECT
        date_trunc('minute', query_start) as minute,
        COUNT(DISTINCT pid) as unique_connections,
        COUNT(*) as total_queries
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND query_start > now() - interval '10 minutes'
      GROUP BY minute
      ORDER BY minute DESC
      LIMIT 10
    `.catch(() => []);

    // Compile monitoring data
    const monitoringData = {
      timestamp: new Date().toISOString(),
      health: {
        status: healthStatus,
        recommendation
      },
      connections: {
        current: currentConnections,
        limit: connectionLimit,
        available: connectionLimit - currentConnections,
        usagePercentage,
        byState: connectionsByState.map(s => ({
          state: s.state || 'idle',
          count: Number(s.count),
          lastQueryTime: s.last_query_time
        })),
        byApplication: connectionsByApplication.map(a => ({
          application: a.application_name || 'unknown',
          count: Number(a.count),
          states: a.states
        }))
      },
      pooler: poolerStats?.[0] ? {
        active: Number(poolerStats[0].active || 0),
        idle: Number(poolerStats[0].idle || 0),
        idleInTransaction: Number(poolerStats[0].idle_in_transaction || 0),
        available: Number(poolerStats[0].available || 0),
        total: Number(poolerStats[0].total || 0)
      } : null,
      database: databaseStats[0] ? {
        activeConnections: Number(databaseStats[0].active_connections || 0),
        totalCommits: Number(databaseStats[0].total_commits || 0),
        totalRollbacks: Number(databaseStats[0].total_rollbacks || 0),
        cacheHitRatio: databaseStats[0].blocks_hit > 0
          ? Math.round((Number(databaseStats[0].blocks_hit) / (Number(databaseStats[0].blocks_hit) + Number(databaseStats[0].blocks_read))) * 100)
          : 0,
        rowsReturned: Number(databaseStats[0].rows_returned || 0),
        rowsFetched: Number(databaseStats[0].rows_fetched || 0),
        conflicts: Number(databaseStats[0].conflicts || 0)
      } : null,
      longRunningQueries: longRunningQueries.map(q => ({
        pid: q.pid,
        username: q.username,
        application: q.application_name,
        clientIp: q.client_ip,
        state: q.state,
        query: q.query?.substring(0, 100) + (q.query?.length > 100 ? '...' : ''),
        durationSeconds: q.duration_seconds
      })),
      recentActivity: connectionHistory.map(h => ({
        minute: h.minute,
        uniqueConnections: Number(h.unique_connections || 0),
        totalQueries: Number(h.total_queries || 0)
      })),
      recommendations: getRecommendations(currentConnections, connectionLimit, usagePercentage)
    };

    return NextResponse.json(monitoringData, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error) {
    console.error('Connection monitoring error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch connection statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function getRecommendations(current: number, limit: number, percentage: number): string[] {
  const recommendations: string[] = [];

  if (percentage > 80) {
    recommendations.push(`⚠️ URGENT: Increase connection_limit to ${limit * 2} immediately`);
    recommendations.push('Consider implementing connection pooling at the application level');
  } else if (percentage > 60) {
    recommendations.push(`Consider increasing connection_limit to ${Math.ceil(limit * 1.5)}`);
    recommendations.push('Monitor for patterns during peak usage times');
  }

  if (current > 20 && limit < 30) {
    recommendations.push('Your app has high connection usage. Consider upgrading your Supabase plan for more connections.');
  }

  if (percentage < 20 && limit > 20) {
    recommendations.push(`You could reduce connection_limit to ${Math.max(10, Math.ceil(current * 2))} to optimize resource usage`);
  }

  // Always include best practices
  recommendations.push('Ensure all queries are using connection pooling (port 6543)');
  recommendations.push('Implement caching for frequently accessed data');

  return recommendations;
}