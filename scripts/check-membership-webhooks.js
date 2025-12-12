// Check for membership webhooks and their structure
require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkMembershipWebhooks() {
  console.log('\n🔍 Looking for membership webhooks...\n');

  try {
    const webhooks = await prisma.webhookEvent.findMany({
      where: {
        OR: [
          { eventType: { contains: 'membership' } },
          { eventType: { contains: 'Membership' } },
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    if (webhooks.length === 0) {
      console.log('No membership webhooks found.\n');

      // Show what event types we DO have
      const allTypes = await prisma.webhookEvent.groupBy({
        by: ['eventType'],
        _count: true,
      });

      console.log('Event types in database:');
      allTypes.forEach(t => console.log(`  - ${t.eventType}: ${t._count} events`));
      return;
    }

    console.log(`Found ${webhooks.length} membership webhook(s)\n`);

    for (const webhook of webhooks) {
      console.log('━'.repeat(60));
      console.log(`Event: ${webhook.eventType}`);
      console.log(`Date: ${webhook.createdAt}`);

      const data = webhook.payload?.data || webhook.payload;

      // Look for affiliate fields
      console.log('\n🎯 AFFILIATE FIELDS:');
      console.log(`  affiliate_username: ${data.affiliate_username ?? 'NOT PRESENT'}`);
      console.log(`  affiliate_page_url: ${data.affiliate_page_url ?? 'NOT PRESENT'}`);
      console.log(`  affiliate_code: ${data.affiliate_code ?? 'NOT PRESENT'}`);

      // Show all top-level keys
      console.log('\n📋 All fields:', Object.keys(data).join(', '));
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkMembershipWebhooks();
