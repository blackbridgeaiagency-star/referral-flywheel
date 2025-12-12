// lib/whop/graphql-messaging.ts
/**
 * Whop GraphQL API for Direct Messaging
 *
 * The REST API doesn't support DMs - must use GraphQL.
 * Requires x-on-behalf-of header with sender user ID.
 */

import logger from '../logger';

const WHOP_GRAPHQL_URL = 'https://api.whop.com/public-graphql';
const WHOP_API_KEY = process.env.WHOP_API_KEY;
const WHOP_AGENT_USER_ID = process.env.WHOP_AGENT_USER_ID;

export interface GraphQLDMResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

/**
 * Send a direct message to a user via Whop GraphQL API
 *
 * @param userId - The recipient's Whop user ID (user_xxx)
 * @param message - The message content to send
 * @param senderUserId - Optional sender ID (defaults to WHOP_AGENT_USER_ID)
 */
export async function sendGraphQLDirectMessage(
  userId: string,
  message: string,
  senderUserId?: string
): Promise<GraphQLDMResult> {
  if (!WHOP_API_KEY) {
    logger.error('❌ WHOP_API_KEY not configured');
    return { success: false, error: 'WHOP_API_KEY not configured' };
  }

  const onBehalfOf = senderUserId || WHOP_AGENT_USER_ID;
  if (!onBehalfOf) {
    logger.error('❌ No sender user ID - set WHOP_AGENT_USER_ID or pass senderUserId');
    return { success: false, error: 'No sender user ID configured' };
  }

  const mutation = `
    mutation sendMessage($input: SendMessageInput!) {
      sendMessage(input: $input)
    }
  `;

  const variables = {
    input: {
      feedId: userId,
      feedType: 'dms_feed',
      message: message
    }
  };

  try {
    logger.info(`📨 Sending GraphQL DM to ${userId}`);

    const response = await fetch(WHOP_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHOP_API_KEY}`,
        'x-on-behalf-of': onBehalfOf,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: mutation,
        variables
      })
    });

    const result = await response.json();

    if (result.errors) {
      const errorMsg = result.errors.map((e: { message: string }) => e.message).join(', ');
      logger.error(`❌ GraphQL DM error: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }

    if (result.data?.sendMessage) {
      logger.info(`✅ GraphQL DM sent successfully to ${userId}`);
      return { success: true, messageId: result.data.sendMessage };
    }

    logger.warn(`⚠️ GraphQL DM returned unexpected response:`, result);
    return { success: true }; // Mutation succeeded but no message ID returned
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`❌ GraphQL DM failed:`, error);
    return { success: false, error: errorMsg };
  }
}

/**
 * Send a welcome message with formatting via GraphQL
 */
export async function sendWelcomeDM(
  userId: string,
  memberName: string,
  communityName: string,
  referralLink: string,
  senderUserId?: string
): Promise<GraphQLDMResult> {
  const message = `🎉 Welcome to ${communityName}, ${memberName}!

💰 You now have your own referral link. Share it to earn rewards!

🔗 Your link: ${referralLink}

Every person you bring in gets tracked automatically. The more you refer, the higher you rank on the leaderboard!

Ready to start earning? Share your link now!`;

  return sendGraphQLDirectMessage(userId, message, senderUserId);
}

/**
 * Send a commission earned notification via GraphQL
 */
export async function sendCommissionEarnedDM(
  userId: string,
  memberName: string,
  commissionAmount: string,
  referredUsername: string,
  senderUserId?: string
): Promise<GraphQLDMResult> {
  const message = `💰 Nice work, ${memberName}!

You just earned ${commissionAmount} from ${referredUsername}'s purchase!

Keep sharing your referral link to earn more. Check your dashboard to see your total earnings and leaderboard ranking.`;

  return sendGraphQLDirectMessage(userId, message, senderUserId);
}

/**
 * Send tier upgrade notification via GraphQL
 */
export async function sendTierUpgradeDM(
  userId: string,
  memberName: string,
  newTier: string,
  newRate: string,
  totalReferrals: number,
  senderUserId?: string
): Promise<GraphQLDMResult> {
  const message = `🎊 Congratulations, ${memberName}!

You've been promoted to ${newTier}!

Your new commission rate: ${newRate}
Total referrals: ${totalReferrals}

Keep up the amazing work! Your earnings will now be even higher on every referral.`;

  return sendGraphQLDirectMessage(userId, message, senderUserId);
}

/**
 * Send first referral bonus notification via GraphQL
 */
export async function sendFirstReferralBonusDM(
  userId: string,
  memberName: string,
  bonusAmount: string,
  senderUserId?: string
): Promise<GraphQLDMResult> {
  const message = `🎯 Amazing ${memberName}!

You got your first referral! 🎉

As a bonus, you've earned an extra ${bonusAmount}!

This is just the beginning. Keep sharing to climb the leaderboard and unlock even bigger rewards!`;

  return sendGraphQLDirectMessage(userId, message, senderUserId);
}

/**
 * Send custom commission rate notification via GraphQL
 *
 * This is sent when a creator manually sets a custom (higher) commission
 * rate for a high-performing affiliate. The message is designed to make
 * the member feel special and appreciated while encouraging continued referrals.
 *
 * @param userId - The recipient's Whop user ID
 * @param memberName - Member's display name
 * @param communityName - Creator's company/community name
 * @param newRatePercent - The new custom rate as a percentage (e.g., 20 for 20%)
 * @param tierRatePercent - The base tier rate they would have had (e.g., 10 for 10%)
 * @param reason - Optional reason the creator gave for the custom rate
 * @param senderUserId - Optional sender user ID
 */
export async function sendCustomRateDM(
  userId: string,
  memberName: string,
  communityName: string,
  newRatePercent: number,
  tierRatePercent: number,
  reason?: string,
  senderUserId?: string
): Promise<GraphQLDMResult> {
  // Calculate the bonus percentage points
  const bonusPoints = newRatePercent - tierRatePercent;
  const earningsMultiplier = ((newRatePercent / tierRatePercent) * 100 - 100).toFixed(0);

  // Build psychology-optimized message
  let message = `🌟 You've Been Recognized, ${memberName}!

Great news! The team at ${communityName} has personally selected you for a VIP commission rate.

💎 YOUR NEW RATE: ${newRatePercent}% (was ${tierRatePercent}%)
📈 EARNINGS BOOST: +${bonusPoints} percentage points (+${earningsMultiplier}% more per sale!)`;

  // Add personalized reason if provided
  if (reason && reason.trim()) {
    message += `

💬 Personal note from ${communityName}:
"${reason}"`;
  }

  message += `

This isn't automatic - this is ${communityName} recognizing YOUR impact and rewarding you personally. Every referral you make now earns you ${newRatePercent}% instead of ${tierRatePercent}%.

Keep doing what you're doing - your influence matters here! 🚀

Questions? Reply to this message anytime.`;

  return sendGraphQLDirectMessage(userId, message, senderUserId);
}

/**
 * Send competition winner notification via GraphQL DM
 */
export async function sendCompetitionWinnerDM(
  userId: string,
  memberName: string,
  communityName: string,
  position: number,
  reward: string,
  competitionType: string,
  senderUserId?: string
): Promise<GraphQLDMResult> {
  const positionEmoji = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : '🏆';
  const positionText = position === 1 ? '1st place' : position === 2 ? '2nd place' : position === 3 ? '3rd place' : `#${position}`;

  const message = `${positionEmoji} Congratulations, ${memberName}!

You've placed ${positionText} in ${communityName}'s ${competitionType} competition!

🎁 YOUR REWARD: ${reward}

This is a huge achievement! Your dedication to sharing and referring has paid off. You've proven yourself as one of the top affiliates in the community.

The ${communityName} team will reach out about claiming your reward.

Keep up the amazing work - the next competition starts soon! 🚀`;

  return sendGraphQLDirectMessage(userId, message, senderUserId);
}

/**
 * Send rank change notification via GraphQL DM
 * Used for significant rank changes or top 10 movements
 */
