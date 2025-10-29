// app/api/creator/update-name/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { creatorId, companyName } = body;

    if (!creatorId || !companyName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update creator's company name
    await prisma.creator.update({
      where: { id: creatorId },
      data: { companyName: companyName.trim() }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating creator name:', error);
    return NextResponse.json(
      { error: 'Failed to update name' },
      { status: 500 }
    );
  }
}
