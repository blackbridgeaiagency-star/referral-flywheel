import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db/prisma';
import { sendEmail } from '../../../../lib/email/client';
import { generateMonthlyEarningsSummaryEmail } from '../../../../lib/email/templates/monthly-earnings-summary';
import logger from '../../../../lib/logger';


export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Monthly Digest Cron Job
 *
 * Runs on the 1st of each month at 9:00 AM
 * Sends earnings summary emails to all active members
 *
 * Vercel Cron Configuration (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/monthly-digest",
 *     "schedule": "0 9 1 * *"
 *   }]
 * }
 *
 * Or trigger manually: POST /api/cron/monthly-digest
 * With header: Authorization: Bearer <CRON_SECRET>
 */

export async function POST(request: Request) {
  try {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 1. VERIFY CRON SECRET (Security)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      logger.error('❌ Unauthorized cron request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info(' Starting monthly digest cron job...');

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 2. GET DATE RANGE FOR PREVIOUS MONTH
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthName = lastMonth.toLocaleString('default', { month: 'long' });
    const year = lastMonth.getFullYear();

    logger.info(` Generating reports for: ${monthName} ${year}`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 3. FETCH ALL ACTIVE MEMBERS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const members = await prisma.member.findMany({
      where: {
        // Only send to members active in last 90 days
        lastActive: {
          gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        }
      },
      include: {
        creator: true
      }
    });

    logger.info(` Found ${members.length} active members`);

    let sentCount = 0;
    let failedCount = 0;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 4. SEND EMAIL TO EACH MEMBER
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    for (const member of members) {
      try {
        // Calculate monthly earnings (from previous month)
        const monthlyCommissions = await prisma.commission.findMany({
          where: {
            memberId: member.id,
            createdAt: {
              gte: lastMonth,
              lt: thisMonth
            },
            status: 'paid'
          }
        });

        const monthlyEarnings = monthlyCommissions.reduce(
          (sum, c) => sum + c.memberShare,
          0
        );

        // Count new referrals this month
        const newReferralsCount = await prisma.member.count({
          where: {
            referredBy: member.referralCode,
            createdAt: {
              gte: lastMonth,
              lt: thisMonth
            }
          }
        });

        // Find top referral (highest contributor)
        const topReferralData = await prisma.member.findFirst({
          where: {
            referredBy: member.referralCode
          },
          include: {
            commissions: {
              where: {
                createdAt: {
                  gte: lastMonth,
                  lt: thisMonth
                }
              }
            }
          },
          orderBy: {
            lifetimeEarnings: 'desc'
          }
        });

        const topReferral = topReferralData ? {
          name: topReferralData.username,
          contribution: topReferralData.commissions.reduce((sum, c) => sum + c.memberShare, 0)
        } : undefined;

        // Generate email
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const { html, text, subject } = generateMonthlyEarningsSummaryEmail({
          username: member.username,
          month: monthName,
          year,
          monthlyEarnings,
          lifetimeEarnings: member.lifetimeEarnings,
          totalReferrals: member.totalReferred,
          newReferralsThisMonth: newReferralsCount,
          nextPayoutDate: monthlyEarnings > 0 ? '15th of this month' : 'N/A',
          topReferral,
          dashboardUrl: `${appUrl}/customer/${member.membershipId}`,
          referralLink: `${appUrl}/r/${member.referralCode}`
        });

        // Send email
        const result = await sendEmail({
          to: member.email,
          subject,
          html,
          text
        });

        if (result.success) {
          sentCount++;
          logger.info(`Sent digest to ${member.username} (${member.email})`);
        } else {
          failedCount++;
          logger.error(`❌ Failed to send to ${member.username}:`, result.error);
        }

        // Rate limiting: wait 100ms between emails to avoid spam filters
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (memberError) {
        failedCount++;
        logger.error(`❌ Error processing member ${member.id}:`, memberError);
        continue;
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 5. RETURN SUMMARY
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const summary = {
      ok: true,
      month: `${monthName} ${year}`,
      totalMembers: members.length,
      sentCount,
      failedCount,
      timestamp: new Date().toISOString()
    };

    logger.info('Monthly digest complete:', summary);
    return NextResponse.json(summary);

  } catch (error) {
    logger.error('❌ Monthly digest cron error:', error);
    return NextResponse.json(
      {
        error: 'Cron job failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'Monthly digest cron endpoint is alive',
    note: 'Use POST with Authorization header to trigger',
    timestamp: new Date().toISOString()
  });
}
