// scripts/seed-demo-data.ts
// 📸 ENHANCED DEMO DATA FOR MARKETING SCREENSHOTS
// Creates comprehensive, natural-looking data with referral tracking and activity

import { PrismaClient } from '@prisma/client';
import logger from '../lib/logger';


const prisma = new PrismaClient();

// Enhanced configuration for realistic demo data
const DEMO_CONFIG = {
  creatorCompanyId: 'biz_kkGoY7OvzWXRdK', // Your actual company ID
  heroMemberEmail: 'hero@demo.com',
  heroUsername: 'TopEarner',
  totalMembers: 750, // Much larger community
  topEarnersCount: 50, // Top 50 for competitive leaderboard
  avgMonthlyPrice: 49.99,
  conversionRate: 0.28, // 28% of clicks convert
  daysOfHistory: 90, // 3 months of activity
  maxAttributionClicks: 2500, // Limit clicks for faster seeding (still shows tracking)
};

// Helper: Generate realistic first names
const firstNames = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jamie', 'Dakota',
  'Skyler', 'Phoenix', 'River', 'Sage', 'Quinn', 'Blake', 'Drew', 'Cameron',
  'Avery', 'Peyton', 'Reese', 'Charlie', 'Rowan', 'Finley', 'Emerson', 'Hayden',
  'Parker', 'Sawyer', 'Kendall', 'Logan', 'Bailey', 'Elliot', 'Sam', 'Jesse',
  'Frankie', 'Devon', 'Spencer', 'Tanner', 'Tyler', 'Robin', 'Harley', 'Marley',
  'Jules', 'Remy', 'Kai', 'Ari', 'Lex', 'Max', 'Winter', 'Echo', 'Nova', 'Zen'
];

// Helper: Generate random date within range
function randomDate(daysAgo: number, forceThisMonth: boolean = false) {
  const date = new Date();

  if (forceThisMonth) {
    // Generate date within THIS month only (October 2025)
    const daysIntoMonth = Math.floor(Math.random() * 29); // Day 1-29 of October
    date.setDate(daysIntoMonth + 1);
  } else {
    // Generate date within past X days
    date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  }

  date.setHours(Math.floor(Math.random() * 24));
  date.setMinutes(Math.floor(Math.random() * 60));
  return date;
}

// Helper: Generate referral code
function generateReferralCode(firstName: string, index: number) {
  const code = String(Math.random()).slice(2, 8).toUpperCase();
  return `${firstName.toUpperCase()}-${code}`;
}

// Helper: Generate fingerprint
function generateFingerprint() {
  return `fp_${String(Math.random()).slice(2, 18)}`;
}

// Helper: Generate IP hash (SHA-256-like format)
function generateIpHash() {
  return `hash_${String(Math.random()).slice(2, 18)}${String(Math.random()).slice(2, 18)}`;
}

