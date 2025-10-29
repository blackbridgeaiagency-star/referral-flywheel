#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';

const prodUrl = 'postgresql://postgres:cFWGc4UtNVXm6NYt@db.eerhpmjherotaqklpqnc.supabase.co:5432/postgres';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: prodUrl,
    },
  },
});

async function checkTables() {
  try {
    console.log('🔍 Checking production database...\n');
    console.log('URL:', prodUrl.replace(/:[^:@]+@/, ':****@'));
    console.log('');

    // Get all tables
    const tables = await prisma.$queryRaw<Array<{tablename: string}>>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;

    console.log(`✅ Found ${tables.length} tables:`);
    tables.forEach(t => console.log(`   - ${t.tablename}`));
    console.log('');

    if (tables.length === 0) {
      console.log('❌ No tables found! Run: npx prisma db push');
      process.exit(1);
    }

    // Count records in main tables
    console.log('📊 Record counts:');
    const [creators, members, commissions, clicks] = await Promise.all([
      prisma.creator.count(),
      prisma.member.count(),
      prisma.commission.count(),
      prisma.attributionClick.count(),
    ]);

    console.log(`   Creators: ${creators}`);
    console.log(`   Members: ${members}`);
    console.log(`   Commissions: ${commissions}`);
    console.log(`   AttributionClicks: ${clicks}`);
    console.log('');

    if (creators === 0 && members === 0) {
      console.log('ℹ️  Database is empty but schema exists.');
      console.log('   This is normal for first deployment.');
    } else {
      console.log('✅ Database has data!');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();
