import { prisma } from '../lib/db/prisma';

async function verify10Members() {
  const members = await prisma.member.findMany({
    take: 10,
    orderBy: { totalReferred: 'desc' }
  });

  console.log('🔍 VERIFYING TOP 10 MEMBERS WITH REFERRALS:\n');

  let issuesFound = 0;

  for (const member of members) {
    // Count actual referrals
    const actualReferrals = await prisma.member.count({
      where: { referredBy: member.referralCode }
    });

    // Count commissions
    const commissions = await prisma.commission.aggregate({
      where: { memberId: member.id, status: 'paid' },
      _sum: { memberShare: true },
      _count: true
    });

    const dbEarnings = commissions._sum.memberShare || 0;
    const earningsDiff = Math.abs(dbEarnings - member.lifetimeEarnings);

    console.log(`${member.username}:`);
    console.log(`  DB totalReferred: ${member.totalReferred}`);
    console.log(`  Actual referrals: ${actualReferrals}`);
    console.log(`  DB earnings: $${member.lifetimeEarnings.toFixed(2)}`);
    console.log(`  Calculated earnings: $${dbEarnings.toFixed(2)}`);
    console.log(`  Commissions: ${commissions._count} records`);

    // Validate
    if (dbEarnings > 0 && actualReferrals === 0) {
      console.log(`  ❌ ISSUE: Has earnings but no referrals!\n`);
      issuesFound++;
    } else if (actualReferrals !== member.totalReferred) {
      console.log(`  ❌ ISSUE: Referral count mismatch!\n`);
      issuesFound++;
    } else if (earningsDiff > 0.01) {
      console.log(`  ❌ ISSUE: Earnings mismatch!\n`);
      issuesFound++;
    } else {
      console.log(`  ✅ PERFECT DATA INTEGRITY\n`);
    }
  }

  console.log('='.repeat(60));
  if (issuesFound === 0) {
    console.log('🎉 ALL 10 MEMBERS HAVE PERFECT DATA INTEGRITY!');
  } else {
    console.log(`❌ Found ${issuesFound} issues`);
  }

  await prisma.$disconnect();
}

verify10Members();
