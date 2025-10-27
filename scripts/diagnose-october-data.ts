import { prisma } from '@/lib/db/prisma';
import { startOfMonth } from 'date-fns';

async function diagnose() {
  const octoberStart = new Date('2025-10-01T00:00:00Z');
  const now = new Date();

  console.log('🔍 DIAGNOSING OCTOBER 2025 DATA\n');
  console.log(`Current date: ${now.toISOString()}`);
  console.log(`October start: ${octoberStart.toISOString()}\n`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CRITICAL CHECK 1: How many NEW referrals in October?
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const newReferralsInOctober = await prisma.member.count({
    where: {
      memberOrigin: 'referred',
      createdAt: { gte: octoberStart, lte: now },
    },
  });

  console.log(`📊 New Referrals in October: ${newReferralsInOctober}`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CRITICAL CHECK 2: October commissions breakdown
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const octoberCommissions = await prisma.commission.groupBy({
    by: ['paymentType'],
    where: {
      createdAt: { gte: octoberStart, lte: now },
    },
    _count: true,
    _sum: { saleAmount: true },
  });

  console.log('\n💰 October Commissions:');
  if (octoberCommissions.length === 0) {
    console.log('  (No commissions in October)');
  } else {
    octoberCommissions.forEach(c => {
      console.log(`  - ${c.paymentType}: ${c._count} payments, $${c._sum.saleAmount?.toFixed(2) || 0}`);
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CRITICAL CHECK 3: Top 10 members - field vs reality
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const topMembers = await prisma.member.findMany({
    orderBy: { totalReferred: 'desc' },
    take: 10,
    select: {
      id: true,
      username: true,
      referralCode: true,
      totalReferred: true,
      monthlyReferred: true, // What the field says
      monthlyEarnings: true,
      lifetimeEarnings: true,
    },
  });

  console.log('\n👥 Top 10 Members:');
  console.log('Username         | Total | Monthly Field | Actual Oct Refs | Monthly Earnings | Status');
  console.log('─'.repeat(90));

  const mismatches: string[] = [];

  for (const member of topMembers) {
    // Calculate ACTUAL October referrals for this member
    const actualOctoberReferrals = await prisma.member.count({
      where: {
        referredBy: member.referralCode,
        createdAt: { gte: octoberStart, lte: now },
      },
    });

    // Calculate ACTUAL October earnings
    const actualOctoberEarnings = await prisma.commission.aggregate({
      where: {
        memberId: member.id,
        createdAt: { gte: octoberStart, lte: now },
      },
      _sum: { memberShare: true },
    });

    const actualEarnings = actualOctoberEarnings._sum.memberShare || 0;

    const referralsMatch = member.monthlyReferred === actualOctoberReferrals;
    const earningsMatch = Math.abs(member.monthlyEarnings - actualEarnings) < 0.01;
    const match = referralsMatch && earningsMatch ? '✅' : '❌';

    if (!referralsMatch || !earningsMatch) {
      mismatches.push(member.username);
    }

    console.log(
      `${member.username.padEnd(16)} | ${member.totalReferred.toString().padEnd(5)} | ` +
      `${member.monthlyReferred.toString().padEnd(13)} | ` +
      `${actualOctoberReferrals.toString().padEnd(15)} | ` +
      `$${member.monthlyEarnings.toFixed(2).padEnd(15)} | ${match}`
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CRITICAL CHECK 4: Logical consistency
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n🔍 LOGICAL VALIDATION:');

  // Check: sum of all monthlyReferred should equal newReferralsInOctober
  const sumMonthlyReferred = await prisma.member.aggregate({
    _sum: { monthlyReferred: true },
  });

  const sumMatches = sumMonthlyReferred._sum.monthlyReferred === newReferralsInOctober;
  console.log(`  Sum of monthlyReferred (${sumMonthlyReferred._sum.monthlyReferred}) = ` +
    `New referrals (${newReferralsInOctober})? ${sumMatches ? '✅' : '❌ MISMATCH!'}`);

  // Check: No member has monthlyReferred > totalReferred
  const invalidMonthly = await prisma.member.findMany({
    where: {
      monthlyReferred: { gt: prisma.member.fields.totalReferred },
    },
    select: { username: true, monthlyReferred: true, totalReferred: true },
  });

  console.log(`  Members with monthly > total: ${invalidMonthly.length} ${invalidMonthly.length === 0 ? '✅' : '❌'}`);
  if (invalidMonthly.length > 0) {
    invalidMonthly.forEach(m => {
      console.log(`    - ${m.username}: monthly=${m.monthlyReferred}, total=${m.totalReferred}`);
    });
  }

  // Check: No negative values
  const negativeMonthly = await prisma.member.count({
    where: { monthlyReferred: { lt: 0 } },
  });
  const negativeEarnings = await prisma.member.count({
    where: { monthlyEarnings: { lt: 0 } },
  });

  console.log(`  Members with negative monthlyReferred: ${negativeMonthly} ${negativeMonthly === 0 ? '✅' : '❌'}`);
  console.log(`  Members with negative monthlyEarnings: ${negativeEarnings} ${negativeEarnings === 0 ? '✅' : '❌'}`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // VERDICT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n═══════════════════════════════════════');
  console.log('📋 DIAGNOSIS SUMMARY:');
  console.log('═══════════════════════════════════════');

  if (newReferralsInOctober === 0) {
    console.log('✅ FINDING: Zero new referrals in October');
    console.log('✅ "This Month" = 0 is CORRECT');
    console.log('✅ October earnings are from RECURRING payments only');
    console.log('\n⚠️  ACTION NEEDED: Create test data to verify tracking works');
  } else {
    console.log(`⚠️  FINDING: ${newReferralsInOctober} new referrals in October`);
    if (sumMatches) {
      console.log('✅ monthlyReferred fields are accurate');
    } else {
      console.log('❌ CRITICAL: monthlyReferred out of sync!');
      console.log('   → Need to recalculate from database');
    }
  }

  if (mismatches.length > 0) {
    console.log(`\n❌ ${mismatches.length} members have mismatched data: ${mismatches.join(', ')}`);
    console.log('   → Run recalculation script to fix');
  } else {
    console.log('\n✅ All top 10 members have accurate data');
  }

  const hasErrors = !sumMatches || invalidMonthly.length > 0 || negativeMonthly > 0 || negativeEarnings > 0;

  console.log('\n═══════════════════════════════════════');
  console.log(hasErrors ? '❌ ERRORS DETECTED - NEEDS ATTENTION' : '✅ ALL CHECKS PASSED');
  console.log('═══════════════════════════════════════\n');

  await prisma.$disconnect();
}

diagnose().catch(console.error);
