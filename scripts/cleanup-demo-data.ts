// scripts/cleanup-demo-data.ts
// 🧹 CLEANUP DEMO DATA after taking screenshots

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Starting demo data cleanup...\n');

  // Delete all demo members
  const deletedMembers = await prisma.member.deleteMany({
    where: {
      OR: [
        { userId: { startsWith: 'hero_user' } },
        { userId: { startsWith: 'top_earner' } },
        { userId: { startsWith: 'regular_member' } },
      ],
    },
  });

  console.log(`✅ Deleted ${deletedMembers.count} demo members`);
  console.log('✅ Demo data cleanup complete!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error cleaning up demo data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
