// app/api/creator/custom-rewards-v2/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      creatorId,
      customRewardEnabled,
      customRewardTimeframe,
      customRewardType,
      customReward1st,
      customReward2nd,
      customReward3rd,
      customReward4th,
      customReward5th,
      customReward6to10,
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
        customRewardType,
        customReward1st,
        customReward2nd,
        customReward3rd,
        customReward4th,
        customReward5th,
        customReward6to10,
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

      // Determine how many places to award based on type
      const maxPlace = customRewardType === 'top10' ? 10 : customRewardType === 'top5' ? 5 : 3;

      // Update eligibility for top performers
      for (let i = 0; i < Math.min(sortedMembers.length, maxPlace); i++) {
        const [memberId] = sortedMembers[i];
        let rewardMessage = '';
        let eligible = false;

        const place = i + 1;

        switch(place) {
          case 1:
            if (customReward1st) {
              rewardMessage = `🥇 1st Place This ${customRewardTimeframe} - ${customReward1st}!`;
              eligible = true;
            }
            break;
          case 2:
            if (customReward2nd) {
              rewardMessage = `🥈 2nd Place This ${customRewardTimeframe} - ${customReward2nd}!`;
              eligible = true;
            }
            break;
          case 3:
            if (customReward3rd) {
              rewardMessage = `🥉 3rd Place This ${customRewardTimeframe} - ${customReward3rd}!`;
              eligible = true;
            }
            break;
          case 4:
            if (customReward4th && (customRewardType === 'top5' || customRewardType === 'top10')) {
              rewardMessage = `#${place} This ${customRewardTimeframe} - ${customReward4th}!`;
              eligible = true;
            }
            break;
          case 5:
            if (customReward5th && (customRewardType === 'top5' || customRewardType === 'top10')) {
              rewardMessage = `#${place} This ${customRewardTimeframe} - ${customReward5th}!`;
              eligible = true;
            }
            break;
          default: // 6-10
            if (customReward6to10 && customRewardType === 'top10') {
              rewardMessage = `#${place} This ${customRewardTimeframe} - ${customReward6to10}!`;
              eligible = true;
            }
            break;
        }

        if (eligible) {
          await prisma.member.update({
            where: { id: memberId },
            data: {
              customRewardEligible: true,
              customRewardMessage: rewardMessage,
              customRewardTimeframeRank: place,
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