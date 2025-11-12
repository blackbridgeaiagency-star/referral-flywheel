/**
 * Invoice Email Templates
 *
 * Value-focused email templates for invoice notifications
 */

import { format } from 'date-fns';

interface Invoice {
  id: string;
  totalAmount: number;
  salesCount: number;
  referredSalesTotal: number;
  creatorGainFromReferrals: number;
  netBenefit: number;
  roiOnPlatformFee: number;
  stripeInvoiceUrl: string | null;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date | null;
}

interface Creator {
  id: string;
  companyName: string;
}

/**
 * Invoice Created Email
 * Sent when monthly invoice is generated
 * Focus: VALUE PROPOSITION (what they gained)
 */
export function invoiceCreatedEmail(creator: Creator, invoice: Invoice) {
  const monthName = format(invoice.periodStart, 'MMMM yyyy');

  return {
    to: creator.email || `creator-${creator.id}@example.com`, // Replace with actual email field
    subject: `🎉 ${monthName} Partnership Invoice - You gained $${invoice.netBenefit.toLocaleString()}!`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Partnership Invoice</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

  <!-- Header -->
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
    <h1 style="margin: 0; font-size: 28px;">🎉 Great Month, ${creator.companyName}!</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your referral program is working</p>
  </div>

  <!-- Value Proposition -->
  <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 20px; margin-bottom: 25px; border-radius: 8px;">
    <h2 style="margin: 0 0 15px 0; color: #16a34a; font-size: 20px;">💰 Your ${monthName} Results</h2>

    <div style="background: white; padding: 15px; border-radius: 6px; margin-bottom: 10px;">
      <div style="font-size: 14px; color: #666; margin-bottom: 5px;">Extra Revenue Generated</div>
      <div style="font-size: 32px; font-weight: bold; color: #16a34a;">+$${invoice.creatorGainFromReferrals.toLocaleString()}</div>
      <div style="font-size: 13px; color: #666; margin-top: 5px;">Revenue that wouldn't exist without referrals</div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px;">
      <div style="background: white; padding: 12px; border-radius: 6px; text-align: center;">
        <div style="font-size: 12px; color: #666;">Platform Fee</div>
        <div style="font-size: 20px; font-weight: bold; color: #334155;">$${invoice.totalAmount.toLocaleString()}</div>
      </div>
      <div style="background: white; padding: 12px; border-radius: 6px; text-align: center;">
        <div style="font-size: 12px; color: #666;">Net Benefit</div>
        <div style="font-size: 20px; font-weight: bold; color: #16a34a;">$${invoice.netBenefit.toLocaleString()}</div>
      </div>
    </div>

    <div style="text-align: center; margin-top: 15px; padding-top: 15px; border-top: 1px solid #dcfce7;">
      <div style="font-size: 14px; color: #666;">Your ROI on Our Fee</div>
      <div style="font-size: 28px; font-weight: bold; color: #16a34a;">${invoice.roiOnPlatformFee.toFixed(1)}x</div>
      <div style="font-size: 12px; color: #666; margin-top: 3px;">You made ${invoice.roiOnPlatformFee.toFixed(1)}x what you paid us</div>
    </div>
  </div>

  <!-- Invoice Details -->
  <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
    <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #334155;">Invoice Details</h3>

    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; color: #666;">Period:</td>
        <td style="padding: 8px 0; text-align: right; font-weight: 500;">${monthName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #666;">Referred Sales:</td>
        <td style="padding: 8px 0; text-align: right; font-weight: 500;">${invoice.salesCount} sales</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #666;">Total Referred Revenue:</td>
        <td style="padding: 8px 0; text-align: right; font-weight: 500;">$${invoice.referredSalesTotal.toLocaleString()}</td>
      </tr>
      <tr style="border-top: 2px solid #e2e8f0;">
        <td style="padding: 8px 0; font-weight: bold; color: #334155;">Amount Due:</td>
        <td style="padding: 8px 0; text-align: right; font-size: 18px; font-weight: bold; color: #334155;">$${invoice.totalAmount.toLocaleString()}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #666;">Due Date:</td>
        <td style="padding: 8px 0; text-align: right; font-weight: 500;">${invoice.dueDate ? format(invoice.dueDate, 'MMM d, yyyy') : 'Upon receipt'}</td>
      </tr>
    </table>
  </div>

  ${
    invoice.stripeInvoiceUrl
      ? `
  <!-- CTA Button -->
  <div style="text-align: center; margin: 30px 0;">
    <a href="${invoice.stripeInvoiceUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">View & Pay Invoice</a>
  </div>
  `
      : ''
  }

  <!-- Partnership Message -->
  <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin-top: 25px;">
    <p style="margin: 0; color: #1e40af; font-size: 14px; text-align: center;">
      🤝 <strong>Pure Partnership Model</strong><br>
      We only make money when we generate NEW revenue for you.<br>
      Your success is our success.
    </p>
  </div>

  <!-- Footer -->
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px;">
    <p style="margin: 5px 0;">Questions? Reply to this email or contact support.</p>
    <p style="margin: 5px 0;">Referral Flywheel • Built for Whop Communities</p>
  </div>

</body>
</html>
    `,
  };
}

/**
 * Invoice Paid Email
 * Sent when payment is received
 * Focus: THANK YOU + ENCOURAGEMENT
 */
export function invoicePaidEmail(creator: Creator, invoice: Invoice) {
  const monthName = format(invoice.periodStart, 'MMMM yyyy');

  return {
    to: creator.email || `creator-${creator.id}@example.com`,
    subject: `✅ Payment Received - Thank you, ${creator.companyName}!`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Received</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

  <!-- Header -->
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
    <div style="font-size: 60px; margin-bottom: 15px;">✅</div>
    <h1 style="margin: 0; font-size: 28px;">Payment Received!</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Thank you, ${creator.companyName}</p>
  </div>

  <!-- Payment Confirmation -->
  <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 20px; margin-bottom: 25px; border-radius: 8px;">
    <h2 style="margin: 0 0 15px 0; color: #16a34a; font-size: 18px;">Payment Confirmed</h2>
    <p style="margin: 0; color: #334155;">Your payment of <strong>$${invoice.totalAmount.toLocaleString()}</strong> for ${monthName} has been successfully processed.</p>
  </div>

  <!-- Monthly Recap -->
  <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
    <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #334155;">Your ${monthName} Impact</h3>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
      <div style="background: white; padding: 15px; border-radius: 6px; text-align: center;">
        <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Referred Sales</div>
        <div style="font-size: 24px; font-weight: bold; color: #334155;">${invoice.salesCount}</div>
      </div>
      <div style="background: white; padding: 15px; border-radius: 6px; text-align: center;">
        <div style="font-size: 12px; color: #666; margin-bottom: 5px;">You Gained</div>
        <div style="font-size: 24px; font-weight: bold; color: #16a34a;">$${invoice.netBenefit.toLocaleString()}</div>
      </div>
    </div>

    <div style="text-align: center; margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
      <div style="font-size: 14px; color: #666;">Your ${invoice.roiOnPlatformFee.toFixed(1)}x ROI continues next month! 🚀</div>
    </div>
  </div>

  <!-- Encouragement -->
  <div style="background: #eff6ff; padding: 20px; border-radius: 8px; text-align: center;">
    <p style="margin: 0 0 15px 0; color: #1e40af; font-size: 16px; font-weight: 600;">Keep the momentum going!</p>
    <p style="margin: 0; color: #334155; font-size: 14px;">Your referral program is working. Your members are bringing in new revenue every month.</p>
  </div>

  <!-- Footer -->
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px;">
    <p style="margin: 5px 0;">Questions? Reply to this email or contact support.</p>
    <p style="margin: 5px 0;">Referral Flywheel • Built for Whop Communities</p>
  </div>

</body>
</html>
    `,
  };
}

/**
 * Payment Failed Email
 * Sent when payment fails
 * Focus: HELPFUL (not aggressive)
 */
export function paymentFailedEmail(creator: Creator, invoice: Invoice) {
  const monthName = format(invoice.periodStart, 'MMMM yyyy');

  return {
    to: creator.email || `creator-${creator.id}@example.com`,
    subject: `Payment Issue - ${monthName} Invoice for ${creator.companyName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Issue</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

  <!-- Header -->
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
    <div style="font-size: 60px; margin-bottom: 15px;">⚠️</div>
    <h1 style="margin: 0; font-size: 24px;">Payment Needs Attention</h1>
    <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">${creator.companyName}</p>
  </div>

  <!-- Issue Explanation -->
  <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin-bottom: 25px; border-radius: 8px;">
    <h2 style="margin: 0 0 15px 0; color: #92400e; font-size: 18px;">Payment Update Needed</h2>
    <p style="margin: 0 0 10px 0; color: #334155;">We had trouble processing your payment for the ${monthName} invoice ($${invoice.totalAmount.toLocaleString()}).</p>
    <p style="margin: 0; color: #334155; font-size: 14px;">This is usually due to an expired card or insufficient funds.</p>
  </div>

  <!-- Quick Fix -->
  <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
    <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #334155;">Quick Fix</h3>

    <ol style="margin: 0; padding-left: 20px; color: #334155;">
      <li style="margin-bottom: 10px;">Update your payment method</li>
      <li style="margin-bottom: 10px;">Or pay manually via the link below</li>
      <li>Email us if you need help</li>
    </ol>
  </div>

  ${
    invoice.stripeInvoiceUrl
      ? `
  <!-- CTA Button -->
  <div style="text-align: center; margin: 30px 0;">
    <a href="${invoice.stripeInvoiceUrl}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Update Payment Method</a>
  </div>
  `
      : ''
  }

  <!-- Reminder of Value -->
  <div style="background: #eff6ff; padding: 20px; border-radius: 8px;">
    <p style="margin: 0 0 10px 0; color: #1e40af; font-weight: 600;">Remember:</p>
    <p style="margin: 0; color: #334155; font-size: 14px;">This ${monthName} invoice covers $${invoice.creatorGainFromReferrals.toLocaleString()} in extra revenue you earned. You netted $${invoice.netBenefit.toLocaleString()} after our ${invoice.roiOnPlatformFee.toFixed(1)}x ROI partnership fee.</p>
  </div>

  <!-- Footer -->
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px;">
    <p style="margin: 5px 0;">Need help? Reply to this email or contact support.</p>
    <p style="margin: 5px 0;">We're here to make this easy for you.</p>
    <p style="margin: 15px 0 5px 0;">Referral Flywheel • Built for Whop Communities</p>
  </div>

</body>
</html>
    `,
  };
}
