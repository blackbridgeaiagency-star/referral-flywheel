/**
 * Share Analytics & Tracking
 *
 * Tracks:
 * - Which platforms members share on
 * - Share counts per member
 * - Share → Click → Conversion funnel
 * - Most effective sharing channels
 */

import { prisma } from '../db/prisma';

// Add this model to Prisma schema later:
// model ShareEvent {
//   id          String   @id @default(cuid())
//   memberId    String
//   member      Member   @relation(fields: [memberId], references: [id], onDelete: Cascade)
//   platform    String   // twitter, facebook, whatsapp, etc.
//   shareType   String   @default("link") // link, qr, email, sms
//   metadata    Json?    // Additional data
//   createdAt   DateTime @default(now())
//   @@index([memberId])
//   @@index([platform])
//   @@index([createdAt])
// }

export type SharePlatform =
  | 'twitter'
  | 'facebook'
  | 'linkedin'
  | 'whatsapp'
  | 'telegram'
  | 'reddit'
  | 'email'
  | 'sms'
  | 'clipboard'
  | 'qr';

export interface ShareEvent {
  memberId: string;
  platform: SharePlatform;
  shareType: 'link' | 'qr' | 'message';
  metadata?: Record<string, any>;
}

export interface ShareStats {
  totalShares: number;
  sharesByPlatform: Record<SharePlatform, number>;
  sharesLast7Days: number;
  sharesLast30Days: number;
  mostUsedPlatform: SharePlatform | null;
  shareStreak: number; // consecutive days with shares
}

export interface ShareConversionFunnel {
  platform: SharePlatform;
  shares: number;
  clicks: number;
  conversions: number;
  clickRate: number; // shares → clicks
  conversionRate: number; // clicks → conversions
  revenue: number;
}

/**
 * Track a share event
 * Call this when a member shares their link
 */
export async function trackShare(event: ShareEvent): Promise<void> {
  try {
    // For now, log to console (will save to database when ShareEvent model is added)
    console.log('📊 Share tracked:', {
      ...event,
      timestamp: new Date().toISOString(),
    });

    // TODO: When ShareEvent model is added, uncomment:
    // await prisma.shareEvent.create({
    //   data: {
    //     memberId: event.memberId,
    //     platform: event.platform,
    //     shareType: event.shareType,
    //     metadata: event.metadata || {},
    //   },
    // });
  } catch (error) {
    console.error('Failed to track share:', error);
    // Don't throw - tracking failures shouldn't break the app
  }
}

/**
 * Get share statistics for a member
 */
export async function getMemberShareStats(memberId: string): Promise<ShareStats> {
  try {
    // TODO: When ShareEvent model is added, implement real stats:
    // const shares = await prisma.shareEvent.findMany({
    //   where: { memberId },
    // });

    // For now, return mock data
    return {
      totalShares: 0,
      sharesByPlatform: {} as Record<SharePlatform, number>,
      sharesLast7Days: 0,
      sharesLast30Days: 0,
      mostUsedPlatform: null,
      shareStreak: 0,
    };
  } catch (error) {
    console.error('Failed to get share stats:', error);
    return {
      totalShares: 0,
      sharesByPlatform: {} as Record<SharePlatform, number>,
      sharesLast7Days: 0,
      sharesLast30Days: 0,
      mostUsedPlatform: null,
      shareStreak: 0,
    };
  }
}

/**
 * Get share conversion funnel for a creator
 * Shows which platforms are most effective
 */
export async function getShareConversionFunnel(
  creatorId: string
): Promise<ShareConversionFunnel[]> {
  try {
    // TODO: When ShareEvent model is added, implement real funnel:
    // const funnelData = await prisma.$queryRaw`
    //   SELECT
    //     se.platform,
    //     COUNT(se.id) as shares,
    //     COUNT(ac.id) as clicks,
    //     COUNT(ac.id) FILTER (WHERE ac.converted = true) as conversions,
    //     ROUND((COUNT(ac.id)::numeric / NULLIF(COUNT(se.id), 0) * 100), 2) as clickRate,
    //     ROUND((COUNT(ac.id) FILTER (WHERE ac.converted = true)::numeric / NULLIF(COUNT(ac.id), 0) * 100), 2) as conversionRate,
    //     COALESCE(SUM(c.saleAmount), 0) as revenue
    //   FROM "ShareEvent" se
    //   JOIN "Member" m ON m.id = se.memberId
    //   LEFT JOIN "AttributionClick" ac ON ac.memberId = m.id AND ac.createdAt >= se.createdAt
    //   LEFT JOIN "Commission" c ON c.id = ac.commissionId
    //   WHERE m.creatorId = $1
    //   GROUP BY se.platform
    //   ORDER BY revenue DESC
    // `, creatorId;

    // For now, return empty array
    return [];
  } catch (error) {
    console.error('Failed to get share conversion funnel:', error);
    return [];
  }
}

