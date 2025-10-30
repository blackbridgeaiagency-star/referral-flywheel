// scripts/cleanup-demo-data.ts
// 🧹 CLEANUP DEMO DATA after taking screenshots
// SAFE: Only removes demo data, preserves real user data

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Starting demo data cleanup...\n');
  console.log('⚠️  This will ONLY delete demo data (emails with @demo.com and demo user IDs)\n');
  console.log('✅ Real user data will be preserved!\n');

  // Step 1: Find all demo member IDs
  console.log('🔍 Finding demo members...');
  const demoMembers = await prisma.member.findMany({
    where: {
      OR: [
        { userId: 'hero_user_demo' },
        { userId: { startsWith: 'top_earner_' } },
        { userId: { startsWith: 'mid_member_' } },
        { userId: { startsWith: 'regular_member_' } },
        { userId: { startsWith: 'oct_member_' } }, // October members from hero
        { userId: { startsWith: 'oct_ref_' } }, // October referrals from top performers
        { email: { contains: '@demo.com' } },
      ],
    },
    select: { id: true, userId: true, email: true },
  });
  const demoMemberIds = demoMembers.map(m => m.id);
  console.log(`   Found ${demoMembers.length} demo members\n`);

  // Step 2: Delete attribution clicks
  console.log('🔗 Deleting demo attribution clicks...');
  const attributions = await prisma.attributionClick.deleteMany({
    where: {
      memberId: { in: demoMemberIds },
    },
  });
  console.log(`   ✅ Deleted ${attributions.count} attribution clicks\n`);

  // Step 3: Delete share events
  console.log('📤 Deleting demo share events...');
  const shares = await prisma.shareEvent.deleteMany({
    where: {
      memberId: { in: demoMemberIds },
    },
  });
  console.log(`   ✅ Deleted ${shares.count} share events\n`);

  // Step 4: Delete commissions
  console.log('💰 Deleting demo commissions...');
  const commissions = await prisma.commission.deleteMany({
    where: {
      memberId: { in: demoMemberIds },
    },
  });
  console.log(`   ✅ Deleted ${commissions.count} commissions\n`);

  // Step 5: Delete demo members
  console.log('👥 Deleting demo members...');
  const members = await prisma.member.deleteMany({
    where: {
      id: { in: demoMemberIds },
    },
  });
  console.log(`   ✅ Deleted ${members.count} members\n`);

  // Step 6: Reset creator stats (only if no real members exist)
  console.log('📊 Checking for real members...');
  const realMemberCount = await prisma.member.count();

  if (realMemberCount === 0) {
    console.log('   No real members found, resetting creator stats...');
    await prisma.creator.updateMany({
      where: { companyId: 'biz_kkGoY7OvzWXRdK' },
      data: {
        totalReferrals: 0,
        totalRevenue: 0,
        monthlyRevenue: 0,
      },
    });
    console.log('   ✅ Creator stats reset\n');
  } else {
    console.log(`   ✅ Found ${realMemberCount} real members, keeping creator stats intact\n`);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Demo data cleanup complete!\n');
  console.log('📊 Summary:');
  console.log(`   • Members deleted: ${members.count}`);
  console.log(`   • Commissions deleted: ${commissions.count}`);
  console.log(`   • Attribution clicks deleted: ${attributions.count}`);
  console.log(`   • Share events deleted: ${shares.count}`);
  console.log(`   • Real members preserved: ${realMemberCount}`);
  console.log('\n🎯 Your database is now ready for real users!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error('❌ Error cleaning up demo data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
