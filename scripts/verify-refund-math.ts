// scripts/verify-refund-math.ts
/**
 * Refund Math Verification Script
 *
 * Audits all refunds in the database to ensure:
 * - Commission splits add up correctly (10/70/20)
 * - Refund amounts match commission amounts
 * - Member/Creator/Platform shares are reversed proportionally
 * - No financial discrepancies
 */

import { prisma } from '../lib/db/prisma';

interface VerificationResult {
  refundId: string;
  passed: boolean;
  errors: string[];
  warnings: string[];
}

async function verifyRefundMath() {
  console.log('\n🔍 REFUND MATH VERIFICATION\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  const results: VerificationResult[] = [];
  let totalPassed = 0;
  let totalFailed = 0;

  // Fetch all refunds with their associated commissions
  const refunds = await prisma.refund.findMany({
    include: {
      commission: {
        include: {
          member: true,
          creator: true,
        },
      },
    },
  });

  console.log(`📊 Found ${refunds.length} refunds to verify\n`);

  if (refunds.length === 0) {
    console.log('✅ No refunds to verify. Database is clean!\n');
    return;
  }

  for (const refund of refunds) {
    const errors: string[] = [];
    const warnings: string[] = [];

    console.log(`\n🔍 Verifying Refund: ${refund.whopRefundId}`);
    console.log(`   Payment: ${refund.whopPaymentId}`);
    console.log(`   Amount: $${refund.refundAmount.toFixed(2)}`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CHECK 1: Refund amount vs Commission amount
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const commission = refund.commission;
    const isFullRefund = Math.abs(refund.refundAmount - commission.saleAmount) < 0.01;
    const isPartialRefund = refund.refundAmount < commission.saleAmount && refund.refundAmount > 0;

    if (!isFullRefund && !isPartialRefund) {
      errors.push(
        `Refund amount ($${refund.refundAmount}) is greater than commission amount ($${commission.saleAmount})`
      );
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CHECK 2: Verify reversed shares add up to refund amount
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const totalReversed =
      refund.memberShareReversed +
      refund.creatorShareReversed +
      refund.platformShareReversed;

    const reversedDifference = Math.abs(totalReversed - refund.refundAmount);

    if (reversedDifference > 0.02) {
      // Allow 2 cent tolerance for rounding
      errors.push(
        `Reversed shares ($${totalReversed.toFixed(2)}) don't add up to refund amount ($${refund.refundAmount.toFixed(2)}). Difference: $${reversedDifference.toFixed(2)}`
      );
    } else if (reversedDifference > 0.01) {
      warnings.push(
        `Minor rounding difference: $${reversedDifference.toFixed(4)}`
      );
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CHECK 3: Verify commission split ratios (10/70/20)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const expectedMemberShare = refund.refundAmount * 0.10;
    const expectedCreatorShare = refund.refundAmount * 0.70;
    const expectedPlatformShare = refund.refundAmount * 0.20;

    const memberShareDiff = Math.abs(refund.memberShareReversed - expectedMemberShare);
    const creatorShareDiff = Math.abs(refund.creatorShareReversed - expectedCreatorShare);
    const platformShareDiff = Math.abs(refund.platformShareReversed - expectedPlatformShare);

    if (memberShareDiff > 0.02) {
      errors.push(
        `Member share reversed ($${refund.memberShareReversed.toFixed(2)}) doesn't match expected 10% ($${expectedMemberShare.toFixed(2)}). Difference: $${memberShareDiff.toFixed(2)}`
      );
    }

    if (creatorShareDiff > 0.02) {
      errors.push(
        `Creator share reversed ($${refund.creatorShareReversed.toFixed(2)}) doesn't match expected 70% ($${expectedCreatorShare.toFixed(2)}). Difference: $${creatorShareDiff.toFixed(2)}`
      );
    }

    if (platformShareDiff > 0.02) {
      errors.push(
        `Platform share reversed ($${refund.platformShareReversed.toFixed(2)}) doesn't match expected 20% ($${expectedPlatformShare.toFixed(2)}). Difference: $${platformShareDiff.toFixed(2)}`
      );
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CHECK 4: For partial refunds, verify proportional reversal
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (isPartialRefund) {
      const refundRatio = refund.refundAmount / commission.saleAmount;

      const expectedMemberReversal = commission.memberShare * refundRatio;
      const expectedCreatorReversal = commission.creatorShare * refundRatio;
      const expectedPlatformReversal = commission.platformShare * refundRatio;

      const memberReversalDiff = Math.abs(refund.memberShareReversed - expectedMemberReversal);
      const creatorReversalDiff = Math.abs(refund.creatorShareReversed - expectedCreatorReversal);
      const platformReversalDiff = Math.abs(refund.platformShareReversed - expectedPlatformReversal);

      if (memberReversalDiff > 0.02) {
        errors.push(
          `Partial refund member reversal ($${refund.memberShareReversed.toFixed(2)}) doesn't match proportional amount ($${expectedMemberReversal.toFixed(2)})`
        );
      }

      if (creatorReversalDiff > 0.02) {
        errors.push(
          `Partial refund creator reversal ($${refund.creatorShareReversed.toFixed(2)}) doesn't match proportional amount ($${expectedCreatorReversal.toFixed(2)})`
        );
      }

      if (platformReversalDiff > 0.02) {
        errors.push(
          `Partial refund platform reversal ($${refund.platformShareReversed.toFixed(2)}) doesn't match proportional amount ($${expectedPlatformReversal.toFixed(2)})`
        );
      }

      console.log(`   Type: PARTIAL (${(refundRatio * 100).toFixed(2)}% of original $${commission.saleAmount})`);
    } else {
      console.log(`   Type: FULL`);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CHECK 5: Verify commission status
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const expectedStatus = isFullRefund ? 'refunded' : 'partial_refund';

    if (commission.status !== expectedStatus) {
      errors.push(
        `Commission status is '${commission.status}', expected '${expectedStatus}'`
      );
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // RESULT
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const passed = errors.length === 0;

    if (passed) {
      console.log(`   ✅ PASSED - All checks passed`);
      totalPassed++;
    } else {
      console.log(`   ❌ FAILED - ${errors.length} error(s) found`);
      totalFailed++;
      errors.forEach((error) => console.log(`      - ${error}`));
    }

    if (warnings.length > 0) {
      console.log(`   ⚠️  WARNINGS:`);
      warnings.forEach((warning) => console.log(`      - ${warning}`));
    }

    results.push({
      refundId: refund.whopRefundId,
      passed,
      errors,
      warnings,
    });

    console.log(`   Shares Reversed:`);
    console.log(`      Member:   $${refund.memberShareReversed.toFixed(2)} (${((refund.memberShareReversed / refund.refundAmount) * 100).toFixed(1)}%)`);
    console.log(`      Creator:  $${refund.creatorShareReversed.toFixed(2)} (${((refund.creatorShareReversed / refund.refundAmount) * 100).toFixed(1)}%)`);
    console.log(`      Platform: $${refund.platformShareReversed.toFixed(2)} (${((refund.platformShareReversed / refund.refundAmount) * 100).toFixed(1)}%)`);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SUMMARY
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 VERIFICATION SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Total Refunds: ${refunds.length}`);
  console.log(`✅ Passed: ${totalPassed}`);
  console.log(`❌ Failed: ${totalFailed}`);
  console.log(`📈 Success Rate: ${((totalPassed / refunds.length) * 100).toFixed(2)}%`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // OVERALL FINANCIAL AUDIT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('💰 OVERALL FINANCIAL AUDIT\n');

  const totalRefundAmount = refunds.reduce((sum, r) => sum + r.refundAmount, 0);
  const totalMemberReversed = refunds.reduce((sum, r) => sum + r.memberShareReversed, 0);
  const totalCreatorReversed = refunds.reduce((sum, r) => sum + r.creatorShareReversed, 0);
  const totalPlatformReversed = refunds.reduce((sum, r) => sum + r.platformShareReversed, 0);

  console.log(`Total Refunded: $${totalRefundAmount.toFixed(2)}`);
  console.log(`   Member Share:   $${totalMemberReversed.toFixed(2)} (${((totalMemberReversed / totalRefundAmount) * 100).toFixed(2)}%)`);
  console.log(`   Creator Share:  $${totalCreatorReversed.toFixed(2)} (${((totalCreatorReversed / totalRefundAmount) * 100).toFixed(2)}%)`);
  console.log(`   Platform Share: $${totalPlatformReversed.toFixed(2)} (${((totalPlatformReversed / totalRefundAmount) * 100).toFixed(2)}%)\n`);

  // Check if shares add up
  const totalShares = totalMemberReversed + totalCreatorReversed + totalPlatformReversed;
  const shareDifference = Math.abs(totalShares - totalRefundAmount);

  if (shareDifference > 0.10) {
    console.log(`⚠️  WARNING: Total shares ($${totalShares.toFixed(2)}) don't match total refunds ($${totalRefundAmount.toFixed(2)})`);
    console.log(`   Difference: $${shareDifference.toFixed(2)}\n`);
  } else {
    console.log(`✅ Financial audit passed: All shares add up correctly\n`);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // EXIT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  process.exit(totalFailed > 0 ? 1 : 0);
}

verifyRefundMath().catch(console.error);
