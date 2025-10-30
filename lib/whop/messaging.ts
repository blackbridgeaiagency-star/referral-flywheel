// lib/whop/messaging.ts
import { sendDirectMessage } from './api-client';
import { sendEmail } from '../email/resend-client';
import { render } from '@react-email/render';
import WelcomeMemberEmail from '../../emails/welcome-member';

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

💰 EARN MONEY BY SHARING
You have a unique referral link that pays you 10% LIFETIME commission on every person you refer.

Your link: ${referralLink}

How it works:
→ Share your link with friends
→ They join and pay monthly
→ You earn 10% of their payment EVERY month they stay
→ Refer 100 people = $499/month passive income

🏆 LEADERBOARD REWARDS
Compete with other members and unlock exclusive rewards:
- ${creator.tier1Count} referrals: ${creator.tier1Reward}
- ${creator.tier2Count} referrals: ${creator.tier2Reward}
- ${creator.tier3Count} referrals: ${creator.tier3Reward}
- ${creator.tier4Count} referrals: ${creator.tier4Reward}

Ready to start earning? View your dashboard to get started!`;

  try {
    console.log(`📧 Sending welcome message to ${member.username} (${member.userId})`);

    // Attempt to send via Whop DM
    const result = await sendDirectMessage(
      member.userId,
      message,
      {
        companyId: creator.companyId,
        subject: `Welcome to ${creator.companyName}!`,
      }
    );

    if (result.success) {
      console.log(`✅ Welcome message sent via Whop DM to ${member.username}`);
      return { success: true, method: 'whop_dm' };
    } else {
      // DM failed - log referral code for manual retrieval
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://referral-flywheel.vercel.app';
      console.log(`⚠️ Whop DM failed for ${member.username}`);
      console.log(`📋 REFERRAL CODE: ${member.referralCode}`);
      console.log(`🔗 REFERRAL LINK: ${appUrl}/r/${member.referralCode}`);
      console.log(`💡 User can find their code in the dashboard at ${appUrl}/customer/${creator.companyId}`);

      // Don't try email fallback for now (domain not verified)
      // return await sendWelcomeEmail(member, creator);
      return { success: false, method: 'logged_to_console' };
    }
  } catch (error) {
    console.error(`❌ Error sending welcome message to ${member.username}:`, error);
    // Log referral code for manual retrieval
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://referral-flywheel.vercel.app';
    console.log(`📋 REFERRAL CODE: ${member.referralCode}`);
    console.log(`🔗 REFERRAL LINK: ${appUrl}/r/${member.referralCode}`);
    console.log(`💡 User can find their code in the dashboard at ${appUrl}/customer/${creator.companyId}`);

    // Don't try email fallback for now (domain not verified)
    // return await sendWelcomeEmail(member, creator);
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
    console.error(`❌ Cannot send email - no email address for ${member.username}`);
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
      subject: `Welcome to ${creator.companyName}! Start earning 10% commissions`,
      html: emailHtml,
    });

    if (result.success) {
      console.log(`✅ Welcome email sent to ${member.email}`);
      return { success: true, method: 'email' };
    } else {
      console.error(`❌ Failed to send welcome email to ${member.email}`);
      return { success: false, method: 'email_failed' };
    }
  } catch (error) {
    console.error(`❌ Error sending welcome email:`, error);
    return { success: false, method: 'email_error' };
  }
}
