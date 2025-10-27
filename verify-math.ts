// Script to verify all math calculations are accurate
import { PrismaClient } from '@prisma/client';
import { calculateCommission } from './lib/utils/commission';

const prisma = new PrismaClient();

async function verifyMath() {
  console.log('🔍 Verifying all math calculations...\n');

  let errors = 0;
  let warnings = 0;

  // 1. Verify commission splits (10/70/20)
  console.log('1️⃣ Verifying commission splits (10% member, 70% creator, 20% platform)...');
  const commissions = await prisma.commission.findMany({
    include: { member: true }
  });

  for (const commission of commissions) {
    const expected = calculateCommission(commission.saleAmount);

    // Check member share (10%)
    const expectedMemberShare = Math.round(commission.saleAmount * 0.1 * 100) / 100;
    if (Math.abs(commission.memberShare - expectedMemberShare) > 0.01) {
      console.error(`❌ Member share incorrect for commission ${commission.id}`);
      console.error(`   Expected: ${expectedMemberShare}, Got: ${commission.memberShare}`);
      errors++;
    }

    // Check creator share (70%)
    const expectedCreatorShare = Math.round(commission.saleAmount * 0.7 * 100) / 100;
    if (Math.abs(commission.creatorShare - expectedCreatorShare) > 0.01) {
      console.error(`❌ Creator share incorrect for commission ${commission.id}`);
      console.error(`   Expected: ${expectedCreatorShare}, Got: ${commission.creatorShare}`);
      errors++;
    }

    // Check platform share (20%)
    const expectedPlatformShare = Math.round(commission.saleAmount * 0.2 * 100) / 100;
    if (Math.abs(commission.platformShare - expectedPlatformShare) > 0.01) {
      console.error(`❌ Platform share incorrect for commission ${commission.id}`);
      console.error(`   Expected: ${expectedPlatformShare}, Got: ${commission.platformShare}`);
      errors++;
    }

    // Verify total equals sale amount
    const total = commission.memberShare + commission.creatorShare + commission.platformShare;
    if (Math.abs(total - commission.saleAmount) > 0.01) {
      console.error(`❌ Total shares don't equal sale amount for commission ${commission.id}`);
      console.error(`   Sale: ${commission.saleAmount}, Total: ${total}`);
      errors++;
    }
  }

  if (errors === 0) {
    console.log('✅ All commission splits are correct!\n');
  } else {
    console.log(`❌ Found ${errors} commission split errors\n`);
  }

  // 2. Verify member earnings calculations
  console.log('2️⃣ Verifying member earnings calculations...');
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
      console.warn(`⚠️ Member ${member.username} lifetime earnings mismatch`);
      console.warn(`   Stored: ${member.lifetimeEarnings}, Calculated: ${roundedActual}`);
      warnings++;
    }

    if (Math.abs(member.monthlyEarnings - roundedMonthly) > 0.1) {
      console.warn(`⚠️ Member ${member.username} monthly earnings mismatch`);
      console.warn(`   Stored: ${member.monthlyEarnings}, Calculated: ${roundedMonthly}`);
      warnings++;
    }
  }

  if (warnings === 0) {
    console.log('✅ All member earnings calculations are accurate!\n');
  } else {
    console.log(`⚠️ Found ${warnings} earnings calculation warnings\n`);
  }

  // 3. Verify creator revenue calculations
  console.log('3️⃣ Verifying creator revenue calculations...');
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
      console.warn(`⚠️ Creator ${creator.companyName} total revenue mismatch`);
      console.warn(`   Stored: ${creator.totalRevenue}, Calculated: ${roundedRevenue}`);
      warnings++;
    }

    if (Math.abs(creator.monthlyRevenue - roundedMonthlyRevenue) > 0.1) {
      console.warn(`⚠️ Creator ${creator.companyName} monthly revenue mismatch`);
      console.warn(`   Stored: ${creator.monthlyRevenue}, Calculated: ${roundedMonthlyRevenue}`);
      warnings++;
    }
  }

  // 4. Verify referral counts
  console.log('4️⃣ Verifying referral counts...');
  for (const member of members) {
    const referredMembers = await prisma.member.count({
      where: { referredBy: member.referralCode }
    });

    if (member.totalReferred !== referredMembers) {
      console.warn(`⚠️ Member ${member.username} referral count mismatch`);
      console.warn(`   Stored: ${member.totalReferred}, Actual: ${referredMembers}`);
      warnings++;
    }
  }

  // 5. Verify rankings
  console.log('5️⃣ Verifying leaderboard rankings...');

  // Check global earnings rank
  const sortedByEarnings = [...members].sort((a, b) => b.lifetimeEarnings - a.lifetimeEarnings);
  for (let i = 0; i < sortedByEarnings.length; i++) {
    const expectedRank = i + 1;
    if (sortedByEarnings[i].globalEarningsRank !== expectedRank) {
      console.warn(`⚠️ Member ${sortedByEarnings[i].username} global earnings rank incorrect`);
      console.warn(`   Expected: ${expectedRank}, Got: ${sortedByEarnings[i].globalEarningsRank}`);
      warnings++;
    }
  }

  // Check global referrals rank
  const sortedByReferrals = [...members].sort((a, b) => b.totalReferred - a.totalReferred);
  for (let i = 0; i < sortedByReferrals.length; i++) {
    const expectedRank = i + 1;
    if (sortedByReferrals[i].globalReferralsRank !== expectedRank) {
      console.warn(`⚠️ Member ${sortedByReferrals[i].username} global referrals rank incorrect`);
      console.warn(`   Expected: ${expectedRank}, Got: ${sortedByReferrals[i].globalReferralsRank}`);
      warnings++;
    }
  }

  // Summary
  console.log('\n📊 VERIFICATION SUMMARY:');
  console.log('================================');
  console.log(`✅ Commissions verified: ${commissions.length}`);
  console.log(`✅ Members verified: ${members.length}`);
  console.log(`✅ Creators verified: ${creators.length}`);

  if (errors === 0 && warnings === 0) {
    console.log('\n🎉 All math calculations are accurate!');
  } else {
    console.log(`\n⚠️ Found ${errors} errors and ${warnings} warnings`);
    console.log('Note: Small discrepancies may be due to data updates after initial seeding');
  }
}

verifyMath()
  .catch((error) => {
    console.error('❌ Verification error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });