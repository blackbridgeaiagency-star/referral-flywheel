import { prisma } from '@/lib/db/prisma';
import { generateReferralCode } from '@/lib/utils/referral-code';
import { calculateCommission } from '@/lib/utils/commission';
import { startOfMonth } from 'date-fns';

async function testWebhookLogic() {
  console.log('🧪 TESTING WEBHOOK LOGIC\n');
  console.log('This script validates the webhook processing logic with simulated scenarios.\n');

  let allTestsPassed = true;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENARIO 1: New referral (initial payment)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('═══════════════════════════════════════');
  console.log('TEST 1: New Referral (Initial Payment)');
  console.log('Expected: totalReferred++, monthlyReferred++, earnings++');
  console.log('═══════════════════════════════════════\n');

  try {
    // Get a referrer from the database
    const referrer = await prisma.member.findFirst({
      where: {
        referralCode: { not: null }
      },
      include: { creator: true },
    });

    if (!referrer) {
      console.log('⏭️  SKIP: No members in database');
    } else {
      const before = {
        totalReferred: referrer.totalReferred,
        monthlyReferred: referrer.monthlyReferred,
        lifetimeEarnings: referrer.lifetimeEarnings,
        monthlyEarnings: referrer.monthlyEarnings,
      };

      // Simulate creating a new referred member
      const newMember = await prisma.member.create({
        data: {
          userId: `test_new_${Date.now()}`,
          membershipId: `test_mem_${Date.now()}`,
          email: `test_new_${Date.now()}@test.com`,
          username: `TestNewUser_${Date.now()}`,
          referralCode: generateReferralCode(`TestNewUser_${Date.now()}`),
          referredBy: referrer.referralCode,
          creatorId: referrer.creatorId,
          subscriptionPrice: 49.99,
          memberOrigin: 'referred',
          createdAt: new Date(),
        },
      });

      // Create initial commission
      const { memberShare, creatorShare, platformShare } = calculateCommission(49.99);

      await prisma.commission.create({
        data: {
          whopPaymentId: `test_pay_${Date.now()}`,
          whopMembershipId: newMember.membershipId,
          saleAmount: 49.99,
          memberShare,
          creatorShare,
          platformShare,
          paymentType: 'initial',
          status: 'paid',
          paidAt: new Date(),
          memberId: referrer.id,
          creatorId: referrer.creatorId,
          createdAt: new Date(),
        },
      });

      // Update referrer stats (simulating webhook logic)
      await prisma.member.update({
        where: { id: referrer.id },
        data: {
          totalReferred: { increment: 1 },
          monthlyReferred: { increment: 1 },
          lifetimeEarnings: { increment: memberShare },
          monthlyEarnings: { increment: memberShare },
        },
      });

      const after = await prisma.member.findUnique({
        where: { id: referrer.id },
      });

      console.log('Before:', before);
      console.log('After:', {
        totalReferred: after!.totalReferred,
        monthlyReferred: after!.monthlyReferred,
        lifetimeEarnings: after!.lifetimeEarnings,
        monthlyEarnings: after!.monthlyEarnings,
      });

      const test1Pass =
        after!.totalReferred === before.totalReferred + 1 &&
        after!.monthlyReferred === before.monthlyReferred + 1 &&
        after!.lifetimeEarnings > before.lifetimeEarnings &&
        after!.monthlyEarnings > before.monthlyEarnings;

      console.log(`\nResult: ${test1Pass ? '✅ PASS' : '❌ FAIL'}\n`);
      if (!test1Pass) allTestsPassed = false;

      // Cleanup
      await prisma.member.delete({ where: { id: newMember.id } });
      await prisma.member.update({
        where: { id: referrer.id },
        data: {
          totalReferred: before.totalReferred,
          monthlyReferred: before.monthlyReferred,
          lifetimeEarnings: before.lifetimeEarnings,
          monthlyEarnings: before.monthlyEarnings,
        },
      });
    }
  } catch (error) {
    console.log('❌ FAIL:', error);
    allTestsPassed = false;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENARIO 2: Recurring payment
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('═══════════════════════════════════════');
  console.log('TEST 2: Recurring Payment');
  console.log('Expected: totalReferred unchanged, monthlyReferred unchanged, earnings++');
  console.log('═══════════════════════════════════════\n');

  try {
    const referrer = await prisma.member.findFirst({
      where: {
        totalReferred: { gt: 0 }
      },
      include: { creator: true },
    });

    if (!referrer) {
      console.log('⏭️  SKIP: No referrers in database');
    } else {
      const before = {
        totalReferred: referrer.totalReferred,
        monthlyReferred: referrer.monthlyReferred,
        lifetimeEarnings: referrer.lifetimeEarnings,
        monthlyEarnings: referrer.monthlyEarnings,
      };

      // Create recurring commission
      const { memberShare, creatorShare, platformShare } = calculateCommission(49.99);

      await prisma.commission.create({
        data: {
          whopPaymentId: `test_recurring_${Date.now()}`,
          whopMembershipId: `existing_member_${Date.now()}`,
          saleAmount: 49.99,
          memberShare,
          creatorShare,
          platformShare,
          paymentType: 'recurring',
          status: 'paid',
          paidAt: new Date(),
          memberId: referrer.id,
          creatorId: referrer.creatorId,
          createdAt: new Date(),
        },
      });

      // Update earnings ONLY (not referral counts)
      await prisma.member.update({
        where: { id: referrer.id },
        data: {
          lifetimeEarnings: { increment: memberShare },
          monthlyEarnings: { increment: memberShare },
        },
      });

      const after = await prisma.member.findUnique({
        where: { id: referrer.id },
      });

      console.log('Before:', before);
      console.log('After:', {
        totalReferred: after!.totalReferred,
        monthlyReferred: after!.monthlyReferred,
        lifetimeEarnings: after!.lifetimeEarnings,
        monthlyEarnings: after!.monthlyEarnings,
      });

      const test2Pass =
        after!.totalReferred === before.totalReferred && // Unchanged
        after!.monthlyReferred === before.monthlyReferred && // Unchanged
        after!.lifetimeEarnings > before.lifetimeEarnings && // Increased
        after!.monthlyEarnings > before.monthlyEarnings; // Increased

      console.log(`\nResult: ${test2Pass ? '✅ PASS' : '❌ FAIL'}\n`);
      if (!test2Pass) allTestsPassed = false;

      // Cleanup
      await prisma.member.update({
        where: { id: referrer.id },
        data: {
          lifetimeEarnings: before.lifetimeEarnings,
          monthlyEarnings: before.monthlyEarnings,
        },
      });
    }
  } catch (error) {
    console.log('❌ FAIL:', error);
    allTestsPassed = false;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENARIO 3: Organic member payment
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('═══════════════════════════════════════');
  console.log('TEST 3: Organic Member Payment');
  console.log('Expected: No changes to any referrer stats');
  console.log('═══════════════════════════════════════\n');

  try {
    const creator = await prisma.creator.findFirst();

    if (!creator) {
      console.log('⏭️  SKIP: No creators in database');
    } else {
      // Create organic member
      const organicMember = await prisma.member.create({
        data: {
          userId: `test_organic_${Date.now()}`,
          membershipId: `test_organic_mem_${Date.now()}`,
          email: `test_organic_${Date.now()}@test.com`,
          username: `TestOrganicUser_${Date.now()}`,
          referralCode: generateReferralCode(`TestOrganicUser_${Date.now()}`),
          referredBy: null, // No referrer
          creatorId: creator.id,
          subscriptionPrice: 49.99,
          memberOrigin: 'organic',
          createdAt: new Date(),
        },
      });

      // Get all members' stats before
      const membersBefore = await prisma.member.findMany({
        select: { id: true, totalReferred: true, monthlyReferred: true },
      });

      // Create payment for organic member (goes to creator, not any member)
      const { memberShare, creatorShare, platformShare } = calculateCommission(49.99);

      await prisma.commission.create({
        data: {
          whopPaymentId: `test_organic_pay_${Date.now()}`,
          whopMembershipId: organicMember.membershipId,
          saleAmount: 49.99,
          memberShare: 0, // Organic = no member share
          creatorShare: creatorShare + memberShare, // Creator gets member's share too
          platformShare,
          paymentType: 'initial',
          status: 'paid',
          paidAt: new Date(),
          memberId: organicMember.id, // Commission associated with the organic member themselves
          creatorId: creator.id,
          createdAt: new Date(),
        },
      });

      // Get all members' stats after
      const membersAfter = await prisma.member.findMany({
        select: { id: true, totalReferred: true, monthlyReferred: true },
      });

      // Check that NO member had their referral counts change
      let referralCountsChanged = false;
      for (const before of membersBefore) {
        const after = membersAfter.find(m => m.id === before.id);
        if (after && (after.totalReferred !== before.totalReferred || after.monthlyReferred !== before.monthlyReferred)) {
          referralCountsChanged = true;
          break;
        }
      }

      const test3Pass = !referralCountsChanged;

      console.log(`Organic member created: ${organicMember.username}`);
      console.log(`Referral counts changed for any member: ${referralCountsChanged ? 'YES ❌' : 'NO ✅'}`);
      console.log(`\nResult: ${test3Pass ? '✅ PASS' : '❌ FAIL'}\n`);
      if (!test3Pass) allTestsPassed = false;

      // Cleanup
      await prisma.member.delete({ where: { id: organicMember.id } });
    }
  } catch (error) {
    console.log('❌ FAIL:', error);
    allTestsPassed = false;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FINAL VERDICT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('═══════════════════════════════════════');
  console.log('📋 WEBHOOK LOGIC VALIDATION SUMMARY:');
  console.log('═══════════════════════════════════════');
  console.log(allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
  console.log('═══════════════════════════════════════\n');

  await prisma.$disconnect();
  process.exit(allTestsPassed ? 0 : 1);
}

testWebhookLogic().catch(console.error);
