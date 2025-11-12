/**
 * Export Payout Report API
 *
 * Generates a CSV export of top referrers with suggested reward amounts.
 * Creators can use this to manually pay out their top performers.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db/prisma';
import logger from '../../../../lib/logger';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const creatorId = searchParams.get('creatorId');
    const monthsBack = parseInt(searchParams.get('months') || '1');

    if (!creatorId) {
      return NextResponse.json({ error: 'Creator ID required' }, { status: 400 });
    }

    // Calculate date range (default: last month)
    const endDate = endOfMonth(subMonths(new Date(), monthsBack - 1));
    const startDate = startOfMonth(subMonths(new Date(), monthsBack));

    logger.info(`Generating payout report for creator ${creatorId} from ${startDate} to ${endDate}`);

    // Get creator info
    const creator = await prisma.creator.findUnique({
      where: { id: creatorId },
      select: {
        companyName: true,
      },
    });

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    // Get all members and their referred sales in this period
    const members = await prisma.member.findMany({
      where: {
        creatorId,
      },
      select: {
        id: true,
        username: true,
        email: true,
        referralCode: true,
      },
    });

    // Get all referrals (members who were referred by these members)
    const memberCodes = members.map(m => m.referralCode);

    const referrals = await prisma.member.findMany({
      where: {
        referredBy: { in: memberCodes },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        referredBy: true,
        createdAt: true,
      },
    });

    // Get commissions for these referrals
    const referralIds = referrals.map(r => r.id);

    const commissions = await prisma.commission.findMany({
      where: {
        memberId: { in: referralIds },
        status: 'paid',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        memberId: true,
        saleAmount: true,
        memberShare: true, // This is our suggested 10%
      },
    });

    // Create a map of member ID to referral code
    const referralToMemberMap = new Map();
    referrals.forEach(ref => {
      referralToMemberMap.set(ref.id, ref.referredBy);
    });

    // Aggregate data by referrer
    const performanceMap = new Map();

    referrals.forEach(referral => {
      const referrerCode = referral.referredBy;
      if (!performanceMap.has(referrerCode)) {
        performanceMap.set(referrerCode, {
          referralCount: 0,
          totalRevenue: 0,
          suggestedReward: 0,
        });
      }
      const stats = performanceMap.get(referrerCode);
      stats.referralCount += 1;
    });

    // Add commission data
    commissions.forEach(commission => {
      const referrerCode = referralToMemberMap.get(commission.memberId);
      if (referrerCode && performanceMap.has(referrerCode)) {
        const stats = performanceMap.get(referrerCode);
        stats.totalRevenue += Number(commission.saleAmount);
        stats.suggestedReward += Number(commission.memberShare); // 10% suggested
      }
    });

    // Build report data
    const reportData = members
      .map(member => {
        const stats = performanceMap.get(member.referralCode) || {
          referralCount: 0,
          totalRevenue: 0,
          suggestedReward: 0,
        };

        return {
          username: member.username,
          email: member.email,
          referralCode: member.referralCode,
          referralCount: stats.referralCount,
          totalRevenue: stats.totalRevenue,
          suggestedReward: stats.suggestedReward,
        };
      })
      .filter(row => row.referralCount > 0) // Only include members with referrals
      .sort((a, b) => b.totalRevenue - a.totalRevenue); // Sort by revenue (highest first)

    // Generate CSV
    const csvHeader = [
      'Rank',
      'Username',
      'Email',
      'Referral Code',
      'Referrals',
      'Total Revenue Generated',
      'Suggested Reward (10%)',
    ].join(',');

    const csvRows = reportData.map((row, index) => {
      return [
        index + 1, // Rank
        `"${row.username}"`,
        row.email,
        row.referralCode,
        row.referralCount,
        row.totalRevenue.toFixed(2),
        row.suggestedReward.toFixed(2),
      ].join(',');
    });

    const csv = [csvHeader, ...csvRows].join('\n');

    // Calculate summary stats
    const totalReferrals = reportData.reduce((sum, row) => sum + row.referralCount, 0);
    const totalRevenue = reportData.reduce((sum, row) => sum + row.totalRevenue, 0);
    const totalSuggestedRewards = reportData.reduce((sum, row) => sum + row.suggestedReward, 0);

    // Add summary at bottom
    const summary = [
      '',
      'SUMMARY',
      '',
      '',
      totalReferrals,
      totalRevenue.toFixed(2),
      totalSuggestedRewards.toFixed(2),
    ].join(',');

    const finalCsv = `${csv}\n${summary}`;

    // Generate filename
    const periodLabel = format(startDate, 'MMM-yyyy');
    const filename = `payout-report-${creator.companyName.replace(/\s+/g, '-')}-${periodLabel}.csv`;

    logger.info(`Generated report: ${reportData.length} members, ${totalReferrals} referrals, $${totalRevenue.toFixed(2)} revenue`);

    // Return CSV
    return new NextResponse(finalCsv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logger.error('Error generating payout report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
