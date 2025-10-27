// lib/analytics/analytics-engine.ts
import { prisma } from '@/lib/db/prisma';
import { cache } from '@/lib/cache/redis';

/**
 * Analytics time periods
 */
export enum TimePeriod {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
  ALL_TIME = 'all_time',
}

/**
 * Metric types for tracking
 */
export enum MetricType {
  REVENUE = 'revenue',
  CONVERSIONS = 'conversions',
  SIGNUPS = 'signups',
  REFERRALS = 'referrals',
  COMMISSIONS = 'commissions',
  ENGAGEMENT = 'engagement',
  RETENTION = 'retention',
  CHURN = 'churn',
}

/**
 * Analytics data point
 */
export interface DataPoint {
  timestamp: Date;
  value: number;
  label?: string;
  metadata?: Record<string, any>;
}

/**
 * Analytics result
 */
export interface AnalyticsResult {
  metric: MetricType;
  period: TimePeriod;
  data: DataPoint[];
  summary: {
    total: number;
    average: number;
    min: number;
    max: number;
    trend: 'up' | 'down' | 'stable';
    changePercent: number;
  };
  segments?: Record<string, DataPoint[]>;
}

/**
 * Advanced Analytics Engine
 */
export class AnalyticsEngine {
  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(
    period: TimePeriod = TimePeriod.MONTH,
    creatorId?: string
  ): Promise<AnalyticsResult> {
    const cacheKey = `analytics:revenue:${period}:${creatorId || 'all'}`;

    // Try cache first
    const cached = await cache.get<AnalyticsResult>(cacheKey);
    if (cached) return cached;

    const { startDate, endDate } = this.getPeriodDates(period);

    // Fetch revenue data
    const commissions = await prisma.commission.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: 'paid',
        ...(creatorId && { creatorId }),
      },
      orderBy: { createdAt: 'asc' },
      select: {
        createdAt: true,
        saleAmount: true,
        platformShare: true,
        memberShare: true,
        creatorShare: true,
        paymentType: true,
      },
    });

    // Group by time bucket
    const dataPoints = this.groupByTimeBucket(
      commissions.map(c => ({
        timestamp: c.createdAt,
        value: c.platformShare,
        metadata: {
          type: c.paymentType,
          total: c.saleAmount,
        },
      })),
      period
    );

    // Calculate summary
    const values = dataPoints.map(d => d.value);
    const summary = this.calculateSummary(values, period);

    // Segment by payment type
    const segments = this.segmentData(commissions, 'paymentType', c => c.platformShare);

    const result: AnalyticsResult = {
      metric: MetricType.REVENUE,
      period,
      data: dataPoints,
      summary,
      segments,
    };

    // Cache for 1 hour
    await cache.set(cacheKey, result, 3600);
    return result;
  }

  /**
   * Get conversion analytics
   */
  async getConversionAnalytics(
    period: TimePeriod = TimePeriod.WEEK,
    creatorId?: string
  ): Promise<AnalyticsResult> {
    const cacheKey = `analytics:conversions:${period}:${creatorId || 'all'}`;

    const cached = await cache.get<AnalyticsResult>(cacheKey);
    if (cached) return cached;

    const { startDate, endDate } = this.getPeriodDates(period);

    // Get clicks and conversions
    const clicks = await prisma.attributionClick.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        // Note: AttributionClick doesn't have direct creatorId, would need to join through member
      },
      select: {
        createdAt: true,
        converted: true,
        convertedAt: true,
        conversionValue: true,
        referralCode: true,
      },
    });

    // Calculate conversion rate over time
    const dataPoints = this.calculateConversionRate(clicks, period);

    const values = dataPoints.map(d => d.value);
    const summary = this.calculateSummary(values, period);

    // Segment by referral code performance
    const segments = this.segmentConversions(clicks);

    const result: AnalyticsResult = {
      metric: MetricType.CONVERSIONS,
      period,
      data: dataPoints,
      summary,
      segments,
    };

    await cache.set(cacheKey, result, 3600);
    return result;
  }

  /**
   * Get member growth analytics
   */
  async getMemberGrowthAnalytics(
    period: TimePeriod = TimePeriod.MONTH,
    creatorId?: string
  ): Promise<AnalyticsResult> {
    const cacheKey = `analytics:growth:${period}:${creatorId || 'all'}`;

    const cached = await cache.get<AnalyticsResult>(cacheKey);
    if (cached) return cached;

    const { startDate, endDate } = this.getPeriodDates(period);

    // Get member signups
    const members = await prisma.member.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(creatorId && { creatorId }),
      },
      orderBy: { createdAt: 'asc' },
      select: {
        createdAt: true,
        memberOrigin: true,
        referredBy: true,
      },
    });

    // Group by time bucket
    const dataPoints = this.groupByTimeBucket(
      members.map(m => ({
        timestamp: m.createdAt,
        value: 1,
        metadata: {
          origin: m.memberOrigin,
          referred: !!m.referredBy,
        },
      })),
      period
    );

    // Cumulative growth
    let cumulative = 0;
    const cumulativeData = dataPoints.map(d => ({
      ...d,
      value: cumulative += d.value,
    }));

    const values = cumulativeData.map(d => d.value);
    const summary = this.calculateSummary(values, period);

    // Segment by origin
    const segments = {
      organic: members.filter(m => m.memberOrigin === 'organic').length,
      referred: members.filter(m => m.memberOrigin === 'referred').length,
    };

    const result: AnalyticsResult = {
      metric: MetricType.SIGNUPS,
      period,
      data: cumulativeData,
      summary,
      segments: {
        organic: [{ timestamp: new Date(), value: segments.organic }],
        referred: [{ timestamp: new Date(), value: segments.referred }],
      },
    };

    await cache.set(cacheKey, result, 3600);
    return result;
  }

  /**
   * Get retention analytics
   */
  async getRetentionAnalytics(
    period: TimePeriod = TimePeriod.MONTH
  ): Promise<AnalyticsResult> {
    const cacheKey = `analytics:retention:${period}`;

    const cached = await cache.get<AnalyticsResult>(cacheKey);
    if (cached) return cached;

    const { startDate, endDate } = this.getPeriodDates(period);

    // Get cohorts
    const cohorts = await this.getCohortRetention(startDate, endDate);

    const dataPoints = cohorts.map(c => ({
      timestamp: c.cohortDate,
      value: c.retentionRate,
      metadata: {
        cohortSize: c.size,
        retained: c.retained,
      },
    }));

    const values = dataPoints.map(d => d.value);
    const summary = this.calculateSummary(values, period);

    const result: AnalyticsResult = {
      metric: MetricType.RETENTION,
      period,
      data: dataPoints,
      summary,
    };

    await cache.set(cacheKey, result, 3600);
    return result;
  }

  /**
   * Get engagement analytics
   */
  async getEngagementAnalytics(
    period: TimePeriod = TimePeriod.WEEK
  ): Promise<AnalyticsResult> {
    const cacheKey = `analytics:engagement:${period}`;

    const cached = await cache.get<AnalyticsResult>(cacheKey);
    if (cached) return cached;

    const { startDate, endDate } = this.getPeriodDates(period);

    // Get member activity
    const activeMembers = await prisma.member.findMany({
      where: {
        lastActive: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        lastActive: true,
        totalReferred: true,
        lifetimeEarnings: true,
      },
    });

    // Calculate DAU/WAU/MAU
    const engagementMetrics = this.calculateEngagement(activeMembers, period);

    const dataPoints = engagementMetrics.map(m => ({
      timestamp: m.date,
      value: m.activeUsers,
      metadata: {
        dau: m.dau,
        wau: m.wau,
        mau: m.mau,
      },
    }));

    const values = dataPoints.map(d => d.value);
    const summary = this.calculateSummary(values, period);

    const result: AnalyticsResult = {
      metric: MetricType.ENGAGEMENT,
      period,
      data: dataPoints,
      summary,
    };

    await cache.set(cacheKey, result, 3600);
    return result;
  }

  /**
   * Get funnel analytics
   */
  async getFunnelAnalytics(
    startDate: Date,
    endDate: Date
  ): Promise<{
    steps: Array<{
      name: string;
      count: number;
      conversionRate: number;
    }>;
    overallConversion: number;
  }> {
    // Funnel steps
    const [clicks, signups, firstPurchase, referrals] = await Promise.all([
      // Step 1: Clicks
      prisma.attributionClick.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      }),

      // Step 2: Signups
      prisma.member.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      }),

      // Step 3: First Purchase
      prisma.commission.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          paymentType: 'initial',
        },
      }),

      // Step 4: Made referral
      prisma.member.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          totalReferred: { gt: 0 },
        },
      }),
    ]);

    const steps = [
      { name: 'Clicked Link', count: clicks, conversionRate: 100 },
      { name: 'Signed Up', count: signups, conversionRate: (signups / clicks) * 100 },
      { name: 'Made Purchase', count: firstPurchase, conversionRate: (firstPurchase / signups) * 100 },
      { name: 'Referred Others', count: referrals, conversionRate: (referrals / firstPurchase) * 100 },
    ];

    return {
      steps,
      overallConversion: (referrals / clicks) * 100,
    };
  }

  /**
   * Get real-time metrics
   */
  async getRealTimeMetrics(): Promise<{
    activeUsers: number;
    revenueToday: number;
    conversionsToday: number;
    signupsToday: number;
    topReferrers: Array<{ username: string; referrals: number }>;
    recentActivity: Array<{ type: string; message: string; timestamp: Date }>;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      activeUsers,
      revenueToday,
      conversionsToday,
      signupsToday,
      topReferrers,
      recentCommissions,
    ] = await Promise.all([
      // Active users (last 5 minutes)
      prisma.member.count({
        where: {
          lastActive: {
            gte: new Date(Date.now() - 5 * 60 * 1000),
          },
        },
      }),

      // Revenue today
      prisma.commission.aggregate({
        where: {
          createdAt: { gte: today },
          status: 'paid',
        },
        _sum: { platformShare: true },
      }),

      // Conversions today
      prisma.attributionClick.count({
        where: {
          convertedAt: { gte: today },
          converted: true,
        },
      }),

      // Signups today
      prisma.member.count({
        where: {
          createdAt: { gte: today },
        },
      }),

      // Top referrers today
      prisma.member.findMany({
        where: {
          monthlyReferred: { gt: 0 },
        },
        orderBy: { monthlyReferred: 'desc' },
        take: 5,
        select: {
          username: true,
          monthlyReferred: true,
        },
      }),

      // Recent activity
      prisma.commission.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          member: {
            select: { username: true },
          },
        },
      }),
    ]);

    const recentActivity = recentCommissions.map(c => ({
      type: 'commission',
      message: `${c.member?.username} earned $${c.memberShare.toFixed(2)}`,
      timestamp: c.createdAt,
    }));

    return {
      activeUsers,
      revenueToday: revenueToday._sum.platformShare || 0,
      conversionsToday,
      signupsToday,
      topReferrers: topReferrers.map(r => ({
        username: r.username,
        referrals: r.monthlyReferred,
      })),
      recentActivity,
    };
  }

  /**
   * Helper: Get period dates
   */
  private getPeriodDates(period: TimePeriod): { startDate: Date; endDate: Date } {
    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case TimePeriod.HOUR:
        startDate.setHours(now.getHours() - 1);
        break;
      case TimePeriod.DAY:
        startDate.setDate(now.getDate() - 1);
        break;
      case TimePeriod.WEEK:
        startDate.setDate(now.getDate() - 7);
        break;
      case TimePeriod.MONTH:
        startDate.setMonth(now.getMonth() - 1);
        break;
      case TimePeriod.QUARTER:
        startDate.setMonth(now.getMonth() - 3);
        break;
      case TimePeriod.YEAR:
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case TimePeriod.ALL_TIME:
        startDate = new Date(2020, 0, 1);
        break;
    }

    return { startDate, endDate: now };
  }

  /**
   * Helper: Group data by time bucket
   */
  private groupByTimeBucket(
    data: Array<{ timestamp: Date; value: number; metadata?: any }>,
    period: TimePeriod
  ): DataPoint[] {
    const buckets = new Map<string, DataPoint>();

    data.forEach(item => {
      const key = this.getTimeBucketKey(item.timestamp, period);
      const existing = buckets.get(key);

      if (existing) {
        existing.value += item.value;
      } else {
        buckets.set(key, {
          timestamp: this.getTimeBucketDate(item.timestamp, period),
          value: item.value,
          metadata: item.metadata,
        });
      }
    });

    return Array.from(buckets.values()).sort((a, b) =>
      a.timestamp.getTime() - b.timestamp.getTime()
    );
  }

  /**
   * Helper: Get time bucket key
   */
  private getTimeBucketKey(date: Date, period: TimePeriod): string {
    switch (period) {
      case TimePeriod.HOUR:
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
      case TimePeriod.DAY:
      case TimePeriod.WEEK:
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      case TimePeriod.MONTH:
      case TimePeriod.QUARTER:
        return `${date.getFullYear()}-${date.getMonth()}`;
      case TimePeriod.YEAR:
      case TimePeriod.ALL_TIME:
        return `${date.getFullYear()}`;
      default:
        return date.toISOString();
    }
  }

  /**
   * Helper: Get time bucket date
   */
  private getTimeBucketDate(date: Date, period: TimePeriod): Date {
    const result = new Date(date);

    switch (period) {
      case TimePeriod.HOUR:
        result.setMinutes(0, 0, 0);
        break;
      case TimePeriod.DAY:
      case TimePeriod.WEEK:
        result.setHours(0, 0, 0, 0);
        break;
      case TimePeriod.MONTH:
      case TimePeriod.QUARTER:
        result.setDate(1);
        result.setHours(0, 0, 0, 0);
        break;
      case TimePeriod.YEAR:
      case TimePeriod.ALL_TIME:
        result.setMonth(0, 1);
        result.setHours(0, 0, 0, 0);
        break;
    }

    return result;
  }

  /**
   * Helper: Calculate summary statistics
   */
  private calculateSummary(
    values: number[],
    period: TimePeriod
  ): AnalyticsResult['summary'] {
    if (values.length === 0) {
      return {
        total: 0,
        average: 0,
        min: 0,
        max: 0,
        trend: 'stable',
        changePercent: 0,
      };
    }

    const total = values.reduce((sum, v) => sum + v, 0);
    const average = total / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Calculate trend
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    let changePercent = 0;

    if (firstAvg > 0) {
      changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;
      if (changePercent > 5) trend = 'up';
      else if (changePercent < -5) trend = 'down';
    }

    return {
      total,
      average,
      min,
      max,
      trend,
      changePercent,
    };
  }

  /**
   * Helper: Segment data
   */
  private segmentData<T>(
    data: T[],
    key: keyof T,
    getValue: (item: T) => number
  ): Record<string, DataPoint[]> {
    const segments: Record<string, DataPoint[]> = {};

    data.forEach(item => {
      const segmentKey = String(item[key]);
      if (!segments[segmentKey]) {
        segments[segmentKey] = [];
      }
      segments[segmentKey].push({
        timestamp: (item as any).createdAt || new Date(),
        value: getValue(item),
      });
    });

    return segments;
  }

  /**
   * Helper: Calculate conversion rate
   */
  private calculateConversionRate(
    clicks: Array<{
      createdAt: Date;
      converted: boolean;
      convertedAt: Date | null;
      conversionValue: number | null;
    }>,
    period: TimePeriod
  ): DataPoint[] {
    const buckets = new Map<string, { clicks: number; conversions: number }>();

    clicks.forEach(click => {
      const key = this.getTimeBucketKey(click.createdAt, period);
      const existing = buckets.get(key) || { clicks: 0, conversions: 0 };

      existing.clicks++;
      if (click.converted) {
        existing.conversions++;
      }

      buckets.set(key, existing);
    });

    return Array.from(buckets.entries()).map(([key, data]) => ({
      timestamp: new Date(key),
      value: data.clicks > 0 ? (data.conversions / data.clicks) * 100 : 0,
      metadata: {
        clicks: data.clicks,
        conversions: data.conversions,
      },
    }));
  }

  /**
   * Helper: Segment conversions
   */
  private segmentConversions(
    clicks: Array<{
      referralCode: string;
      converted: boolean;
      conversionValue: number | null;
    }>
  ): Record<string, DataPoint[]> {
    const segments: Record<string, DataPoint[]> = {};

    // Group by referral code
    const codeGroups = new Map<string, { conversions: number; value: number }>();

    clicks.forEach(click => {
      if (click.converted && click.referralCode) {
        const existing = codeGroups.get(click.referralCode) || { conversions: 0, value: 0 };
        existing.conversions++;
        existing.value += click.conversionValue || 0;
        codeGroups.set(click.referralCode, existing);
      }
    });

    // Convert to segments
    codeGroups.forEach((data, code) => {
      segments[code] = [{
        timestamp: new Date(),
        value: data.conversions,
        metadata: { totalValue: data.value },
      }];
    });

    return segments;
  }

  /**
   * Helper: Get cohort retention
   */
  private async getCohortRetention(
    startDate: Date,
    endDate: Date
  ): Promise<Array<{
    cohortDate: Date;
    size: number;
    retained: number;
    retentionRate: number;
  }>> {
    // Get cohorts by signup week
    const cohorts = await prisma.member.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      _count: true,
    });

    const retentionData = await Promise.all(
      cohorts.map(async cohort => {
        const cohortDate = new Date(cohort.createdAt);
        const oneWeekLater = new Date(cohortDate);
        oneWeekLater.setDate(cohortDate.getDate() + 7);

        // Count active users one week later
        const retained = await prisma.member.count({
          where: {
            createdAt: cohortDate,
            lastActive: { gte: oneWeekLater },
          },
        });

        return {
          cohortDate,
          size: cohort._count,
          retained,
          retentionRate: (retained / cohort._count) * 100,
        };
      })
    );

    return retentionData;
  }

  /**
   * Helper: Calculate engagement metrics
   */
  private calculateEngagement(
    members: Array<{
      lastActive: Date | null;
      totalReferred: number;
      lifetimeEarnings: number;
    }>,
    period: TimePeriod
  ): Array<{
    date: Date;
    activeUsers: number;
    dau: number;
    wau: number;
    mau: number;
  }> {
    const now = new Date();
    const metrics = [];

    // Calculate for each day in the period
    const days = period === TimePeriod.WEEK ? 7 : period === TimePeriod.MONTH ? 30 : 1;

    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dau = members.filter(m =>
        m.lastActive && m.lastActive >= dayStart && m.lastActive <= dayEnd
      ).length;

      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - 7);
      const wau = members.filter(m =>
        m.lastActive && m.lastActive >= weekStart && m.lastActive <= dayEnd
      ).length;

      const monthStart = new Date(date);
      monthStart.setDate(date.getDate() - 30);
      const mau = members.filter(m =>
        m.lastActive && m.lastActive >= monthStart && m.lastActive <= dayEnd
      ).length;

      metrics.push({
        date,
        activeUsers: dau,
        dau,
        wau,
        mau,
      });
    }

    return metrics.reverse();
  }
}

// Export singleton instance
export const analyticsEngine = new AnalyticsEngine();