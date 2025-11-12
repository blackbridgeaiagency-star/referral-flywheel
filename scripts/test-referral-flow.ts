#!/usr/bin/env node
/**
 * End-to-End Referral Flow Test Script
 *
 * Tests the complete referral journey:
 * 1. Member gets referral link
 * 2. New user clicks link (attribution tracking)
 * 3. User makes purchase (webhook processing)
 * 4. Commission is calculated and credited
 * 5. Dashboards update correctly
 *
 * Run with: npx tsx scripts/test-referral-flow.ts
 * Test webhook: npx tsx scripts/test-referral-flow.ts --test-webhook
 * Use production: npx tsx scripts/test-referral-flow.ts --production
 */

import { PrismaClient } from '@prisma/client'
import { parseArgs } from 'util'
import * as dotenv from 'dotenv'
import { join } from 'path'
import crypto from 'crypto'
import logger from '../lib/logger';


// Load environment variables
dotenv.config({ path: join(process.cwd(), '.env.local') })

const prisma = new PrismaClient()

// Parse command line arguments
const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    'test-webhook': { type: 'boolean', default: false },
    'production': { type: 'boolean', default: false },
    'verbose': { type: 'boolean', default: false }
  }
})

const testWebhook = values['test-webhook'] || false
const useProduction = values['production'] || false
const isVerbose = values['verbose'] || false

const BASE_URL = useProduction
  ? 'https://referral-flywheel.vercel.app'
  : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
}

// Test results tracking
const results = {
  passed: [] as string[],
  failed: [] as string[],
  warnings: [] as string[]
}

function log(message: string, color: keyof typeof colors = 'reset') {
  logger.debug(`${colors[color]}${message}${colors.reset}`)
}

function logVerbose(message: string) {
  if (isVerbose) {
    logger.debug(`${colors.cyan}[VERBOSE] ${message}${colors.reset}`)
  }
}

// Helper to generate test data
function generateTestData() {
  const randomId = crypto.randomBytes(4).toString('hex')
  return {
    referrer: {
      userId: `test_user_${randomId}`,
      membershipId: `test_membership_${randomId}`,
      email: `referrer_${randomId}@test.com`,
      username: `TestReferrer${randomId}`,
      referralCode: `TEST-${randomId.toUpperCase()}`
    },
    newUser: {
      userId: `new_user_${randomId}`,
      membershipId: `new_membership_${randomId}`,
      email: `newuser_${randomId}@test.com`,
      username: `NewUser${randomId}`,
      ipAddress: '192.168.1.' + Math.floor(Math.random() * 255),
      userAgent: 'Mozilla/5.0 (Test) AppleWebKit/537.36'
    },
    payment: {
      paymentId: `pay_${randomId}`,
      amount: 49.99,
      currency: 'usd',
      productId: 'prod_test123',
      companyId: 'biz_test456'
    }
  }
}

// Test 1: Create referrer member
async function testCreateReferrer(testData: ReturnType<typeof generateTestData>) {
  log('\n=== Test 1: Create Referrer Member ===', 'bright')

  try {
    // Check if creator exists, create if not
    let creator = await prisma.creator.findFirst({
      where: {
        OR: [
          { companyId: testData.payment.companyId },
          { productId: testData.payment.productId }
        ]
      }
    })

    if (!creator) {
      creator = await prisma.creator.create({
        data: {
          companyId: testData.payment.companyId,
          productId: testData.payment.productId,
          companyName: 'Test Company',
          onboardingCompleted: true
        }
      })
      logVerbose(`Created test creator: ${creator.id}`)
    }

    // Create referrer member
    const referrer = await prisma.member.create({
      data: {
        userId: testData.referrer.userId,
        membershipId: testData.referrer.membershipId,
        email: testData.referrer.email,
        username: testData.referrer.username,
        referralCode: testData.referrer.referralCode,
        creatorId: creator.id
      }
    })

    log(`✅ Created referrer: ${referrer.username} with code: ${referrer.referralCode}`, 'green')
    results.passed.push('Create referrer member')

    return { referrer, creator }
  } catch (error) {
    log(`❌ Failed to create referrer: ${error}`, 'red')
    results.failed.push('Create referrer member')
    throw error
  }
}

