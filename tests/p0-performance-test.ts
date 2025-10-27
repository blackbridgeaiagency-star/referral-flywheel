// P0 Performance Test - Creator Dashboard Query Optimization
// Verifies parallel query execution

import { prisma } from '../lib/db/prisma';
import { getCompleteCreatorDashboardData } from '../lib/data/centralized-queries';

console.log('⚡ P0 PERFORMANCE TEST - Creator Dashboard\n');
console.log('='.repeat(60));

async function testCreatorDashboardPerformance() {
  try {
    // Find a test creator
    const testCreator = await prisma.creator.findFirst({
      select: { id: true, productId: true, companyName: true }
    });

    if (!testCreator) {
      console.log('❌ No test creator found. Please seed the database first.');
      return;
    }

    console.log(`\n📊 Testing Creator: ${testCreator.companyName}`);
    console.log(`   Product ID: ${testCreator.productId}`);
    console.log('─'.repeat(60));

    // Test 1: Sequential execution (OLD WAY - for comparison)
    console.log('\n🐢 Test 1: Sequential Query Execution (OLD METHOD)');
    const sequentialStart = Date.now();

    const creator1 = await prisma.creator.findFirst({
      where: { productId: testCreator.productId },
      select: { id: true, companyName: true }
    });

    const dashboardData1 = await getCompleteCreatorDashboardData(testCreator.productId);

    const sequentialTime = Date.now() - sequentialStart;
    console.log(`   Time: ${sequentialTime}ms`);

    // Test 2: Parallel execution (NEW WAY - optimized)
    console.log('\n🚀 Test 2: Parallel Query Execution (NEW METHOD)');
    const parallelStart = Date.now();

    const [creator2, dashboardData2] = await Promise.all([
      prisma.creator.findFirst({
        where: { productId: testCreator.productId },
        select: { id: true, companyName: true }
      }),
      getCompleteCreatorDashboardData(testCreator.productId)
    ]);

    const parallelTime = Date.now() - parallelStart;
    console.log(`   Time: ${parallelTime}ms`);

    // Calculate improvement
    console.log('\n' + '='.repeat(60));
    console.log('📈 PERFORMANCE COMPARISON');
    console.log('='.repeat(60));
    console.log(`\n   Sequential (Old):  ${sequentialTime}ms`);
    console.log(`   Parallel (New):    ${parallelTime}ms`);

    const improvement = ((sequentialTime - parallelTime) / sequentialTime * 100).toFixed(1);
    const speedup = (sequentialTime / parallelTime).toFixed(2);

    console.log(`\n   ⚡ Improvement:     ${improvement}% faster`);
    console.log(`   ⚡ Speedup:         ${speedup}x`);

    // Verify data integrity
    console.log('\n' + '='.repeat(60));
    console.log('✅ DATA INTEGRITY CHECK');
    console.log('='.repeat(60));

    const dataMatch = JSON.stringify(dashboardData1) === JSON.stringify(dashboardData2);
    console.log(`   Creator match:     ${creator1?.id === creator2?.id ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Dashboard match:   ${dataMatch ? '✅ PASS' : '❌ FAIL'}`);

    // Performance target check
    console.log('\n' + '='.repeat(60));
    console.log('🎯 PERFORMANCE TARGETS');
    console.log('='.repeat(60));

    const targetTime = 3000; // 3 seconds
    const meetsTarget = parallelTime < targetTime;

    console.log(`   Target:            < ${targetTime}ms (3 seconds)`);
    console.log(`   Actual:            ${parallelTime}ms`);
    console.log(`   Status:            ${meetsTarget ? '✅ MEETS TARGET' : '⚠️  NEEDS MORE OPTIMIZATION'}`);

    if (meetsTarget) {
      console.log('\n🎉 P0 FIX #2 (Performance Optimization) VERIFIED!\n');
    } else {
      console.log(`\n⚠️  Performance is better but still ${parallelTime - targetTime}ms over target\n`);
    }

    // Display metrics
    console.log('='.repeat(60));
    console.log('📊 DASHBOARD METRICS');
    console.log('='.repeat(60));
    console.log(`   Total Revenue:     $${dashboardData2.revenueStats.totalRevenue.toFixed(2)}`);
    console.log(`   Total Members:     ${dashboardData2.revenueStats.totalMembers}`);
    console.log(`   Top Earners:       ${dashboardData2.topEarners.length}`);
    console.log(`   Top Referrers:     ${dashboardData2.topReferrers.length}`);
    console.log('');

  } catch (error: any) {
    console.error('\n❌ Test Error:', error.message);
    console.log('\nStack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testCreatorDashboardPerformance();
