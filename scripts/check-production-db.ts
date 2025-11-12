#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';
import logger from '../lib/logger';


// Use environment variable for database connection
// Fallback to placeholder if not set (will fail but won't expose secrets)
const prodUrl = process.env.DATABASE_URL?.replace('6543', '5432').replace('?pgbouncer=true', '') ||
                'postgresql://postgres:[REPLACE_WITH_PASSWORD]@db.eerhpmjherotaqklpqnc.supabase.co:5432/postgres';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: prodUrl,
    },
  },
});

async function checkTables() {
  try {
    logger.info(' Checking production database...\n');
    logger.debug('URL:', prodUrl.replace(/:[^:@]+@/, ':****@'));
    logger.debug('');

    // Get all tables
    const tables = await prisma.$queryRaw<Array<{tablename: string}>>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;

    logger.info('Found ${tables.length} tables:');
    tables.forEach(t => logger.debug(`   - ${t.tablename}`));
    logger.debug('');

    if (tables.length === 0) {
      logger.error('No tables found! Run: npx prisma db push');
      process.exit(1);
    }

    // Count records in main tables
    logger.info(' Record counts:');
    const [creators, members, commissions, clicks] = await Promise.all([
      prisma.creator.count(),
      prisma.member.count(),
      prisma.commission.count(),
      prisma.attributionClick.count(),
    ]);

    logger.debug(`   Creators: ${creators}`);
    logger.debug(`   Members: ${members}`);
    logger.debug(`   Commissions: ${commissions}`);
    logger.debug(`   AttributionClicks: ${clicks}`);
    logger.debug('');

    if (creators === 0 && members === 0) {
      logger.info('  Database is empty but schema exists.');
      logger.debug('   This is normal for first deployment.');
    } else {
      logger.info('Database has data!');
    }

  } catch (error: any) {
    logger.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();