export async function sendRankChangeDM(
  userId: string,
  memberName: string,
  newRank: number,
  direction: 'up' | 'down',
  positionsChanged: number,
  senderUserId?: string
): Promise<GraphQLDMResult> {
  const emoji = direction === 'up' ? '📈' : '📉';
  const verb = direction === 'up' ? 'climbed' : 'dropped';
  const encouragement = direction === 'up'
    ? `Keep up the momentum! You're crushing it! 🔥`
    : `Don't worry - one referral can change everything. You've got this! 💪`;

  const message = `${emoji} Leaderboard Update, ${memberName}!

You've ${verb} ${positionsChanged} spot${positionsChanged > 1 ? 's' : ''} to rank #${newRank}!

${newRank <= 3 ? '🏆 You\'re in the top 3! Amazing work!' : ''}
${newRank <= 10 && newRank > 3 ? '⭐ You\'re in the top 10! Keep pushing!' : ''}

${encouragement}

Check your dashboard to see the full leaderboard.`;

  return sendGraphQLDirectMessage(userId, message, senderUserId);
}

/**
 * Send milestone achievement notification via GraphQL DM
 */
export async function sendMilestoneDM(
  userId: string,
  memberName: string,
  milestone: number,
  reward?: string,
  nextMilestone?: number,
  senderUserId?: string
): Promise<GraphQLDMResult> {
  const milestoneEmojis: Record<number, string> = {
    10: '🎯',
    25: '⭐',
    50: '🚀',
    100: '👑',
    250: '💎',
    500: '🔥',
    1000: '🏆',
  };

  const emoji = milestoneEmojis[milestone] || '🎉';
  const rewardText = reward ? `\n\n🎁 REWARD: ${reward}` : '';
  const nextText = nextMilestone
    ? `\n\nNext milestone: ${nextMilestone} referrals. Just ${nextMilestone - milestone} more to go!`
    : '\n\nYou\'ve reached legendary status! Keep building your empire!';

  const message = `${emoji} MILESTONE ACHIEVED, ${memberName}!

🎊 You've reached ${milestone} referrals!

This is a huge accomplishment. You've brought ${milestone} people into the community, and each one represents real impact.${rewardText}${nextText}

Thank you for being such an incredible affiliate! 🙏`;

  return sendGraphQLDirectMessage(userId, message, senderUserId);
}

/**
 * Send payment processed notification via GraphQL DM
 */
export async function sendPaymentProcessedDM(
  userId: string,
  memberName: string,
  amount: string,
  paymentMethod: string,
  senderUserId?: string
): Promise<GraphQLDMResult> {
  const message = `💸 Payment Sent, ${memberName}!

Great news! Your commission payment of ${amount} has been processed!

📤 Sent to: ${paymentMethod}
⏰ You should see it within 1-3 business days

Thank you for being an amazing affiliate. Your referrals are making a real difference, and we appreciate you!

Keep referring and keep earning! 🚀`;

  return sendGraphQLDirectMessage(userId, message, senderUserId);
}

/**
 * Send inactive re-engagement message via GraphQL DM
 */
export async function sendReengagementDM(
  userId: string,
  memberName: string,
  communityName: string,
  daysSinceLastReferral: number,
  lifetimeEarnings: string,
  referralLink: string,
  senderUserId?: string
): Promise<GraphQLDMResult> {
  const message = `👋 Hey ${memberName}, we miss you!

It's been ${daysSinceLastReferral} days since your last referral to ${communityName}.

📊 Your stats so far:
• Lifetime earnings: ${lifetimeEarnings}
• Your link is still active and ready!

🔗 Your referral link: ${referralLink}

The leaderboard is heating up! One share could put you back in the race. Your network is valuable - remind them why they should join!

We believe in you! 💪`;

  return sendGraphQLDirectMessage(userId, message, senderUserId);
}

/**
 * Send program launch DM to members when creator completes onboarding
 * This explains Referral Flywheel and invites them to start earning
 */
