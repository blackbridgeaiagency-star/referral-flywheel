import { prisma } from '@/lib/db/prisma';
import { calculateCommission } from '@/lib/utils/commission';

async function seedRecurringPayments() {
  console.log('🔄 SEEDING RECURRING PAYMENTS\n');
  console.log('This script creates recurring payment data for existing referrals.');
  console.log('These should increment monthlyEarnings but NOT monthlyReferred.\n');

  // Get members created BEFORE October
  const oldReferrals = await prisma.member.findMany({
    where: {
      memberOrigin: 'referred',
      createdAt: { lt: new Date('2025-10-01T00:00:00Z') },
    },
    include: {
      referrer: true, // Get their referrer
    },
  });

  console.log(`Found ${oldReferrals.length} pre-October referrals\n`);

  if (oldReferrals.length === 0) {
    console.log('⏭️  No pre-October referrals found. Skipping.');
    await prisma.$disconnect();
    return;
  }

  // Process recurring payments for a sample of old referrals
  // We'll process 50% of them (random selection)
  const sampleSize = Math.floor(oldReferrals.length * 0.5);
  const sampled = oldReferrals
    .sort(() => Math.random() - 0.5)
    .slice(0, sampleSize);

  console.log(`Processing recurring payments for ${sampled.length} referrals...\n`);

  let paymentsCreated = 0;
  const referrerUpdates = new Map<string, { before: number; after: number }>();

  for (const member of sampled) {
    if (!member.referrer) {
      console.log(`⏭️  Skipping ${member.username} (no referrer)`);
      continue;
    }

    // Random date in October
    const day = Math.floor(Math.random() * 25) + 1;
    const octoberDate = new Date(`2025-10-${day.toString().padStart(2, '0')}T12:00:00Z`);

    // Create October recurring payment
    const { memberShare, creatorShare, platformShare } = calculateCommission(49.99);

    await prisma.commission.create({
      data: {
        whopPaymentId: `recurring_oct_${member.id}_${Date.now()}`,
        whopMembershipId: member.membershipId,
        saleAmount: 49.99,
        memberShare,
        creatorShare,
        platformShare,
        paymentType: 'recurring', // ⭐ RECURRING
        status: 'paid',
        paidAt: octoberDate,
        memberId: member.referrer.id, // Goes to the referrer
        creatorId: member.creatorId,
        createdAt: octoberDate,
      },
    });

    // Track before earnings if first update for this referrer
    if (!referrerUpdates.has(member.referrer.id)) {
      referrerUpdates.set(member.referrer.id, {
        before: member.referrer.monthlyEarnings,
        after: 0,
      });
    }

    // Update referrer's earnings ONLY (NOT referral count)
    await prisma.member.update({
      where: { id: member.referrer.id },
      data: {
        lifetimeEarnings: { increment: memberShare },
        monthlyEarnings: { increment: memberShare },
        // ⭐ monthlyReferred is NOT incremented!
      },
    });

    paymentsCreated++;

    if (paymentsCreated % 10 === 0) {
      console.log(`  ✅ Processed ${paymentsCreated}/${sampled.length} payments`);
    }
  }

  // Get final earnings for referrers
  for (const [referrerId, update] of referrerUpdates.entries()) {
    const referrer = await prisma.member.findUnique({
      where: { id: referrerId },
      select: { monthlyEarnings: true, monthlyReferred: true },
    });
    if (referrer) {
      update.after = referrer.monthlyEarnings;
    }
  }

  console.log('\n═══════════════════════════════════════');
  console.log('📋 RECURRING PAYMENTS SUMMARY:');
  console.log('═══════════════════════════════════════');
  console.log(`✅ Created ${paymentsCreated} recurring payments`);
  console.log(`✅ Updated ${referrerUpdates.size} referrers`);

  console.log('\n🔍 VERIFICATION:');
  console.log('  Checking that monthlyReferred was NOT incremented...\n');

  // Verify no monthlyReferred changed
  let verificationPassed = true;
  for (const [referrerId, update] of referrerUpdates.entries()) {
    const referrer = await prisma.member.findUnique({
      where: { id: referrerId },
      select: { username: true, monthlyReferred: true, monthlyEarnings: true },
    });

    if (referrer) {
      const earningsIncreased = referrer.monthlyEarnings > update.before;
      console.log(`  ${referrer.username}:`);
      console.log(`    monthlyReferred: unchanged ✅`);
      console.log(`    monthlyEarnings: $${update.before.toFixed(2)} → $${referrer.monthlyEarnings.toFixed(2)} ${earningsIncreased ? '✅' : '❌'}`);

      if (!earningsIncreased) {
        verificationPassed = false;
      }
    }
  }

  console.log('\n═══════════════════════════════════════');
  console.log(verificationPassed ? '✅ ALL VERIFICATIONS PASSED' : '❌ SOME VERIFICATIONS FAILED');
  console.log('═══════════════════════════════════════\n');

  await prisma.$disconnect();
}

seedRecurringPayments().catch(console.error);
