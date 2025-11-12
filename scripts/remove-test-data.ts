#!/usr/bin/env tsx
/**
 * Remove test data from production database
 * Run: npx tsx scripts/remove-test-data.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { prisma } from '../lib/db/prisma';

async function removeTestData() {
  console.log('🧹 Removing test data...\n');

  try {
    // Find and remove test creators
    const testCreators = await prisma.creator.findMany({
      where: {
        OR: [
          { companyName: { contains: 'test' } },
          { companyName: { contains: 'Test' } },
          { companyName: { contains: 'TEST' } },
          { companyName: { contains: 'biz_test' } },
          { companyId: { contains: 'test' } },
        ]
      }
    });

    if (testCreators.length > 0) {
      console.log(`Found ${testCreators.length} test creators:`);
      testCreators.forEach(c => {
        console.log(`  - ${c.companyName} (${c.companyId})`);
      });

      console.log('\nRemoving test creators and all related data...');

      // Delete test creators (cascades to members, commissions, etc.)
      for (const creator of testCreators) {
        await prisma.creator.delete({
          where: { id: creator.id }
        });
        console.log(`  ✅ Removed: ${creator.companyName}`);
      }
    } else {
      console.log('No test creators found.');
    }

    // Also check for orphaned test members
    const testMembers = await prisma.member.findMany({
      where: {
        OR: [
          { username: { contains: 'test' } },
          { email: { contains: 'test' } },
          { email: { contains: '.temp' } },
        ]
      }
    });

    if (testMembers.length > 0) {
      console.log(`\nFound ${testMembers.length} test members:`);
      testMembers.forEach(m => {
        console.log(`  - ${m.username} (${m.email})`);
      });

      console.log('\nRemoving test members...');

      for (const member of testMembers) {
        await prisma.member.delete({
          where: { id: member.id }
        });
        console.log(`  ✅ Removed: ${member.username}`);
      }
    } else {
      console.log('No test members found.');
    }

    console.log('\n✨ Test data cleanup complete!');

  } catch (error) {
    console.error('❌ Error removing test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

removeTestData();