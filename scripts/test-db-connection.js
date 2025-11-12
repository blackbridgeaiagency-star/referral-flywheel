import logger from '../lib/logger';

// Test database connection
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });

async function testConnection() {
  logger.debug('Testing database connection...\n');

  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    logger.error('❌ ERROR: DATABASE_URL not found in environment variables');
    process.exit(1);
  }

  // Mask the password in the URL for display
  const maskedUrl = process.env.DATABASE_URL.replace(/:([^@]+)@/, ':****@');
  logger.info(' Connecting to:', maskedUrl);

  const prisma = new PrismaClient();

  try {
    // Test the connection by running a simple query
    const startTime = Date.now();
    const result = await prisma.$queryRaw`SELECT current_timestamp as time, version() as version`;
    const endTime = Date.now();

    logger.info('Database connection successful!');
    logger.debug('⏱️  Response time:', endTime - startTime, 'ms');
    logger.info(' Database info:', result[0].version.split(',')[0]);
    logger.info(' Server time:', result[0].time);

    // Test specific tables
    const tables = ['Creator', 'Member', 'AttributionClick', 'Commission'];
    logger.debug('\n📋 Testing tables:');

    for (const table of tables) {
      try {
        const count = await prisma[table.toLowerCase()].count();
        logger.debug(`  ✅ ${table}: ${count} records`);
      } catch (error) {
        logger.debug(`  ❌ ${table}: Error - ${error.message}`);
      }
    }

    logger.debug('\n🎉 All tests passed! Your database is properly configured.');

  } catch (error) {
    logger.error('❌ Database connection failed!');
    logger.error('Error:', error.message);

    if (error.message.includes('P1001')) {
      logger.error('\n💡 Suggestions:');
      logger.error('  - Check your database password in .env.local');
      logger.error('  - Ensure your IP is whitelisted in Supabase');
      logger.error('  - Verify the database URL is correct');
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();