/**
 * Value Metrics API Endpoint
 *
 * Returns value proposition metrics for a creator:
 * - Current month (month-to-date)
 * - Last month (complete)
 * - All-time
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculateValueMetrics } from '../../../../../lib/invoice/value-calculator';
import { prisma } from '../../../../../lib/db/prisma';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';
import logger from '../../../../../lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    const { companyId } = params;

    // Verify creator exists
    const creator = await prisma.creator.findUnique({
      where: { companyId: companyId },
      select: {
        id: true,
        companyName: true,
        createdAt: true,
      },
    });

    if (!creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      );
    }

    // Calculate metrics for different periods
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    // Run calculations in parallel
    const [currentMonth, lastMonth, allTime] = await Promise.all([
      // Current month (month-to-date)
      calculateValueMetrics(creator.id, currentMonthStart, now),

      // Last month (complete month)
      calculateValueMetrics(creator.id, lastMonthStart, lastMonthEnd),

      // All-time (from creator account creation to now)
      calculateValueMetrics(creator.id, creator.createdAt, now),
    ]);

    logger.info(`✅ Value metrics fetched for ${creator.companyName}`);

    return NextResponse.json({
      currentMonth,
      lastMonth,
      allTime,
      creator: {
        id: creator.id,
        name: creator.companyName,
      },
    });
  } catch (error) {
    logger.error('❌ Error fetching value metrics:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch value metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
