/**
 * App Installed Email Template (for Creators)
 * Sent when the Referral Flywheel app is installed
 */

interface AppInstalledData {
  creatorName: string;
  membersImported: number;
  dashboardUrl: string;
  setupUrl: string;
}

export function generateAppInstalledEmail(data: AppInstalledData): { html: string; text: string; subject: string } {
  const { creatorName, membersImported, dashboardUrl, setupUrl } = data;

  const subject = '🚀 Referral Flywheel is Ready to Launch!';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f0f0f; color: #ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 20px auto; background-color: #1a1a1a; border-radius: 12px;">
    <tr>
      <td style="background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%); padding: 40px 30px; text-align: center;">
        <div style="font-size: 64px; margin-bottom: 10px;">🚀</div>
        <h1 style="margin: 0; font-size: 32px; color: #ffffff;">Welcome to Referral Flywheel!</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px;">
        <p style="font-size: 18px; color: #ffffff;">Hey <strong>${creatorName}</strong>,</p>
        <p style="font-size: 16px; color: #d1d5db; line-height: 1.6;">
          Congratulations! Your referral program is live. We've automatically imported <strong style="color: #10b981;">${membersImported} members</strong> and assigned them unique referral links.
        </p>
        <div style="background-color: #2a2a2a; border-radius: 12px; padding: 25px; margin: 30px 0;">
          <h3 style="margin: 0 0 15px; color: #ffffff;">✅ What's Activated:</h3>
          <ul style="margin: 0; padding-left: 20px; color: #d1d5db; line-height: 1.8;">
            <li>10% lifetime commission tracking</li>
            <li>Automatic referral code generation</li>
            <li>Real-time analytics dashboard</li>
            <li>Member reward milestones</li>
          </ul>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${setupUrl || dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">
            Complete Setup →
          </a>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `
🚀 WELCOME TO REFERRAL FLYWHEEL!

Hey ${creatorName},

Congratulations! Your referral program is live.

We've automatically imported ${membersImported} members and assigned them unique referral links.

WHAT'S ACTIVATED:
• 10% lifetime commission tracking
• Automatic referral code generation
• Real-time analytics dashboard
• Member reward milestones

Complete setup: ${setupUrl || dashboardUrl}
  `.trim();

  return { html, text, subject };
}
