// app/api/leaderboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db/prisma';
import { withRateLimit } from '../../../lib/security/rate-limit-utils';
import logger from '../../../lib/logger';


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
      // - Global leaderboard: Sort by TYPE parameter (earnings OR referrals)
      // - Community leaderboard: Sort by REFERRALS (within creator)
      // ========================================

      let leaderboard: any[];
      let sortByValue: 'earnings' | 'referrals' = type === 'earnings' ? 'earnings' : 'referrals';

      if (scope === 'community' && creatorId) {
        // Community leaderboard: always sorted by referrals within creator
        sortByValue = 'referrals';
        leaderboard = await prisma.member.findMany({
          where: {
            creatorId,
            creator: {
              // Exclude test creators (those with _test in their companyId)
              companyId: {
                not: {
                  contains: '_test'
                }
              }
            }
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
            lifetimeEarnings: true,
            monthlyEarnings: true,
            totalReferred: true,
            monthlyReferred: true,
            createdAt: true,
          }
        });
      } else {
        // Global leaderboard: sorted by TYPE parameter (earnings OR referrals)
        // Filter out test data by excluding members from test creators
        const testFilter = {
          creator: {
            companyId: {
              not: {
                contains: '_test'
              }
            }
          }
        };

        if (type === 'earnings') {
          // Sort by EARNINGS (from Commission records)
          const realMembers = await prisma.member.findMany({
            where: testFilter,
            select: { id: true }
          });
          const realMemberIds = realMembers.map(m => m.id);

          // Calculate earnings from Commission records
          const membersWithEarnings = await prisma.commission.groupBy({
            by: ['memberId'],
            where: {
              status: 'paid',
              memberId: {
                in: realMemberIds
              }
            },
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
              createdAt: true,
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
        } else {
          // Sort by REFERRALS
          leaderboard = await prisma.member.findMany({
            where: testFilter,
            orderBy: [
              { totalReferred: 'desc' },
              { createdAt: 'asc' } // Tie-breaker: who reached it first
            ],
            take: limit,
            select: {
              id: true,
              username: true,
              referralCode: true,
              lifetimeEarnings: true,
              monthlyEarnings: true,
              totalReferred: true,
              monthlyReferred: true,
              createdAt: true,
            },
          });
        }
      }

      // ========================================
      // FIX: PROPER TIE-BREAKING FOR RANKS
      // Same value = same rank, then skip ranks
      // Example: 1, 2, 2, 4 (not 1, 2, 3, 4)
      // ========================================
      let currentRank = 1;
      const rankedLeaderboard = leaderboard.map((member, index, arr) => {
        // Determine comparison value based on sort type
        const value = sortByValue === 'earnings'
          ? member.lifetimeEarnings
          : member.totalReferred;
        const prevValue = index > 0
          ? (sortByValue === 'earnings' ? arr[index - 1].lifetimeEarnings : arr[index - 1].totalReferred)
          : null;

        // If value is different from previous, update rank to current position
        if (index > 0 && prevValue !== value) {
          currentRank = index + 1;
        }
        // If same value, keep same rank (ties)

        return {
          ...member,
          rank: currentRank
        };
      });

      // ========================================
      // FIX: CALCULATE USER RANK IN REAL-TIME
      // Don't use stale DB fields, calculate fresh
      // ========================================
      let userRank: number | null = null;
      let userStats = null;

      if (memberId) {
        const member = await prisma.member.findUnique({
          where: { id: memberId },
          select: {
            id: true,
            username: true,
            referralCode: true,
            lifetimeEarnings: true,
            totalReferred: true,
            creatorId: true,
            createdAt: true,
          }
        });

        if (member) {
          // Calculate rank based on scope and type
          if (scope === 'community') {
            // Community rank: count members in same community with more referrals
            const higherReferrers = await prisma.member.count({
              where: {
                creatorId: member.creatorId,
                creator: {
                  companyId: {
                    not: {
                      contains: '_test'
                    }
                  }
                },
                OR: [
                  { totalReferred: { gt: member.totalReferred } },
                  {
                    totalReferred: member.totalReferred,
                    createdAt: { lt: member.createdAt } // Tie-breaker
                  }
                ]
              }
            });
            userRank = higherReferrers + 1;
          } else if (type === 'earnings') {
            // Global earnings rank: count members with more earnings
            // First calculate this member's earnings from commissions
            const memberEarnings = await prisma.commission.aggregate({
              where: {
                memberId: member.id,
                status: 'paid'
              },
              _sum: {
                memberShare: true
              }
            });
            const myEarnings = memberEarnings._sum.memberShare || 0;

            // Get all members' earnings who have more than me
            const realMembers = await prisma.member.findMany({
              where: {
                creator: {
                  companyId: {
                    not: {
                      contains: '_test'
                    }
                  }
                }
              },
              select: { id: true, createdAt: true }
            });
            const realMemberIds = realMembers.map(m => m.id);

            const higherEarners = await prisma.commission.groupBy({
              by: ['memberId'],
              where: {
                status: 'paid',
                memberId: {
                  in: realMemberIds
                }
              },
              having: {
                memberShare: {
                  _sum: {
                    gt: myEarnings
                  }
                }
              },
              _sum: {
                memberShare: true
              }
            });

            // Count ties with earlier created date
            const tiesWithEarlierDate = await prisma.$queryRaw<Array<{ count: bigint }>>`
              SELECT COUNT(*)::int as count
              FROM "Member" m
              WHERE m.id IN (
                SELECT c."memberId"
                FROM "Commission" c
                WHERE c.status = 'paid'
                GROUP BY c."memberId"
                HAVING SUM(c."memberShare") = ${myEarnings}
              )
              AND m."createdAt" < ${member.createdAt}
            `;

            const tieBreakers = tiesWithEarlierDate[0] ? Number(tiesWithEarlierDate[0].count) : 0;
            userRank = higherEarners.length + tieBreakers + 1;
          } else {
            // Global referrals rank: count members with more referrals
            const higherReferrers = await prisma.member.count({
              where: {
                creator: {
                  companyId: {
                    not: {
                      contains: '_test'
                    }
                  }
                },
                OR: [
                  { totalReferred: { gt: member.totalReferred } },
                  {
                    totalReferred: member.totalReferred,
                    createdAt: { lt: member.createdAt } // Tie-breaker
                  }
                ]
              }
            });
            userRank = higherReferrers + 1;
          }

          userStats = {
            ...member,
            rank: userRank
          };
        }
      }

      // Get total members count (excluding test data)
      const totalMembers = scope === 'community' && creatorId
        ? await prisma.member.count({
            where: {
              creatorId,
              creator: {
                companyId: {
                  not: {
                    contains: '_test'
                  }
                }
              }
            }
          })
        : await prisma.member.count({
            where: {
              creator: {
                companyId: {
                  not: {
                    contains: '_test'
                  }
                }
              }
            }
          });

      return NextResponse.json({
        leaderboard: rankedLeaderboard,
        userRank,
        userStats,
        totalMembers
      });
    } catch (error) {
      logger.error('❌ Leaderboard error:', error);
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }
  }, 'STANDARD');
}
