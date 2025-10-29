import { NextRequest, NextResponse } from 'next/server';
import { syncCreatorWithWhop } from '../../../../lib/whop/sync-creator';

/**
 * POST /api/creator/sync
 *
 * Manually sync creator data from Whop API
 * Updates company name, logo, and description
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { creatorId } = body;

    if (!creatorId) {
      return NextResponse.json(
        { error: 'creatorId is required' },
        { status: 400 }
      );
    }

    console.log(`📡 Manual sync requested for creator: ${creatorId}`);

    // Sync with Whop
    const result = await syncCreatorWithWhop(creatorId);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Failed to sync creator data',
          success: false,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      updated: result.updated,
      data: result.data,
      message: result.updated
        ? 'Creator data synced successfully'
        : 'Creator data is already up to date',
    });
  } catch (error) {
    console.error('❌ Error syncing creator:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
