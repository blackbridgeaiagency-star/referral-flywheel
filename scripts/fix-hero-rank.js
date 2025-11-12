import logger from '../lib/logger';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixHeroRank() {
  try {
    logger.debug('\n========================================');
    logger.debug('FIXING HERO MEMBER RANK TO #1');
    logger.debug('========================================\n');

    // Update hero to have top earnings and rank #1
    const hero = await prisma.member.update({
      where: { userId: 'hero_user_demo' },
      data: {
        lifetimeEarnings: 15000, // $150.00
        globalEarningsRank: 1,
        communityRank: 1,
      }
    });

    logger.info('Updated hero member:');
    logger.debug(`   Username: ${hero.username}`);
    logger.debug(`   New earnings: $${(hero.lifetimeEarnings / 100).toFixed(2)}`);
    logger.debug(`   New global rank: #${hero.globalEarningsRank}`);
    logger.debug(`\n🎯 Hero is now #1!`);
    logger.debug(`\nRefresh dashboard: http://localhost:3001/customer/mem_hero_demo\n`);

  } catch (error) {
    logger.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixHeroRank();
