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
      console.log('Hero not found');
      return;
    }

    console.log('\n========================================');
    console.log('HERO MEMBER RANK CHECK');
    console.log('========================================\n');
    console.log(`Hero: ${hero.username}`);
    console.log(`Lifetime Earnings: $${(hero.lifetimeEarnings / 100).toFixed(2)}`);
    console.log(`Total Referred: ${hero.totalReferred}`);
    console.log(`Current globalEarningsRank: #${hero.globalEarningsRank}\n`);

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

    console.log('Top 10 by actual earnings:');
    allMembersByEarnings.forEach((m, index) => {
      const isHero = m.username === hero.username;
      console.log(`  ${index + 1}. ${m.username}: $${(m.lifetimeEarnings / 100).toFixed(2)} (DB rank: #${m.globalEarningsRank}) ${isHero ? '← HERO' : ''}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkHeroRank();
