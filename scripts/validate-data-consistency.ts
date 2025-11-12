#!/usr/bin/env node
/**
 * Data Consistency Validation Script
 *
 * This script validates all cached fields against actual calculated values
 * to identify any data consistency issues or cache drift.
 *
 * Run with: npx tsx scripts/validate-data-consistency.ts
 * Dry run: npx tsx scripts/validate-data-consistency.ts --dry-run
 * Auto-fix: npx tsx scripts/validate-data-consistency.ts --fix
 */

import { PrismaClient } from '@prisma/client'
import { parseArgs } from 'util'
import * as dotenv from 'dotenv'
import { join } from 'path'
import logger from '../lib/logger';


// Load environment variables from .env.local
dotenv.config({ path: join(process.cwd(), '.env.local') })

const prisma = new PrismaClient()

// Parse command line arguments
const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    'dry-run': { type: 'boolean', default: false },
    'fix': { type: 'boolean', default: false },
    'verbose': { type: 'boolean', default: false }
  }
})

const isDryRun = values['dry-run'] || false
const shouldFix = values['fix'] || false
const isVerbose = values['verbose'] || false

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

// Statistics tracking
const stats = {
  totalMembers: 0,
  totalCreators: 0,
  memberDiscrepancies: 0,
  creatorDiscrepancies: 0,
  fixedMembers: 0,
  fixedCreators: 0,
  errors: [] as string[]
}

function log(message: string, color: keyof typeof colors = 'reset') {
  logger.debug(`${colors[color]}${message}${colors.reset}`)
}

function logVerbose(message: string) {
  if (isVerbose) {
    logger.debug(`${colors.cyan}[VERBOSE] ${message}${colors.reset}`)
  }
}

async function validateMemberData() {
  log('\n=== Validating Member Data ===', 'bright')

  const members = await prisma.member.findMany({
    include: {
      commissions: {
        where: {
          status: 'paid'
        }
      },
      referrals: true
    }
  })

  stats.totalMembers = members.length
  log(`Found ${members.length} members to validate`, 'blue')

  for (const member of members) {
    logVerbose(`Checking member: ${member.username} (${member.referralCode})`)

    const issues: string[] = []
    const fixes: Record<string, any> = {}

    // 1. Validate lifetime earnings
    const actualLifetimeEarnings = member.commissions.reduce(
      (sum, commission) => sum + parseFloat(commission.memberShare.toString()),
      0
    )

    if (Math.abs(actualLifetimeEarnings - parseFloat(member.lifetimeEarnings.toString())) > 0.01) {
      issues.push(
        `Lifetime earnings mismatch: cached=${member.lifetimeEarnings}, actual=${actualLifetimeEarnings.toFixed(2)}`
      )
      fixes.lifetimeEarnings = actualLifetimeEarnings
    }

    // 2. Validate monthly earnings (current month only)
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const monthlyCommissions = member.commissions.filter(
      commission => new Date(commission.createdAt) >= startOfMonth
    )

    const actualMonthlyEarnings = monthlyCommissions.reduce(
      (sum, commission) => sum + parseFloat(commission.memberShare.toString()),
      0
    )

    if (Math.abs(actualMonthlyEarnings - parseFloat(member.monthlyEarnings.toString())) > 0.01) {
      issues.push(
        `Monthly earnings mismatch: cached=${member.monthlyEarnings}, actual=${actualMonthlyEarnings.toFixed(2)}`
      )
      fixes.monthlyEarnings = actualMonthlyEarnings
    }

    // 3. Validate total referred count
    const actualTotalReferred = member.referrals.length

    if (actualTotalReferred !== member.totalReferred) {
      issues.push(
        `Total referred mismatch: cached=${member.totalReferred}, actual=${actualTotalReferred}`
      )
      fixes.totalReferred = actualTotalReferred
    }

    // 4. Validate monthly referred count (current month only)
    const monthlyReferred = member.referrals.filter(
      referred => new Date(referred.createdAt) >= startOfMonth
    ).length

    if (monthlyReferred !== member.monthlyReferred) {
      issues.push(
        `Monthly referred mismatch: cached=${member.monthlyReferred}, actual=${monthlyReferred}`
      )
      fixes.monthlyReferred = monthlyReferred
    }

    // Report and fix issues
    if (issues.length > 0) {
      stats.memberDiscrepancies++
      log(`\n❌ Member ${member.username} (${member.referralCode}):`, 'red')
      issues.forEach(issue => logger.debug(`  - ${issue}`))

      if (shouldFix && !isDryRun) {
        try {
          await prisma.member.update({
            where: { id: member.id },
            data: fixes
          })
          stats.fixedMembers++
          log(`  ✅ Fixed ${Object.keys(fixes).length} issues`, 'green')
        } catch (error) {
          log(`  ❌ Error fixing: ${error}`, 'red')
          stats.errors.push(`Failed to fix member ${member.id}: ${error}`)
        }
      } else if (shouldFix && isDryRun) {
        log(`  [DRY RUN] Would fix: ${JSON.stringify(fixes)}`, 'yellow')
      }
    } else {
      logVerbose(`✓ Member ${member.username} data is consistent`)
    }
  }
}

