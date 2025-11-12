import { prisma } from '@/lib/db/prisma';
import { startOfMonth } from 'date-fns';
import logger from '../lib/logger';


/**
 * Complete Revenue Breakdown for Fitness Hub
 *
 * This script provides a comprehensive analysis of ALL revenue sources
 */

async function analyzeFitnessHubRevenue() {
  logger.info(' FITNESS HUB - COMPLETE REVENUE BREAKDOWN\n');
  logger.debug('═'.repeat(80));

  const octoberStart = new Date('2025-10-01T00:00:00Z');
  const now = new Date();

  // Get first creator (any creator)
  const creator = await prisma.creator.findFirst();

  if (!creator) {
    logger.error('No creators found in database');
    await prisma.$disconnect();
    return;
  }

  logger.debug(`\n📌 Creator: ${creator.companyName}`);
  logger.debug(`   ID: ${creator.id}`);
  logger.debug(`   Company ID: ${creator.companyId}`);
  logger.debug('\n' + '═'.repeat(80));

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

  logger.debug('\n📊 COMMISSION RECORDS:');
  logger.debug('─'.repeat(80));
  logger.debug(`Total Commissions (all-time): ${allCommissions.length}`);
  logger.debug(`October Commissions: ${octoberCommissions.length}`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. BREAKDOWN BY PAYMENT TYPE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  logger.debug('\n💳 PAYMENT TYPE BREAKDOWN:');
  logger.debug('─'.repeat(80));

  const allInitial = allCommissions.filter(c => c.paymentType === 'initial');
  const allRecurring = allCommissions.filter(c => c.paymentType === 'recurring');
  const octInitial = octoberCommissions.filter(c => c.paymentType === 'initial');
  const octRecurring = octoberCommissions.filter(c => c.paymentType === 'recurring');

  logger.debug('\nAll-Time:');
  logger.debug(`  Initial Payments:   ${allInitial.length.toString().padStart(4)} × $49.99 = $${(allInitial.length * 49.99).toFixed(2)}`);
  logger.debug(`  Recurring Payments: ${allRecurring.length.toString().padStart(4)} × $49.99 = $${(allRecurring.length * 49.99).toFixed(2)}`);
  logger.debug(`  TOTAL:              ${allCommissions.length.toString().padStart(4)} payments`);

  logger.debug('\nOctober 2025:');
  logger.debug(`  Initial Payments:   ${octInitial.length.toString().padStart(4)} × $49.99 = $${(octInitial.length * 49.99).toFixed(2)}`);
  logger.debug(`  Recurring Payments: ${octRecurring.length.toString().padStart(4)} × $49.99 = $${(octRecurring.length * 49.99).toFixed(2)}`);
  logger.debug(`  TOTAL:              ${octoberCommissions.length.toString().padStart(4)} payments`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. REVENUE CALCULATIONS (EXACT FROM DATABASE)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  logger.debug('\n💵 REVENUE BREAKDOWN:');
  logger.debug('═'.repeat(80));

  // Total Revenue (all-time)
  const totalRevenue = allCommissions.reduce((sum, c) => sum + c.saleAmount, 0);
  const totalMemberShare = allCommissions.reduce((sum, c) => sum + c.memberShare, 0);
  const totalCreatorShare = allCommissions.reduce((sum, c) => sum + c.creatorShare, 0);
  const totalPlatformShare = allCommissions.reduce((sum, c) => sum + c.platformShare, 0);

  logger.debug('\n📈 ALL-TIME REVENUE:');
  logger.debug('─'.repeat(80));
  logger.debug(`Total Gross Revenue:       $${totalRevenue.toFixed(2)}`);
  logger.debug(`├─ Member Share (10%):     $${totalMemberShare.toFixed(2)}`);
  logger.debug(`├─ Creator Share (70%):    $${totalCreatorShare.toFixed(2)}`);
  logger.debug(`└─ Platform Share (20%):   $${totalPlatformShare.toFixed(2)}`);
  logger.debug('\nVerification:');
  logger.debug(`  $${totalMemberShare.toFixed(2)} + $${totalCreatorShare.toFixed(2)} + $${totalPlatformShare.toFixed(2)} = $${(totalMemberShare + totalCreatorShare + totalPlatformShare).toFixed(2)}`);
  logger.debug(`  Matches Total: ${Math.abs(totalRevenue - (totalMemberShare + totalCreatorShare + totalPlatformShare)) < 0.01 ? '✅' : '❌'}`);

  // October Revenue
  const octRevenue = octoberCommissions.reduce((sum, c) => sum + c.saleAmount, 0);
  const octMemberShare = octoberCommissions.reduce((sum, c) => sum + c.memberShare, 0);
  const octCreatorShare = octoberCommissions.reduce((sum, c) => sum + c.creatorShare, 0);
  const octPlatformShare = octoberCommissions.reduce((sum, c) => sum + c.platformShare, 0);

  logger.debug('\n📅 OCTOBER 2025 REVENUE:');
  logger.debug('─'.repeat(80));
  logger.debug(`Total Gross Revenue:       $${octRevenue.toFixed(2)}`);
  logger.debug(`├─ Member Share (10%):     $${octMemberShare.toFixed(2)}`);
  logger.debug(`├─ Creator Share (70%):    $${octCreatorShare.toFixed(2)}`);
  logger.debug(`└─ Platform Share (20%):   $${octPlatformShare.toFixed(2)}`);

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

  logger.debug('\n👥 MEMBER ANALYSIS:');
  logger.debug('═'.repeat(80));
  logger.debug(`\nTotal Members: ${allMembers.length}`);
  logger.debug(`├─ Referred Members:  ${referredMembers.length} (${((referredMembers.length / allMembers.length) * 100).toFixed(1)}%)`);
  logger.debug(`└─ Organic Members:   ${organicMembers.length} (${((organicMembers.length / allMembers.length) * 100).toFixed(1)}%)`);

  logger.debug(`\nOctober New Members: ${octoberMembers.length}`);
  logger.debug(`└─ October Referred:  ${octoberReferred.length}`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 5. MONTHLY RECURRING REVENUE (MRR)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const totalMRR = allMembers.reduce((sum, m) => sum + (m.subscriptionPrice || 0), 0);
  const referredMRR = referredMembers.reduce((sum, m) => sum + (m.subscriptionPrice || 0), 0);
  const organicMRR = organicMembers.reduce((sum, m) => sum + (m.subscriptionPrice || 0), 0);

  logger.debug('\n💰 MONTHLY RECURRING REVENUE (MRR - Projected):');
  logger.debug('─'.repeat(80));
  logger.debug(`Total MRR:              $${totalMRR.toFixed(2)}`);
  logger.debug(`├─ From Referred:       $${referredMRR.toFixed(2)} (${((referredMRR / totalMRR) * 100).toFixed(1)}%)`);
  logger.debug(`└─ From Organic:        $${organicMRR.toFixed(2)} (${((organicMRR / totalMRR) * 100).toFixed(1)}%)`);
  logger.debug(`\nNote: MRR is PROJECTED revenue if all ${allMembers.length} members continue paying`);

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

  logger.debug('\n🏆 TOP 10 REVENUE CONTRIBUTORS:');
  logger.debug('─'.repeat(80));
  logger.debug('Rank | Member                | Revenue Generated | Commissions | Member Earned');
  logger.debug('─'.repeat(80));

  let rank = 1;
  for (const earner of topEarners) {
    const member = allMembers.find(m => m.id === earner.memberId);
    if (member) {
      logger.debug(
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

  logger.debug('\n🌟 TOP 10 REFERRERS (October):');
  logger.debug('─'.repeat(80));
  logger.debug('Rank | Member                | Total Refs | October Refs');
  logger.debug('─'.repeat(80));

  rank = 1;
  for (const referrer of topReferrers) {
    logger.debug(
      `${rank.toString().padStart(4)} | ${referrer.username.padEnd(20)} | ` +
      `${referrer.totalReferred.toString().padStart(10)} | ` +
      `${referrer.monthlyReferred.toString().padStart(12)}`
    );
    rank++;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 8. SUMMARY
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  logger.debug('\n' + '═'.repeat(80));
  logger.info(' EXECUTIVE SUMMARY');
  logger.debug('═'.repeat(80));
  logger.debug(`\nFitness Hub Revenue Overview:`);
  logger.debug(`├─ Total Members:          ${allMembers.length}`);
  logger.debug(`├─ Total Commissions:      ${allCommissions.length}`);
  logger.debug(`├─ All-Time Revenue:       $${totalRevenue.toFixed(2)}`);
  logger.debug(`├─ Creator's Take (70%):   $${totalCreatorShare.toFixed(2)}`);
  logger.debug(`├─ October Revenue:        $${octRevenue.toFixed(2)}`);
  logger.debug(`├─ October New Referrals:  ${octoberReferred.length}`);
  logger.debug(`├─ Projected MRR:          $${totalMRR.toFixed(2)}`);
  logger.debug(`└─ Referral Contribution:  $${referredMRR.toFixed(2)} (${((referredMRR / totalMRR) * 100).toFixed(1)}%)`);

  logger.debug('\n' + '═'.repeat(80));
  logger.info('REVENUE BREAKDOWN COMPLETE');
  logger.debug('═'.repeat(80) + '\n');

  await prisma.$disconnect();
}

analyzeFitnessHubRevenue().catch(console.error);
