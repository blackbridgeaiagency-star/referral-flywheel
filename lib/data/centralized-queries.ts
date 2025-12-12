/**
 * ========================================
 * CENTRALIZED QUERY LAYER
 * SINGLE SOURCE OF TRUTH FOR ALL METRICS
 * ========================================
 *
 * This file contains ALL data fetching functions for the application.
 * EVERY component MUST use these functions to ensure data consistency.
 *
 * NO component should:
 * - Query the database directly
 * - Use webhook-updated fields (member.monthlyEarnings, etc.)
 * - Calculate metrics inline
 *
 * ALL metrics are calculated from raw Commission and Member records.
 */

import { prisma } from '../db/prisma';
import { startOfMonth, subMonths } from 'date-fns';
import { calculateMemberTier, type TierThresholds } from '../utils/tier-calculator';
import logger from '../logger';


// ========================================
// MEMBER METRICS
// ========================================

/**
 * Get ALL member statistics from a SINGLE source
 * Calculates everything from Commission records (no cached fields)
 */
export async function getMemberStats(memberId: string) {
  try {
    const monthStart = startOfMonth(new Date());
    const lastMonthStart = startOfMonth(subMonths(new Date(), 1));

    // Fetch member first to get referralCode
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        membershipId: true,
        username: true,
        email: true,
        referralCode: true,
        creatorId: true,
        totalReferred: true, // This is OK - it's a simple count
        subscriptionPrice: true, // Member's subscription price for earnings calculator
        createdAt: true,
      },
    });

    if (!member) {
      throw new Error('Member not found');
    }

    // Now fetch commissions and referrals in parallel using the referralCode
    const [allCommissions, monthlyCommissions, lastMonthCommissions, referralCount] =
      await Promise.all([
        // All-time commissions (for lifetime earnings)
        prisma.commission.findMany({
          where: {
            memberId,
            status: 'paid',
          },
          select: {
            memberShare: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        }),

        // This month's commissions
        prisma.commission.findMany({
          where: {
            memberId,
            status: 'paid',
            createdAt: { gte: monthStart },
          },
          select: {
            memberShare: true,
          },
        }),

        // Last month's commissions (for trend calculation)
        prisma.commission.findMany({
          where: {
            memberId,
            status: 'paid',
            createdAt: {
              gte: lastMonthStart,
              lt: monthStart,
            },
          },
          select: {
            memberShare: true,
          },
        }),

        // Get referrals made this month (using referralCode, not memberId)
        prisma.member.count({
          where: {
            referredBy: member.referralCode,  // Use referral CODE, not member ID
            createdAt: { gte: monthStart },
          },
        }),
      ]);

    // ========================================
    // CALCULATE EARNINGS (SINGLE SOURCE)
    // ========================================

    // Lifetime earnings: Sum ALL paid commissions
    const lifetimeEarnings = allCommissions.reduce(
      (sum, comm) => sum + comm.memberShare,
      0
    );

    // Monthly earnings: Sum this month's paid commissions
    const monthlyEarnings = monthlyCommissions.reduce(
      (sum, comm) => sum + comm.memberShare,
      0
    );

    // Last month's earnings: For trend calculation
    const lastMonthEarnings = lastMonthCommissions.reduce(
      (sum, comm) => sum + comm.memberShare,
      0
    );

    // Calculate month-over-month trend
    const monthlyTrend = lastMonthEarnings > 0
      ? ((monthlyEarnings - lastMonthEarnings) / lastMonthEarnings) * 100
      : monthlyEarnings > 0
      ? 100 // If we had nothing last month but have earnings this month, that's 100% growth
      : 0;

    // ========================================
    // CALCULATE REFERRAL COUNTS
    // ========================================

    const totalReferred = member.totalReferred; // Simple count, safe to use
    const monthlyReferred = referralCount;

    console.log('✅ Member stats calculated from SOURCE:', {
      memberId,
      lifetimeEarnings,
      monthlyEarnings,
      monthlyTrend: `${monthlyTrend > 0 ? '+' : ''}${monthlyTrend.toFixed(1)}%`,
      totalReferred,
      monthlyReferred,
    });

    return {
      // Member info
      memberId: member.id,
      membershipId: member.membershipId,
      username: member.username,
      email: member.email,
      referralCode: member.referralCode,
      creatorId: member.creatorId,
      subscriptionPrice: member.subscriptionPrice, // For earnings calculator
      createdAt: member.createdAt,

      // Earnings (calculated from commissions)
      lifetimeEarnings,
      monthlyEarnings,
      monthlyTrend, // Calculated, not hardcoded!

      // Referrals
      totalReferred,
      monthlyReferred,

      // Commission details
      totalCommissions: allCommissions.length,
      monthlyCommissions: monthlyCommissions.length,
      earningsHistory: allCommissions.map(c => ({
        amount: c.memberShare,
        date: c.createdAt,
      })),
    };
  } catch (error) {
    logger.error('❌ Error fetching member stats:', error);
    throw error;
  }
}

