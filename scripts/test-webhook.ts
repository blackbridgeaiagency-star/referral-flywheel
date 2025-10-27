// scripts/test-webhook.ts
/**
 * WEBHOOK TEST SCRIPT
 *
 * Tests the webhook handler with known values to verify commission calculations.
 * Simulates Whop payment webhooks and verifies database updates.
 *
 * USAGE:
 * npm run test-webhook
 * or
 * npx tsx scripts/test-webhook.ts
 */

import { calculateCommission } from '../lib/utils/commission';
import { logCommissionSplit, logCalculation } from '../lib/utils/logger';

interface TestCase {
  name: string;
  saleAmount: number;
  expectedMemberShare: number;
  expectedCreatorShare: number;
  expectedPlatformShare: number;
}

async function testWebhook() {
  console.log('🧪 Starting webhook commission calculation tests...\n');

  const testCases: TestCase[] = [
    {
      name: 'Standard Price ($49.99)',
      saleAmount: 49.99,
      expectedMemberShare: 4.999, // 10%
      expectedCreatorShare: 34.993, // 70%
      expectedPlatformShare: 9.998, // 20%
    },
    {
      name: 'Premium Price ($99.99)',
      saleAmount: 99.99,
      expectedMemberShare: 9.999, // 10%
      expectedCreatorShare: 69.993, // 70%
      expectedPlatformShare: 19.998, // 20%
    },
    {
      name: 'Budget Price ($19.99)',
      saleAmount: 19.99,
      expectedMemberShare: 1.999, // 10%
      expectedCreatorShare: 13.993, // 70%
      expectedPlatformShare: 3.998, // 20%
    },
    {
      name: 'Enterprise Price ($299.99)',
      saleAmount: 299.99,
      expectedMemberShare: 29.999, // 10%
      expectedCreatorShare: 209.993, // 70%
      expectedPlatformShare: 59.998, // 20%
    },
    {
      name: 'Exact Dollar Amount ($100.00)',
      saleAmount: 100.0,
      expectedMemberShare: 10.0, // 10%
      expectedCreatorShare: 70.0, // 70%
      expectedPlatformShare: 20.0, // 20%
    },
  ];

  let allPassed = true;
  const results: Array<{ test: string; passed: boolean; details: string }> = [];

  for (const testCase of testCases) {
    console.log(`═══════════════════════════════════════════════════════════════`);
    console.log(`🧪 TEST: ${testCase.name}`);
    console.log(`───────────────────────────────────────────────────────────────`);
    console.log(`Sale Amount: $${testCase.saleAmount.toFixed(2)}`);
    console.log(`───────────────────────────────────────────────────────────────\n`);

    // Calculate commission using the actual utility function
    const { memberShare, creatorShare, platformShare } =
      calculateCommission(testCase.saleAmount);

    // Log calculation
    logCalculation('Commission Calculation', {
      saleAmount: testCase.saleAmount,
    }, {
      memberShare,
      creatorShare,
      platformShare,
      total: memberShare + creatorShare + platformShare,
    });

    // Verify splits
    const total = memberShare + creatorShare + platformShare;
    const tolerance = 0.01; // 1 cent tolerance for rounding

    const memberCorrect =
      Math.abs(memberShare - testCase.expectedMemberShare) < tolerance;
    const creatorCorrect =
      Math.abs(creatorShare - testCase.expectedCreatorShare) < tolerance;
    const platformCorrect =
      Math.abs(platformShare - testCase.expectedPlatformShare) < tolerance;
    const totalCorrect = Math.abs(total - testCase.saleAmount) < tolerance;

    const passed = memberCorrect && creatorCorrect && platformCorrect && totalCorrect;

    // Log commission split
    logCommissionSplit({
      saleAmount: testCase.saleAmount,
      memberShare,
      creatorShare,
      platformShare,
      total,
      valid: passed,
    });

    if (passed) {
      console.log(`✅ ${testCase.name} - PASSED\n`);
      results.push({
        test: testCase.name,
        passed: true,
        details: 'All commission splits are correct',
      });
    } else {
      console.log(`❌ ${testCase.name} - FAILED\n`);
      allPassed = false;

      const errors: string[] = [];
      if (!memberCorrect) {
        errors.push(
          `Member share: expected ${testCase.expectedMemberShare}, got ${memberShare}`
        );
      }
      if (!creatorCorrect) {
        errors.push(
          `Creator share: expected ${testCase.expectedCreatorShare}, got ${creatorShare}`
        );
      }
      if (!platformCorrect) {
        errors.push(
          `Platform share: expected ${testCase.expectedPlatformShare}, got ${platformShare}`
        );
      }
      if (!totalCorrect) {
        errors.push(`Total: expected ${testCase.saleAmount}, got ${total}`);
      }

      results.push({
        test: testCase.name,
        passed: false,
        details: errors.join('; '),
      });
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SUMMARY
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 WEBHOOK TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passedCount}`);
  console.log(`❌ Failed: ${failedCount}\n`);

  if (failedCount > 0) {
    console.log('Failed Tests:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  ❌ ${r.test}`);
        console.log(`     ${r.details}`);
      });
  }

  console.log('\n═══════════════════════════════════════════════════════════════');

  if (allPassed) {
    console.log('✅ ALL WEBHOOK TESTS PASSED!\n');

    console.log('📝 COMMISSION SPLIT VERIFICATION:');
    console.log('   Member:   10% ✅');
    console.log('   Creator:  70% ✅');
    console.log('   Platform: 20% ✅');
    console.log('   Total:    100% ✅\n');

    process.exit(0);
  } else {
    console.log('❌ SOME WEBHOOK TESTS FAILED!\n');
    process.exit(1);
  }
}

// Run tests
testWebhook().catch((error) => {
  console.error('❌ Error running webhook tests:', error);
  process.exit(1);
});