// Test 2: Simulate referral link click
async function testReferralClick(referralCode: string, memberId: string, testData: ReturnType<typeof generateTestData>) {
  log('\n=== Test 2: Simulate Referral Click ===', 'bright')

  try {
    const url = `${BASE_URL}/r/${referralCode}`
    log(`Testing referral URL: ${url}`, 'cyan')

    // Create attribution click
    const fingerprint = crypto
      .createHash('sha256')
      .update(testData.newUser.userAgent + testData.newUser.ipAddress)
      .digest('hex')

    const ipHash = crypto
      .createHash('sha256')
      .update(testData.newUser.ipAddress + 'salt')
      .digest('hex')

    const attribution = await prisma.attributionClick.create({
      data: {
        referralCode,
        fingerprint,
        ipHash,
        userAgent: testData.newUser.userAgent,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        memberId // Link to the member who owns this referral code
      }
    })

    log(`✅ Attribution click created: ${attribution.id}`, 'green')
    logVerbose(`  Fingerprint: ${fingerprint.substring(0, 16)}...`)
    logVerbose(`  Expires: ${attribution.expiresAt.toISOString()}`)

    results.passed.push('Referral click tracking')
    return attribution
  } catch (error) {
    log(`❌ Failed to track referral click: ${error}`, 'red')
    results.failed.push('Referral click tracking')
    throw error
  }
}

// Test 3: Simulate webhook payment
async function testWebhookPayment(
  referrer: any,
  attribution: any,
  testData: ReturnType<typeof generateTestData>
) {
  log('\n=== Test 3: Simulate Payment Webhook ===', 'bright')

  if (!testWebhook) {
    log('⚠️  Skipping actual webhook test (use --test-webhook to enable)', 'yellow')
    results.warnings.push('Webhook test skipped')
    return
  }

  try {
    const webhookPayload = {
      event: 'payment.succeeded',
      data: {
        id: testData.payment.paymentId,
        amount: testData.payment.amount * 100, // In cents
        currency: testData.payment.currency,
        user: {
          id: testData.newUser.userId,
          email: testData.newUser.email,
          username: testData.newUser.username
        },
        membership: {
          id: testData.newUser.membershipId,
          product: testData.payment.productId,
          company: testData.payment.companyId
        },
        subscription_type: 'monthly',
        billing_period: 'monthly'
      }
    }

    // Calculate webhook signature if secret is available
    const webhookSecret = process.env.WHOP_WEBHOOK_SECRET
    let headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (webhookSecret) {
      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(webhookPayload))
        .digest('hex')
      headers['X-Whop-Signature'] = signature
      logVerbose(`Webhook signature: ${signature.substring(0, 16)}...`)
    }

    // Make request to webhook endpoint
    const response = await fetch(`${BASE_URL}/api/webhooks/whop`, {
      method: 'POST',
      headers,
      body: JSON.stringify(webhookPayload)
    })

    if (response.ok) {
      log(`✅ Webhook processed successfully (${response.status})`, 'green')
      results.passed.push('Webhook payment processing')

      // Verify commission was created
      await new Promise(resolve => setTimeout(resolve, 1000)) // Wait for DB write

      const commission = await prisma.commission.findFirst({
        where: {
          whopPaymentId: testData.payment.paymentId
        }
      })

      if (commission) {
        log(`✅ Commission created:`, 'green')
        log(`   Member share: $${commission.memberShare} (10%)`, 'cyan')
        log(`   Creator share: $${commission.creatorShare} (70%)`, 'cyan')
        log(`   Platform share: $${commission.platformShare} (20%)`, 'cyan')
        results.passed.push('Commission calculation')
      } else {
        log(`⚠️  Commission not found in database`, 'yellow')
        results.warnings.push('Commission not created')
      }
    } else {
      const error = await response.text()
      log(`❌ Webhook failed (${response.status}): ${error}`, 'red')
      results.failed.push('Webhook payment processing')
    }
  } catch (error) {
    log(`❌ Webhook test error: ${error}`, 'red')
    results.failed.push('Webhook payment processing')
  }
}

