// Script to verify all math calculations are accurate
import { PrismaClient } from '@prisma/client';
import { calculateCommission } from './lib/utils/commission';
import logger from './lib/logger';


const prisma = new PrismaClient();

async function verifyMath() {
  logger.info(' Verifying all math calculations...\n');

  let errors = 0;
  let warnings = 0;

  // 1. Verify commission splits (10/70/20)
  logger.debug('1️⃣ Verifying commission splits (10% member, 70% creator, 20% platform)...');
  const commissions = await prisma.commission.findMany({
    include: { member: true }
  });

  for (const commission of commissions) {
    const expected = calculateCommission(commission.saleAmount);

    // Check member share (10%)
    const expectedMemberShare = Math.round(commission.saleAmount * 0.1 * 100) / 100;
    if (Math.abs(commission.memberShare - expectedMemberShare) > 0.01) {
      logger.error(`❌ Member share incorrect for commission ${commission.id}`);
      logger.error(`   Expected: ${expectedMemberShare}, Got: ${commission.memberShare}`);
      errors++;
    }

    // Check creator share (70%)
    const expectedCreatorShare = Math.round(commission.saleAmount * 0.7 * 100) / 100;
    if (Math.abs(commission.creatorShare - expectedCreatorShare) > 0.01) {
      logger.error(`❌ Creator share incorrect for commission ${commission.id}`);
      logger.error(`   Expected: ${expectedCreatorShare}, Got: ${commission.creatorShare}`);
      errors++;
    }

    // Check platform share (20%)
    const expectedPlatformShare = Math.round(commission.saleAmount * 0.2 * 100) / 100;
    if (Math.abs(commission.platformShare - expectedPlatformShare) > 0.01) {
      logger.error(`❌ Platform share incorrect for commission ${commission.id}`);
      logger.error(`   Expected: ${expectedPlatformShare}, Got: ${commission.platformShare}`);
      errors++;
    }

    // Verify total equals sale amount
    const total = commission.memberShare + commission.creatorShare + commission.platformShare;
    if (Math.abs(total - commission.saleAmount) > 0.01) {
      logger.error(`❌ Total shares don't equal sale amount for commission ${commission.id}`);
      logger.error(`   Sale: ${commission.saleAmount}, Total: ${total}`);
      errors++;
    }
  }

  if (errors === 0) {
    logger.info('All commission splits are correct!\n');
  } else {
    logger.error('Found ${errors} commission split errors\n');
  }

  // 2. Verify member earnings calculations
  logger.debug('2️⃣ Verifying member earnings calculations...');
  const members = await prisma.member.findMany();

  for (const member of members) {
    // Calculate actual earnings from commissions
    const memberCommissions = await prisma.commission.findMany({
      where: { memberId: member.id }
    });

    const actualLifetimeEarnings = memberCommissions.reduce((sum, c) => sum + c.memberShare, 0);
    const roundedActual = Math.round(actualLifetimeEarnings * 100) / 100;

    // Calculate monthly earnings (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const monthlyCommissions = memberCommissions.filter(c =>
      c.createdAt >= thirtyDaysAgo
    );
    const actualMonthlyEarnings = monthlyCommissions.reduce((sum, c) => sum + c.memberShare, 0);
    const roundedMonthly = Math.round(actualMonthlyEarnings * 100) / 100;

    // Check if stored values match calculated values (allow small rounding difference)
    if (Math.abs(member.lifetimeEarnings - roundedActual) > 0.1) {
      logger.warn(`⚠️ Member ${member.username} lifetime earnings mismatch`);
      logger.warn(`   Stored: ${member.lifetimeEarnings}, Calculated: ${roundedActual}`);
      warnings++;
    }

    if (Math.abs(member.monthlyEarnings - roundedMonthly) > 0.1) {
      logger.warn(`⚠️ Member ${member.username} monthly earnings mismatch`);
      logger.warn(`   Stored: ${member.monthlyEarnings}, Calculated: ${roundedMonthly}`);
      warnings++;
    }
  }

  if (warnings === 0) {
    logger.info('All member earnings calculations are accurate!\n');
  } else {
    logger.warn(' Found ${warnings} earnings calculation warnings\n');
  }

  // 3. Verify creator revenue calculations
  logger.debug('3️⃣ Verifying creator revenue calculations...');
  const creators = await prisma.creator.findMany();

  for (const creator of creators) {
    const creatorCommissions = await prisma.commission.findMany({
      where: { creatorId: creator.id }
    });

    const actualTotalRevenue = creatorCommissions.reduce((sum, c) => sum + c.saleAmount, 0);
    const roundedRevenue = Math.round(actualTotalRevenue * 100) / 100;

    const monthlyCommissions = creatorCommissions.filter(c =>
      c.createdAt >= thirtyDaysAgo
    );
    const actualMonthlyRevenue = monthlyCommissions.reduce((sum, c) => sum + c.saleAmount, 0);
    const roundedMonthlyRevenue = Math.round(actualMonthlyRevenue * 100) / 100;

    if (Math.abs(creator.totalRevenue - roundedRevenue) > 0.1) {
      logger.warn(`⚠️ Creator ${creator.companyName} total revenue mismatch`);
      logger.warn(`   Stored: ${creator.totalRevenue}, Calculated: ${roundedRevenue}`);
      warnings++;
    }

    if (Math.abs(creator.monthlyRevenue - roundedMonthlyRevenue) > 0.1) {
      logger.warn(`⚠️ Creator ${creator.companyName} monthly revenue mismatch`);
      logger.warn(`   Stored: ${creator.monthlyRevenue}, Calculated: ${roundedMonthlyRevenue}`);
      warnings++;
    }
  }

  // 4. Verify referral counts
  logger.debug('4️⃣ Verifying referral counts...');
  for (const member of members) {
    const referredMembers = await prisma.member.count({
      where: { referredBy: member.referralCode }
    });

    if (member.totalReferred !== referredMembers) {
      logger.warn(`⚠️ Member ${member.username} referral count mismatch`);
      logger.warn(`   Stored: ${member.totalReferred}, Actual: ${referredMembers}`);
      warnings++;
    }
  }

  // 5. Verify rankings
  logger.debug('5️⃣ Verifying leaderboard rankings...');

  // Check global earnings rank
  const sortedByEarnings = [...members].sort((a, b) => b.lifetimeEarnings - a.lifetimeEarnings);
  for (let i = 0; i < sortedByEarnings.length; i++) {
    const expectedRank = i + 1;
    if (sortedByEarnings[i].globalEarningsRank !== expectedRank) {
      logger.warn(`⚠️ Member ${sortedByEarnings[i].username} global earnings rank incorrect`);
      logger.warn(`   Expected: ${expectedRank}, Got: ${sortedByEarnings[i].globalEarningsRank}`);
      warnings++;
    }
  }

  // Check global referrals rank
  const sortedByReferrals = [...members].sort((a, b) => b.totalReferred - a.totalReferred);
  for (let i = 0; i < sortedByReferrals.length; i++) {
    const expectedRank = i + 1;
    if (sortedByReferrals[i].globalReferralsRank !== expectedRank) {
      logger.warn(`⚠️ Member ${sortedByReferrals[i].username} global referrals rank incorrect`);
      logger.warn(`   Expected: ${expectedRank}, Got: ${sortedByReferrals[i].globalReferralsRank}`);
      warnings++;
    }
  }

  // Summary
  logger.debug('\n📊 VERIFICATION SUMMARY:');
  logger.debug('================================');
  logger.info('Commissions verified: ${commissions.length}');
  logger.info('Members verified: ${members.length}');
  logger.info('Creators verified: ${creators.length}');

  if (errors === 0 && warnings === 0) {
    logger.debug('\n🎉 All math calculations are accurate!');
  } else {
    logger.debug(`\n⚠️ Found ${errors} errors and ${warnings} warnings`);
    logger.debug('Note: Small discrepancies may be due to data updates after initial seeding');
  }
}

verifyMath()
  .catch((error) => {
    logger.error('❌ Verification error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });