// Show structure of existing webhooks to understand field names
require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function showWebhookStructure() {
  console.log('\n📋 Examining webhook structure...\n');

  try {
    const webhooks = await prisma.webhookEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        eventType: true,
        payload: true,
        createdAt: true,
      }
    });

    if (webhooks.length === 0) {
      console.log('No webhooks found.');
      return;
    }

    for (const webhook of webhooks) {
      console.log('━'.repeat(60));
      console.log(`Event: ${webhook.eventType}`);
      console.log(`Date: ${webhook.createdAt}`);
      console.log('\nPayload structure:');

      const data = webhook.payload?.data || webhook.payload;

      // Show all top-level keys
      console.log('\nTop-level keys:', Object.keys(data).join(', '));

      // Show key values (truncated)
      console.log('\nKey values:');
      for (const [key, value] of Object.entries(data)) {
        const valueStr = typeof value === 'object'
          ? JSON.stringify(value).substring(0, 100)
          : String(value).substring(0, 100);
        console.log(`  ${key}: ${valueStr}`);
      }

      // Check for nested user object
      if (data.user) {
        console.log('\nUser object keys:', Object.keys(data.user).join(', '));
      }

      // Check for membership object
      if (data.membership) {
        console.log('\nMembership object keys:', Object.keys(data.membership).join(', '));
      }

      console.log('\n');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

showWebhookStructure();
