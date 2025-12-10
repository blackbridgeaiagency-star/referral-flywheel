// app/api/calculator/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import {
  calculateEarningsProjection,
  generateProjectionTable,
  getBreakEvenReferrals,
  getMotivationalMessage,
  calculateWhatIfScenarios,
} from '@/lib/utils/earnings-calculator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/calculator?creatorId=xxx&referrals=10
 * Returns earnings projection for a creator's community
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const creatorId = searchParams.get('creatorId');
    const referrals = parseInt(searchParams.get('referrals') || '10', 10);
    const memberId = searchParams.get('memberId');

    if (!creatorId) {
      return NextResponse.json(
        { error: 'creatorId is required' },
        { status: 400 }
      );
    }

    // Get creator's community data for average pricing
    const creator = await prisma.creator.findUnique({
      where: { id: creatorId },
      select: {
        companyName: true,
        members: {
          where: {
            subscriptionPrice: { gt: 0 }
          },
          select: {
            subscriptionPrice: true,
          },
          take: 100, // Sample for average calculation
        },
      },
    });

    if (!creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      );
    }

    // Calculate average subscription price from actual members
    let avgPrice = 49.99; // Default fallback
    if (creator.members.length > 0) {
      const total = creator.members.reduce((sum, m) => sum + m.subscriptionPrice, 0);
      avgPrice = Number((total / creator.members.length).toFixed(2));
    }

    // Get user's subscription price if memberId provided
    let userPrice = avgPrice;
    if (memberId) {
      const member = await prisma.member.findUnique({
        where: { id: memberId },
        select: { subscriptionPrice: true },
      });
      if (member) {
        userPrice = member.subscriptionPrice;
      }
    }

    const input = {
      avgSubscriptionPrice: avgPrice,
      userSubscriptionPrice: userPrice,
    };

    // Generate all projection data
    const projection = calculateEarningsProjection(referrals, input);
    const projectionTable = generateProjectionTable(input);
    const breakEvenReferrals = getBreakEvenReferrals(input);
    const motivationalMessage = getMotivationalMessage(referrals, input);
    const whatIfScenarios = calculateWhatIfScenarios(referrals, input);

    return NextResponse.json({
      communityName: creator.companyName,
      avgSubscriptionPrice: avgPrice,
      userSubscriptionPrice: userPrice,
      projection,
      projectionTable,
      breakEvenReferrals,
      motivationalMessage,
      whatIfScenarios,
      insights: {
        breakEvenMessage: `At ${breakEvenReferrals} referrals, your membership pays for itself!`,
        yearlyPotential: `${referrals} referrals = $${projection.yearlyEarnings}/year passive income`,
        perReferralValue: `Each referral earns you ~$${(avgPrice * projection.commissionRate).toFixed(2)}/month`,
      },
    });

  } catch (error) {
    console.error('Calculator error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate earnings' },
      { status: 500 }
    );
  }
}
