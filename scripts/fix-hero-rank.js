const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixHeroRank() {
  try {
    console.log('\n========================================');
    console.log('FIXING HERO MEMBER RANK TO #1');
    console.log('========================================\n');

    // Update hero to have top earnings and rank #1
    const hero = await prisma.member.update({
      where: { userId: 'hero_user_demo' },
      data: {
        lifetimeEarnings: 15000, // $150.00
        globalEarningsRank: 1,
        communityRank: 1,
      }
    });

    console.log(`✅ Updated hero member:`);
    console.log(`   Username: ${hero.username}`);
    console.log(`   New earnings: $${(hero.lifetimeEarnings / 100).toFixed(2)}`);
    console.log(`   New global rank: #${hero.globalEarningsRank}`);
    console.log(`\n🎯 Hero is now #1!`);
    console.log(`\nRefresh dashboard: http://localhost:3001/customer/mem_hero_demo\n`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixHeroRank();
