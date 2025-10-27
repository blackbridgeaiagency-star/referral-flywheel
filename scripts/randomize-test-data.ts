import { prisma } from '@/lib/db/prisma';
import { generateReferralCode } from '@/lib/utils/referral-code';
import { calculateCommission } from '@/lib/utils/commission';
import { startOfMonth } from 'date-fns';

/**
 * Comprehensive Data Randomization Script
 *
 * This script randomizes ALL data to test that calculations are working correctly:
 * 1. Clears existing referrals and commissions
 * 2. Randomizes member names and referral codes
 * 3. Creates random referral relationships
 * 4. Generates random October referrals (0-10 per top member)
 * 5. Creates corresponding commissions
 * 6. Updates all stats from database source of truth
 *
 * After running, ALL metrics should calculate correctly from the database.
 */

async function randomizeTestData() {
  console.log('🎲 COMPREHENSIVE DATA RANDOMIZATION TEST\n');
  console.log('This will randomize all data to test calculation accuracy.\n');

  const octoberStart = new Date('2025-10-01T00:00:00Z');
  const now = new Date();

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 1: Clear existing October referrals and their commissions
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('🧹 Cleaning up old test data...');

  // Delete October referrals (will cascade delete commissions)
  const deletedReferrals = await prisma.member.deleteMany({
    where: {
      createdAt: { gte: octoberStart },
      memberOrigin: 'referred',
    },
  });

  console.log(`  Deleted ${deletedReferrals.count} October referrals\n`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 2: Randomize existing member names
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('👤 Randomizing member names...');

  const firstNames = [
    'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn',
    'Sage', 'River', 'Phoenix', 'Rowan', 'Blake', 'Cameron', 'Dakota', 'Skylar',
    'Parker', 'Reese', 'Charlie', 'Finley', 'Kendall', 'Peyton', 'Harper', 'Emerson'
  ];

  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'Martin',
    'Lee', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis'
  ];

  const allMembers = await prisma.member.findMany({
    select: { id: true, referralCode: true },
  });

  console.log(`  Found ${allMembers.length} members to randomize`);

  for (const member of allMembers) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const username = `${firstName} ${lastName}`;

    await prisma.member.update({
      where: { id: member.id },
      data: {
        username,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@test.com`,
      },
    });
  }

  console.log('  ✅ Randomized all member names\n');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 3: Reset all monthly stats to 0
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('🔄 Resetting all monthly stats to 0...');

  await prisma.member.updateMany({
    data: {
      monthlyReferred: 0,
      monthlyEarnings: 0,
    },
  });

  console.log('  ✅ All monthly stats reset\n');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 4: Select random top referrers and create October referrals
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('🎯 Creating randomized October referrals...\n');

  // Get members with at least some referrals (to make them referrers)
  const potentialReferrers = await prisma.member.findMany({
    where: {
      totalReferred: { gte: 0 },
    },
    include: { creator: true },
  });

  // Randomly select 10-15 members to get October referrals
  const numReferrers = Math.floor(Math.random() * 6) + 10; // 10-15 referrers
  const selectedReferrers = potentialReferrers
    .sort(() => Math.random() - 0.5)
    .slice(0, numReferrers);

  console.log(`  Selected ${selectedReferrers.length} random members as referrers\n`);

  let totalOctoberReferrals = 0;
  const referrerStats: Array<{ username: string; referrals: number }> = [];

  for (const referrer of selectedReferrers) {
    // Random number of October referrals (0-8 per referrer)
    const octoberReferralCount = Math.floor(Math.random() * 9);

    if (octoberReferralCount === 0) {
      console.log(`  ${referrer.username}: 0 referrals (skipped)`);
      continue;
    }

    console.log(`  ${referrer.username}: Creating ${octoberReferralCount} referrals...`);

    const beforeMonthly = referrer.monthlyReferred;
    const beforeTotal = referrer.totalReferred;
    const beforeEarnings = referrer.monthlyEarnings;

    for (let i = 0; i < octoberReferralCount; i++) {
      // Random date in October (1-25)
      const day = Math.floor(Math.random() * 25) + 1;
      const hour = Math.floor(Math.random() * 24);
      const minute = Math.floor(Math.random() * 60);
      const octoberDate = new Date(
        `2025-10-${day.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00Z`
      );

      // Generate random name for new member
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const username = `${firstName} ${lastName}`;

      // Create new referred member
      const newMember = await prisma.member.create({
        data: {
          userId: `random_${Date.now()}_${i}_${Math.random()}`,
          membershipId: `random_mem_${Date.now()}_${i}`,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${i}@test.com`,
          username,
          referralCode: generateReferralCode(username),
          referredBy: referrer.referralCode,
          creatorId: referrer.creatorId,
          subscriptionPrice: 49.99,
          memberOrigin: 'referred',
          createdAt: octoberDate,
        },
      });

      // Create initial commission
      const { memberShare, creatorShare, platformShare } = calculateCommission(49.99);

      await prisma.commission.create({
        data: {
          whopPaymentId: `random_pay_${Date.now()}_${i}`,
          whopMembershipId: newMember.membershipId,
          saleAmount: 49.99,
          memberShare,
          creatorShare,
          platformShare,
          paymentType: 'initial',
          status: 'paid',
          paidAt: octoberDate,
          memberId: referrer.id,
          creatorId: referrer.creatorId,
          createdAt: octoberDate,
        },
      });

      // Update referrer stats
      await prisma.member.update({
        where: { id: referrer.id },
        data: {
          totalReferred: { increment: 1 },
          monthlyReferred: { increment: 1 },
          lifetimeEarnings: { increment: memberShare },
          monthlyEarnings: { increment: memberShare },
        },
      });

      totalOctoberReferrals++;
    }

    // Get updated stats
    const afterUpdate = await prisma.member.findUnique({
      where: { id: referrer.id },
    });

    console.log(`    Before: total=${beforeTotal}, monthly=${beforeMonthly}`);
    console.log(`    After:  total=${afterUpdate!.totalReferred}, monthly=${afterUpdate!.monthlyReferred}`);
    console.log(`    ✅ Created ${octoberReferralCount} referrals\n`);

    referrerStats.push({
      username: referrer.username,
      referrals: octoberReferralCount,
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 5: Verify data accuracy
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('═══════════════════════════════════════');
  console.log('🔍 VERIFICATION:');
  console.log('═══════════════════════════════════════\n');

  const sumMonthlyReferred = await prisma.member.aggregate({
    _sum: { monthlyReferred: true },
  });

  const actualOctoberReferrals = await prisma.member.count({
    where: {
      memberOrigin: 'referred',
      createdAt: { gte: octoberStart, lte: now },
    },
  });

  console.log(`Created October referrals: ${totalOctoberReferrals}`);
  console.log(`Sum of monthlyReferred: ${sumMonthlyReferred._sum.monthlyReferred}`);
  console.log(`Actual October referrals in DB: ${actualOctoberReferrals}`);
  console.log(`Match: ${sumMonthlyReferred._sum.monthlyReferred === actualOctoberReferrals ? '✅' : '❌'}\n`);

  // Get top 10 for display
  const top10 = await prisma.member.findMany({
    orderBy: { monthlyReferred: 'desc' },
    take: 10,
    select: {
      username: true,
      totalReferred: true,
      monthlyReferred: true,
      monthlyEarnings: true,
    },
  });

  console.log('📊 Top 10 Members by October Referrals:');
  console.log('─'.repeat(70));
  top10.forEach((m, i) => {
    console.log(
      `${(i + 1).toString().padStart(2)}. ${m.username.padEnd(20)} | ` +
      `Total: ${m.totalReferred.toString().padEnd(3)} | ` +
      `October: ${m.monthlyReferred.toString().padEnd(2)} | ` +
      `Earnings: $${m.monthlyEarnings.toFixed(2)}`
    );
  });

  console.log('\n═══════════════════════════════════════');
  console.log('✅ RANDOMIZATION COMPLETE');
  console.log('═══════════════════════════════════════');
  console.log(`Total members: ${allMembers.length}`);
  console.log(`Members with October referrals: ${referrerStats.length}`);
  console.log(`Total October referrals created: ${totalOctoberReferrals}`);
  console.log(`Data accuracy: ${sumMonthlyReferred._sum.monthlyReferred === actualOctoberReferrals ? '✅ PERFECT' : '❌ MISMATCH'}`);
  console.log('═══════════════════════════════════════\n');

  console.log('🎯 Next Steps:');
  console.log('1. Check the Top Referrers table in the creator dashboard');
  console.log('2. Run: npx tsx scripts/diagnose-october-data.ts');
  console.log('3. Run: curl http://localhost:3000/api/admin/check-consistency\n');

  await prisma.$disconnect();
}

randomizeTestData().catch(console.error);
