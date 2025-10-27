// prisma/seed-accurate.ts - Seed script with accurate math
import { PrismaClient } from '@prisma/client';
import { generateReferralCode } from '../lib/utils/referral-code';
import { calculateCommission } from '../lib/utils/commission';
import { subDays, subMonths } from 'date-fns';

const prisma = new PrismaClient();

// Test data
const FIRST_NAMES = [
  'James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda',
  'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'
];

const SALE_AMOUNTS = [9.99, 19.99, 29.99, 49.99, 99.99];

async function cleanDatabase() {
  console.log('🧹 Cleaning existing test data...');
  await prisma.commission.deleteMany();
  await prisma.attributionClick.deleteMany();
  await prisma.member.deleteMany();
  await prisma.creator.deleteMany();
  console.log('✅ Database cleaned');
}

function getRandomName() {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return { firstName, lastName, fullName: `${firstName} ${lastName}` };
}

function generateCommissionDate(daysBack: number): Date {
  const date = subDays(new Date(), daysBack);
  const hour = 9 + Math.floor(Math.random() * 10);
  const minute = Math.floor(Math.random() * 60);
  date.setHours(hour, minute, 0, 0);
  return date;
}

async function seedAccurate() {
  console.log('🌱 Starting ACCURATE database seeding...\n');

  await cleanDatabase();

  // Create 3 communities
  console.log('📦 Creating 3 test communities...');

  const creators = await Promise.all([
    prisma.creator.create({
      data: {
        companyId: 'biz_techwhop_test',
        companyName: 'TechWhop',
        productId: 'prod_techwhop_test',
        tier1Count: 5,
        tier1Reward: '1 month free',
        tier2Count: 10,
        tier2Reward: '3 months free',
        tier3Count: 25,
        tier3Reward: '6 months free',
        tier4Count: 50,
        tier4Reward: 'Lifetime access',
        customRewardEnabled: true,
        customRewardTimeframe: 'weekly',
        customRewardType: 'top10',
        customReward1st: 'MacBook Pro M3',
        customReward2nd: 'iPad Pro 12.9"',
        customReward3rd: 'iPhone 15 Pro Max',
        customReward4th: 'Apple Watch Ultra',
        customReward5th: 'AirPods Pro',
        customReward6to10: '$500 Amazon Gift Card'
      }
    }),
    prisma.creator.create({
      data: {
        companyId: 'biz_fitnesshub_test',
        companyName: 'FitnessHub',
        productId: 'prod_fitnesshub_test',
        customRewardEnabled: true,
        customRewardTimeframe: 'monthly',
        customRewardType: 'top5',
        customReward1st: 'Peloton Bike',
        customReward2nd: 'Apple Watch Ultra',
        customReward3rd: 'Whoop 1 Year',
        customReward4th: 'Garmin Fenix 7X',
        customReward5th: '1 Year Gym Membership'
      }
    }),
    prisma.creator.create({
      data: {
        companyId: 'biz_gamezone_test',
        companyName: 'GameZone',
        productId: 'prod_gamezone_test',
        customRewardEnabled: true,
        customRewardTimeframe: 'daily',
        customRewardType: 'top3',
        customReward1st: 'PS5 Pro',
        customReward2nd: 'Xbox Series X',
        customReward3rd: '$100 Steam Gift Card'
      }
    })
  ]);

  console.log('✅ Created 3 communities\n');

  // Create members
  console.log('👥 Creating 180 members across communities...');

  const communities = [
    { creator: creators[0], memberCount: 100, name: 'TechWhop' },
    { creator: creators[1], memberCount: 50, name: 'FitnessHub' },
    { creator: creators[2], memberCount: 30, name: 'GameZone' }
  ];

  const allMembers: any[] = [];

  for (const community of communities) {
    console.log(`Creating ${community.memberCount} members for ${community.name}...`);

    for (let i = 0; i < community.memberCount; i++) {
      const { firstName, lastName, fullName } = getRandomName();
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
      const referralCode = generateReferralCode(firstName);

      // Determine number of referrals based on position
      let totalReferred = 0;
      let monthlyReferred = 0;

      if (i < 10) {
        // Top 10: High performers
        totalReferred = 30 + Math.floor(Math.random() * 20);
        monthlyReferred = Math.floor(totalReferred * 0.3);
      } else if (i < 30) {
        // Next 20: Mid-tier performers
        totalReferred = 15 + Math.floor(Math.random() * 15);
        monthlyReferred = Math.floor(totalReferred * 0.25);
      } else if (i < 60) {
        // Next 30: Active members
        totalReferred = 5 + Math.floor(Math.random() * 10);
        monthlyReferred = Math.floor(totalReferred * 0.2);
      } else {
        // Bottom 40: Beginners
        totalReferred = Math.floor(Math.random() * 5);
        monthlyReferred = Math.floor(totalReferred * 0.1);
      }

      const member = await prisma.member.create({
        data: {
          userId: `user_${community.name.toLowerCase()}_${i + 1}`,
          membershipId: `mem_${community.name.toLowerCase()}_${i + 1}`,
          email,
          username: fullName,
          referralCode,
          referredBy: null,
          lifetimeEarnings: 0, // Will be calculated from actual commissions
          monthlyEarnings: 0,  // Will be calculated from actual commissions
          totalReferred,
          monthlyReferred,
          creatorId: community.creator.id,
          currentTier: totalReferred >= 50 ? 'diamond' :
                      totalReferred >= 25 ? 'gold' :
                      totalReferred >= 10 ? 'silver' : 'bronze',
          welcomeMessageSent: true,
          lastActive: subDays(new Date(), Math.floor(Math.random() * 7)),
          createdAt: subMonths(new Date(), 6 - Math.floor(i / 20))
        }
      });

      allMembers.push(member);
    }
  }

  console.log('✅ Created 180 members\n');

  // Create commissions with accurate math
  console.log('💰 Creating commission records with accurate math...');

  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);
  let totalCommissions = 0;

  for (const member of allMembers) {
    // Top performers get more commissions
    const isTopPerformer = member.totalReferred >= 30;
    const isMidTier = member.totalReferred >= 15;

    let commissionsToCreate = 0;
    if (isTopPerformer) {
      commissionsToCreate = 15 + Math.floor(Math.random() * 10); // 15-25 commissions
    } else if (isMidTier) {
      commissionsToCreate = 8 + Math.floor(Math.random() * 7); // 8-15 commissions
    } else if (member.totalReferred > 0) {
      commissionsToCreate = 2 + Math.floor(Math.random() * 6); // 2-8 commissions
    }

    let memberLifetimeEarnings = 0;
    let memberMonthlyEarnings = 0;

    for (let i = 0; i < commissionsToCreate; i++) {
      // Time distribution: more recent sales for top performers
      let daysBack: number;
      const recencyFactor = Math.random();

      if (isTopPerformer && recencyFactor < 0.6) {
        daysBack = Math.floor(Math.random() * 30); // 60% in last 30 days
      } else if (recencyFactor < 0.4) {
        daysBack = Math.floor(Math.random() * 30); // 40% in last 30 days
      } else if (recencyFactor < 0.7) {
        daysBack = 30 + Math.floor(Math.random() * 30); // 30% in 31-60 days
      } else if (recencyFactor < 0.9) {
        daysBack = 60 + Math.floor(Math.random() * 30); // 20% in 61-90 days
      } else {
        daysBack = 90 + Math.floor(Math.random() * 90); // 10% older
      }

      const saleAmount = SALE_AMOUNTS[Math.floor(Math.random() * SALE_AMOUNTS.length)];
      const { memberShare, creatorShare, platformShare } = calculateCommission(saleAmount);
      const commissionDate = generateCommissionDate(daysBack);

      // Create the commission record
      await prisma.commission.create({
        data: {
          whopPaymentId: `pay_${Math.random().toString(36).substring(2, 15)}`,
          whopMembershipId: `mem_customer_${Math.random().toString(36).substring(2, 15)}`,
          saleAmount,
          memberShare,
          creatorShare,
          platformShare,
          paymentType: i === 0 ? 'initial' : 'recurring',
          subscriptionId: i > 0 ? `sub_${Math.random().toString(36).substring(2, 15)}` : null,
          status: 'paid',
          paidAt: commissionDate,
          memberId: member.id,
          creatorId: member.creatorId,
          createdAt: commissionDate
        }
      });

      // Track earnings accurately
      memberLifetimeEarnings += memberShare;
      if (commissionDate >= thirtyDaysAgo) {
        memberMonthlyEarnings += memberShare;
      }

      totalCommissions++;
    }

    // Update member with accurate earnings from commissions
    if (commissionsToCreate > 0) {
      await prisma.member.update({
        where: { id: member.id },
        data: {
          lifetimeEarnings: Math.round(memberLifetimeEarnings * 100) / 100,
          monthlyEarnings: Math.round(memberMonthlyEarnings * 100) / 100
        }
      });
    }
  }

  console.log(`✅ Created ${totalCommissions} commission records with accurate math\n`);

  // Update rankings
  console.log('🏆 Calculating accurate rankings...');

  const updatedMembers = await prisma.member.findMany();

  // Global earnings rank
  const sortedByEarnings = [...updatedMembers].sort((a, b) => b.lifetimeEarnings - a.lifetimeEarnings);
  for (let i = 0; i < sortedByEarnings.length; i++) {
    await prisma.member.update({
      where: { id: sortedByEarnings[i].id },
      data: { globalEarningsRank: i + 1 }
    });
  }

  // Global referrals rank
  const sortedByReferrals = [...updatedMembers].sort((a, b) => b.totalReferred - a.totalReferred);
  for (let i = 0; i < sortedByReferrals.length; i++) {
    await prisma.member.update({
      where: { id: sortedByReferrals[i].id },
      data: { globalReferralsRank: i + 1 }
    });
  }

  // Community rankings
  for (const community of communities) {
    const communityMembers = updatedMembers.filter(m => m.creatorId === community.creator.id);
    const sortedCommunity = communityMembers.sort((a, b) => b.lifetimeEarnings - a.lifetimeEarnings);

    for (let i = 0; i < sortedCommunity.length; i++) {
      await prisma.member.update({
        where: { id: sortedCommunity[i].id },
        data: {
          communityRank: i + 1
        }
      });
    }
  }

  console.log('✅ Rankings calculated accurately\n');

  // Set custom rewards eligibility based on actual earnings
  console.log('🏆 Setting custom rewards eligibility...');

  for (const community of communities) {
    const creator = community.creator;
    let startDate: Date;

    switch (creator.customRewardTimeframe) {
      case 'daily':
        startDate = subDays(now, 1);
        break;
      case 'weekly':
        startDate = subDays(now, 7);
        break;
      case 'monthly':
      default:
        startDate = subDays(now, 30);
        break;
    }

    // Get actual earnings for each member in the timeframe
    const memberPerformance = await prisma.commission.groupBy({
      by: ['memberId'],
      where: {
        creatorId: creator.id,
        createdAt: { gte: startDate }
      },
      _sum: { memberShare: true }
    });

    // Sort by earnings
    const sortedPerformers = memberPerformance
      .sort((a, b) => (b._sum.memberShare || 0) - (a._sum.memberShare || 0));

    const maxWinners = creator.customRewardType === 'top10' ? 10 :
                      creator.customRewardType === 'top5' ? 5 : 3;

    // Set eligibility for top performers
    for (let i = 0; i < Math.min(sortedPerformers.length, maxWinners); i++) {
      const performer = sortedPerformers[i];
      const place = i + 1;
      let rewardMessage = '';

      switch (place) {
        case 1:
          if (creator.customReward1st) {
            rewardMessage = `🥇 1st Place This ${creator.customRewardTimeframe} - ${creator.customReward1st}!`;
          }
          break;
        case 2:
          if (creator.customReward2nd) {
            rewardMessage = `🥈 2nd Place This ${creator.customRewardTimeframe} - ${creator.customReward2nd}!`;
          }
          break;
        case 3:
          if (creator.customReward3rd) {
            rewardMessage = `🥉 3rd Place This ${creator.customRewardTimeframe} - ${creator.customReward3rd}!`;
          }
          break;
        case 4:
          if (creator.customReward4th) {
            rewardMessage = `#${place} This ${creator.customRewardTimeframe} - ${creator.customReward4th}!`;
          }
          break;
        case 5:
          if (creator.customReward5th) {
            rewardMessage = `#${place} This ${creator.customRewardTimeframe} - ${creator.customReward5th}!`;
          }
          break;
        default: // 6-10
          if (creator.customReward6to10) {
            rewardMessage = `#${place} This ${creator.customRewardTimeframe} - ${creator.customReward6to10}!`;
          }
          break;
      }

      if (rewardMessage) {
        await prisma.member.update({
          where: { id: performer.memberId },
          data: {
            customRewardEligible: true,
            customRewardTimeframeRank: place,
            customRewardMessage: rewardMessage
          }
        });
      }
    }
  }

  console.log('✅ Custom rewards eligibility set\n');

  // Update creator revenue stats
  console.log('📊 Updating creator revenue statistics...');

  for (const community of communities) {
    const stats = await prisma.commission.aggregate({
      where: { creatorId: community.creator.id },
      _sum: {
        saleAmount: true,
        creatorShare: true
      }
    });

    const monthlyStats = await prisma.commission.aggregate({
      where: {
        creatorId: community.creator.id,
        createdAt: { gte: thirtyDaysAgo }
      },
      _sum: {
        saleAmount: true
      }
    });

    await prisma.creator.update({
      where: { id: community.creator.id },
      data: {
        totalRevenue: stats._sum.saleAmount || 0,
        monthlyRevenue: monthlyStats._sum.saleAmount || 0,
        totalReferrals: await prisma.member.count({
          where: { creatorId: community.creator.id }
        })
      }
    });
  }

  console.log('✅ Creator statistics updated\n');

  // Summary
  console.log('📊 SEEDING COMPLETE - SUMMARY:');
  console.log('================================');
  console.log('✅ 3 Communities created');
  console.log('✅ 180 Members created');
  console.log(`✅ ${totalCommissions} Commission records (with accurate math!)`);
  console.log('✅ Rankings calculated accurately');
  console.log('✅ Custom rewards eligibility set');
  console.log('✅ All earnings match commission records');
  console.log('\n🎉 Database seeding completed successfully with ACCURATE MATH!');

  // Display sample URLs
  console.log('\n🔗 SAMPLE TEST URLS:');
  console.log('================================');
  console.log('\n📱 Member Dashboards:');
  const sampleMembers = await prisma.member.findMany({ take: 5, orderBy: { lifetimeEarnings: 'desc' } });
  for (const member of sampleMembers) {
    console.log(`http://localhost:3003/customer/${member.membershipId} (${member.username} - $${member.lifetimeEarnings})`);
  }

  console.log('\n🏢 Creator Dashboards:');
  for (const community of communities) {
    console.log(`http://localhost:3003/seller-product/${community.creator.productId} (${community.name})`);
  }
}

seedAccurate()
  .catch((error) => {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });