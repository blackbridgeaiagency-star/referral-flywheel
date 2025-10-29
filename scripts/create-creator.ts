import { config } from 'dotenv';
import { prisma } from '../lib/db/prisma';

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

  console.log('🚀 Creating creator record...');
  console.log(`Product ID: ${PRODUCT_ID}`);
  console.log(`Company Name: ${COMPANY_NAME}`);
  console.log(`Company ID: ${COMPANY_ID}`);

  try {
    // Check if creator already exists
    const existing = await prisma.creator.findFirst({
      where: { productId: PRODUCT_ID },
    });

    if (existing) {
      console.log('⚠️  Creator already exists!');
      console.log('Existing record:', existing);
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

    console.log('✅ Creator record created successfully!');
    console.log(creator);
    console.log('\n🎉 Your creator dashboard should now be accessible at:');
    console.log(`https://referral-flywheel.vercel.app/seller-product/${PRODUCT_ID}`);
    console.log('\n📝 Next steps:');
    console.log('1. Access your creator dashboard from your Whop account');
    console.log('2. Customize your reward tiers');
    console.log('3. Set up custom competitions (optional)');
    console.log('4. Share your product link - members will automatically get referral codes!');
  } catch (error) {
    console.error('❌ Error creating creator:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createCreator();
