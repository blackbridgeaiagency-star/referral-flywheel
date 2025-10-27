// scripts/check-earnings.ts
import { prisma } from '../lib/db/prisma';

async function checkEarnings() {
  try {
    // Total members
    const totalMembers = await prisma.member.count();
    console.log(`\n📊 Total Members: ${totalMembers}`);

    // Members with commissions (earnings)
    const membersWithEarnings = await prisma.commission.groupBy({
      by: ['memberId'],
      where: { status: 'paid' },
      _count: {
        memberId: true,
      },
    });

    console.log(`\n💰 Members with Earnings: ${membersWithEarnings.length}`);
    console.log(`📭 Members without Earnings: ${totalMembers - membersWithEarnings.length}`);

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

    console.log('\n🏆 Top 10 Earners:');
    const memberIds = topEarners.map(e => e.memberId);
    const members = await prisma.member.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, username: true },
    });

    topEarners.forEach((earner, i) => {
      const member = members.find(m => m.id === earner.memberId);
      console.log(`  ${i + 1}. ${member?.username}: $${earner._sum.memberShare?.toFixed(2)}`);
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkEarnings();
