// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { generateReferralCode } from '../lib/utils/referral-code';
import { calculateCommission } from '../lib/utils/commission';
import { subDays, subWeeks, subMonths } from 'date-fns';

const prisma = new PrismaClient();

// Test data
const FIRST_NAMES = [
  'James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda',
  'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Christopher', 'Karen', 'Charles', 'Lisa', 'Daniel', 'Nancy',
  'Matthew', 'Betty', 'Anthony', 'Helen', 'Mark', 'Sandra', 'Donald', 'Donna',
  'Kenneth', 'Carol', 'Steven', 'Ruth', 'Edward', 'Sharon', 'Paul', 'Michelle',
  'Joshua', 'Laura', 'George', 'Sarah', 'Kevin', 'Kimberly', 'Brian', 'Deborah',
  'Andrew', 'Dorothy', 'Ryan', 'Amy', 'Jacob', 'Angela', 'Nicholas', 'Ashley',
  'Eric', 'Brenda', 'Jonathan', 'Emma', 'Stephen', 'Samantha', 'Larry', 'Janet',
  'Justin', 'Catherine', 'Scott', 'Frances', 'Brandon', 'Christine', 'Benjamin', 'Debra',
  'Samuel', 'Rachel', 'Gregory', 'Carolyn', 'Raymond', 'Martha', 'Alexander', 'Virginia',
  'Patrick', 'Maria', 'Jack', 'Heather', 'Dennis', 'Diane', 'Jerry', 'Julie',
  'Tyler', 'Joyce', 'Aaron', 'Victoria', 'Jose', 'Olivia', 'Adam', 'Kelly',
  'Nathan', 'Christina', 'Henry', 'Nicole', 'Douglas', 'Judith'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
  'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young',
  'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores'
];

const SALE_AMOUNTS = [9.99, 19.99, 29.99, 49.99, 99.99];

