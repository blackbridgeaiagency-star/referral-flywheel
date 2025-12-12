// app/api/cleanup-test-data/route.ts
// Admin endpoint to clean up test data
import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db/prisma';
import logger from '../../../lib/logger';
import { isAdmin } from '../../../lib/whop/simple-auth';

export async function GET() {
  // SECURITY: Require admin access
  if (!await isAdmin()) {
    logger.warn('[SECURITY] Unauthorized access attempt to /api/cleanup-test-data');
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

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
    logger.error('Error checking test data:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE() {
  // SECURITY: Require admin access
  if (!await isAdmin()) {
    logger.warn('[SECURITY] Unauthorized DELETE attempt to /api/cleanup-test-data');
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    logger.info('Removing test data via API...');

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

    const removedCreators: { id: string; companyName: string; companyId: string }[] = [];

    if (testCreators.length > 0) {
      logger.info(`Found ${testCreators.length} test creators to remove`);

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
        logger.debug(`Removed: ${creator.companyName} (${creator.companyId})`);
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

    const removedMembers: { id: string; username: string; email: string }[] = [];

    if (testMembers.length > 0) {
      logger.info(`Found ${testMembers.length} test members to remove`);

      for (const member of testMembers) {
        await prisma.member.delete({
          where: { id: member.id }
        });
        removedMembers.push({
          id: member.id,
          username: member.username,
          email: member.email
        });
        logger.debug(`Removed: ${member.username} (${member.email})`);
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
    logger.error('Error removing test data:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}