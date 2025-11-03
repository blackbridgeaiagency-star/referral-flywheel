// app/api/cleanup-test-data/route.ts
// Temporary endpoint to clean up test data - remove this file after cleanup
import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db/prisma';

export async function GET() {
  try {
    const testCreators = await prisma.creator.findMany({
      where: {
        OR: [
          { companyName: { contains: 'test' } },
          { companyName: { contains: 'Test' } },
          { companyName: { contains: 'TEST' } },
          { companyId: { contains: 'test' } },
          { companyId: 'biz_test' },
        ]
      },
      select: {
        id: true,
        companyName: true,
        companyId: true,
        productId: true,
        createdAt: true,
      }
    });

    const testMembers = await prisma.member.findMany({
      where: {
        OR: [
          { username: { contains: 'test' } },
          { email: { contains: 'test' } },
          { email: { contains: '.temp' } },
        ]
      },
      select: {
        id: true,
        username: true,
        email: true,
        referralCode: true,
        createdAt: true,
      }
    });

    return NextResponse.json({
      testCreators,
      testMembers,
      counts: {
        creators: testCreators.length,
        members: testMembers.length
      }
    });

  } catch (error) {
    console.error('Error checking test data:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    console.log('🧹 Removing test data via API...\n');

    // Find and remove test creators
    const testCreators = await prisma.creator.findMany({
      where: {
        OR: [
          { companyName: { contains: 'test' } },
          { companyName: { contains: 'Test' } },
          { companyName: { contains: 'TEST' } },
          { companyId: { contains: 'test' } },
          { companyId: 'biz_test' },
        ]
      }
    });

    const removedCreators = [];

    if (testCreators.length > 0) {
      console.log(`Found ${testCreators.length} test creators to remove`);

      // Delete test creators (cascades to members, commissions, etc.)
      for (const creator of testCreators) {
        await prisma.creator.delete({
          where: { id: creator.id }
        });
        removedCreators.push({
          id: creator.id,
          companyName: creator.companyName,
          companyId: creator.companyId
        });
        console.log(`  ✅ Removed: ${creator.companyName} (${creator.companyId})`);
      }
    }

    // Also check for orphaned test members
    const testMembers = await prisma.member.findMany({
      where: {
        OR: [
          { username: { contains: 'test' } },
          { email: { contains: 'test' } },
          { email: { contains: '.temp' } },
        ]
      }
    });

    const removedMembers = [];

    if (testMembers.length > 0) {
      console.log(`Found ${testMembers.length} test members to remove`);

      for (const member of testMembers) {
        await prisma.member.delete({
          where: { id: member.id }
        });
        removedMembers.push({
          id: member.id,
          username: member.username,
          email: member.email
        });
        console.log(`  ✅ Removed: ${member.username} (${member.email})`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Test data cleanup complete',
      removed: {
        creators: removedCreators,
        members: removedMembers,
        totals: {
          creators: removedCreators.length,
          members: removedMembers.length
        }
      }
    });

  } catch (error) {
    console.error('❌ Error removing test data:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}