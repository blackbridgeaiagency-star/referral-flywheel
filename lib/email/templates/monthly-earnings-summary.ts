/**
 * Monthly Earnings Summary Email Template
 * Sent on the 1st of each month to show previous month's performance
 */

interface MonthlyEarningsSummaryData {
  username: string;
  month: string;
  year: number;
  monthlyEarnings: number;
  lifetimeEarnings: number;
  totalReferrals: number;
  newReferralsThisMonth: number;
  nextPayoutDate: string;
  topReferral?: {
    name: string;
    contribution: number;
  };
  dashboardUrl: string;
  referralLink: string;
}

export function generateMonthlyEarningsSummaryEmail(data: MonthlyEarningsSummaryData): { html: string; text: string; subject: string } {
  const {
    username,
    month,
    year,
    monthlyEarnings,
    lifetimeEarnings,
    totalReferrals,
    newReferralsThisMonth,
    nextPayoutDate,
    topReferral,
    dashboardUrl,
    referralLink
  } = data;

  const subject = `💰 Your ${month} Earnings Summary: $${monthlyEarnings.toFixed(2)}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f0f0f; color: #ffffff;">

  <!-- Main container -->
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 20px auto; background-color: #1a1a1a; border-radius: 12px; overflow: hidden;">

    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 40px 30px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 10px;">💰</div>
        <h1 style="margin: 0; font-size: 32px; font-weight: bold; color: #ffffff;">
          ${month} Earnings Summary
        </h1>
        <p style="margin: 10px 0 0; font-size: 16px; color: #d1fae5;">
          Here's how you did this month!
        </p>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding: 40px 30px;">

        <p style="font-size: 18px; line-height: 1.6; margin: 0 0 30px; color: #ffffff;">
          Hey <strong>${username}</strong>,
        </p>

        <!-- Main earnings card -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px; padding: 40px; text-align: center; margin: 30px 0; box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);">
          <div style="font-size: 14px; color: #d1fae5; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;">
            ${month} ${year} Earnings
          </div>
          <div style="font-size: 64px; font-weight: bold; color: #ffffff; margin: 10px 0; text-shadow: 0 4px 10px rgba(0,0,0,0.3);">
            $${monthlyEarnings.toFixed(2)}
          </div>
          <div style="font-size: 14px; color: #d1fae5; margin-top: 10px;">
            ${monthlyEarnings > 0 ? `Payout scheduled for ${nextPayoutDate}` : 'No earnings this month'}
          </div>
        </div>

        <!-- Stats grid -->
        <div style="margin: 30px 0;">
          <h3 style="margin: 0 0 20px; font-size: 18px; color: #ffffff;">
            📊 Performance Breakdown
          </h3>

          <!-- Row 1 -->
          <div style="display: table; width: 100%; margin-bottom: 15px;">
            <div style="display: table-cell; width: 50%; padding-right: 8px;">
              <div style="background-color: #2a2a2a; border-radius: 12px; padding: 20px; text-align: center;">
                <div style="font-size: 12px; color: #9ca3af; margin-bottom: 8px; text-transform: uppercase;">
                  Total Referrals
                </div>
                <div style="font-size: 32px; font-weight: bold; color: #ffffff;">
                  ${totalReferrals}
                </div>
              </div>
            </div>
            <div style="display: table-cell; width: 50%; padding-left: 8px;">
              <div style="background-color: #2a2a2a; border-radius: 12px; padding: 20px; text-align: center;">
                <div style="font-size: 12px; color: #9ca3af; margin-bottom: 8px; text-transform: uppercase;">
                  New This Month
                </div>
                <div style="font-size: 32px; font-weight: bold; color: ${newReferralsThisMonth > 0 ? '#10b981' : '#ffffff'};">
                  ${newReferralsThisMonth > 0 ? `+${newReferralsThisMonth}` : '0'}
                </div>
              </div>
            </div>
          </div>

          <!-- Row 2 -->
          <div style="display: table; width: 100%;">
            <div style="display: table-cell; width: 50%; padding-right: 8px;">
              <div style="background-color: #2a2a2a; border-radius: 12px; padding: 20px; text-align: center;">
                <div style="font-size: 12px; color: #9ca3af; margin-bottom: 8px; text-transform: uppercase;">
                  Lifetime Earnings
                </div>
                <div style="font-size: 28px; font-weight: bold; color: #fbbf24;">
                  $${lifetimeEarnings.toFixed(2)}
                </div>
              </div>
            </div>
            <div style="display: table-cell; width: 50%; padding-left: 8px;">
              <div style="background-color: #2a2a2a; border-radius: 12px; padding: 20px; text-align: center;">
                <div style="font-size: 12px; color: #9ca3af; margin-bottom: 8px; text-transform: uppercase;">
                  Avg Per Referral
                </div>
                <div style="font-size: 28px; font-weight: bold; color: #a855f7;">
                  $${totalReferrals > 0 ? (lifetimeEarnings / totalReferrals).toFixed(2) : '0.00'}
                </div>
              </div>
            </div>
          </div>
        </div>

        ${topReferral ? `
        <!-- Top performer -->
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #db2777 100%); border-radius: 12px; padding: 25px; margin: 30px 0;">
          <h3 style="margin: 0 0 15px; font-size: 18px; color: #ffffff;">
            ⭐ Top Earner This Month
          </h3>
          <div style="display: table; width: 100%;">
            <div style="display: table-cell; vertical-align: middle;">
              <div style="font-size: 20px; font-weight: bold; color: #ffffff;">
                ${topReferral.name}
              </div>
              <div style="font-size: 14px; color: #fae8ff; margin-top: 5px;">
                Generated $${topReferral.contribution.toFixed(2)} in commissions
              </div>
            </div>
            <div style="display: table-cell; width: 60px; text-align: right; vertical-align: middle;">
              <div style="font-size: 40px;">🏆</div>
            </div>
          </div>
        </div>
        ` : ''}

        ${monthlyEarnings === 0 ? `
        <!-- No earnings CTA -->
        <div style="background-color: #1f2937; border: 2px solid #374151; border-radius: 12px; padding: 30px; margin: 30px 0; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 15px;">📈</div>
          <h3 style="margin: 0 0 15px; font-size: 20px; color: #ffffff;">
            Let's Get Those Numbers Up!
          </h3>
          <p style="margin: 0 0 20px; color: #d1d5db; font-size: 15px; line-height: 1.6;">
            You haven't made any referrals this month yet. Share your link with just 3 people this week to start earning!
          </p>
          <div style="background-color: #111827; border: 2px dashed #9333ea; border-radius: 8px; padding: 15px; word-break: break-all; margin: 20px 0;">
            <a href="${referralLink}" style="color: #a855f7; text-decoration: none; font-weight: 500;">
              ${referralLink}
            </a>
          </div>
          <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; font-size: 15px; margin-top: 10px;">
            View Dashboard →
          </a>
        </div>
        ` : `
        <!-- Growth tips -->
        <div style="background-color: #2a2a2a; border-left: 4px solid #10b981; border-radius: 8px; padding: 25px; margin: 30px 0;">
          <h3 style="margin: 0 0 15px; font-size: 18px; color: #ffffff;">
            💡 Grow Your Earnings Next Month
          </h3>
          <ul style="margin: 0; padding-left: 20px; color: #d1d5db; line-height: 1.8; font-size: 15px;">
            <li><strong>Set a goal:</strong> Aim for ${Math.ceil(totalReferrals * 1.5)} referrals next month</li>
            <li><strong>Share consistently:</strong> Post your link 3x per week</li>
            <li><strong>Personalize your pitch:</strong> Explain the value you've received</li>
            <li><strong>Engage your network:</strong> Follow up with interested contacts</li>
          </ul>
        </div>

        <!-- CTA -->
        <div style="text-align: center; margin: 40px 0;">
          <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 10px; font-weight: bold; font-size: 16px; box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);">
            View Full Dashboard →
          </a>
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
          Questions about your earnings? Reply to this email.
        </p>
      </td>
    </tr>

  </table>

