// lib/whop/messaging.ts
// TEMPORARILY DISABLED: Whop SDK import issue - 'WhopAPI' is not exported
// import { WhopAPI } from '@whop/sdk';
// const whop = new WhopAPI(process.env.WHOP_API_KEY!);

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
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.example.com';
  const referralLink = `${appUrl}/r/${member.referralCode}`;
  
  const message = `🎉 Welcome to ${creator.companyName}!

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

  // TEMPORARILY DISABLED: Whop SDK not available
  // Just log the message for now
  console.log(`📧 Welcome message for ${member.username}:`);
  console.log(message);
  console.log(`✅ Welcome message logged (Whop SDK disabled)`);

  // TODO: Re-enable when Whop SDK is fixed
  // try {
  //   await whop.messages.send({
  //     user_id: member.userId,
  //     content: message,
  //   });
  //   console.log(`✅ Welcome message sent to ${member.username}`);
  // } catch (error) {
  //   console.error('❌ Failed to send welcome message:', error);
  // }
}
