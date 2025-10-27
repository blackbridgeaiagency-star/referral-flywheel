/**
 * Optimized database queries with connection pooling
 * Uses materialized views for expensive queries
 * Implements batching and caching strategies
 */

import { PrismaClient } from '@prisma/client';

// Singleton pattern for Prisma client with connection pooling
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prismaOptimized = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL, // Uses Supabase Pooler (port 6543)
    },
  },
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prismaOptimized;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MEMBER QUERIES (Using materialized view)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface MemberStats {
  id: string;
  userId: string;
  membershipId: string;
  username: string;
  referralCode: string;
  creatorId: string;
  lifetimeEarnings: number;
  monthlyEarnings: number;
  totalReferred: number;
  monthlyReferred: number;
  createdAt: Date;
  globalEarningsRank: number;
  globalReferralsRank: number;
  communityEarningsRank: number;
  communityReferralsRank: number;
  weeklyRank: number;
  weeklyEarnings: number;
  weeklyReferrals: number;
  monthlyRank: number;
  tier: string;
  conversionRate: number;
  totalClicks: number;
  activeClicks: number;
}

/**
 * Get member stats from materialized view (FAST)
 * Refreshed every 5 minutes
 */
export async function getMemberStats(userId: string): Promise<MemberStats | null> {
  const result = await prismaOptimized.$queryRaw<MemberStats[]>`
    SELECT * FROM member_stats_mv
    WHERE "userId" = ${userId}
    LIMIT 1
  `;
  return result[0] || null;
}

/**
 * Get member stats by referral code (for referral redirect)
 */
export async function getMemberStatsByCode(referralCode: string): Promise<MemberStats | null> {
  const result = await prismaOptimized.$queryRaw<MemberStats[]>`
    SELECT * FROM member_stats_mv
    WHERE "referralCode" = ${referralCode}
    LIMIT 1
  `;
  return result[0] || null;
}

/**
 * Batch fetch member stats (for leaderboards, CSV exports, etc.)
 * Optimized for bulk operations
 */
export async function batchGetMemberStats(userIds: string[]): Promise<MemberStats[]> {
  if (userIds.length === 0) return [];

  return prismaOptimized.$queryRaw<MemberStats[]>`
    SELECT * FROM member_stats_mv
    WHERE "userId" = ANY(${userIds}::text[])
    ORDER BY "lifetimeEarnings" DESC
  `;
}

/**
 * Get leaderboard for a specific creator
 * Uses materialized view for instant results
 */
export async function getCreatorLeaderboard(
  creatorId: string,
  type: 'earnings' | 'referrals' | 'weekly' | 'monthly',
  limit: number = 100
): Promise<MemberStats[]> {
  const orderBy = {
    earnings: '"communityEarningsRank" ASC',
    referrals: '"communityReferralsRank" ASC',
    weekly: '"weeklyRank" ASC',
    monthly: '"monthlyRank" ASC',
  }[type];

  return prismaOptimized.$queryRaw<MemberStats[]>`
    SELECT * FROM member_stats_mv
    WHERE "creatorId" = ${creatorId}
    ORDER BY ${prismaOptimized.$queryRawUnsafe(orderBy)}
    LIMIT ${limit}
  `;
}

/**
 * Get global leaderboard (across all creators)
 */
