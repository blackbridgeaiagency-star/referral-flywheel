// Quick script to get dashboard URLs
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getUrls() {
  console.log('📋 Fetching dashboard URLs...\n');

  // Get creators
  const creators = await prisma.creator.findMany({
    select: {
      companyName: true,
      productId: true,
    },
    orderBy: { companyName: 'asc' }
  });

  // Get first 15 members (5 from each community)
  const members = await prisma.member.findMany({
    take: 15,
    select: {
      username: true,
      membershipId: true,
      referralCode: true,
      totalReferred: true,
      lifetimeEarnings: true,
      creator: {
        select: { companyName: true }
      }
    },
    orderBy: { totalReferred: 'desc' }
  });

  console.log('🏢 CREATOR DASHBOARDS:');
  console.log('='.repeat(80));
  creators.forEach(creator => {
    console.log(`${creator.companyName}:`);
    console.log(`  http://localhost:3000/seller-product/${creator.productId}`);
    console.log();
  });

  console.log('\n👥 MEMBER DASHBOARDS (Top 15 by Referrals):');
  console.log('='.repeat(80));
  members.forEach((member, i) => {
    console.log(`${i + 1}. ${member.username} (${member.creator.companyName})`);
    console.log(`   Referrals: ${member.totalReferred} | Earnings: $${member.lifetimeEarnings.toFixed(2)}`);
    console.log(`   http://localhost:3000/customer/${member.membershipId}`);
    console.log();
  });

  console.log('\n🔗 REFERRAL LINKS (First 5 Members):');
  console.log('='.repeat(80));
  members.slice(0, 5).forEach(member => {
    console.log(`${member.username}: http://localhost:3000/r/${member.referralCode}`);
  });
}

getUrls()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
