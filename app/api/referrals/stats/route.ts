// app/api/referrals/stats/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const membershipId = searchParams.get('membershipId');
  
  if (!membershipId) {
    return NextResponse.json({ error: 'membershipId required' }, { status: 400 });
  }
  
  try {
    const member = await prisma.member.findUnique({
      where: { membershipId },
      select: {
        id: true,
        username: true,
        referralCode: true,
        lifetimeEarnings: true,
        monthlyEarnings: true,
        totalReferred: true,
        monthlyReferred: true,
        globalEarningsRank: true,
        globalReferralsRank: true,
        communityRank: true,
        currentTier: true,
        nextMilestone: true,
        creator: {
          select: {
            companyName: true,
            tier1Count: true,
            tier1Reward: true,
            tier2Count: true,
            tier2Reward: true,
            tier3Count: true,
            tier3Reward: true,
            tier4Count: true,
            tier4Reward: true,
          }
        }
      }
    });
    
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    
    return NextResponse.json(member);
  } catch (error) {
    console.error('❌ Stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
