// app/api/creator/[companyId]/onboarding/route.ts
/**
 * API endpoint for creator onboarding
 * Saves onboarding data and marks creator as onboarded
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import logger from '../../../../../lib/logger';


export async function POST(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    const data = await request.json();
    const { companyId } = params;

    // Update creator with onboarding data
    const creator = await prisma.creator.update({
      where: { companyId: companyId },
      data: {
        companyName: data.companyName,
        welcomeMessage: data.welcomeMessage,
        tier1Count: data.tier1Count,
        tier1Reward: data.tier1Reward,
        tier2Count: data.tier2Count,
        tier2Reward: data.tier2Reward,
        tier3Count: data.tier3Count,
        tier3Reward: data.tier3Reward,
        tier4Count: data.tier4Count,
        tier4Reward: data.tier4Reward,
        onboardingCompleted: true,
        isActive: true,
      }
    });

    logger.info('Creator onboarding completed: ${creator.companyName}');

    return NextResponse.json({
      success: true,
      creator: {
        id: creator.id,
        companyName: creator.companyName,
        companyId: creator.companyId
      }
    });

  } catch (error) {
    logger.error('❌ Onboarding error:', error);
    return NextResponse.json(
      {
        error: 'Failed to save onboarding data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}