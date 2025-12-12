// app/api/cron/reset-monthly/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db/prisma';
import logger from '../../../../lib/logger';


// Force dynamic rendering (don't pre-render at build time)
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Monthly Reset Cron Job
 *
 * Runs on the 1st of every month at midnight UTC
 * Resets monthly earnings and referral counts for all members
 *
 * Protected by Vercel's cron secret to prevent unauthorized access
 */
export async function GET(request: Request) {
  // SECURITY: Verify this is a legitimate cron request from Vercel
  // Deny-first approach: reject if CRON_SECRET is not configured
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    logger.error('[SECURITY] CRON_SECRET not configured - rejecting cron request');
    return NextResponse.json(
      { error: 'Cron secret not configured' },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    logger.error('[SECURITY] Unauthorized cron request - invalid or missing authorization');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {

    logger.info(' Starting monthly reset...');
    const startTime = Date.now();

    // Reset all members' monthly stats in a single query
    const result = await prisma.member.updateMany({
      data: {
        monthlyEarnings: 0,
        monthlyReferred: 0,
      }
    });

    // Also reset creator monthly revenue
    const creatorResult = await prisma.creator.updateMany({
      data: {
        monthlyRevenue: 0,
      }
    });

    const duration = Date.now() - startTime;

    console.log(`✅ Monthly reset complete:
      - ${result.count} members reset
      - ${creatorResult.count} creators reset
      - Duration: ${duration}ms`);

    // Log the reset event for auditing
    await logResetEvent(result.count, creatorResult.count, duration);

    return NextResponse.json({
      success: true,
      membersReset: result.count,
      creatorsReset: creatorResult.count,
      duration,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('❌ Monthly reset failed:', error);

    // Try to log the failure
    try {
      await logResetEvent(0, 0, 0, error as Error);
    } catch (logError) {
      logger.error('Failed to log reset error:', logError);
    }

    return NextResponse.json(
      {
        error: 'Monthly reset failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Log reset events for monitoring and debugging
 */
async function logResetEvent(
  membersReset: number,
  creatorsReset: number,
  duration: number,
  error?: Error
) {
  // In a production environment, you might want to:
  // 1. Store this in a separate audit table
  // 2. Send to a monitoring service (Datadog, New Relic, etc.)
  // 3. Send notifications if the reset fails

  const eventData = {
    type: 'monthly_reset',
    success: !error,
    membersReset,
    creatorsReset,
    duration,
    timestamp: new Date().toISOString(),
    error: error?.message,
  };

  // For now, just log to console
  logger.info(' Reset Event:', JSON.stringify(eventData, null, 2));

  // TODO: In production, consider creating an AuditLog table:
  // await prisma.auditLog.create({
  //   data: {
  //     event: 'monthly_reset',
  //     success: !error,
  //     metadata: eventData,
  //   }
  // });
}