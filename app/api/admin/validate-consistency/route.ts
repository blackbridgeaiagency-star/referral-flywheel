import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    // Parse request body for options
    const { dryRun = true, autoFix = false } = await request.json().catch(() => ({}))

    const report = {
      timestamp: new Date().toISOString(),
      mode: autoFix ? 'auto-fix' : dryRun ? 'dry-run' : 'validation',
      members: {
        total: 0,
        discrepancies: [] as any[],
        fixed: 0
      },
      creators: {
        total: 0,
        discrepancies: [] as any[],
        fixed: 0
      },
      commissions: {
        total: 0,
        invalid: [] as any[]
      },
      healthScore: 100
    }

    // Validate Member Data
    const members = await prisma.member.findMany({
      include: {
        commissions: {
          where: { status: 'paid' }
        },
        referredMembers: true
      }
    })

    report.members.total = members.length

    for (const member of members) {
      const issues: any = {
        memberId: member.id,
        name: member.firstName,
        referralCode: member.referralCode,
        problems: [],
        fixes: {}
      }

      // Check lifetime earnings
      const actualLifetimeEarnings = member.commissions.reduce(
        (sum, c) => sum + parseFloat(c.memberShare.toString()), 0
      )

      if (Math.abs(actualLifetimeEarnings - parseFloat(member.lifetimeEarnings.toString())) > 0.01) {
        issues.problems.push({
          field: 'lifetimeEarnings',
          cached: member.lifetimeEarnings,
          actual: actualLifetimeEarnings.toFixed(2)
        })
        issues.fixes.lifetimeEarnings = actualLifetimeEarnings
      }

      // Check monthly earnings
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const monthlyCommissions = member.commissions.filter(
        c => new Date(c.createdAt) >= startOfMonth
      )
      const actualMonthlyEarnings = monthlyCommissions.reduce(
        (sum, c) => sum + parseFloat(c.memberShare.toString()), 0
      )

      if (Math.abs(actualMonthlyEarnings - parseFloat(member.monthlyEarnings.toString())) > 0.01) {
        issues.problems.push({
          field: 'monthlyEarnings',
          cached: member.monthlyEarnings,
          actual: actualMonthlyEarnings.toFixed(2)
        })
        issues.fixes.monthlyEarnings = actualMonthlyEarnings
      }

      // Check referral counts
      const actualTotalReferred = member.referredMembers.length
      if (actualTotalReferred !== member.totalReferred) {
        issues.problems.push({
          field: 'totalReferred',
          cached: member.totalReferred,
          actual: actualTotalReferred
        })
        issues.fixes.totalReferred = actualTotalReferred
      }

      // If issues found, add to report and optionally fix
      if (issues.problems.length > 0) {
        report.members.discrepancies.push(issues)

        if (autoFix && !dryRun) {
          await prisma.member.update({
            where: { id: member.id },
            data: issues.fixes
          })
          report.members.fixed++
        }
      }
    }

    // Validate Creator Data
    const creators = await prisma.creator.findMany({
      include: {
        commissions: {
          where: { status: 'paid' }
        },
        members: {
          include: { referredMembers: true }
        }
      }
    })

    report.creators.total = creators.length

    for (const creator of creators) {
      const issues: any = {
        creatorId: creator.id,
        name: creator.companyName || 'Unknown',
        problems: [],
        fixes: {}
      }

      // Check total revenue
      const actualTotalRevenue = creator.commissions.reduce(
        (sum, c) => sum + parseFloat(c.creatorShare.toString()), 0
      )

      if (Math.abs(actualTotalRevenue - parseFloat(creator.totalRevenue.toString())) > 0.01) {
        issues.problems.push({
          field: 'totalRevenue',
          cached: creator.totalRevenue,
          actual: actualTotalRevenue.toFixed(2)
        })
        issues.fixes.totalRevenue = actualTotalRevenue
      }

      // Check monthly revenue
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const monthlyCommissions = creator.commissions.filter(
        c => new Date(c.createdAt) >= startOfMonth
      )
      const actualMonthlyRevenue = monthlyCommissions.reduce(
        (sum, c) => sum + parseFloat(c.creatorShare.toString()), 0
      )

      if (Math.abs(actualMonthlyRevenue - parseFloat(creator.monthlyRevenue.toString())) > 0.01) {
        issues.problems.push({
          field: 'monthlyRevenue',
          cached: creator.monthlyRevenue,
          actual: actualMonthlyRevenue.toFixed(2)
        })
        issues.fixes.monthlyRevenue = actualMonthlyRevenue
      }

      // Check total referrals
      const actualTotalReferrals = creator.members.reduce(
        (sum, m) => sum + m.referredMembers.length, 0
      )

      if (actualTotalReferrals !== creator.totalReferrals) {
        issues.problems.push({
          field: 'totalReferrals',
          cached: creator.totalReferrals,
          actual: actualTotalReferrals
        })
        issues.fixes.totalReferrals = actualTotalReferrals
      }

      // If issues found, add to report and optionally fix
      if (issues.problems.length > 0) {
        report.creators.discrepancies.push(issues)

        if (autoFix && !dryRun) {
          await prisma.creator.update({
            where: { id: creator.id },
            data: issues.fixes
          })
          report.creators.fixed++
        }
      }
    }

    // Validate Commission Integrity
    const commissions = await prisma.commission.findMany({
      where: { status: 'paid' }
    })

    report.commissions.total = commissions.length

    for (const commission of commissions) {
      const memberShare = parseFloat(commission.memberShare.toString())
      const creatorShare = parseFloat(commission.creatorShare.toString())
      const platformShare = parseFloat(commission.platformShare.toString())
      const total = memberShare + creatorShare + platformShare
      const amount = parseFloat(commission.amount.toString())

      // Check if shares add up correctly
      if (Math.abs(total - amount) > 0.01) {
        report.commissions.invalid.push({
          commissionId: commission.id,
          amount,
          memberShare,
          creatorShare,
          platformShare,
          total,
          error: 'Shares do not sum to amount'
        })
      }

      // Verify 10/70/20 split
      const expectedMember = amount * 0.10
      const expectedCreator = amount * 0.70
      const expectedPlatform = amount * 0.20

      if (
        Math.abs(memberShare - expectedMember) > 0.01 ||
        Math.abs(creatorShare - expectedCreator) > 0.01 ||
        Math.abs(platformShare - expectedPlatform) > 0.01
      ) {
        report.commissions.invalid.push({
          commissionId: commission.id,
          amount,
          actualSplit: `${(memberShare/amount*100).toFixed(1)}/${(creatorShare/amount*100).toFixed(1)}/${(platformShare/amount*100).toFixed(1)}`,
          expectedSplit: '10/70/20',
          error: 'Incorrect split ratios'
        })
      }
    }

    // Calculate health score
    const totalEntities = report.members.total + report.creators.total
    const totalDiscrepancies = report.members.discrepancies.length + report.creators.discrepancies.length
    report.healthScore = totalEntities > 0
      ? Math.max(0, 100 - (totalDiscrepancies / totalEntities * 100))
      : 100

    // Add summary
    const summary = {
      totalIssues: totalDiscrepancies + report.commissions.invalid.length,
      membersWithIssues: report.members.discrepancies.length,
      creatorsWithIssues: report.creators.discrepancies.length,
      invalidCommissions: report.commissions.invalid.length,
      fixed: report.members.fixed + report.creators.fixed,
      healthScore: report.healthScore.toFixed(1) + '%'
    }

    return NextResponse.json({
      success: true,
      summary,
      report,
      recommendation: summary.totalIssues > 0
        ? 'Run with autoFix: true to correct discrepancies'
        : 'Data consistency is excellent!'
    })

  } catch (error) {
    console.error('Data consistency validation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to validate data consistency',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

export async function GET(request: NextRequest) {
  // Quick validation check (read-only)
  return POST(new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({ dryRun: true, autoFix: false })
  }))
}