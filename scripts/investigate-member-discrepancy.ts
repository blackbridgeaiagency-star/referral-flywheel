import { prisma } from '../lib/db/prisma';

async function investigateMemberDiscrepancy() {
  const membershipId = 'mem_techwhop_80';

  console.log('🔍 INVESTIGATING MEMBER DATA DISCREPANCY');
  console.log(`Member: ${membershipId}\n`);
  console.log('='.repeat(60));

  // 1. Get member details
  const member = await prisma.member.findFirst({
    where: { membershipId },
    include: {
      creator: {
        select: {
          companyName: true,
          productId: true,
        }
      }
    }
  });

  if (!member) {
    console.log('❌ Member not found!');
    return;
  }

  console.log('\n📊 MEMBER PROFILE:');
  console.log(`   ID: ${member.id}`);
  console.log(`   Username: ${member.username}`);
  console.log(`   Email: ${member.email}`);
  console.log(`   Referral Code: ${member.referralCode}`);
  console.log(`   Creator: ${member.creator.companyName}`);
  console.log(`   Total Referred (DB field): ${member.totalReferred}`);
  console.log(`   Lifetime Earnings (DB field): $${member.lifetimeEarnings}`);

  // 2. Count actual referrals (people this member referred)
  const actualReferrals = await prisma.member.findMany({
    where: {
      referredBy: member.id
    },
    select: {
      id: true,
      username: true,
      email: true,
      createdAt: true,
    }
  });

  console.log(`\n👥 ACTUAL REFERRALS (People referred BY this member):`);
  console.log(`   Count: ${actualReferrals.length}`);
  if (actualReferrals.length > 0) {
    actualReferrals.forEach((ref, i) => {
      console.log(`   ${i + 1}. ${ref.username} (${ref.email}) - ${ref.createdAt}`);
    });
  } else {
    console.log(`   ⚠️  NO REFERRALS FOUND!`);
  }

  // 3. Check commissions earned BY this member
  const commissionsEarned = await prisma.commission.findMany({
    where: {
      memberId: member.id
    },
    select: {
      id: true,
      saleAmount: true,
      memberShare: true,
      status: true,
      createdAt: true,
      whopMembershipId: true,
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log(`\n💰 COMMISSIONS EARNED BY THIS MEMBER:`);
  console.log(`   Total Commission Records: ${commissionsEarned.length}`);

  const totalEarned = commissionsEarned
    .filter(c => c.status === 'paid')
    .reduce((sum, c) => sum + c.memberShare, 0);

  console.log(`   Total Paid: $${totalEarned.toFixed(2)}`);

  if (commissionsEarned.length > 0) {
    console.log(`\n   Commission Details:`);
    commissionsEarned.forEach((comm, i) => {
      console.log(`   ${i + 1}. Sale: $${comm.saleAmount}, Member Share: $${comm.memberShare}, Status: ${comm.status}`);
      console.log(`      Membership: ${comm.whopMembershipId}, Date: ${comm.createdAt}`);
    });
  }

  // 4. Check if this member was referred BY someone else
  const referrer = await prisma.member.findFirst({
    where: {
      id: member.referredBy || ''
    },
    select: {
      id: true,
      username: true,
      email: true,
      referralCode: true,
    }
  });

  console.log(`\n🔗 WHO REFERRED THIS MEMBER?`);
  if (referrer) {
    console.log(`   ✅ Referred by: ${referrer.username} (${referrer.email})`);
    console.log(`   Referrer Code: ${referrer.referralCode}`);
  } else {
    console.log(`   ⚠️  This member was NOT referred by anyone (organic signup)`);
  }

  // 5. Check commissions paid TO someone else for referring this member
  const commissionsForReferringThisMember = await prisma.commission.findMany({
    where: {
      whopMembershipId: member.membershipId
    },
    select: {
      id: true,
      memberId: true,
      memberShare: true,
      saleAmount: true,
      status: true,
      createdAt: true,
      member: {
        select: {
          username: true,
          referralCode: true,
        }
      }
    }
  });

  console.log(`\n💸 COMMISSIONS PAID FOR THIS MEMBER'S PURCHASES:`);
  console.log(`   Total Records: ${commissionsForReferringThisMember.length}`);

  if (commissionsForReferringThisMember.length > 0) {
    console.log(`\n   Details:`);
    commissionsForReferringThisMember.forEach((comm, i) => {
      console.log(`   ${i + 1}. Paid to: ${comm.member.username} (${comm.member.referralCode})`);
      console.log(`      Amount: $${comm.memberShare}, Sale: $${comm.saleAmount}, Status: ${comm.status}`);
    });
  }

  // 6. DIAGNOSIS
  console.log('\n' + '='.repeat(60));
  console.log('🔬 DIAGNOSIS:\n');

  if (totalEarned > 0 && actualReferrals.length === 0) {
    console.log('❌ CRITICAL DATA INTEGRITY ISSUE FOUND!');
    console.log(`   Member has $${totalEarned.toFixed(2)} in earnings`);
    console.log(`   But has referred ${actualReferrals.length} people`);
    console.log(`\n   POSSIBLE CAUSES:`);
    console.log(`   1. Test data was seeded incorrectly`);
    console.log(`   2. Commissions are being attributed to wrong member`);
    console.log(`   3. referredBy field not being set correctly on new members`);
    console.log(`   4. Member field in Commission table pointing to wrong member`);
  } else if (totalEarned === 0 && actualReferrals.length > 0) {
    console.log('⚠️  POTENTIAL ISSUE:');
    console.log(`   Member referred ${actualReferrals.length} people`);
    console.log(`   But has $0 in commissions`);
    console.log(`   This could be normal if referred members haven't purchased yet`);
  } else if (totalEarned > 0 && actualReferrals.length > 0) {
    console.log('✅ DATA LOOKS CONSISTENT');
    console.log(`   Member referred ${actualReferrals.length} people`);
    console.log(`   Has $${totalEarned.toFixed(2)} in earnings`);
  } else {
    console.log('✅ CLEAN STATE');
    console.log(`   Member has no referrals and no earnings`);
  }

  console.log('\n' + '='.repeat(60));

  await prisma.$disconnect();
}

investigateMemberDiscrepancy().catch(console.error);
