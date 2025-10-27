/**
 * Reward Claim Notification (for Creators)
 * Sent when a member claims a milestone reward
 */

interface RewardClaimData {
  creatorName: string;
  memberName: string;
  memberEmail: string;
  milestone: number;
  reward: string;
  approvalUrl: string;
}

export function generateRewardClaimEmail(data: RewardClaimData): { html: string; text: string; subject: string } {
  const { creatorName, memberName, memberEmail, milestone, reward, approvalUrl } = data;

  const subject = `🎁 ${memberName} claimed their ${milestone}-referral reward`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #0f0f0f; color: #fff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 20px auto; background-color: #1a1a1a; border-radius: 12px;">
    <tr>
      <td style="background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%); padding: 40px 30px; text-align: center;">
        <div style="font-size: 64px;">🎁</div>
        <h1 style="margin: 0; font-size: 28px; color: #fff;">Reward Claim Request</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px;">
        <p style="font-size: 18px; color: #fff;">Hey <strong>${creatorName}</strong>,</p>
        <p style="font-size: 16px; color: #d1d5db;"><strong>${memberName}</strong> has reached <strong>${milestone} referrals</strong> and is claiming their reward!</p>
        <div style="background-color: #2a2a2a; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <p style="margin: 0 0 10px; font-size: 14px; color: #9ca3af;">MEMBER INFO</p>
          <p style="margin: 0; color: #fff;"><strong>Name:</strong> ${memberName}</p>
          <p style="margin: 5px 0 0; color: #fff;"><strong>Email:</strong> ${memberEmail}</p>
          <p style="margin: 5px 0 0; color: #fff;"><strong>Milestone:</strong> ${milestone} referrals</p>
          <p style="margin: 15px 0 0; font-size: 16px; color: #10b981;"><strong>Reward:</strong> ${reward}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${approvalUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold;">Review Claim →</a>
        </div>
        <p style="font-size: 14px; color: #9ca3af; text-align: center;">Please process this reward within 48 hours to maintain member satisfaction.</p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `
🎁 REWARD CLAIM REQUEST

Hey ${creatorName},

${memberName} has reached ${milestone} referrals and is claiming their reward!

MEMBER INFO:
Name: ${memberName}
Email: ${memberEmail}
Milestone: ${milestone} referrals
Reward: ${reward}

Review and approve: ${approvalUrl}

Please process within 48 hours.
  `.trim();

  return { html, text, subject };
}