/**
 * Get platform performance comparison
 * Helps creators understand which platforms work best
 */
export async function getPlatformPerformance(creatorId: string): Promise<{
  topPlatform: SharePlatform | null;
  avgClicksPerShare: Record<SharePlatform, number>;
  avgRevenuePerShare: Record<SharePlatform, number>;
  recommendations: string[];
}> {
  try {
    const funnel = await getShareConversionFunnel(creatorId);

    if (funnel.length === 0) {
      return {
        topPlatform: null,
        avgClicksPerShare: {} as Record<SharePlatform, number>,
        avgRevenuePerShare: {} as Record<SharePlatform, number>,
        recommendations: ['No sharing data yet. Encourage members to share!'],
      };
    }

    // Calculate metrics
    const topPlatform = funnel.reduce((best, current) =>
      current.revenue > best.revenue ? current : best
    ).platform;

    const avgClicksPerShare = funnel.reduce((acc, item) => {
      acc[item.platform] = item.shares > 0 ? item.clicks / item.shares : 0;
      return acc;
    }, {} as Record<SharePlatform, number>);

    const avgRevenuePerShare = funnel.reduce((acc, item) => {
      acc[item.platform] = item.shares > 0 ? item.revenue / item.shares : 0;
      return acc;
    }, {} as Record<SharePlatform, number>);

    // Generate recommendations
    const recommendations: string[] = [];

    const highPerformers = funnel.filter(p => p.conversionRate > 5);
    if (highPerformers.length > 0) {
      recommendations.push(
        `${highPerformers[0].platform} has the highest conversion rate (${highPerformers[0].conversionRate}%). Encourage members to share there more!`
      );
    }

    const underutilized = funnel.filter(p => p.shares < 10);
    if (underutilized.length > 0) {
      recommendations.push(
        `Consider creating templates for ${underutilized.map(p => p.platform).join(', ')} to increase sharing.`
      );
    }

    return {
      topPlatform,
      avgClicksPerShare,
      avgRevenuePerShare,
      recommendations,
    };
  } catch (error) {
    console.error('Failed to get platform performance:', error);
    return {
      topPlatform: null,
      avgClicksPerShare: {} as Record<SharePlatform, number>,
      avgRevenuePerShare: {} as Record<SharePlatform, number>,
      recommendations: [],
    };
  }
}

/**
 * Check if member should be reminded to share
 * Returns true if member hasn't shared in 7 days
 */
export async function shouldRemindToShare(memberId: string): Promise<boolean> {
  try {
    // TODO: When ShareEvent model is added:
    // const lastShare = await prisma.shareEvent.findFirst({
    //   where: { memberId },
    //   orderBy: { createdAt: 'desc' },
    // });

    // if (!lastShare) return true; // Never shared

    // const daysSinceShare = (Date.now() - lastShare.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    // return daysSinceShare >= 7;

    return false; // Temporarily disabled
  } catch (error) {
    console.error('Failed to check share reminder:', error);
    return false;
  }
}

/**
 * Calculate sharing streak
 * How many consecutive days the member has shared
 */
export async function calculateShareStreak(memberId: string): Promise<number> {
  try {
    // TODO: When ShareEvent model is added:
    // const shares = await prisma.shareEvent.findMany({
    //   where: { memberId },
    //   orderBy: { createdAt: 'desc' },
    //   select: { createdAt: true },
    // });

    // let streak = 0;
    // let currentDate = new Date();
    // currentDate.setHours(0, 0, 0, 0);

    // for (const share of shares) {
    //   const shareDate = new Date(share.createdAt);
    //   shareDate.setHours(0, 0, 0, 0);

    //   const daysDiff = Math.floor((currentDate.getTime() - shareDate.getTime()) / (1000 * 60 * 60 * 24));

    //   if (daysDiff === streak) {
    //     streak++;
    //   } else {
    //     break;
    //   }
    // }

    // return streak;

    return 0; // Temporarily disabled
  } catch (error) {
    console.error('Failed to calculate share streak:', error);
    return 0;
  }
}
