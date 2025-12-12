// Push Prisma schema to database
require('dotenv').config({ path: '.env.local' });
const { execSync } = require('child_process');

console.log('Pushing schema to database...');
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);

try {
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    stdio: 'inherit',
    env: { ...process.env }
  });
  console.log('\n✅ Schema pushed successfully!');
} catch (error) {
  console.error('❌ Schema push failed:', error.message);
}
