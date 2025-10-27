/**
 * Weekly Digest Email Template (for Creators)
 * Sent every Monday at 9 AM with weekly performance summary
 */

interface WeeklyDigestData {
  creatorName: string;
  weekStartDate: string;
  weekEndDate: string;
  newReferrals: number;
  totalRevenue: number;
  topPerformer?: { name: string; referrals: number };
  totalMembers: number;
  dashboardUrl: string;
}

export function generateWeeklyDigestEmail(data: WeeklyDigestData): { html: string; text: string; subject: string } {
  const {
    creatorName,
    weekStartDate,
    weekEndDate,
    newReferrals,
    totalRevenue,
    topPerformer,
    totalMembers,
    dashboardUrl
  } = data;

  const subject = `📊 Weekly Digest: +${newReferrals} new referrals`;

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
      <td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 40px 30px; text-align: center;">
        <h1 style="margin: 0; font-size: 32px; color: #ffffff;">📊 Weekly Report</h1>
        <p style="margin: 10px 0 0; font-size: 14px; color: #d1fae5;">${weekStartDate} - ${weekEndDate}</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px;">
        <p style="font-size: 18px; color: #ffffff;">Hey <strong>${creatorName}</strong>,</p>
        <div style="display: table; width: 100%; margin: 30px 0;">
          <div style="display: table-cell; width: 50%; padding-right: 8px;">
            <div style="background-color: #2a2a2a; border-radius: 12px; padding: 20px; text-align: center;">
              <div style="font-size: 12px; color: #9ca3af; margin-bottom: 8px;">NEW REFERRALS</div>
              <div style="font-size: 36px; font-weight: bold; color: #10b981;">+${newReferrals}</div>
            </div>
          </div>
          <div style="display: table-cell; width: 50%; padding-left: 8px;">
            <div style="background-color: #2a2a2a; border-radius: 12px; padding: 20px; text-align: center;">
              <div style="font-size: 12px; color: #9ca3af; margin-bottom: 8px;">TOTAL REVENUE</div>
              <div style="font-size: 36px; font-weight: bold; color: #fbbf24;">$${totalRevenue.toFixed(0)}</div>
            </div>
          </div>
        </div>
        ${topPerformer ? `
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #db2777 100%); border-radius: 12px; padding: 20px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px; color: #ffffff;">⭐ Top Performer</h3>
          <p style="margin: 0; color: #ffffff;"><strong>${topPerformer.name}</strong>: ${topPerformer.referrals} referrals this week</p>
        </div>
        ` : ''}
        <div style="text-align: center; margin: 30px 0;">
          <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold;">
            View Full Dashboard →
          </a>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `
📊 WEEKLY DIGEST (${weekStartDate} - ${weekEndDate})

Hey ${creatorName},

NEW REFERRALS: +${newReferrals}
TOTAL REVENUE: $${totalRevenue.toFixed(2)}
TOTAL MEMBERS: ${totalMembers}

${topPerformer ? `⭐ TOP PERFORMER: ${topPerformer.name} (${topPerformer.referrals} referrals)` : ''}

View dashboard: ${dashboardUrl}
  `.trim();

  return { html, text, subject };
}
