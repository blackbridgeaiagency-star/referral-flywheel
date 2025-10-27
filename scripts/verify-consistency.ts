// scripts/verify-consistency.ts
/**
 * DATA CONSISTENCY VERIFICATION SCRIPT
 *
 * Verifies that all data is consistent across the database:
 * - Creator totals match sum of member stats
 * - Commission splits add to 100%
 * - Member earnings match commission records
 * - Referral counts match actual referred members
 *
 * USAGE:
 * npm run verify-consistency
 * or
 * npx tsx scripts/verify-consistency.ts
 */

import { prisma } from '../lib/db/prisma';
import { logConsistencyCheck } from '../lib/utils/logger';

interface ConsistencyCheck {
  name: string;
  passed: boolean;
  expected: any;
  actual: any;
  difference?: any;
}

async function verifyConsistency() {
  console.log('🔍 Starting data consistency verification...\n');

  const checks: ConsistencyCheck[] = [];
  let allPassed = true;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CHECK 1: Creator Total Referrals = Sum of Member Referrals
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const creators = await prisma.creator.findMany({
    select: { id: true, companyName: true, totalReferrals: true },
  });

  for (const creator of creators) {
    const memberReferralSum = await prisma.member.aggregate({
      where: { creatorId: creator.id },
      _sum: { totalReferred: true },
    });

    const sumOfMemberReferrals = memberReferralSum._sum.totalReferred || 0;
    const passed = creator.totalReferrals === sumOfMemberReferrals;

    checks.push({
      name: `Creator "${creator.companyName}" - Total Referrals Match`,
      passed,
      expected: sumOfMemberReferrals,
      actual: creator.totalReferrals,
      difference: creator.totalReferrals - sumOfMemberReferrals,
    });

    if (!passed) allPassed = false;

    logConsistencyCheck(`Creator "${creator.companyName}" - Total Referrals`, {
      creatorTotal: creator.totalReferrals,
      memberSum: sumOfMemberReferrals,
      match: passed,
      difference: creator.totalReferrals - sumOfMemberReferrals,
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CHECK 2: Creator Total Revenue = Sum of Paid Commissions
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  for (const creator of creators) {
    const commissionSum = await prisma.commission.aggregate({
      where: { creatorId: creator.id, status: 'paid' },
      _sum: { saleAmount: true },
    });

    const sumOfCommissions = commissionSum._sum.saleAmount || 0;
    const creatorRevenue = await prisma.creator.findUnique({
      where: { id: creator.id },
      select: { totalRevenue: true },
    });

    const passed =
      Math.abs((creatorRevenue?.totalRevenue || 0) - sumOfCommissions) < 0.01; // Allow 1 cent tolerance

    checks.push({
      name: `Creator "${creator.companyName}" - Total Revenue Match`,
      passed,
      expected: sumOfCommissions,
      actual: creatorRevenue?.totalRevenue || 0,
      difference: (creatorRevenue?.totalRevenue || 0) - sumOfCommissions,
    });

    if (!passed) allPassed = false;

    logConsistencyCheck(`Creator "${creator.companyName}" - Total Revenue`, {
      creatorTotal: creatorRevenue?.totalRevenue || 0,
      commissionSum: sumOfCommissions,
      match: passed,
      difference: (creatorRevenue?.totalRevenue || 0) - sumOfCommissions,
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CHECK 3: Member Lifetime Earnings = Sum of Their Commission Shares
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const members = await prisma.member.findMany({
    where: { lifetimeEarnings: { gt: 0 } }, // Only check members with earnings
    select: { id: true, username: true, lifetimeEarnings: true },
  });

  for (const member of members) {
    const commissionSum = await prisma.commission.aggregate({
      where: { memberId: member.id, status: 'paid' },
      _sum: { memberShare: true },
    });

    const sumOfCommissions = commissionSum._sum.memberShare || 0;
    const passed = Math.abs(member.lifetimeEarnings - sumOfCommissions) < 0.01;

    checks.push({
      name: `Member "${member.username}" - Lifetime Earnings Match`,
      passed,
      expected: sumOfCommissions,
      actual: member.lifetimeEarnings,
      difference: member.lifetimeEarnings - sumOfCommissions,
    });

    if (!passed) allPassed = false;

    logConsistencyCheck(`Member "${member.username}" - Lifetime Earnings`, {
      memberTotal: member.lifetimeEarnings,
      commissionSum: sumOfCommissions,
      match: passed,
      difference: member.lifetimeEarnings - sumOfCommissions,
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CHECK 4: Commission Splits Add to 100%
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const commissions = await prisma.commission.findMany({
    select: {
      id: true,
      saleAmount: true,
      memberShare: true,
      creatorShare: true,
      platformShare: true,
    },
  });

  for (const commission of commissions) {
    const total =
      commission.memberShare + commission.creatorShare + commission.platformShare;
    const passed = Math.abs(total - commission.saleAmount) < 0.01;

    checks.push({
      name: `Commission ${commission.id.substring(0, 8)} - Split Adds to 100%`,
      passed,
      expected: commission.saleAmount,
      actual: total,
      difference: total - commission.saleAmount,
    });

    if (!passed) allPassed = false;

    // Only log failed commission splits to avoid spam
    if (!passed) {
      logConsistencyCheck(`Commission ${commission.id.substring(0, 8)} - Split`, {
        saleAmount: commission.saleAmount,
        memberShare: commission.memberShare,
        creatorShare: commission.creatorShare,
        platformShare: commission.platformShare,
        total,
        match: passed,
        difference: total - commission.saleAmount,
      });
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CHECK 5: Referred Member Count = Converted Attribution Clicks
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  for (const creator of creators) {
    const referredMemberCount = await prisma.member.count({
      where: { creatorId: creator.id, memberOrigin: 'referred' },
    });

    const convertedClickCount = await prisma.attributionClick.count({
      where: { member: { creatorId: creator.id }, converted: true },
    });

    const passed = referredMemberCount === convertedClickCount;

    checks.push({
      name: `Creator "${creator.companyName}" - Conversion Count Match`,
      passed,
      expected: referredMemberCount,
      actual: convertedClickCount,
      difference: referredMemberCount - convertedClickCount,
    });

    if (!passed) allPassed = false;

    logConsistencyCheck(`Creator "${creator.companyName}" - Conversions`, {
      referredMembers: referredMemberCount,
      convertedClicks: convertedClickCount,
      match: passed,
      difference: referredMemberCount - convertedClickCount,
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SUMMARY
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 CONSISTENCY VERIFICATION SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const passedCount = checks.filter((c) => c.passed).length;
  const failedCount = checks.filter((c) => !c.passed).length;

  console.log(`Total Checks: ${checks.length}`);
  console.log(`✅ Passed: ${passedCount}`);
  console.log(`❌ Failed: ${failedCount}\n`);

  if (failedCount > 0) {
    console.log('Failed Checks:');
    checks
      .filter((c) => !c.passed)
      .forEach((c) => {
        console.log(`  ❌ ${c.name}`);
        console.log(`     Expected: ${c.expected}, Actual: ${c.actual}, Diff: ${c.difference}`);
      });
  }

  console.log('\n═══════════════════════════════════════════════════════════════');

  if (allPassed) {
    console.log('✅ ALL CONSISTENCY CHECKS PASSED!\n');
    process.exit(0);
  } else {
    console.log('❌ SOME CONSISTENCY CHECKS FAILED!\n');
    process.exit(1);
  }
}

// Run verification
verifyConsistency()
  .catch((error) => {
    console.error('❌ Error running consistency verification:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
