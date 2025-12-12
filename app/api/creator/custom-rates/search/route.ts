// app/api/creator/custom-rates/search/route.ts
/**
 * Search Members for Custom Rate Assignment
 *
 * Searches members by username or referral code within a creator's community.
 * Returns member info with their current effective commission rate.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db/prisma';
import { getEffectiveCommissionRate } from '../../../../../lib/utils/custom-commission';
import logger from '../../../../../lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const query = searchParams.get('q');

    if (!companyId) {
      return NextResponse.json(
        { error: 'Missing companyId parameter' },
        { status: 400 }
      );
    }

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Find creator
    const creator = await prisma.creator.findFirst({
      where: {
        OR: [
          { companyId },
          { productId: companyId },
        ],
      },
      select: { id: true },
    });

    if (!creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      );
    }

    // Search members
    const searchTerm = query.trim();
    const members = await prisma.member.findMany({
      where: {
        creatorId: creator.id,
        OR: [
          { username: { contains: searchTerm, mode: 'insensitive' } },
          { referralCode: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        username: true,
        referralCode: true,
        totalReferred: true,
        lifetimeEarnings: true,
        customCommissionRate: true,
        customRateReason: true,
      },
      take: 10,
      orderBy: {
        totalReferred: 'desc',
      },
    });

    // Add effective rate info to each member
    const membersWithRates = members.map(member => {
      const effectiveRate = getEffectiveCommissionRate({
        totalReferred: member.totalReferred,
        customCommissionRate: member.customCommissionRate,
        customRateReason: member.customRateReason,
      });

      return {
        id: member.id,
        username: member.username,
        referralCode: member.referralCode,
        totalReferred: member.totalReferred,
        lifetimeEarnings: member.lifetimeEarnings,
        currentRate: effectiveRate.rate,
        rateSource: effectiveRate.source,
        tierName: effectiveRate.tierName,
      };
    });

    return NextResponse.json({ members: membersWithRates });

  } catch (error) {
    logger.error('Error searching members:', error);
    return NextResponse.json(
      { error: 'Failed to search members' },
      { status: 500 }
    );
  }
}
