// scripts/check-earnings.ts
import { prisma } from '../lib/db/prisma';
import logger from '../lib/logger';


async function checkEarnings() {
  try {
    // Total members
    const totalMembers = await prisma.member.count();
    logger.debug(`\n📊 Total Members: ${totalMembers}`);

    // Members with commissions (earnings)
    const membersWithEarnings = await prisma.commission.groupBy({
      by: ['memberId'],
      where: { status: 'paid' },
      _count: {
        memberId: true,
      },
    });

    logger.debug(`\n💰 Members with Earnings: ${membersWithEarnings.length}`);
    logger.info(' Members without Earnings: ${totalMembers - membersWithEarnings.length}');

    // Top 10 earners
    const topEarners = await prisma.commission.groupBy({
      by: ['memberId'],
      where: { status: 'paid' },
      _sum: {
        memberShare: true,
      },
      orderBy: {
        _sum: {
          memberShare: 'desc',
        },
      },
      take: 10,
    });

    logger.debug('\n🏆 Top 10 Earners:');
    const memberIds = topEarners.map(e => e.memberId);
    const members = await prisma.member.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, username: true },
    });

    topEarners.forEach((earner, i) => {
      const member = members.find(m => m.id === earner.memberId);
      logger.debug(`  ${i + 1}. ${member?.username}: $${earner._sum.memberShare?.toFixed(2)}`);
    });

    await prisma.$disconnect();
  } catch (error) {
    logger.error('❌ Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkEarnings();
