import { prisma } from '../lib/db/prisma';
import logger from '../lib/logger';


async function investigateMemberDiscrepancy() {
  const membershipId = 'mem_techwhop_80';

  logger.info(' INVESTIGATING MEMBER DATA DISCREPANCY');
  logger.debug(`Member: ${membershipId}\n`);
  logger.debug('='.repeat(60));

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
    logger.error('Member not found!');
    return;
  }

  logger.debug('\n📊 MEMBER PROFILE:');
  logger.debug(`   ID: ${member.id}`);
  logger.debug(`   Username: ${member.username}`);
  logger.debug(`   Email: ${member.email}`);
  logger.debug(`   Referral Code: ${member.referralCode}`);
  logger.debug(`   Creator: ${member.creator.companyName}`);
  logger.debug(`   Total Referred (DB field): ${member.totalReferred}`);
  logger.debug(`   Lifetime Earnings (DB field): $${member.lifetimeEarnings}`);

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

  logger.debug(`\n👥 ACTUAL REFERRALS (People referred BY this member):`);
  logger.debug(`   Count: ${actualReferrals.length}`);
  if (actualReferrals.length > 0) {
    actualReferrals.forEach((ref, i) => {
      logger.debug(`   ${i + 1}. ${ref.username} (${ref.email}) - ${ref.createdAt}`);
    });
  } else {
    logger.debug(`   ⚠️  NO REFERRALS FOUND!`);
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

  logger.debug(`\n💰 COMMISSIONS EARNED BY THIS MEMBER:`);
  logger.debug(`   Total Commission Records: ${commissionsEarned.length}`);

  const totalEarned = commissionsEarned
    .filter(c => c.status === 'paid')
    .reduce((sum, c) => sum + c.memberShare, 0);

  logger.debug(`   Total Paid: $${totalEarned.toFixed(2)}`);

  if (commissionsEarned.length > 0) {
    logger.debug(`\n   Commission Details:`);
    commissionsEarned.forEach((comm, i) => {
      logger.debug(`   ${i + 1}. Sale: $${comm.saleAmount}, Member Share: $${comm.memberShare}, Status: ${comm.status}`);
      logger.debug(`      Membership: ${comm.whopMembershipId}, Date: ${comm.createdAt}`);
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

  logger.debug(`\n🔗 WHO REFERRED THIS MEMBER?`);
  if (referrer) {
    logger.debug(`   ✅ Referred by: ${referrer.username} (${referrer.email})`);
    logger.debug(`   Referrer Code: ${referrer.referralCode}`);
  } else {
    logger.debug(`   ⚠️  This member was NOT referred by anyone (organic signup)`);
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

  logger.debug(`\n💸 COMMISSIONS PAID FOR THIS MEMBER'S PURCHASES:`);
  logger.debug(`   Total Records: ${commissionsForReferringThisMember.length}`);

  if (commissionsForReferringThisMember.length > 0) {
    logger.debug(`\n   Details:`);
    commissionsForReferringThisMember.forEach((comm, i) => {
      logger.debug(`   ${i + 1}. Paid to: ${comm.member.username} (${comm.member.referralCode})`);
      logger.debug(`      Amount: $${comm.memberShare}, Sale: $${comm.saleAmount}, Status: ${comm.status}`);
    });
  }

  // 6. DIAGNOSIS
  logger.debug('\n' + '='.repeat(60));
  logger.info(' DIAGNOSIS:\n');

  if (totalEarned > 0 && actualReferrals.length === 0) {
    logger.error('CRITICAL DATA INTEGRITY ISSUE FOUND!');
    logger.debug(`   Member has $${totalEarned.toFixed(2)} in earnings`);
    logger.debug(`   But has referred ${actualReferrals.length} people`);
    logger.debug(`\n   POSSIBLE CAUSES:`);
    logger.debug(`   1. Test data was seeded incorrectly`);
    logger.debug(`   2. Commissions are being attributed to wrong member`);
    logger.debug(`   3. referredBy field not being set correctly on new members`);
    logger.debug(`   4. Member field in Commission table pointing to wrong member`);
  } else if (totalEarned === 0 && actualReferrals.length > 0) {
    logger.warn('  POTENTIAL ISSUE:');
    logger.debug(`   Member referred ${actualReferrals.length} people`);
    logger.debug(`   But has $0 in commissions`);
    logger.debug(`   This could be normal if referred members haven't purchased yet`);
  } else if (totalEarned > 0 && actualReferrals.length > 0) {
    logger.info('DATA LOOKS CONSISTENT');
    logger.debug(`   Member referred ${actualReferrals.length} people`);
    logger.debug(`   Has $${totalEarned.toFixed(2)} in earnings`);
  } else {
    logger.info('CLEAN STATE');
    logger.debug(`   Member has no referrals and no earnings`);
  }

  logger.debug('\n' + '='.repeat(60));

  await prisma.$disconnect();
}

investigateMemberDiscrepancy().catch(console.error);
