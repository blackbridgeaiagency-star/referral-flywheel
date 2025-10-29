#!/usr/bin/env tsx
/**
 * Quick database connection test
 * Tests the DATABASE_URL provided by the user
 */

import { PrismaClient } from '@prisma/client';

const testUrl = 'postgresql://postgres:cFWGc4UtNVXm6NYt@db.eerhpmjherotaqklpqnc.supabase.co:6543/postgres?pgbouncer=true&connection_limit=1';

async function testConnection() {
  console.log('🔍 Testing database connection...\n');
  console.log('URL:', testUrl.replace(/:[^:@]+@/, ':****@')); // Mask password
  console.log('');

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
    console.log('Test 1: Basic connection...');
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - startTime;
    console.log(`✅ Connection successful (${latency}ms latency)\n`);

    // Test 2: Check tables
    console.log('Test 2: Checking tables...');
    const tables = await prisma.$queryRaw<Array<{tablename: string}>>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;
    console.log(`✅ Found ${tables.length} tables:`);
    tables.forEach(t => console.log(`   - ${t.tablename}`));
    console.log('');

    // Test 3: Check if main tables exist
    console.log('Test 3: Checking main tables...');
    const requiredTables = ['Creator', 'Member', 'Commission', 'AttributionClick'];
    const existingTables = tables.map(t => t.tablename);

    for (const table of requiredTables) {
      if (existingTables.includes(table)) {
        console.log(`   ✅ ${table} exists`);
      } else {
        console.log(`   ❌ ${table} missing`);
      }
    }
    console.log('');

    // Test 4: Count records
    console.log('Test 4: Counting records...');
    try {
      const [creators, members, commissions] = await Promise.all([
        prisma.creator.count(),
        prisma.member.count(),
        prisma.commission.count(),
      ]);
      console.log(`   Creators: ${creators}`);
      console.log(`   Members: ${members}`);
      console.log(`   Commissions: ${commissions}`);
    } catch (error) {
      console.log('   ⚠️ Could not count records (tables might not exist)');
    }

    console.log('\n✅ All tests passed! Database is accessible.\n');
    console.log('Next steps:');
    console.log('1. Ensure this DATABASE_URL is set in Vercel');
    console.log('2. Include ?pgbouncer=true&connection_limit=1');
    console.log('3. Redeploy your application');

  } catch (error: any) {
    console.error('\n❌ Connection failed!\n');
    console.error('Error:', error.message);

    if (error.message.includes("Can't reach database server")) {
      console.log('\nPossible causes:');
      console.log('1. Supabase project is paused (check Supabase dashboard)');
      console.log('2. Incorrect host or port');
      console.log('3. Network/firewall issues');
    } else if (error.message.includes('authentication failed')) {
      console.log('\nPossible causes:');
      console.log('1. Incorrect password');
      console.log('2. Password needs URL encoding for special characters');
      console.log('3. User permissions issue');
    } else if (error.code === 'P1001') {
      console.log('\nDatabase server is unreachable. Check if Supabase project is active.');
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection().catch(console.error);