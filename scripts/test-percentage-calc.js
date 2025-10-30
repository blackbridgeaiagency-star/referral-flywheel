const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPercentageCalculation() {
  try {
    // Get first creator
    const creator = await prisma.creator.findFirst({
      select: { id: true, productId: true, companyName: true }
    });

    if (!creator) {
      console.log('No creator found');
      return;
    }

    console.log(`Testing creator: ${creator.companyName}`);
    console.log(`Product ID: ${creator.productId}\n`);

    // Get total revenue
    const totalCommissions = await prisma.commission.findMany({
      where: { creatorId: creator.id, status: 'paid' },
      select: { saleAmount: true }
    });
    const totalRevenue = totalCommissions.reduce((sum, c) => sum + c.saleAmount, 0);

    // Get top 10 referrers
    const topByReferrals = await prisma.member.findMany({
      where: { creatorId: creator.id },
      select: {
        id: true,
        username: true,
        referralCode: true,
        totalReferred: true,
      },
      orderBy: { totalReferred: 'desc' },
      take: 10,
    });

    console.log('=== TOP 10 REFERRERS ===');
    const dashboardData = {
      revenueStats: { totalRevenue },
      topReferrers: []
    };

    for (const member of topByReferrals) {
      // Get referred members (filtered by creator)
      const referredMembers = await prisma.member.findMany({
        where: {
          referredBy: member.referralCode,
          creatorId: creator.id
        },
        select: { membershipId: true }
      });

      const membershipIds = referredMembers.map(m => m.membershipId);

      // Get commissions for referred members (filtered by creator)
      const commissions = await prisma.commission.findMany({
        where: {
          whopMembershipId: { in: membershipIds },
          creatorId: creator.id,
          status: 'paid'
        },
        select: { saleAmount: true }
      });

      const revenueGenerated = commissions.reduce((sum, c) => sum + c.saleAmount, 0);

      dashboardData.topReferrers.push({
        username: member.username,
        totalReferred: member.totalReferred,
        revenueGenerated
      });
    }

    console.log('=== DASHBOARD DATA ===');
    console.log(`Total Revenue: $${(dashboardData.revenueStats.totalRevenue / 100).toFixed(2)}`);
    console.log(`\nTop 10 Referrers:`);

    let top10TotalRevenue = 0;
    dashboardData.topReferrers.slice(0, 10).forEach((performer, index) => {
      const revenueGenerated = performer.revenueGenerated || 0;
      top10TotalRevenue += revenueGenerated;
      console.log(`${index + 1}. ${performer.username}: ${performer.totalReferred} referrals, $${(revenueGenerated / 100).toFixed(2)} revenue generated`);
    });

    console.log(`\n=== CALCULATION ===`);
    console.log(`Sum of top 10 revenue: $${(top10TotalRevenue / 100).toFixed(2)}`);
    console.log(`Total creator revenue: $${(dashboardData.revenueStats.totalRevenue / 100).toFixed(2)}`);

    const percentage = dashboardData.revenueStats.totalRevenue > 0
      ? (top10TotalRevenue / dashboardData.revenueStats.totalRevenue) * 100
      : 0;

    console.log(`Percentage: ${percentage.toFixed(1)}%`);

    console.log(`\n=== COMPONENT WILL DISPLAY ===`);
    console.log(`Top Referrers (${percentage.toFixed(1)}% of total revenue)`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPercentageCalculation();