</body>
</html>
  `;

  const text = `
💰 YOUR ${month.toUpperCase()} EARNINGS SUMMARY

Hey ${username},

${month} ${year} EARNINGS: $${monthlyEarnings.toFixed(2)}
${monthlyEarnings > 0 ? `Payout scheduled for ${nextPayoutDate}` : 'No earnings this month'}

PERFORMANCE BREAKDOWN:
• Total Referrals: ${totalReferrals}
• New This Month: ${newReferralsThisMonth > 0 ? `+${newReferralsThisMonth}` : '0'}
• Lifetime Earnings: $${lifetimeEarnings.toFixed(2)}
• Average Per Referral: $${totalReferrals > 0 ? (lifetimeEarnings / totalReferrals).toFixed(2) : '0.00'}

${topReferral ? `
⭐ TOP EARNER THIS MONTH:
${topReferral.name} generated $${topReferral.contribution.toFixed(2)} in commissions
` : ''}

${monthlyEarnings === 0 ? `
LET'S GET THOSE NUMBERS UP! 📈
Share your link with 3 people this week to start earning:
${referralLink}
` : `
💡 GROW YOUR EARNINGS NEXT MONTH:
• Set a goal: Aim for ${Math.ceil(totalReferrals * 1.5)} referrals
• Share consistently: Post your link 3x per week
• Personalize your pitch: Explain the value you've received
• Engage your network: Follow up with interested contacts
`}

View full dashboard: ${dashboardUrl}

---
Referral Flywheel • Turning Communities into Growth Engines
  `.trim();

  return { html, text, subject };
}