export async function sendProgramLaunchDM(
  userId: string,
  memberName: string,
  communityName: string,
  dashboardLink: string,
  commissionRate: string = '10%',
  senderUserId?: string
): Promise<GraphQLDMResult> {
  const message = `🎉 Great news, ${memberName}!

${communityName} just launched their Referral Program powered by Referral Flywheel!

💰 **Here's how you can start earning:**

1. Share your personal referral link with friends
2. When they join, you earn ${commissionRate} commission on EVERY payment they make
3. Yes, that's lifetime recurring income!

🚀 **Get Started Now:**
Click here to see your dashboard and get your unique referral link:
${dashboardLink}

📈 **Why this is amazing:**
• No cap on earnings - refer as many as you want
• Commissions are automatic - we handle everything
• Track your progress on the live leaderboard
• Top performers get special VIP rates!

Your referral link is ready and waiting. Every member you bring in is money in your pocket!

Let's grow together! 💪`;

  return sendGraphQLDirectMessage(userId, message, senderUserId);
}

/**
 * Send push notification for program launch
 */
export async function notifyProgramLaunch(
  companyId: string,
  userId: string,
  communityName: string,
  dashboardLink: string
): Promise<{ success: boolean; error?: string }> {
  // Import the notification function dynamically to avoid circular imports
  const { sendPushNotification } = await import('./notifications');

  return sendPushNotification({
    companyId,
    userIds: [userId],
    title: '🎉 Referral Program Launched!',
    content: `${communityName} just launched their referral program. Start earning commissions by sharing your link!`,
    deepLink: dashboardLink,
  });
}

/**
 * Send "never referred" engagement DM to members with 0 referrals
 * Psychology-driven messaging to encourage first action
 */
export async function sendNeverReferredDM(
  userId: string,
  memberName: string,
  communityName: string,
  referralLink: string,
  senderUserId?: string
): Promise<GraphQLDMResult> {
  const message = `💰 Hey ${memberName}!

Quick question: Do you want to make money?

Of course you do! And you're sitting on an opportunity right now.

You're a member of ${communityName}, but you haven't shared your referral link yet. That means you're leaving money on the table!

🔗 **Your link:** ${referralLink}

**Here's the math:**
• Every person who joins through you = 💵 in your pocket
• It's LIFETIME commission - they pay monthly, you earn monthly
• No cap on earnings. Refer 100 people? Earn on all 100. Forever.

The top earners in this community started exactly where you are now. The only difference? They shared their link.

**One share could change everything.**

What are you waiting for? 🚀`;

  return sendGraphQLDirectMessage(userId, message, senderUserId);
}

/**
 * Send streak achievement DM with psychology-optimized messaging
 * Different messages for different streak milestones
 */