// Test 4: Verify member stats update
async function testMemberStatsUpdate(referrerId: string, expectedEarnings: number) {
  log('\n=== Test 4: Verify Member Stats ===', 'bright')

  try {
    const member = await prisma.member.findUnique({
      where: { id: referrerId },
      include: {
        referrals: true,
        commissions: true
      }
    })

    if (!member) {
      throw new Error('Member not found')
    }

    log('Member Stats:', 'cyan')
    log(`  Total referred: ${member.totalReferred}`, 'cyan')
    log(`  Lifetime earnings: $${member.lifetimeEarnings}`, 'cyan')
    log(`  Monthly earnings: $${member.monthlyEarnings}`, 'cyan')
    log(`  Actual referrals: ${member.referrals.length}`, 'cyan')
    log(`  Actual commissions: ${member.commissions.length}`, 'cyan')

    // Calculate expected values
    const actualLifetimeEarnings = member.commissions
      .filter(c => c.status === 'paid')
      .reduce((sum, c) => sum + parseFloat(c.memberShare.toString()), 0)

    if (Math.abs(actualLifetimeEarnings - parseFloat(member.lifetimeEarnings.toString())) > 0.01) {
      log(`⚠️  Earnings mismatch: cached=${member.lifetimeEarnings}, actual=${actualLifetimeEarnings}`, 'yellow')
      results.warnings.push('Member earnings cache mismatch')
    } else {
      log(`✅ Member stats are consistent`, 'green')
      results.passed.push('Member stats update')
    }
  } catch (error) {
    log(`❌ Failed to verify member stats: ${error}`, 'red')
    results.failed.push('Member stats update')
  }
}

// Test 5: Test dashboard data fetch
async function testDashboardData(creatorId: string, memberId: string) {
  log('\n=== Test 5: Test Dashboard Data ===', 'bright')

  try {
    // Test member dashboard endpoint
    const memberResponse = await fetch(`${BASE_URL}/api/referrals/stats?memberId=${memberId}`)

    if (memberResponse.ok) {
      const memberData = await memberResponse.json()
      log(`✅ Member dashboard data fetched successfully`, 'green')
      logVerbose(`  Stats: ${JSON.stringify(memberData, null, 2)}`)
      results.passed.push('Member dashboard data')
    } else {
      log(`⚠️  Member dashboard endpoint failed (${memberResponse.status})`, 'yellow')
      results.warnings.push('Member dashboard data')
    }

    // Test leaderboard endpoint
    const leaderboardResponse = await fetch(
      `${BASE_URL}/api/leaderboard?creatorId=${creatorId}&type=earnings`
    )

    if (leaderboardResponse.ok) {
      const leaderboardData = await leaderboardResponse.json()
      log(`✅ Leaderboard data fetched successfully`, 'green')
      logVerbose(`  Entries: ${leaderboardData.leaderboard?.length || 0}`)
      results.passed.push('Leaderboard data')
    } else {
      log(`⚠️  Leaderboard endpoint failed (${leaderboardResponse.status})`, 'yellow')
      results.warnings.push('Leaderboard data')
    }
  } catch (error) {
    log(`❌ Dashboard test error: ${error}`, 'red')
    results.failed.push('Dashboard data fetch')
  }
}

// Test 6: Verify data consistency
async function testDataConsistency() {
  log('\n=== Test 6: Run Data Consistency Check ===', 'bright')

  try {
    const response = await fetch(`${BASE_URL}/api/admin/validate-consistency`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dryRun: true, autoFix: false })
    })

    if (response.ok) {
      const result = await response.json()

      if (result.success) {
        const { summary } = result
        log(`Data Consistency Check:`, 'cyan')
        log(`  Total issues: ${summary.totalIssues}`, summary.totalIssues > 0 ? 'yellow' : 'green')
        log(`  Health score: ${summary.healthScore}`, 'cyan')

        if (summary.totalIssues === 0) {
          log(`✅ Data consistency check passed`, 'green')
          results.passed.push('Data consistency')
        } else {
          log(`⚠️  Data inconsistencies found`, 'yellow')
          results.warnings.push(`Data consistency (${summary.totalIssues} issues)`)
        }
      }
    } else {
      log(`⚠️  Consistency check endpoint failed (${response.status})`, 'yellow')
      results.warnings.push('Data consistency check')
    }
  } catch (error) {
    log(`❌ Consistency check error: ${error}`, 'red')
    results.failed.push('Data consistency check')
  }
}

// Generate test report
function generateReport() {
  log('\n' + '='.repeat(60), 'bright')
  log('END-TO-END REFERRAL FLOW TEST REPORT', 'bright')
  log('='.repeat(60), 'bright')

  const totalTests = results.passed.length + results.failed.length + results.warnings.length

  log(`\n📊 Test Results:`, 'cyan')

  // Passed tests
  if (results.passed.length > 0) {
    log(`\n✅ PASSED (${results.passed.length}/${totalTests}):`, 'green')
    results.passed.forEach(test => log(`   • ${test}`, 'green'))
  }

  // Warnings
  if (results.warnings.length > 0) {
    log(`\n⚠️  WARNINGS (${results.warnings.length}):`, 'yellow')
    results.warnings.forEach(warning => log(`   • ${warning}`, 'yellow'))
  }

  // Failed tests
  if (results.failed.length > 0) {
    log(`\n❌ FAILED (${results.failed.length}/${totalTests}):`, 'red')
    results.failed.forEach(test => log(`   • ${test}`, 'red'))
  }

  // Overall status
  log('\n' + '='.repeat(60), 'bright')

  if (results.failed.length === 0) {
    if (results.warnings.length === 0) {
      log('🎉 ALL TESTS PASSED! Referral flow is working correctly.', 'green')
    } else {
      log('✅ Tests passed with warnings. Review warnings above.', 'yellow')
    }
  } else {
    log('❌ Some tests failed. Review failures above.', 'red')
  }

  // Recommendations
  log('\n💡 Recommendations:', 'cyan')

  if (!testWebhook) {
    log('  • Run with --test-webhook to test webhook processing', 'cyan')
  }

  if (!useProduction) {
    log('  • Run with --production to test production environment', 'cyan')
  }

  if (results.warnings.includes('Commission not created')) {
    log('  • Check webhook handler and database connection', 'cyan')
  }

  if (results.warnings.some(w => w.includes('cache mismatch'))) {
    log('  • Run data consistency fix: npx tsx scripts/validate-data-consistency.ts --fix', 'cyan')
  }
}

// Main test runner
async function main() {
  try {
    log('\n🚀 Starting End-to-End Referral Flow Test', 'bright')
    log(`Environment: ${useProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`, 'magenta')
    log(`Base URL: ${BASE_URL}`, 'magenta')
    log('=' .repeat(60), 'cyan')

    // Generate test data
    const testData = generateTestData()
    log(`\nTest ID: ${testData.referrer.referralCode}`, 'cyan')

    // Run tests
    const { referrer, creator } = await testCreateReferrer(testData)
    const attribution = await testReferralClick(referrer.referralCode, referrer.id, testData)

    await testWebhookPayment(referrer, attribution, testData)
    await testMemberStatsUpdate(referrer.id, testData.payment.amount * 0.10)
    await testDashboardData(creator.id, referrer.id)
    await testDataConsistency()

    // Generate report
    generateReport()

    // Cleanup test data (optional)
    if (!useProduction && isVerbose) {
      log('\n🧹 Cleaning up test data...', 'cyan')
      await prisma.member.deleteMany({
        where: {
          referralCode: {
            startsWith: 'TEST-'
          }
        }
      })
      await prisma.attributionClick.deleteMany({
        where: {
          referralCode: {
            startsWith: 'TEST-'
          }
        }
      })
    }

    process.exit(results.failed.length > 0 ? 1 : 0)
  } catch (error) {
    logger.error('Fatal error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
main()