/**
 * Monthly Invoice Generation Cron Job
 *
 * Runs on the 1st of each month at 9 AM UTC
 * Generates invoices for all creators with referred sales
 *
 * Vercel Cron Configuration (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/generate-invoices",
 *     "schedule": "0 9 1 * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateSimpleInvoices } from '../../../../lib/invoice/simple-generator';
import logger from '../../../../lib/logger';

export async function GET(req: NextRequest) {
  try {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // VERIFY CRON SECRET (Security)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // In production, require secret
    if (process.env.NODE_ENV === 'production') {
      if (!cronSecret) {
        logger.error('❌ CRON_SECRET not configured in production');
        return NextResponse.json(
          { error: 'Server misconfiguration' },
          { status: 500 }
        );
      }

      if (authHeader !== `Bearer ${cronSecret}`) {
        logger.error('❌ Unauthorized cron attempt');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      // In development, allow without secret
      logger.warn('⚠️ Running cron job in development mode (no auth)');
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // RUN INVOICE GENERATION
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    logger.info('🗓️  Monthly invoice generation started');

    const results = await generateSimpleInvoices();

    logger.info(`✅ Invoice generation complete:`, {
      invoiced: results.invoiced.length,
      skipped: results.skipped.length,
    });

    return NextResponse.json({
      success: true,
      summary: {
        invoiced: results.invoiced.length,
        skipped: results.skipped.length,
      },
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('❌ Invoice generation failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Invoice generation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(req: NextRequest) {
  return GET(req);
}