async function validateCreatorData() {
  log('\n=== Validating Creator Data ===', 'bright')

  const creators = await prisma.creator.findMany({
    include: {
      commissions: {
        where: {
          status: 'paid'
        }
      },
      members: {
        include: {
          referrals: true
        }
      }
    }
  })

  stats.totalCreators = creators.length
  log(`Found ${creators.length} creators to validate`, 'blue')

  for (const creator of creators) {
    logVerbose(`Checking creator: ${creator.companyName || creator.id}`)

    const issues: string[] = []
    const fixes: Record<string, any> = {}

    // 1. Validate total revenue
    const actualTotalRevenue = creator.commissions.reduce(
      (sum, commission) => sum + parseFloat(commission.creatorShare.toString()),
      0
    )

    if (Math.abs(actualTotalRevenue - parseFloat(creator.totalRevenue.toString())) > 0.01) {
      issues.push(
        `Total revenue mismatch: cached=${creator.totalRevenue}, actual=${actualTotalRevenue.toFixed(2)}`
      )
      fixes.totalRevenue = actualTotalRevenue
    }

    // 2. Validate monthly revenue (current month only)
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const monthlyCommissions = creator.commissions.filter(
      commission => new Date(commission.createdAt) >= startOfMonth
    )

    const actualMonthlyRevenue = monthlyCommissions.reduce(
      (sum, commission) => sum + parseFloat(commission.creatorShare.toString()),
      0
    )

    if (Math.abs(actualMonthlyRevenue - parseFloat(creator.monthlyRevenue.toString())) > 0.01) {
      issues.push(
        `Monthly revenue mismatch: cached=${creator.monthlyRevenue}, actual=${actualMonthlyRevenue.toFixed(2)}`
      )
      fixes.monthlyRevenue = actualMonthlyRevenue
    }

    // 3. Validate total referrals count
    const actualTotalReferrals = creator.members.reduce(
      (sum, member) => sum + member.referrals.length,
      0
    )

    if (actualTotalReferrals !== creator.totalReferrals) {
      issues.push(
        `Total referrals mismatch: cached=${creator.totalReferrals}, actual=${actualTotalReferrals}`
      )
      fixes.totalReferrals = actualTotalReferrals
    }

    // 4. Validate active members count
    // Note: Since members don't have a direct status field, we count all non-cancelled members
    const actualActiveMembers = creator.members.length

    if (actualActiveMembers !== creator.activeMembers) {
      issues.push(
        `Active members mismatch: cached=${creator.activeMembers}, actual=${actualActiveMembers}`
      )
      fixes.activeMembers = actualActiveMembers
    }

    // Report and fix issues
    if (issues.length > 0) {
      stats.creatorDiscrepancies++
      log(`\n❌ Creator ${creator.companyName || creator.id}:`, 'red')
      issues.forEach(issue => logger.debug(`  - ${issue}`))

      if (shouldFix && !isDryRun) {
        try {
          await prisma.creator.update({
            where: { id: creator.id },
            data: fixes
          })
          stats.fixedCreators++
          log(`  ✅ Fixed ${Object.keys(fixes).length} issues`, 'green')
        } catch (error) {
          log(`  ❌ Error fixing: ${error}`, 'red')
          stats.errors.push(`Failed to fix creator ${creator.id}: ${error}`)
        }
      } else if (shouldFix && isDryRun) {
        log(`  [DRY RUN] Would fix: ${JSON.stringify(fixes)}`, 'yellow')
      }
    } else {
      logVerbose(`✓ Creator ${creator.companyName || creator.id} data is consistent`)
    }
  }
}

async function validateCommissionIntegrity() {
  log('\n=== Validating Commission Integrity ===', 'bright')

  // Check that all commissions add up to 100%
  const commissions = await prisma.commission.findMany({
    where: {
      status: 'paid'
    }
  })

  log(`Checking ${commissions.length} paid commissions`, 'blue')

  let invalidCommissions = 0

  for (const commission of commissions) {
    const memberShare = parseFloat(commission.memberShare.toString())
    const creatorShare = parseFloat(commission.creatorShare.toString())
    const platformShare = parseFloat(commission.platformShare.toString())
    const total = memberShare + creatorShare + platformShare
    const amount = parseFloat(commission.amount.toString())

    // Check if shares add up to the total amount (with 0.01 tolerance for rounding)
    if (Math.abs(total - amount) > 0.01) {
      invalidCommissions++
      log(
        `❌ Commission ${commission.id}: Shares don't add up! ` +
        `Total=${total.toFixed(2)}, Amount=${amount}`,
        'red'
      )
      logVerbose(
        `  Member=${memberShare.toFixed(2)} (10%), ` +
        `Creator=${creatorShare.toFixed(2)} (70%), ` +
        `Platform=${platformShare.toFixed(2)} (20%)`
      )
    }

    // Verify the 10/70/20 split
    const expectedMember = amount * 0.10
    const expectedCreator = amount * 0.70
    const expectedPlatform = amount * 0.20

    if (
      Math.abs(memberShare - expectedMember) > 0.01 ||
      Math.abs(creatorShare - expectedCreator) > 0.01 ||
      Math.abs(platformShare - expectedPlatform) > 0.01
    ) {
      log(
        `⚠️ Commission ${commission.id}: Split ratios incorrect! ` +
        `Expected 10/70/20 but got ${(memberShare/amount*100).toFixed(1)}%/` +
        `${(creatorShare/amount*100).toFixed(1)}%/` +
        `${(platformShare/amount*100).toFixed(1)}%`,
        'yellow'
      )
    }
  }

  if (invalidCommissions === 0) {
    log('✅ All commission splits are valid', 'green')
  } else {
    log(`❌ Found ${invalidCommissions} invalid commissions`, 'red')
  }
}

