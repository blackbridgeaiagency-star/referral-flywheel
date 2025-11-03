// app/api/fix-creator-names/route.ts
// TEMPORARY ENDPOINT - DELETE AFTER USE
import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db/prisma';

export async function POST() {
  try {
    // Update the creator with biz_ImvAT3IIRbPBT to have the proper name
    const updated = await prisma.creator.updateMany({
      where: {
        OR: [
          { companyId: 'biz_ImvAT3IIRbPBT' },
          { productId: 'biz_ImvAT3IIRbPBT' },
          { companyName: 'biz_ImvAT3IIRbPBT' }
        ]
      },
      data: {
        companyName: 'BlackBridgeAgency'
      }
    });

    // Also update any other creators that are showing IDs as names
    const additionalUpdates = await prisma.creator.updateMany({
      where: {
        companyName: {
          startsWith: 'biz_'
        }
      },
      data: {
        companyName: 'BlackBridgeAgency'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Creator names fixed',
      updated: updated.count,
      additional: additionalUpdates.count
    });

  } catch (error) {
    console.error('Error fixing creator names:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const creators = await prisma.creator.findMany({
      select: {
        id: true,
        companyName: true,
        companyId: true,
        productId: true,
        _count: {
          select: {
            members: true
          }
        }
      }
    });

    return NextResponse.json({
      creators: creators.map(c => ({
        id: c.id,
        companyName: c.companyName,
        companyId: c.companyId,
        productId: c.productId,
        memberCount: c._count.members
      }))
    });

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}