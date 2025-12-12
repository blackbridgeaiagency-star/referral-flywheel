// lib/whop/notifications.ts
/**
 * Whop Push Notifications API
 *
 * Send push notifications to users via Whop REST API v2.
 * This is different from DMs - these appear as app notifications.
 */

import logger from '../logger';

const WHOP_API_BASE = 'https://api.whop.com/api/v2';
const WHOP_API_KEY = process.env.WHOP_API_KEY;

export interface PushNotificationOptions {
  companyId: string;
  title: string;
  content: string;
  userIds?: string[];  // Specific users, or omit for all members
  deepLink?: string;   // Path to navigate to when clicked (e.g., "/dashboard")
}

export interface PushNotificationResult {
  success: boolean;
  error?: string;
  notificationId?: string;
}

/**
 * Send a push notification to users
 *
 * @param options - Notification options including title, content, and target users
 */
export async function sendPushNotification(
  options: PushNotificationOptions
): Promise<PushNotificationResult> {
  if (!WHOP_API_KEY) {
    logger.error('❌ WHOP_API_KEY not configured');
    return { success: false, error: 'WHOP_API_KEY not configured' };
  }

  const { companyId, title, content, userIds, deepLink } = options;

  try {
    logger.info(`🔔 Sending push notification: "${title}" to ${userIds?.length || 'all'} users`);

    const body: Record<string, unknown> = {
      company_id: companyId,
      title,
      content,
    };

    // Add optional fields
    if (userIds && userIds.length > 0) {
      body.user_ids = userIds;
    }
    if (deepLink) {
      body.rest_path = deepLink;
    }

    const response = await fetch(`${WHOP_API_BASE}/notifications`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHOP_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`❌ Push notification failed (${response.status}): ${errorText}`);
      return { success: false, error: `API error: ${response.status} ${errorText}` };
    }

    const result = await response.json();
    logger.info(`✅ Push notification sent successfully`);

    return {
      success: true,
      notificationId: result.id || result.data?.id
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`❌ Push notification error:`, error);
    return { success: false, error: errorMsg };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PRE-BUILT NOTIFICATION TEMPLATES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Welcome notification for new members
 */
export async function notifyWelcome(
  companyId: string,
  userId: string,
  memberName: string
): Promise<PushNotificationResult> {
  return sendPushNotification({
    companyId,
    title: '🎉 Welcome!',
    content: `You're now earning on every referral, ${memberName}! Check your dashboard to get your unique link.`,
    userIds: [userId],
    deepLink: '/dashboard',
  });
}

/**
 * Commission earned notification
 */
export async function notifyCommissionEarned(
  companyId: string,
  userId: string,
  amount: string,
  referredName: string
): Promise<PushNotificationResult> {
  return sendPushNotification({
    companyId,
    title: '💰 You earned a commission!',
    content: `You just earned ${amount} from ${referredName}'s purchase!`,
    userIds: [userId],
    deepLink: '/dashboard',
  });
}

/**
 * Tier upgrade notification
 */
export async function notifyTierUpgrade(
  companyId: string,
  userId: string,
  newTier: string,
  newRate: string
): Promise<PushNotificationResult> {
  return sendPushNotification({
    companyId,
    title: `🎊 Promoted to ${newTier}!`,
    content: `Congratulations! Your commission rate is now ${newRate}`,
    userIds: [userId],
    deepLink: '/dashboard',
  });
}

/**
 * First referral notification
 */
export async function notifyFirstReferral(
  companyId: string,
  userId: string,
  memberName: string
): Promise<PushNotificationResult> {
  return sendPushNotification({
    companyId,
    title: '🎯 First referral!',
    content: `Amazing ${memberName}! You got your first referral! Keep it up!`,
    userIds: [userId],
    deepLink: '/dashboard',
  });
}

/**
 * Leaderboard rank change notification
 */
export async function notifyRankChange(
  companyId: string,
  userId: string,
  newRank: number,
  direction: 'up' | 'down'
): Promise<PushNotificationResult> {
  const emoji = direction === 'up' ? '📈' : '📉';
  const verb = direction === 'up' ? 'moved up to' : 'dropped to';

  return sendPushNotification({
    companyId,
    title: `${emoji} Rank Update`,
    content: `You've ${verb} #${newRank} on the leaderboard!`,
    userIds: [userId],
    deepLink: '/dashboard',
  });
}

/**
 * Milestone achievement notification
 */
export async function notifyMilestone(
  companyId: string,
  userId: string,
  milestone: number,
  reward?: string
): Promise<PushNotificationResult> {
  const rewardText = reward ? ` Reward: ${reward}` : '';

  return sendPushNotification({
    companyId,
    title: `🏆 ${milestone} Referrals!`,
    content: `You've reached ${milestone} referrals!${rewardText}`,
    userIds: [userId],
    deepLink: '/dashboard',
  });
}

/**
 * Company-wide announcement
 */
export async function notifyAnnouncement(
  companyId: string,
  title: string,
  content: string
): Promise<PushNotificationResult> {
  return sendPushNotification({
    companyId,
    title,
    content,
    // No userIds = send to all members
  });
}

/**
 * Custom commission rate set notification (push notification fallback)
 *
 * This is the push notification version of the custom rate notification.
 * Used as a fallback when GraphQL DM fails, or as an additional channel
 * to ensure the member sees this important update.
 *
 * @param companyId - Creator's Whop company ID
 * @param userId - Member's Whop user ID
 * @param communityName - Creator's community name for personalization
 * @param newRatePercent - The new custom rate as percentage (e.g., 20 for 20%)
 * @param tierRatePercent - The base tier rate they would have had
 */
export async function notifyCustomRateSet(
  companyId: string,
  userId: string,
  communityName: string,
  newRatePercent: number,
  tierRatePercent: number
): Promise<PushNotificationResult> {
  const bonusPoints = newRatePercent - tierRatePercent;

  return sendPushNotification({
    companyId,
    title: `🌟 VIP Rate Unlocked: ${newRatePercent}%!`,
    content: `${communityName} just upgraded your commission to ${newRatePercent}% (+${bonusPoints}pts). You've been recognized!`,
    userIds: [userId],
    deepLink: '/dashboard',
  });
}

/**
 * Competition winner notification
 * Sent when a member wins or places in a creator-defined competition
 */
export async function notifyCompetitionWinner(
  companyId: string,
  userId: string,
  memberName: string,
  position: number,
  reward: string,
  competitionType: string
): Promise<PushNotificationResult> {
  const positionEmoji = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : '🏆';
  const positionText = position === 1 ? '1st place' : position === 2 ? '2nd place' : position === 3 ? '3rd place' : `#${position}`;

  return sendPushNotification({
    companyId,
    title: `${positionEmoji} Competition Winner!`,
    content: `Congrats ${memberName}! You placed ${positionText} in the ${competitionType} competition! Reward: ${reward}`,
    userIds: [userId],
    deepLink: '/dashboard',
  });
}

/**
 * Streak achievement notification (DAILY STREAKS)
 * Sent when a member achieves a daily referral streak milestone
 * Milestones: 3, 7 (1 week), 14 (2 weeks), 30 (1 month), 60 (2 months), 90 (3 months)
 */
export async function notifyStreakAchievement(
  companyId: string,
  userId: string,
  streakCount: number,
  streakType: 'daily' | 'weekly' | 'monthly' = 'daily'
): Promise<PushNotificationResult> {
  // Psychology-optimized streak messages
  const streakMessages: Record<number, { emoji: string; title: string; message: string }> = {
    3: {
      emoji: '🔥',
      title: '3-Day Streak!',
      message: "You're building momentum! 3 days of referrals in a row. The habit is forming!",
    },
    7: {
      emoji: '⚡',
      title: '1 WEEK STREAK!',
      message: "A full week of daily referrals! You're in the top 5% of affiliates. KEEP GOING!",
    },
    14: {
      emoji: '💪',
      title: '2 WEEK STREAK!',
      message: "Two weeks straight! You've proven you're serious. The compound effect is kicking in!",
    },
    30: {
      emoji: '🚀',
      title: '1 MONTH STREAK!',
      message: "30 days straight! You're a referral MACHINE. Top 1% performer status unlocked!",
    },
    60: {
      emoji: '👑',
      title: '2 MONTH STREAK!',
      message: "60 days! You're not just an affiliate - you're a legend. Hall of Fame material!",
    },
    90: {
      emoji: '🏆',
      title: 'LEGEND STATUS: 3 MONTHS!',
      message: "90 DAYS STRAIGHT! You've achieved what almost nobody does. Absolute LEGEND!",
    },
  };

  const milestone = streakMessages[streakCount];

  if (milestone) {
    return sendPushNotification({
      companyId,
      title: `${milestone.emoji} ${milestone.title}`,
      content: milestone.message,
      userIds: [userId],
      deepLink: '/dashboard',
    });
  }

  // Generic streak notification for other counts
  return sendPushNotification({
    companyId,
    title: `🔥 ${streakCount}-Day Streak!`,
    content: `You're on fire! ${streakCount} days of referrals in a row. Keep the momentum going!`,
    userIds: [userId],
    deepLink: '/dashboard',
  });
}

/**
 * Never Referred engagement notification
 * Sent weekly to members with 0 referrals to encourage them to start
 */
export async function notifyNeverReferred(
  companyId: string,
  userId: string,
  memberName: string,
  communityName: string
): Promise<PushNotificationResult> {
  return sendPushNotification({
    companyId,
    title: '💰 Start Earning Today!',
    content: `${memberName}, you haven't made your first referral yet! Share your link and start earning commissions. Your friends are waiting!`,
    userIds: [userId],
    deepLink: '/dashboard',
  });
}

/**
 * Inactive re-engagement notification
 * Sent to members who haven't made a referral in a while
 */
export async function notifyInactiveReengagement(
  companyId: string,
  userId: string,
  memberName: string,
  daysSinceLastReferral: number,
  pendingEarnings?: number
): Promise<PushNotificationResult> {
  const pendingText = pendingEarnings && pendingEarnings > 0
    ? ` You have $${pendingEarnings.toFixed(2)} in pending earnings waiting!`
    : '';

  return sendPushNotification({
    companyId,
    title: `👋 We miss you, ${memberName}!`,
    content: `It's been ${daysSinceLastReferral} days since your last referral.${pendingText} Ready to get back in the game?`,
    userIds: [userId],
    deepLink: '/dashboard',
  });
}

/**
 * Payment processed notification
 * Sent when auto-pay successfully transfers commission to member
 */
export async function notifyPaymentProcessed(
  companyId: string,
  userId: string,
  amount: string,
  paymentMethod: string
): Promise<PushNotificationResult> {
  return sendPushNotification({
    companyId,
    title: '💸 Payment Sent!',
    content: `${amount} has been sent to your ${paymentMethod}. Thanks for being an awesome affiliate!`,
    userIds: [userId],
    deepLink: '/dashboard',
  });
}

/**
 * Top performer of the period notification
 * Sent to highlight top performers weekly/monthly
 */
export async function notifyTopPerformer(
  companyId: string,
  userId: string,
  memberName: string,
  period: 'week' | 'month',
  referralCount: number,
  earnings: string
): Promise<PushNotificationResult> {
  const periodText = period === 'week' ? 'this week' : 'this month';

  return sendPushNotification({
    companyId,
    title: `⭐ Top Performer ${period === 'week' ? 'This Week' : 'This Month'}!`,
    content: `${memberName}, you crushed it ${periodText}! ${referralCount} referrals, ${earnings} earned. Keep dominating!`,
    userIds: [userId],
    deepLink: '/dashboard',
  });
}

export default {
  sendPushNotification,
  notifyWelcome,
  notifyCommissionEarned,
  notifyTierUpgrade,
  notifyFirstReferral,
  notifyRankChange,
  notifyMilestone,
  notifyAnnouncement,
  notifyCustomRateSet,
  notifyCompetitionWinner,
  notifyStreakAchievement,
  notifyInactiveReengagement,
  notifyPaymentProcessed,
  notifyTopPerformer,
  notifyNeverReferred,
};
