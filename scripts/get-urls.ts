// Quick script to get dashboard URLs
import { PrismaClient } from '@prisma/client';
import logger from '../lib/logger';


const prisma = new PrismaClient();

async function getUrls() {
  logger.info(' Fetching dashboard URLs...\n');

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

  logger.info(' CREATOR DASHBOARDS:');
  logger.debug('='.repeat(80));
  creators.forEach(creator => {
    logger.debug(`${creator.companyName}:`);
    logger.debug(`  http://localhost:3000/seller-product/${creator.productId}`);
    logger.debug();
  });

  logger.debug('\n👥 MEMBER DASHBOARDS (Top 15 by Referrals):');
  logger.debug('='.repeat(80));
  members.forEach((member, i) => {
    logger.debug(`${i + 1}. ${member.username} (${member.creator.companyName})`);
    logger.debug(`   Referrals: ${member.totalReferred} | Earnings: $${member.lifetimeEarnings.toFixed(2)}`);
    logger.debug(`   http://localhost:3000/customer/${member.membershipId}`);
    logger.debug();
  });

  logger.debug('\n🔗 REFERRAL LINKS (First 5 Members):');
  logger.debug('='.repeat(80));
  members.slice(0, 5).forEach(member => {
    logger.debug(`${member.username}: http://localhost:3000/r/${member.referralCode}`);
  });
}

getUrls()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