async function main() {
  logger.info(' Starting ENHANCED demo data seed...\n');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. Get or create the creator
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  logger.info(' Setting up creator with impressive metrics...');
  const totalRevenue = DEMO_CONFIG.totalMembers * DEMO_CONFIG.avgMonthlyPrice * 0.7; // 70% creator share

  const creator = await prisma.creator.upsert({
    where: { companyId: DEMO_CONFIG.creatorCompanyId },
    update: {
      totalReferrals: DEMO_CONFIG.totalMembers,
      totalRevenue: totalRevenue,
      monthlyRevenue: 22500, // Impressive monthly revenue
      customRewardEnabled: true,
      customRewardTimeframe: 'monthly',
      customRewardType: 'top10',
      customReward1st: 'iPhone 15 Pro Max + $1,000',
      customReward2nd: 'iPad Air + $750',
      customReward3rd: 'AirPods Pro + $500',
      customReward4th: '$500 Cash',
      customReward5th: '$400 Cash',
      customReward6to10: '$200 Cash',
    },
    create: {
      companyId: DEMO_CONFIG.creatorCompanyId,
      companyName: 'Premium Growth Community',
      productId: 'prod_demo',
      totalReferrals: DEMO_CONFIG.totalMembers,
      totalRevenue: totalRevenue,
      monthlyRevenue: 22500,
      customRewardEnabled: true,
      customRewardTimeframe: 'monthly',
      customRewardType: 'top10',
      customReward1st: 'iPhone 15 Pro Max + $1,000',
      customReward2nd: 'iPad Air + $750',
      customReward3rd: 'AirPods Pro + $500',
      customReward4th: '$500 Cash',
      customReward5th: '$400 Cash',
      customReward6to10: '$200 Cash',
    },
  });
  logger.info('Creator updated: $${totalRevenue.toFixed(2)} total revenue\n');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. Create the HERO member (for member dashboard screenshot)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  logger.debug('⭐ Creating HERO member with impressive stats...');
  const heroMember = await prisma.member.upsert({
    where: { userId: 'hero_user_demo' },
    update: {
      lifetimeEarnings: 8450.75,
      monthlyEarnings: 2150.50,
      totalReferred: 169,
      monthlyReferred: 43,
      globalEarningsRank: 8, // Top 10!
      globalReferralsRank: 5,
      communityRank: 1, // #1 in community
      currentTier: 'platinum',
      customRewardEligible: true,
      customRewardTimeframeRank: 3,
      customRewardMessage: '#3 This Month - AirPods Pro + $500!',
    },
    create: {
      userId: 'hero_user_demo',
      membershipId: 'mem_hero_demo',
      email: DEMO_CONFIG.heroMemberEmail,
      username: DEMO_CONFIG.heroUsername,
      subscriptionPrice: 49.99,
      memberOrigin: 'organic',
      referralCode: 'TOPEARNER-HERO99',
      billingPeriod: 'monthly',
      monthlyValue: 49.99,
      lifetimeEarnings: 8450.75,
      monthlyEarnings: 2150.50,
      totalReferred: 169,
      monthlyReferred: 43,
      globalEarningsRank: 8,
      globalReferralsRank: 5,
      communityRank: 1,
      currentTier: 'platinum',
      customRewardEligible: true,
      customRewardTimeframeRank: 3,
      customRewardMessage: '#3 This Month - AirPods Pro + $500!',
      welcomeMessageSent: true,
      creatorId: creator.id,
      createdAt: randomDate(DEMO_CONFIG.daysOfHistory),
    },
  });
  logger.info('Hero member: ${heroMember.username} (#${heroMember.globalEarningsRank} globally, $${heroMember.lifetimeEarnings})\n');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. Create TOP 50 earners (for competitive leaderboards)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  logger.info(' Creating top 50 earners with realistic distribution...');
  const allMembers: any[] = [];

  for (let i = 1; i <= DEMO_CONFIG.topEarnersCount; i++) {
    const isHero = i === 8; // Hero is #8 globally
    if (isHero) {
      allMembers.push(heroMember);
      continue;
    }

    // Realistic earnings distribution (exponential decay)
    const baseEarnings = 12000 - (i * 180);
    const earnings = Math.max(baseEarnings + (Math.random() * 500 - 250), 500);
    const referrals = Math.max(Math.floor(200 - (i * 3) + (Math.random() * 20 - 10)), 5);
    const monthlyEarnings = earnings * (0.20 + Math.random() * 0.15); // 20-35% from this month

    const firstName = firstNames[i % firstNames.length];
    const member = await prisma.member.upsert({
      where: { userId: `top_earner_${i}` },
      update: {
        lifetimeEarnings: earnings,
        monthlyEarnings: monthlyEarnings,
        totalReferred: referrals,
        monthlyReferred: Math.floor(referrals * (0.15 + Math.random() * 0.15)),
        globalEarningsRank: i,
        globalReferralsRank: i + Math.floor(Math.random() * 10 - 5),
        communityRank: i,
      },
      create: {
        userId: `top_earner_${i}`,
        membershipId: `mem_top_${i}`,
        email: `${firstName.toLowerCase()}${i}@demo.com`,
        username: `${firstName}_${i}`,
        subscriptionPrice: 49.99,
        memberOrigin: Math.random() > 0.3 ? 'referred' : 'organic',
        referralCode: generateReferralCode(firstName, i),
        referredBy: null, // Will link later
        billingPeriod: 'monthly',
        monthlyValue: 49.99,
        lifetimeEarnings: earnings,
        monthlyEarnings: monthlyEarnings,
        totalReferred: referrals,
        monthlyReferred: Math.floor(referrals * (0.15 + Math.random() * 0.15)),
        globalEarningsRank: i,
        globalReferralsRank: i + Math.floor(Math.random() * 10 - 5),
        communityRank: i,
        currentTier: i <= 10 ? 'platinum' : i <= 30 ? 'gold' : 'silver',
        customRewardEligible: i <= 10,
        customRewardTimeframeRank: i <= 10 ? i : null,
        customRewardMessage: i === 1 ? '#1 This Month - iPhone 15 Pro Max + $1,000!' :
                            i === 2 ? '#2 This Month - iPad Air + $750!' :
                            i === 3 ? '#3 This Month - AirPods Pro + $500!' :
                            i === 4 ? '#4 This Month - $500 Cash!' :
                            i === 5 ? '#5 This Month - $400 Cash!' :
                            i <= 10 ? `#${i} This Month - $200 Cash!` : null,
        welcomeMessageSent: true,
        creatorId: creator.id,
        createdAt: randomDate(DEMO_CONFIG.daysOfHistory),
      },
    });
    allMembers.push(member);
  }
  logger.info('Created ${DEMO_CONFIG.topEarnersCount} top earners\n');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. Create mid-tier members (ranks 51-200)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  logger.info(' Creating mid-tier members (ranks 51-200)...');

  for (let i = 51; i <= 200; i++) {
    const earnings = Math.max(500 - ((i - 50) * 2) + (Math.random() * 100 - 50), 50);
    const referrals = Math.max(Math.floor(30 - ((i - 50) * 0.1) + (Math.random() * 5)), 1);
    const firstName = firstNames[(i + 13) % firstNames.length];

    const member = await prisma.member.upsert({
      where: { userId: `mid_member_${i}` },
      update: {
        lifetimeEarnings: earnings,
        monthlyEarnings: earnings * (0.25 + Math.random() * 0.15),
        totalReferred: referrals,
        monthlyReferred: Math.floor(referrals * 0.3),
        globalEarningsRank: i,
      },
      create: {
        userId: `mid_member_${i}`,
        membershipId: `mem_mid_${i}`,
        email: `${firstName.toLowerCase()}.mid${i}@demo.com`,
        username: `${firstName}_${i}`,
        subscriptionPrice: 49.99,
        memberOrigin: Math.random() > 0.4 ? 'referred' : 'organic',
        referralCode: generateReferralCode(firstName, i),
        referredBy: Math.random() > 0.4 ? allMembers[Math.floor(Math.random() * allMembers.length)]?.referralCode : null,
        billingPeriod: 'monthly',
        monthlyValue: 49.99,
        lifetimeEarnings: earnings,
        monthlyEarnings: earnings * (0.25 + Math.random() * 0.15),
        totalReferred: referrals,
        monthlyReferred: Math.floor(referrals * 0.3),
        globalEarningsRank: i,
        globalReferralsRank: i + Math.floor(Math.random() * 20 - 10),
        currentTier: i <= 100 ? 'silver' : 'bronze',
        welcomeMessageSent: true,
        creatorId: creator.id,
        createdAt: randomDate(DEMO_CONFIG.daysOfHistory),
      },
    });
    allMembers.push(member);

    if (i % 30 === 0) {
      logger.debug(`   Created ${i}/200 mid-tier members...`);
    }
  }
  logger.info('Created 150 mid-tier members\n');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 5. Create lower-tier members (ranks 201-750)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  logger.info(' Creating lower-tier members (ranks 201-750)...');

  for (let i = 201; i <= DEMO_CONFIG.totalMembers; i++) {
    const earnings = Math.random() * 100; // $0-100
    const referrals = Math.floor(Math.random() * 5); // 0-5 referrals
    const firstName = firstNames[(i + 7) % firstNames.length];

    const member = await prisma.member.upsert({
      where: { userId: `regular_member_${i}` },
      update: {
        lifetimeEarnings: earnings,
        monthlyEarnings: earnings * (0.3 + Math.random() * 0.2),
        totalReferred: referrals,
        monthlyReferred: Math.floor(referrals * 0.5),
        globalEarningsRank: i,
      },
      create: {
        userId: `regular_member_${i}`,
        membershipId: `mem_regular_${i}`,
        email: `${firstName.toLowerCase()}.${i}@demo.com`,
        username: `${firstName}${i}`,
        subscriptionPrice: 49.99,
        memberOrigin: Math.random() > 0.5 ? 'referred' : 'organic',
        referralCode: generateReferralCode(firstName, i),
        referredBy: Math.random() > 0.5 ? allMembers[Math.floor(Math.random() * Math.min(allMembers.length, 100))]?.referralCode : null,
        billingPeriod: 'monthly',
        monthlyValue: 49.99,
        lifetimeEarnings: earnings,
        monthlyEarnings: earnings * (0.3 + Math.random() * 0.2),
        totalReferred: referrals,
        monthlyReferred: Math.floor(referrals * 0.5),
        globalEarningsRank: i,
        globalReferralsRank: i + Math.floor(Math.random() * 50 - 25),
        currentTier: 'bronze',
        welcomeMessageSent: Math.random() > 0.1,
        creatorId: creator.id,
        createdAt: randomDate(DEMO_CONFIG.daysOfHistory),
      },
    });
    allMembers.push(member);

    if (i % 100 === 0) {
      logger.debug(`   Created ${i}/${DEMO_CONFIG.totalMembers} members...`);
    }
  }
  logger.info('Created ${DEMO_CONFIG.totalMembers - 200} lower-tier members\n');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 6. Create attribution clicks (referral tracking)
  // LOGIC: Calculate clicks based on actual referral counts to ensure consistency
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  logger.info(' Creating attribution clicks (referral tracking)...');

  // Calculate total referrals across all members
  const totalReferrals = allMembers.reduce((sum, m) => sum + m.totalReferred, 0);
  const idealClicks = Math.floor(totalReferrals / DEMO_CONFIG.conversionRate); // e.g., 400 referrals / 0.28 = ~1429 clicks
  const totalClicks = Math.min(idealClicks, DEMO_CONFIG.maxAttributionClicks); // Cap for faster seeding
  const targetConversions = Math.floor(totalClicks * DEMO_CONFIG.conversionRate);

  logger.debug(`   Total referrals: ${totalReferrals}, generating ${totalClicks} clicks (targeting ${(DEMO_CONFIG.conversionRate * 100).toFixed(0)}% conversion)`);

  let conversionsCreated = 0;

  for (let i = 0; i < totalClicks; i++) {
    // Weight clicks towards top members (they have more referrals)
    const memberIndex = Math.floor(Math.random() * Math.min(allMembers.length, 100));
    const referrer = allMembers[memberIndex];

    // 30% of clicks should be from THIS MONTH to populate monthly stats
    const isThisMonth = Math.random() < 0.30;
    const clickDate = randomDate(DEMO_CONFIG.daysOfHistory, isThisMonth);

    // Convert only if we still need more conversions to hit target rate
    const shouldConvert = conversionsCreated < targetConversions;
    const wasConverted = shouldConvert && Math.random() < 0.30; // aim for ~28-30% conversion

    if (wasConverted) conversionsCreated++;

    const expiryDate = new Date(clickDate);
    expiryDate.setDate(expiryDate.getDate() + 30); // 30-day attribution window

    await prisma.attributionClick.create({
      data: {
        referralCode: referrer.referralCode,
        fingerprint: generateFingerprint(),
        ipHash: generateIpHash(),
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        converted: wasConverted,
        convertedAt: wasConverted ? new Date(clickDate.getTime() + Math.random() * 24 * 60 * 60 * 1000) : null,
        expiresAt: expiryDate,
        memberId: referrer.id,
        createdAt: clickDate,
      },
    });

    if ((i + 1) % 200 === 0) {
      logger.debug(`   Created ${i + 1}/${totalClicks} clicks (${conversionsCreated} conversions so far)...`);
    }
  }
  logger.info('Created ${totalClicks} attribution clicks (${conversionsCreated} conversions, ${((conversionsCreated / totalClicks) * 100).toFixed(1)}% rate)\n');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 7. Create commission history (last 90 days)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  logger.info(' Creating commission history for charts...');
  const commissionsCreated = [];

  // Create commissions for hero member
  for (let day = 0; day < 90; day++) {
    const commissionsPerDay = day < 30 ? Math.floor(Math.random() * 4) + 2 : Math.floor(Math.random() * 2) + 1;

    for (let i = 0; i < commissionsPerDay; i++) {
      // 40% from THIS MONTH to show monthly activity
      const isThisMonth = day < 10 || Math.random() < 0.40;
      const commissionDate = randomDate(day, isThisMonth);
      const saleAmount = DEMO_CONFIG.avgMonthlyPrice;
      const memberShare = saleAmount * 0.10;
      const creatorShare = saleAmount * 0.70;
      const platformShare = saleAmount * 0.20;

      const commission = await prisma.commission.create({
        data: {
          whopPaymentId: `payment_hero_${day}_${i}_${Date.now()}`,
          whopMembershipId: `mem_ref_hero_${day}_${i}`,
          saleAmount,
          memberShare,
          creatorShare,
          platformShare,
          paymentType: Math.random() > 0.3 ? 'recurring' : 'one_time',
          billingPeriod: 'monthly',
          monthlyValue: saleAmount,
          status: 'paid',
          paidAt: commissionDate,
          memberId: heroMember.id,
          creatorId: creator.id,
          createdAt: commissionDate,
        },
      });
      commissionsCreated.push(commission);
    }
  }

  // Create commissions for top 20 members
  for (const member of allMembers.slice(0, 20)) {
    if (member.id === heroMember.id) continue;

    const numCommissions = Math.floor(member.totalReferred * 0.3); // 30% of referrals
    for (let i = 0; i < numCommissions; i++) {
      const commissionDate = randomDate(DEMO_CONFIG.daysOfHistory);
      const saleAmount = DEMO_CONFIG.avgMonthlyPrice;

      const commission = await prisma.commission.create({
        data: {
          whopPaymentId: `payment_${member.userId}_${i}_${Date.now()}`,
          whopMembershipId: `mem_ref_${member.userId}_${i}`,
          saleAmount,
          memberShare: saleAmount * 0.10,
          creatorShare: saleAmount * 0.70,
          platformShare: saleAmount * 0.20,
          paymentType: Math.random() > 0.3 ? 'recurring' : 'one_time',
          billingPeriod: 'monthly',
          monthlyValue: saleAmount,
          status: 'paid',
          paidAt: commissionDate,
          memberId: member.id,
          creatorId: creator.id,
          createdAt: commissionDate,
        },
      });
      commissionsCreated.push(commission);
    }
  }
  logger.info('Created ${commissionsCreated.length} commission records\n');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 8. Create share events for multiple members
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  logger.info(' Creating share events across members...');
  const platforms = ['twitter', 'facebook', 'whatsapp', 'telegram', 'reddit', 'email', 'clipboard'];
  let totalShares = 0;

  // Hero member shares a lot
  for (let i = 0; i < 85; i++) {
    // 35% from THIS MONTH
    const isThisMonth = Math.random() < 0.35;
    await prisma.shareEvent.create({
      data: {
        memberId: heroMember.id,
        platform: platforms[Math.floor(Math.random() * platforms.length)],
        shareType: 'link',
        createdAt: randomDate(DEMO_CONFIG.daysOfHistory, isThisMonth),
      },
    });
    totalShares++;
  }

  // Top 30 members also share
  for (const member of allMembers.slice(0, 30)) {
    if (member.id === heroMember.id) continue;

    const shareCount = Math.floor(Math.random() * 20) + 5;
    for (let i = 0; i < shareCount; i++) {
      // 35% from THIS MONTH
      const isThisMonth = Math.random() < 0.35;
      await prisma.shareEvent.create({
        data: {
          memberId: member.id,
          platform: platforms[Math.floor(Math.random() * platforms.length)],
          shareType: Math.random() > 0.2 ? 'link' : 'custom',
          createdAt: randomDate(DEMO_CONFIG.daysOfHistory, isThisMonth),
        },
      });
      totalShares++;
    }
  }
  logger.info('Created ${totalShares} share events\n');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Summary
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Calculate final stats
  const attributionClickCount = totalClicks;
  const actualConversions = conversionsCreated;
  const actualConversionRate = ((actualConversions / attributionClickCount) * 100).toFixed(1);

  logger.debug('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info(' ENHANCED DEMO DATA SEED COMPLETE!\n');
  logger.info(' Creator Stats:');
  logger.debug(`   • Community: ${creator.companyName}`);
  logger.debug(`   • Total Members: ${DEMO_CONFIG.totalMembers}`);
  logger.debug(`   • Total Revenue: $${creator.totalRevenue.toFixed(2)}`);
  logger.debug(`   • Monthly Revenue: $${creator.monthlyRevenue.toFixed(2)}`);
  logger.debug(`\n⭐ Hero Member (Screenshot Ready):`);
  logger.debug(`   • Username: ${heroMember.username}`);
  logger.debug(`   • User ID: ${heroMember.userId}`);
  logger.debug(`   • Lifetime Earnings: $${heroMember.lifetimeEarnings.toFixed(2)}`);
  logger.debug(`   • Monthly Earnings: $${heroMember.monthlyEarnings.toFixed(2)}`);
  logger.debug(`   • Global Rank: #${heroMember.globalEarningsRank} (TOP 10!)`);
  logger.debug(`   • Total Referred: ${heroMember.totalReferred} members`);
  logger.debug(`   • Competition Status: ${heroMember.customRewardMessage}`);
  logger.debug(`\n📊 Database Summary:`);
  logger.debug(`   • Members: ${DEMO_CONFIG.totalMembers}`);
  logger.debug(`   • Attribution Clicks: ${attributionClickCount}`);
  logger.debug(`   • Conversions: ${actualConversions} (${actualConversionRate}% conversion rate) ✅`);
  logger.debug(`   • Commissions: ${commissionsCreated.length}`);
  logger.debug(`   • Share Events: ${totalShares}`);
  logger.debug(`\n✅ Data Consistency Check:`);
  logger.debug(`   • Total referrals: ${totalReferrals}`);
  logger.debug(`   • Attribution conversions: ${actualConversions}`);
  logger.debug(`   • Match: ${actualConversions <= totalReferrals ? '✅ Consistent!' : '❌ Mismatch!'}`);
  logger.debug(`\n📸 Screenshot URLs (Localhost):`);
  logger.debug(`   • Creator Dashboard: http://localhost:3000/seller-product/${DEMO_CONFIG.creatorCompanyId}`);
  logger.debug(`   • Member Dashboard: http://localhost:3000/customer/mem_hero_demo`);
  logger.debug(`   • Global Leaderboard: http://localhost:3000/leaderboard`);
  logger.debug(`\n⚠️  After screenshots, run cleanup:`);
  logger.debug(`   DATABASE_URL="your_db_url" npm run demo:cleanup`);
  logger.debug('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    logger.error('❌ Error seeding demo data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