export async function sendStreakDM(
  userId: string,
  memberName: string,
  streakCount: number,
  senderUserId?: string
): Promise<GraphQLDMResult> {
  // Psychology-optimized streak messages
  const streakMessages: Record<number, string> = {
    3: `🔥 3-DAY STREAK, ${memberName}!

You've made referrals 3 days in a row!

This is HUGE. Studies show it takes 3 days to start building a habit. You're not just referring - you're becoming a referral machine.

The compound effect is real:
• Day 1: 1 referral
• Day 2: 2 total
• Day 3: 3 total
• Day 30: ...you do the math 💰

Keep this energy going! One more day and you're on a 4-day streak.

You're building something here. Don't stop now! 🚀`,

    7: `⚡ ONE WEEK STREAK, ${memberName}!

7 DAYS STRAIGHT. A full week of daily referrals.

Do you realize how rare this is? You're in the top 5% of all affiliates. Most people never even get their first referral - you've gotten one EVERY. SINGLE. DAY.

The numbers don't lie:
• 7 referrals minimum this week
• 7 weeks of recurring income building
• 7 reasons to feel proud of yourself

You're not just participating anymore. You're DOMINATING.

Next milestone: 14 days (2 weeks). Let's see if you can double this! 💪`,

    14: `💪 TWO WEEK STREAK, ${memberName}!

14 days. 2 full weeks. Every single day, you showed up.

This is no longer luck. This is DEDICATION. This is who you are now.

At this point:
• You've likely earned more than most affiliates earn in months
• Your recurring income is compounding daily
• You've proven you can commit to something big

The people who hit 2-week streaks usually go on to become TOP PERFORMERS. That's you now.

Next stop: 30 days (1 month). Imagine telling people you referred someone EVERY DAY for a month. That's legendary status.

You've got this! 🔥`,

    30: `🚀 ONE MONTH STREAK, ${memberName}!

30 DAYS. You did it.

For one ENTIRE MONTH, you made at least one referral every single day. Do you understand how insane that is?

You're not an affiliate. You're a MOVEMENT.

The math at this level:
• 30+ referrals (likely way more)
• 30 streams of recurring income
• Top 1% performer status UNLOCKED

At this level, you deserve recognition. You deserve rewards. You deserve to be celebrated.

We see you. We appreciate you. You're literally building this community's success.

Next milestone: 60 days (2 months). Only legends get there.

Are you a legend? Let's find out. 👑`,

    60: `👑 TWO MONTH STREAK, ${memberName}!

60 days. SIXTY DAYS IN A ROW.

We need to talk about what you've accomplished.

You have referred someone every single day for TWO MONTHS. There are people who can't even remember to drink water for two days straight.

At this point:
• You're not playing the game - you ARE the game
• Your passive income is substantial
• You've influenced dozens (hundreds?) of people
• You're in the top 0.1% of all affiliates worldwide

Seriously, ${memberName} - this is remarkable. Hall of Fame material.

One more milestone awaits: 90 days (3 months). The LEGEND tier.

You're almost there. Don't stop now. History is watching. 🏆`,

    90: `🏆 LEGEND STATUS ACHIEVED, ${memberName}!

90 DAYS. 3 MONTHS OF DAILY REFERRALS.

This message is being sent to acknowledge something truly extraordinary.

What you've done is statistically almost impossible:
• 90+ consecutive days of successful referrals
• Hundreds of people brought into the community
• A passive income stream most people only dream about
• Discipline that rivals professional athletes

You are, officially, a LEGEND.

Your name belongs in a hall of fame. Your story should be told. What you've accomplished here represents the absolute pinnacle of affiliate performance.

There's nothing higher than this. You've reached the top of the mountain.

Thank you for being absolutely exceptional. The community is better because of you.

🎖️ Forever a Legend 🎖️`,
  };

  // Get specific message or generate generic one
  const specificMessage = streakMessages[streakCount];

  if (specificMessage) {
    return sendGraphQLDirectMessage(userId, specificMessage, senderUserId);
  }

  // Generic message for non-milestone streaks (like 4, 5, 6 days etc)
  const genericMessage = `🔥 ${streakCount}-Day Streak, ${memberName}!

You're on FIRE! ${streakCount} days of referrals in a row.

Every day you maintain this streak, you're:
• Building more recurring income
• Climbing the leaderboard
• Getting closer to the next big milestone

${streakCount < 7 ? `Next milestone: 7 days (1 week)! Only ${7 - streakCount} more days!` :
  streakCount < 14 ? `Next milestone: 14 days (2 weeks)! Only ${14 - streakCount} more days!` :
  streakCount < 30 ? `Next milestone: 30 days (1 month)! Only ${30 - streakCount} more days!` :
  streakCount < 60 ? `Next milestone: 60 days (2 months)! Only ${60 - streakCount} more days!` :
  `Next milestone: 90 days (LEGEND)! Only ${90 - streakCount} more days!`}

Keep it going! 💪`;

  return sendGraphQLDirectMessage(userId, genericMessage, senderUserId);
}

/**
 * Send creator announcement to a member
 * Used when creator wants to broadcast to all their members
 */
export async function sendCreatorAnnouncementDM(
  userId: string,
  memberName: string,
  communityName: string,
  announcementTitle: string,
  announcementContent: string,
  senderUserId?: string
): Promise<GraphQLDMResult> {
  const message = `📢 **Announcement from ${communityName}**

${announcementTitle}

${announcementContent}

---
This message was sent to all members of ${communityName}'s referral program.`;

  return sendGraphQLDirectMessage(userId, message, senderUserId);
}

export default {
  sendGraphQLDirectMessage,
  sendWelcomeDM,
  sendCommissionEarnedDM,
  sendTierUpgradeDM,
  sendFirstReferralBonusDM,
  sendCustomRateDM,
  sendCompetitionWinnerDM,
  sendRankChangeDM,
  sendMilestoneDM,
  sendPaymentProcessedDM,
  sendReengagementDM,
  sendProgramLaunchDM,
  notifyProgramLaunch,
  sendNeverReferredDM,
  sendStreakDM,
  sendCreatorAnnouncementDM,
};