export async function getGlobalLeaderboard(
  type: 'earnings' | 'referrals',
  limit: number = 100
): Promise<MemberStats[]> {
  const orderBy = type === 'earnings' ? '"globalEarningsRank" ASC' : '"globalReferralsRank" ASC';

  return prismaOptimized.$queryRaw<MemberStats[]>`
    SELECT * FROM member_stats_mv
    ORDER BY ${prismaOptimized.$queryRawUnsafe(orderBy)}
    LIMIT ${limit}
  `;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CREATOR QUERIES (Using materialized view)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface CreatorAnalytics {
  id: string;
  companyId: string;
  companyName: string;
  productId: string;
  createdAt: Date;
  totalMembers: number;
  activeMembers30d: number;
  activeMembers7d: number;
  newMembers30d: number;
  lifetimeRevenue: number;
  revenue30d: number;
  revenue7d: number;
  revenueToday: number;
  monthlyRecurringRevenue: number;
  totalReferrals: number;
  referrals30d: number;
  referrals7d: number;
  totalClicks: number;
  activeClicks: number;
  convertedClicks: number;
  conversionRate: number;
  avgOrderValue: number;
  totalCommissions: number;
  pendingCommissions: number;
  paidCommissions: number;
  initialCommissions: number;
  recurringCommissions: number;
  revenueGrowthRate30d: number;
  topEarnerUsername: string | null;
  topEarnerAmount: number | null;
  topReferrerUsername: string | null;
  topReferrerCount: number | null;
}

/**
 * Get creator analytics from materialized view (FAST)
 * Perfect for creator dashboard
 */
export async function getCreatorAnalytics(companyId: string): Promise<CreatorAnalytics | null> {
  const result = await prismaOptimized.$queryRaw<CreatorAnalytics[]>`
    SELECT * FROM creator_analytics_mv
    WHERE "companyId" = ${companyId}
    LIMIT 1
  `;
  return result[0] || null;
}

/**
 * Get all creator analytics (for platform admin dashboard)
 */
export async function getAllCreatorAnalytics(): Promise<CreatorAnalytics[]> {
  return prismaOptimized.$queryRaw<CreatorAnalytics[]>`
    SELECT * FROM creator_analytics_mv
    ORDER BY "lifetimeRevenue" DESC
  `;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOP PERFORMERS (For creator dashboard)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface TopPerformer {
  username: string;
  referralCode: string;
  lifetimeEarnings: number;
  monthlyEarnings: number;
  totalReferred: number;
  communityEarningsRank: number;
}

/**
 * Get top earners for a creator
 */
export async function getTopEarners(creatorId: string, limit: number = 10): Promise<TopPerformer[]> {
  return prismaOptimized.$queryRaw<TopPerformer[]>`
    SELECT
      username,
      "referralCode",
      "lifetimeEarnings",
      "monthlyEarnings",
      "totalReferred",
      "communityEarningsRank"
    FROM member_stats_mv
    WHERE "creatorId" = ${creatorId}
    ORDER BY "communityEarningsRank" ASC
    LIMIT ${limit}
  `;
}

/**
 * Get top referrers for a creator
 */
export async function getTopReferrers(creatorId: string, limit: number = 10): Promise<TopPerformer[]> {
  return prismaOptimized.$queryRaw<TopPerformer[]>`
    SELECT
      username,
      "referralCode",
      "lifetimeEarnings",
      "monthlyEarnings",
      "totalReferred",
      "communityEarningsRank"
    FROM member_stats_mv
    WHERE "creatorId" = ${creatorId}
    ORDER BY "totalReferred" DESC
    LIMIT ${limit}
  `;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REAL-TIME QUERIES (Bypass materialized views for latest data)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Get real-time member earnings (for live updates)
 * Bypasses materialized view, queries directly
 */
export async function getRealTimeMemberEarnings(memberId: string): Promise<{
  lifetimeEarnings: number;
  monthlyEarnings: number;
  last7Days: number;
  last24Hours: number;
}> {
  const result = await prismaOptimized.$queryRaw<Array<{
    lifetimeEarnings: number;
    monthlyEarnings: number;
    last7Days: number;
    last24Hours: number;
  }>>`
    SELECT
      COALESCE(SUM(CASE WHEN status = 'paid' THEN "memberShare" ELSE 0 END), 0) as "lifetimeEarnings",
      COALESCE(SUM(CASE WHEN status = 'paid' AND "paidAt" >= DATE_TRUNC('month', NOW()) THEN "memberShare" ELSE 0 END), 0) as "monthlyEarnings",
      COALESCE(SUM(CASE WHEN status = 'paid' AND "paidAt" >= NOW() - INTERVAL '7 days' THEN "memberShare" ELSE 0 END), 0) as "last7Days",
      COALESCE(SUM(CASE WHEN status = 'paid' AND "paidAt" >= NOW() - INTERVAL '24 hours' THEN "memberShare" ELSE 0 END), 0) as "last24Hours"
    FROM "Commission"
    WHERE "memberId" = ${memberId}
  `;

  return result[0] || { lifetimeEarnings: 0, monthlyEarnings: 0, last7Days: 0, last24Hours: 0 };
}

/**
 * Get real-time creator revenue (for live dashboard)
 */
export async function getRealTimeCreatorRevenue(creatorId: string): Promise<{
  lifetimeRevenue: number;
  monthlyRevenue: number;
  last7Days: number;
  todayRevenue: number;
}> {
  const result = await prismaOptimized.$queryRaw<Array<{
    lifetimeRevenue: number;
    monthlyRevenue: number;
    last7Days: number;
    todayRevenue: number;
  }>>`
    SELECT
      COALESCE(SUM(CASE WHEN status = 'paid' THEN "creatorShare" ELSE 0 END), 0) as "lifetimeRevenue",
      COALESCE(SUM(CASE WHEN status = 'paid' AND "paidAt" >= DATE_TRUNC('month', NOW()) THEN "creatorShare" ELSE 0 END), 0) as "monthlyRevenue",
      COALESCE(SUM(CASE WHEN status = 'paid' AND "paidAt" >= NOW() - INTERVAL '7 days' THEN "creatorShare" ELSE 0 END), 0) as "last7Days",
      COALESCE(SUM(CASE WHEN status = 'paid' AND "paidAt" >= CURRENT_DATE THEN "creatorShare" ELSE 0 END), 0) as "todayRevenue"
    FROM "Commission"
    WHERE "creatorId" = ${creatorId}
  `;

  return result[0] || { lifetimeRevenue: 0, monthlyRevenue: 0, last7Days: 0, todayRevenue: 0 };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONVERSION FUNNEL (For analytics dashboard)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ConversionFunnel {
  totalClicks: number;
  uniqueVisitors: number;
  conversions: number;
  conversionRate: number;
  avgTimeToConversion: number; // hours
  revenue: number;
  avgOrderValue: number;
}

/**
 * Get conversion funnel metrics for a creator
 */
export async function getConversionFunnel(creatorId: string, days: number = 30): Promise<ConversionFunnel> {
  const result = await prismaOptimized.$queryRaw<ConversionFunnel[]>`
    SELECT
      COUNT(ac.id) as "totalClicks",
      COUNT(DISTINCT ac.fingerprint) as "uniqueVisitors",
      COUNT(ac.id) FILTER (WHERE ac.converted = true) as conversions,
      ROUND((COUNT(ac.id) FILTER (WHERE ac.converted = true)::numeric / NULLIF(COUNT(ac.id), 0) * 100), 2) as "conversionRate",
      ROUND(AVG(EXTRACT(EPOCH FROM (ac."convertedAt" - ac."createdAt")) / 3600), 2) as "avgTimeToConversion",
      COALESCE(SUM(c."saleAmount"), 0) as revenue,
      ROUND(COALESCE(SUM(c."saleAmount") / NULLIF(COUNT(c.id), 0), 0), 2) as "avgOrderValue"
    FROM "AttributionClick" ac
    JOIN "Member" m ON m.id = ac."memberId"
    LEFT JOIN "Commission" c ON c."id" = ac."commissionId"
    WHERE m."creatorId" = ${creatorId}
      AND ac."createdAt" >= NOW() - INTERVAL '${days} days'
  `;

  return result[0] || {
    totalClicks: 0,
    uniqueVisitors: 0,
    conversions: 0,
    conversionRate: 0,
    avgTimeToConversion: 0,
    revenue: 0,
    avgOrderValue: 0,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UTILITY FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Health check - verify database connection
 */
export async function checkDatabaseHealth(): Promise<{ healthy: boolean; latency: number }> {
  const start = Date.now();
  try {
    await prismaOptimized.$queryRaw`SELECT 1`;
    return { healthy: true, latency: Date.now() - start };
  } catch (error) {
    return { healthy: false, latency: -1 };
  }
}

/**
 * Get database connection pool stats
 */
export async function getConnectionPoolStats() {
  const stats = await prismaOptimized.$queryRaw<Array<{
    total: number;
    active: number;
    idle: number;
    waiting: number;
  }>>`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE state = 'active') as active,
      COUNT(*) FILTER (WHERE state = 'idle') as idle,
      COUNT(*) FILTER (WHERE wait_event IS NOT NULL) as waiting
    FROM pg_stat_activity
    WHERE datname = current_database()
  `;

  return stats[0] || { total: 0, active: 0, idle: 0, waiting: 0 };
}
