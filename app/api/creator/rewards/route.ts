// app/api/creator/rewards/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '../../../../lib/db/prisma';
import logger from '../../../../lib/logger';
import { canAccessCreatorById } from '../../../../lib/whop/simple-auth';
import { rateLimitMiddleware } from '../../../../lib/security/rate-limit-utils';
import { checkOrigin } from '../../../../lib/security/origin-validation';


/**
 * Zod schema for updating reward tiers
 */
const updateRewardTiersSchema = z.object({
  creatorId: z.string().min(1, 'Creator ID is required'),
  tier1Count: z.number().int().min(1).max(10000),
  tier1Reward: z.string().max(100).optional().default(''),
  tier2Count: z.number().int().min(1).max(10000),
  tier2Reward: z.string().max(100).optional().default(''),
  tier3Count: z.number().int().min(1).max(10000),
  tier3Reward: z.string().max(100).optional().default(''),
  tier4Count: z.number().int().min(1).max(10000),
  tier4Reward: z.string().max(100).optional().default(''),
  autoApproveRewards: z.boolean().optional(),
  welcomeMessage: z.string().max(500).nullable().optional(),
});

/**
 * POST /api/creator/rewards
 * Update reward tiers and settings for a creator
 *
 * SECURITY: Requires authorization - user must own the creator resource
 */
export async function POST(request: NextRequest) {
  // SECURITY: Origin validation for CSRF protection
  const originError = checkOrigin(request);
  if (originError) return originError;

  // SECURITY: Rate limiting (10 requests per minute)
  const rateLimitResponse = await rateLimitMiddleware(request, { maxRequests: 10, windowMs: 60000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();

    // Validate input
    const validationResult = updateRewardTiersSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // SECURITY: Verify user is authorized to modify this creator
    const isAuthorized = await canAccessCreatorById(data.creatorId);
    if (!isAuthorized) {
      logger.warn(`[SECURITY] Unauthorized rewards update attempt for creator: ${data.creatorId}`);
      return NextResponse.json(
        { error: 'Unauthorized - you do not have permission to modify this resource' },
        { status: 403 }
      );
    }

    // Verify creator exists
    const creator = await prisma.creator.findUnique({
      where: { id: data.creatorId },
    });

    if (!creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      );
    }

    // Validate tier counts are in ascending order
    if (
      data.tier1Count >= data.tier2Count ||
      data.tier2Count >= data.tier3Count ||
      data.tier3Count >= data.tier4Count
    ) {
      return NextResponse.json(
        { error: 'Tier counts must be in ascending order (tier1 < tier2 < tier3 < tier4)' },
        { status: 400 }
      );
    }

    // Update creator reward settings
    const updatedCreator = await prisma.creator.update({
      where: { id: data.creatorId },
      data: {
        tier1Count: data.tier1Count,
        tier1Reward: data.tier1Reward,
        tier2Count: data.tier2Count,
        tier2Reward: data.tier2Reward,
        tier3Count: data.tier3Count,
        tier3Reward: data.tier3Reward,
        tier4Count: data.tier4Count,
        tier4Reward: data.tier4Reward,
        autoApproveRewards: data.autoApproveRewards ?? creator.autoApproveRewards,
        welcomeMessage: data.welcomeMessage ?? creator.welcomeMessage,
      },
      select: {
        id: true,
        tier1Count: true,
        tier1Reward: true,
        tier2Count: true,
        tier2Reward: true,
        tier3Count: true,
        tier3Reward: true,
        tier4Count: true,
        tier4Reward: true,
        autoApproveRewards: true,
        welcomeMessage: true,
        updatedAt: true,
      },
    });

    console.log('✅ Reward tiers updated:', {
      creatorId: data.creatorId,
      tiers: [data.tier1Count, data.tier2Count, data.tier3Count, data.tier4Count],
    });

    // ========================================
    // UPDATE ALL MEMBER TIERS BASED ON NEW THRESHOLDS
    // ========================================

    // Function to determine tier based on referral count
    // Tiers work as ranges: Bronze (tier1-tier2), Silver (tier2-tier3), Gold (tier3-tier4), Platinum (tier4+)
    const calculateTier = (totalReferred: number): string => {
      if (totalReferred >= data.tier4Count) {
        return 'Platinum';
      } else if (totalReferred >= data.tier3Count) {
        return 'Gold';
      } else if (totalReferred >= data.tier2Count) {
        return 'Silver';
      } else if (totalReferred >= data.tier1Count) {
        return 'Bronze';
      } else {
        return 'Bronze'; // Below tier1 threshold, still Bronze
      }
    };

    // Get all members for this creator
    const members = await prisma.member.findMany({
      where: { creatorId: data.creatorId },
      select: {
        id: true,
        totalReferred: true,
        currentTier: true,
      },
    });

    // Update each member's tier based on their totalReferred count
    const tierUpdates = members.map(member => {
      const newTier = calculateTier(member.totalReferred);

      // Only update if tier changed
      if (member.currentTier !== newTier) {
        return prisma.member.update({
          where: { id: member.id },
          data: { currentTier: newTier },
        });
      }
      return null;
    }).filter(Boolean); // Remove null values

    // Execute all tier updates
    if (tierUpdates.length > 0) {
      await Promise.all(tierUpdates);
      logger.info(`Updated ${tierUpdates.length} member tiers based on new thresholds`);
    }

    return NextResponse.json(
      {
        success: true,
        data: updatedCreator,
        tiersRecalculated: tierUpdates.length,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('❌ Error updating reward tiers:', error);

    return NextResponse.json(
      {
        error: 'Failed to update reward tiers',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/creator/rewards?creatorId={id}
 * Get current reward settings for a creator
 *
 * SECURITY: Requires authorization - user must own the creator resource
 */
export async function GET(request: NextRequest) {
  // SECURITY: Rate limiting (30 requests per minute for reads)
  const rateLimitResponse = await rateLimitMiddleware(request, { maxRequests: 30, windowMs: 60000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);
    const creatorId = searchParams.get('creatorId');

    if (!creatorId) {
      return NextResponse.json(
        { error: 'creatorId query parameter is required' },
        { status: 400 }
      );
    }

    // SECURITY: Verify user is authorized to access this creator's data
    const isAuthorized = await canAccessCreatorById(creatorId);
    if (!isAuthorized) {
      logger.warn(`[SECURITY] Unauthorized rewards read attempt for creator: ${creatorId}`);
      return NextResponse.json(
        { error: 'Unauthorized - you do not have permission to access this resource' },
        { status: 403 }
      );
    }

    const creator = await prisma.creator.findUnique({
      where: { id: creatorId },
      select: {
        id: true,
        tier1Count: true,
        tier1Reward: true,
        tier2Count: true,
        tier2Reward: true,
        tier3Count: true,
        tier3Reward: true,
        tier4Count: true,
        tier4Reward: true,
        autoApproveRewards: true,
        welcomeMessage: true,
      },
    });

    if (!creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: creator,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('❌ Error fetching reward settings:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch reward settings',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
