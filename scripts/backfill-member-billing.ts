/**
 * Backfill Member Billing Data
 *
 * Adds billingPeriod and monthlyValue to existing members
 * Assumes all existing members are monthly subscriptions
 */

import { prisma } from '../lib/db/prisma';
import logger from '../lib/logger';


async function backfillMemberBilling() {
  logger.info(' Starting member billing data backfill...\n');

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

    logger.info(' Found ${membersWithoutBilling.length} members without billing data\n');

    if (membersWithoutBilling.length === 0) {
      logger.info('All members already have billing data!');
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
        logger.debug(`   Updated ${updatedCount}/${membersWithoutBilling.length} members...`);
      }
    }

    logger.debug(`\n✅ Successfully backfilled ${updatedCount} members!`);
    logger.debug('\n📋 Summary:');
    logger.debug(`   - All existing members set to "monthly" billing`);
    logger.debug(`   - monthlyValue = subscriptionPrice (${membersWithoutBilling[0]?.subscriptionPrice || 'N/A'})`);
    logger.debug('\n💡 Note: If any of these were actually annual/lifetime, you\'ll need to manually correct them.\n');

  } catch (error) {
    logger.error('❌ Error backfilling member billing data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the backfill
backfillMemberBilling()
  .then(() => {
    logger.info(' Backfill complete!');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('💥 Backfill failed:', error);
    process.exit(1);
  });
