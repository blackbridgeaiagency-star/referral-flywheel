/**
 * Referral URL Generator API
 *
 * Generates affiliate-ready URLs for members to share.
 * Uses Whop's native ?a= parameter for attribution (Strategy B).
 *
 * POST /api/referral/generate-url
 * Body: { memberId: string, productUrl?: string }
 * Returns: { success: boolean, referralUrl: string, copyText: string, stats: {...} }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db/prisma';
import logger from '../../../../lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface GenerateUrlRequest {
  memberId: string;
  productUrl?: string;
}

interface GenerateUrlResponse {
  success: boolean;
  referralUrl?: string;
  vanityUrl?: string;
  copyText?: string;
  whopUsername?: string | null;
  needsUsernameSetup?: boolean;
  stats?: {
    clickCount: number;
    conversionCount: number;
  };
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<GenerateUrlResponse>> {
  try {
    const body: GenerateUrlRequest = await request.json();
    const { memberId, productUrl } = body;

    // Validate required fields
    if (!memberId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: memberId' },
        { status: 400 }
      );
    }

    // Fetch member with creator info
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        referralCode: true,
        whopUsername: true,
        username: true,
        totalReferred: true,
        creator: {
          select: {
            productId: true,
            companyId: true,
            companyName: true,
            whopUrl: true,
          },
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { success: false, error: 'Member not found' },
        { status: 404 }
      );
    }

    if (!member.creator) {
      return NextResponse.json(
        { success: false, error: 'Creator not found for this member' },
        { status: 404 }
      );
    }

    // Get click and conversion stats
    const [clickCount, conversionCount] = await Promise.all([
      prisma.attributionClick.count({
        where: {
          memberId: member.id,
        },
      }),
      prisma.member.count({
        where: {
          referredBy: member.referralCode,
        },
      }),
    ]);

    // Generate URLs
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Vanity URL (our internal redirect URL)
    const vanityUrl = `${appUrl}/r/${member.referralCode}`;

    // Determine the base product URL
    let baseProductUrl = productUrl;

    if (!baseProductUrl) {
      // Use Whop product URL
      if (member.creator.whopUrl) {
        baseProductUrl = member.creator.whopUrl;
      } else {
        baseProductUrl = `https://whop.com/products/${member.creator.productId}`;
      }
    }

    // If member has whopUsername, generate direct Whop URL with ?a= parameter
    let referralUrl = vanityUrl;
    let needsUsernameSetup = false;

    if (member.whopUsername) {
      // Direct Whop URL with affiliate attribution
      const url = new URL(baseProductUrl);
      url.searchParams.set('a', member.whopUsername);
      referralUrl = url.toString();
    } else {
      // Member needs to set up their Whop username
      // Fall back to vanity URL (which will show setup prompt)
      needsUsernameSetup = true;
      referralUrl = vanityUrl;
    }

    // Generate formatted copy text for sharing
    const copyText = generateCopyText({
      communityName: member.creator.companyName,
      referralUrl: vanityUrl, // Always use vanity URL for sharing (cleaner)
      memberName: member.username,
    });

    logger.info(`Generated referral URL for member ${member.referralCode}: ${referralUrl}`);

    return NextResponse.json({
      success: true,
      referralUrl,
      vanityUrl,
      copyText,
      whopUsername: member.whopUsername,
      needsUsernameSetup,
      stats: {
        clickCount,
        conversionCount,
      },
    });

  } catch (error) {
    logger.error('Error generating referral URL:', error);

    return NextResponse.json(
      { success: false, error: 'Failed to generate referral URL' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to fetch referral URL by memberId
 */
export async function GET(request: NextRequest): Promise<NextResponse<GenerateUrlResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json(
        { success: false, error: 'Missing required query parameter: memberId' },
        { status: 400 }
      );
    }

    // Reuse POST logic by creating a mock request body
    const mockBody: GenerateUrlRequest = { memberId };

    // Fetch member with creator info
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        referralCode: true,
        whopUsername: true,
        username: true,
        totalReferred: true,
        creator: {
          select: {
            productId: true,
            companyId: true,
            companyName: true,
            whopUrl: true,
          },
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { success: false, error: 'Member not found' },
        { status: 404 }
      );
    }

    if (!member.creator) {
      return NextResponse.json(
        { success: false, error: 'Creator not found for this member' },
        { status: 404 }
      );
    }

    // Get click and conversion stats
    const [clickCount, conversionCount] = await Promise.all([
      prisma.attributionClick.count({
        where: { memberId: member.id },
      }),
      prisma.member.count({
        where: { referredBy: member.referralCode },
      }),
    ]);

    // Generate URLs
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const vanityUrl = `${appUrl}/r/${member.referralCode}`;

    let baseProductUrl = member.creator.whopUrl || `https://whop.com/products/${member.creator.productId}`;

    let referralUrl = vanityUrl;
    let needsUsernameSetup = false;

    if (member.whopUsername) {
      const url = new URL(baseProductUrl);
      url.searchParams.set('a', member.whopUsername);
      referralUrl = url.toString();
    } else {
      needsUsernameSetup = true;
    }

    const copyText = generateCopyText({
      communityName: member.creator.companyName,
      referralUrl: vanityUrl,
      memberName: member.username,
    });

    return NextResponse.json({
      success: true,
      referralUrl,
      vanityUrl,
      copyText,
      whopUsername: member.whopUsername,
      needsUsernameSetup,
      stats: {
        clickCount,
        conversionCount,
      },
    });

  } catch (error) {
    logger.error('Error fetching referral URL:', error);

    return NextResponse.json(
      { success: false, error: 'Failed to fetch referral URL' },
      { status: 500 }
    );
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

interface CopyTextOptions {
  communityName: string;
  referralUrl: string;
  memberName: string;
}

function generateCopyText(options: CopyTextOptions): string {
  const { communityName, referralUrl, memberName } = options;

  // Clean, shareable message
  return `Hey! I've been loving ${communityName} and wanted to share it with you.

Use my link to join: ${referralUrl}

See you inside!`;
}
