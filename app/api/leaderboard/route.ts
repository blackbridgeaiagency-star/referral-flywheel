// app/api/leaderboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db/prisma';
import { withRateLimit } from '../../../lib/security/rate-limit-utils';

export async function GET(request: NextRequest) {
  return withRateLimit(request, async () => {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'earnings'; // earnings | referrals
    const scope = searchParams.get('scope') || 'global'; // global | community
    const creatorId = searchParams.get('creatorId');
    const memberId = searchParams.get('memberId'); // To calculate user's rank
    const limit = parseInt(searchParams.get('limit') || '10');

    try {
      // ========================================
      // IMPORTANT RANKING LOGIC:
      // - Global leaderboard: Sort by EARNINGS (across all creators)
      // - Community leaderboard: Sort by REFERRALS (within creator)
      // ========================================

      let leaderboard;

      if (scope === 'community' && creatorId) {
        // Community leaderboard: sorted by referrals within creator
        leaderboard = await prisma.member.findMany({
          where: { creatorId },
          orderBy: { totalReferred: 'desc' },
          take: limit,
          select: {
            id: true,
            username: true,
            referralCode: true,
            lifetimeEarnings: true,
            monthlyEarnings: true,
            totalReferred: true,
            monthlyReferred: true,
            globalEarningsRank: true,
            globalReferralsRank: true,
            communityRank: true,
          }
        });
      } else {
        // Global leaderboard: sorted by earnings across all creators
        // We need to calculate earnings from Commission records, not cached fields
        const membersWithEarnings = await prisma.commission.groupBy({
          by: ['memberId'],
          where: { status: 'paid' },
          _sum: {
            memberShare: true,
          },
          orderBy: {
            _sum: {
              memberShare: 'desc',
            },
          },
          take: limit,
        });

        const memberIds = membersWithEarnings.map(m => m.memberId);
        const members = await prisma.member.findMany({
          where: {
            id: { in: memberIds },
          },
          select: {
            id: true,
            username: true,
            referralCode: true,
            totalReferred: true,
            monthlyReferred: true,
            globalEarningsRank: true,
            globalReferralsRank: true,
            communityRank: true,
          },
        });

        // Combine member data with calculated earnings
        leaderboard = membersWithEarnings.map(earning => {
          const member = members.find(m => m.id === earning.memberId);
          return {
            ...member,
            lifetimeEarnings: earning._sum.memberShare || 0,
            monthlyEarnings: 0, // Can calculate this if needed
          };
        }).filter(m => m.id); // Filter out any null members
      }

      // Add rank numbers with tie-breaking (same referrals/earnings = same rank)
      let currentRank = 1;
      const rankedLeaderboard = leaderboard.map((member, index, arr) => {
        // Global = earnings, Community = referrals
        const value = scope === 'global'
          ? member.lifetimeEarnings
          : member.totalReferred;
        const prevValue = index > 0
          ? (scope === 'global' ? arr[index - 1].lifetimeEarnings : arr[index - 1].totalReferred)
          : null;

        // If same value as previous, keep same rank, otherwise use current position
        if (index > 0 && prevValue !== value) {
          currentRank = index + 1;
        }

        return {
          ...member,
          rank: currentRank
        };
      });

      // Calculate user's rank if memberId provided
      let userRank: number | null = null;
      let userStats = null;

      if (memberId) {
        // Get member and use their calculated rank from centralized queries
        const member = await prisma.member.findUnique({
          where: { id: memberId },
          select: {
            id: true,
            username: true,
            referralCode: true,
            lifetimeEarnings: true,
            totalReferred: true,
            globalReferralsRank: true,
            globalEarningsRank: true,
            communityRank: true,
          }
        });

        if (member) {
          // Use the appropriate rank based on scope
          // Global = earnings rank, Community = community rank (referrals)
          if (scope === 'community') {
            userRank = member.communityRank || 0;
          } else {
            userRank = member.globalEarningsRank || 0; // Always use earnings rank for global
          }

          userStats = {
            ...member,
            rank: userRank
          };
        }
      }

      // Get total members count
      const totalMembers = scope === 'community' && creatorId
        ? await prisma.member.count({ where: { creatorId } })
        : await prisma.member.count();

      return NextResponse.json({
        leaderboard: rankedLeaderboard,
        userRank,
        userStats,
        totalMembers
      });
    } catch (error) {
      console.error('❌ Leaderboard error:', error);
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }
  }, 'STANDARD');
}
