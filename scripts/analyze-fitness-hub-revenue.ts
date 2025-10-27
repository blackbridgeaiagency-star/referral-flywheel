import { prisma } from '@/lib/db/prisma';
import { startOfMonth } from 'date-fns';

/**
 * Complete Revenue Breakdown for Fitness Hub
 *
 * This script provides a comprehensive analysis of ALL revenue sources
 */

async function analyzeFitnessHubRevenue() {
  console.log('💰 FITNESS HUB - COMPLETE REVENUE BREAKDOWN\n');
  console.log('═'.repeat(80));

  const octoberStart = new Date('2025-10-01T00:00:00Z');
  const now = new Date();

  // Get first creator (any creator)
  const creator = await prisma.creator.findFirst();

  if (!creator) {
    console.log('❌ No creators found in database');
    await prisma.$disconnect();
    return;
  }

  console.log(`\n📌 Creator: ${creator.companyName}`);
  console.log(`   ID: ${creator.id}`);
  console.log(`   Company ID: ${creator.companyId}`);
  console.log('\n' + '═'.repeat(80));

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. GET ALL COMMISSIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const [allCommissions, octoberCommissions] = await Promise.all([
    prisma.commission.findMany({
      where: {
        creatorId: creator.id,
        status: 'paid',
      },
      select: {
        id: true,
        saleAmount: true,
        memberShare: true,
        creatorShare: true,
        platformShare: true,
        paymentType: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.commission.findMany({
      where: {
        creatorId: creator.id,
        status: 'paid',
        createdAt: { gte: octoberStart },
      },
      select: {
        id: true,
        saleAmount: true,
        memberShare: true,
        creatorShare: true,
        platformShare: true,
        paymentType: true,
        createdAt: true,
      },
    }),
  ]);

  console.log('\n📊 COMMISSION RECORDS:');
  console.log('─'.repeat(80));
  console.log(`Total Commissions (all-time): ${allCommissions.length}`);
  console.log(`October Commissions: ${octoberCommissions.length}`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. BREAKDOWN BY PAYMENT TYPE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n💳 PAYMENT TYPE BREAKDOWN:');
  console.log('─'.repeat(80));

  const allInitial = allCommissions.filter(c => c.paymentType === 'initial');
  const allRecurring = allCommissions.filter(c => c.paymentType === 'recurring');
  const octInitial = octoberCommissions.filter(c => c.paymentType === 'initial');
  const octRecurring = octoberCommissions.filter(c => c.paymentType === 'recurring');

  console.log('\nAll-Time:');
  console.log(`  Initial Payments:   ${allInitial.length.toString().padStart(4)} × $49.99 = $${(allInitial.length * 49.99).toFixed(2)}`);
  console.log(`  Recurring Payments: ${allRecurring.length.toString().padStart(4)} × $49.99 = $${(allRecurring.length * 49.99).toFixed(2)}`);
  console.log(`  TOTAL:              ${allCommissions.length.toString().padStart(4)} payments`);

  console.log('\nOctober 2025:');
  console.log(`  Initial Payments:   ${octInitial.length.toString().padStart(4)} × $49.99 = $${(octInitial.length * 49.99).toFixed(2)}`);
  console.log(`  Recurring Payments: ${octRecurring.length.toString().padStart(4)} × $49.99 = $${(octRecurring.length * 49.99).toFixed(2)}`);
  console.log(`  TOTAL:              ${octoberCommissions.length.toString().padStart(4)} payments`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. REVENUE CALCULATIONS (EXACT FROM DATABASE)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n💵 REVENUE BREAKDOWN:');
  console.log('═'.repeat(80));

  // Total Revenue (all-time)
  const totalRevenue = allCommissions.reduce((sum, c) => sum + c.saleAmount, 0);
  const totalMemberShare = allCommissions.reduce((sum, c) => sum + c.memberShare, 0);
  const totalCreatorShare = allCommissions.reduce((sum, c) => sum + c.creatorShare, 0);
  const totalPlatformShare = allCommissions.reduce((sum, c) => sum + c.platformShare, 0);

  console.log('\n📈 ALL-TIME REVENUE:');
  console.log('─'.repeat(80));
  console.log(`Total Gross Revenue:       $${totalRevenue.toFixed(2)}`);
  console.log(`├─ Member Share (10%):     $${totalMemberShare.toFixed(2)}`);
  console.log(`├─ Creator Share (70%):    $${totalCreatorShare.toFixed(2)}`);
  console.log(`└─ Platform Share (20%):   $${totalPlatformShare.toFixed(2)}`);
  console.log('\nVerification:');
  console.log(`  $${totalMemberShare.toFixed(2)} + $${totalCreatorShare.toFixed(2)} + $${totalPlatformShare.toFixed(2)} = $${(totalMemberShare + totalCreatorShare + totalPlatformShare).toFixed(2)}`);
  console.log(`  Matches Total: ${Math.abs(totalRevenue - (totalMemberShare + totalCreatorShare + totalPlatformShare)) < 0.01 ? '✅' : '❌'}`);

  // October Revenue
  const octRevenue = octoberCommissions.reduce((sum, c) => sum + c.saleAmount, 0);
  const octMemberShare = octoberCommissions.reduce((sum, c) => sum + c.memberShare, 0);
  const octCreatorShare = octoberCommissions.reduce((sum, c) => sum + c.creatorShare, 0);
  const octPlatformShare = octoberCommissions.reduce((sum, c) => sum + c.platformShare, 0);

  console.log('\n📅 OCTOBER 2025 REVENUE:');
  console.log('─'.repeat(80));
  console.log(`Total Gross Revenue:       $${octRevenue.toFixed(2)}`);
  console.log(`├─ Member Share (10%):     $${octMemberShare.toFixed(2)}`);
  console.log(`├─ Creator Share (70%):    $${octCreatorShare.toFixed(2)}`);
  console.log(`└─ Platform Share (20%):   $${octPlatformShare.toFixed(2)}`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. MEMBER ANALYSIS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const allMembers = await prisma.member.findMany({
    where: { creatorId: creator.id },
    select: {
      id: true,
      username: true,
      memberOrigin: true,
      subscriptionPrice: true,
      totalReferred: true,
      monthlyReferred: true,
      createdAt: true,
    },
  });

  const referredMembers = allMembers.filter(m => m.memberOrigin === 'referred');
  const organicMembers = allMembers.filter(m => m.memberOrigin === 'organic');
  const octoberMembers = allMembers.filter(m => m.createdAt >= octoberStart);
  const octoberReferred = octoberMembers.filter(m => m.memberOrigin === 'referred');

  console.log('\n👥 MEMBER ANALYSIS:');
  console.log('═'.repeat(80));
  console.log(`\nTotal Members: ${allMembers.length}`);
  console.log(`├─ Referred Members:  ${referredMembers.length} (${((referredMembers.length / allMembers.length) * 100).toFixed(1)}%)`);
  console.log(`└─ Organic Members:   ${organicMembers.length} (${((organicMembers.length / allMembers.length) * 100).toFixed(1)}%)`);

  console.log(`\nOctober New Members: ${octoberMembers.length}`);
  console.log(`└─ October Referred:  ${octoberReferred.length}`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 5. MONTHLY RECURRING REVENUE (MRR)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const totalMRR = allMembers.reduce((sum, m) => sum + (m.subscriptionPrice || 0), 0);
  const referredMRR = referredMembers.reduce((sum, m) => sum + (m.subscriptionPrice || 0), 0);
  const organicMRR = organicMembers.reduce((sum, m) => sum + (m.subscriptionPrice || 0), 0);

  console.log('\n💰 MONTHLY RECURRING REVENUE (MRR - Projected):');
  console.log('─'.repeat(80));
  console.log(`Total MRR:              $${totalMRR.toFixed(2)}`);
  console.log(`├─ From Referred:       $${referredMRR.toFixed(2)} (${((referredMRR / totalMRR) * 100).toFixed(1)}%)`);
  console.log(`└─ From Organic:        $${organicMRR.toFixed(2)} (${((organicMRR / totalMRR) * 100).toFixed(1)}%)`);
  console.log(`\nNote: MRR is PROJECTED revenue if all ${allMembers.length} members continue paying`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 6. TOP REVENUE CONTRIBUTORS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const memberEarnings = await prisma.commission.groupBy({
    by: ['memberId'],
    where: {
      creatorId: creator.id,
      status: 'paid',
    },
    _sum: {
      saleAmount: true,
      memberShare: true,
    },
    _count: {
      id: true,
    },
  });

  const topEarners = memberEarnings
    .sort((a, b) => (b._sum.saleAmount || 0) - (a._sum.saleAmount || 0))
    .slice(0, 10);

  console.log('\n🏆 TOP 10 REVENUE CONTRIBUTORS:');
  console.log('─'.repeat(80));
  console.log('Rank | Member                | Revenue Generated | Commissions | Member Earned');
  console.log('─'.repeat(80));

  let rank = 1;
  for (const earner of topEarners) {
    const member = allMembers.find(m => m.id === earner.memberId);
    if (member) {
      console.log(
        `${rank.toString().padStart(4)} | ${member.username.padEnd(20)} | ` +
        `$${(earner._sum.saleAmount || 0).toFixed(2).padStart(12)} | ` +
        `${earner._count.id.toString().padStart(11)} | ` +
        `$${(earner._sum.memberShare || 0).toFixed(2)}`
      );
      rank++;
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 7. REFERRAL PERFORMANCE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const topReferrers = allMembers
    .filter(m => m.totalReferred > 0)
    .sort((a, b) => b.monthlyReferred - a.monthlyReferred)
    .slice(0, 10);

  console.log('\n🌟 TOP 10 REFERRERS (October):');
  console.log('─'.repeat(80));
  console.log('Rank | Member                | Total Refs | October Refs');
  console.log('─'.repeat(80));

  rank = 1;
  for (const referrer of topReferrers) {
    console.log(
      `${rank.toString().padStart(4)} | ${referrer.username.padEnd(20)} | ` +
      `${referrer.totalReferred.toString().padStart(10)} | ` +
      `${referrer.monthlyReferred.toString().padStart(12)}`
    );
    rank++;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 8. SUMMARY
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n' + '═'.repeat(80));
  console.log('📋 EXECUTIVE SUMMARY');
  console.log('═'.repeat(80));
  console.log(`\nFitness Hub Revenue Overview:`);
  console.log(`├─ Total Members:          ${allMembers.length}`);
  console.log(`├─ Total Commissions:      ${allCommissions.length}`);
  console.log(`├─ All-Time Revenue:       $${totalRevenue.toFixed(2)}`);
  console.log(`├─ Creator's Take (70%):   $${totalCreatorShare.toFixed(2)}`);
  console.log(`├─ October Revenue:        $${octRevenue.toFixed(2)}`);
  console.log(`├─ October New Referrals:  ${octoberReferred.length}`);
  console.log(`├─ Projected MRR:          $${totalMRR.toFixed(2)}`);
  console.log(`└─ Referral Contribution:  $${referredMRR.toFixed(2)} (${((referredMRR / totalMRR) * 100).toFixed(1)}%)`);

  console.log('\n' + '═'.repeat(80));
  console.log('✅ REVENUE BREAKDOWN COMPLETE');
  console.log('═'.repeat(80) + '\n');

  await prisma.$disconnect();
}

analyzeFitnessHubRevenue().catch(console.error);
