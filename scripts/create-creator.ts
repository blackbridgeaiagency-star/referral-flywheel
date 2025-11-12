import { config } from 'dotenv';
import { prisma } from '../lib/db/prisma';
import logger from '../lib/logger';


// Load environment variables
config({ path: '.env.local' });

/**
 * Create a new creator record for a Whop product
 * Run this script when setting up a new community on the referral flywheel app
 */

async function createCreator() {
  // ⚠️ REPLACE THESE VALUES WITH YOUR ACTUAL WHOP DETAILS
  const PRODUCT_ID = 'prod_ImvAT3IIRbPBT'; // Your Whop product ID (starts with prod_)
  const COMPANY_NAME = 'My Community'; // Your company/community name
  const COMPANY_ID = 'biz_kkGoY7OvzWXRdK'; // Your Whop company ID

  logger.info(' Creating creator record...');
  logger.debug(`Product ID: ${PRODUCT_ID}`);
  logger.debug(`Company Name: ${COMPANY_NAME}`);
  logger.debug(`Company ID: ${COMPANY_ID}`);

  try {
    // Check if creator already exists
    const existing = await prisma.creator.findFirst({
      where: { productId: PRODUCT_ID },
    });

    if (existing) {
      logger.warn('  Creator already exists!');
      logger.debug('Existing record:', existing);
      return;
    }

    // Create new creator record with default reward tiers
    const creator = await prisma.creator.create({
      data: {
        productId: PRODUCT_ID,
        companyId: COMPANY_ID,
        companyName: COMPANY_NAME,
        // Default tier rewards (you can customize these in the dashboard later)
        tier1Count: 3,
        tier1Reward: 'Early Supporter Badge',
        tier2Count: 5,
        tier2Reward: 'Community Champion Badge',
        tier3Count: 10,
        tier3Reward: 'VIP Access',
        tier4Count: 25,
        tier4Reward: 'Lifetime Pro Access',
        autoApproveRewards: false,
        welcomeMessage: 'Welcome to our referral program! Share your unique link to earn rewards.',
        // Custom competition rewards (disabled by default)
        customRewardEnabled: false,
        customRewardTimeframe: 'monthly',
        customRewardType: 'top_earners',
        customReward1st: null,
        customReward2nd: null,
        customReward3rd: null,
        customReward4th: null,
        customReward5th: null,
        customReward6to10: null,
      },
    });

    logger.info('Creator record created successfully!');
    logger.debug(creator);
    logger.debug('\n🎉 Your creator dashboard should now be accessible at:');
    logger.debug(`https://referral-flywheel.vercel.app/seller-product/${PRODUCT_ID}`);
    logger.debug('\n📝 Next steps:');
    logger.debug('1. Access your creator dashboard from your Whop account');
    logger.debug('2. Customize your reward tiers');
    logger.debug('3. Set up custom competitions (optional)');
    logger.debug('4. Share your product link - members will automatically get referral codes!');
  } catch (error) {
    logger.error('❌ Error creating creator:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createCreator();
