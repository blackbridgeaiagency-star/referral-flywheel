const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnoseRevenue() {
  try {
    const productId = 'prod_ImvAT3IIRbPBT';

    console.log(`\n========================================`);
    console.log(`DIAGNOSING REVENUE FOR: ${productId}`);
    console.log(`========================================\n`);

    // Get the creator
    const creator = await prisma.creator.findFirst({
      where: { productId },
      select: { id: true, companyName: true }
    });

    if (!creator) {
      console.log('❌ Creator not found');
      return;
    }

    console.log(`✅ Creator: ${creator.companyName}`);
    console.log(`   ID: ${creator.id}\n`);

    // Get total creator revenue
    const totalCommissions = await prisma.commission.findMany({
      where: { creatorId: creator.id, status: 'paid' },
      select: { saleAmount: true }
    });
    const totalRevenue = totalCommissions.reduce((sum, c) => sum + c.saleAmount, 0);

    console.log(`📊 TOTAL CREATOR REVENUE:`);
    console.log(`   Paid commissions: ${totalCommissions.length}`);
    console.log(`   Total revenue: $${(totalRevenue / 100).toFixed(2)}\n`);

    // Get top 3 referrers by total referrals
    const topReferrers = await prisma.member.findMany({
      where: { creatorId: creator.id },
      select: {
        id: true,
        username: true,
        referralCode: true,
        totalReferred: true,
        membershipId: true
      },
      orderBy: { totalReferred: 'desc' },
      take: 3
    });

    console.log(`👥 TOP 3 REFERRERS:\n`);

    for (const referrer of topReferrers) {
      console.log(`${referrer.username} (${referrer.referralCode})`);
      console.log(`   Total referrals: ${referrer.totalReferred}`);
      console.log(`   MembershipId: ${referrer.membershipId}`);

      // Get referred members
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

      console.log(`   ✅ Referred members found: ${referredMembers.length}`);

      if (referredMembers.length > 0) {
        console.log(`   First 3 referred members:`);
        referredMembers.slice(0, 3).forEach(rm => {
          console.log(`     - ${rm.username} (membershipId: ${rm.membershipId})`);
        });

        // Get all membershipIds
        const membershipIds = referredMembers.map(m => m.membershipId);

        // Get commissions for these members
        const commissions = await prisma.commission.findMany({
          where: {
            whopMembershipId: { in: membershipIds },
            creatorId: creator.id
          },
          select: {
            id: true,
            whopMembershipId: true,
            saleAmount: true,
            status: true
          }
        });

        console.log(`   📦 Commissions found: ${commissions.length}`);

        if (commissions.length > 0) {
          const paidCommissions = commissions.filter(c => c.status === 'paid');
          const pendingCommissions = commissions.filter(c => c.status !== 'paid');

          console.log(`     - Paid: ${paidCommissions.length}`);
          console.log(`     - Other status: ${pendingCommissions.length}`);

          if (paidCommissions.length > 0) {
            const revenueGenerated = paidCommissions.reduce((sum, c) => sum + c.saleAmount, 0);
            console.log(`   💰 Revenue generated: $${(revenueGenerated / 100).toFixed(2)}`);
          } else {
            console.log(`   ❌ No paid commissions found`);
          }

          // Show commission statuses
          if (pendingCommissions.length > 0) {
            console.log(`   Pending commission statuses:`);
            const statusCounts = {};
            pendingCommissions.forEach(c => {
              statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
            });
            Object.entries(statusCounts).forEach(([status, count]) => {
              console.log(`     - ${status}: ${count}`);
            });
          }
        } else {
          console.log(`   ❌ No commissions found for referred members`);
          console.log(`   Checking if membershipIds exist in Commission table...`);

          // Check each membershipId
          for (const membershipId of membershipIds.slice(0, 3)) {
            const anyCommission = await prisma.commission.findFirst({
              where: { whopMembershipId: membershipId }
            });
            if (anyCommission) {
              console.log(`     ⚠️  ${membershipId} has commission but for different creator`);
            } else {
              console.log(`     ❌ ${membershipId} has no commissions at all`);
            }
          }
        }
      } else {
        console.log(`   ⚠️  No referred members found (mismatch with totalReferred: ${referrer.totalReferred})`);
      }

      console.log('');
    }

    // Summary
    console.log(`\n========================================`);
    console.log(`SUMMARY`);
    console.log(`========================================`);
    console.log(`Total Revenue: $${(totalRevenue / 100).toFixed(2)}`);
    console.log(`Top 3 Referrers have: ${topReferrers.reduce((sum, r) => sum + r.totalReferred, 0)} total referrals`);
    console.log(`\nIf percentage is 0%, it means:`);
    console.log(`  1. Referred members don't have membershipIds that match Commission.whopMembershipId`);
    console.log(`  2. Commissions exist but are not status='paid'`);
    console.log(`  3. Commissions don't exist for referred members`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseRevenue();
