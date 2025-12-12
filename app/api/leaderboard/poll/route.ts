// app/api/leaderboard/poll/route.ts
/**
 * Leaderboard Polling API
 *
 * Returns leaderboard data with change detection for efficient client-side updates.
 * Designed for polling every 10-30 seconds without hammering the database.
 *
 * GET /api/leaderboard/poll?experienceId=xxx&since=timestamp&memberId=xxx&limit=10
 *
 * Parameters:
 * - experienceId: Whop membershipId (used to find the member's community)
 * - memberId: Internal member ID (optional, for user position tracking)
 * - since: ISO timestamp for change detection (optional)
 * - limit: Number of entries to return (default 10, max 50)
 *
 * Returns:
 * - leaderboard: Current top entries with rank change info
 * - changes: Rank changes since last poll (if since param provided)
 * - userPosition: Current user's position (if memberId provided)
 * - lastUpdated: Timestamp for next poll
 * - totalMembers: Total members in community
 * - pollInterval: Recommended poll interval in ms (10-30s based on activity)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db/prisma';
import { withRateLimit } from '../../../../lib/security/rate-limit-utils';
import logger from '../../../../lib/logger';

// Types for leaderboard data
interface LeaderboardEntry {
  id: string;
  username: string;
  referralCode: string;
  totalReferred: number;
  lifetimeEarnings: number;
  rank: number;
  previousRank?: number;
  rankChange?: 'up' | 'down' | 'same' | 'new';
}

interface PollResponse {
  leaderboard: LeaderboardEntry[];
  userPosition: {
    rank: number;
    entry: LeaderboardEntry | null;
    isInTop10: boolean;
  } | null;
  changes: RankChange[];
  lastUpdated: string;
  totalMembers: number;
  pollInterval: number; // Recommended poll interval in ms
}

interface RankChange {
  memberId: string;
  username: string;
  oldRank: number;
  newRank: number;
  direction: 'up' | 'down';
}

// In-memory cache for rank history (resets on server restart)
// In production, this would use Redis or similar
const rankCache = new Map<string, Map<string, number>>(); // creatorId -> memberId -> rank

// Cache for recent activity detection (tracks last update timestamps per community)
const activityCache = new Map<string, { lastChange: number; changeCount: number }>();

export async function GET(request: NextRequest) {
  return withRateLimit(request, async () => {
    const { searchParams } = new URL(request.url);
    const experienceId = searchParams.get('experienceId');
    const since = searchParams.get('since'); // ISO timestamp
    const memberId = searchParams.get('memberId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

    if (!experienceId) {
      return NextResponse.json(
        { error: 'experienceId is required' },
        { status: 400 }
      );
    }

    try {
      // ========================================
      // LOOKUP: experienceId is a membershipId
      // Find the member first, then get their creator
      // ========================================
      const lookupMember = await prisma.member.findUnique({
        where: { membershipId: experienceId },
        select: {
          id: true,
          creatorId: true,
          creator: {
            select: {
              id: true,
              companyId: true,
              companyName: true
            }
          }
        }
      });

      if (!lookupMember || !lookupMember.creator) {
        logger.warn('Leaderboard poll: Member or creator not found', { experienceId });
        return NextResponse.json(
          { error: 'Community not found for this membership' },
          { status: 404 }
        );
      }

      const creator = lookupMember.creator;
      const creatorId = creator.id;

      // Fetch leaderboard sorted by referrals (community leaderboard)
      const members = await prisma.member.findMany({
        where: {
          creatorId: creatorId,
        },
        orderBy: [
          { totalReferred: 'desc' },
          { createdAt: 'asc' } // Tie-breaker: who reached it first
        ],
        take: limit,
        select: {
          id: true,
          username: true,
          referralCode: true,
          totalReferred: true,
          lifetimeEarnings: true,
          createdAt: true,
        }
      });

      // Calculate proper ranks with tie handling
      const leaderboard: LeaderboardEntry[] = [];
      let currentRank = 1;

      for (let i = 0; i < members.length; i++) {
        const member = members[i];
        const prevMember = i > 0 ? members[i - 1] : null;

        // If value differs from previous, update rank
        if (prevMember && prevMember.totalReferred !== member.totalReferred) {
          currentRank = i + 1;
        }

        // Get previous rank from cache (keyed by creatorId for community scope)
        const cacheKey = creatorId;
        const memberRankHistory = rankCache.get(cacheKey);
        const previousRank = memberRankHistory?.get(member.id);

        let rankChange: 'up' | 'down' | 'same' | 'new' = 'same';
        if (previousRank === undefined) {
          rankChange = 'new';
        } else if (previousRank > currentRank) {
          rankChange = 'up';
        } else if (previousRank < currentRank) {
          rankChange = 'down';
        }

        leaderboard.push({
          id: member.id,
          username: member.username,
          referralCode: member.referralCode,
          totalReferred: member.totalReferred,
          lifetimeEarnings: member.lifetimeEarnings,
          rank: currentRank,
          previousRank,
          rankChange,
        });
      }

      // Update rank cache for this community (keyed by creatorId)
      if (!rankCache.has(creatorId)) {
        rankCache.set(creatorId, new Map());
      }
      const communityCache = rankCache.get(creatorId)!;
      leaderboard.forEach(entry => {
        communityCache.set(entry.id, entry.rank);
      });

      // Detect changes since last poll
      const changes: RankChange[] = [];
      if (since) {
        const sinceDate = new Date(since);
        if (!isNaN(sinceDate.getTime())) {
          // Find members whose ranks changed
          leaderboard.forEach(entry => {
            if (entry.previousRank !== undefined &&
                entry.previousRank !== entry.rank) {
              changes.push({
                memberId: entry.id,
                username: entry.username,
                oldRank: entry.previousRank,
                newRank: entry.rank,
                direction: entry.previousRank > entry.rank ? 'up' : 'down',
              });
            }
          });
        }
      }

      // Get user's position if memberId provided
      let userPosition: PollResponse['userPosition'] = null;
      if (memberId) {
        const userEntry = leaderboard.find(e => e.id === memberId);

        if (userEntry) {
          userPosition = {
            rank: userEntry.rank,
            entry: userEntry,
            isInTop10: userEntry.rank <= 10,
          };
        } else {
          // User not in top N, calculate their actual rank
          const member = await prisma.member.findUnique({
            where: { id: memberId },
            select: {
              id: true,
              username: true,
              referralCode: true,
              totalReferred: true,
              lifetimeEarnings: true,
              createdAt: true,
              creatorId: true,
            }
          });

          if (member && member.creatorId === creatorId) {
            // Count how many members have more referrals
            const higherRanked = await prisma.member.count({
              where: {
                creatorId: creatorId,
                OR: [
                  { totalReferred: { gt: member.totalReferred } },
                  {
                    totalReferred: member.totalReferred,
                    createdAt: { lt: member.createdAt }
                  }
                ]
              }
            });

            const userRank = higherRanked + 1;

            userPosition = {
              rank: userRank,
              entry: {
                id: member.id,
                username: member.username,
                referralCode: member.referralCode,
                totalReferred: member.totalReferred,
                lifetimeEarnings: member.lifetimeEarnings,
                rank: userRank,
                rankChange: 'same',
              },
              isInTop10: userRank <= 10,
            };
          }
        }
      }

      // Get total members count for this community
      const totalMembers = await prisma.member.count({
        where: {
          creatorId: creatorId,
        }
      });

      // ========================================
      // SMART POLL INTERVAL CALCULATION
      // Based on recent activity in the community
      // ========================================
      const now = Date.now();
      const activity = activityCache.get(creatorId) || { lastChange: 0, changeCount: 0 };

      // Update activity tracking if there were changes
      if (changes.length > 0) {
        activityCache.set(creatorId, {
          lastChange: now,
          changeCount: activity.changeCount + changes.length
        });
      }

      // Calculate poll interval based on recency of activity
      // - If changes in this poll: 10 seconds (highly active)
      // - If changes in last 5 minutes: 15 seconds (active)
      // - If changes in last 30 minutes: 20 seconds (moderate)
      // - Otherwise: 30 seconds (quiet)
      let pollInterval: number;
      const timeSinceLastChange = now - activity.lastChange;

      if (changes.length > 0) {
        pollInterval = 10000; // 10 seconds - just saw activity
      } else if (timeSinceLastChange < 5 * 60 * 1000) {
        pollInterval = 15000; // 15 seconds - recent activity
      } else if (timeSinceLastChange < 30 * 60 * 1000) {
        pollInterval = 20000; // 20 seconds - moderate activity
      } else {
        pollInterval = 30000; // 30 seconds - quiet community
      }

      const response: PollResponse = {
        leaderboard,
        userPosition,
        changes,
        lastUpdated: new Date().toISOString(),
        totalMembers,
        pollInterval,
      };

      // Set cache headers for CDN
      const headers = new Headers();
      headers.set('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30');

      return NextResponse.json(response, { headers });

    } catch (error) {
      logger.error('Leaderboard poll error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard' },
        { status: 500 }
      );
    }
  }, 'STANDARD');
}
