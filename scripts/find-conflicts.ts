#!/usr/bin/env tsx
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function findConflicts() {
  try {
    const conflicts = await prisma.member.findMany({
      where: { membershipId: { startsWith: 'TEST_INV_' } },
      select: { id: true, userId: true, email: true, membershipId: true },
    });

    console.log('\n🔍 Checking for conflicting test data...\n');
    console.log(`Found ${conflicts.length} members with TEST_INV_ membershipId:\n`);

    conflicts.forEach(m => {
      console.log(`  • ${m.membershipId}`);
      console.log(`    User ID: ${m.userId}`);
      console.log(`    Email: ${m.email}\n`);
    });

    if (conflicts.length > 0) {
      console.log('⚠️  These need to be cleaned up first.');
      console.log('   Run: npx tsx scripts/remove-invoice-test-data.ts\n');
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findConflicts();
