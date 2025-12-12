// Quick script to check if Whop webhooks include affiliate data
require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAffiliateData() {
  console.log('\n🔍 Checking for affiliate data in webhook payloads...\n');

  try {
    // Check recent webhooks for affiliate fields
    const webhooks = await prisma.webhookEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        eventType: true,
        payload: true,
        createdAt: true,
      }
    });

    if (webhooks.length === 0) {
      console.log('❌ No webhook events found in database.');
      console.log('   You need to make a test purchase to generate webhook data.\n');
      return;
    }

    console.log(`Found ${webhooks.length} recent webhooks.\n`);

    let affiliateFound = false;

    for (const webhook of webhooks) {
      const payloadStr = JSON.stringify(webhook.payload);

      // Check for affiliate-related fields
      if (payloadStr.includes('affiliate')) {
        affiliateFound = true;
        console.log('✅ AFFILIATE DATA FOUND!');
        console.log(`   Event: ${webhook.eventType}`);
        console.log(`   Date: ${webhook.createdAt}`);

        // Parse and show affiliate fields
        const data = webhook.payload?.data || webhook.payload;

        console.log('\n   Affiliate fields:');
        if (data.affiliate_code) console.log(`   - affiliate_code: ${data.affiliate_code}`);
        if (data.affiliateCode) console.log(`   - affiliateCode: ${data.affiliateCode}`);
        if (data.affiliate_username) console.log(`   - affiliate_username: ${data.affiliate_username}`);
        if (data.affiliate?.username) console.log(`   - affiliate.username: ${data.affiliate.username}`);
        if (data.affiliate?.code) console.log(`   - affiliate.code: ${data.affiliate.code}`);

        console.log('\n   Full payload snippet (affiliate-related):');
        const relevantKeys = Object.keys(data).filter(k =>
          k.toLowerCase().includes('affiliate') || k.toLowerCase().includes('referr')
        );
        relevantKeys.forEach(k => {
          console.log(`   - ${k}: ${JSON.stringify(data[k])}`);
        });

        console.log('\n');
      }
    }

    if (!affiliateFound) {
      console.log('⚠️  No affiliate data found in recent webhooks.');
      console.log('\n   This could mean:');
      console.log('   1. No purchases were made with ?a=username parameter');
      console.log('   2. Member affiliate program not enabled in Whop');
      console.log('   3. Whop doesn\'t include affiliate data in webhooks\n');

      console.log('   NEXT STEP: Make a test purchase with an affiliate link:\n');
      console.log('   1. Go to: https://whop.com/dashboard/products');
      console.log('   2. Enable "Member Affiliate Program" at 10%');
      console.log('   3. Get your username from Whop profile');
      console.log('   4. Test URL: https://whop.com/YOUR_PRODUCT?a=YOUR_USERNAME');
      console.log('   5. Complete test purchase');
      console.log('   6. Run this script again\n');
    }

    // Also check memberships for affiliate_username
    console.log('\n📋 Checking membership data for affiliate fields...\n');

    const memberships = await prisma.member.findMany({
      where: {
        referredBy: { not: null }
      },
      take: 5,
      select: {
        id: true,
        username: true,
        referredBy: true,
        memberOrigin: true,
        createdAt: true
      }
    });

    if (memberships.length > 0) {
      console.log(`Found ${memberships.length} referred members:`);
      memberships.forEach(m => {
        console.log(`   - ${m.username} referred by: ${m.referredBy} (${m.memberOrigin})`);
      });
    } else {
      console.log('   No referred members found yet.');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAffiliateData();
