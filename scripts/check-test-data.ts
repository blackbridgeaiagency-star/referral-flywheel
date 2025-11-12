#!/usr/bin/env tsx
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkTestData() {
  try {
    const testMembers = await prisma.member.count({
      where: {
        OR: [
          { userId: { startsWith: 'TEST_INV_' } },
          { email: { contains: '@test-data.temp' } },
        ],
      },
    });

    const testCommissions = await prisma.commission.count({
      where: {
        whopPaymentId: { startsWith: 'TEST_INV_' },
      },
    });

    console.log('\n📊 Test Data Status:');
    console.log(`   Test Members: ${testMembers}`);
    console.log(`   Test Commissions: ${testCommissions}\n`);

    if (testMembers === 0) {
      console.log('⚠️  No test data found!');
      console.log('   Run: npx tsx scripts/seed-invoice-test-data.ts\n');
    } else {
      console.log('✅ Test data exists!');

      // Show sample member IDs
      const members = await prisma.member.findMany({
        where: { userId: { startsWith: 'TEST_INV_' } },
        select: { membershipId: true, username: true },
        take: 3,
      });

      console.log('\n📝 Sample test member URLs (port 3001):');
      members.forEach(m => {
        console.log(`   http://localhost:3001/customer/${m.membershipId} (${m.username})`);
      });
      console.log('');
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTestData();
