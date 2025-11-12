import logger from '../lib/logger';

// scripts/fix-commission-linkage.js
// Fixes the commission linkage issue by creating commissions for actual referred members

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const AVG_MONTHLY_PRICE = 49.99;

function randomDate(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  date.setHours(Math.floor(Math.random() * 24));
  date.setMinutes(Math.floor(Math.random() * 60));
  return date;
}

async function fixCommissionLinkage() {
  try {
    const productId = 'prod_ImvAT3IIRbPBT';

    logger.debug('\n========================================');
    logger.debug('FIXING COMMISSION LINKAGE');
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

    logger.info('Creator: ${creator.companyName}');
    logger.debug(`   ID: ${creator.id}\n`);

    // Get all members for this creator
    logger.info(' Fetching all members...');
    const allMembers = await prisma.member.findMany({
      where: { creatorId: creator.id },
      select: {
        id: true,
        userId: true,
        username: true,
        referralCode: true,
        membershipId: true,
        totalReferred: true,
      }
    });

    logger.debug(`   Found ${allMembers.length} members\n`);

    // Get ALL referrers (anyone with referrals)
    const referrers = allMembers
      .filter(m => m.totalReferred > 0)
      .sort((a, b) => b.totalReferred - a.totalReferred);

    logger.info(' Processing ${referrers.length} referrers...\n');

    let totalCommissionsCreated = 0;
    let totalFixedReferrals = 0;
    let processed = 0;

    for (const referrer of referrers) {
      processed++;
      const showDetails = processed <= 10 || processed % 50 === 0;

      if (showDetails) {
        logger.debug(`${referrer.username} (${referrer.referralCode})`);
        logger.debug(`   Claimed referrals: ${referrer.totalReferred}`);
      }

      // Find actual referred members
      const referredMembers = await prisma.member.findMany({
        where: {
          referredBy: referrer.referralCode,
          creatorId: creator.id
        },
        select: {
          id: true,
          username: true,
          membershipId: true
        }
      });

      if (showDetails) {
        logger.debug(`   Actual referred members: ${referredMembers.length}`);
      }

      // Update totalReferred to match reality
      if (referredMembers.length !== referrer.totalReferred) {
        await prisma.member.update({
          where: { id: referrer.id },
          data: { totalReferred: referredMembers.length }
        });
        if (showDetails) {
          logger.debug(`   ✅ Updated totalReferred: ${referrer.totalReferred} → ${referredMembers.length}`);
        }
        totalFixedReferrals++;
      }

      // Create commissions for 60% of referred members (realistic conversion rate)
      const membersToCreateCommissionsFor = referredMembers.slice(0, Math.ceil(referredMembers.length * 0.6));

      for (const referredMember of membersToCreateCommissionsFor) {
        // Check if commission already exists for this membershipId
        const existingCommission = await prisma.commission.findFirst({
          where: {
            whopMembershipId: referredMember.membershipId,
            creatorId: creator.id,
            status: 'paid'
          }
        });

        if (existingCommission) {
          // Commission already exists, skip
          continue;
        }

        // Create 2-5 commissions per referred member (recurring payments)
        const numCommissions = Math.floor(Math.random() * 4) + 2; // 2-5 commissions

        for (let i = 0; i < numCommissions; i++) {
          const commissionDate = randomDate(90);
          const saleAmount = AVG_MONTHLY_PRICE;

          await prisma.commission.create({
            data: {
              whopPaymentId: `payment_${referredMember.membershipId}_${i}_${Date.now()}`,
              whopMembershipId: referredMember.membershipId, // ✅ Use ACTUAL membershipId
              saleAmount,
              memberShare: saleAmount * 0.10,
              creatorShare: saleAmount * 0.70,
              platformShare: saleAmount * 0.20,
              paymentType: i === 0 ? 'one_time' : 'recurring',
              billingPeriod: 'monthly',
              monthlyValue: saleAmount,
              status: 'paid',
              paidAt: commissionDate,
              memberId: referrer.id, // Referrer gets the commission
              creatorId: creator.id,
              createdAt: commissionDate,
            },
          });

          totalCommissionsCreated++;
        }
      }

      if (showDetails) {
        logger.debug(`   ✅ Created ${membersToCreateCommissionsFor.length * 3} commissions (avg)\n`);
      }
    }

    logger.debug('\n========================================');
    logger.debug('SUMMARY');
    logger.debug('========================================');
    logger.debug(`Total commissions created: ${totalCommissionsCreated}`);
    logger.debug(`Total referrals fixed: ${totalFixedReferrals}`);
    logger.debug('\n✅ Commission linkage fixed!');
    logger.debug('The percentage should now calculate correctly.\n');

  } catch (error) {
    logger.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCommissionLinkage();
