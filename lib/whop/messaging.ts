// lib/whop/messaging.ts
import { sendDirectMessage } from './api-client';
import { sendGraphQLDirectMessage, sendWelcomeDM } from './graphql-messaging';
import { sendEmail } from '../email/resend-client';
import { render } from '@react-email/render';
import WelcomeMemberEmail from '../../emails/welcome-member';
import logger from '../logger';


/**
 * Send welcome message with referral link via Whop DM
 */
export async function sendWelcomeMessage(
  member: {
    userId: string;
    username: string;
    referralCode: string;
  },
  creator: {
    companyId: string;
    companyName: string;
    tier1Count: number;
    tier1Reward: string;
    tier2Count: number;
    tier2Reward: string;
    tier3Count: number;
    tier3Reward: string;
    tier4Count: number;
    tier4Reward: string;
    welcomeMessage?: string | null;
  }
): Promise<{ success: boolean; method: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://referral-flywheel-iskpol0bx-blackbridges-projects.vercel.app';
  const referralLink = `${appUrl}/r/${member.referralCode}`;

  // Use custom welcome message if provided, otherwise use default template
  const message = creator.welcomeMessage
    ? creator.welcomeMessage
        .replace(/{memberName}/g, member.username)
        .replace(/{creatorName}/g, creator.companyName)
        .replace(/{referralLink}/g, referralLink)
    : `🎉 Welcome to ${creator.companyName}!

💰 START EARNING REWARDS
You have a unique referral link! Every person you bring in gets tracked, and top referrers earn real rewards.

Your link: ${referralLink}

How it works:
→ Share your link with friends
→ We track every referral in real-time
→ Top performers get rewarded with cash, free months, and exclusive perks
→ The more you refer, the higher you rank, the better your rewards!

🏆 MILESTONE REWARDS
Unlock exclusive rewards as you grow:
- ${creator.tier1Count} referrals: ${creator.tier1Reward}
- ${creator.tier2Count} referrals: ${creator.tier2Reward}
- ${creator.tier3Count} referrals: ${creator.tier3Reward}
- ${creator.tier4Count} referrals: ${creator.tier4Reward}

Ready to start? View your dashboard to see your referral link and track your progress!`;

  try {
    logger.info(`📨 Sending welcome message to ${member.username} (${member.userId})`);

    // PRIMARY: Try GraphQL DM first (correct method)
    const graphqlResult = await sendWelcomeDM(
      member.userId,
      member.username,
      creator.companyName,
      referralLink
    );

    if (graphqlResult.success) {
      logger.info(`✅ Welcome message sent via GraphQL DM to ${member.username}`);
      return { success: true, method: 'graphql_dm' };
    }

    // FALLBACK: Try REST API (legacy, may not work)
    logger.warn(`⚠️ GraphQL DM failed, trying REST API fallback...`);
    const restResult = await sendDirectMessage(
      member.userId,
      message,
      {
        companyId: creator.companyId,
        subject: `Welcome to ${creator.companyName}!`,
      }
    );

    if (restResult.success) {
      logger.info(`✅ Welcome message sent via REST DM to ${member.username}`);
      return { success: true, method: 'rest_dm' };
    }

    // Both failed - log referral code for manual retrieval
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://referral-flywheel.vercel.app';
    logger.warn(`⚠️ All DM methods failed for ${member.username}`);
    logger.info(`📋 REFERRAL CODE: ${member.referralCode}`);
    logger.info(`🔗 REFERRAL LINK: ${appUrl}/r/${member.referralCode}`);
    logger.info(`📱 User can find their code in the dashboard at ${appUrl}/customer/${creator.companyId}`);

    return { success: false, method: 'logged_to_console' };
  } catch (error) {
    logger.error(`❌ Error sending welcome message to ${member.username}:`, error);
    // Log referral code for manual retrieval
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://referral-flywheel.vercel.app';
    logger.info(`📋 REFERRAL CODE: ${member.referralCode}`);
    logger.info(`🔗 REFERRAL LINK: ${appUrl}/r/${member.referralCode}`);
    logger.info(`📱 User can find their code in the dashboard at ${appUrl}/customer/${creator.companyId}`);

    return { success: false, method: 'logged_to_console' };
  }
}

/**
 * Send welcome email (fallback method)
 */
async function sendWelcomeEmail(
  member: {
    userId: string;
    username: string;
    referralCode: string;
    email?: string;
  },
  creator: {
    companyName: string;
    tier1Count: number;
    tier1Reward: string;
    tier2Count: number;
    tier2Reward: string;
    tier3Count: number;
    tier3Reward: string;
    tier4Count: number;
    tier4Reward: string;
  }
): Promise<{ success: boolean; method: string }> {
  if (!member.email) {
    logger.error(`❌ Cannot send email - no email address for ${member.username}`);
    return { success: false, method: 'no_email' };
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://referral-flywheel-iskpol0bx-blackbridges-projects.vercel.app';
    const referralLink = `${appUrl}/r/${member.referralCode}`;

    const emailHtml = await render(
      WelcomeMemberEmail({
        memberName: member.username,
        creatorName: creator.companyName,
        referralLink,
        tier1Count: creator.tier1Count,
        tier1Reward: creator.tier1Reward,
        tier2Count: creator.tier2Count,
        tier2Reward: creator.tier2Reward,
        tier3Count: creator.tier3Count,
        tier3Reward: creator.tier3Reward,
        tier4Count: creator.tier4Count,
        tier4Reward: creator.tier4Reward,
      })
    );

    const result = await sendEmail({
      to: member.email,
      subject: `Welcome to ${creator.companyName}! Start earning rewards`,
      html: emailHtml,
    });

    if (result.success) {
      logger.info(`Welcome email sent to ${member.email}`);
      return { success: true, method: 'email' };
    } else {
      logger.error(`❌ Failed to send welcome email to ${member.email}`);
      return { success: false, method: 'email_failed' };
    }
  } catch (error) {
    logger.error(`❌ Error sending welcome email:`, error);
    return { success: false, method: 'email_error' };
  }
}
