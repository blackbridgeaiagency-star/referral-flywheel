// lib/db/query-optimizer.ts
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';
import { LRUCache } from 'lru-cache';

/**
 * Database Query Optimizer
 *
 * Provides query caching, batching, and performance monitoring
 * to optimize database operations and reduce load
 */

// Query cache for frequently accessed data
const queryCache = new LRUCache<string, any>({
  max: 1000, // Cache up to 1000 queries
  ttl: 60 * 1000, // 1 minute TTL
  updateAgeOnGet: true,
});

// Query performance tracking
const queryMetrics = new Map<string, {
  count: number;
  totalTime: number;
  avgTime: number;
  maxTime: number;
  minTime: number;
}>();

/**
 * Cached query wrapper
 */
export async function cachedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  options: {
    ttl?: number;
    force?: boolean;
  } = {}
): Promise<T> {
  // Check cache unless forced refresh
  if (!options.force) {
    const cached = queryCache.get(key);
    if (cached !== undefined) {
      return cached as T;
    }
  }

  // Execute query with timing
  const startTime = performance.now();

  try {
    const result = await queryFn();

    const duration = performance.now() - startTime;
    trackQueryPerformance(key, duration);

    // Cache the result
    queryCache.set(key, result, {
      ttl: options.ttl || 60 * 1000,
    });

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    trackQueryPerformance(key, duration);
    throw error;
  }
}

/**
 * Track query performance metrics
 */
function trackQueryPerformance(queryKey: string, duration: number): void {
  const metrics = queryMetrics.get(queryKey) || {
    count: 0,
    totalTime: 0,
    avgTime: 0,
    maxTime: 0,
    minTime: Infinity,
  };

  metrics.count++;
  metrics.totalTime += duration;
  metrics.avgTime = metrics.totalTime / metrics.count;
  metrics.maxTime = Math.max(metrics.maxTime, duration);
  metrics.minTime = Math.min(metrics.minTime, duration);

  queryMetrics.set(queryKey, metrics);

  // Log slow queries
  if (duration > 1000) {
    console.warn(`⚠️ Slow query detected: ${queryKey} took ${duration.toFixed(2)}ms`);
  }
}

/**
 * Batch multiple database operations
 */
export class QueryBatcher<T> {
  private batch: Array<() => Promise<T>> = [];
  private batchSize: number;
  private batchTimeout: number;
  private timer: NodeJS.Timeout | null = null;

  constructor(batchSize = 100, batchTimeout = 100) {
    this.batchSize = batchSize;
    this.batchTimeout = batchTimeout;
  }

  add(query: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.batch.push(async () => {
        try {
          const result = await query();
          resolve(result);
          return result;
        } catch (error) {
          reject(error);
          throw error;
        }
      });

      if (this.batch.length >= this.batchSize) {
        this.flush();
      } else if (!this.timer) {
        this.timer = setTimeout(() => this.flush(), this.batchTimeout);
      }
    });
  }

  private async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const currentBatch = this.batch.slice();
    this.batch = [];

    if (currentBatch.length === 0) return;

    // Execute all queries in parallel
    await Promise.all(currentBatch.map(query => query()));
  }
}

/**
 * Optimized member stats query with caching
 */
