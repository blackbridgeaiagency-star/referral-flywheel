/**
 * Share Tracking API
 *
 * Tracks when members share their referral links
 * Records platform (twitter, clipboard, etc.) for analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { memberId, platform, shareType } = body;

    // Validate required fields
    if (!memberId || !platform) {
      console.error('❌ Share tracking: Missing required fields', { memberId, platform });
      return NextResponse.json(
        { error: 'Missing required fields: memberId and platform are required' },
        { status: 400 }
      );
    }

    // Validate platform
    const validPlatforms = [
      'twitter',
      'facebook',
      'whatsapp',
      'telegram',
      'reddit',
      'email',
      'sms',
      'clipboard',
      'native_share',
      'qr',
    ];

    if (!validPlatforms.includes(platform)) {
      console.error('❌ Share tracking: Invalid platform', { platform });
      return NextResponse.json(
        { error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}` },
        { status: 400 }
      );
    }

    // Record share event
    const shareEvent = await prisma.shareEvent.create({
      data: {
        memberId,
        platform,
        shareType: shareType || 'link',
      },
    });

    console.log(`📤 Share tracked: ${platform} by member ${memberId} (ID: ${shareEvent.id})`);

    return NextResponse.json({
      ok: true,
      shareId: shareEvent.id,
    });

  } catch (error) {
    console.error('❌ Share tracking error:', error);

    // Check if it's a Prisma error (e.g., invalid memberId)
    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return NextResponse.json(
        { error: 'Invalid memberId' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to track share' },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'Share tracking endpoint is alive',
    validPlatforms: [
      'twitter',
      'facebook',
      'whatsapp',
      'telegram',
      'reddit',
      'email',
      'sms',
      'clipboard',
      'native_share',
      'qr',
    ],
  });
}
