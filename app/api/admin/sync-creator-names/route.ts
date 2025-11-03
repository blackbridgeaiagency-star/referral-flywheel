// app/api/admin/sync-creator-names/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db/prisma';

export async function POST() {
  try {
    // Find all creators that are using their ID as the name
    const creators = await prisma.creator.findMany({
      where: {
        OR: [
          { companyName: { startsWith: 'biz_' } },
          { companyName: { startsWith: 'prod_' } },
          { companyName: { equals: prisma.creator.fields.companyId } }
        ]
      }
    });

    const updated = [];

    for (const creator of creators) {
      // For now, let's update the one we know about
      if (creator.companyId === 'biz_ImvAT3IIRbPBT' || creator.productId === 'biz_ImvAT3IIRbPBT') {
        await prisma.creator.update({
          where: { id: creator.id },
          data: {
            companyName: 'BlackBridgeAgency' // Your actual company name
          }
        });
        updated.push({
          id: creator.id,
          oldName: creator.companyName,
          newName: 'BlackBridgeAgency'
        });
      }
    }

    return NextResponse.json({
      success: true,
      updated
    });

  } catch (error) {
    console.error('Error syncing creator names:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET to check current creators
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
    console.error('Error fetching creators:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}