import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db/prisma';
import logger from '../../../../lib/logger';


export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Discover Communities API
 * Returns list of active communities with referral program stats
 */

export async function GET() {
  try {
    const communities = await prisma.creator.findMany({
      where: { isActive: true },
      include: {
        members: {
          select: {
            id: true,
            totalReferred: true,
            lifetimeEarnings: true,
          },
          orderBy: { totalReferred: 'desc' },
          take: 1, // Get top earner
        },
        _count: {
          select: { members: true },
        },
      },
      orderBy: { totalReferrals: 'desc' },
      take: 50,
    });

    const response = communities.map(creator => {
      const topEarner = creator.members[0];
      const avgEarnings = creator._count.members > 0
        ? creator.totalRevenue / creator._count.members
        : 0;

      // Calculate engagement score (members * 0.4 + referrals * 0.6)
      const engagementScore = (creator._count.members * 0.4) + (creator.totalReferrals * 0.6);

      return {
        id: creator.id,
        name: creator.companyName,
        productId: creator.productId,
        whopUrl: creator.whopUrl || `https://whop.com/checkout/${creator.productId}`,
        memberCount: creator._count.members,
        totalReferrals: creator.totalReferrals,
        totalRevenue: creator.totalRevenue,
        avgEarnings: Math.round(avgEarnings * 100) / 100,
        topEarner: topEarner ? {
          earnings: topEarner.lifetimeEarnings,
          referrals: topEarner.totalReferred,
        } : null,
        engagementScore,
      };
    });

    // Sort by engagement score
    response.sort((a, b) => b.engagementScore - a.engagementScore);

    return NextResponse.json({ ok: true, communities: response });

  } catch (error) {
    logger.error('❌ Discover API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch communities' },
      { status: 500 }
    );
  }
}
