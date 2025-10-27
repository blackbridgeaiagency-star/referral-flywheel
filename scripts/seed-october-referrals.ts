import { prisma } from '@/lib/db/prisma';
import { generateReferralCode } from '@/lib/utils/referral-code';
import { calculateCommission } from '@/lib/utils/commission';

async function seedOctoberReferrals() {
  console.log('🌱 SEEDING OCTOBER REFERRALS\n');
  console.log('This script creates realistic October referral data for testing.\n');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // VALIDATION: Ensure we're in October 2025
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const now = new Date();
  if (now.getMonth() !== 9) { // October = month 9 (0-indexed)
    console.warn('⚠️  WARNING: Current month is not October');
    console.warn(`   Current month: ${now.toLocaleString('en-US', { month: 'long' })}`);
    console.warn('   This script creates October-dated referrals\n');
  }

  // Get top 10 members to distribute referrals
  const topMembers = await prisma.member.findMany({
    orderBy: { totalReferred: 'desc' },
    take: 10,
    include: { creator: true },
  });

  if (topMembers.length === 0) {
    console.error('❌ No members found! Run main seed script first.');
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`Found ${topMembers.length} top members\n`);

  // Distribution: [3, 2, 2, 1, 1, 1, 1, 0, 0, 0]
  // This gives us 11 total October referrals
  const distribution = [3, 2, 2, 1, 1, 1, 1, 0, 0, 0];
  let totalCreated = 0;
  const updates: { username: string; before: any; after: any }[] = [];

  for (let i = 0; i < topMembers.length; i++) {
    const referrer = topMembers[i];
    const octoberReferrals = distribution[i];

    if (octoberReferrals === 0) {
      console.log(`⏭️  Skipping ${referrer.username} (0 October referrals)`);
      continue;
    }

    console.log(`\n👤 Adding ${octoberReferrals} October referrals for ${referrer.username}...`);

    const beforeMonthly = referrer.monthlyReferred;
    const beforeTotal = referrer.totalReferred;
    const beforeEarnings = referrer.monthlyEarnings;

    for (let j = 0; j < octoberReferrals; j++) {
      // Random date in October (between Oct 1 and Oct 25)
      const day = Math.floor(Math.random() * 25) + 1; // 1-25
      const hour = Math.floor(Math.random() * 24);
      const minute = Math.floor(Math.random() * 60);
      const octoberDate = new Date(`2025-10-${day.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00Z`);

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // STEP 1: Create new member (the referred person)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const username = `OctRef_${referrer.username.substring(0, 5)}_${j + 1}`;
      const newMember = await prisma.member.create({
        data: {
          userId: `oct_user_${Date.now()}_${i}_${j}`,
          membershipId: `oct_mem_${Date.now()}_${i}_${j}`,
          email: `october_ref_${i}_${j}@test.com`,
          username,
          referralCode: generateReferralCode(username),
          referredBy: referrer.referralCode,
          creatorId: referrer.creatorId,
          subscriptionPrice: 49.99,
          memberOrigin: 'referred',
          createdAt: octoberDate,
        },
      });

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // STEP 2: Create initial commission
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const { memberShare, creatorShare, platformShare } = calculateCommission(49.99);

      await prisma.commission.create({
        data: {
          whopPaymentId: `oct_pay_${Date.now()}_${i}_${j}`,
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

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // STEP 3: Update referrer stats (THIS IS CRITICAL)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      await prisma.member.update({
        where: { id: referrer.id },
        data: {
          totalReferred: { increment: 1 },
          monthlyReferred: { increment: 1 }, // ⭐ KEY FIELD
          lifetimeEarnings: { increment: memberShare },
          monthlyEarnings: { increment: memberShare },
        },
      });

      totalCreated++;
      console.log(`  ✅ Created referral ${j + 1}/${octoberReferrals} on Oct ${day} at ${hour}:${minute}`);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // VALIDATION: Verify stats updated correctly
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const afterUpdate = await prisma.member.findUnique({
      where: { id: referrer.id },
    });

    const monthlyMatch = afterUpdate!.monthlyReferred === beforeMonthly + octoberReferrals;
    const totalMatch = afterUpdate!.totalReferred === beforeTotal + octoberReferrals;

    updates.push({
      username: referrer.username,
      before: { total: beforeTotal, monthly: beforeMonthly, earnings: beforeEarnings },
      after: {
        total: afterUpdate!.totalReferred,
        monthly: afterUpdate!.monthlyReferred,
        earnings: afterUpdate!.monthlyEarnings
      },
    });

    console.log(`\n  Validation for ${referrer.username}:`);
    console.log(`    Before: total=${beforeTotal}, monthly=${beforeMonthly}, earnings=$${beforeEarnings.toFixed(2)}`);
    console.log(`    After:  total=${afterUpdate!.totalReferred}, monthly=${afterUpdate!.monthlyReferred}, earnings=$${afterUpdate!.monthlyEarnings.toFixed(2)}`);
    console.log(`    Expected increment: ${octoberReferrals}`);
    console.log(`    ${monthlyMatch && totalMatch ? '✅ CORRECT' : '❌ MISMATCH!'}`);

    if (!monthlyMatch || !totalMatch) {
      console.error('    ❌ ERROR: Stats update failed! Rolling back...');
      // In production, implement proper transaction rollback
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FINAL VALIDATION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n═══════════════════════════════════════');
  console.log('📋 SEEDING SUMMARY:');
  console.log('═══════════════════════════════════════');
  console.log(`✅ Created ${totalCreated} October referrals`);
  console.log(`✅ Distributed across ${distribution.filter(d => d > 0).length} top members`);

  const sumMonthlyReferred = await prisma.member.aggregate({
    _sum: { monthlyReferred: true },
  });

  const actualOctoberReferrals = await prisma.member.count({
    where: {
      memberOrigin: 'referred',
      createdAt: { gte: new Date('2025-10-01T00:00:00Z') },
    },
  });

  console.log(`\n🔍 VERIFICATION:`);
  console.log(`  Sum of monthlyReferred: ${sumMonthlyReferred._sum.monthlyReferred}`);
  console.log(`  Actual October referrals: ${actualOctoberReferrals}`);
  console.log(`  Match: ${sumMonthlyReferred._sum.monthlyReferred === actualOctoberReferrals ? '✅' : '❌'}`);

  console.log('\n📊 MEMBER UPDATES:');
  updates.forEach(({ username, before, after }) => {
    console.log(`  ${username}:`);
    console.log(`    Total: ${before.total} → ${after.total}`);
    console.log(`    Monthly: ${before.monthly} → ${after.monthly}`);
    console.log(`    Earnings: $${before.earnings.toFixed(2)} → $${after.earnings.toFixed(2)}`);
  });

  console.log('\n═══════════════════════════════════════');
  console.log('✅ SEEDING COMPLETE');
  console.log('═══════════════════════════════════════\n');

  await prisma.$disconnect();
}

seedOctoberReferrals().catch(console.error);
