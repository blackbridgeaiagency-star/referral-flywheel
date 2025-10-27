/**
 * Backfill Member Billing Data
 *
 * Adds billingPeriod and monthlyValue to existing members
 * Assumes all existing members are monthly subscriptions
 */

import { prisma } from '../lib/db/prisma';

async function backfillMemberBilling() {
  console.log('🔄 Starting member billing data backfill...\n');

  try {
    // Get all members without billing data
    const membersWithoutBilling = await prisma.member.findMany({
      where: {
        billingPeriod: null,
      },
      select: {
        id: true,
        username: true,
        subscriptionPrice: true,
        billingPeriod: true,
        monthlyValue: true,
      },
    });

    console.log(`📊 Found ${membersWithoutBilling.length} members without billing data\n`);

    if (membersWithoutBilling.length === 0) {
      console.log('✅ All members already have billing data!');
      return;
    }

    // Update each member (assume monthly subscriptions)
    let updatedCount = 0;
    for (const member of membersWithoutBilling) {
      await prisma.member.update({
        where: { id: member.id },
        data: {
          billingPeriod: 'monthly', // Assume monthly
          monthlyValue: member.subscriptionPrice, // For monthly, monthlyValue = subscriptionPrice
        },
      });

      updatedCount++;
      if (updatedCount % 10 === 0) {
        console.log(`   Updated ${updatedCount}/${membersWithoutBilling.length} members...`);
      }
    }

    console.log(`\n✅ Successfully backfilled ${updatedCount} members!`);
    console.log('\n📋 Summary:');
    console.log(`   - All existing members set to "monthly" billing`);
    console.log(`   - monthlyValue = subscriptionPrice (${membersWithoutBilling[0]?.subscriptionPrice || 'N/A'})`);
    console.log('\n💡 Note: If any of these were actually annual/lifetime, you\'ll need to manually correct them.\n');

  } catch (error) {
    console.error('❌ Error backfilling member billing data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the backfill
backfillMemberBilling()
  .then(() => {
    console.log('🎉 Backfill complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Backfill failed:', error);
    process.exit(1);
  });
