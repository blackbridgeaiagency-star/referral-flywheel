import { NextRequest, NextResponse } from 'next/server';
import { getMemberStats } from '../../../../lib/data/centralized-queries';
import logger from '../../../../lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * API Route: Get real-time member stats for polling
 * Used by the dashboard to update stats without full page refresh
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json(
        { error: 'Missing memberId parameter' },
        { status: 400 }
      );
    }

    const stats = await getMemberStats(memberId);

    return NextResponse.json({
      ok: true,
      stats: {
        lifetimeEarnings: stats.lifetimeEarnings,
        monthlyEarnings: stats.monthlyEarnings,
        monthlyTrend: stats.monthlyTrend,
        totalReferred: stats.totalReferred,
        monthlyReferred: stats.monthlyReferred,
        totalCommissions: stats.totalCommissions,
        monthlyCommissions: stats.monthlyCommissions,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logger.error('Error fetching member stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