async function validateAttributionWindows() {
  log('\n=== Validating Attribution Windows ===', 'bright')

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Find expired attribution clicks that haven't been converted
  const expiredClicks = await prisma.attributionClick.findMany({
    where: {
      createdAt: {
        lt: thirtyDaysAgo
      },
      converted: false
    }
  })

  if (expiredClicks.length > 0) {
    log(`⚠️ Found ${expiredClicks.length} expired attribution clicks (>30 days old)`, 'yellow')

    if (shouldFix && !isDryRun) {
      // Mark expired clicks as expired (optional field if exists)
      log('  Note: Expired clicks retained for historical analysis', 'cyan')
    }
  } else {
    log('✅ No expired attribution clicks found', 'green')
  }

  // Check for converted clicks with commissions
  const convertedClicks = await prisma.attributionClick.findMany({
    where: {
      converted: true
    },
    include: {
      commission: true
    }
  })

  let orphanedClicks = 0
  for (const click of convertedClicks) {
    if (!click.commission) {
      orphanedClicks++
      logVerbose(`Orphaned converted click: ${click.id} (no commission linked)`)
    }
  }

  if (orphanedClicks > 0) {
    log(`⚠️ Found ${orphanedClicks} converted clicks without linked commissions`, 'yellow')
  }
}

async function generateReport() {
  log('\n' + '='.repeat(60), 'bright')
  log('DATA CONSISTENCY VALIDATION REPORT', 'bright')
  log('='.repeat(60), 'bright')

  const totalIssues = stats.memberDiscrepancies + stats.creatorDiscrepancies

  if (totalIssues === 0) {
    log('\n🎉 EXCELLENT! No data consistency issues found!', 'green')
  } else {
    log('\n📊 Summary:', 'cyan')
  }

  logger.debug(`
  Members Checked:        ${stats.totalMembers}
  Members with Issues:    ${stats.memberDiscrepancies} (${(stats.memberDiscrepancies/stats.totalMembers*100).toFixed(1)}%)
  Members Fixed:          ${stats.fixedMembers}

  Creators Checked:       ${stats.totalCreators}
  Creators with Issues:   ${stats.creatorDiscrepancies} (${(stats.creatorDiscrepancies/stats.totalCreators*100).toFixed(1)}%)
  Creators Fixed:         ${stats.fixedCreators}

  Total Issues Found:     ${totalIssues}
  Total Fixed:           ${stats.fixedMembers + stats.fixedCreators}
  `)

  if (stats.errors.length > 0) {
    log('\n❌ Errors encountered:', 'red')
    stats.errors.forEach(error => logger.debug(`  - ${error}`))
  }

  if (isDryRun) {
    log('\n📝 This was a DRY RUN - no changes were made', 'yellow')
  }

  if (!shouldFix && totalIssues > 0) {
    log('\n💡 To fix issues, run with --fix flag', 'cyan')
    log('   For safety, use --dry-run --fix first', 'cyan')
  }

  // Calculate data health score
  const healthScore = 100 - (totalIssues / (stats.totalMembers + stats.totalCreators) * 100)
  log(`\n🏥 Data Health Score: ${healthScore.toFixed(1)}%`, healthScore > 95 ? 'green' : healthScore > 80 ? 'yellow' : 'red')
}

async function main() {
  try {
    log('\n🔍 Starting Data Consistency Validation', 'bright')
    log('=' .repeat(60), 'cyan')

    if (isDryRun) {
      log('Mode: DRY RUN (no changes will be made)', 'yellow')
    } else if (shouldFix) {
      log('Mode: AUTO-FIX (issues will be corrected)', 'green')
    } else {
      log('Mode: VALIDATION ONLY', 'blue')
    }

    if (isVerbose) {
      log('Verbose output enabled', 'cyan')
    }

    // Run all validations
    await validateMemberData()
    await validateCreatorData()
    await validateCommissionIntegrity()
    await validateAttributionWindows()

    // Generate report
    await generateReport()

    process.exit(stats.errors.length > 0 ? 1 : 0)
  } catch (error) {
    logger.error('Fatal error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
main()