/**
 * Get member's leaderboard rankings
 * Calculated in real-time from current data
 *
 * IMPORTANT:
 * - Global ranks compare across ALL creators (true global)
 * - Community ranks compare within single creator
 * - Global ranks based on EARNINGS
 * - Community ranks based on REFERRALS
 */
export async function getMemberRankings(memberId: string, creatorId: string) {
  try {
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        totalReferred: true,
      },
    });

    if (!member) {
      throw new Error('Member not found');
    }

    // Get member's lifetime earnings (from our centralized function)
    const stats = await getMemberStats(memberId);

    // ========================================
    // TRUE GLOBAL EARNINGS RANK
    // Compare across ALL creators, sorted by earnings
    // ========================================
    // Round to 2 decimal places to avoid floating point precision issues
    const roundedEarnings = Math.round(stats.lifetimeEarnings * 100) / 100;

    const higherEarners = await prisma.commission.groupBy({
      by: ['memberId'],
      where: {
        // NO creatorId filter - true global!
        status: 'paid',
        NOT: {
          memberId: memberId, // Exclude self to avoid floating point comparison issues
        },
      },
      _sum: {
        memberShare: true,
      },
      having: {
        memberShare: {
          _sum: {
            gte: roundedEarnings + 0.01, // Must be at least 1 cent higher
          },
        },
      },
    });

    const globalEarningsRank = higherEarners.length + 1;

    // ========================================
    // TRUE GLOBAL REFERRALS RANK
    // Compare across ALL creators, sorted by referrals
    // ========================================
    const higherReferrers = await prisma.member.count({
      where: {
        // NO creatorId filter - true global!
        totalReferred: {
          gt: member.totalReferred,
        },
      },
    });

    const globalReferralsRank = higherReferrers + 1;

    // ========================================
    // COMMUNITY RANK (within single creator)
    // Sorted by referrals (not earnings)
    // ========================================
    const higherCommunityReferrers = await prisma.member.count({
      where: {
        creatorId, // Filter by creator for community rank
        totalReferred: {
          gt: member.totalReferred,
        },
      },
    });

    const communityRank = higherCommunityReferrers + 1;

    console.log('✅ Member rankings calculated:', {
      memberId,
      globalEarningsRank: `#${globalEarningsRank} (earnings, all creators)`,
      globalReferralsRank: `#${globalReferralsRank} (referrals, all creators)`,
      communityRank: `#${communityRank} (referrals, within creator)`,
    });

    return {
      globalEarningsRank,
      globalReferralsRank,
      communityRank,
    };
  } catch (error) {
    logger.error('❌ Error fetching member rankings:', error);
    return {
      globalEarningsRank: null,
      globalReferralsRank: null,
      communityRank: null,
    };
  }
}

/**
 * Get member's daily earnings for chart
 * Aggregates commissions by day
 */
