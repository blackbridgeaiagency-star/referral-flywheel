#!/usr/bin/env tsx
/**
 * INVOICE TEST DATA GENERATOR
 *
 * Creates test data for invoice generation testing:
 * - 10-15 test members (70% referred, 30% organic)
 * - 15-20 commissions for October 2025
 * - $500-1000 in total referred sales
 * - Proper 10%/70%/20% commission splits
 *
 * All test data is marked with TEST_INV_ prefix for safe deletion.
 *
 * Usage: npx tsx scripts/seed-invoice-test-data.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { randomUUID } from 'crypto';

// Load environment variables FIRST
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { PrismaClient } from '@prisma/client';
import { calculateCommission } from '../lib/utils/commission';

const prisma = new PrismaClient();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONFIGURATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CONFIG = {
  creatorCompanyId: 'biz_ImvAT3IIRbPBT', // Your creator's company ID
  memberCount: { min: 10, max: 15 },      // 10-15 test members
  commissionCount: { min: 15, max: 20 },  // 15-20 commissions
  saleAmountRange: { min: 50, max: 100 }, // $50-100 per sale
  referredPercentage: 0.70,               // 70% referred, 30% organic
  // Use LAST MONTH (October) for invoice generation testing
  testMonth: {
    start: new Date('2025-10-01T00:00:00Z'),
    end: new Date('2025-10-31T23:59:59Z'),
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPER FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomDate(start: Date, end: Date): Date {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const randomTime = startTime + Math.random() * (endTime - startTime);
  return new Date(randomTime);
}

function generateReferralCode(index: number): string {
  const code = String(Math.random()).slice(2, 8).toUpperCase();
  return `TESTINV${index}-${code}`;
}

const firstNames = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jamie', 'Dakota',
  'Skyler', 'Phoenix', 'River', 'Sage', 'Quinn', 'Blake', 'Drew', 'Cameron'
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN FUNCTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function seedInvoiceTestData() {
  console.log('\n' + '='.repeat(70));
  console.log('📊 INVOICE TEST DATA GENERATOR');
  console.log('='.repeat(70));
  console.log('\n⚠️  All data will be marked with TEST_INV_ prefix for safe deletion\n');

  try {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 1: Validate Environment
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('🔍 Step 1: Validating environment...');

    if (!process.env.DATABASE_URL) {
      throw new Error('❌ DATABASE_URL not found in .env.local');
    }
    console.log('   ✅ DATABASE_URL configured');

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 2: Find Creator
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n🔍 Step 2: Finding creator...');

    const creator = await prisma.creator.findUnique({
      where: { companyId: CONFIG.creatorCompanyId },
    });

    if (!creator) {
      throw new Error(
        `❌ Creator not found with companyId: ${CONFIG.creatorCompanyId}\n` +
        '   Please check your database or update CONFIG.creatorCompanyId'
      );
    }

    console.log(`   ✅ Found creator: ${creator.companyName} (${creator.companyId})`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 3: Check for Existing Test Data
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n🔍 Step 3: Checking for existing test data...');

    const existingTestMembers = await prisma.member.count({
      where: {
        OR: [
          { userId: { startsWith: 'TEST_INV_' } },
          { email: { contains: '@test-data.temp' } },
        ],
      },
    });

    if (existingTestMembers > 0) {
      console.log(`   ⚠️  Found ${existingTestMembers} existing test members`);
      console.log('   💡 Run cleanup script first: npx tsx scripts/remove-invoice-test-data.ts');
      console.log('   📌 Proceeding anyway (test data will be additive)...\n');
    } else {
      console.log('   ✅ No existing test data found\n');
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 4: Generate Test Members
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const memberCount = randomInt(CONFIG.memberCount.min, CONFIG.memberCount.max);
    console.log(`📝 Step 4: Creating ${memberCount} test members...`);

    const createdMembers: any[] = [];
    const referredMembers: any[] = [];

    for (let i = 1; i <= memberCount; i++) {
      const isReferred = Math.random() < CONFIG.referredPercentage;
      const firstName = firstNames[i % firstNames.length];
      const joinDate = randomDate(
        new Date('2025-09-01T00:00:00Z'), // Joined before October
        new Date('2025-09-30T23:59:59Z')
      );

      const member = await prisma.member.create({
        data: {
          userId: `TEST_INV_member_${i}`,
          membershipId: `TEST_INV_membership_${i}`,
          email: `test.invoice.${i}@test-data.temp`,
          username: `${firstName}_TestInv${i}`,
          subscriptionPrice: 49.99,
          memberOrigin: isReferred ? 'referred' : 'organic',
          referralCode: generateReferralCode(i),
          billingPeriod: 'monthly',
          monthlyValue: 49.99,
          lifetimeEarnings: 0,
          monthlyEarnings: 0,
          totalReferred: 0,
          monthlyReferred: 0,
          welcomeMessageSent: true,
          creatorId: creator.id,
          createdAt: joinDate,
        },
      });

      createdMembers.push(member);
      if (isReferred) {
        referredMembers.push(member);
      }

      if (i % 5 === 0 || i === memberCount) {
        console.log(`   ✓ Created ${i}/${memberCount} members...`);
      }
    }

    const organicCount = memberCount - referredMembers.length;
    console.log(`   ✅ Created ${memberCount} members (${referredMembers.length} referred, ${organicCount} organic)\n`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 5: Generate Buyer Members & Commissions (Current Month)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (referredMembers.length === 0) {
      throw new Error('❌ No referred members created - cannot generate commissions');
    }

    const commissionCount = randomInt(CONFIG.commissionCount.min, CONFIG.commissionCount.max);
    const monthName = 'October 2025';
    console.log(`💰 Step 5: Creating ${commissionCount} buyer members & commissions (${monthName})...`);

    const createdCommissions: any[] = [];
    const buyerMembers: any[] = [];
    let totalSales = 0;
    let totalPlatformFees = 0;

    // Track referrer stats to update later
    const referrerStats = new Map<string, { totalReferred: number; totalEarnings: number; monthlyEarnings: number }>();

    for (let i = 1; i <= commissionCount; i++) {
      // Pick a random referred member (they're the referrer earning the commission)
      const referrer = referredMembers[randomInt(0, referredMembers.length - 1)];

      // Generate random sale amount
      const saleAmount = Number(
        randomFloat(CONFIG.saleAmountRange.min, CONFIG.saleAmountRange.max).toFixed(2)
      );

      // Calculate commission splits using existing utility
      const { memberShare, creatorShare, platformShare } = calculateCommission(saleAmount);

      // Generate random date in October 2025
      const commissionDate = randomDate(CONFIG.testMonth.start, CONFIG.testMonth.end);

      // Determine payment type (70% recurring, 30% initial)
      const paymentType = Math.random() < 0.7 ? 'recurring' : 'initial';

      // CREATE THE BUYER (person who was referred and made the purchase)
      const buyerFirstName = firstNames[(i + 30) % firstNames.length];
      const buyer = await prisma.member.create({
        data: {
          userId: `TEST_INV_buyer_${i}`,
          membershipId: `TEST_INV_buyer_membership_${i}`,
          email: `test.buyer.${i}@test-data.temp`,
          username: `${buyerFirstName}_Buyer${i}`,
          subscriptionPrice: saleAmount,
          memberOrigin: 'referred',  // They were referred!
          referralCode: generateReferralCode(1000 + i),  // Give them a code too
          referredBy: referrer.referralCode,  // ✅ Link to referrer!
          billingPeriod: 'monthly',
          monthlyValue: saleAmount,
          lifetimeEarnings: 0,  // Buyers don't earn (they haven't referred anyone yet)
          monthlyEarnings: 0,
          totalReferred: 0,
          monthlyReferred: 0,
          welcomeMessageSent: true,
          creatorId: creator.id,
          createdAt: commissionDate,
        },
      });

      buyerMembers.push(buyer);

      // CREATE THE COMMISSION
      const commission = await prisma.commission.create({
        data: {
          whopPaymentId: `TEST_INV_payment_${randomUUID()}`,
          whopMembershipId: buyer.membershipId,  // Link to buyer's membership
          saleAmount: saleAmount,
          memberShare: memberShare,
          creatorShare: creatorShare,
          platformShare: platformShare,
          paymentType: paymentType,
          productType: 'subscription',
          billingPeriod: 'monthly',
          monthlyValue: saleAmount,
          status: 'paid',
          paidAt: commissionDate,
          platformFeeInvoiced: false, // CRITICAL: Not yet invoiced
          memberId: referrer.id, // The referrer who earns the commission
          creatorId: creator.id,
          createdAt: commissionDate,
        },
      });

      createdCommissions.push(commission);
      totalSales += saleAmount;
      totalPlatformFees += platformShare;

      // Track referrer stats
      const stats = referrerStats.get(referrer.id) || { totalReferred: 0, totalEarnings: 0, monthlyEarnings: 0 };
      stats.totalReferred += 1;
      stats.totalEarnings += memberShare;
      stats.monthlyEarnings += memberShare;
      referrerStats.set(referrer.id, stats);

      if (i % 5 === 0 || i === commissionCount) {
        console.log(`   ✓ Created ${i}/${commissionCount} buyers & commissions...`);
      }
    }

    console.log(`   ✅ Created ${commissionCount} buyers & commissions\n`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 6: Update Referrer Statistics
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log(`📊 Step 6: Updating referrer statistics...`);

    for (const [referrerId, stats] of referrerStats.entries()) {
      await prisma.member.update({
        where: { id: referrerId },
        data: {
          totalReferred: stats.totalReferred,
          monthlyReferred: stats.totalReferred,  // All referrals are from this month
          lifetimeEarnings: stats.totalEarnings,
          monthlyEarnings: stats.monthlyEarnings,
        },
      });
    }

    console.log(`   ✅ Updated ${referrerStats.size} referrers\n`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 7: Summary
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('='.repeat(70));
    console.log('✅ TEST DATA GENERATION COMPLETE!');
    console.log('='.repeat(70));
    console.log('\n📊 Summary:\n');
    console.log(`   Creator: ${creator.companyName}`);
    console.log(`   Company ID: ${creator.companyId}`);
    console.log(`   Period: ${monthName}\n`);
    console.log(`   👥 Referrer Members: ${memberCount}`);
    console.log(`      • Active Referrers: ${referrerStats.size} (earning commissions)`);
    console.log(`      • Referred: ${referredMembers.length}`);
    console.log(`      • Organic: ${organicCount}\n`);
    console.log(`   👥 Buyer Members: ${buyerMembers.length} (people who were referred)\n`);
    console.log(`   💰 Commissions Created: ${commissionCount}`);
    console.log(`      • Initial: ${createdCommissions.filter(c => c.paymentType === 'initial').length}`);
    console.log(`      • Recurring: ${createdCommissions.filter(c => c.paymentType === 'recurring').length}\n`);
    console.log(`   💵 Financial Summary:`);
    console.log(`      • Total Referred Sales: $${totalSales.toFixed(2)}`);
    console.log(`      • Platform Fees (20%): $${totalPlatformFees.toFixed(2)} ⭐`);
    console.log(`      • Creator Share (70%): $${(totalSales * 0.70).toFixed(2)}`);
    console.log(`      • Member Share (10%): $${(totalSales * 0.10).toFixed(2)}\n`);
    console.log(`   📋 Dashboard Data:`);
    console.log(`      • Monthly revenue: ~$${totalSales.toFixed(2)} ✅`);
    console.log(`      • Top referrers: ${referrerStats.size} members with referrals ✅`);
    console.log(`      • Monthly growth: Will show current month activity ✅\n`);
    console.log(`   📋 Invoice Expectation:`);
    console.log(`      • Expected invoice amount: ~$${totalPlatformFees.toFixed(2)}`);
    console.log(`      • Invoice period: ${monthName}`);
    console.log(`      • Sales to include: ${commissionCount} referred sales\n`);
    console.log('='.repeat(70));
    console.log('\n🎯 NEXT STEPS:\n');
    console.log('   1. View creator dashboard:');
    console.log(`      http://localhost:3001/seller-product/${creator.companyId}\n`);
    console.log('   2. View top referrer dashboards (these members have earnings):');
    const topReferrers = Array.from(referrerStats.entries())
      .sort((a, b) => b[1].totalEarnings - a[1].totalEarnings)
      .slice(0, 3);
    for (const [referrerId, stats] of topReferrers) {
      const member = createdMembers.find(m => m.id === referrerId);
      if (member) {
        console.log(`      http://localhost:3001/customer/${member.membershipId} ($${stats.totalEarnings.toFixed(2)} earned, ${stats.totalReferred} referrals)`);
      }
    }
    console.log('\n   3. Run invoice generation:');
    console.log('      npx tsx scripts/generate-invoices.ts\n');
    console.log('   4. Clean up test data when done:');
    console.log('      npx tsx scripts/remove-invoice-test-data.ts\n');
    console.log('='.repeat(70) + '\n');

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   • Check that .env.local exists and has DATABASE_URL');
    console.error('   • Verify creator exists with companyId:', CONFIG.creatorCompanyId);
    console.error('   • Make sure database is accessible\n');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
seedInvoiceTestData();
