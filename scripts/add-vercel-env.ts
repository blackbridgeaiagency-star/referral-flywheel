#!/usr/bin/env tsx
/**
 * Add environment variables to Vercel from your .env.local
 * Run: npx tsx scripts/add-vercel-env.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt: string): Promise<string> {
  return new Promise(resolve => rl.question(prompt, resolve));
}

const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';

async function main() {
  console.log(`\n${BLUE}${'='.repeat(60)}${RESET}`);
  console.log(`${BLUE}🔐 ADDING ENVIRONMENT VARIABLES TO VERCEL${RESET}`);
  console.log(`${BLUE}${'='.repeat(60)}${RESET}\n`);

  // Read .env.local
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.log(`${RED}❌ .env.local not found!${RESET}`);
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');

  const variables: Record<string, string> = {};

  for (const line of lines) {
    // Skip comments and empty lines
    if (line.trim().startsWith('#') || !line.trim()) continue;

    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      variables[key.trim()] = valueParts.join('=').trim();
    }
  }

  console.log(`Found ${Object.keys(variables).length} environment variables\n`);

  // Get the deployment URL
  const deploymentUrl = await question('Enter your Vercel deployment URL (e.g., referral-flywheel.vercel.app): ');

  // Update NEXT_PUBLIC_APP_URL
  variables['NEXT_PUBLIC_APP_URL'] = `https://${deploymentUrl.replace('https://', '').replace('http://', '')}`;

  console.log(`\n${YELLOW}This will add the following variables to Vercel:${RESET}`);
  Object.keys(variables).forEach(key => {
    const value = variables[key];
    const displayValue = key.includes('PUBLIC') ? value : value.substring(0, 10) + '...';
    console.log(`  ${key} = ${displayValue}`);
  });

  const confirm = await question(`\n${YELLOW}Continue? (y/n): ${RESET}`);
  if (confirm.toLowerCase() !== 'y') {
    console.log('Cancelled');
    process.exit(0);
  }

  console.log(`\n${BLUE}Adding environment variables to Vercel...${RESET}\n`);

  let success = 0;
  let failed = 0;

  for (const [key, value] of Object.entries(variables)) {
    try {
      process.stdout.write(`Adding ${key}... `);

      // Create a temporary file with the value to avoid shell escaping issues
      const tempFile = path.join(process.cwd(), '.env-temp');
      fs.writeFileSync(tempFile, value);

      // Use vercel env add with input from file
      execSync(`vercel env add ${key} production < .env-temp`, {
        stdio: 'pipe',
        input: value + '\n'
      });

      // Clean up temp file
      fs.unlinkSync(tempFile);

      console.log(`${GREEN}✓${RESET}`);
      success++;
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log(`${YELLOW}(already exists - skipping)${RESET}`);
        success++;
      } else {
        console.log(`${RED}✗ Failed${RESET}`);
        failed++;
      }
    }
  }

  console.log(`\n${BLUE}${'='.repeat(60)}${RESET}`);
  console.log(`${GREEN}✅ Added ${success} environment variables${RESET}`);
  if (failed > 0) {
    console.log(`${RED}❌ Failed to add ${failed} variables${RESET}`);
  }

  console.log(`\n${BLUE}Next steps:${RESET}`);
  console.log(`1. Deploy to production: ${YELLOW}vercel --prod${RESET}`);
  console.log(`2. Configure Whop webhook at: https://whop.com/dashboard/developer`);
  console.log(`   Set webhook URL to: ${YELLOW}https://${deploymentUrl}/api/webhooks/whop${RESET}`);
  console.log(`\n${BLUE}${'='.repeat(60)}${RESET}\n`);

  rl.close();
}

main().catch(console.error);