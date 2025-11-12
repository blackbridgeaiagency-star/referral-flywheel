// lib/email/resend-client.ts
import { Resend } from 'resend';
import logger from '../logger';


const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY) {
  logger.warn('⚠️ RESEND_API_KEY not configured - Email sending will fail');
}

// Lazy initialization to avoid build errors when API key is not set
let resendInstance: Resend | null = null;

function getResendClient(): Resend | null {
  if (!RESEND_API_KEY) {
    return null;
  }
  if (!resendInstance) {
    resendInstance = new Resend(RESEND_API_KEY);
  }
  return resendInstance;
}

/**
 * Send email with retry logic
 */
export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const resend = getResendClient();

  if (!resend) {
    logger.error('❌ Cannot send email - RESEND_API_KEY not configured');
    return {
      success: false,
      error: 'Email service not configured'
    };
  }

  try {
    logger.info(' Sending email to ${options.to}: ${options.subject}');

    const result = await resend.emails.send({
      from: options.from || 'Referral Flywheel <onboarding@referralflywheel.app>',
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    if (result.error) {
      logger.error('❌ Resend error:', result.error);
      return {
        success: false,
        error: result.error.message
      };
    }

    logger.info('Email sent successfully: ${result.data?.id}');
    return {
      success: true,
      id: result.data?.id
    };

  } catch (error) {
    logger.error('❌ Failed to send email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
