// P0 Performance Test - Creator Dashboard Query Optimization
// Verifies parallel query execution

import { prisma } from '../lib/db/prisma';
import { getCompleteCreatorDashboardData } from '../lib/data/centralized-queries';
import logger from '../lib/logger';


logger.debug('⚡ P0 PERFORMANCE TEST - Creator Dashboard\n');
logger.debug('='.repeat(60));

async function testCreatorDashboardPerformance() {
  try {
    // Find a test creator
    const testCreator = await prisma.creator.findFirst({
      select: { id: true, productId: true, companyName: true }
    });

    if (!testCreator) {
      logger.error('No test creator found. Please seed the database first.');
      return;
    }

    logger.debug(`\n📊 Testing Creator: ${testCreator.companyName}`);
    logger.debug(`   Product ID: ${testCreator.productId}`);
    logger.debug('─'.repeat(60));

    // Test 1: Sequential execution (OLD WAY - for comparison)
    logger.debug('\n🐢 Test 1: Sequential Query Execution (OLD METHOD)');
    const sequentialStart = Date.now();

    const creator1 = await prisma.creator.findFirst({
      where: { productId: testCreator.productId },
      select: { id: true, companyName: true }
    });

    const dashboardData1 = await getCompleteCreatorDashboardData(testCreator.productId);

    const sequentialTime = Date.now() - sequentialStart;
    logger.debug(`   Time: ${sequentialTime}ms`);

    // Test 2: Parallel execution (NEW WAY - optimized)
    logger.debug('\n🚀 Test 2: Parallel Query Execution (NEW METHOD)');
    const parallelStart = Date.now();

    const [creator2, dashboardData2] = await Promise.all([
      prisma.creator.findFirst({
        where: { productId: testCreator.productId },
        select: { id: true, companyName: true }
      }),
      getCompleteCreatorDashboardData(testCreator.productId)
    ]);

    const parallelTime = Date.now() - parallelStart;
    logger.debug(`   Time: ${parallelTime}ms`);

    // Calculate improvement
    logger.debug('\n' + '='.repeat(60));
    logger.info(' PERFORMANCE COMPARISON');
    logger.debug('='.repeat(60));
    logger.debug(`\n   Sequential (Old):  ${sequentialTime}ms`);
    logger.debug(`   Parallel (New):    ${parallelTime}ms`);

    const improvement = ((sequentialTime - parallelTime) / sequentialTime * 100).toFixed(1);
    const speedup = (sequentialTime / parallelTime).toFixed(2);

    logger.debug(`\n   ⚡ Improvement:     ${improvement}% faster`);
    logger.debug(`   ⚡ Speedup:         ${speedup}x`);

    // Verify data integrity
    logger.debug('\n' + '='.repeat(60));
    logger.info('DATA INTEGRITY CHECK');
    logger.debug('='.repeat(60));

    const dataMatch = JSON.stringify(dashboardData1) === JSON.stringify(dashboardData2);
    logger.debug(`   Creator match:     ${creator1?.id === creator2?.id ? '✅ PASS' : '❌ FAIL'}`);
    logger.debug(`   Dashboard match:   ${dataMatch ? '✅ PASS' : '❌ FAIL'}`);

    // Performance target check
    logger.debug('\n' + '='.repeat(60));
    logger.info(' PERFORMANCE TARGETS');
    logger.debug('='.repeat(60));

    const targetTime = 3000; // 3 seconds
    const meetsTarget = parallelTime < targetTime;

    logger.debug(`   Target:            < ${targetTime}ms (3 seconds)`);
    logger.debug(`   Actual:            ${parallelTime}ms`);
    logger.debug(`   Status:            ${meetsTarget ? '✅ MEETS TARGET' : '⚠️  NEEDS MORE OPTIMIZATION'}`);

    if (meetsTarget) {
      logger.debug('\n🎉 P0 FIX #2 (Performance Optimization) VERIFIED!\n');
    } else {
      logger.debug(`\n⚠️  Performance is better but still ${parallelTime - targetTime}ms over target\n`);
    }

    // Display metrics
    logger.debug('='.repeat(60));
    logger.info(' DASHBOARD METRICS');
    logger.debug('='.repeat(60));
    logger.debug(`   Total Revenue:     $${dashboardData2.revenueStats.totalRevenue.toFixed(2)}`);
    logger.debug(`   Total Members:     ${dashboardData2.revenueStats.totalMembers}`);
    logger.debug(`   Top Earners:       ${dashboardData2.topEarners.length}`);
    logger.debug(`   Top Referrers:     ${dashboardData2.topReferrers.length}`);
    logger.debug('');

  } catch (error: any) {
    logger.error('\n❌ Test Error:', error.message);
    logger.debug('\nStack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testCreatorDashboardPerformance();
