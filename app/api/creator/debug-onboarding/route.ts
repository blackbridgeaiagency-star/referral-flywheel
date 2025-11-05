import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db/prisma';

/**
 * GET /api/creator/debug-onboarding?companyId=biz_xxx
 *
 * Debug endpoint to check creator onboarding status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId parameter is required' },
        { status: 400 }
      );
    }

    // Find creator by companyId
    const creator = await prisma.creator.findFirst({
      where: { companyId },
      select: {
        id: true,
        companyId: true,
        companyName: true,
        onboardingCompleted: true,
        onboardingStep: true,
      },
    });

    if (!creator) {
      return NextResponse.json({
        found: false,
        message: `No creator found with companyId: ${companyId}`,
        searchedFor: companyId,
      });
    }

    return NextResponse.json({
      found: true,
      creator: {
        id: creator.id,
        companyId: creator.companyId,
        companyName: creator.companyName,
        onboardingCompleted: creator.onboardingCompleted,
        onboardingStep: creator.onboardingStep,
        shouldShowWizard: !creator.onboardingCompleted,
      },
    });
  } catch (error) {
    console.error('Debug onboarding error:', error);
    return NextResponse.json(
      {
        error: 'Failed to check onboarding status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/creator/debug-onboarding
 *
 * Reset onboarding status for testing
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId } = body;

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      );
    }

    // Reset onboarding status
    const updated = await prisma.creator.updateMany({
      where: { companyId },
      data: {
        onboardingCompleted: false,
        onboardingStep: 0,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Onboarding status reset',
      updatedCount: updated.count,
    });
  } catch (error) {
    console.error('Reset onboarding error:', error);
    return NextResponse.json(
      {
        error: 'Failed to reset onboarding status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
