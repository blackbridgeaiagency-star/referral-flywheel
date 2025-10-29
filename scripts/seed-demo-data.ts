// scripts/seed-demo-data.ts
// 📸 DEMO DATA FOR MARKETING SCREENSHOTS
// Creates impressive-looking data for Whop discover page screenshots

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configuration for demo data
const DEMO_CONFIG = {
  creatorCompanyId: 'biz_kkGoY7OvzWXRdK', // Your actual company ID
  heroMemberEmail: 'hero@demo.com',
  heroUsername: 'TopEarner',
  totalMembers: 150,
  topEarnersCount: 25,
  avgMonthlyPrice: 49.99,
};

async function main() {
  console.log('🎬 Starting demo data seed...\n');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. Get or create the creator
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('📊 Setting up creator...');
  const creator = await prisma.creator.upsert({
    where: { companyId: DEMO_CONFIG.creatorCompanyId },
    update: {
      totalReferrals: DEMO_CONFIG.totalMembers,
      totalRevenue: DEMO_CONFIG.totalMembers * DEMO_CONFIG.avgMonthlyPrice * 0.7, // 70% creator share
      monthlyRevenue: 7500, // Impressive monthly revenue
      customRewardEnabled: true,
      customRewardTimeframe: 'monthly',
      customRewardType: 'top10',
      customReward1st: 'iPhone 15 Pro Max',
      customReward2nd: 'iPad Air',
      customReward3rd: 'AirPods Pro',
      customReward4th: '$500 Cash',
      customReward5th: '$300 Cash',
      customReward6to10: '$100 Cash',
    },
    create: {
      companyId: DEMO_CONFIG.creatorCompanyId,
      companyName: 'Premium Growth Community',
      productId: 'prod_demo',
      totalReferrals: DEMO_CONFIG.totalMembers,
      totalRevenue: DEMO_CONFIG.totalMembers * DEMO_CONFIG.avgMonthlyPrice * 0.7,
      monthlyRevenue: 7500,
      customRewardEnabled: true,
      customRewardTimeframe: 'monthly',
      customRewardType: 'top10',
      customReward1st: 'iPhone 15 Pro Max',
      customReward2nd: 'iPad Air',
      customReward3rd: 'AirPods Pro',
      customReward4th: '$500 Cash',
      customReward5th: '$300 Cash',
      customReward6to10: '$100 Cash',
    },
  });
  console.log(`✅ Creator updated with impressive stats\n`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. Create the HERO member (for member dashboard screenshot)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('⭐ Creating HERO member...');
  const heroMember = await prisma.member.upsert({
    where: { userId: 'hero_user_demo' },
    update: {
      lifetimeEarnings: 4850.75,
      monthlyEarnings: 1250.50,
      totalReferred: 97,
      monthlyReferred: 25,
      globalEarningsRank: 8, // Top 10!
      globalReferralsRank: 5,
      communityRank: 1, // #1 in community
      currentTier: 'platinum',
      customRewardEligible: true,
      customRewardTimeframeRank: 3,
      customRewardMessage: '#3 This Month - AirPods Pro!',
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
      lifetimeEarnings: 4850.75,
      monthlyEarnings: 1250.50,
      totalReferred: 97,
      monthlyReferred: 25,
      globalEarningsRank: 8,
      globalReferralsRank: 5,
      communityRank: 1,
      currentTier: 'platinum',
      customRewardEligible: true,
      customRewardTimeframeRank: 3,
      customRewardMessage: '#3 This Month - AirPods Pro!',
      welcomeMessageSent: true,
      creatorId: creator.id,
    },
  });
  console.log(`✅ Hero member created: ${heroMember.username} (#${heroMember.globalEarningsRank} globally)\n`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. Create TOP 25 earners (for leaderboards)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('👥 Creating top 25 earners...');
  const topEarners: any[] = [];

  for (let i = 1; i <= DEMO_CONFIG.topEarnersCount; i++) {
    const isHero = i === 8; // Hero is #8 globally
    if (isHero) {
      topEarners.push(heroMember);
      continue;
    }

    const earnings = 5500 - (i * 150); // Decreasing earnings
    const referrals = 120 - (i * 3);
    const monthlyEarnings = earnings * 0.25; // ~25% from this month

    const member = await prisma.member.upsert({
      where: { userId: `top_earner_${i}` },
      update: {
        lifetimeEarnings: earnings,
        monthlyEarnings: monthlyEarnings,
        totalReferred: referrals,
        monthlyReferred: Math.floor(referrals * 0.2),
        globalEarningsRank: i,
        globalReferralsRank: i,
        communityRank: i,
      },
      create: {
        userId: `top_earner_${i}`,
        membershipId: `mem_top_${i}`,
        email: `earner${i}@demo.com`,
        username: `Earner_${i}`,
        subscriptionPrice: 49.99,
        memberOrigin: 'organic',
        referralCode: `EARNER${i}-${String(Math.random()).slice(2, 8).toUpperCase()}`,
        billingPeriod: 'monthly',
        monthlyValue: 49.99,
        lifetimeEarnings: earnings,
        monthlyEarnings: monthlyEarnings,
        totalReferred: referrals,
        monthlyReferred: Math.floor(referrals * 0.2),
        globalEarningsRank: i,
        globalReferralsRank: i,
        communityRank: i,
        currentTier: i <= 5 ? 'platinum' : i <= 15 ? 'gold' : 'silver',
        customRewardEligible: i <= 10,
        customRewardTimeframeRank: i <= 10 ? i : null,
        customRewardMessage: i === 1 ? '#1 This Month - iPhone 15 Pro Max!' :
                            i === 2 ? '#2 This Month - iPad Air!' :
                            i === 3 ? '#3 This Month - AirPods Pro!' :
                            i <= 10 ? `#${i} This Month - $${i <= 5 ? (600 - i * 100) : 100} Cash!` : null,
        welcomeMessageSent: true,
        creatorId: creator.id,
      },
    });
    topEarners.push(member);
  }
  console.log(`✅ Created ${DEMO_CONFIG.topEarnersCount} top earners\n`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. Create additional regular members (for total count)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('👤 Creating regular members...');
  const regularMemberCount = DEMO_CONFIG.totalMembers - DEMO_CONFIG.topEarnersCount;

  for (let i = 1; i <= regularMemberCount; i++) {
    const earnings = Math.random() * 500; // $0-500
    const referrals = Math.floor(Math.random() * 10); // 0-10 referrals

    await prisma.member.upsert({
      where: { userId: `regular_member_${i}` },
      update: {
        lifetimeEarnings: earnings,
        monthlyEarnings: earnings * 0.3,
        totalReferred: referrals,
        monthlyReferred: Math.floor(referrals * 0.4),
      },
      create: {
        userId: `regular_member_${i}`,
        membershipId: `mem_regular_${i}`,
        email: `member${i}@demo.com`,
        username: `Member_${i}`,
        subscriptionPrice: 49.99,
        memberOrigin: Math.random() > 0.5 ? 'referred' : 'organic',
        referralCode: `MEMBER${i}-${String(Math.random()).slice(2, 8).toUpperCase()}`,
        referredBy: Math.random() > 0.5 ? topEarners[Math.floor(Math.random() * topEarners.length)]?.referralCode : null,
        billingPeriod: 'monthly',
        monthlyValue: 49.99,
        lifetimeEarnings: earnings,
        monthlyEarnings: earnings * 0.3,
        totalReferred: referrals,
        monthlyReferred: Math.floor(referrals * 0.4),
        welcomeMessageSent: true,
        creatorId: creator.id,
      },
    });

    if (i % 20 === 0) {
      console.log(`   Created ${i}/${regularMemberCount} regular members...`);
    }
  }
  console.log(`✅ Created ${regularMemberCount} regular members\n`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 5. Create commission history for earnings chart (last 30 days)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('📈 Creating commission history for earnings chart...');
  const now = new Date();
  const commissionsCreated = [];

  // Create commissions for hero member over last 30 days
  for (let day = 0; day < 30; day++) {
    const commissionsPerDay = Math.floor(Math.random() * 3) + 1; // 1-3 per day

    for (let i = 0; i < commissionsPerDay; i++) {
      const commissionDate = new Date(now);
      commissionDate.setDate(commissionDate.getDate() - day);
      commissionDate.setHours(Math.floor(Math.random() * 24));

      const saleAmount = DEMO_CONFIG.avgMonthlyPrice;
      const memberShare = saleAmount * 0.10;
      const creatorShare = saleAmount * 0.70;
      const platformShare = saleAmount * 0.20;

      const commission = await prisma.commission.create({
        data: {
          whopPaymentId: `payment_demo_${day}_${i}_${Date.now()}`,
          whopMembershipId: `mem_ref_${day}_${i}`,
          saleAmount,
          memberShare,
          creatorShare,
          platformShare,
          paymentType: 'recurring',
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
  console.log(`✅ Created ${commissionsCreated.length} commission records\n`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 6. Create share events for hero member
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('📤 Creating share events...');
  const platforms = ['twitter', 'facebook', 'whatsapp', 'telegram', 'reddit', 'email', 'clipboard'];

  for (let i = 0; i < 45; i++) {
    const shareDate = new Date(now);
    shareDate.setDate(shareDate.getDate() - Math.floor(Math.random() * 30));

    await prisma.shareEvent.create({
      data: {
        memberId: heroMember.id,
        platform: platforms[Math.floor(Math.random() * platforms.length)],
        shareType: 'link',
        createdAt: shareDate,
      },
    });
  }
  console.log(`✅ Created 45 share events\n`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Summary
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n🎉 DEMO DATA SEED COMPLETE!\n');
  console.log('📊 Summary:');
  console.log(`   • Creator: ${creator.companyName}`);
  console.log(`   • Total Members: ${DEMO_CONFIG.totalMembers}`);
  console.log(`   • Total Revenue: $${creator.totalRevenue.toFixed(2)}`);
  console.log(`   • Monthly Revenue: $${creator.monthlyRevenue.toFixed(2)}`);
  console.log(`\n⭐ Hero Member for Screenshots:`);
  console.log(`   • Username: ${heroMember.username}`);
  console.log(`   • Email: ${heroMember.email}`);
  console.log(`   • User ID: ${heroMember.userId}`);
  console.log(`   • Lifetime Earnings: $${heroMember.lifetimeEarnings.toFixed(2)}`);
  console.log(`   • Monthly Earnings: $${heroMember.monthlyEarnings.toFixed(2)}`);
  console.log(`   • Global Rank: #${heroMember.globalEarningsRank}`);
  console.log(`   • Total Referred: ${heroMember.totalReferred}`);
  console.log(`   • Competition Status: ${heroMember.customRewardMessage}`);
  console.log(`\n📸 Ready for screenshots!`);
  console.log(`   • Creator Dashboard: /seller-product/${DEMO_CONFIG.creatorCompanyId}`);
  console.log(`   • Member Dashboard: /customer/mem_hero_demo`);
  console.log(`\n⚠️  Remember to run cleanup script after taking screenshots!`);
  console.log(`   • Run: npm run cleanup-demo-data\n`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding demo data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
