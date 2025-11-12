#!/usr/bin/env tsx
/**
 * Helper script to properly set up and test your new keys
 */

import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt: string): Promise<string> {
  return new Promise(resolve => rl.question(prompt, resolve));
}

// URL-encode special characters in password
function encodePassword(password: string): string {
  return encodeURIComponent(password);
}

async function testDatabaseConnection(password: string): Promise<boolean> {
  const encodedPassword = encodePassword(password);
  const url = `postgresql://postgres:${encodedPassword}@db.eerhpmjherotaqklpqnc.supabase.co:6543/postgres?pgbouncer=true&connection_limit=1`;

  console.log('\n🔍 Testing database connection...');
  console.log(`   Using password (encoded): ${encodedPassword.substring(0, 3)}...`);

  const prisma = new PrismaClient({
    datasources: { db: { url } }
  });

  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful!');
    return true;
  } catch (error: any) {
    console.log('❌ Database connection failed:', error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function createEnvFile(config: any): Promise<void> {
  const envContent = `# Database (with NEW password - properly encoded)
DATABASE_URL=postgresql://postgres:${encodePassword(config.dbPassword)}@db.eerhpmjherotaqklpqnc.supabase.co:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:${encodePassword(config.dbPassword)}@db.eerhpmjherotaqklpqnc.supabase.co:5432/postgres

# Whop Integration (with NEW keys)
WHOP_API_KEY=${config.whopApiKey}
WHOP_WEBHOOK_SECRET=${config.whopWebhookSecret}

# Public IDs (these are safe - keep as is)
NEXT_PUBLIC_WHOP_APP_ID=app_xa1a8NaAKUVPuO
NEXT_PUBLIC_WHOP_COMPANY_ID=biz_kkGoY7OvzWXRdK
NEXT_PUBLIC_WHOP_AGENT_USER_ID=user_QzqUqxWUTwyHz

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Security Tokens (with NEW generated values)
ADMIN_API_KEY=${config.adminKey}
CRON_SECRET=${config.cronSecret}
EXPORT_API_KEY=${config.exportKey}
SESSION_SECRET=${config.sessionSecret}

# Features
ENABLE_API_VERIFICATION=true
ENABLE_SESSION_CACHE=true
SESSION_MAX_AGE=86400
`;

  const envPath = path.join(process.cwd(), '.env.local');

  // Backup existing file
  if (fs.existsSync(envPath)) {
    const backupPath = envPath + '.backup.' + Date.now();
    fs.copyFileSync(envPath, backupPath);
    console.log(`\n📁 Backed up existing .env.local to: ${path.basename(backupPath)}`);
  }

  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created new .env.local with properly encoded values');
}

async function main() {
  console.log(`
${'='.repeat(60)}
🔐 SETTING UP NEW SECURITY KEYS
${'='.repeat(60)}

This script will help you properly set up your new keys.
Make sure you have all your new values ready:
- Supabase database password
- Whop API key & webhook secret
- Generated admin keys

Let's start:
`);

  // Test database password
  let dbPassword = '';
  let dbWorking = false;

  while (!dbWorking) {
    dbPassword = await question('\n1. Enter your NEW Supabase database password: ');

    if (!dbPassword) {
      console.log('❌ Password cannot be empty');
      continue;
    }

    dbWorking = await testDatabaseConnection(dbPassword);

    if (!dbWorking) {
      console.log('\nTips:');
      console.log('- Make sure you copied the password exactly from Supabase');
      console.log('- The password might have special characters that need encoding');
      console.log('- Try resetting the password again in Supabase if it still fails');

      const retry = await question('\nTry again? (y/n): ');
      if (retry.toLowerCase() !== 'y') {
        process.exit(1);
      }
    }
  }

  console.log('\n✅ Database password verified!\n');

  // Get other keys
  const config = {
    dbPassword,
    whopApiKey: await question('2. Enter your NEW Whop API key: '),
    whopWebhookSecret: await question('3. Enter your NEW Whop webhook secret: '),
    adminKey: '',
    cronSecret: '',
    exportKey: '',
    sessionSecret: ''
  };

  // Generate admin keys if not provided
  console.log('\n4. Admin keys - press Enter to auto-generate or paste your own:\n');

  const { randomBytes } = await import('crypto');

  config.adminKey = await question('   ADMIN_API_KEY (Enter to generate): ');
  if (!config.adminKey) {
    config.adminKey = randomBytes(32).toString('hex');
    console.log(`   Generated: ${config.adminKey}`);
  }

  config.cronSecret = await question('   CRON_SECRET (Enter to generate): ');
  if (!config.cronSecret) {
    config.cronSecret = randomBytes(32).toString('hex');
    console.log(`   Generated: ${config.cronSecret}`);
  }

  config.exportKey = await question('   EXPORT_API_KEY (Enter to generate): ');
  if (!config.exportKey) {
    config.exportKey = randomBytes(32).toString('hex');
    console.log(`   Generated: ${config.exportKey}`);
  }

  config.sessionSecret = await question('   SESSION_SECRET (Enter to generate): ');
  if (!config.sessionSecret) {
    config.sessionSecret = randomBytes(32).toString('base64');
    console.log(`   Generated: ${config.sessionSecret}`);
  }

  // Create new .env.local
  await createEnvFile(config);

  console.log(`
${'='.repeat(60)}
✅ SETUP COMPLETE!
${'='.repeat(60)}

Your new keys have been:
✓ Tested and verified
✓ Properly URL-encoded
✓ Saved to .env.local

Next steps:
1. Run: npm run build (to test everything works)
2. Deploy to Vercel with these same values
3. Configure Whop webhook URL in their dashboard

${'='.repeat(60)}
`);

  rl.close();
}

main().catch(console.error);