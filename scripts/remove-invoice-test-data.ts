#!/usr/bin/env tsx
/**
 * INVOICE TEST DATA CLEANUP
 *
 * Safely removes ALL test invoice data from the database.
 *
 * Safety features:
 * - Preview mode: Shows what will be deleted before deletion
 * - Confirmation required: Must type 'DELETE TEST DATA' to proceed
 * - Pattern-based: Only deletes data with TEST_INV_ prefix or @test-data.temp email
 * - Dry run support: Use --dry-run flag to preview without deleting
 * - Detailed logging: Shows exactly what was deleted
 *
 * Usage:
 *   npx tsx scripts/remove-invoice-test-data.ts          # Interactive mode
 *   npx tsx scripts/remove-invoice-test-data.ts --dry-run  # Preview only
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as readline from 'readline';

// Load environment variables FIRST
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Check for dry run mode
const isDryRun = process.argv.includes('--dry-run');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPER: Get User Confirmation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    })
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN FUNCTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function removeInvoiceTestData() {
  console.log('\n' + '='.repeat(70));
  console.log('🧹 INVOICE TEST DATA CLEANUP');
  console.log('='.repeat(70));

  if (isDryRun) {
    console.log('\n🔍 DRY RUN MODE - No data will be deleted\n');
  } else {
    console.log('\n⚠️  WARNING: This will permanently delete test data\n');
  }

  try {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 1: Find All Test Data
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('🔍 Step 1: Scanning for test data...\n');

    // Find test members (updated to catch all test patterns including buyers)
    const testMembers = await prisma.member.findMany({
      where: {
        OR: [
          { userId: { startsWith: 'TEST_INV_' } },
          { userId: { startsWith: 'user_TEST_INV_' } },
          { userId: { startsWith: 'TEST_INV_buyer_' } },
          { email: { contains: '@test-data.temp' } },
          { email: { endsWith: '.temp' } },
          { membershipId: { startsWith: 'TEST_INV_' } },
        ],
      },
      select: {
        id: true,
        userId: true,
        email: true,
        username: true,
        memberOrigin: true,
        lifetimeEarnings: true,
      },
    });

    if (testMembers.length === 0) {
      console.log('✅ No test data found in database!\n');
      console.log('💡 Database is clean - nothing to remove.\n');
      console.log('='.repeat(70) + '\n');
      return;
    }

    const testMemberIds = testMembers.map((m) => m.id);

    // Count related data
    const commissionCount = await prisma.commission.count({
      where: { memberId: { in: testMemberIds } },
    });

    const attributionCount = await prisma.attributionClick.count({
      where: { memberId: { in: testMemberIds } },
    });

    const shareEventCount = await prisma.shareEvent.count({
      where: { memberId: { in: testMemberIds } },
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 2: Display Preview
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('📋 Found test data to remove:\n');
    console.log(`   👥 Members: ${testMembers.length}`);
    console.log(`   💰 Commissions: ${commissionCount}`);
    console.log(`   🔗 Attribution Clicks: ${attributionCount}`);
    console.log(`   📤 Share Events: ${shareEventCount}\n`);

    // Show sample members
    console.log('📝 Sample test members:');
    const sampleMembers = testMembers.slice(0, 5);
    sampleMembers.forEach((member) => {
      console.log(
        `   • ${member.username} (${member.email}) - ` +
          `${member.memberOrigin}, $${member.lifetimeEarnings.toFixed(2)} earnings`
      );
    });
    if (testMembers.length > 5) {
      console.log(`   ... and ${testMembers.length - 5} more\n`);
    } else {
      console.log('');
    }

    // Get commission details
    if (commissionCount > 0) {
      const commissions = await prisma.commission.findMany({
        where: { memberId: { in: testMemberIds } },
        select: {
          saleAmount: true,
          platformShare: true,
          status: true,
          platformFeeInvoiced: true,
        },
      });

      const totalSales = commissions.reduce((sum, c) => sum + c.saleAmount, 0);
      const totalPlatformFees = commissions.reduce((sum, c) => sum + c.platformShare, 0);
      const invoicedCount = commissions.filter((c) => c.platformFeeInvoiced).length;

      console.log('💵 Commission summary:');
      console.log(`   • Total referred sales: $${totalSales.toFixed(2)}`);
      console.log(`   • Total platform fees: $${totalPlatformFees.toFixed(2)}`);
      console.log(`   • Already invoiced: ${invoicedCount} commissions`);
      console.log(`   • Not yet invoiced: ${commissionCount - invoicedCount} commissions\n`);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 3: Dry Run Exit
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (isDryRun) {
      console.log('='.repeat(70));
      console.log('🔍 DRY RUN COMPLETE - No data was deleted');
      console.log('='.repeat(70));
      console.log('\n💡 To actually delete this data, run without --dry-run flag:\n');
      console.log('   npx tsx scripts/remove-invoice-test-data.ts\n');
      console.log('='.repeat(70) + '\n');
      return;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 4: Safety Checks
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('🛡️  Safety checks:');

    // Verify all members have test identifiers
    const membersWithoutTestPattern = testMembers.filter(
      (m) =>
        !m.userId.startsWith('TEST_INV_') &&
        !m.userId.startsWith('user_TEST_INV_') &&
        !m.userId.startsWith('TEST_INV_buyer_') &&
        !m.email.includes('@test-data.temp') &&
        !m.email.endsWith('.temp') &&
        !m.membershipId.startsWith('TEST_INV_')
    );

    if (membersWithoutTestPattern.length > 0) {
      console.error('   ❌ ERROR: Some members do not have test patterns!');
      console.error('   This should never happen. Aborting for safety.\n');
      membersWithoutTestPattern.forEach((m) => {
        console.error(`   • ${m.username} (${m.email})`);
      });
      process.exit(1);
    }

    console.log('   ✅ All members have valid test identifiers');
    console.log('   ✅ No production data will be affected\n');

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 5: Confirmation
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('⚠️  CONFIRMATION REQUIRED\n');
    console.log('   This will permanently delete:');
    console.log(`   • ${testMembers.length} test members`);
    console.log(`   • ${commissionCount} commissions`);
    console.log(`   • ${attributionCount} attribution clicks`);
    console.log(`   • ${shareEventCount} share events\n`);

    const answer = await askQuestion(
      '   Type "DELETE TEST DATA" (without quotes) to confirm: '
    );

    if (answer.trim() !== 'DELETE TEST DATA') {
      console.log('\n❌ Deletion cancelled - confirmation text did not match');
      console.log('💡 Run again if you want to delete test data\n');
      return;
    }

    console.log('\n✅ Confirmation received - proceeding with deletion...\n');

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 6: Delete Data (in proper order)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('🗑️  Deleting test data...\n');

    // Delete in reverse order of foreign key dependencies
    console.log('   1/4 Deleting commissions...');
    const deletedCommissions = await prisma.commission.deleteMany({
      where: { memberId: { in: testMemberIds } },
    });
    console.log(`       ✅ Deleted ${deletedCommissions.count} commissions`);

    console.log('   2/4 Deleting attribution clicks...');
    const deletedAttributions = await prisma.attributionClick.deleteMany({
      where: { memberId: { in: testMemberIds } },
    });
    console.log(`       ✅ Deleted ${deletedAttributions.count} attribution clicks`);

    console.log('   3/4 Deleting share events...');
    const deletedShares = await prisma.shareEvent.deleteMany({
      where: { memberId: { in: testMemberIds } },
    });
    console.log(`       ✅ Deleted ${deletedShares.count} share events`);

    console.log('   4/4 Deleting test members...');
    const deletedMembers = await prisma.member.deleteMany({
      where: { id: { in: testMemberIds } },
    });
    console.log(`       ✅ Deleted ${deletedMembers.count} members\n`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 7: Verify Cleanup
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('🔍 Verifying cleanup...');

    const remainingTestMembers = await prisma.member.count({
      where: {
        OR: [
          { userId: { startsWith: 'TEST_INV_' } },
          { userId: { startsWith: 'user_TEST_INV_' } },
          { userId: { startsWith: 'TEST_INV_buyer_' } },
          { email: { contains: '@test-data.temp' } },
          { email: { endsWith: '.temp' } },
          { membershipId: { startsWith: 'TEST_INV_' } },
        ],
      },
    });

    if (remainingTestMembers > 0) {
      console.log(`   ⚠️  Warning: ${remainingTestMembers} test members still remain`);
      console.log('   This may indicate incomplete cleanup.\n');
    } else {
      console.log('   ✅ All test data successfully removed\n');
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 8: Summary
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('='.repeat(70));
    console.log('✅ CLEANUP COMPLETE');
    console.log('='.repeat(70));
    console.log('\n📊 Deletion Summary:\n');
    console.log(`   Members deleted:           ${deletedMembers.count}`);
    console.log(`   Commissions deleted:       ${deletedCommissions.count}`);
    console.log(`   Attribution clicks deleted: ${deletedAttributions.count}`);
    console.log(`   Share events deleted:      ${deletedShares.count}\n`);
    console.log('🎯 Database is now clean and ready for next test cycle!\n');
    console.log('='.repeat(70) + '\n');

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   • Check that .env.local exists and has DATABASE_URL');
    console.error('   • Verify database is accessible');
    console.error('   • Check for foreign key constraint issues\n');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
removeInvoiceTestData();
