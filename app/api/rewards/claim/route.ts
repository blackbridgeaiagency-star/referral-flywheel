// app/api/rewards/claim/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

/**
 * POST /api/rewards/claim
 * Member claims a competition reward by sending a message to the creator
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { memberId, creatorId, rank, reward, timeframe } = body;

    if (!memberId || !creatorId || !rank || !reward) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get member details
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        username: true,
        email: true,
        referralCode: true,
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    // Get creator details
    const creator = await prisma.creator.findUnique({
      where: { id: creatorId },
      select: {
        companyName: true,
      },
    });

    if (!creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      );
    }

    // TODO: When Whop messaging is enabled, send actual message to creator
    // For now, log to console
    console.log('🎁 REWARD CLAIM REQUEST');
    console.log('========================');
    console.log(`Member: ${member.username} (${member.email})`);
    console.log(`Referral Code: ${member.referralCode}`);
    console.log(`Community: ${creator.companyName}`);
    console.log(`Rank: #${rank}`);
    console.log(`Reward: ${reward}`);
    console.log(`Timeframe: ${timeframe || 'N/A'}`);
    console.log('========================');

    // Return success
    return NextResponse.json(
      {
        success: true,
        message: 'Claim request logged. Creator will be notified.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Error processing claim request:', error);

    return NextResponse.json(
      {
        error: 'Failed to process claim request',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
