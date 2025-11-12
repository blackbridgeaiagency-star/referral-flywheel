#!/usr/bin/env tsx
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkWelcomeMessages() {
  try {
    const creators = await prisma.creator.findMany({
      select: {
        companyId: true,
        companyName: true,
        welcomeMessage: true,
      },
    });

    console.log('\n📋 Creator Welcome Messages:\n');
    creators.forEach(c => {
      console.log(`Company: ${c.companyName} (${c.companyId})`);
      console.log(`Welcome Message:\n${c.welcomeMessage || '(using default message)'}`);
      console.log('\n' + '='.repeat(70) + '\n');
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkWelcomeMessages();
