// lib/email/email-service.ts
import nodemailer from 'nodemailer';
import { render } from '@react-email/render';
import { prisma } from '../db/prisma';

/**
 * Email Notification Service
 *
 * Handles all email communications including:
 * - Milestone achievements
 * - Commission notifications
 * - Weekly/Monthly reports
 * - System alerts
 */

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Email templates
export enum EmailTemplate {
  WELCOME = 'welcome',
  FIRST_REFERRAL = 'first_referral',
  MILESTONE_REACHED = 'milestone_reached',
  COMMISSION_PAID = 'commission_paid',
  WEEKLY_REPORT = 'weekly_report',
  MONTHLY_REPORT = 'monthly_report',
  REWARD_UNLOCKED = 'reward_unlocked',
  RANK_IMPROVED = 'rank_improved',
  PAYMENT_FAILED = 'payment_failed',
  ACCOUNT_SUMMARY = 'account_summary',
}

interface EmailData {
  to: string;
  subject: string;
  template: EmailTemplate;
  data: Record<string, any>;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
  }>;
}

/**
 * Send an email notification
 */
export async function sendEmail(emailData: EmailData): Promise<boolean> {
  try {
    // Check if email is enabled
    if (!process.env.SMTP_USER || process.env.DISABLE_EMAILS === 'true') {
      console.log('📧 Email disabled or not configured:', emailData.subject);
      return true; // Return success to not break the flow
    }

    // Check for unsubscribe
    const isUnsubscribed = await checkUnsubscribe(emailData.to);
    if (isUnsubscribed) {
      console.log(`📧 User unsubscribed: ${emailData.to}`);
      return true;
    }

    // Render email template
    const html = await renderEmailTemplate(emailData.template, emailData.data);

    // Send email
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'Referral Flywheel'}" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
      to: emailData.to,
      subject: emailData.subject,
      html,
      attachments: emailData.attachments,
      headers: {
        'X-Email-Template': emailData.template,
        'List-Unsubscribe': `<${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe?email=${emailData.to}>`,
      },
    });

    // Log email sent
    await logEmailSent({
      to: emailData.to,
      template: emailData.template,
      messageId: info.messageId,
      success: true,
    });

    console.log(`✅ Email sent: ${emailData.subject} to ${emailData.to}`);
    return true;

  } catch (error) {
    console.error('❌ Email send failed:', error);

    // Log failure
    await logEmailSent({
      to: emailData.to,
      template: emailData.template,
      messageId: null,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return false;
  }
}

/**
 * Send welcome email to new member
 */
export async function sendWelcomeEmail(member: {
  id: string;
  email: string;
  username: string;
  referralCode: string;
}): Promise<void> {
  const referralUrl = `${process.env.NEXT_PUBLIC_APP_URL}/r/${member.referralCode}`;
  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/customer/${member.id}`;

  await sendEmail({
    to: member.email,
    subject: '🎉 Welcome to Referral Flywheel - Start Earning Today!',
    template: EmailTemplate.WELCOME,
    data: {
      username: member.username,
      referralCode: member.referralCode,
      referralUrl,
      dashboardUrl,
      commissionRate: '10%',
    },
  });
}

/**
 * Send first referral success notification
 */
export async function sendFirstReferralEmail(member: {
  email: string;
  username: string;
  earnedAmount: number;
}): Promise<void> {
  await sendEmail({
    to: member.email,
    subject: '🎊 Congratulations! Your First Referral Earned You Money!',
    template: EmailTemplate.FIRST_REFERRAL,
    data: {
      username: member.username,
      earnedAmount: member.earnedAmount,
      monthlyProjection: member.earnedAmount * 10, // If they get 10 referrals
    },
  });
}

/**
 * Send milestone reached notification
 */
export async function sendMilestoneEmail(member: {
  email: string;
  username: string;
  milestone: number;
  reward: string;
  totalEarnings: number;
}): Promise<void> {
  await sendEmail({
    to: member.email,
    subject: `🏆 Milestone Reached: ${member.milestone} Referrals!`,
    template: EmailTemplate.MILESTONE_REACHED,
    data: {
      username: member.username,
      milestone: member.milestone,
      reward: member.reward,
      totalEarnings: member.totalEarnings,
      nextMilestone: getNextMilestone(member.milestone),
    },
  });
}

/**
 * Send commission payment notification
 */
export async function sendCommissionEmail(data: {
  email: string;
  username: string;
  amount: number;
  referralName: string;
  paymentType: 'initial' | 'recurring';
}): Promise<void> {
  await sendEmail({
    to: data.email,
    subject: `💰 You Earned $${data.amount.toFixed(2)} from ${data.referralName}!`,
    template: EmailTemplate.COMMISSION_PAID,
    data: {
      ...data,
      isRecurring: data.paymentType === 'recurring',
    },
  });
}

/**
 * Send weekly performance report
 */
export async function sendWeeklyReport(memberId: string): Promise<void> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: {
      commissions: {
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      },
    },
  });

  if (!member) return;

  const weeklyEarnings = member.commissions.reduce((sum, c) => sum + c.memberShare, 0);
  const newReferrals = await prisma.member.count({
    where: {
      referredBy: member.referralCode,
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    },
  });

  await sendEmail({
    to: member.email,
    subject: `📊 Your Weekly Referral Report - $${weeklyEarnings.toFixed(2)} Earned`,
    template: EmailTemplate.WEEKLY_REPORT,
    data: {
      username: member.username,
      weeklyEarnings,
      newReferrals,
      totalReferrals: member.totalReferred,
      lifetimeEarnings: member.lifetimeEarnings,
      rank: member.globalEarningsRank,
    },
  });
}

/**
 * Send monthly performance report
 */
export async function sendMonthlyReport(memberId: string): Promise<void> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
  });

  if (!member) return;

  // Get monthly statistics
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [monthlyCommissions, monthlyReferrals, topPerformers] = await Promise.all([
    prisma.commission.findMany({
      where: {
        memberId: member.id,
        createdAt: { gte: monthStart },
        status: 'paid',
      },
    }),

    prisma.member.count({
      where: {
        referredBy: member.referralCode,
        createdAt: { gte: monthStart },
      },
    }),

    prisma.member.findMany({
      where: {
        creatorId: member.creatorId,
      },
      orderBy: {
        monthlyEarnings: 'desc',
      },
      take: 10,
      select: {
        username: true,
        monthlyEarnings: true,
      },
    }),
  ]);

  const monthlyEarnings = monthlyCommissions.reduce((sum, c) => sum + c.memberShare, 0);
  const isTopPerformer = topPerformers.findIndex(p => p.username === member.username) + 1;

  await sendEmail({
    to: member.email,
    subject: `📈 Monthly Report: $${monthlyEarnings.toFixed(2)} Earned in ${new Date().toLocaleDateString('en-US', { month: 'long' })}`,
    template: EmailTemplate.MONTHLY_REPORT,
    data: {
      username: member.username,
      month: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      monthlyEarnings,
      monthlyReferrals,
      lifetimeEarnings: member.lifetimeEarnings,
      totalReferrals: member.totalReferred,
      isTopPerformer,
      rank: isTopPerformer || member.communityRank,
      topPerformers: topPerformers.slice(0, 5),
    },
  });
}

/**
 * Render email template
 */
async function renderEmailTemplate(
  template: EmailTemplate,
  data: Record<string, any>
): Promise<string> {
  // In production, use React Email components
  // For now, return a simple HTML template

  const baseTemplate = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e5e5e5; }
          .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .metric { display: inline-block; margin: 10px; padding: 10px; background: #f5f5f5; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          {{content}}
          <div class="footer">
            <p>© Referral Flywheel • <a href="{{unsubscribeUrl}}">Unsubscribe</a></p>
          </div>
        </div>
      </body>
    </html>
  `;

  let content = '';

  switch (template) {
    case EmailTemplate.WELCOME:
      content = `
        <div class="header">
          <h1>Welcome to Referral Flywheel, ${data.username}! 🎉</h1>
        </div>
        <div class="content">
          <p>You're all set to start earning ${data.commissionRate} lifetime commissions!</p>
          <p><strong>Your unique referral link:</strong></p>
          <p style="background: #f5f5f5; padding: 10px; border-radius: 5px; word-break: break-all;">
            ${data.referralUrl}
          </p>
          <a href="${data.dashboardUrl}" class="button">View Your Dashboard</a>
          <p>Share your link and start earning today!</p>
        </div>
      `;
      break;

    case EmailTemplate.FIRST_REFERRAL:
      content = `
        <div class="header">
          <h1>🎊 Your First Referral Success!</h1>
        </div>
        <div class="content">
          <p>Congratulations ${data.username}!</p>
          <p>You just earned <strong>$${data.earnedAmount.toFixed(2)}</strong> from your first referral!</p>
          <p>This is just the beginning. If you get 10 referrals, you could be earning <strong>$${data.monthlyProjection.toFixed(2)}/month</strong>!</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="button">View Your Earnings</a>
        </div>
      `;
      break;

    default:
      content = `
        <div class="header">
          <h1>Referral Flywheel Notification</h1>
        </div>
        <div class="content">
          <p>${JSON.stringify(data, null, 2)}</p>
        </div>
      `;
  }

  return baseTemplate.replace('{{content}}', content).replace('{{unsubscribeUrl}}',
    `${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe?email=${data.email}`);
}

/**
 * Check if user is unsubscribed
 */
async function checkUnsubscribe(email: string): Promise<boolean> {
  // In production, check unsubscribe list in database
  return false;
}

/**
 * Log email sent for tracking
 */
async function logEmailSent(data: {
  to: string;
  template: string;
  messageId: string | null;
  success: boolean;
  error?: string;
}): Promise<void> {
  // In production, log to database for tracking
  console.log('📧 Email log:', data);
}

/**
 * Get next milestone based on current count
 */
function getNextMilestone(current: number): { count: number; reward: string } {
  const milestones = [
    { count: 5, reward: '1 month free' },
    { count: 10, reward: '3 months free' },
    { count: 25, reward: '6 months free' },
    { count: 50, reward: '1 year free' },
    { count: 100, reward: 'Lifetime access' },
  ];

  return milestones.find(m => m.count > current) || { count: current + 100, reward: 'Special reward' };
}

/**
 * Batch send emails
 */
export async function batchSendEmails(
  emails: EmailData[],
  options: { batchSize?: number; delayMs?: number } = {}
): Promise<{ sent: number; failed: number }> {
  const { batchSize = 10, delayMs = 100 } = options;
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);

    const results = await Promise.all(
      batch.map(email => sendEmail(email).catch(() => false))
    );

    sent += results.filter(r => r === true).length;
    failed += results.filter(r => r === false).length;

    // Delay between batches to avoid rate limits
    if (i + batchSize < emails.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return { sent, failed };
}