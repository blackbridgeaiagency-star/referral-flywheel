#!/usr/bin/env tsx
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixCreatorNames() {
  try {
    console.log('\n🔧 Fixing creator welcome messages...\n');

    // Get current state
    const creators = await prisma.creator.findMany({
      select: {
        companyId: true,
        companyName: true,
        welcomeMessage: true,
      },
    });

    console.log('📋 Current state:');
    creators.forEach(c => {
      console.log(`   ${c.companyName} (${c.companyId})`);
      const msg = c.welcomeMessage || '(using default)';
      const preview = msg.substring(0, 50);
      console.log(`   Message: ${preview}${msg.length > 50 ? '...' : ''}\n`);
    });

    // Fix the first creator's hardcoded welcome message
    // Set it to a proper template with {creatorName} placeholder
    const updated1 = await prisma.creator.update({
      where: { companyId: 'biz_ImvAT3IIRbPBT' },
      data: {
        welcomeMessage: `Hey {memberName}! 🎉

Welcome to {creatorName}! We're stoked to have you here.

Here's something cool: You now have your own referral link that pays you 10% lifetime commission on everyone you invite!

Your link: {referralLink}

Share it with friends, post it on social media, or send it to anyone who'd love what we do. You'll earn passive income every month they stay. Pretty sweet, right?

See you in the community! 🚀`
      },
      select: { companyId: true, companyName: true },
    });

    console.log('✅ Fixed welcome message for:', updated1.companyName);
    console.log('   Now uses {creatorName} placeholder instead of hardcoded ID\n');

    console.log('🎉 Done!');
    console.log('✅ Welcome messages will now say "Welcome to BlackBridgeAgency"');
    console.log('✅ Not "Welcome to biz_ImvAT3IIRbPBT"\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixCreatorNames();
