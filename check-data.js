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

    console.log('Database Summary:');
    console.log('- Creators: ' + creatorCount);
    console.log('- Members: ' + memberCount);
    console.log('- Commissions: ' + commissionCount);
    console.log('- Attribution Clicks: ' + clickCount);

    // Check recent commissions
    const recentCommissions = await prisma.commission.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { member: true }
    });

    console.log('\nRecent Commissions:');
    recentCommissions.forEach(c => {
      console.log('- ' + c.member.username + ': $' + c.memberShare);
    });

    // Check top earners
    const topEarners = await prisma.member.findMany({
      take: 5,
      orderBy: { lifetimeEarnings: 'desc' },
      select: { username: true, lifetimeEarnings: true, monthlyEarnings: true }
    });

    console.log('\nTop Earners:');
    topEarners.forEach(m => {
      console.log('- ' + m.username + ': $' + m.lifetimeEarnings + ' lifetime, $' + m.monthlyEarnings + ' monthly');
    });

    // Get URLs for dashboards
    const creators = await prisma.creator.findMany();
    const sampleMembers = await prisma.member.findMany({ take: 5 });

    console.log('\n🎨 CREATOR DASHBOARDS:');
    creators.forEach(c => {
      console.log('- http://localhost:3004/seller-product/' + c.productId + ' (' + c.communityName + ')');
    });

    console.log('\n👤 MEMBER DASHBOARDS (Sample):');
    sampleMembers.forEach(m => {
      console.log('- http://localhost:3004/customer/' + m.membershipId + ' (' + m.name + ')');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
