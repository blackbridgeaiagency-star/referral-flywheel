import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db/prisma';
import { sendEmail } from '../../../../lib/email/client';
import { generateWeeklyDigestEmail } from '../../../../lib/email/templates/creator/weekly-digest';
import logger from '../../../../lib/logger';


export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Weekly Digest Cron Job (for Creators)
 * Runs every Monday at 9:00 AM
 *
 * Vercel Cron: { "path": "/api/cron/weekly-digest", "schedule": "0 9 * * 1" }
 */

export async function POST(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info(' Starting weekly digest cron job...');

    // Get date range for last 7 days
    const now = new Date();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const weekStartDate = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const weekEndDate = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    logger.info(` Generating reports for: ${weekStartDate} - ${weekEndDate}`);

    // Fetch all active creators
    const creators = await prisma.creator.findMany({
      where: { isActive: true }
    });

    logger.info(` Found ${creators.length} active creators`);

    let sentCount = 0;
    let failedCount = 0;

    for (const creator of creators) {
      try {
        // Count new referrals this week
        const newReferrals = await prisma.member.count({
          where: {
            creatorId: creator.id,
            memberOrigin: 'referred',
            createdAt: { gte: weekStart }
          }
        });

        // Calculate total revenue this week
        const weekCommissions = await prisma.commission.findMany({
          where: {
            creatorId: creator.id,
            createdAt: { gte: weekStart },
            status: 'paid'
          }
        });

        const totalRevenue = weekCommissions.reduce((sum, c) => sum + c.saleAmount, 0);

        // Get top performer
        const topPerformer = await prisma.member.findFirst({
          where: {
            creatorId: creator.id,
            totalReferred: { gt: 0 }
          },
          orderBy: { totalReferred: 'desc' }
        });

        // Get total members
        const totalMembers = await prisma.member.count({
          where: { creatorId: creator.id }
        });

        // Generate and send email
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const { html, text, subject } = generateWeeklyDigestEmail({
          creatorName: creator.companyName,
          weekStartDate,
          weekEndDate,
          newReferrals,
          totalRevenue,
          topPerformer: topPerformer ? {
            name: topPerformer.username,
            referrals: topPerformer.totalReferred
          } : undefined,
          totalMembers,
          dashboardUrl: `${appUrl}/seller-product/${creator.productId}`
        });

        // TODO: Get creator email from Whop API or database
        // For now, skip sending (would use creator email)
        logger.info(`Would send to ${creator.companyName}: ${newReferrals} referrals, $${totalRevenue.toFixed(2)}`);
        sentCount++;

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (creatorError) {
        failedCount++;
        logger.error(`❌ Error processing creator ${creator.id}:`, creatorError);
        continue;
      }
    }

    const summary = {
      ok: true,
      period: `${weekStartDate} - ${weekEndDate}`,
      totalCreators: creators.length,
      sentCount,
      failedCount,
      timestamp: new Date().toISOString()
    };

    logger.info('Weekly digest complete:', summary);
    return NextResponse.json(summary);

  } catch (error) {
    logger.error('❌ Weekly digest cron error:', error);
    return NextResponse.json(
      {
        error: 'Cron job failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'Weekly digest cron endpoint is alive',
    note: 'Use POST with Authorization header to trigger',
    timestamp: new Date().toISOString()
  });
}