export async function getMemberEarningsHistory(memberId: string, days: number = 30) {
  try {
    const startDate = subMonths(new Date(), 1); // Last 30 days

    const commissions = await prisma.commission.findMany({
      where: {
        memberId,
        status: 'paid',
        createdAt: { gte: startDate },
      },
      select: {
        memberShare: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const dailyEarnings = new Map<string, number>();

    commissions.forEach(comm => {
      const dateKey = comm.createdAt.toISOString().split('T')[0];
      const current = dailyEarnings.get(dateKey) || 0;
      dailyEarnings.set(dateKey, current + comm.memberShare);
    });

    // Convert to array format for chart
    const data = Array.from(dailyEarnings.entries()).map(([date, earnings]) => ({
      date,
      earnings,
    }));

    console.log('✅ Member earnings history fetched:', {
      memberId,
      days: data.length,
      totalEarnings: data.reduce((sum, d) => sum + d.earnings, 0),
    });

    return data;
  } catch (error) {
    logger.error('❌ Error fetching earnings history:', error);
    return [];
  }
}

/**
 * Get member's recent referrals with earnings
 */
export async function getMemberReferrals(memberId: string, limit: number = 10) {
  try {
    const referrals = await prisma.member.findMany({
      where: {
        referredBy: memberId,
      },
      select: {
        username: true,
        createdAt: true,
        commissions: {
          where: {
            status: 'paid',
          },
          select: {
            memberShare: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Calculate earnings for each referral
    const referralsWithEarnings = referrals
      .filter(ref => ref.commissions.length > 0) // Only show referrals that have converted
      .map(ref => {
        const totalEarnings = ref.commissions.reduce(
          (sum, comm) => sum + comm.memberShare,
          0
        );
        const paymentCount = ref.commissions.length;
        const firstPaymentDate = ref.commissions[0]?.createdAt || ref.createdAt;

        return {
          username: ref.username,
          totalEarnings,
          paymentCount,
          firstPaymentDate,
        };
      });

    console.log('✅ Member referrals fetched:', {
      memberId,
      count: referralsWithEarnings.length,
    });

    return referralsWithEarnings;
  } catch (error) {
    logger.error('❌ Error fetching member referrals:', error);
    return [];
  }
}

// ========================================
// CREATOR METRICS
// ========================================

/**
 * Get ALL creator revenue metrics from SINGLE source
 * Calculates everything from Commission records
 */
export async function getCreatorRevenueStats(creatorId: string) {
  try {
    const monthStart = startOfMonth(new Date());

    // Get all commissions and member data in parallel
    const [allCommissions, monthlyCommissions, members, activeClicks, totalShares] = await Promise.all([
      // All-time commissions
      prisma.commission.findMany({
        where: {
          creatorId,
          status: 'paid',
        },
        select: {
          saleAmount: true,
          creatorShare: true,
          memberShare: true,
        },
      }),

      // This month's commissions
      prisma.commission.findMany({
        where: {
          creatorId,
          status: 'paid',
          createdAt: { gte: monthStart },
        },
        select: {
          saleAmount: true,
          creatorShare: true,
        },
      }),

      // All members (for subscription revenue calculation)
      prisma.member.findMany({
        where: { creatorId },
        select: {
          subscriptionPrice: true,
          memberOrigin: true,
          monthlyValue: true,
          billingPeriod: true,
        },
      }),

      // Active attribution clicks
      prisma.attributionClick.count({
        where: {
          member: {
            creatorId,
          },
          expiresAt: { gte: new Date() },
        },
      }),

      // Total share events (for "Total Shares Sent" metric)
      prisma.shareEvent.count({
        where: {
          member: {
            creatorId,
          },
        },
      }),
    ]);

    // ========================================
    // CALCULATE REVENUE (SINGLE SOURCE)
    // ========================================

    // Total revenue: Sum ALL paid commissions sale amounts
    const totalRevenue = allCommissions.reduce(
      (sum, comm) => sum + comm.saleAmount,
      0
    );

    // Monthly revenue: Sum this month's commissions
    const monthlyRevenue = monthlyCommissions.reduce(
      (sum, comm) => sum + comm.saleAmount,
      0
    );

    // Creator's share
    const totalCreatorEarnings = allCommissions.reduce(
      (sum, comm) => sum + comm.creatorShare,
      0
    );

    const monthlyCreatorEarnings = monthlyCommissions.reduce(
      (sum, comm) => sum + comm.creatorShare,
      0
    );

    // Calculate projected monthly recurring revenue (MRR)
    // Use monthlyValue (handles annual/lifetime correctly)
    // Lifetime subscriptions have monthlyValue=null, so they don't inflate MRR
    const monthlyRecurringRevenue = members.reduce(
      (sum, member) => sum + (member.monthlyValue || 0), // Use normalized monthly value!
      0
    );

    // Calculate referral contribution to MRR
    // Use monthlyValue to correctly exclude lifetime from recurring revenue
    const referralContribution = members
      .filter(m => m.memberOrigin === 'referred')
      .reduce((sum, member) => sum + (member.monthlyValue || 0), 0);

    // Count referred vs organic members
    const referredCount = members.filter(m => m.memberOrigin === 'referred').length;
    const organicCount = members.filter(m => m.memberOrigin === 'organic').length;

    // Calculate conversion rate
    const conversionRate = activeClicks > 0
      ? (referredCount / activeClicks) * 100
      : 0;

    // ========================================
    // GAMIFICATION: Global Creator Rankings
    // ========================================

    // Get global revenue rank (how this creator ranks by revenue)
    const creatorsWithMoreRevenue = await prisma.creator.count({
      where: {
        totalRevenue: { gt: totalRevenue },
      },
    });
    const globalRevenueRank = creatorsWithMoreRevenue + 1;

    // Get global referral rank (how this creator ranks by total referrals)
    const totalReferralsByCreator = referredCount;
    const creatorsWithMoreReferrals = await prisma.creator.count({
      where: {
        totalReferrals: { gt: totalReferralsByCreator },
      },
    });
    const globalReferralRank = creatorsWithMoreReferrals + 1;

    // Get total creator count for context
    const totalCreators = await prisma.creator.count();

    // Calculate referral momentum (% of members who have made at least 1 referral)
    const membersWithReferrals = await prisma.member.count({
      where: {
        creatorId,
        totalReferred: { gt: 0 },
      },
    });
    const referralMomentum = members.length > 0
      ? (membersWithReferrals / members.length) * 100
      : 0;

    // ========================================
    // NEW GAMIFICATION METRICS
    // ========================================

    // Share-to-Conversion Rate (Quality metric)
    // Shows how effective shares are at generating referrals
    const totalReferralsForConversion = referredCount; // Total referred members
    const shareToConversionRate = totalShares > 0
      ? (totalReferralsForConversion / totalShares) * 100
      : 0;

    // Monthly Growth Velocity (Competitive/Growth metric)
    // Shows % growth in referrals this month vs last month
    const lastMonthStart = startOfMonth(subMonths(new Date(), 1));

    const thisMonthReferrals = await prisma.member.count({
      where: {
        creatorId,
        memberOrigin: 'referred', // Only count referred members
        createdAt: { gte: monthStart }
      }
    });

    const lastMonthReferrals = await prisma.member.count({
      where: {
        creatorId,
        memberOrigin: 'referred',
        createdAt: {
          gte: lastMonthStart,
          lt: monthStart
        }
      }
    });

    const monthlyGrowthRate = lastMonthReferrals > 0
      ? ((thisMonthReferrals - lastMonthReferrals) / lastMonthReferrals) * 100
      : thisMonthReferrals > 0 ? 100 : 0; // 100% if we have growth from 0, otherwise 0

    console.log('✅ Creator revenue stats calculated:', {
      creatorId,
      totalRevenue,
      monthlyRevenue,
      monthlyRecurringRevenue,
      totalMembers: members.length,
      referredCount,
      organicCount,
      globalRevenueRank,
      globalReferralRank,
      referralMomentum: `${referralMomentum.toFixed(1)}%`,
    });

    return {
      // Revenue metrics
      totalRevenue,
      monthlyRevenue,
      totalCreatorEarnings,
      monthlyCreatorEarnings,
      monthlyRecurringRevenue,
      referralContribution,

      // Member metrics
      totalMembers: members.length,
      referredCount,
      organicCount,

      // Click/conversion metrics
      totalActiveClicks: activeClicks,
      convertedClicks: referredCount, // Referred members = conversions
      conversionRate,

      // Commission counts
      totalCommissions: allCommissions.length,
      monthlyCommissions: monthlyCommissions.length,

      // Share events
      totalShares, // Total share events across all members

      // Gamification metrics
      globalRevenueRank,
      globalReferralRank,
      totalCreators,
      referralMomentum,
      membersWithReferrals,

      // ✅ NEW GAMIFICATION METRICS
      shareToConversionRate, // Quality metric: % of shares that convert to referrals
      monthlyGrowthRate, // Growth metric: % growth this month vs last
      thisMonthReferrals, // Context for growth rate
      lastMonthReferrals, // Context for growth rate

      // Average values
      avgSaleValue: allCommissions.length > 0
        ? totalRevenue / allCommissions.length
        : 0,
    };
  } catch (error) {
    logger.error('❌ Error fetching creator revenue stats:', error);
    throw error;
  }
}

/**
 * Calculate total revenue generated by a member's referrals
 * Returns the FULL sale amount (not just their 10% commission)
 *
 * This shows the true impact of a member's referral activity.
 * For example:
 * - Member earns $8,450 (their 10% cut)
 * - But their referrals generated $120,000 in total sales
 * - This function returns $120,000
 */
export async function getMemberReferralRevenue(
  referralCode: string
): Promise<number> {
  try {
    // Get all members referred by this member's code
    const referredMembers = await prisma.member.findMany({
      where: { referredBy: referralCode },
      select: { membershipId: true },
    });

    if (referredMembers.length === 0) {
      return 0;
    }

    const membershipIds = referredMembers.map(m => m.membershipId);

    // Get all sales (commissions) from those referred members
    // These are purchases MADE BY the referred members
    const commissions = await prisma.commission.findMany({
      where: {
        whopMembershipId: { in: membershipIds },
        status: 'paid',
      },
      select: { saleAmount: true },
    });

    // Sum up all the sales
    const totalRevenue = commissions.reduce((sum, c) => sum + c.saleAmount, 0);

    return totalRevenue;
  } catch (error) {
    logger.error('❌ Error calculating member referral revenue:', error);
    return 0;
  }
}

/**
 * Get top performing members
 * Calculated in real-time from commission records
 */
export async function getCreatorTopPerformers(
  creatorId: string,
  sortBy: 'earnings' | 'referrals' = 'earnings',
  limit: number = 10
) {
  try {
    // ========================================
    // Fetch creator tier thresholds for dynamic tier calculation
    // ========================================
    const creator = await prisma.creator.findUnique({
      where: { id: creatorId },
      select: {
        tier1Count: true,
        tier2Count: true,
        tier3Count: true,
        tier4Count: true,
      },
    });

    if (!creator) {
      throw new Error('Creator not found');
    }

    const tierThresholds: TierThresholds = {
      tier1Count: creator.tier1Count,
      tier2Count: creator.tier2Count,
      tier3Count: creator.tier3Count,
      tier4Count: creator.tier4Count,
    };

    if (sortBy === 'earnings') {
      // Get members with highest lifetime earnings
      const monthStart = startOfMonth(new Date());

      const topByEarnings = await prisma.commission.groupBy({
        by: ['memberId'],
        where: {
          creatorId,
          status: 'paid',
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

      // Get member details for each top earner with all needed data
      const memberIds = topByEarnings.map(t => t.memberId);
      const members = await prisma.member.findMany({
        where: {
          id: { in: memberIds },
        },
        select: {
          id: true,
          username: true,
          email: true,
          referralCode: true,
          totalReferred: true,
          currentTier: true,
          createdAt: true,
          commissions: {
            where: {
              status: 'paid',
            },
            select: {
              memberShare: true,
              createdAt: true,
            },
          },
        },
      });

      // ========================================
      // OPTIMIZATION: Batch query monthly referrals (avoid N+1)
      // ========================================
      const referralCodes = members.map(m => m.referralCode);

      // Get all monthly referrals in a single query
      const monthlyReferralsData = await prisma.member.groupBy({
        by: ['referredBy'],
        where: {
          referredBy: { in: referralCodes },
          createdAt: { gte: monthStart },
        },
        _count: {
          id: true,
        },
      });

      // Create lookup map for O(1) access
      const monthlyReferralsMap = new Map(
        monthlyReferralsData.map(item => [
          item.referredBy as string,
          item._count.id
        ])
      );

      // ========================================
      // OPTIMIZATION: Batch calculate revenue generated by each performer's referrals
      // Avoids N+1 queries by doing all calculations in parallel
      // ========================================
      // Reuse referralCodes from above (already mapped on line 786)

      // Get all referred members for all top performers (filtered by creator)
      const allReferredMembers = await prisma.member.findMany({
        where: {
          referredBy: { in: referralCodes },
          creatorId, // ✅ Only count referrals to THIS creator
        },
        select: {
          referredBy: true,
          membershipId: true,
        },
      });

      // Group referred members by referrer code
      const referredMembersMap = new Map<string, string[]>();
      allReferredMembers.forEach(member => {
        if (!member.referredBy) return;

        if (!referredMembersMap.has(member.referredBy)) {
          referredMembersMap.set(member.referredBy, []);
        }
        referredMembersMap.get(member.referredBy)!.push(member.membershipId);
      });

      // Get all commission sales for referred members (filtered by creator)
      const allMembershipIds = allReferredMembers.map(m => m.membershipId);
      const allReferredCommissions = await prisma.commission.findMany({
        where: {
          whopMembershipId: { in: allMembershipIds },
          creatorId, // ✅ Only count commissions for THIS creator
          status: 'paid',
        },
        select: {
          whopMembershipId: true,
          saleAmount: true,
        },
      });

      // Create map: membershipId → total sales
      const membershipSalesMap = new Map<string, number>();
      allReferredCommissions.forEach(comm => {
        const current = membershipSalesMap.get(comm.whopMembershipId) || 0;
        membershipSalesMap.set(comm.whopMembershipId, current + comm.saleAmount);
      });

      // Calculate revenue generated by each referrer
      const revenueGeneratedMap = new Map<string, number>();
      referredMembersMap.forEach((membershipIds, referrerCode) => {
        const totalRevenue = membershipIds.reduce((sum, membershipId) => {
          return sum + (membershipSalesMap.get(membershipId) || 0);
        }, 0);
        revenueGeneratedMap.set(referrerCode, totalRevenue);
      });

      // Combine earnings data with member info and calculate monthly data
      const topPerformers = topByEarnings.map((earning) => {
        const member = members.find(m => m.id === earning.memberId);

        if (!member) {
          return null;
        }

        // Get monthly referrals from map (O(1) lookup)
        const monthlyReferred = monthlyReferralsMap.get(member.referralCode) || 0;

        // Calculate monthly earnings from commissions
        const monthlyEarnings = member.commissions
          .filter(comm => comm.createdAt >= monthStart)
          .reduce((sum, comm) => sum + comm.memberShare, 0);

        // ========================================
        // Calculate tier dynamically based on current referral count
        // ========================================
        const calculatedTier = calculateMemberTier(member.totalReferred, tierThresholds);

        // Get revenue generated by this member's referrals
        const revenueGenerated = revenueGeneratedMap.get(member.referralCode) || 0;

        return {
          id: member.id,
          username: member.username,
          email: member.email,
          referralCode: member.referralCode,
          totalReferred: member.totalReferred,
          monthlyReferred,
          lifetimeEarnings: earning._sum.memberShare || 0,
          monthlyEarnings,
          currentTier: calculatedTier, // ✅ Dynamic tier calculation!
          revenueGenerated, // ✅ Total sales generated by referrals!
          createdAt: member.createdAt,
        };
      });

      // Filter out any null entries
      const validTopPerformers = topPerformers.filter(p => p !== null);

      console.log('✅ Top earners fetched:', {
        creatorId,
        count: validTopPerformers.length,
      });

      return validTopPerformers;
    } else {
      // Get members with most referrals
      const monthStart = startOfMonth(new Date());

      const topByReferrals = await prisma.member.findMany({
        where: {
          creatorId,
        },
        select: {
          id: true,
          username: true,
          email: true,
          referralCode: true,
          totalReferred: true,
          currentTier: true,
          createdAt: true,
          commissions: {
            where: {
              status: 'paid',
            },
            select: {
              memberShare: true,
              createdAt: true,
            },
          },
        },
        orderBy: {
          totalReferred: 'desc',
        },
        take: limit,
      });

      // ========================================
      // OPTIMIZATION: Batch query monthly referrals (avoid N+1)
      // ========================================
      const referralCodes = topByReferrals.map(m => m.referralCode);

      // Get all monthly referrals in a single query
      const monthlyReferralsData = await prisma.member.groupBy({
        by: ['referredBy'],
        where: {
          referredBy: { in: referralCodes },
          createdAt: { gte: monthStart },
        },
        _count: {
          id: true,
        },
      });

      // Create lookup map for O(1) access
      const monthlyReferralsMap = new Map(
        monthlyReferralsData.map(item => [
          item.referredBy as string,
          item._count.id
        ])
      );

      // ========================================
      // OPTIMIZATION: Batch calculate revenue generated by each performer's referrals
      // Same logic as earnings branch to avoid N+1 queries
      // ========================================
      // Reuse referralCodes from above (already mapped on line 950)

      // Get all referred members for all top performers (filtered by creator)
      const allReferredMembers2 = await prisma.member.findMany({
        where: {
          referredBy: { in: referralCodes },
          creatorId, // ✅ Only count referrals to THIS creator
        },
        select: {
          referredBy: true,
          membershipId: true,
        },
      });

      // Group referred members by referrer code
      const referredMembersMap2 = new Map<string, string[]>();
      allReferredMembers2.forEach(member => {
        if (!member.referredBy) return;

        if (!referredMembersMap2.has(member.referredBy)) {
          referredMembersMap2.set(member.referredBy, []);
        }
        referredMembersMap2.get(member.referredBy)!.push(member.membershipId);
      });

      // Get all commission sales for referred members (filtered by creator)
      const allMembershipIds2 = allReferredMembers2.map(m => m.membershipId);
      const allReferredCommissions2 = await prisma.commission.findMany({
        where: {
          whopMembershipId: { in: allMembershipIds2 },
          creatorId, // ✅ Only count commissions for THIS creator
          status: 'paid',
        },
        select: {
          whopMembershipId: true,
          saleAmount: true,
        },
      });

      // Create map: membershipId → total sales
      const membershipSalesMap2 = new Map<string, number>();
      allReferredCommissions2.forEach(comm => {
        const current = membershipSalesMap2.get(comm.whopMembershipId) || 0;
        membershipSalesMap2.set(comm.whopMembershipId, current + comm.saleAmount);
      });

      // Calculate revenue generated by each referrer
      const revenueGeneratedMap2 = new Map<string, number>();
      referredMembersMap2.forEach((membershipIds, referrerCode) => {
        const totalRevenue = membershipIds.reduce((sum, membershipId) => {
          return sum + (membershipSalesMap2.get(membershipId) || 0);
        }, 0);
        revenueGeneratedMap2.set(referrerCode, totalRevenue);
      });

      // Calculate monthly referrals and earnings for each member
      const topWithMonthlyData = topByReferrals.map((member) => {
        // Get monthly referrals from map (O(1) lookup)
        const monthlyReferred = monthlyReferralsMap.get(member.referralCode) || 0;

        // Calculate lifetime and monthly earnings from commissions
        const lifetimeEarnings = member.commissions.reduce(
          (sum, comm) => sum + comm.memberShare,
          0
        );

        const monthlyEarnings = member.commissions
          .filter(comm => comm.createdAt >= monthStart)
          .reduce((sum, comm) => sum + comm.memberShare, 0);

        // ========================================
        // Calculate tier dynamically based on current referral count
        // ========================================
        const calculatedTier = calculateMemberTier(member.totalReferred, tierThresholds);

        // Get revenue generated by this member's referrals
        const revenueGenerated = revenueGeneratedMap2.get(member.referralCode) || 0;

        return {
          id: member.id,
          username: member.username,
          email: member.email,
          referralCode: member.referralCode,
          totalReferred: member.totalReferred,
          monthlyReferred,
          lifetimeEarnings,
          monthlyEarnings,
          currentTier: calculatedTier, // ✅ Dynamic tier calculation!
          revenueGenerated, // ✅ Total sales generated by referrals!
          createdAt: member.createdAt,
        };
      });

      console.log('✅ Top referrers fetched:', {
        creatorId,
        count: topWithMonthlyData.length,
      });

      return topWithMonthlyData;
    }
  } catch (error) {
    logger.error('❌ Error fetching top performers:', error);
    return [];
  }
}

/**
 * Calculate "Revenue from Top 10" metric CORRECTLY
 */
export async function getCreatorTopPerformerContribution(creatorId: string) {
  try {
    // Get top 10 earners
    const topEarners = await getCreatorTopPerformers(creatorId, 'earnings', 10);

    // Sum their total earnings
    const topEarnersTotal = topEarners.reduce(
      (sum, member) => sum + (member.lifetimeEarnings || 0),
      0
    );

    // Get total revenue
    const revenueStats = await getCreatorRevenueStats(creatorId);
    const totalRevenue = revenueStats.totalRevenue;

    // Calculate percentage
    const topPerformerContribution = totalRevenue > 0
      ? (topEarnersTotal / totalRevenue) * 100
      : 0;

    console.log('✅ Top performer contribution calculated:', {
      creatorId,
      topEarnersTotal,
      totalRevenue,
      contribution: `${topPerformerContribution.toFixed(1)}%`,
    });

    return {
      topPerformerContribution,
      topEarnersTotal,
      totalRevenue,
    };
  } catch (error) {
    logger.error('❌ Error calculating top performer contribution:', error);
    return {
      topPerformerContribution: 0,
      topEarnersTotal: 0,
      totalRevenue: 0,
    };
  }
}

// ========================================
// COMBINED QUERIES
// ========================================

/**
 * Get complete member dashboard data
 * Single function that fetches ALL member data consistently
 */
export async function getCompleteMemberDashboardData(membershipId: string) {
  try {
    // First get member ID from membershipId
    const member = await prisma.member.findUnique({
      where: { membershipId },
      select: {
        id: true,
        creatorId: true,
        whopUsername: true, // Strategy B: For affiliate link setup
        // Streak tracking fields
        currentStreak: true,
        longestStreak: true,
        lastReferralDate: true,
      },
    });

    if (!member) {
      throw new Error('Member not found');
    }

    // Fetch all data in parallel
    const [stats, rankings, earningsHistory, referrals] = await Promise.all([
      getMemberStats(member.id),
      getMemberRankings(member.id, member.creatorId),
      getMemberEarningsHistory(member.id, 30),
      getMemberReferrals(member.id, 10),
    ]);

    console.log('Complete member dashboard data fetched:', {
      membershipId,
      memberId: member.id,
    });

    return {
      ...stats,
      ...rankings,
      earningsHistory,
      referrals,
      whopUsername: member.whopUsername, // Strategy B: Include for dashboard
      // Streak data for dashboard display
      currentStreak: member.currentStreak || 0,
      longestStreak: member.longestStreak || 0,
      lastReferralDate: member.lastReferralDate,
    };
  } catch (error) {
    logger.error('❌ Error fetching complete member dashboard data:', error);
    throw error;
  }
}

/**
 * Get complete creator dashboard data
 * Single function that fetches ALL creator data consistently
 */
export async function getCompleteCreatorDashboardData(productId: string) {
  try {
    // First get creator ID from productId
    const creator = await prisma.creator.findFirst({
      where: { productId },
      select: { id: true },
    });

    if (!creator) {
      throw new Error('Creator not found');
    }

    // Fetch all data in parallel
    const [revenueStats, topEarners, topReferrers, topPerformerContribution] =
      await Promise.all([
        getCreatorRevenueStats(creator.id),
        getCreatorTopPerformers(creator.id, 'earnings', 10),
        getCreatorTopPerformers(creator.id, 'referrals', 10),
        getCreatorTopPerformerContribution(creator.id),
      ]);

    console.log('✅ Complete creator dashboard data fetched:', {
      productId,
      creatorId: creator.id,
    });

    return {
      revenueStats,
      topEarners,
      topReferrers,
      topPerformerContribution,
    };
  } catch (error) {
    logger.error('❌ Error fetching complete creator dashboard data:', error);
    throw error;
  }
}
