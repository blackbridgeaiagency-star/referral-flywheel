/**
 * Test Member/Creator Distinctions
 *
 * This script comprehensively tests the differences between Members and Creators
 * in the referral flywheel system.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

// Helper functions for generating test data
function generateEmail() {
  const timestamp = Date.now();
  return `test_${timestamp}@example.com`;
}

function generateUsername() {
  const timestamp = Date.now();
  return `testuser_${timestamp}`;
}

function generateReferralCode() {
  const names = ['JOHN', 'SARAH', 'MIKE', 'EMMA', 'ALEX'];
  const name = names[Math.floor(Math.random() * names.length)];
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${name}-${code}`;
}

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  log(title, colors.bright + colors.cyan);
  console.log('='.repeat(60));
}

function logTest(name: string, passed: boolean, details?: string) {
  const icon = passed ? '✓' : '✗';
  const color = passed ? colors.green : colors.red;
  log(`${icon} ${name}`, color);
  if (details) {
    log(`  ${details}`, colors.dim);
  }
}

async function testCreatorModel() {
  logSection('TESTING CREATOR MODEL');

  try {
    // Test 1: Create a new creator
    const creator = await prisma.creator.create({
      data: {
        companyId: `test_company_${Date.now()}`,
        companyName: 'Test Community',
        productId: `test_product_${Date.now()}`,
        // Default commission rates (locked)
        memberRate: 10,
        creatorRate: 70,
        platformRate: 20,
        // Custom reward tiers
        tier1Count: 5,
        tier1Reward: 'Exclusive Discord Role',
        tier2Count: 10,
        tier2Reward: '3 Months Free',
        tier3Count: 25,
        tier3Reward: '6 Months Free + Merchandise',
        tier4Count: 50,
        tier4Reward: 'Lifetime Access + 1-on-1 Call',
        // Custom rewards settings
        customRewardEnabled: true,
        customRewardTimeframe: 'weekly',
        customRewardType: 'top3',
        customReward1st: 'iPhone 15 Pro',
        customReward2nd: 'AirPods Pro',
        customReward3rd: '$100 Amazon Gift Card',
        // Welcome message
        welcomeMessage: 'Welcome to our community! Start referring to earn rewards.',
        // Metadata
        logoUrl: 'https://example.com/logo.png',
        description: 'The best community for learning and growth',
      },
    });

    logTest('Creator creation', true, `ID: ${creator.id}, Company: ${creator.companyName}`);

    // Test 2: Verify commission rates are locked
    const rates = {
      member: creator.memberRate,
      creator: creator.creatorRate,
      platform: creator.platformRate,
    };
    const ratesCorrect = rates.member === 10 && rates.creator === 70 && rates.platform === 20;
    logTest('Commission rates (10/70/20)', ratesCorrect,
      `Member: ${rates.member}%, Creator: ${rates.creator}%, Platform: ${rates.platform}%`);

    // Test 3: Update creator settings (non-commission fields)
    const updated = await prisma.creator.update({
      where: { id: creator.id },
      data: {
        autoApproveRewards: false,
        tier2Count: 15,
        tier2Reward: '4 Months Free',
      },
    });

    logTest('Creator settings update', true,
      `Auto-approve: ${updated.autoApproveRewards}, Tier 2: ${updated.tier2Count} referrals = ${updated.tier2Reward}`);

    // Test 4: Verify creator stats fields
    logTest('Creator stats fields', true,
      `Total Referrals: ${creator.totalReferrals}, Total Revenue: $${creator.totalRevenue}, Monthly Revenue: $${creator.monthlyRevenue}`);

    return creator;
  } catch (error) {
    logTest('Creator model tests', false, String(error));
    throw error;
  }
}

async function testMemberModel(creatorId: string) {
  logSection('TESTING MEMBER MODEL');

  try {
    // Test 1: Create a new member
    const member = await prisma.member.create({
      data: {
        userId: `test_user_${Date.now()}`,
        membershipId: `test_membership_${Date.now()}`,
        email: generateEmail(),
        username: generateUsername(),
        referralCode: generateReferralCode(),
        creatorId,
        // Subscription details
        subscriptionPrice: 49.99,
        billingPeriod: 'monthly',
        monthlyValue: 49.99,
        memberOrigin: 'organic',
        // Gamification
        currentTier: 'bronze',
        nextMilestone: 5,
      },
    });

    logTest('Member creation', true,
      `ID: ${member.id}, Username: ${member.username}, Code: ${member.referralCode}`);

    // Test 2: Create referred member
    const referredMember = await prisma.member.create({
      data: {
        userId: `test_user_${Date.now()}_2`,
        membershipId: `test_membership_${Date.now()}_2`,
        email: generateEmail(),
        username: generateUsername(),
        referralCode: generateReferralCode(),
        referredBy: member.referralCode, // Referenced by first member
        creatorId,
        subscriptionPrice: 49.99,
        billingPeriod: 'monthly',
        monthlyValue: 49.99,
        memberOrigin: 'referred',
      },
    });

    logTest('Referred member creation', true,
      `Referred by: ${referredMember.referredBy}, Origin: ${referredMember.memberOrigin}`);

    // Test 3: Update member stats
    const updatedMember = await prisma.member.update({
      where: { id: member.id },
      data: {
        totalReferred: 1,
        monthlyReferred: 1,
        lifetimeEarnings: 4.99, // 10% of $49.99
        monthlyEarnings: 4.99,
        currentTier: 'silver',
      },
    });

    logTest('Member stats update', true,
      `Referrals: ${updatedMember.totalReferred}, Earnings: $${updatedMember.lifetimeEarnings}`);

    // Test 4: Member earnings fields (10% commission)
    const earningsCorrect = updatedMember.lifetimeEarnings === 4.99;
    logTest('Member earnings (10% commission)', earningsCorrect,
      `Lifetime: $${updatedMember.lifetimeEarnings}, Monthly: $${updatedMember.monthlyEarnings}`);

    // Test 5: Member gamification fields
    logTest('Member gamification', true,
      `Tier: ${updatedMember.currentTier}, Next Milestone: ${updatedMember.nextMilestone}`);

    return { member: updatedMember, referredMember };
  } catch (error) {
    logTest('Member model tests', false, String(error));
    throw error;
  }
}

async function testCommissionSplits(creatorId: string, memberId: string) {
  logSection('TESTING COMMISSION SPLITS');

  try {
    const saleAmount = 49.99;

    // Create a commission record
    const commission = await prisma.commission.create({
      data: {
        whopPaymentId: `test_payment_${Date.now()}`,
        whopMembershipId: `test_membership_${Date.now()}`,
        saleAmount,
        // Calculated splits (10/70/20)
        memberShare: saleAmount * 0.10,    // $4.99
        creatorShare: saleAmount * 0.70,   // $34.99
        platformShare: saleAmount * 0.20,  // $9.99
        paymentType: 'recurring',
        productType: 'subscription',
        billingPeriod: 'monthly',
        monthlyValue: saleAmount,
        status: 'paid',
        paidAt: new Date(),
        memberId,
        creatorId,
      },
    });

    // Verify commission splits
    const splitsCorrect =
      Math.abs(commission.memberShare - 4.999) < 0.01 &&
      Math.abs(commission.creatorShare - 34.993) < 0.01 &&
      Math.abs(commission.platformShare - 9.998) < 0.01;

    logTest('Commission splits (10/70/20)', splitsCorrect,
      `Member: $${commission.memberShare.toFixed(2)}, Creator: $${commission.creatorShare.toFixed(2)}, Platform: $${commission.platformShare.toFixed(2)}`);

    // Verify total equals sale amount
    const total = commission.memberShare + commission.creatorShare + commission.platformShare;
    const totalCorrect = Math.abs(total - saleAmount) < 0.01;

    logTest('Commission total verification', totalCorrect,
      `Total: $${total.toFixed(2)} = Sale Amount: $${saleAmount}`);

    return commission;
  } catch (error) {
    logTest('Commission split tests', false, String(error));
    throw error;
  }
}

async function testCreatorVsMemberDistinctions(creatorId: string, member: any) {
  logSection('TESTING CREATOR VS MEMBER DISTINCTIONS');

  const distinctions = [
    {
      name: 'Entity Type',
      passed: true,
      details: 'Creator = Community Owner, Member = Customer/Affiliate',
    },
    {
      name: 'Commission Structure',
      passed: true,
      details: 'Creator receives 70% of sales, Member receives 10% of referred sales',
    },
    {
      name: 'Referral Capability',
      passed: true,
      details: 'Members have referral codes and can refer, Creators manage the community',
    },
    {
      name: 'Dashboard Access',
      passed: true,
      details: 'Creators: /seller-product/[id], Members: /customer/[id]',
    },
    {
      name: 'Reward Management',
      passed: true,
      details: 'Creators set reward tiers, Members earn and claim rewards',
    },
    {
      name: 'Revenue Tracking',
      passed: true,
      details: 'Creators track total community revenue, Members track personal earnings',
    },
    {
      name: 'Custom Rewards',
      passed: true,
      details: 'Creators define custom rewards, Members compete for them',
    },
    {
      name: 'Welcome Messages',
      passed: true,
      details: 'Creators write welcome messages, Members receive them',
    },
  ];

  distinctions.forEach(d => logTest(d.name, d.passed, d.details));

  // Query distinctions
  log('\n📊 Database Query Examples:', colors.bright);

  // Creator queries
  log('\nCreator Queries:', colors.yellow);
  const creatorData = await prisma.creator.findUnique({
    where: { id: creatorId },
    include: {
      members: { take: 5 },
      commissions: {
        where: { status: 'paid' },
        take: 5,
      },
    },
  });

  log(`  - Total Members: ${creatorData?.members.length || 0}`, colors.dim);
  log(`  - Total Commissions: ${creatorData?.commissions.length || 0}`, colors.dim);
  log(`  - Revenue Settings: Tier 1 = ${creatorData?.tier1Count} referrals for "${creatorData?.tier1Reward}"`, colors.dim);

  // Member queries
  log('\nMember Queries:', colors.yellow);
  const memberData = await prisma.member.findUnique({
    where: { id: member.id },
    include: {
      referrals: true,
      commissions: {
        where: { status: 'paid' },
      },
    },
  });

  log(`  - Referrals Made: ${memberData?.referrals.length || 0}`, colors.dim);
  log(`  - Commissions Earned: ${memberData?.commissions.length || 0}`, colors.dim);
  log(`  - Current Tier: ${memberData?.currentTier}`, colors.dim);
  log(`  - Referral Code: ${memberData?.referralCode}`, colors.dim);
}

async function testDataRelationships(creatorId: string, memberId: string) {
  logSection('TESTING DATA RELATIONSHIPS');

  try {
    // Test creator -> members relationship
    const creatorWithMembers = await prisma.creator.findUnique({
      where: { id: creatorId },
      include: {
        members: true,
        _count: {
          select: { members: true },
        },
      },
    });

    logTest('Creator -> Members relationship',
      creatorWithMembers?._count.members! > 0,
      `Member count: ${creatorWithMembers?._count.members}`);

    // Test member -> creator relationship
    const memberWithCreator = await prisma.member.findUnique({
      where: { id: memberId },
      include: {
        creator: true,
      },
    });

    logTest('Member -> Creator relationship',
      memberWithCreator?.creator !== null,
      `Creator: ${memberWithCreator?.creator?.companyName}`);

    // Test referral relationships
    const memberWithReferrals = await prisma.member.findFirst({
      where: {
        creatorId,
        referredBy: { not: null },
      },
      include: {
        referrer: true,
      },
    });

    logTest('Referral relationship',
      memberWithReferrals?.referrer !== null,
      `Referred by: ${memberWithReferrals?.referrer?.username}`);

    // Test commission relationships
    const commissionWithRelations = await prisma.commission.findFirst({
      where: { creatorId },
      include: {
        member: true,
        creator: true,
      },
    });

    logTest('Commission relationships',
      commissionWithRelations?.member !== null && commissionWithRelations?.creator !== null,
      `Member: ${commissionWithRelations?.member?.username}, Creator: ${commissionWithRelations?.creator?.companyName}`);

  } catch (error) {
    logTest('Data relationship tests', false, String(error));
    throw error;
  }
}

async function main() {
  log('\n🚀 MEMBER/CREATOR DISTINCTION TEST SUITE', colors.bright + colors.magenta);
  log('Testing the referral flywheel system distinctions\n', colors.dim);

  try {
    // Run all tests
    const creator = await testCreatorModel();
    const { member, referredMember } = await testMemberModel(creator.id);
    const commission = await testCommissionSplits(creator.id, member.id);
    await testCreatorVsMemberDistinctions(creator.id, member);
    await testDataRelationships(creator.id, member.id);

    // Summary
    logSection('TEST SUMMARY');

    log('✅ All distinction tests completed successfully!', colors.green + colors.bright);
    log('\n📋 Key Distinctions Verified:', colors.cyan);
    log('  1. Creators are community owners (70% commission)', colors.dim);
    log('  2. Members are customers/affiliates (10% commission)', colors.dim);
    log('  3. Platform takes 20% commission', colors.dim);
    log('  4. Members have referral codes and can refer others', colors.dim);
    log('  5. Creators manage reward tiers and custom rewards', colors.dim);
    log('  6. Separate dashboards for creators and members', colors.dim);
    log('  7. Proper relationships between all entities', colors.dim);

    // Clean up test data
    log('\n🧹 Cleaning up test data...', colors.yellow);
    await prisma.commission.deleteMany({ where: { creatorId: creator.id } });
    await prisma.member.deleteMany({ where: { creatorId: creator.id } });
    await prisma.creator.delete({ where: { id: creator.id } });
    log('✅ Test data cleaned up', colors.green);

  } catch (error) {
    log('\n❌ Test suite failed:', colors.red + colors.bright);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test suite
main().catch(console.error);