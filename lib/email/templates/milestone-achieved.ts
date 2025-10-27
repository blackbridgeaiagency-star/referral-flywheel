/**
 * Milestone Achieved Email Template
 * Sent when a member reaches a referral milestone (5, 10, 25, 100)
 */

interface MilestoneAchievedData {
  username: string;
  milestoneCount: number;
  reward: string;
  totalEarnings: number;
  nextMilestone?: number;
  nextMilestoneReward?: string;
  dashboardUrl: string;
  referralLink: string;
}

export function generateMilestoneAchievedEmail(data: MilestoneAchievedData): { html: string; text: string; subject: string } {
  const {
    username,
    milestoneCount,
    reward,
    totalEarnings,
    nextMilestone,
    nextMilestoneReward,
    dashboardUrl,
    referralLink
  } = data;

  const getMilestoneEmoji = (count: number) => {
    if (count >= 100) return '🏆';
    if (count >= 25) return '🥇';
    if (count >= 10) return '🥈';
    return '🥉';
  };

  const getMilestoneColor = (count: number) => {
    if (count >= 100) return { primary: '#9333ea', secondary: '#ec4899' };
    if (count >= 25) return { primary: '#eab308', secondary: '#f59e0b' };
    if (count >= 10) return { primary: '#06b6d4', secondary: '#0891b2' };
    return { primary: '#10b981', secondary: '#059669' };
  };

  const colors = getMilestoneColor(milestoneCount);
  const emoji = getMilestoneEmoji(milestoneCount);

  const subject = `${emoji} You Hit ${milestoneCount} Referrals! Claim Your Reward`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f0f0f; color: #ffffff;">

  <!-- Celebration banner -->
  <div style="text-align: center; padding: 20px 0; font-size: 64px; line-height: 1;">
    ${emoji}
  </div>

  <!-- Main container -->
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #1a1a1a; border-radius: 12px; overflow: hidden; border: 2px solid ${colors.primary};">

    <!-- Header with dynamic gradient -->
    <tr>
      <td style="background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%); padding: 50px 30px; text-align: center;">
        <h1 style="margin: 0; font-size: 42px; font-weight: bold; color: #ffffff;">
          MILESTONE UNLOCKED!
        </h1>
        <div style="margin: 20px 0; font-size: 72px; font-weight: bold; color: #ffffff; text-shadow: 0 4px 10px rgba(0,0,0,0.3);">
          ${milestoneCount}
        </div>
        <p style="margin: 0; font-size: 20px; color: #ffffff;">
          Successful Referrals
        </p>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding: 40px 30px;">

        <p style="font-size: 18px; line-height: 1.6; margin: 0 0 20px; color: #ffffff;">
          Congratulations <strong>${username}</strong>! 🎊
        </p>

        <p style="font-size: 16px; line-height: 1.6; margin: 0 0 30px; color: #d1d5db;">
          You've reached an incredible milestone. You're officially a referral superstar!
        </p>

        <!-- Stats grid -->
        <div style="display: table; width: 100%; margin: 30px 0;">
          <div style="display: table-cell; width: 50%; padding-right: 10px;">
            <div style="background-color: #2a2a2a; border-radius: 12px; padding: 20px; text-align: center;">
              <div style="font-size: 14px; color: #9ca3af; margin-bottom: 8px; text-transform: uppercase;">
                Total Referrals
              </div>
              <div style="font-size: 36px; font-weight: bold; color: #ffffff;">
                ${milestoneCount}
              </div>
            </div>
          </div>
          <div style="display: table-cell; width: 50%; padding-left: 10px;">
            <div style="background-color: #2a2a2a; border-radius: 12px; padding: 20px; text-align: center;">
              <div style="font-size: 14px; color: #9ca3af; margin-bottom: 8px; text-transform: uppercase;">
                Total Earned
              </div>
              <div style="font-size: 36px; font-weight: bold; color: #10b981;">
                $${totalEarnings.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        <!-- Reward card -->
        <div style="background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%); border-radius: 16px; padding: 30px; text-align: center; margin: 30px 0; box-shadow: 0 10px 30px rgba(147, 51, 234, 0.3);">
          <div style="font-size: 48px; margin-bottom: 10px;">🎁</div>
          <h3 style="margin: 0 0 15px; font-size: 20px; color: #ffffff;">
            Your Reward
          </h3>
          <div style="font-size: 22px; font-weight: bold; color: #ffffff; padding: 20px; background-color: rgba(0,0,0,0.2); border-radius: 12px;">
            ${reward}
          </div>
        </div>

        <!-- How to claim -->
        <div style="background-color: #2a2a2a; border-radius: 12px; padding: 25px; margin: 30px 0;">
          <h3 style="margin: 0 0 15px; font-size: 18px; color: #ffffff;">
            📋 How to Claim Your Reward
          </h3>
          <ol style="margin: 0; padding-left: 20px; color: #d1d5db; line-height: 1.8; font-size: 15px;">
            <li>Visit your dashboard and click "Claim Reward"</li>
            <li>The creator will be notified of your achievement</li>
            <li>Your reward will be processed within 48 hours</li>
          </ol>
        </div>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 40px 0;">
          <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%); color: #ffffff; text-decoration: none; padding: 18px 40px; border-radius: 10px; font-weight: bold; font-size: 18px; box-shadow: 0 6px 20px rgba(147, 51, 234, 0.4);">
            Claim Your Reward 🎁
          </a>
        </div>

        ${nextMilestone ? `
        <!-- Next milestone -->
        <div style="background: linear-gradient(135deg, #1f2937 0%, #111827 100%); border: 2px solid #374151; border-radius: 12px; padding: 25px; margin: 30px 0;">
          <h3 style="margin: 0 0 15px; font-size: 18px; color: #ffffff;">
            🎯 Next Milestone: ${nextMilestone} Referrals
          </h3>
          <p style="margin: 0 0 15px; color: #d1d5db; font-size: 15px;">
            You're only <strong style="color: #fbbf24;">${nextMilestone - milestoneCount} referrals away</strong> from unlocking:
          </p>
          <div style="background-color: #374151; border-radius: 8px; padding: 15px; text-align: center;">
            <div style="font-size: 18px; font-weight: bold; color: #ffffff;">
              ${nextMilestoneReward}
            </div>
          </div>
          <div style="margin-top: 20px; text-align: center;">
            <p style="margin: 0 0 15px; color: #9ca3af; font-size: 14px;">
              Share your link to keep climbing:
            </p>
            <div style="background-color: #1f2937; border: 2px dashed #9333ea; border-radius: 8px; padding: 12px; word-break: break-all;">
              <a href="${referralLink}" style="color: #a855f7; text-decoration: none; font-weight: 500; font-size: 14px;">
                ${referralLink}
              </a>
            </div>
          </div>
        </div>
        ` : `
        <!-- Elite status -->
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #db2777 100%); border-radius: 12px; padding: 30px; margin: 30px 0; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 10px;">👑</div>
          <h3 style="margin: 0 0 10px; font-size: 24px; color: #ffffff;">
            Elite Referrer Status Unlocked!
          </h3>
          <p style="margin: 0; color: #fef3c7; font-size: 16px;">
            You've reached the highest milestone. Keep sharing to maximize your lifetime earnings!
          </p>
        </div>
        `}

      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #0f0f0f; padding: 30px; text-align: center; border-top: 1px solid #2a2a2a;">
        <p style="margin: 0; font-size: 14px; color: #6b7280;">
          Referral Flywheel • Turning Communities into Growth Engines
        </p>
        <p style="margin: 10px 0 0; font-size: 12px; color: #4b5563;">
          Keep sharing and earning! Reply to this email with any questions.
        </p>
      </td>
    </tr>

  </table>

</body>
</html>
  `;

  const text = `
${emoji} MILESTONE UNLOCKED!

Congratulations ${username}!

YOU HIT ${milestoneCount} SUCCESSFUL REFERRALS!

STATS:
• Total Referrals: ${milestoneCount}
• Total Earned: $${totalEarnings.toFixed(2)}

YOUR REWARD: ${reward}

HOW TO CLAIM:
1. Visit your dashboard and click "Claim Reward"
2. The creator will be notified of your achievement
3. Your reward will be processed within 48 hours

👉 Claim now: ${dashboardUrl}

${nextMilestone ? `
NEXT MILESTONE: ${nextMilestone} Referrals
You're only ${nextMilestone - milestoneCount} referrals away from: ${nextMilestoneReward}

Share your link: ${referralLink}
` : `
👑 ELITE REFERRER STATUS UNLOCKED!
You've reached the highest milestone. Keep sharing to maximize your lifetime earnings!
`}

---
Referral Flywheel • Turning Communities into Growth Engines
  `.trim();

  return { html, text, subject };
}
