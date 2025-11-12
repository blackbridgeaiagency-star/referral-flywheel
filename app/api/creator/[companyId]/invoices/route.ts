/**
 * Creator Invoices API Endpoint
 *
 * Returns invoice history for a creator
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db/prisma';
import logger from '../../../../../lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    const { companyId } = params;

    // Verify creator exists
    const creator = await prisma.creator.findUnique({
      where: { companyId: companyId },
      select: { id: true, companyName: true },
    });

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    // Get invoices (last 12 months)
    const invoices = await prisma.invoice.findMany({
      where: { creatorId: creator.id },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });

    logger.info(`✅ Fetched ${invoices.length} invoices for ${creator.companyName}`);

    return NextResponse.json(invoices);
  } catch (error) {
    logger.error('❌ Error fetching invoices:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch invoices',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
