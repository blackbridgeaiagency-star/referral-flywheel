import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db/prisma';
import logger from '../../../../lib/logger';
import { sendProgramLaunchDM, notifyProgramLaunch } from '../../../../lib/whop/graphql-messaging';


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

    // ========================================
    // SEND PROGRAM LAUNCH DMs TO ALL MEMBERS
    // ========================================
    // This notifies all existing members that the referral program is live
    // and invites them to start earning by sharing their referral links

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://referral-flywheel.vercel.app';

    // Get all members for this creator
    const members = await prisma.member.findMany({
      where: { creatorId: updatedCreator.id },
      select: {
        id: true,
        userId: true,
        username: true,
        membershipId: true,
      },
    });

    logger.info(`Sending program launch DMs to ${members.length} members...`);

    let dmsSent = 0;
    let dmsFailed = 0;

    // Send DMs in parallel batches to avoid overwhelming the API
    const BATCH_SIZE = 10;
    for (let i = 0; i < members.length; i += BATCH_SIZE) {
      const batch = members.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (member) => {
          try {
            if (!member.userId) {
              logger.warn(`Skipping member ${member.username} - no userId`);
              return;
            }

            // Dashboard link includes membershipId to trigger onboarding wizard
            const dashboardLink = `${appUrl}/customer/${member.membershipId}?welcome=true`;

            // Send DM
            const dmResult = await sendProgramLaunchDM(
              member.userId,
              member.username,
              updatedCreator.companyName,
              dashboardLink,
              '10%' // Default starter commission rate
            );

            if (dmResult.success) {
              dmsSent++;
              logger.debug(`Program launch DM sent to ${member.username}`);
            } else {
              dmsFailed++;
              logger.warn(`Failed to send DM to ${member.username}: ${dmResult.error}`);
            }

            // Also send push notification
            await notifyProgramLaunch(
              updatedCreator.companyId,
              member.userId,
              updatedCreator.companyName,
              dashboardLink
            ).catch(err => logger.warn(`Push notification failed for ${member.username}:`, err));

          } catch (err) {
            dmsFailed++;
            logger.error(`Error sending DM to ${member.username}:`, err);
          }
        })
      );

      // Small delay between batches to be nice to the API
      if (i + BATCH_SIZE < members.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    logger.info(`Program launch DMs complete: ${dmsSent} sent, ${dmsFailed} failed`);

    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully',
      creator: {
        id: updatedCreator.id,
        companyName: updatedCreator.companyName,
        onboardingCompleted: updatedCreator.onboardingCompleted,
      },
      notifications: {
        totalMembers: members.length,
        dmsSent,
        dmsFailed,
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
