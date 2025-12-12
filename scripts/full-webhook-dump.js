// Dump ALL webhooks and search for any affiliate-related data
require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fullDump() {
  console.log('\n🔍 FULL WEBHOOK ANALYSIS\n');
  console.log('═'.repeat(60));

  try {
    // Get ALL webhooks
    const allWebhooks = await prisma.webhookEvent.findMany({
      orderBy: { createdAt: 'asc' },
    });

    console.log(`Total webhooks in database: ${allWebhooks.length}\n`);

    // Group by event type
    const byType = {};
    allWebhooks.forEach(w => {
      byType[w.eventType] = (byType[w.eventType] || 0) + 1;
    });

    console.log('Event types:');
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

    console.log('\n' + '═'.repeat(60));
    console.log('SEARCHING FOR AFFILIATE DATA IN ALL PAYLOADS...\n');

    let affiliateFound = false;

    for (const webhook of allWebhooks) {
      const payloadStr = JSON.stringify(webhook.payload).toLowerCase();

      // Search for ANY affiliate-related strings
      if (payloadStr.includes('affiliate') ||
          payloadStr.includes('referr') ||
          payloadStr.includes('promo')) {

        affiliateFound = true;
        console.log('━'.repeat(60));
        console.log(`🎯 FOUND AFFILIATE DATA!`);
        console.log(`Event: ${webhook.eventType}`);
        console.log(`Date: ${webhook.createdAt}`);
        console.log(`Whop Event ID: ${webhook.whopEventId || 'N/A'}`);

        const data = webhook.payload?.data || webhook.payload;

        // Show relevant fields
        console.log('\nRelevant fields:');
        for (const [key, value] of Object.entries(data)) {
          const keyLower = key.toLowerCase();
          if (keyLower.includes('affiliate') ||
              keyLower.includes('referr') ||
              keyLower.includes('promo')) {
            console.log(`  ${key}: ${JSON.stringify(value)}`);
          }
        }

        // Check nested objects
        if (data.user) {
          console.log('\n  User object:', JSON.stringify(data.user, null, 2).substring(0, 300));
        }
        if (data.membership) {
          console.log('\n  Membership object:', JSON.stringify(data.membership, null, 2).substring(0, 300));
        }

        console.log('\n  Full payload preview:');
        console.log(JSON.stringify(data, null, 2).substring(0, 800) + '...\n');
      }
    }

    if (!affiliateFound) {
      console.log('❌ No affiliate data found in any webhooks.\n');

      // Show a sample of what we DO have
      console.log('Sample webhook structure (most recent):');
      if (allWebhooks.length > 0) {
        const sample = allWebhooks[allWebhooks.length - 1];
        const data = sample.payload?.data || sample.payload;
        console.log(`\nEvent: ${sample.eventType}`);
        console.log('Fields available:', Object.keys(data).join(', '));
        console.log('\nFull payload:');
        console.log(JSON.stringify(data, null, 2));
      }
    }

    // Also check members table for any referral data
    console.log('\n' + '═'.repeat(60));
    console.log('CHECKING MEMBERS TABLE FOR REFERRAL DATA...\n');

    const members = await prisma.member.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        referredBy: true,
        memberOrigin: true,
        membershipId: true,
        createdAt: true,
      }
    });

    if (members.length === 0) {
      console.log('No members in database.');
    } else {
      console.log(`Found ${members.length} member(s):\n`);
      members.forEach(m => {
        console.log(`  ${m.username || m.email}`);
        console.log(`    membershipId: ${m.membershipId}`);
        console.log(`    referredBy: ${m.referredBy || 'none'}`);
        console.log(`    origin: ${m.memberOrigin || 'unknown'}`);
        console.log(`    created: ${m.createdAt}\n`);
      });
    }

    // Check commissions
    console.log('═'.repeat(60));
    console.log('CHECKING COMMISSIONS TABLE...\n');

    const commissions = await prisma.commission.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        member: { select: { username: true, referralCode: true } }
      }
    });

    if (commissions.length === 0) {
      console.log('No commissions recorded.');
    } else {
      console.log(`Found ${commissions.length} commission(s):\n`);
      commissions.forEach(c => {
        console.log(`  Payment: ${c.whopPaymentId}`);
        console.log(`    Amount: $${c.saleAmount}`);
        console.log(`    Member share: $${c.memberShare}`);
        console.log(`    Referrer: ${c.member?.username || 'unknown'} (${c.member?.referralCode})`);
        console.log(`    Created: ${c.createdAt}\n`);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fullDump();
