/**
 * Database Query Optimizer for High-Load Scenarios
 * Implements query batching, caching, and optimization strategies
 */

import { prisma } from '../db/prisma';
import { caches, withCache } from '../cache/memory-cache';
import logger from '../logger';

/**
 * Batch multiple database queries for efficiency
 */
export class QueryBatcher<T> {
  private queue: Array<{
    key: string;
    resolve: (value: T) => void;
    reject: (error: any) => void;
  }> = [];
  private timeout: NodeJS.Timeout | null = null;
  private batchSize: number;
  private batchDelay: number;

  constructor(
    private batchFn: (keys: string[]) => Promise<Map<string, T>>,
    options: { batchSize?: number; batchDelay?: number } = {}
  ) {
    this.batchSize = options.batchSize || 100;
    this.batchDelay = options.batchDelay || 10; // milliseconds
  }

  async get(key: string): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ key, resolve, reject });

      if (this.queue.length >= this.batchSize) {
        this.flush();
      } else if (!this.timeout) {
        this.timeout = setTimeout(() => this.flush(), this.batchDelay);
      }
    });
  }

  private async flush() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    const batch = this.queue.splice(0, this.batchSize);
    if (batch.length === 0) return;

    const keys = batch.map(item => item.key);

    try {
      const results = await this.batchFn(keys);

      for (const item of batch) {
        const result = results.get(item.key);
        if (result !== undefined) {
          item.resolve(result);
        } else {
          item.reject(new Error(`No result for key: ${item.key}`));
        }
      }
    } catch (error) {
      for (const item of batch) {
        item.reject(error);
      }
    }
  }
}

/**
 * Optimized queries for high-frequency operations
 */
export const optimizedQueries = {
  /**
   * Get member with caching
   */
  async getMember(membershipId: string) {
    return withCache(
      caches.db,
      `member:${membershipId}`,
      async () => {
        return prisma.member.findUnique({
          where: { membershipId },
          select: {
            id: true,
            membershipId: true,
            userId: true,
            email: true,
            username: true,
            referralCode: true,
            creatorId: true,
            subscriptionPrice: true,
            billingPeriod: true,
            monthlyValue: true,
            lifetimeEarnings: true,
            referredBy: true,
            createdAt: true,
          },
        });
      },
      300 // 5 minute cache
    );
  },

  /**
   * Get creator with caching
   */
  async getCreator(creatorId: string) {
    return withCache(
      caches.db,
      `creator:${creatorId}`,
      async () => {
        return prisma.creator.findUnique({
          where: { id: creatorId },
        });
      },
      600 // 10 minute cache
    );
  },

  /**
   * Get leaderboard with aggressive caching
   */
  async getLeaderboard(creatorId: string, period: 'all' | 'month' | 'week') {
    return withCache(
      caches.leaderboard,
      `leaderboard:${creatorId}:${period}`,
      async () => {
        const dateFilter = period === 'month'
          ? { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
          : period === 'week'
          ? { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
          : {};

        return prisma.member.findMany({
          where: {
            creatorId,
            totalReferred: { gt: 0 },
            ...dateFilter,
          },
          select: {
            id: true,
            username: true,
            referralCode: true,
            totalReferred: true,
            lifetimeEarnings: true,
            monthlyEarnings: true,
          },
          orderBy: [
            { totalReferred: 'desc' },
            { lifetimeEarnings: 'desc' },
          ],
          take: 50, // Limit to top 50 for performance
        });
      },
      60 // 1 minute cache for real-time feel
    );
  },

  /**
   * Bulk fetch members (for batch operations)
   */
  async getMembersInBatch(membershipIds: string[]) {
    // Split into chunks to avoid query size limits
    const chunkSize = 100;
    const chunks = [];

    for (let i = 0; i < membershipIds.length; i += chunkSize) {
      chunks.push(membershipIds.slice(i, i + chunkSize));
    }

    const results = await Promise.all(
      chunks.map(chunk =>
        prisma.member.findMany({
          where: {
            membershipId: { in: chunk },
          },
          select: {
            id: true,
            membershipId: true,
            userId: true,
            email: true,
            username: true,
            referralCode: true,
            creatorId: true,
            subscriptionPrice: true,
            totalReferred: true,
            lifetimeEarnings: true,
          },
        })
      )
    );

    return results.flat();
  },

  /**
   * Optimized commission calculation with caching
   */
  async getCommissionStats(memberId: string, period?: { start: Date; end: Date }) {
    const cacheKey = `commission:${memberId}:${period?.start?.toISOString() || 'all'}`;

    return withCache(
      caches.commission,
      cacheKey,
      async () => {
        const whereClause = {
          memberId,
          ...(period && {
            createdAt: {
              gte: period.start,
              lte: period.end,
            },
          }),
        };

        const [total, count, commissions] = await Promise.all([
          prisma.commission.aggregate({
            where: whereClause,
            _sum: { memberShare: true },
          }),
          prisma.commission.count({ where: whereClause }),
          prisma.commission.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            take: 100, // Limit recent commissions
            select: {
              id: true,
              memberShare: true,
              paymentType: true,
              createdAt: true,
              whopPaymentId: true,
            },
          }),
        ]);

        return {
          totalAmount: total._sum.memberShare || 0,
          count,
          recentCommissions: commissions,
        };
      },
      300 // 5 minute cache
    );
  },
};

/**
 * Database connection health checker
 */
export class DatabaseHealthMonitor {
  private isHealthy = true;
  private lastCheck = 0;
  private checkInterval = 30000; // 30 seconds
  private unhealthyCount = 0;

  async checkHealth(): Promise<boolean> {
    const now = Date.now();

    // Use cached result if recent
    if (now - this.lastCheck < this.checkInterval) {
      return this.isHealthy;
    }

    this.lastCheck = now;

    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - start;

      if (latency > 1000) {
        logger.warn(`Database latency high: ${latency}ms`);
      }

      this.isHealthy = true;
      this.unhealthyCount = 0;
      return true;
    } catch (error) {
      this.unhealthyCount++;
      this.isHealthy = false;

      if (this.unhealthyCount >= 3) {
        logger.error('Database unhealthy for 3 consecutive checks', error);
      }

      return false;
    }
  }

  isCurrentlyHealthy(): boolean {
    return this.isHealthy;
  }
}

// Create singleton instances
export const dbHealth = new DatabaseHealthMonitor();

/**
 * Query optimization middleware
 */
export function optimizeQuery<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: {
    cache?: boolean;
    cacheTTL?: number;
    batchable?: boolean;
  } = {}
): T {
  return (async (...args: Parameters<T>) => {
    // Check database health
    if (!dbHealth.isCurrentlyHealthy()) {
      // Use cache if available when DB is unhealthy
      if (options.cache) {
        const cacheKey = JSON.stringify(args);
        const cached = caches.db.get(cacheKey);
        if (cached) {
          logger.info('Using cache due to unhealthy database');
          return cached;
        }
      }
    }

    // Execute query
    const result = await fn(...args);

    // Cache result if configured
    if (options.cache) {
      const cacheKey = JSON.stringify(args);
      caches.db.set(cacheKey, result, options.cacheTTL);
    }

    return result;
  }) as T;
}

export default optimizedQueries;