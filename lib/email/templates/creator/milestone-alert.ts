/**
 * Milestone Alert Email Template (for Creators)
 * Notifies creator when community hits a referral milestone
 */

interface MilestoneAlertData {
  creatorName: string;
  milestoneCount: number;
  totalReferrals: number;
  totalRevenue: number;
  dashboardUrl: string;
}

export function generateMilestoneAlertEmail(data: MilestoneAlertData): { html: string; text: string; subject: string } {
  const { creatorName, milestoneCount, totalReferrals, totalRevenue, dashboardUrl } = data;

  const subject = `🎉 Your community hit ${milestoneCount} total referrals!`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #0f0f0f; color: #fff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 20px auto; background-color: #1a1a1a; border-radius: 12px;">
    <tr>
      <td style="background: linear-gradient(135deg, #eab308 0%, #f59e0b 100%); padding: 40px 30px; text-align: center;">
        <div style="font-size: 64px;">🎉</div>
        <h1 style="margin: 0; font-size: 32px; color: #fff;">Community Milestone!</h1>
        <p style="margin: 10px 0 0; font-size: 48px; font-weight: bold; color: #fff;">${milestoneCount}</p>
        <p style="margin: 5px 0 0; color: #fef3c7;">Total Referrals</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px;">
        <p style="font-size: 18px; color: #fff;">Congratulations <strong>${creatorName}</strong>!</p>
        <p style="font-size: 16px; color: #d1d5db;">Your community has generated <strong>${totalReferrals} referrals</strong> and <strong>$${totalRevenue.toFixed(2)}</strong> in revenue through the referral program.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #eab308 0%, #f59e0b 100%); color: #000; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold;">View Analytics →</a>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `
🎉 COMMUNITY MILESTONE!

${milestoneCount} Total Referrals

Congratulations ${creatorName}!

Your community has generated ${totalReferrals} referrals and $${totalRevenue.toFixed(2)} in revenue.

View analytics: ${dashboardUrl}
  `.trim();

  return { html, text, subject };
}