export async function getOptimizedMemberStats(memberId: string, forceRefresh = false) {
  const cacheKey = `member-stats:${memberId}`;

  return cachedQuery(
    cacheKey,
    async () => {
      const [
        commissions,
        referralCount,
        recentReferrals,
      ] = await Promise.all([
        // Get all commissions with single query
        prisma.commission.groupBy({
          by: ['status'],
          where: {
            memberId,
            status: 'paid',
          },
          _sum: {
            memberShare: true,
          },
          _count: true,
        }),

        // Count referrals efficiently
        prisma.member.count({
          where: { referredBy: memberId },
        }),

        // Get recent referrals with limited fields
        prisma.member.findMany({
          where: { referredBy: memberId },
          select: {
            id: true,
            username: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
      ]);

      const lifetimeEarnings = commissions[0]?._sum?.memberShare || 0;

      return {
        lifetimeEarnings,
        totalReferred: referralCount,
        recentReferrals,
      };
    },
    { ttl: 30 * 1000, force: forceRefresh } // 30 second cache
  );
}

/**
 * Optimized creator dashboard query
 */
export async function getOptimizedCreatorStats(creatorId: string) {
  const cacheKey = `creator-stats:${creatorId}`;

  return cachedQuery(
    cacheKey,
    async () => {
      // Use aggregation pipeline for efficiency
      const stats = await prisma.$queryRaw<Array<{
        total_revenue: number;
        monthly_revenue: number;
        total_members: bigint;
        referred_members: bigint;
        total_commissions: bigint;
      }>>`
        SELECT
          COALESCE(SUM(c.sale_amount), 0) as total_revenue,
          COALESCE(SUM(
            CASE
              WHEN c.created_at >= DATE_TRUNC('month', CURRENT_DATE)
              THEN c.sale_amount
              ELSE 0
            END
          ), 0) as monthly_revenue,
          COUNT(DISTINCT m.id) as total_members,
          COUNT(DISTINCT CASE WHEN m.referred_by IS NOT NULL THEN m.id END) as referred_members,
          COUNT(c.id) as total_commissions
        FROM "Member" m
        LEFT JOIN "Commission" c ON c.member_id = m.id AND c.status = 'paid'
        WHERE m.creator_id = ${creatorId}
      `;

      return {
        totalRevenue: Number(stats[0]?.total_revenue || 0),
        monthlyRevenue: Number(stats[0]?.monthly_revenue || 0),
        totalMembers: Number(stats[0]?.total_members || 0),
        referredMembers: Number(stats[0]?.referred_members || 0),
        totalCommissions: Number(stats[0]?.total_commissions || 0),
      };
    },
    { ttl: 60 * 1000 } // 1 minute cache
  );
}

/**
 * Preload and warm cache for frequently accessed data
 */
export async function warmCache(): Promise<void> {
  console.log('🔥 Warming query cache...');

  try {
    // Get top creators to warm their caches
    const topCreators = await prisma.creator.findMany({
      select: { id: true },
      orderBy: { totalRevenue: 'desc' },
      take: 10,
    });

    // Warm creator caches in parallel
    await Promise.all(
      topCreators.map(creator => getOptimizedCreatorStats(creator.id))
    );

    // Get recently active members
    const activeMembers = await prisma.member.findMany({
      select: { id: true },
      where: {
        lastActive: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      take: 50,
    });

    // Warm member caches
    await Promise.all(
      activeMembers.map(member => getOptimizedMemberStats(member.id))
    );

    console.log(`✅ Cache warmed: ${topCreators.length} creators, ${activeMembers.length} members`);
  } catch (error) {
    console.error('❌ Cache warming failed:', error);
  }
}

/**
 * Get query performance report
 */
export function getQueryPerformanceReport(): Array<{
  query: string;
  count: number;
  avgTime: number;
  maxTime: number;
  totalTime: number;
}> {
  const report = Array.from(queryMetrics.entries())
    .map(([query, metrics]) => ({
      query,
      ...metrics,
    }))
    .sort((a, b) => b.totalTime - a.totalTime);

  return report;
}

/**
 * Clear query cache
 */
export function clearQueryCache(pattern?: string): void {
  if (pattern) {
    // Clear specific cache keys matching pattern
    const keys = Array.from(queryCache.keys());
    keys.forEach(key => {
      if (key.includes(pattern)) {
        queryCache.delete(key);
      }
    });
  } else {
    // Clear all cache
    queryCache.clear();
  }
}

/**
 * Database connection pool monitoring
 */
export async function getConnectionPoolStats(): Promise<{
  active: number;
  idle: number;
  total: number;
  waitingCount: number;
}> {
  const result = await prisma.$queryRaw<Array<{
    active: bigint;
    idle: bigint;
    total: bigint;
    waiting: bigint;
  }>>`
    SELECT
      (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active,
      (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle') as idle,
      (SELECT count(*) FROM pg_stat_activity) as total,
      (SELECT count(*) FROM pg_stat_activity WHERE wait_event IS NOT NULL) as waiting
  `;

  return {
    active: Number(result[0]?.active || 0),
    idle: Number(result[0]?.idle || 0),
    total: Number(result[0]?.total || 0),
    waitingCount: Number(result[0]?.waiting || 0),
  };
}

/**
 * Analyze and suggest indexes for slow queries
 */
export async function analyzeQueryPerformance(query: string): Promise<{
  executionPlan: any;
  suggestions: string[];
}> {
  try {
    // Get query execution plan
    const plan = await prisma.$queryRaw`EXPLAIN ANALYZE ${Prisma.sql([query])}`;

    // Analyze plan for optimization opportunities
    const suggestions: string[] = [];

    // Check for sequential scans
    if (JSON.stringify(plan).includes('Seq Scan')) {
      suggestions.push('Consider adding an index to avoid sequential scan');
    }

    // Check for high cost operations
    if (JSON.stringify(plan).includes('Sort')) {
      suggestions.push('Consider adding an index on the ORDER BY column');
    }

    return {
      executionPlan: plan,
      suggestions,
    };
  } catch (error) {
    console.error('Query analysis failed:', error);
    return {
      executionPlan: null,
      suggestions: ['Unable to analyze query'],
    };
  }
}

/**
 * Batch insert optimization
 */
export async function batchInsert<T>(
  model: any,
  data: T[],
  batchSize = 1000
): Promise<void> {
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    await model.createMany({
      data: batch,
      skipDuplicates: true,
    });
  }
}

/**
 * Initialize query optimizer
 */
export function initQueryOptimizer(): void {
  // Warm cache on startup
  warmCache();

  // Schedule periodic cache warming
  setInterval(() => warmCache(), 5 * 60 * 1000); // Every 5 minutes

  // Log performance report periodically
  setInterval(() => {
    const report = getQueryPerformanceReport();
    if (report.length > 0) {
      console.log('📊 Query Performance Report:');
      report.slice(0, 5).forEach(q => {
        console.log(`  ${q.query}: ${q.count} calls, avg ${q.avgTime.toFixed(2)}ms`);
      });
    }
  }, 60 * 1000); // Every minute
}