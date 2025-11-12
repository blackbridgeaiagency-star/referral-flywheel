#!/usr/bin/env tsx
/**
 * Quick database connection test
 * Tests the DATABASE_URL provided by the user
 */

import { PrismaClient } from '@prisma/client';
import logger from '../lib/logger';


// Use environment variable for database connection
// Fallback to placeholder if not set (will fail but won't expose secrets)
const testUrl = process.env.DATABASE_URL ||
                'postgresql://postgres:[REPLACE_WITH_PASSWORD]@db.eerhpmjherotaqklpqnc.supabase.co:6543/postgres?pgbouncer=true&connection_limit=1';

async function testConnection() {
  logger.info(' Testing database connection...\n');
  logger.debug('URL:', testUrl.replace(/:[^:@]+@/, ':****@')); // Mask password
  logger.debug('');

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: testUrl,
      },
    },
    log: ['error', 'warn'],
  });

  try {
    const startTime = Date.now();

    // Test 1: Basic connection
    logger.debug('Test 1: Basic connection...');
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - startTime;
    logger.info('Connection successful (${latency}ms latency)\n');

    // Test 2: Check tables
    logger.debug('Test 2: Checking tables...');
    const tables = await prisma.$queryRaw<Array<{tablename: string}>>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;
    logger.info('Found ${tables.length} tables:');
    tables.forEach(t => logger.debug(`   - ${t.tablename}`));
    logger.debug('');

    // Test 3: Check if main tables exist
    logger.debug('Test 3: Checking main tables...');
    const requiredTables = ['Creator', 'Member', 'Commission', 'AttributionClick'];
    const existingTables = tables.map(t => t.tablename);

    for (const table of requiredTables) {
      if (existingTables.includes(table)) {
        logger.debug(`   ✅ ${table} exists`);
      } else {
        logger.debug(`   ❌ ${table} missing`);
      }
    }
    logger.debug('');

    // Test 4: Count records
    logger.debug('Test 4: Counting records...');
    try {
      const [creators, members, commissions] = await Promise.all([
        prisma.creator.count(),
        prisma.member.count(),
        prisma.commission.count(),
      ]);
      logger.debug(`   Creators: ${creators}`);
      logger.debug(`   Members: ${members}`);
      logger.debug(`   Commissions: ${commissions}`);
    } catch (error) {
      logger.debug('   ⚠️ Could not count records (tables might not exist)');
    }

    logger.debug('\n✅ All tests passed! Database is accessible.\n');
    logger.debug('Next steps:');
    logger.debug('1. Ensure this DATABASE_URL is set in Vercel');
    logger.debug('2. Include ?pgbouncer=true&connection_limit=1');
    logger.debug('3. Redeploy your application');

  } catch (error: any) {
    logger.error('\n❌ Connection failed!\n');
    logger.error('Error:', error.message);

    if (error.message.includes("Can't reach database server")) {
      logger.debug('\nPossible causes:');
      logger.debug('1. Supabase project is paused (check Supabase dashboard)');
      logger.debug('2. Incorrect host or port');
      logger.debug('3. Network/firewall issues');
    } else if (error.message.includes('authentication failed')) {
      logger.debug('\nPossible causes:');
      logger.debug('1. Incorrect password');
      logger.debug('2. Password needs URL encoding for special characters');
      logger.debug('3. User permissions issue');
    } else if (error.code === 'P1001') {
      logger.debug('\nDatabase server is unreachable. Check if Supabase project is active.');
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection().catch(console.error);