import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const member = await prisma.member.findUnique({
    where: { membershipId: 'mem_gamezone_3' },
    select: {
      username: true,
      totalReferred: true,
      globalReferralsRank: true,
      globalEarningsRank: true,
      communityRank: true
    }
  });

  console.log('Member:', member);

  // Also check how many members have more referrals
  const betterMembers = await prisma.member.count({
    where: {
      totalReferred: {
        gt: member?.totalReferred || 0
      }
    }
  });

  console.log('\nMembers with MORE referrals than this member:', betterMembers);
  console.log('Expected rank:', betterMembers + 1);
}

check().finally(() => prisma.$disconnect());
