/**
 * First Referral Success Email Template
 * Sent when a member gets their first successful referral
 */

interface FirstReferralSuccessData {
  username: string;
  referredMemberName: string;
  earnedAmount: number;
  referralLink: string;
  dashboardUrl: string;
}

export function generateFirstReferralSuccessEmail(data: FirstReferralSuccessData): { html: string; text: string; subject: string } {
  const { username, referredMemberName, earnedAmount, referralLink, dashboardUrl } = data;

  const subject = `🎉 Congrats! ${referredMemberName} just joined using your link!`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f0f0f; color: #ffffff;">

  <!-- Confetti decoration -->
  <div style="text-align: center; padding: 20px 0; font-size: 48px;">
    🎊 🎉 ✨
  </div>

  <!-- Main container -->
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #1a1a1a; border-radius: 12px; overflow: hidden;">

    <!-- Header with gradient -->
    <tr>
      <td style="background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%); padding: 40px 30px; text-align: center;">
        <h1 style="margin: 0; font-size: 32px; font-weight: bold; color: #ffffff;">
          🎉 First Referral Success!
        </h1>
        <p style="margin: 10px 0 0; font-size: 18px; color: #fef3c7;">
          You just earned your first commission!
        </p>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding: 40px 30px;">
        <p style="font-size: 18px; line-height: 1.6; margin: 0 0 20px; color: #ffffff;">
          Hey <strong>${username}</strong>,
        </p>

        <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px; color: #d1d5db;">
          Awesome news! <strong>${referredMemberName}</strong> just joined using your referral link, and you've earned your first commission:
        </p>

        <!-- Earnings card -->
        <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0;">
          <div style="font-size: 14px; color: #d1fae5; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">
            You Earned
          </div>
          <div style="font-size: 48px; font-weight: bold; color: #ffffff; margin: 0;">
            $${earnedAmount.toFixed(2)}
          </div>
          <div style="font-size: 14px; color: #d1fae5; margin-top: 8px;">
            And you'll keep earning from them every month!
          </div>
        </div>

        <!-- What happens next -->
        <div style="background-color: #2a2a2a; border-left: 4px solid #9333ea; border-radius: 8px; padding: 20px; margin: 30px 0;">
          <h3 style="margin: 0 0 15px; font-size: 18px; color: #ffffff;">
            💡 What Happens Next?
          </h3>
          <ul style="margin: 0; padding-left: 20px; color: #d1d5db; line-height: 1.8;">
            <li><strong>Lifetime Commissions:</strong> You'll earn 10% every time ${referredMemberName} pays</li>
            <li><strong>Automatic Tracking:</strong> All future payments are tracked automatically</li>
            <li><strong>Monthly Payouts:</strong> Commissions are paid out at the end of each month</li>
          </ul>
        </div>

        <!-- CTA: Share more -->
        <div style="text-align: center; margin: 40px 0;">
          <p style="font-size: 18px; color: #ffffff; margin: 0 0 20px;">
            <strong>Keep the momentum going! 🚀</strong>
          </p>
          <p style="font-size: 14px; color: #9ca3af; margin: 0 0 20px;">
            Share your link with 2 more friends to multiply your earnings:
          </p>

          <!-- Link box -->
          <div style="background-color: #2a2a2a; border: 2px dashed #9333ea; border-radius: 8px; padding: 15px; margin: 20px 0; word-break: break-all;">
            <a href="${referralLink}" style="color: #a855f7; text-decoration: none; font-weight: 500;">
              ${referralLink}
            </a>
          </div>

          <!-- Button -->
          <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; font-size: 16px; margin-top: 10px;">
            View Dashboard →
          </a>
        </div>

        <!-- Pro tips -->
        <div style="background-color: #1f2937; border-radius: 8px; padding: 20px; margin: 30px 0;">
          <h3 style="margin: 0 0 15px; font-size: 16px; color: #fbbf24;">
            ⭐ Pro Tips for More Referrals:
          </h3>
          <ul style="margin: 0; padding-left: 20px; color: #d1d5db; font-size: 14px; line-height: 1.8;">
            <li>Share in relevant communities and forums</li>
            <li>Add to your social media bio</li>
            <li>Send personalized messages to interested friends</li>
            <li>Post success stories and testimonials</li>
          </ul>
        </div>

      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #0f0f0f; padding: 30px; text-align: center; border-top: 1px solid #2a2a2a;">
        <p style="margin: 0; font-size: 14px; color: #6b7280;">
          Referral Flywheel • Turning Communities into Growth Engines
        </p>
        <p style="margin: 10px 0 0; font-size: 12px; color: #4b5563;">
          Questions? Reply to this email or visit your dashboard.
        </p>
      </td>
    </tr>

  </table>

</body>
</html>
  `;

  const text = `
🎉 FIRST REFERRAL SUCCESS!

Hey ${username},

Awesome news! ${referredMemberName} just joined using your referral link.

YOU EARNED: $${earnedAmount.toFixed(2)}

And you'll keep earning from them every month with 10% lifetime commissions!

WHAT HAPPENS NEXT:
• Lifetime Commissions: You'll earn 10% every time ${referredMemberName} pays
• Automatic Tracking: All future payments are tracked automatically
• Monthly Payouts: Commissions are paid out at the end of each month

KEEP THE MOMENTUM GOING! 🚀

Share your link with 2 more friends to multiply your earnings:
${referralLink}

View your dashboard: ${dashboardUrl}

PRO TIPS FOR MORE REFERRALS:
• Share in relevant communities and forums
• Add to your social media bio
• Send personalized messages to interested friends
• Post success stories and testimonials

---
Referral Flywheel • Turning Communities into Growth Engines
  `.trim();

  return { html, text, subject };
}
