import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db/prisma';
import logger from '../../../../lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * API Route: Update member's Whop username
 *
 * This links their referral code to their Whop account for Strategy B attribution.
 * When someone uses their referral link (/r/CODE), we redirect to Whop with ?a=whopUsername
 */
export async function POST(request: NextRequest) {
  try {
    const { memberId, whopUsername } = await request.json();

    if (!memberId || !whopUsername) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate username format
    const cleanUsername = whopUsername.trim().toLowerCase();
    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      return NextResponse.json(
        { error: 'Invalid username format. Use only letters, numbers, and underscores.' },
        { status: 400 }
      );
    }

    // Check if username is already taken by another member
    const existingMember = await prisma.member.findUnique({
      where: { whopUsername: cleanUsername },
    });

    if (existingMember && existingMember.id !== memberId) {
      return NextResponse.json(
        { error: 'This Whop username is already connected to another account.' },
        { status: 409 }
      );
    }

    // Update member's whopUsername
    const updatedMember = await prisma.member.update({
      where: { id: memberId },
      data: { whopUsername: cleanUsername },
      select: {
        id: true,
        referralCode: true,
        whopUsername: true,
      },
    });

    logger.info(`Member ${updatedMember.referralCode} connected Whop username: ${cleanUsername}`);

    return NextResponse.json({
      ok: true,
      member: updatedMember,
      message: 'Whop username connected successfully',
    });

  } catch (error: any) {
    logger.error('Error updating whop username:', error);

    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'This Whop username is already connected to another account.' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update username' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch current whopUsername
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json(
        { error: 'Missing memberId' },
        { status: 400 }
      );
    }

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        whopUsername: true,
        referralCode: true,
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      whopUsername: member.whopUsername,
      referralCode: member.referralCode,
    });

  } catch (error: any) {
    logger.error('Error fetching whop username:', error);
    return NextResponse.json(
      { error: 'Failed to fetch username' },
      { status: 500 }
    );
  }
}
