// Test database connection
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });

async function testConnection() {
  console.log('Testing database connection...\n');

  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL not found in environment variables');
    process.exit(1);
  }

  // Mask the password in the URL for display
  const maskedUrl = process.env.DATABASE_URL.replace(/:([^@]+)@/, ':****@');
  console.log('📍 Connecting to:', maskedUrl);

  const prisma = new PrismaClient();

  try {
    // Test the connection by running a simple query
    const startTime = Date.now();
    const result = await prisma.$queryRaw`SELECT current_timestamp as time, version() as version`;
    const endTime = Date.now();

    console.log('✅ Database connection successful!');
    console.log('⏱️  Response time:', endTime - startTime, 'ms');
    console.log('📊 Database info:', result[0].version.split(',')[0]);
    console.log('🕐 Server time:', result[0].time);

    // Test specific tables
    const tables = ['Creator', 'Member', 'AttributionClick', 'Commission'];
    console.log('\n📋 Testing tables:');

    for (const table of tables) {
      try {
        const count = await prisma[table.toLowerCase()].count();
        console.log(`  ✅ ${table}: ${count} records`);
      } catch (error) {
        console.log(`  ❌ ${table}: Error - ${error.message}`);
      }
    }

    console.log('\n🎉 All tests passed! Your database is properly configured.');

  } catch (error) {
    console.error('❌ Database connection failed!');
    console.error('Error:', error.message);

    if (error.message.includes('P1001')) {
      console.error('\n💡 Suggestions:');
      console.error('  - Check your database password in .env.local');
      console.error('  - Ensure your IP is whitelisted in Supabase');
      console.error('  - Verify the database URL is correct');
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();