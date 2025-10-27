import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db/prisma';
import { startOfMonth, format } from 'date-fns';

/**
 * Bulletproof Monthly Stats Reset Cron Job
 *
 * FEATURES:
 * - Safety checks (date validation, duplicate prevention)
 * - Snapshot creation before reset (preserves historical data)
 * - Batch reset operations
 * - Verification after reset
 *
 * USAGE:
 * Configure Vercel Cron Jobs to call this endpoint on the 1st of each month:
 * vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/reset-monthly-stats",
 *     "schedule": "0 0 1 * *"  // Every 1st of month at midnight UTC
 *   }]
 * }
 *
 * SECURITY:
 * - Requires CRON_SECRET environment variable
 * - Only authorized requests can reset stats
 */

export async function POST(request: NextRequest) {
  try {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // SECURITY: Verify authorization
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (authHeader !== expectedAuth) {
      console.error('❌ Unauthorized monthly reset attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // SAFETY 1: Verify it's actually the 1st of the month
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const now = new Date();
    const dayOfMonth = now.getUTCDate();

    if (dayOfMonth !== 1) {
      console.warn(`⚠️  Monthly reset should run on 1st, but today is ${dayOfMonth}`);

      // Allow manual trigger with special header
      const forceHeader = request.headers.get('x-force-reset');
      if (forceHeader !== 'true') {
        return NextResponse.json(
          { error: 'Can only run on 1st of month (use x-force-reset: true to override)' },
          { status: 403 }
        );
      }
      console.log('🔓 Force reset enabled, proceeding...');
    }

    const previousMonth = format(new Date(now.getFullYear(), now.getMonth() - 1, 1), 'yyyy-MM');
    const currentMonth = format(startOfMonth(now), 'yyyy-MM');

    console.log(`🔄 Starting monthly reset: ${previousMonth} → ${currentMonth}`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // SAFETY 2: Check if already reset for this month
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const lastReset = await prisma.creator.findFirst({
      orderBy: { lastMonthReset: 'desc' },
      select: { lastMonthReset: true },
    });

    if (lastReset?.lastMonthReset) {
      const lastResetMonth = format(lastReset.lastMonthReset, 'yyyy-MM');
      if (lastResetMonth === currentMonth) {
        console.log('⏭️  Already reset for this month, skipping');
        return NextResponse.json({ ok: true, message: 'Already reset' });
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 1: Create snapshots BEFORE resetting
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('📸 Creating snapshots...');

    const members = await prisma.member.findMany({
      select: {
        id: true,
        creatorId: true,
        monthlyReferred: true,
        monthlyEarnings: true,
      },
    });

    console.log(`  Found ${members.length} members to snapshot`);

    // Create member snapshots
    await prisma.monthlySnapshot.createMany({
      data: members.map(m => ({
        month: previousMonth,
        creatorId: m.creatorId,
        memberId: m.id,
        monthlyReferrals: m.monthlyReferred,
        monthlyEarnings: m.monthlyEarnings,
        monthlyRevenue: 0, // Member-level snapshot
      })),
      skipDuplicates: true, // Prevent errors if snapshots already exist
    });

    // Creator-level snapshots
    const creators = await prisma.creator.findMany({
      select: {
        id: true,
        monthlyRevenue: true,
        totalReferrals: true, // For historical tracking
      },
    });

    await prisma.monthlySnapshot.createMany({
      data: creators.map(c => ({
        month: previousMonth,
        creatorId: c.id,
        memberId: null,
        monthlyReferrals: c.totalReferrals, // Historical total
        monthlyEarnings: 0,
        monthlyRevenue: c.monthlyRevenue,
      })),
      skipDuplicates: true,
    });

    console.log('✅ Snapshots created');

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 2: Reset all monthly fields
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('🔄 Resetting monthly stats...');

    const [memberUpdate, creatorUpdate] = await Promise.all([
      prisma.member.updateMany({
        data: {
          monthlyReferred: 0,
          monthlyEarnings: 0,
          lastMonthReset: now,
        },
      }),

      prisma.creator.updateMany({
        data: {
          monthlyRevenue: 0,
          lastMonthReset: now,
        },
      }),
    ]);

    console.log(`✅ Reset ${memberUpdate.count} members`);
    console.log(`✅ Reset ${creatorUpdate.count} creators`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 3: Verification
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('🔍 Verifying reset...');

    const verification = await prisma.member.aggregate({
      _sum: { monthlyReferred: true, monthlyEarnings: true },
    });

    const verificationPassed =
      verification._sum.monthlyReferred === 0 &&
      verification._sum.monthlyEarnings === 0;

    if (!verificationPassed) {
      console.error('❌ VERIFICATION FAILED: Monthly stats not all zero!');
      return NextResponse.json(
        { error: 'Reset verification failed' },
        { status: 500 }
      );
    }

    console.log('═══════════════════════════════════════');
    console.log('✅ MONTHLY RESET COMPLETE');
    console.log(`   Previous month: ${previousMonth} (archived)`);
    console.log(`   Current month: ${currentMonth} (started fresh)`);
    console.log('═══════════════════════════════════════');

    return NextResponse.json({
      ok: true,
      previousMonth,
      currentMonth,
      membersReset: memberUpdate.count,
      creatorsReset: creatorUpdate.count,
      snapshotsCreated: members.length + creators.length,
      verificationPassed,
    });

  } catch (error) {
    console.error('❌ Monthly reset failed:', error);
    return NextResponse.json(
      { error: 'Monthly reset failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for checking reset status
 */
export async function GET() {
  try {
    const lastReset = await prisma.creator.findFirst({
      orderBy: { lastMonthReset: 'desc' },
      select: { lastMonthReset: true },
    });

    const now = new Date();
    const nextReset = lastReset?.lastMonthReset
      ? new Date(lastReset.lastMonthReset.getFullYear(), lastReset.lastMonthReset.getMonth() + 1, 1)
      : new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const daysUntilReset = Math.ceil((nextReset.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return NextResponse.json({
      lastReset: lastReset?.lastMonthReset,
      nextReset,
      daysUntilReset,
      currentMonth: format(now, 'yyyy-MM'),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get reset status' },
      { status: 500 }
    );
  }
}