async function cleanDatabase() {
  console.log('🧹 Cleaning existing test data...');

  // Delete in correct order to respect foreign key constraints
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

function generateFingerprint() {
  return `fp_${Math.random().toString(36).substring(2, 15)}`;
}

function hashIP(ip: string) {
  // Simple hash for testing
  return `hash_${ip.split('.').join('_')}`;
}

async function seed() {
  console.log('🌱 Starting database seeding...\n');

  // Clean existing data
  await cleanDatabase();

  // ========================================
  // CREATE 3 COMMUNITIES
  // ========================================

  console.log('📦 Creating 3 test communities...');

  const creator1 = await prisma.creator.create({
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
  });

  const creator2 = await prisma.creator.create({
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
  });

  const creator3 = await prisma.creator.create({
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
  });

  console.log('✅ Created 3 communities\n');

  // ========================================
  // CREATE MEMBERS
  // ========================================

  console.log('👥 Creating 180 members across communities...');

  const allMembers: any[] = [];
  const communities = [
    { creator: creator1, memberCount: 100, name: 'TechWhop' },
    { creator: creator2, memberCount: 50, name: 'FitnessHub' },
    { creator: creator3, memberCount: 30, name: 'GameZone' }
  ];

  for (const community of communities) {
    console.log(`\n📊 Creating ${community.memberCount} members for ${community.name}...`);

    const communityMembers = [];

    for (let i = 0; i < community.memberCount; i++) {
      const { firstName, lastName, fullName } = getRandomName();
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
      const referralCode = generateReferralCode(firstName);

      // Determine earnings and referral counts based on position
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
      } else if (i < 60) {
        // Next 30: Active members
        lifetimeEarnings = 500 + Math.random() * 1500;
        monthlyEarnings = lifetimeEarnings * 0.1;
        totalReferred = 5 + Math.floor(Math.random() * 10);
        monthlyReferred = Math.floor(totalReferred * 0.2);
      } else {
        // Bottom 40: Beginners
        lifetimeEarnings = Math.random() * 500;
        monthlyEarnings = lifetimeEarnings * 0.05;
        totalReferred = Math.floor(Math.random() * 5);
        monthlyReferred = Math.floor(totalReferred * 0.1);
      }

      // Determine if member was referred (70% chance)
      const wasReferred = i > 0 && Math.random() < 0.7;
      let referredBy = null;

      if (wasReferred && communityMembers.length > 0) {
        // Pick a random existing member as referrer
        const referrerIndex = Math.floor(Math.random() * Math.min(communityMembers.length, 20));
        referredBy = communityMembers[referrerIndex].referralCode;
      }

      // Vary subscription prices
      const subscriptionPrice = SALE_AMOUNTS[Math.floor(Math.random() * SALE_AMOUNTS.length)];
      const memberOrigin = referredBy ? 'referred' : 'organic';

      const member = await prisma.member.create({
        data: {
          userId: `user_${community.name.toLowerCase()}_${i + 1}`,
          membershipId: `mem_${community.name.toLowerCase()}_${i + 1}`,
          email,
          username: fullName,
          referralCode,
          referredBy,
          subscriptionPrice,
          memberOrigin,
          lifetimeEarnings,
          monthlyEarnings,
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

      communityMembers.push(member);
      allMembers.push(member);
    }

    console.log(`✅ Created ${community.memberCount} members for ${community.name}`);
  }

  // ========================================
  // UPDATE RANKINGS
  // ========================================

  console.log('\n🏆 Calculating global and community rankings...');

  // Sort all members by earnings for global ranking
  const sortedByEarnings = [...allMembers].sort((a, b) => b.lifetimeEarnings - a.lifetimeEarnings);
  const sortedByReferrals = [...allMembers].sort((a, b) => b.totalReferred - a.totalReferred);

  // Update global rankings
  for (let i = 0; i < sortedByEarnings.length; i++) {
    await prisma.member.update({
      where: { id: sortedByEarnings[i].id },
      data: { globalEarningsRank: i + 1 }
    });
  }

  for (let i = 0; i < sortedByReferrals.length; i++) {
    await prisma.member.update({
      where: { id: sortedByReferrals[i].id },
      data: { globalReferralsRank: i + 1 }
    });
  }

  // Update community rankings
  for (const community of communities) {
    const communityMembers = allMembers.filter(m => m.creatorId === community.creator.id);
    const sortedCommunity = communityMembers.sort((a, b) => b.lifetimeEarnings - a.lifetimeEarnings);

    for (let i = 0; i < sortedCommunity.length; i++) {
      await prisma.member.update({
        where: { id: sortedCommunity[i].id },
        data: {
          communityRank: i + 1,
          // Update custom reward eligibility for top 10
          customRewardEligible: false, // Will be set later based on actual ranking
          customRewardTimeframeRank: null,
          customRewardMessage: null
        }
      });
    }
  }

  console.log('✅ Rankings calculated\n');

  // ========================================
  // CREATE ATTRIBUTION CLICKS
  // ========================================

  console.log('🖱️ Creating 500+ attribution clicks...');

  let totalClicks = 0;
  let convertedClicks = 0;

  for (const member of allMembers) {
    // Each member gets 2-10 clicks
    const clickCount = 2 + Math.floor(Math.random() * 8);

    for (let i = 0; i < clickCount; i++) {
      const clickDate = subDays(new Date(), Math.floor(Math.random() * 60));
      const isExpired = Math.random() < 0.7; // 70% expired
      const isConverted = !isExpired && Math.random() < 0.35; // 35% conversion rate for active clicks

      await prisma.attributionClick.create({
        data: {
          referralCode: member.referralCode,
          memberId: member.id,
          fingerprint: generateFingerprint(),
          ipHash: hashIP(`192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`),
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          converted: isConverted,
          conversionValue: isConverted ? SALE_AMOUNTS[Math.floor(Math.random() * SALE_AMOUNTS.length)] : null,
          convertedAt: isConverted ? subDays(clickDate, -1) : null,
          expiresAt: isExpired ? subDays(new Date(), Math.floor(Math.random() * 30)) :
                                  subDays(new Date(), -30),
          createdAt: clickDate
        }
      });

      totalClicks++;
      if (isConverted) convertedClicks++;
    }
  }

  console.log(`✅ Created ${totalClicks} attribution clicks (${convertedClicks} converted)\n`);

  // ========================================
  // CREATE REALISTIC TIME-DISTRIBUTED COMMISSION RECORDS
  // ========================================

  console.log('💰 Creating realistic time-distributed commission records...');

  let totalCommissions = 0;
  const now = new Date();

  // Helper function to generate commission date with realistic patterns
  function generateCommissionDate(daysBack: number): Date {
    const date = subDays(now, daysBack);

    // Add some hourly variation (business hours preferred)
    const hour = 9 + Math.floor(Math.random() * 10); // 9am-7pm
    const minute = Math.floor(Math.random() * 60);
    date.setHours(hour, minute, 0, 0);

    return date;
  }

  // For each member, generate commissions that match their earnings
  for (const member of allMembers) {
    if (member.lifetimeEarnings === 0) continue;

    // Calculate how many commissions this member should have
    const avgSaleAmount = 49.99;
    const memberSharePerSale = avgSaleAmount * 0.1; // 10% commission
    const approximateCommissions = Math.ceil(member.lifetimeEarnings / memberSharePerSale);

    // Determine the time distribution
    const memberAge = Math.floor(Math.random() * 180) + 30; // Member joined 30-210 days ago
    const commissionsToCreate = Math.min(approximateCommissions, 50); // Cap at 50 for performance

    // Track earnings to match the target
    let totalEarningsGenerated = 0;
    let monthlyEarningsGenerated = 0;

    // Generate commissions with realistic time distribution
    for (let i = 0; i < commissionsToCreate; i++) {
      // Calculate days back with recency bias (more recent sales)
      let daysBack: number;
      const recencyFactor = Math.random();

      if (recencyFactor < 0.4) {
        // 40% of sales in last 30 days
        daysBack = Math.floor(Math.random() * 30);
      } else if (recencyFactor < 0.7) {
        // 30% of sales in days 31-60
        daysBack = 30 + Math.floor(Math.random() * 30);
      } else if (recencyFactor < 0.9) {
        // 20% of sales in days 61-90
        daysBack = 60 + Math.floor(Math.random() * 30);
      } else {
        // 10% of sales older than 90 days
        daysBack = 90 + Math.floor(Math.random() * Math.min(memberAge - 90, 90));
      }

      // Vary the sale amount
      const saleVariation = 0.5 + Math.random(); // 50% to 150% of base amount
      const saleAmount = Math.round(avgSaleAmount * saleVariation * 100) / 100;
      const { memberShare, creatorShare, platformShare } = calculateCommission(saleAmount);

      // Track earnings
      totalEarningsGenerated += memberShare;
      if (daysBack <= 30) {
        monthlyEarningsGenerated += memberShare;
      }

      const commissionDate = generateCommissionDate(daysBack);

      // Determine if this is a referral sale
      const referredMember = allMembers.find(m => m.referredBy === member.referralCode);
      const referredMembershipId = referredMember ? referredMember.membershipId : `mem_customer_${Math.random().toString(36).substring(2, 15)}`;

      // Create the commission record
      await prisma.commission.create({
        data: {
          whopPaymentId: `pay_${Math.random().toString(36).substring(2, 15)}`,
          whopMembershipId: referredMembershipId,
          saleAmount,
          memberShare,
          creatorShare,
          platformShare,
          paymentType: i === 0 ? 'initial' : Math.random() < 0.7 ? 'recurring' : 'initial',
          subscriptionId: Math.random() < 0.7 ? `sub_${Math.random().toString(36).substring(2, 15)}` : null,
          status: 'paid',
          paidAt: commissionDate,
          memberId: member.id,
          creatorId: member.creatorId,
          createdAt: commissionDate
        }
      });

      totalCommissions++;
    }

    // Update member earnings to match generated commissions (for accuracy)
    await prisma.member.update({
      where: { id: member.id },
      data: {
        lifetimeEarnings: Math.round(totalEarningsGenerated * 100) / 100,
        monthlyEarnings: Math.round(monthlyEarningsGenerated * 100) / 100
      }
    });
  }

  // Add some additional commissions for top performers to create more interesting charts
  const topPerformers = sortedByEarnings.slice(0, 10);
  for (const performer of topPerformers) {
    // Add 10-20 more recent commissions for top performers
    const extraCommissions = 10 + Math.floor(Math.random() * 10);

    for (let i = 0; i < extraCommissions; i++) {
      const daysBack = Math.floor(Math.random() * 30); // All within last 30 days
      const saleAmount = SALE_AMOUNTS[Math.floor(Math.random() * SALE_AMOUNTS.length)];
      const { memberShare, creatorShare, platformShare } = calculateCommission(saleAmount);
      const commissionDate = generateCommissionDate(daysBack);

      await prisma.commission.create({
        data: {
          whopPaymentId: `pay_bonus_${Math.random().toString(36).substring(2, 15)}`,
          whopMembershipId: `mem_customer_${Math.random().toString(36).substring(2, 15)}`,
          saleAmount,
          memberShare,
          creatorShare,
          platformShare,
          paymentType: 'recurring',
          subscriptionId: `sub_${Math.random().toString(36).substring(2, 15)}`,
          status: 'paid',
          paidAt: commissionDate,
          memberId: performer.id,
          creatorId: performer.creatorId,
          createdAt: commissionDate
        }
      });

      totalCommissions++;
    }
  }

  console.log(`✅ Created ${totalCommissions} commission records\n`);

  // ========================================
  // UPDATE CREATOR STATS
  // ========================================

  console.log('📊 Updating creator statistics...');

  for (const community of communities) {
    const stats = await prisma.commission.aggregate({
      where: { creatorId: community.creator.id },
      _sum: {
        saleAmount: true,
        creatorShare: true
      },
      _count: true
    });

    const monthlyStats = await prisma.commission.aggregate({
      where: {
        creatorId: community.creator.id,
        createdAt: { gte: subDays(new Date(), 30) }
      },
      _sum: {
        saleAmount: true
      }
    });

    const memberCount = await prisma.member.count({
      where: { creatorId: community.creator.id }
    });

    await prisma.creator.update({
      where: { id: community.creator.id },
      data: {
        totalRevenue: stats._sum.saleAmount || 0,
        monthlyRevenue: monthlyStats._sum.saleAmount || 0,
        totalReferrals: memberCount
      }
    });
  }

  console.log('✅ Creator statistics updated\n');

  // ========================================
  // SET CUSTOM REWARDS ELIGIBILITY
  // ========================================

  console.log('🏆 Setting custom rewards eligibility based on timeframe performance...');

  for (const community of communities) {
    // Get the timeframe for this creator's competition
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

    // Get earnings for each member in the timeframe
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

    // Determine how many winners based on competition type
    const maxWinners = creator.customRewardType === 'top10' ? 10 :
                      creator.customRewardType === 'top5' ? 5 : 3;

    // Set eligibility for top performers
    for (let i = 0; i < Math.min(sortedPerformers.length, maxWinners); i++) {
      const performer = sortedPerformers[i];
      const place = i + 1;
      let rewardMessage = '';

      // Build reward message based on place and available rewards
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
          if (creator.customReward4th && (creator.customRewardType === 'top5' || creator.customRewardType === 'top10')) {
            rewardMessage = `#${place} This ${creator.customRewardTimeframe} - ${creator.customReward4th}!`;
          }
          break;
        case 5:
          if (creator.customReward5th && (creator.customRewardType === 'top5' || creator.customRewardType === 'top10')) {
            rewardMessage = `#${place} This ${creator.customRewardTimeframe} - ${creator.customReward5th}!`;
          }
          break;
        default: // 6-10
          if (creator.customReward6to10 && creator.customRewardType === 'top10') {
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

  // ========================================
  // SUMMARY
  // ========================================

  console.log('📊 SEEDING COMPLETE - SUMMARY:');
  console.log('================================');
  console.log(`✅ 3 Communities created`);
  console.log(`✅ 180 Members created (100 + 50 + 30)`);
  console.log(`✅ ${totalClicks} Attribution clicks`);
  console.log(`✅ ${convertedClicks} Conversions (${(convertedClicks/totalClicks*100).toFixed(1)}% rate)`);
  console.log(`✅ ${totalCommissions} Commission records`);
  console.log(`✅ Rankings calculated (global & community)`);
  console.log(`✅ Custom rewards eligibility set`);
  console.log('\n🎉 Database seeding completed successfully!');

  // Display sample URLs for testing
  console.log('\n🔗 SAMPLE TEST URLS:');
  console.log('================================');
  console.log('\n📱 Member Dashboards:');
  const sampleMembers = allMembers.slice(0, 5);
  for (const member of sampleMembers) {
    console.log(`http://localhost:3000/customer/${member.membershipId} (${member.username})`);
  }

  console.log('\n🏢 Creator Dashboards:');
  for (const community of communities) {
    console.log(`http://localhost:3000/seller-product/${community.creator.productId} (${community.name})`);
  }

  console.log('\n🔗 Referral Links:');
  const sampleReferrals = allMembers.slice(0, 3);
  for (const member of sampleReferrals) {
    console.log(`http://localhost:3000/r/${member.referralCode}`);
  }
}

// Run the seeding
seed()
  .catch((error) => {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });