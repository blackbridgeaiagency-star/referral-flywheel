import logger from '../logger';

/**
 * Email Client for Referral Flywheel
 *
 * Supports multiple email providers:
 * - Resend (recommended - free tier available)
 * - SendGrid
 * - Postmark
 *
 * Configuration via environment variables:
 * - EMAIL_PROVIDER: 'resend' | 'sendgrid' | 'postmark' | 'console' (default: 'console' for dev)
 * - RESEND_API_KEY: For Resend
 * - SENDGRID_API_KEY: For SendGrid
 * - POSTMARK_API_KEY: For Postmark
 * - EMAIL_FROM: Sender email address (e.g., "Referral Flywheel <noreply@yourdomain.com>")
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class EmailClient {
  private provider: string;
  private fromAddress: string;

  constructor() {
    this.provider = process.env.EMAIL_PROVIDER || 'console';
    this.fromAddress = process.env.EMAIL_FROM || 'Referral Flywheel <noreply@referral-flywheel.com>';
  }

  /**
   * Send an email using the configured provider
   */
  async send({ to, subject, html, text }: EmailOptions): Promise<EmailResult> {
    try {
      switch (this.provider) {
        case 'resend':
          return await this.sendViaResend({ to, subject, html, text });

        case 'sendgrid':
          return await this.sendViaSendGrid({ to, subject, html, text });

        case 'postmark':
          return await this.sendViaPostmark({ to, subject, html, text });

        case 'console':
        default:
          return await this.sendViaConsole({ to, subject, html, text });
      }
    } catch (error) {
      logger.error('❌ Email send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Resend implementation
   */
  private async sendViaResend({ to, subject, html, text }: EmailOptions): Promise<EmailResult> {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      logger.error('❌ RESEND_API_KEY not configured');
      return { success: false, error: 'Resend API key not configured' };
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: this.fromAddress,
          to: [to],
          subject,
          html,
          text: text || this.stripHtml(html)
        })
      });

      if (!response.ok) {
        const error = await response.json();
        logger.error('❌ Resend error:', error);
        return { success: false, error: error.message || 'Resend API error' };
      }

      const data = await response.json();
      logger.info('Email sent via Resend to ${to}');

      return {
        success: true,
        messageId: data.id
      };
    } catch (error) {
      logger.error('❌ Resend send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send via Resend'
      };
    }
  }

  /**
   * SendGrid implementation
   */
  private async sendViaSendGrid({ to, subject, html, text }: EmailOptions): Promise<EmailResult> {
    const apiKey = process.env.SENDGRID_API_KEY;

    if (!apiKey) {
      logger.error('❌ SENDGRID_API_KEY not configured');
      return { success: false, error: 'SendGrid API key not configured' };
    }

    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: this.fromAddress },
          subject,
          content: [
            { type: 'text/plain', value: text || this.stripHtml(html) },
            { type: 'text/html', value: html }
          ]
        })
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error('❌ SendGrid error:', error);
        return { success: false, error: 'SendGrid API error' };
      }

      const messageId = response.headers.get('x-message-id');
      logger.info('Email sent via SendGrid to ${to}');

      return {
        success: true,
        messageId: messageId || undefined
      };
    } catch (error) {
      logger.error('❌ SendGrid send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send via SendGrid'
      };
    }
  }

  /**
   * Postmark implementation
   */
  private async sendViaPostmark({ to, subject, html, text }: EmailOptions): Promise<EmailResult> {
    const apiKey = process.env.POSTMARK_API_KEY;

    if (!apiKey) {
      logger.error('❌ POSTMARK_API_KEY not configured');
      return { success: false, error: 'Postmark API key not configured' };
    }

    try {
      const response = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: {
          'X-Postmark-Server-Token': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          From: this.fromAddress,
          To: to,
          Subject: subject,
          HtmlBody: html,
          TextBody: text || this.stripHtml(html)
        })
      });

      if (!response.ok) {
        const error = await response.json();
        logger.error('❌ Postmark error:', error);
        return { success: false, error: error.Message || 'Postmark API error' };
      }

      const data = await response.json();
      logger.info('Email sent via Postmark to ${to}');

      return {
        success: true,
        messageId: data.MessageID
      };
    } catch (error) {
      logger.error('❌ Postmark send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send via Postmark'
      };
    }
  }

  /**
   * Console logging for development (no actual email sent)
   */
  private async sendViaConsole({ to, subject, html, text }: EmailOptions): Promise<EmailResult> {
    logger.info(' [DEV MODE] Email would be sent:');
    logger.debug(`   To: ${to}`);
    logger.debug(`   Subject: ${subject}`);
    logger.debug(`   HTML length: ${html.length} chars`);
    if (text) logger.debug(`   Text length: ${text.length} chars`);
    logger.debug('   ---');

    return {
      success: true,
      messageId: `dev-${Date.now()}`
    };
  }

  /**
   * Strip HTML tags for plain text fallback
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }
}

// Export singleton instance
export const emailClient = new EmailClient();

/**
 * Helper function to send emails with simplified API
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  return emailClient.send(options);
}
