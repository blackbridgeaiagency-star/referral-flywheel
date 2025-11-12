#!/usr/bin/env tsx
/**
 * Test your new environment configuration
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';

async function testConfiguration() {
  console.log(`\n${BLUE}${'='.repeat(60)}${RESET}`);
  console.log(`${BLUE}🔐 TESTING YOUR NEW CONFIGURATION${RESET}`);
  console.log(`${BLUE}${'='.repeat(60)}${RESET}\n`);

  // Check if .env.local exists
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.log(`${RED}❌ .env.local not found!${RESET}`);
    console.log(`${YELLOW}   Please rename .env.local.new to .env.local${RESET}`);
    return false;
  }

  // Load environment variables
  dotenv.config({ path: envPath });

  let allGood = true;

  // 1. Check required variables exist
  console.log(`${BLUE}1. Checking environment variables...${RESET}`);
  const required = [
    'DATABASE_URL',
    'WHOP_API_KEY',
    'WHOP_WEBHOOK_SECRET',
    'ADMIN_API_KEY',
    'CRON_SECRET',
    'EXPORT_API_KEY',
    'SESSION_SECRET'
  ];

  for (const key of required) {
    const value = process.env[key];
    if (!value) {
      console.log(`   ${RED}❌ ${key} is missing${RESET}`);
      allGood = false;
    } else if (value.includes('PASTE_') || value.includes('HERE')) {
      console.log(`   ${YELLOW}⚠️  ${key} still has placeholder text${RESET}`);
      allGood = false;
    } else {
      console.log(`   ${GREEN}✓ ${key} is set${RESET}`);
    }
  }

  if (!allGood) {
    console.log(`\n${RED}Please fill in all the placeholder values in .env.local${RESET}`);
    return false;
  }

  // 2. Test database connection
  console.log(`\n${BLUE}2. Testing database connection...${RESET}`);
  const prisma = new PrismaClient();

  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;
    console.log(`   ${GREEN}✓ Database connected successfully (${latency}ms)${RESET}`);

    // Check tables
    const tables = await prisma.$queryRaw<Array<{tablename: string}>>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      LIMIT 5
    `;
    console.log(`   ${GREEN}✓ Found ${tables.length} tables in database${RESET}`);

  } catch (error: any) {
    console.log(`   ${RED}❌ Database connection failed${RESET}`);
    console.log(`   ${YELLOW}Error: ${error.message}${RESET}`);

    if (error.message.includes('SASL authentication failed')) {
      console.log(`\n   ${YELLOW}Tips:${RESET}`);
      console.log(`   - Check that you copied the password correctly`);
      console.log(`   - If password has special characters (@, #, %), URL-encode it`);
      console.log(`   - Use https://www.urlencoder.org/ to encode the password`);
    }
    allGood = false;
  } finally {
    await prisma.$disconnect();
  }

  // 3. Check Whop keys format
  console.log(`\n${BLUE}3. Validating key formats...${RESET}`);

  const whopKey = process.env.WHOP_API_KEY || '';
  const whopSecret = process.env.WHOP_WEBHOOK_SECRET || '';

  if (whopKey.length < 30) {
    console.log(`   ${YELLOW}⚠️  Whop API key seems too short${RESET}`);
  } else {
    console.log(`   ${GREEN}✓ Whop API key format looks good${RESET}`);
  }

  if (!whopSecret.startsWith('ws_')) {
    console.log(`   ${YELLOW}⚠️  Whop webhook secret should start with 'ws_'${RESET}`);
  } else {
    console.log(`   ${GREEN}✓ Whop webhook secret format looks good${RESET}`);
  }

  // Final result
  console.log(`\n${BLUE}${'='.repeat(60)}${RESET}`);
  if (allGood) {
    console.log(`${GREEN}✅ ALL TESTS PASSED!${RESET}`);
    console.log(`${GREEN}   Your configuration is ready for deployment!${RESET}`);
    console.log(`\n${BLUE}Next steps:${RESET}`);
    console.log(`1. Run: ${YELLOW}npm run build${RESET} (to verify everything compiles)`);
    console.log(`2. Deploy to Vercel: ${YELLOW}vercel --prod${RESET}`);
    console.log(`3. Add the same environment variables in Vercel dashboard`);
  } else {
    console.log(`${RED}❌ CONFIGURATION ISSUES DETECTED${RESET}`);
    console.log(`${YELLOW}   Please fix the issues above and run this test again${RESET}`);
  }
  console.log(`${BLUE}${'='.repeat(60)}${RESET}\n`);

  return allGood;
}

testConfiguration().catch(console.error);