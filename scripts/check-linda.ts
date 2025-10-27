import { prisma } from '../lib/db/prisma';

async function checkLinda() {
  const member = await prisma.member.findFirst({
    where: { membershipId: 'mem_techwhop_1' }
  });

  if (!member) {
    console.log('Member not found!');
    return;
  }

  console.log('MEMBER:', member.username);
  console.log('Referral Code:', member.referralCode);
  console.log('Total Referred (DB field):', member.totalReferred);
  console.log('Lifetime Earnings (DB field):', member.lifetimeEarnings);

  // Count actual referrals
  const referrals = await prisma.member.findMany({
    where: { referredBy: member.referralCode }
  });

  console.log('\nACTUAL REFERRALS:', referrals.length);
  referrals.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.username} (${r.membershipId})`);
  });

  // Count commissions
  const commissions = await prisma.commission.findMany({
    where: { memberId: member.id }
  });

  console.log('\nCOMMISSIONS:', commissions.length);
  const totalEarned = commissions.reduce((sum, c) => sum + c.memberShare, 0);
  console.log('Total Earned:', totalEarned);

  commissions.slice(0, 5).forEach((c, i) => {
    console.log(`  ${i + 1}. For: ${c.whopMembershipId}, Amount: $${c.memberShare}`);
  });

  await prisma.$disconnect();
}

checkLinda();
