import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db/prisma';
import logger from '../../../../lib/logger';


/**
 * POST /api/creator/onboarding
 *
 * Complete creator onboarding and save all settings
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      creatorId,
      // Reward tiers
      tier1Count,
      tier1Reward,
      tier2Count,
      tier2Reward,
      tier3Count,
      tier3Reward,
      tier4Count,
      tier4Reward,
      // Competition
      competitionEnabled,
      competitionTimeframe,
      competitionType,
      reward1st,
      reward2nd,
      reward3rd,
      // Welcome message
      welcomeMessage,
    } = body;

    if (!creatorId) {
      return NextResponse.json(
        { error: 'creatorId is required' },
        { status: 400 }
      );
    }

    logger.info(` Completing onboarding for creator: ${creatorId}`);

    // Update creator with onboarding data
    const updatedCreator = await prisma.creator.update({
      where: { id: creatorId },
      data: {
        // Reward tiers
        tier1Count: parseInt(tier1Count),
        tier1Reward,
        tier2Count: parseInt(tier2Count),
        tier2Reward,
        tier3Count: parseInt(tier3Count),
        tier3Reward,
        tier4Count: parseInt(tier4Count),
        tier4Reward,

        // Competition rewards
        customRewardEnabled: competitionEnabled,
        customRewardTimeframe: competitionTimeframe,
        customRewardType: competitionType,
        customReward1st: reward1st,
        customReward2nd: reward2nd,
        customReward3rd: reward3rd,

        // Welcome message
        welcomeMessage,

        // Mark onboarding as completed
        onboardingCompleted: true,
        onboardingStep: 5, // Completed all 5 steps
      },
    });

    logger.info(`Onboarding completed for ${updatedCreator.companyName}`);

    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully',
      creator: {
        id: updatedCreator.id,
        companyName: updatedCreator.companyName,
        onboardingCompleted: updatedCreator.onboardingCompleted,
      },
    });
  } catch (error) {
    logger.error('❌ Error completing onboarding:', error);
    return NextResponse.json(
      {
        error: 'Failed to complete onboarding',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/creator/onboarding
 *
 * Skip onboarding (mark as completed without changes)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { creatorId } = body;

    if (!creatorId) {
      return NextResponse.json(
        { error: 'creatorId is required' },
        { status: 400 }
      );
    }

    logger.debug(`⏭️  Skipping onboarding for creator: ${creatorId}`);

    // Mark onboarding as completed
    const updatedCreator = await prisma.creator.update({
      where: { id: creatorId },
      data: {
        onboardingCompleted: true,
        onboardingStep: 5,
      },
    });

    logger.info(`Onboarding skipped for ${updatedCreator.companyName}`);

    return NextResponse.json({
      success: true,
      message: 'Onboarding skipped',
      creator: {
        id: updatedCreator.id,
        companyName: updatedCreator.companyName,
        onboardingCompleted: updatedCreator.onboardingCompleted,
      },
    });
  } catch (error) {
    logger.error('❌ Error skipping onboarding:', error);
    return NextResponse.json(
      {
        error: 'Failed to skip onboarding',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
