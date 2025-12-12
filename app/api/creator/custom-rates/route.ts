// app/api/creator/custom-rates/route.ts
/**
 * Custom Commission Rates API
 *
 * Endpoints:
 * - GET: List members with custom rates
 * - POST: Set custom rate for a member
 * - DELETE: Remove custom rate (revert to tier-based)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db/prisma';
import {
  setCustomCommissionRate,
  removeCustomCommissionRate,
  getMembersWithCustomRates,
  CUSTOM_RATE_LIMITS,
} from '../../../../lib/utils/custom-commission';
import logger from '../../../../lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ========================================
// GET - List members with custom rates
// ========================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json(
        { error: 'Missing companyId parameter' },
        { status: 400 }
      );
    }

    // Find creator
    const creator = await prisma.creator.findFirst({
      where: {
        OR: [
          { companyId },
          { productId: companyId },
        ],
      },
      select: { id: true },
    });

    if (!creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      );
    }

    // Get members with custom rates
    const members = await getMembersWithCustomRates(creator.id);

    return NextResponse.json({ members });

  } catch (error) {
    logger.error('Error fetching custom rates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch custom rates' },
      { status: 500 }
    );
  }
}

// ========================================
// POST - Set custom rate for a member
// ========================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, memberId, rate, reason } = body;

    if (!companyId || !memberId || rate === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: companyId, memberId, rate' },
        { status: 400 }
      );
    }

    // Validate rate range
    if (rate < CUSTOM_RATE_LIMITS.MIN_RATE || rate > CUSTOM_RATE_LIMITS.MAX_RATE) {
      return NextResponse.json(
        {
          error: `Rate must be between ${CUSTOM_RATE_LIMITS.MIN_RATE * 100}% and ${CUSTOM_RATE_LIMITS.MAX_RATE * 100}%`,
        },
        { status: 400 }
      );
    }

    // Find creator
    const creator = await prisma.creator.findFirst({
      where: {
        OR: [
          { companyId },
          { productId: companyId },
        ],
      },
      select: { id: true },
    });

    if (!creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      );
    }

    // Set custom rate (function also sends notifications internally)
    const result = await setCustomCommissionRate({
      memberId,
      rate,
      creatorId: creator.id,
      reason,
    });

    logger.info(`Custom rate set via API: ${result.member.username} -> ${rate * 100}% (DM: ${result.notifications.dmSent}, Push: ${result.notifications.pushSent})`);

    return NextResponse.json({
      success: true,
      member: result.member,
      previousRate: result.previousRate,
      newRate: result.newRate,
      creatorCost: result.creatorCost,
      notifications: result.notifications,
    });

  } catch (error) {
    logger.error('Error setting custom rate:', error);
    const message = error instanceof Error ? error.message : 'Failed to set custom rate';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// ========================================
// DELETE - Remove custom rate
// ========================================
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, memberId } = body;

    if (!companyId || !memberId) {
      return NextResponse.json(
        { error: 'Missing required fields: companyId, memberId' },
        { status: 400 }
      );
    }

    // Find creator
    const creator = await prisma.creator.findFirst({
      where: {
        OR: [
          { companyId },
          { productId: companyId },
        ],
      },
      select: { id: true },
    });

    if (!creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      );
    }

    // Remove custom rate
    const result = await removeCustomCommissionRate(memberId, creator.id);

    logger.info(`Custom rate removed via API: member ${memberId} reverted to ${result.tierName} tier`);

    return NextResponse.json({
      success: true,
      previousRate: result.previousRate,
      newSource: result.newSource,
      tierName: result.tierName,
      tierRate: result.tierRate,
    });

  } catch (error) {
    logger.error('Error removing custom rate:', error);
    const message = error instanceof Error ? error.message : 'Failed to remove custom rate';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
