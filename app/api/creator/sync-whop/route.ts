// app/api/creator/sync-whop/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db/prisma';
import { getCompany } from '../../../../lib/whop/api-client';
import logger from '../../../../lib/logger';


export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Manual sync of creator data from Whop API
 * Allows creators to refresh their community info (name, logo, description)
 */
export async function POST(request: Request) {
  try {
    const { creatorId } = await request.json();

    if (!creatorId) {
      return NextResponse.json(
        { error: 'creatorId is required' },
        { status: 400 }
      );
    }

    // Get creator
    const creator = await prisma.creator.findUnique({
      where: { id: creatorId }
    });

    if (!creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      );
    }

    // Fetch latest data from Whop
    logger.info(` Syncing creator ${creatorId} with Whop API...`);

    try {
      const whopCompany = await getCompany(creator.companyId);

      // Update creator with latest Whop data
      const updatedCreator = await prisma.creator.update({
        where: { id: creatorId },
        data: {
          companyName: whopCompany.name,
          logoUrl: whopCompany.image_url || null,
          description: whopCompany.description || null,
        }
      });

      logger.info(`Creator synced successfully: ${updatedCreator.companyName}`);

      return NextResponse.json({
        success: true,
        creator: {
          id: updatedCreator.id,
          companyName: updatedCreator.companyName,
          logoUrl: updatedCreator.logoUrl,
          description: updatedCreator.description,
        }
      });

    } catch (apiError) {
      logger.error(`❌ Failed to fetch from Whop API:`, apiError);
      return NextResponse.json(
        {
          error: 'Failed to sync with Whop',
          details: apiError instanceof Error ? apiError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    logger.error('❌ Sync error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'Sync endpoint is alive',
    usage: 'POST { creatorId: string }',
    timestamp: new Date().toISOString()
  });
}
