// app/api/creator/announcement/route.ts
/**
 * Creator Announcement API
 *
 * Allows creators to send announcements (Push + DM) to all their members.
 * Useful for:
 * - Prize updates
 * - Competition announcements
 * - Program changes
 * - Special promotions
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db/prisma';
import logger from '../../../../lib/logger';
import { notifyAnnouncement } from '../../../../lib/whop/notifications';
import { sendCreatorAnnouncementDM } from '../../../../lib/whop/graphql-messaging';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 1 minute for sending to many members

interface AnnouncementRequest {
  creatorId: string;
  title: string;
  content: string;
  sendDM?: boolean; // Default true
  sendPush?: boolean; // Default true
}

export async function POST(request: NextRequest) {
  try {
    const body: AnnouncementRequest = await request.json();
    const { creatorId, title, content, sendDM = true, sendPush = true } = body;

    // Validate required fields
    if (!creatorId || !title || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: creatorId, title, content' },
        { status: 400 }
      );
    }

    // Get creator and their members
    const creator = await prisma.creator.findUnique({
      where: { id: creatorId },
      select: {
        id: true,
        companyId: true,
        companyName: true,
        members: {
          select: {
            userId: true,
            username: true,
          },
        },
      },
    });

    if (!creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      );
    }

    const results = {
      totalMembers: creator.members.length,
      pushSent: 0,
      dmSent: 0,
      errors: [] as string[],
    };

    // Send push notification to all members at once (if enabled)
    if (sendPush) {
      try {
        await notifyAnnouncement(creator.companyId, title, content);
        results.pushSent = creator.members.length; // Push sent to all
        logger.info(`Push announcement sent to ${creator.members.length} members`);
      } catch (err) {
        const errorMsg = `Push announcement failed: ${err}`;
        logger.error(errorMsg);
        results.errors.push(errorMsg);
      }
    }

    // Send DM to each member individually (if enabled)
    if (sendDM) {
      for (const member of creator.members) {
        if (!member.userId) continue;

        try {
          await sendCreatorAnnouncementDM(
            member.userId,
            member.username,
            creator.companyName,
            title,
            content
          );
          results.dmSent++;
        } catch (err) {
          const errorMsg = `DM to ${member.username} failed: ${err}`;
          logger.error(errorMsg);
          results.errors.push(errorMsg);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    logger.info(`Announcement sent by ${creator.companyName}:`, results);

    return NextResponse.json({
      ok: true,
      message: `Announcement sent to ${results.totalMembers} members`,
      results,
    });

  } catch (error) {
    logger.error('Announcement API error:', error);
    return NextResponse.json(
      { error: 'Failed to send announcement', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
