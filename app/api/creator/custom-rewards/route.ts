// app/api/creator/custom-rewards/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      creatorId,
      customRewardEnabled,
      customRewardTimeframe,
      customRewardTop3,
      customRewardTop5,
      customRewardTop10,
    } = body;

    // Validate required fields
    if (!creatorId) {
      return NextResponse.json(
        { error: 'Creator ID is required' },
        { status: 400 }
      );
    }

    // Update creator's custom rewards settings
    const updatedCreator = await prisma.creator.update({
      where: { id: creatorId },
      data: {
        customRewardEnabled,
        customRewardTimeframe,
        customRewardTop3,
        customRewardTop5,
        customRewardTop10,
      },
    });

    // If custom rewards are enabled, update member eligibility
    if (customRewardEnabled) {
      // Get the timeframe for calculations
      const now = new Date();
      let startDate: Date;

      switch (customRewardTimeframe) {
        case 'daily':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'weekly':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'monthly':
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      // Get commissions within the timeframe
      const commissions = await prisma.commission.findMany({
        where: {
          creatorId: creatorId,
          createdAt: { gte: startDate },
        },
        include: { member: true },
      });

      // Aggregate earnings by member
      const memberEarnings: { [key: string]: number } = {};
      for (const commission of commissions) {
        if (!memberEarnings[commission.memberId]) {
          memberEarnings[commission.memberId] = 0;
        }
        memberEarnings[commission.memberId] += commission.memberShare;
      }

      // Sort members by earnings
      const sortedMembers = Object.entries(memberEarnings)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10); // Top 10

      // Reset all members' custom reward eligibility for this creator
      await prisma.member.updateMany({
        where: { creatorId: creatorId },
        data: {
          customRewardEligible: false,
          customRewardMessage: null,
          customRewardTimeframeRank: null,
        },
      });

      // Update eligibility for top performers
      for (let i = 0; i < sortedMembers.length; i++) {
        const [memberId] = sortedMembers[i];
        let rewardMessage = '';
        let eligible = false;

        if (i < 3 && customRewardTop3) {
          rewardMessage = `#${i + 1} This ${customRewardTimeframe} - ${customRewardTop3}!`;
          eligible = true;
        } else if (i < 5 && customRewardTop5) {
          rewardMessage = `#${i + 1} This ${customRewardTimeframe} - ${customRewardTop5}!`;
          eligible = true;
        } else if (i < 10 && customRewardTop10) {
          rewardMessage = `#${i + 1} This ${customRewardTimeframe} - ${customRewardTop10}!`;
          eligible = true;
        }

        if (eligible) {
          await prisma.member.update({
            where: { id: memberId },
            data: {
              customRewardEligible: true,
              customRewardMessage: rewardMessage,
              customRewardTimeframeRank: i + 1,
            },
          });
        }
      }
    } else {
      // If disabled, clear all custom reward eligibility
      await prisma.member.updateMany({
        where: { creatorId: creatorId },
        data: {
          customRewardEligible: false,
          customRewardMessage: null,
          customRewardTimeframeRank: null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      creator: updatedCreator,
    });

  } catch (error) {
    console.error('Error updating custom rewards:', error);
    return NextResponse.json(
      { error: 'Failed to update custom rewards' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const creatorId = searchParams.get('creatorId');

    if (!creatorId) {
      return NextResponse.json(
        { error: 'Creator ID is required' },
        { status: 400 }
      );
    }

    const creator = await prisma.creator.findUnique({
      where: { id: creatorId },
      select: {
        customRewardEnabled: true,
        customRewardTimeframe: true,
        customRewardTop3: true,
        customRewardTop5: true,
        customRewardTop10: true,
      },
    });

    if (!creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(creator);

  } catch (error) {
    console.error('Error fetching custom rewards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch custom rewards' },
      { status: 500 }
    );
  }
}