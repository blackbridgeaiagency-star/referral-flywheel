import logger from '../lib/logger';

// scripts/boost-referral-momentum.js
// Boosts referral momentum by giving more members at least 1 referral

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TARGET_MOMENTUM = 35; // Target 35% momentum (will glow at >30%)

async function boostReferralMomentum() {
  try {
    const productId = 'prod_ImvAT3IIRbPBT';

    logger.debug('\n========================================');
    logger.debug('BOOSTING REFERRAL MOMENTUM');
    logger.debug('========================================\n');

    // Get the creator
    const creator = await prisma.creator.findFirst({
      where: { productId },
      select: { id: true, companyName: true }
    });

    if (!creator) {
      logger.error('Creator not found');
      return;
    }

    logger.info('Creator: ${creator.companyName}\n');

    // Get total members
    const totalMembers = await prisma.member.count({
      where: { creatorId: creator.id }
    });

    // Get current momentum
    const membersWithReferrals = await prisma.member.count({
      where: {
        creatorId: creator.id,
        totalReferred: { gt: 0 }
      }
    });

    const currentMomentum = (membersWithReferrals / totalMembers) * 100;
    logger.info(' Current Stats:');
    logger.debug(`   Total members: ${totalMembers}`);
    logger.debug(`   Members with referrals: ${membersWithReferrals}`);
    logger.debug(`   Current momentum: ${currentMomentum.toFixed(1)}%\n`);

    // Calculate target
    const targetMembersWithReferrals = Math.ceil(totalMembers * (TARGET_MOMENTUM / 100));
    const membersToUpdate = targetMembersWithReferrals - membersWithReferrals;

    logger.info(' Target Stats:');
    logger.debug(`   Target momentum: ${TARGET_MOMENTUM}%`);
    logger.debug(`   Target members with referrals: ${targetMembersWithReferrals}`);
    logger.debug(`   Members to update: ${membersToUpdate}\n`);

    if (membersToUpdate <= 0) {
      logger.info('Already at target momentum!');
      return;
    }

    // Get members with 0 referrals
    const membersWithNoReferrals = await prisma.member.findMany({
      where: {
        creatorId: creator.id,
        totalReferred: 0
      },
      select: { id: true, username: true },
      take: membersToUpdate
    });

    logger.info(' Updating ${membersWithNoReferrals.length} members...\n');

    // Update each member to have 1-3 referrals
    let updated = 0;
    for (const member of membersWithNoReferrals) {
      const referralCount = Math.floor(Math.random() * 3) + 1; // 1-3 referrals

      await prisma.member.update({
        where: { id: member.id },
        data: { totalReferred: referralCount }
      });

      updated++;

      if (updated <= 10 || updated % 50 === 0) {
        logger.debug(`   ${updated}/${membersWithNoReferrals.length} - ${member.username}: 0 → ${referralCount} referrals`);
      }
    }

    // Calculate new momentum
    const newMembersWithReferrals = membersWithReferrals + updated;
    const newMomentum = (newMembersWithReferrals / totalMembers) * 100;

    logger.debug(`\n========================================`);
    logger.debug(`SUCCESS!`);
    logger.debug(`========================================`);
    logger.debug(`Members updated: ${updated}`);
    logger.debug(`New momentum: ${newMomentum.toFixed(1)}%`);

    if (newMomentum > 30) {
      logger.debug(`\n🔥 MOMENTUM CARD WILL GLOW! (>30%)`);
    } else {
      logger.debug(`\n⚠️  Almost there! Need ${((30 / 100 * totalMembers) - newMembersWithReferrals).toFixed(0)} more members with referrals`);
    }

    logger.debug(`\nRefresh your dashboard: http://localhost:3001/seller-product/prod_ImvAT3IIRbPBT\n`);

  } catch (error) {
    logger.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

boostReferralMomentum();
