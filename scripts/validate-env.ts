#!/usr/bin/env tsx
/**
 * Environment Variable Validation Script
 *
 * Run this script to validate all required environment variables
 * Usage: npm run validate:env
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';
import logger from '../lib/logger';


// Load environment variables
const envPath = resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  config({ path: envPath });
  logger.info('Loaded .env.local file');
} else {
  logger.warn('  No .env.local file found, using process environment');
}

// Define required environment variables and their validation rules
interface EnvVar {
  name: string;
  required: boolean;
  pattern?: RegExp;
  description: string;
  example?: string;
}

const envVars: EnvVar[] = [
  {
    name: 'DATABASE_URL',
    required: true,
    pattern: /^postgresql:\/\/.+@.+:\d+\/.+$/,
    description: 'PostgreSQL connection string with pooling',
    example: 'postgresql://postgres:[PASSWORD]@db.[PROJECT_ID].supabase.co:6543/postgres?pgbouncer=true'
  },
  {
    name: 'WHOP_API_KEY',
    required: true,
    description: 'Whop API key for server-side operations',
    example: 'whop_api_...'
  },
  {
    name: 'WHOP_WEBHOOK_SECRET',
    required: true,
    description: 'Secret for verifying Whop webhook signatures',
    example: 'whsec_...'
  },
  {
    name: 'NEXT_PUBLIC_WHOP_APP_ID',
    required: true,
    pattern: /^app_[a-zA-Z0-9]+$/,
    description: 'Whop application ID',
    example: 'app_xa1a8NaAKUVPuO'
  },
  {
    name: 'NEXT_PUBLIC_WHOP_COMPANY_ID',
    required: true,
    pattern: /^biz_[a-zA-Z0-9]+$/,
    description: 'Whop company/business ID',
    example: 'biz_kkGoY7OvzWXRdK'
  },
  {
    name: 'NEXT_PUBLIC_APP_URL',
    required: true,
    pattern: /^https?:\/\/.+$/,
    description: 'Application base URL',
    example: 'https://referral-flywheel.vercel.app'
  },
  {
    name: 'CRON_SECRET',
    required: false,
    description: 'Secret for protecting cron endpoints',
    example: 'Generated with: openssl rand -hex 32'
  },
  {
    name: 'IP_HASH_SALT',
    required: false,
    description: 'Salt for hashing IP addresses',
    example: 'Generated with: openssl rand -hex 16'
  }
];

// Color output helpers
const red = (text: string) => `\x1b[31m${text}\x1b[0m`;
const green = (text: string) => `\x1b[32m${text}\x1b[0m`;
const yellow = (text: string) => `\x1b[33m${text}\x1b[0m`;
const cyan = (text: string) => `\x1b[36m${text}\x1b[0m`;

// Validation function
function validateEnv(): boolean {
  logger.debug('\n' + cyan('='.repeat(60)));
  logger.debug(cyan('Environment Variable Validation'));
  logger.debug(cyan('='.repeat(60)) + '\n');

  let hasErrors = false;
  let hasWarnings = false;

  for (const envVar of envVars) {
    const value = process.env[envVar.name];
    const exists = value !== undefined && value !== '';

    if (envVar.required && !exists) {
      logger.debug(red(`❌ ${envVar.name}: MISSING (required)`));
      logger.debug(`   ${envVar.description}`);
      if (envVar.example) {
        logger.debug(`   Example: ${envVar.example}\n`);
      }
      hasErrors = true;
    } else if (!envVar.required && !exists) {
      logger.debug(yellow(`⚠️  ${envVar.name}: Not set (optional)`));
      logger.debug(`   ${envVar.description}\n`);
      hasWarnings = true;
    } else if (exists) {
      // Check pattern if defined
      if (envVar.pattern && !envVar.pattern.test(value!)) {
        logger.debug(red(`❌ ${envVar.name}: INVALID FORMAT`));
        logger.debug(`   Current: ${value?.substring(0, 30)}...`);
        logger.debug(`   Expected pattern: ${envVar.pattern}`);
        if (envVar.example) {
          logger.debug(`   Example: ${envVar.example}\n`);
        }
        hasErrors = true;
      } else {
        // Mask sensitive values
        const displayValue = envVar.name.includes('SECRET') || envVar.name.includes('KEY') || envVar.name.includes('PASSWORD')
          ? value!.substring(0, 10) + '...' + value!.substring(value!.length - 4)
          : value!.length > 50
          ? value!.substring(0, 47) + '...'
          : value;

        logger.debug(green(`✅ ${envVar.name}: ${displayValue}`));
      }
    }
  }

  // Additional DATABASE_URL checks
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    logger.debug('\n' + cyan('Database URL Analysis:'));
    try {
      const url = new URL(dbUrl);
      logger.debug(`   Protocol: ${url.protocol}`);
      logger.debug(`   Host: ${url.hostname}`);
      logger.debug(`   Port: ${url.port || '5432'}`);
      logger.debug(`   Database: ${url.pathname.slice(1).split('?')[0]}`);

      // Check for pooling
      if (!dbUrl.includes('pgbouncer=true')) {
        logger.debug(yellow('   ⚠️  Warning: Connection pooling not enabled (missing ?pgbouncer=true)'));
        hasWarnings = true;
      } else {
        logger.debug(green('   ✅ Connection pooling enabled'));
      }

      // Check port
      if (url.port === '6543') {
        logger.debug(green('   ✅ Using pooled connection port (6543)'));
      } else if (url.port === '5432' || !url.port) {
        logger.debug(yellow('   ⚠️  Using direct connection port (5432) - consider using 6543 for pooling'));
        hasWarnings = true;
      }
    } catch (error) {
      logger.debug(red('   ❌ Invalid DATABASE_URL format'));
      hasErrors = true;
    }
  }

  // Summary
  logger.debug('\n' + cyan('='.repeat(60)));
  if (hasErrors) {
    logger.debug(red('❌ Validation FAILED - Fix the errors above'));
    logger.debug(cyan('='.repeat(60)) + '\n');
    return false;
  } else if (hasWarnings) {
    logger.debug(yellow('⚠️  Validation passed with warnings'));
    logger.debug(cyan('='.repeat(60)) + '\n');
    return true;
  } else {
    logger.debug(green('✅ All environment variables validated successfully!'));
    logger.debug(cyan('='.repeat(60)) + '\n');
    return true;
  }
}

// Test database connection if validation passes
async function testConnection() {
  if (!process.env.DATABASE_URL) {
    logger.debug(red('Cannot test database connection - DATABASE_URL not set\n'));
    return false;
  }

  logger.debug(cyan('Testing database connection...'));

  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - startTime;

    logger.debug(green(`✅ Database connection successful (${latency}ms latency)\n`));
    await prisma.$disconnect();
    return true;
  } catch (error: any) {
    logger.debug(red('❌ Database connection failed:'));
    logger.debug(red(`   ${error.message}\n`));

    if (error.message.includes("Can't reach database server")) {
      logger.debug(yellow('Troubleshooting tips:'));
      logger.debug('1. Check if your Supabase project is active (not paused)');
      logger.debug('2. Verify the DATABASE_URL is correct');
      logger.debug('3. Ensure password is properly URL-encoded');
      logger.debug('4. Try using port 6543 with ?pgbouncer=true\n');
    }

    return false;
  }
}

// Main execution
async function main() {
  const isValid = validateEnv();

  if (isValid) {
    await testConnection();
  } else {
    process.exit(1);
  }
}

main().catch(console.error);