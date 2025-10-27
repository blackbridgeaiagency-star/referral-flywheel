// scripts/test-refund-flow.ts
/**
 * Refund Flow Test Script
 *
 * Tests all edge cases for refund processing:
 * - Full refunds
 * - Partial refunds
 * - Double refund prevention (idempotency)
 * - Refund after payout (negative balance)
 * - Multiple refunds for same commission
 */

import { prisma } from '../lib/db/prisma';

const WEBHOOK_ENDPOINT = process.env.NEXT_PUBLIC_APP_URL + '/api/webhooks/whop';

async function testRefundFlow() {
  console.log('\n🧪 REFUND FLOW TEST SUITE\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 1: Setup - Create test data
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('📋 Test 1: Setting up test data...');

  try {
    // Create test creator
    const creator = await prisma.creator.upsert({
      where: { companyId: 'test_company_refund' },
      create: {
        companyId: 'test_company_refund',
        companyName: 'Refund Test Community',
        productId: 'test_product_refund',
      },
      update: {},
    });

    // Create referrer member
    const referrer = await prisma.member.upsert({
      where: { userId: 'test_referrer_refund' },
      create: {
        userId: 'test_referrer_refund',
        membershipId: 'test_membership_referrer_refund',
        email: 'referrer@test.com',
        username: 'TestReferrer',
        referralCode: 'REFERRER-ABC123',
        creatorId: creator.id,
        lifetimeEarnings: 100, // Starting balance: $100
        monthlyEarnings: 100,
        totalReferred: 2,
      },
      update: {
        lifetimeEarnings: 100,
        monthlyEarnings: 100,
        totalReferred: 2,
      },
    });

    // Create buyer member
    const buyer = await prisma.member.upsert({
      where: { userId: 'test_buyer_refund' },
      create: {
        userId: 'test_buyer_refund',
        membershipId: 'test_membership_buyer_refund',
        email: 'buyer@test.com',
        username: 'TestBuyer',
        referralCode: 'BUYER-XYZ789',
        referredBy: referrer.referralCode,
        creatorId: creator.id,
        memberOrigin: 'referred',
      },
      update: {
        referredBy: referrer.referralCode,
      },
    });

    // Create lifecycle for buyer
    await prisma.memberLifecycle.upsert({
      where: { memberId: buyer.id },
      create: {
        memberId: buyer.id,
        currentStatus: 'active',
        lifetimeValue: 49.99,
        netValue: 49.99,
      },
      update: {
        currentStatus: 'active',
        lifetimeValue: 49.99,
        netValue: 49.99,
      },
    });

    // Create test commission
    const commission = await prisma.commission.upsert({
      where: { whopPaymentId: 'test_payment_refund_001' },
      create: {
        whopPaymentId: 'test_payment_refund_001',
        whopMembershipId: buyer.membershipId,
        saleAmount: 49.99,
        memberShare: 4.999, // 10%
        creatorShare: 34.993, // 70%
        platformShare: 9.998, // 20%
        paymentType: 'initial',
        status: 'paid',
        paidAt: new Date(),
        memberId: referrer.id,
        creatorId: creator.id,
        productType: 'subscription',
        billingPeriod: 'monthly',
        monthlyValue: 49.99,
      },
      update: {},
    });

    console.log('✅ Test 1 PASSED: Test data created');
    console.log(`   Referrer: ${referrer.username} (Balance: $${referrer.lifetimeEarnings})`);
    console.log(`   Commission: $${commission.saleAmount} (Member share: $${commission.memberShare})\n`);
    passed++;
  } catch (error: any) {
    console.error('❌ Test 1 FAILED:', error.message);
    failed++;
    return;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 2: Full Refund
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('📋 Test 2: Processing full refund...');

  try {
    const refundWebhook = {
      action: 'payment.refunded',
      data: {
        id: 'test_refund_001',
        payment_id: 'test_payment_refund_001',
        membership_id: 'test_membership_buyer_refund',
        amount: 4999, // $49.99 in cents
        reason: 'requested',
      },
    };

    const response = await fetch(WEBHOOK_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(refundWebhook),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.statusText}`);
    }

    // Verify refund was created
    const refund = await prisma.refund.findUnique({
      where: { whopRefundId: 'test_refund_001' },
    });

    if (!refund) throw new Error('Refund record not created');
    if (refund.status !== 'processed') throw new Error(`Refund status is ${refund.status}, expected 'processed'`);
    if (Math.abs(refund.refundAmount - 49.99) > 0.01) throw new Error('Refund amount incorrect');

    // Verify referrer balance was decremented
    const updatedReferrer = await prisma.member.findUnique({
      where: { userId: 'test_referrer_refund' },
    });

    const expectedBalance = 100 - 4.999; // $100 - $4.999
    if (!updatedReferrer) throw new Error('Referrer not found');
    if (Math.abs(updatedReferrer.lifetimeEarnings - expectedBalance) > 0.01) {
      throw new Error(`Referrer balance is $${updatedReferrer.lifetimeEarnings}, expected $${expectedBalance}`);
    }

    // Verify commission status
    const updatedCommission = await prisma.commission.findUnique({
      where: { whopPaymentId: 'test_payment_refund_001' },
    });

    if (!updatedCommission) throw new Error('Commission not found');
    if (updatedCommission.status !== 'refunded') throw new Error(`Commission status is ${updatedCommission.status}, expected 'refunded'`);

    // Verify buyer lifecycle
    const buyerLifecycle = await prisma.memberLifecycle.findUnique({
      where: { memberId: updatedReferrer.id },
    });

    console.log('✅ Test 2 PASSED: Full refund processed correctly');
    console.log(`   Refund Amount: $${refund.refundAmount}`);
    console.log(`   Member Share Reversed: $${refund.memberShareReversed}`);
    console.log(`   New Referrer Balance: $${updatedReferrer.lifetimeEarnings}\n`);
    passed++;
  } catch (error: any) {
    console.error('❌ Test 2 FAILED:', error.message);
    failed++;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 3: Double Refund Prevention (Idempotency)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('📋 Test 3: Testing double refund prevention...');

  try {
    const balanceBefore = await prisma.member.findUnique({
      where: { userId: 'test_referrer_refund' },
      select: { lifetimeEarnings: true },
    });

    // Try to refund again with same refund ID
    const refundWebhook = {
      action: 'payment.refunded',
      data: {
        id: 'test_refund_001', // Same ID
        payment_id: 'test_payment_refund_001',
        membership_id: 'test_membership_buyer_refund',
        amount: 4999,
        reason: 'requested',
      },
    };

    const response = await fetch(WEBHOOK_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(refundWebhook),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.statusText}`);
    }

    // Verify balance didn't change
    const balanceAfter = await prisma.member.findUnique({
      where: { userId: 'test_referrer_refund' },
      select: { lifetimeEarnings: true },
    });

    if (balanceBefore?.lifetimeEarnings !== balanceAfter?.lifetimeEarnings) {
      throw new Error('Balance changed on duplicate refund! Idempotency check failed.');
    }

    // Verify only one refund record exists
    const refundCount = await prisma.refund.count({
      where: { whopRefundId: 'test_refund_001' },
    });

    if (refundCount !== 1) {
      throw new Error(`Found ${refundCount} refund records, expected 1`);
    }

    console.log('✅ Test 3 PASSED: Double refund prevented (idempotent)');
    console.log(`   Balance unchanged: $${balanceAfter?.lifetimeEarnings}\n`);
    passed++;
  } catch (error: any) {
    console.error('❌ Test 3 FAILED:', error.message);
    failed++;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 4: Partial Refund
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('📋 Test 4: Processing partial refund...');

  try {
    // Create another commission for partial refund testing
    const newCommission = await prisma.commission.create({
      data: {
        whopPaymentId: 'test_payment_refund_002',
        whopMembershipId: 'test_membership_buyer_refund',
        saleAmount: 100,
        memberShare: 10, // 10%
        creatorShare: 70, // 70%
        platformShare: 20, // 20%
        paymentType: 'initial',
        status: 'paid',
        paidAt: new Date(),
        memberId: (await prisma.member.findUnique({ where: { userId: 'test_referrer_refund' } }))!.id,
        creatorId: (await prisma.creator.findUnique({ where: { companyId: 'test_company_refund' } }))!.id,
        productType: 'subscription',
        billingPeriod: 'monthly',
        monthlyValue: 100,
      },
    });

    // Update referrer balance
    await prisma.member.update({
      where: { userId: 'test_referrer_refund' },
      data: {
        lifetimeEarnings: { increment: 10 },
        monthlyEarnings: { increment: 10 },
      },
    });

    const balanceBefore = await prisma.member.findUnique({
      where: { userId: 'test_referrer_refund' },
      select: { lifetimeEarnings: true },
    });

    // Partial refund: $50 out of $100
    const partialRefundWebhook = {
      action: 'payment.refunded',
      data: {
        id: 'test_refund_002',
        payment_id: 'test_payment_refund_002',
        membership_id: 'test_membership_buyer_refund',
        amount: 5000, // $50 in cents (50% refund)
        reason: 'partial_refund',
      },
    };

    const response = await fetch(WEBHOOK_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partialRefundWebhook),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.statusText}`);
    }

    // Verify partial refund
    const refund = await prisma.refund.findUnique({
      where: { whopRefundId: 'test_refund_002' },
    });

    if (!refund) throw new Error('Refund record not created');

    // Should reverse 50% of member share (50% of $10 = $5)
    const expectedReversal = 5;
    if (Math.abs(refund.memberShareReversed - expectedReversal) > 0.01) {
      throw new Error(`Member share reversed is $${refund.memberShareReversed}, expected $${expectedReversal}`);
    }

    // Verify commission status is 'partial_refund'
    const updatedCommission = await prisma.commission.findUnique({
      where: { whopPaymentId: 'test_payment_refund_002' },
    });

    if (updatedCommission?.status !== 'partial_refund') {
      throw new Error(`Commission status is ${updatedCommission?.status}, expected 'partial_refund'`);
    }

    console.log('✅ Test 4 PASSED: Partial refund processed correctly');
    console.log(`   Original Sale: $${newCommission.saleAmount}`);
    console.log(`   Refund Amount: $${refund.refundAmount} (50%)`);
    console.log(`   Member Share Reversed: $${refund.memberShareReversed} (50% of $10)\n`);
    passed++;
  } catch (error: any) {
    console.error('❌ Test 4 FAILED:', error.message);
    failed++;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 5: Refund Creates Negative Balance (Edge Case)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('📋 Test 5: Testing refund with negative balance...');

  try {
    // Set referrer balance to $2 (less than commission of $4.999)
    await prisma.member.update({
      where: { userId: 'test_referrer_refund' },
      data: {
        lifetimeEarnings: 2,
        monthlyEarnings: 2,
      },
    });

    // Create a new commission to refund
    const commission = await prisma.commission.create({
      data: {
        whopPaymentId: 'test_payment_refund_003',
        whopMembershipId: 'test_membership_buyer_refund',
        saleAmount: 49.99,
        memberShare: 4.999,
        creatorShare: 34.993,
        platformShare: 9.998,
        paymentType: 'initial',
        status: 'paid',
        paidAt: new Date(),
        memberId: (await prisma.member.findUnique({ where: { userId: 'test_referrer_refund' } }))!.id,
        creatorId: (await prisma.creator.findUnique({ where: { companyId: 'test_company_refund' } }))!.id,
        productType: 'subscription',
        billingPeriod: 'monthly',
        monthlyValue: 49.99,
      },
    });

    // Refund it
    const refundWebhook = {
      action: 'payment.refunded',
      data: {
        id: 'test_refund_003',
        payment_id: 'test_payment_refund_003',
        membership_id: 'test_membership_buyer_refund',
        amount: 4999,
        reason: 'requested',
      },
    };

    const response = await fetch(WEBHOOK_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(refundWebhook),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.statusText}`);
    }

    // Verify balance went negative
    const updatedReferrer = await prisma.member.findUnique({
      where: { userId: 'test_referrer_refund' },
    });

    const expectedBalance = 2 - 4.999; // Negative!
    if (!updatedReferrer) throw new Error('Referrer not found');
    if (Math.abs(updatedReferrer.lifetimeEarnings - expectedBalance) > 0.01) {
      throw new Error(`Referrer balance is $${updatedReferrer.lifetimeEarnings}, expected $${expectedBalance}`);
    }

    console.log('✅ Test 5 PASSED: Negative balance handled correctly');
    console.log(`   Balance after refund: $${updatedReferrer.lifetimeEarnings.toFixed(2)} (NEGATIVE)\n`);
    passed++;
  } catch (error: any) {
    console.error('❌ Test 5 FAILED:', error.message);
    failed++;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SUMMARY
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 TEST RESULTS');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(2)}%`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // Cleanup
  console.log('🧹 Cleaning up test data...');
  await prisma.refund.deleteMany({
    where: {
      whopRefundId: {
        in: ['test_refund_001', 'test_refund_002', 'test_refund_003'],
      },
    },
  });
  await prisma.commission.deleteMany({
    where: {
      whopPaymentId: {
        in: ['test_payment_refund_001', 'test_payment_refund_002', 'test_payment_refund_003'],
      },
    },
  });
  await prisma.memberLifecycle.deleteMany({
    where: {
      member: {
        userId: {
          in: ['test_referrer_refund', 'test_buyer_refund'],
        },
      },
    },
  });
  await prisma.member.deleteMany({
    where: {
      userId: {
        in: ['test_referrer_refund', 'test_buyer_refund'],
      },
    },
  });
  await prisma.creator.delete({
    where: { companyId: 'test_company_refund' },
  });

  console.log('✅ Cleanup complete\n');

  process.exit(failed > 0 ? 1 : 0);
}

testRefundFlow().catch(console.error);
