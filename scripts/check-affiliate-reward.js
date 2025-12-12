// Check if payment webhooks have affiliate_reward field
require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function check() {
  console.log('\n🔍 Checking payment webhooks for affiliate_reward field...\n');

  const webhooks = await prisma.webhookEvent.findMany({
    where: { eventType: { contains: 'payment' } },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  for (const w of webhooks) {
    const data = w.payload?.data || w.payload;
    console.log('━'.repeat(50));
    console.log(`Event: ${w.eventType}`);
    console.log(`Payment ID: ${data.id}`);
    console.log(`Amount: $${(data.final_amount || 0) / 100}`);
    console.log(`affiliate_reward: ${data.affiliate_reward ?? 'NOT PRESENT'}`);

    // Check if field exists even if null
    const hasField = 'affiliate_reward' in data;
    console.log(`Field exists in payload: ${hasField ? 'YES ✅' : 'NO ❌'}`);
  }

  await prisma.$disconnect();
}

check();
