// scripts/boost-referral-momentum.js
// Boosts referral momentum by giving more members at least 1 referral

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TARGET_MOMENTUM = 35; // Target 35% momentum (will glow at >30%)

async function boostReferralMomentum() {
  try {
    const productId = 'prod_ImvAT3IIRbPBT';

    console.log('\n========================================');
    console.log('BOOSTING REFERRAL MOMENTUM');
    console.log('========================================\n');

    // Get the creator
    const creator = await prisma.creator.findFirst({
      where: { productId },
      select: { id: true, companyName: true }
    });

    if (!creator) {
      console.log('❌ Creator not found');
      return;
    }

    console.log(`✅ Creator: ${creator.companyName}\n`);

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
    console.log(`📊 Current Stats:`);
    console.log(`   Total members: ${totalMembers}`);
    console.log(`   Members with referrals: ${membersWithReferrals}`);
    console.log(`   Current momentum: ${currentMomentum.toFixed(1)}%\n`);

    // Calculate target
    const targetMembersWithReferrals = Math.ceil(totalMembers * (TARGET_MOMENTUM / 100));
    const membersToUpdate = targetMembersWithReferrals - membersWithReferrals;

    console.log(`🎯 Target Stats:`);
    console.log(`   Target momentum: ${TARGET_MOMENTUM}%`);
    console.log(`   Target members with referrals: ${targetMembersWithReferrals}`);
    console.log(`   Members to update: ${membersToUpdate}\n`);

    if (membersToUpdate <= 0) {
      console.log('✅ Already at target momentum!');
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

    console.log(`🚀 Updating ${membersWithNoReferrals.length} members...\n`);

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
        console.log(`   ${updated}/${membersWithNoReferrals.length} - ${member.username}: 0 → ${referralCount} referrals`);
      }
    }

    // Calculate new momentum
    const newMembersWithReferrals = membersWithReferrals + updated;
    const newMomentum = (newMembersWithReferrals / totalMembers) * 100;

    console.log(`\n========================================`);
    console.log(`SUCCESS!`);
    console.log(`========================================`);
    console.log(`Members updated: ${updated}`);
    console.log(`New momentum: ${newMomentum.toFixed(1)}%`);

    if (newMomentum > 30) {
      console.log(`\n🔥 MOMENTUM CARD WILL GLOW! (>30%)`);
    } else {
      console.log(`\n⚠️  Almost there! Need ${((30 / 100 * totalMembers) - newMembersWithReferrals).toFixed(0)} more members with referrals`);
    }

    console.log(`\nRefresh your dashboard: http://localhost:3001/seller-product/prod_ImvAT3IIRbPBT\n`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

boostReferralMomentum();
