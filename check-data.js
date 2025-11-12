import logger from './lib/logger';

// Quick script to check database data
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    // Count records
    const memberCount = await prisma.member.count();
    const commissionCount = await prisma.commission.count();
    const clickCount = await prisma.attributionClick.count();
    const creatorCount = await prisma.creator.count();

    logger.debug('Database Summary:');
    logger.debug('- Creators: ' + creatorCount);
    logger.debug('- Members: ' + memberCount);
    logger.debug('- Commissions: ' + commissionCount);
    logger.debug('- Attribution Clicks: ' + clickCount);

    // Check recent commissions
    const recentCommissions = await prisma.commission.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { member: true }
    });

    logger.debug('\nRecent Commissions:');
    recentCommissions.forEach(c => {
      logger.debug('- ' + c.member.username + ': $' + c.memberShare);
    });

    // Check top earners
    const topEarners = await prisma.member.findMany({
      take: 5,
      orderBy: { lifetimeEarnings: 'desc' },
      select: { username: true, lifetimeEarnings: true, monthlyEarnings: true }
    });

    logger.debug('\nTop Earners:');
    topEarners.forEach(m => {
      logger.debug('- ' + m.username + ': $' + m.lifetimeEarnings + ' lifetime, $' + m.monthlyEarnings + ' monthly');
    });

    // Get URLs for dashboards
    const creators = await prisma.creator.findMany();
    const sampleMembers = await prisma.member.findMany({ take: 5 });

    logger.debug('\n🎨 CREATOR DASHBOARDS:');
    creators.forEach(c => {
      logger.debug('- http://localhost:3004/seller-product/' + c.productId + ' (' + c.communityName + ')');
    });

    logger.debug('\n👤 MEMBER DASHBOARDS (Sample):');
    sampleMembers.forEach(m => {
      logger.debug('- http://localhost:3004/customer/' + m.membershipId + ' (' + m.name + ')');
    });

  } catch (error) {
    logger.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
