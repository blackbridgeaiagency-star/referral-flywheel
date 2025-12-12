// app/api/cron/send-notifications/route.ts
/**
 * Scheduled Notification Cron Job
 *
 * Handles all scheduled notifications:
 * 1. Competition winner notifications (daily check for ended competitions)
 * 2. Never-referred engagement notifications (weekly for members with 0 referrals)
 * 3. Inactive re-engagement notifications (members with no referrals in 7+ days)
 * 4. Daily streak notifications (milestones: 3, 7, 14, 28, 56, 84 days)
 * 5. Weekly/Monthly top performer notifications
 *
 * This should be called by Vercel Cron or external scheduler.
 * Recommended: Run daily at 9:00 AM UTC
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db/prisma';
import logger from '../../../../lib/logger';
import {
  notifyCompetitionWinner,
  notifyInactiveReengagement,
  notifyTopPerformer,
  notifyStreakAchievement,
  notifyNeverReferred,
} from '../../../../lib/whop/notifications';
import {
  sendCompetitionWinnerDM,
  sendReengagementDM,
  sendNeverReferredDM,
  sendStreakDM,
} from '../../../../lib/whop/graphql-messaging';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 1 minute timeout for cron

// Daily streak milestones that trigger special notifications
// 3 days, 1 week, 2 weeks, 1 month, 2 months, 3 months
const STREAK_MILESTONES = [3, 7, 14, 30, 60, 90];

// Verify cron secret to prevent unauthorized calls
function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true; // Allow if no secret configured (dev mode)

  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = {
    competitions: 0,
    neverReferred: 0,
    reengagement: 0,
    topPerformers: 0,
    streaks: 0,
    errors: [] as string[],
  };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://referral.whop.com';

  try {
    // ════════════════════════════════════════════════════════════════
    // 1. COMPETITION WINNER NOTIFICATIONS
    // Check for competitions that ended in the last 24 hours
    // ════════════════════════════════════════════════════════════════
    const creatorsWithCompetitions = await prisma.creator.findMany({
      where: {
        customRewardEnabled: true,
        customRewardTimeframe: { not: null },
      },
      select: {
        id: true,
        companyId: true,
        companyName: true,
        customRewardTimeframe: true,
        customRewardType: true,
        customReward1st: true,
        customReward2nd: true,
        customReward3rd: true,
        customReward4th: true,
        customReward5th: true,
        customReward6to10: true,
      },
    });

    for (const creator of creatorsWithCompetitions) {
      try {
        // Check if competition just ended (based on timeframe)
        const now = new Date();

        // Daily competitions end every day
        const isDailyEnd = creator.customRewardTimeframe === 'daily' &&
          now.getHours() >= 9 && now.getHours() < 12; // Morning window 9-12

        // Weekly competitions end on Monday morning
        const isWeeklyEnd = creator.customRewardTimeframe === 'weekly' &&
          now.getDay() === 1 && // Monday
          now.getHours() < 12; // Morning

        // Monthly competitions end on 1st of month morning
        const isMonthlyEnd = creator.customRewardTimeframe === 'monthly' &&
          now.getDate() === 1 && // 1st of month
          now.getHours() < 12;

        if (isDailyEnd || isWeeklyEnd || isMonthlyEnd) {
          // Get top performers from the last period
          const periodStart = new Date();
          if (isDailyEnd) {
            periodStart.setDate(periodStart.getDate() - 1); // Yesterday
          } else if (isWeeklyEnd) {
            periodStart.setDate(periodStart.getDate() - 7);
          } else {
            periodStart.setMonth(periodStart.getMonth() - 1);
          }

          // Build rewards array and determine how many winners to notify
          // ONLY notify winners that have a prize configured
          const rewardsList: { position: number; reward: string }[] = [];
          if (creator.customReward1st) rewardsList.push({ position: 1, reward: creator.customReward1st });
          if (creator.customReward2nd) rewardsList.push({ position: 2, reward: creator.customReward2nd });
          if (creator.customReward3rd) rewardsList.push({ position: 3, reward: creator.customReward3rd });
          if (creator.customReward4th) rewardsList.push({ position: 4, reward: creator.customReward4th });
          if (creator.customReward5th) rewardsList.push({ position: 5, reward: creator.customReward5th });
          // Only add 6-10 if customReward6to10 is configured
          if (creator.customReward6to10) {
            for (let pos = 6; pos <= 10; pos++) {
              rewardsList.push({ position: pos, reward: creator.customReward6to10 });
            }
          }

          // Only fetch as many top members as we have prizes for
          const maxWinners = rewardsList.length;
          if (maxWinners === 0) continue; // No prizes configured

          const topMembers = await prisma.commission.groupBy({
            by: ['memberId'],
            where: {
              creatorId: creator.id,
              createdAt: { gte: periodStart },
              paymentType: 'initial', // Count new referrals only
            },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: maxWinners, // Only get as many as we have prizes for
          });

          // Send notifications ONLY to winners with configured prizes
          for (let i = 0; i < topMembers.length && i < rewardsList.length; i++) {
            const member = await prisma.member.findUnique({
              where: { id: topMembers[i].memberId },
              select: { userId: true, username: true },
            });

            if (member && member.userId) {
              const { position, reward } = rewardsList[i];
              const competitionType = creator.customRewardTimeframe || 'weekly';

              // Push notification
              await notifyCompetitionWinner(
                creator.companyId,
                member.userId,
                member.username,
                position,
                reward,
                competitionType
              ).catch(err => logger.error('Competition winner push failed:', err));

              // DM
              await sendCompetitionWinnerDM(
                member.userId,
                member.username,
                creator.companyName,
                position,
                reward,
                competitionType
              ).catch(err => logger.error('Competition winner DM failed:', err));

              results.competitions++;
            }
          }

          logger.info(`📊 Competition ended for ${creator.companyName}: ${creator.customRewardTimeframe}, notified ${topMembers.length} winners`);
        }
      } catch (err) {
        const errorMsg = `Competition notification error for ${creator.companyName}: ${err}`;
        logger.error(errorMsg);
        results.errors.push(errorMsg);
      }
    }

    // ════════════════════════════════════════════════════════════════
    // 2. NEVER-REFERRED ENGAGEMENT NOTIFICATIONS (WEEKLY - MONDAYS)
    // Members with 0 referrals - encourage them to start!
    // Only send once per week on Mondays
    // ════════════════════════════════════════════════════════════════
    const now = new Date();
    const isMondayForNeverReferred = now.getDay() === 1; // Send on Mondays

    if (isMondayForNeverReferred) {
      const neverReferredMembers = await prisma.member.findMany({
        where: {
          totalReferred: 0,
          // Member must have been created at least 3 days ago (give them time first)
          createdAt: { lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
        },
        include: {
          creator: {
            select: { companyId: true, companyName: true },
          },
        },
        take: 100, // Limit per run to avoid overload
      });

      for (const member of neverReferredMembers) {
        try {
          if (!member.userId || !member.creator) continue;

          const referralLink = `${appUrl}/r/${member.referralCode}`;

          // Push notification
          await notifyNeverReferred(
            member.creator.companyId,
            member.userId,
            member.username,
            member.creator.companyName
          ).catch(err => logger.error('Never-referred push failed:', err));

          // DM
          await sendNeverReferredDM(
            member.userId,
            member.username,
            member.creator.companyName,
            referralLink
          ).catch(err => logger.error('Never-referred DM failed:', err));

          results.neverReferred++;
        } catch (err) {
          const errorMsg = `Never-referred error for ${member.username}: ${err}`;
          logger.error(errorMsg);
          results.errors.push(errorMsg);
        }
      }
    }

    // ════════════════════════════════════════════════════════════════
    // 3. INACTIVE RE-ENGAGEMENT NOTIFICATIONS (7+ days)
    // Members who HAVE made referrals but haven't in 7+ days
    // ════════════════════════════════════════════════════════════════
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Find members who:
    // - Have made at least 1 referral ever
    // - Haven't made a referral in 7+ days
    const inactiveMembers = await prisma.member.findMany({
      where: {
        totalReferred: { gt: 0 },
        // Check lastReferralDate if available, otherwise use commission check
        OR: [
          { lastReferralDate: { lt: sevenDaysAgo } },
          {
            lastReferralDate: null,
            commissions: {
              none: {
                createdAt: { gte: sevenDaysAgo },
                paymentType: 'initial',
              },
            },
          },
        ],
      },
      include: {
        creator: {
          select: { companyId: true, companyName: true },
        },
      },
      take: 50, // Limit per run to avoid overload
    });

    for (const member of inactiveMembers) {
      try {
        if (!member.userId || !member.creator) continue;

        // Calculate days since last referral
        let daysSinceLastReferral = 7; // Default

        if (member.lastReferralDate) {
          daysSinceLastReferral = Math.floor(
            (Date.now() - member.lastReferralDate.getTime()) / (1000 * 60 * 60 * 24)
          );
        } else {
          const lastCommission = await prisma.commission.findFirst({
            where: { memberId: member.id, paymentType: 'initial' },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
          });

          if (lastCommission) {
            daysSinceLastReferral = Math.floor(
              (Date.now() - lastCommission.createdAt.getTime()) / (1000 * 60 * 60 * 24)
            );
          }
        }

        if (daysSinceLastReferral < 7) continue; // Skip if not actually inactive

        const referralLink = `${appUrl}/r/${member.referralCode}`;
        const lifetimeEarnings = `$${member.lifetimeEarnings.toFixed(2)}`;

        // Push notification
        await notifyInactiveReengagement(
          member.creator.companyId,
          member.userId,
          member.username,
          daysSinceLastReferral,
          member.lifetimeEarnings
        ).catch(err => logger.error('Re-engagement push failed:', err));

        // DM
        await sendReengagementDM(
          member.userId,
          member.username,
          member.creator.companyName,
          daysSinceLastReferral,
          lifetimeEarnings,
          referralLink
        ).catch(err => logger.error('Re-engagement DM failed:', err));

        results.reengagement++;
      } catch (err) {
        const errorMsg = `Re-engagement error for ${member.username}: ${err}`;
        logger.error(errorMsg);
        results.errors.push(errorMsg);
      }
    }

    // ════════════════════════════════════════════════════════════════
    // 4. DAILY STREAK NOTIFICATIONS
    // Calculate and update streaks, notify on milestones
    // ════════════════════════════════════════════════════════════════
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Find members who had referrals today (to update their streak)
    const membersWithRecentReferrals = await prisma.member.findMany({
      where: {
        commissions: {
          some: {
            createdAt: { gte: yesterday },
            paymentType: 'initial',
          },
        },
      },
      include: {
        creator: { select: { companyId: true } },
      },
    });

    for (const member of membersWithRecentReferrals) {
      try {
        if (!member.userId || !member.creator) continue;

        // Check if they had a referral yesterday (to continue streak) or it's a new streak
        const hadReferralYesterday = member.lastReferralDate &&
          member.lastReferralDate >= yesterday &&
          member.lastReferralDate < today;

        const hadReferralToday = await prisma.commission.findFirst({
          where: {
            memberId: member.id,
            paymentType: 'initial',
            createdAt: { gte: today },
          },
        });

        if (!hadReferralToday) continue;

        let newStreak = 1; // Start new streak

        if (hadReferralYesterday) {
          // Continue existing streak
          newStreak = member.currentStreak + 1;
        }

        // Update member's streak
        const updateData: {
          currentStreak: number;
          longestStreak: number;
          lastReferralDate: Date;
          streakUpdatedAt: Date;
          lastStreakNotification?: number;
        } = {
          currentStreak: newStreak,
          longestStreak: Math.max(member.longestStreak, newStreak),
          lastReferralDate: new Date(),
          streakUpdatedAt: new Date(),
        };

        // Check if this is a milestone we should notify about
        const isMilestone = STREAK_MILESTONES.includes(newStreak);
        const alreadyNotified = member.lastStreakNotification >= newStreak;

        if (isMilestone && !alreadyNotified) {
          // Send streak notification
          await notifyStreakAchievement(
            member.creator.companyId,
            member.userId,
            newStreak,
            'daily'
          ).catch(err => logger.error('Streak push failed:', err));

          await sendStreakDM(
            member.userId,
            member.username,
            newStreak
          ).catch(err => logger.error('Streak DM failed:', err));

          updateData.lastStreakNotification = newStreak;
          results.streaks++;
        }

        await prisma.member.update({
          where: { id: member.id },
          data: updateData,
        });

      } catch (err) {
        logger.error(`Streak calculation error for ${member.username}: ${err}`);
      }
    }

    // Reset streaks for members who didn't have referrals yesterday
    // Only reset if their lastReferralDate is older than yesterday
    await prisma.member.updateMany({
      where: {
        currentStreak: { gt: 0 },
        OR: [
          { lastReferralDate: { lt: yesterday } },
          { lastReferralDate: null },
        ],
      },
      data: {
        currentStreak: 0,
        streakUpdatedAt: new Date(),
      },
    });

    // ════════════════════════════════════════════════════════════════
    // 5. TOP PERFORMER NOTIFICATIONS (Weekly on Mondays, Monthly on 1st)
    // ════════════════════════════════════════════════════════════════
    const isMonday = now.getDay() === 1;
    const isFirstOfMonth = now.getDate() === 1;

    if (isMonday || isFirstOfMonth) {
      const period = isFirstOfMonth ? 'month' : 'week';
      const periodStart = new Date();
      if (period === 'week') {
        periodStart.setDate(periodStart.getDate() - 7);
      } else {
        periodStart.setMonth(periodStart.getMonth() - 1);
      }

      // Get creators and their top performers
      const creators = await prisma.creator.findMany({
        where: {
          members: { some: { totalReferred: { gt: 0 } } },
        },
        select: { id: true, companyId: true, companyName: true },
      });

      for (const creator of creators) {
        try {
          // Get top performer for this creator in the period
          const topPerformer = await prisma.commission.groupBy({
            by: ['memberId'],
            where: {
              creatorId: creator.id,
              createdAt: { gte: periodStart },
              paymentType: 'initial',
            },
            _count: { id: true },
            _sum: { memberShare: true },
            orderBy: { _count: { id: 'desc' } },
            take: 1,
          });

          if (topPerformer.length > 0 && topPerformer[0]._count.id > 0) {
            const member = await prisma.member.findUnique({
              where: { id: topPerformer[0].memberId },
              select: { userId: true, username: true },
            });

            if (member?.userId) {
              const referralCount = topPerformer[0]._count.id;
              const earnings = `$${(topPerformer[0]._sum.memberShare || 0).toFixed(2)}`;

              await notifyTopPerformer(
                creator.companyId,
                member.userId,
                member.username,
                period,
                referralCount,
                earnings
              ).catch(err => logger.error('Top performer notification failed:', err));

              results.topPerformers++;
            }
          }
        } catch (err) {
          const errorMsg = `Top performer error for ${creator.companyName}: ${err}`;
          logger.error(errorMsg);
          results.errors.push(errorMsg);
        }
      }
    }

    logger.info(`Notification cron complete: ${JSON.stringify(results)}`);

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      results,
    });

  } catch (error) {
    logger.error('Notification cron error:', error);
    return NextResponse.json(
      { error: 'Cron job failed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
