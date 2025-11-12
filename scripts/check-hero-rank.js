import logger from '../lib/logger';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkHeroRank() {
  try {
    // Get hero member
    const hero = await prisma.member.findFirst({
      where: { userId: 'hero_user_demo' },
      select: {
        username: true,
        lifetimeEarnings: true,
        globalEarningsRank: true,
        totalReferred: true,
      }
    });

    if (!hero) {
      logger.debug('Hero not found');
      return;
    }

    logger.debug('\n========================================');
    logger.debug('HERO MEMBER RANK CHECK');
    logger.debug('========================================\n');
    logger.debug(`Hero: ${hero.username}`);
    logger.debug(`Lifetime Earnings: $${(hero.lifetimeEarnings / 100).toFixed(2)}`);
    logger.debug(`Total Referred: ${hero.totalReferred}`);
    logger.debug(`Current globalEarningsRank: #${hero.globalEarningsRank}\n`);

    // Get all members sorted by earnings to see actual rank
    const allMembersByEarnings = await prisma.member.findMany({
      orderBy: { lifetimeEarnings: 'desc' },
      select: {
        username: true,
        lifetimeEarnings: true,
        globalEarningsRank: true,
      },
      take: 10
    });

    logger.debug('Top 10 by actual earnings:');
    allMembersByEarnings.forEach((m, index) => {
      const isHero = m.username === hero.username;
      logger.debug(`  ${index + 1}. ${m.username}: $${(m.lifetimeEarnings / 100).toFixed(2)} (DB rank: #${m.globalEarningsRank}) ${isHero ? '← HERO' : ''}`);
    });

  } catch (error) {
    logger.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkHeroRank();
