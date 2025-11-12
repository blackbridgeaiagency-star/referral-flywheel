// prisma/seed-fast.ts - Optimized seed script with batch operations
import { PrismaClient } from '@prisma/client';
import { generateReferralCode } from '../lib/utils/referral-code';
import { calculateCommission } from '../lib/utils/commission';
import { subDays, subMonths } from 'date-fns';
import logger from '../lib/logger';


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
  logger.debug('🧹 Cleaning existing test data...');
  await prisma.commission.deleteMany();
  await prisma.attributionClick.deleteMany();
  await prisma.member.deleteMany();
  await prisma.creator.deleteMany();
  logger.info('Database cleaned');
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

async function seed() {
  logger.info(' Starting FAST database seeding...\n');

  await cleanDatabase();

  // Create 3 communities
  logger.webhook(' Creating 3 test communities...');

  const creators = await prisma.creator.createMany({
    data: [
      {
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
      },
      {
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
      },
      {
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
    ]
  });

  const allCreators = await prisma.creator.findMany();
  logger.info('Created 3 communities\n');

  // Create members with batch operations
  logger.info(' Creating 180 members across communities...');

  const membersData: any[] = [];
  const communities = [
    { creator: allCreators[0], memberCount: 100, name: 'TechWhop' },
    { creator: allCreators[1], memberCount: 50, name: 'FitnessHub' },
    { creator: allCreators[2], memberCount: 30, name: 'GameZone' }
  ];

  for (const community of communities) {
    for (let i = 0; i < community.memberCount; i++) {
      const { firstName, lastName, fullName } = getRandomName();
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
      const referralCode = generateReferralCode(firstName);

      // Determine earnings based on position
      let lifetimeEarnings = 0;
      let monthlyEarnings = 0;
      let totalReferred = 0;
      let monthlyReferred = 0;

      if (i < 10) {
        // Top 10: High performers
        lifetimeEarnings = 5000 + Math.random() * 3000;
        monthlyEarnings = lifetimeEarnings * 0.2;
        totalReferred = 30 + Math.floor(Math.random() * 20);
        monthlyReferred = Math.floor(totalReferred * 0.3);
      } else if (i < 30) {
        // Next 20: Mid-tier performers
        lifetimeEarnings = 2000 + Math.random() * 3000;
        monthlyEarnings = lifetimeEarnings * 0.15;
        totalReferred = 15 + Math.floor(Math.random() * 15);
        monthlyReferred = Math.floor(totalReferred * 0.25);
      } else {
        // Rest: Active members
        lifetimeEarnings = 500 + Math.random() * 1500;
        monthlyEarnings = lifetimeEarnings * 0.1;
        totalReferred = 5 + Math.floor(Math.random() * 10);
        monthlyReferred = Math.floor(totalReferred * 0.2);
      }

      membersData.push({
        userId: `user_${community.name.toLowerCase()}_${i + 1}`,
        membershipId: `mem_${community.name.toLowerCase()}_${i + 1}`,
        email,
        username: fullName,
        referralCode,
        referredBy: null,
        lifetimeEarnings: Math.round(lifetimeEarnings * 100) / 100,
        monthlyEarnings: Math.round(monthlyEarnings * 100) / 100,
        totalReferred,
        monthlyReferred,
        creatorId: community.creator.id,
        currentTier: totalReferred >= 50 ? 'diamond' :
                    totalReferred >= 25 ? 'gold' :
                    totalReferred >= 10 ? 'silver' : 'bronze',
        welcomeMessageSent: true,
        lastActive: subDays(new Date(), Math.floor(Math.random() * 7)),
        createdAt: subMonths(new Date(), 6 - Math.floor(i / 20)),
        globalEarningsRank: 0,
        globalReferralsRank: 0,
        communityRank: i + 1
      });
    }
  }

  await prisma.member.createMany({ data: membersData });
  const allMembers = await prisma.member.findMany();
  logger.info('Created 180 members\n');

  // Create commissions with batch operations
  logger.info(' Creating time-distributed commission records...');

  const commissionsData: any[] = [];
  const now = new Date();

  // Create 5-10 commissions per top member, 2-5 for others
  for (const member of allMembers) {
    if (member.lifetimeEarnings === 0) continue;

    const isTopPerformer = member.lifetimeEarnings > 5000;
    const commissionsCount = isTopPerformer ?
      5 + Math.floor(Math.random() * 5) :
      2 + Math.floor(Math.random() * 3);

    for (let i = 0; i < commissionsCount; i++) {
      // Time distribution: more recent sales
      let daysBack: number;
      const recencyFactor = Math.random();

      if (recencyFactor < 0.5) {
        daysBack = Math.floor(Math.random() * 30); // Last 30 days
      } else if (recencyFactor < 0.8) {
        daysBack = 30 + Math.floor(Math.random() * 30); // 31-60 days
      } else {
        daysBack = 60 + Math.floor(Math.random() * 30); // 61-90 days
      }

      const saleAmount = SALE_AMOUNTS[Math.floor(Math.random() * SALE_AMOUNTS.length)];
      const { memberShare, creatorShare, platformShare } = calculateCommission(saleAmount);
      const commissionDate = generateCommissionDate(daysBack);

      commissionsData.push({
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
      });
    }
  }

  // Insert all commissions at once
  await prisma.commission.createMany({ data: commissionsData });
  logger.info('Created ${commissionsData.length} commission records\n');

  // Update rankings
  logger.info(' Calculating rankings...');

  const sortedByEarnings = [...allMembers].sort((a, b) => b.lifetimeEarnings - a.lifetimeEarnings);
  for (let i = 0; i < sortedByEarnings.length; i++) {
    await prisma.member.update({
      where: { id: sortedByEarnings[i].id },
      data: { globalEarningsRank: i + 1 }
    });
  }

  const sortedByReferrals = [...allMembers].sort((a, b) => b.totalReferred - a.totalReferred);
  for (let i = 0; i < sortedByReferrals.length; i++) {
    await prisma.member.update({
      where: { id: sortedByReferrals[i].id },
      data: { globalReferralsRank: i + 1 }
    });
  }

  logger.info('Rankings calculated\n');

  // Set custom rewards eligibility
  logger.info(' Setting custom rewards eligibility...');

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

    // Get top performers for this timeframe
    const memberPerformance = await prisma.commission.groupBy({
      by: ['memberId'],
      where: {
        creatorId: creator.id,
        createdAt: { gte: startDate }
      },
      _sum: { memberShare: true }
    });

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

  logger.info('Custom rewards eligibility set\n');

  // Summary
  logger.info(' SEEDING COMPLETE - SUMMARY:');
  logger.debug('================================');
  logger.info('3 Communities created');
  logger.info('180 Members created');
  logger.info('${commissionsData.length} Commission records');
  logger.info('Rankings calculated');
  logger.info('Custom rewards eligibility set');
  logger.debug('\n🎉 Database seeding completed successfully!');

  // Display sample URLs
  logger.debug('\n🔗 SAMPLE TEST URLS:');
  logger.debug('================================');
  logger.debug('\n📱 Member Dashboards:');
  const sampleMembers = allMembers.slice(0, 5);
  for (const member of sampleMembers) {
    logger.debug(`http://localhost:3003/customer/${member.membershipId} (${member.username})`);
  }

  logger.debug('\n🏢 Creator Dashboards:');
  for (const community of communities) {
    logger.debug(`http://localhost:3003/seller-product/${community.creator.productId} (${community.name})`);
  }

  logger.debug('\n🔗 Referral Links:');
  const sampleReferrals = allMembers.slice(0, 3);
  for (const member of sampleReferrals) {
    logger.debug(`http://localhost:3003/r/${member.referralCode}`);
  }
}

seed()
  .catch((error) => {
    logger.error('❌ Seeding error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });