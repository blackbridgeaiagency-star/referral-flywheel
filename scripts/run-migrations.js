/**
 * Script to run Prisma migrations with environment variables
 */

require('dotenv').config({ path: '.env.local' });
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...\n');

    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL not found in .env.local');
    }

    console.log('📊 Using database:', process.env.DATABASE_URL.split('@')[1]?.split('/')[0] || 'unknown');

    // Run prisma db push
    console.log('⚙️ Applying schema with prisma db push...');
    const { stdout, stderr } = await execPromise('npx prisma db push --accept-data-loss');

    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);

    console.log('✅ Database migrations completed successfully!');

    // Generate Prisma client
    console.log('⚙️ Generating Prisma client...');
    await execPromise('npx prisma generate');
    console.log('✅ Prisma client generated!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigrations();