/**
 * Whop Integration Testing Script
 *
 * Tests all assumptions before building hybrid model.
 * Run with: npx tsx scripts/test-whop-integration.ts
 */

// Load environment variables first
import { config } from 'dotenv';
config({ path: '.env.local' });

import { prisma } from '../lib/db/prisma';
import logger from '../lib/logger';

const WHOP_API_BASE = 'https://api.whop.com/api/v2';
const WHOP_API_KEY = process.env.WHOP_API_KEY;

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  data?: any;
}

const results: TestResult[] = [];

async function whopApiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${WHOP_API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${WHOP_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Whop API error: ${response.status} ${errorText}`);
  }

  return response.json();
}

// ============================================================================
// TEST 1: Check Recent Webhook Data
// ============================================================================
async function testWebhookData() {
  console.log('\n📡 TEST 1: Checking Recent Webhook Data...\n');

  try {
    // Get last 10 payment webhooks
    const recentPayments = await prisma.webhookEvent.findMany({
      where: {
        eventType: { contains: 'payment' },
        processed: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (recentPayments.length === 0) {
      results.push({
        name: 'Webhook Data - Payment Events',
        status: 'warning',
        message: 'No payment webhooks found in database. Cannot verify structure.',
      });
      return;
    }

    console.log(`Found ${recentPayments.length} recent payment webhooks`);

    // Analyze structure
    const fieldsFound = new Set<string>();
    let hasAffiliateCode = false;
    let affiliateCodeExample: any = null;

    recentPayments.forEach(event => {
      const payload = event.payload as any;
      const data = payload.data || payload;

      Object.keys(data).forEach(key => fieldsFound.add(key));

      if (data.affiliate_code || data.affiliateCode || data.affiliate) {
        hasAffiliateCode = true;
        affiliateCodeExample = {
          affiliate_code: data.affiliate_code,
          affiliateCode: data.affiliateCode,
          affiliate: data.affiliate,
        };
        console.log('✅ Found affiliate field:', affiliateCodeExample);
      }
    });

    console.log('\nFields available in payment webhooks:');
    Array.from(fieldsFound).sort().forEach(field => {
      console.log(`  - ${field}`);
    });

    if (hasAffiliateCode) {
      results.push({
        name: 'Webhook Data - Affiliate Code',
        status: 'pass',
        message: 'Affiliate code found in payment webhooks',
        data: {
          fieldsFound: Array.from(fieldsFound),
          example: affiliateCodeExample
        },
      });
    } else {
      results.push({
        name: 'Webhook Data - Affiliate Code',
        status: 'fail',
        message: 'Affiliate code NOT found in any payment webhooks. Hybrid model will not work.',
        data: { fieldsFound: Array.from(fieldsFound) },
      });
    }

  } catch (error: any) {
    results.push({
      name: 'Webhook Data',
      status: 'fail',
      message: `Error analyzing webhooks: ${error.message}`,
    });
  }
}

// ============================================================================
// TEST 2: Check Username Availability
// ============================================================================
async function testUsernameAvailability() {
  console.log('\n👤 TEST 2: Checking Username Availability...\n');

  try {
    // Get recent membership webhooks
    const recentMembers = await prisma.webhookEvent.findMany({
      where: {
        eventType: { contains: 'membership' },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    if (recentMembers.length === 0) {
      results.push({
        name: 'Username Availability',
        status: 'warning',
        message: 'No membership webhooks found. Cannot verify username availability.',
      });
      return;
    }

    console.log(`Analyzing ${recentMembers.length} membership events`);

    let totalUsers = 0;
    let usersWithUsername = 0;
    const usernameFormats: string[] = [];
    const usersWithout: any[] = [];

    recentMembers.forEach(event => {
      const payload = event.payload as any;
      const data = payload.data || payload;
      const user = data.user;

      if (user) {
        totalUsers++;
        if (user.username) {
          usersWithUsername++;
          usernameFormats.push(user.username);
        } else {
          usersWithout.push({
            id: user.id,
            email: user.email,
            name: user.name,
          });
        }
      }
    });

    const percentage = totalUsers > 0 ? (usersWithUsername / totalUsers * 100).toFixed(1) : 0;

    console.log(`\n📊 Username Statistics:`);
    console.log(`  Total users: ${totalUsers}`);
    console.log(`  With username: ${usersWithUsername} (${percentage}%)`);
    console.log(`  Without username: ${totalUsers - usersWithUsername}`);

    if (usersWithout.length > 0) {
      console.log(`\n⚠️  Users without username:`);
      usersWithout.slice(0, 3).forEach(u => {
        console.log(`  - ${u.email} (id: ${u.id})`);
      });
    }

    if (usernameFormats.length > 0) {
      console.log(`\n📝 Sample usernames:`);
      usernameFormats.slice(0, 5).forEach(u => console.log(`  - ${u}`));
    }

    if (usersWithUsername === totalUsers) {
      results.push({
        name: 'Username Availability',
        status: 'pass',
        message: `All users have usernames (${totalUsers}/${totalUsers})`,
      });
    } else if (parseFloat(percentage) >= 80) {
      results.push({
        name: 'Username Availability',
        status: 'warning',
        message: `${percentage}% of users have usernames. May need fallback strategy.`,
        data: { usersWithout: usersWithout.slice(0, 3) },
      });
    } else {
      results.push({
        name: 'Username Availability',
        status: 'fail',
        message: `Only ${percentage}% of users have usernames. Hybrid model unreliable.`,
        data: { usersWithout: usersWithout.slice(0, 3) },
      });
    }

  } catch (error: any) {
    results.push({
      name: 'Username Availability',
      status: 'fail',
      message: `Error checking usernames: ${error.message}`,
    });
  }
}

// ============================================================================
// TEST 3: Whop API - Product Affiliate Settings
// ============================================================================
async function testProductAffiliateAPI() {
  console.log('\n🔌 TEST 3: Testing Whop API - Product Affiliate Settings...\n');

  if (!WHOP_API_KEY) {
    results.push({
      name: 'Product Affiliate API',
      status: 'fail',
      message: 'WHOP_API_KEY not configured. Cannot test API.',
    });
    return;
  }

  try {
    // Get a creator's product ID to test with
    const creator = await prisma.creator.findFirst({
      where: { productId: { not: null } },
      select: { productId: true, companyName: true },
    });

    if (!creator?.productId) {
      results.push({
        name: 'Product Affiliate API',
        status: 'warning',
        message: 'No creator with productId found. Cannot test API.',
      });
      return;
    }

    console.log(`Testing with product: ${creator.productId} (${creator.companyName})`);

    // Try to fetch product details
    const response = await whopApiRequest(`/products/${creator.productId}`);
    const product = response.data || response;

    console.log('\n📦 Product API Response Structure:');
    Object.keys(product).forEach(key => {
      console.log(`  - ${key}: ${typeof product[key]}`);
    });

    // Check for affiliate-related fields
    const affiliateFields = Object.keys(product).filter(key =>
      key.toLowerCase().includes('affiliate') ||
      key.toLowerCase().includes('referral') ||
      key.toLowerCase().includes('commission')
    );

    if (affiliateFields.length > 0) {
      console.log('\n🎯 Affiliate-related fields found:');
      affiliateFields.forEach(field => {
        console.log(`  - ${field}:`, product[field]);
      });

      results.push({
        name: 'Product Affiliate API',
        status: 'pass',
        message: 'Product API accessible. Affiliate settings readable.',
        data: {
          affiliateFields,
          values: affiliateFields.reduce((obj: any, field) => {
            obj[field] = product[field];
            return obj;
          }, {})
        },
      });
    } else {
      console.log('\n⚠️  No affiliate-related fields found in product API');

      results.push({
        name: 'Product Affiliate API',
        status: 'warning',
        message: 'Product API accessible but no affiliate fields found. May need different endpoint.',
        data: { availableFields: Object.keys(product).slice(0, 20) },
      });
    }

  } catch (error: any) {
    results.push({
      name: 'Product Affiliate API',
      status: 'fail',
      message: `Cannot access product API: ${error.message}`,
    });
  }
}

// ============================================================================
// TEST 4: Check Existing Members for Whop Data
// ============================================================================
async function testExistingMemberData() {
  console.log('\n👥 TEST 4: Checking Existing Member Data...\n');

  try {
    const members = await prisma.member.findMany({
      take: 10,
      select: {
        id: true,
        username: true,
        email: true,
        userId: true,
        referralCode: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (members.length === 0) {
      results.push({
        name: 'Existing Member Data',
        status: 'warning',
        message: 'No members in database yet.',
      });
      return;
    }

    console.log(`Analyzing ${members.length} members`);

    let hasUserId = 0;
    let hasUsername = 0;
    let hasReferralCode = 0;

    members.forEach(member => {
      if (member.userId) hasUserId++;
      if (member.username) hasUsername++;
      if (member.referralCode) hasReferralCode++;
    });

    console.log('\n📊 Member Data Completeness:');
    console.log(`  userId: ${hasUserId}/${members.length}`);
    console.log(`  username: ${hasUsername}/${members.length}`);
    console.log(`  referralCode: ${hasReferralCode}/${members.length}`);

    console.log('\n📝 Sample member data:');
    members.slice(0, 3).forEach(m => {
      console.log(`  - ${m.username} (${m.email})`);
      console.log(`    userId: ${m.userId}`);
      console.log(`    referralCode: ${m.referralCode}`);
    });

    if (hasReferralCode === members.length) {
      results.push({
        name: 'Existing Member Data',
        status: 'pass',
        message: 'All members have referral codes. System working correctly.',
      });
    } else {
      results.push({
        name: 'Existing Member Data',
        status: 'warning',
        message: `${hasReferralCode}/${members.length} members have referral codes.`,
      });
    }

  } catch (error: any) {
    results.push({
      name: 'Existing Member Data',
      status: 'fail',
      message: `Error checking member data: ${error.message}`,
    });
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================
async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🧪 WHOP INTEGRATION VALIDATION TESTS');
  console.log('═══════════════════════════════════════════════════════');

  await testWebhookData();
  await testUsernameAvailability();
  await testProductAffiliateAPI();
  await testExistingMemberData();

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('═══════════════════════════════════════════════════════\n');

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warnings = results.filter(r => r.status === 'warning').length;

  results.forEach(result => {
    const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
    console.log(`${icon} ${result.name}`);
    console.log(`   ${result.message}`);
    if (result.data) {
      console.log(`   Data:`, JSON.stringify(result.data, null, 2));
    }
    console.log('');
  });

  console.log('═══════════════════════════════════════════════════════');
  console.log(`Total: ${results.length} tests`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warnings}`);
  console.log('═══════════════════════════════════════════════════════\n');

  // Final recommendation
  if (failed === 0 && warnings === 0) {
    console.log('✅ RECOMMENDATION: Safe to proceed with hybrid model implementation.');
  } else if (failed === 0 && warnings <= 2) {
    console.log('⚠️  RECOMMENDATION: Proceed with caution. Address warnings before production.');
  } else if (failed > 0) {
    console.log('❌ RECOMMENDATION: DO NOT implement hybrid model. Critical tests failed.');
    console.log('   Stick with current manual reward model until Whop capabilities verified.');
  }

  console.log('\n');
}

// Run tests
runAllTests()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error running tests:', error);
    process.exit(1);
  });
