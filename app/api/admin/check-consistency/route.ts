import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { startOfMonth } from 'date-fns';

/**
 * Real-Time Data Consistency Checker
 *
 * Validates:
 * 1. Sum of monthlyReferred = actual monthly referrals
 * 2. No member has monthly > total
 * 3. Commission splits add to 100%
 * 4. No negative values
 * 5. Logical consistency across the board
 */

export async function GET() {
  const errors: string[] = [];
  const warnings: string[] = [];
  const startTime = Date.now();

  try {
    console.log('🔍 Running consistency checks...');

    const currentMonthStart = startOfMonth(new Date());

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CHECK 1: Sum of monthlyReferred = referred members this month
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const sumMonthly = await prisma.member.aggregate({
      _sum: { monthlyReferred: true },
    });

    const actualMonthlyReferrals = await prisma.member.count({
      where: {
        memberOrigin: 'referred',
        createdAt: { gte: currentMonthStart },
      },
    });

    if (sumMonthly._sum.monthlyReferred !== actualMonthlyReferrals) {
      errors.push(
        `Sum of monthlyReferred (${sumMonthly._sum.monthlyReferred}) != ` +
        `actual monthly referrals (${actualMonthlyReferrals})`
      );
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CHECK 2: No member has monthly > total
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const invalidMembers = await prisma.$queryRaw<Array<{
      username: string;
      monthlyReferred: number;
      totalReferred: number;
    }>>`
      SELECT username, "monthlyReferred", "totalReferred"
      FROM "Member"
      WHERE "monthlyReferred" > "totalReferred"
    `;

    if (invalidMembers.length > 0) {
      errors.push(
        `${invalidMembers.length} members have monthly > total: ` +
        invalidMembers.map(m => `${m.username} (${m.monthlyReferred}/${m.totalReferred})`).join(', ')
      );
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CHECK 3: No negative values
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const negativeMonthly = await prisma.member.count({
      where: { monthlyReferred: { lt: 0 } },
    });
    const negativeEarnings = await prisma.member.count({
      where: { monthlyEarnings: { lt: 0 } },
    });
    const negativeTotal = await prisma.member.count({
      where: { totalReferred: { lt: 0 } },
    });

    if (negativeMonthly > 0) {
      errors.push(`${negativeMonthly} members have negative monthlyReferred`);
    }
    if (negativeEarnings > 0) {
      errors.push(`${negativeEarnings} members have negative monthlyEarnings`);
    }
    if (negativeTotal > 0) {
      errors.push(`${negativeTotal} members have negative totalReferred`);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CHECK 4: Commission splits add to 100%
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const commissions = await prisma.commission.findMany({
      select: {
        id: true,
        saleAmount: true,
        memberShare: true,
        creatorShare: true,
        platformShare: true,
      },
      take: 100, // Sample 100 commissions
    });

    const invalidCommissions = commissions.filter(c => {
      const total = c.memberShare + c.creatorShare + c.platformShare;
      return Math.abs(total - c.saleAmount) > 0.01;
    });

    if (invalidCommissions.length > 0) {
      errors.push(
        `${invalidCommissions.length} commissions have invalid splits (sample of 100 checked)`
      );
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CHECK 5: Monthly earnings match commission records
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const topMembers = await prisma.member.findMany({
      orderBy: { monthlyEarnings: 'desc' },
      take: 10,
      select: {
        id: true,
        username: true,
        monthlyEarnings: true,
      },
    });

    for (const member of topMembers) {
      const actualEarnings = await prisma.commission.aggregate({
        where: {
          memberId: member.id,
          createdAt: { gte: currentMonthStart },
        },
        _sum: { memberShare: true },
      });

      const actual = actualEarnings._sum.memberShare || 0;
      const diff = Math.abs(member.monthlyEarnings - actual);

      if (diff > 0.01) {
        warnings.push(
          `${member.username}: monthlyEarnings ($${member.monthlyEarnings.toFixed(2)}) ` +
          `differs from actual ($${actual.toFixed(2)}) by $${diff.toFixed(2)}`
        );
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CHECK 6: Referral code uniqueness
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const duplicateCodes = await prisma.$queryRaw<Array<{
      referralCode: string;
      count: number;
    }>>`
      SELECT "referralCode", COUNT(*) as count
      FROM "Member"
      GROUP BY "referralCode"
      HAVING COUNT(*) > 1
    `;

    if (duplicateCodes.length > 0) {
      errors.push(
        `${duplicateCodes.length} duplicate referral codes found: ` +
        duplicateCodes.map(d => `${d.referralCode} (${d.count}x)`).join(', ')
      );
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CHECK 7: Organic members don't have referredBy
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const invalidOrganic = await prisma.member.count({
      where: {
        memberOrigin: 'organic',
        referredBy: { not: null },
      },
    });

    if (invalidOrganic > 0) {
      errors.push(`${invalidOrganic} organic members have referredBy set (should be null)`);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CHECK 8: Referred members have valid referredBy
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const invalidReferred = await prisma.member.count({
      where: {
        memberOrigin: 'referred',
        referredBy: null,
      },
    });

    if (invalidReferred > 0) {
      warnings.push(`${invalidReferred} referred members have null referredBy`);
    }

    const executionTime = Date.now() - startTime;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // SUMMARY
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('═══════════════════════════════════════');
    console.log('📋 CONSISTENCY CHECK SUMMARY:');
    console.log('═══════════════════════════════════════');
    console.log(`Errors: ${errors.length}`);
    console.log(`Warnings: ${warnings.length}`);
    console.log(`Execution time: ${executionTime}ms`);
    console.log('═══════════════════════════════════════');

    if (errors.length > 0) {
      console.error('❌ ERRORS:');
      errors.forEach(e => console.error(`  - ${e}`));
    }

    if (warnings.length > 0) {
      console.warn('⚠️  WARNINGS:');
      warnings.forEach(w => console.warn(`  - ${w}`));
    }

    return NextResponse.json({
      valid: errors.length === 0,
      errors,
      warnings,
      executionTime,
      timestamp: new Date().toISOString(),
      checks: {
        monthlyReferralSum: sumMonthly._sum.monthlyReferred === actualMonthlyReferrals,
        noMonthlyExceedsTotal: invalidMembers.length === 0,
        noNegativeValues: negativeMonthly === 0 && negativeEarnings === 0 && negativeTotal === 0,
        commissionSplitsValid: invalidCommissions.length === 0,
        referralCodesUnique: duplicateCodes.length === 0,
        organicMembersValid: invalidOrganic === 0,
      },
    });

  } catch (error) {
    console.error('❌ Consistency check failed:', error);
    return NextResponse.json(
      {
        valid: false,
        error: 'Consistency check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
