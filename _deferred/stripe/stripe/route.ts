/**
 * Stripe Webhook Handler
 *
 * Handles invoice payment events from Stripe:
 * - invoice.paid → Mark invoice as paid
 * - invoice.payment_failed → Mark as overdue
 * - invoice.payment_action_required → Notify creator
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db/prisma';
import logger from '../../../../lib/logger';

// Lazy-load Stripe
let Stripe: any;
let stripe: any;

function getStripe() {
  if (!stripe && process.env.STRIPE_SECRET_KEY) {
    Stripe = require('stripe').default;
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia' as any,
    });
  }
  return stripe;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      logger.error('❌ Missing Stripe signature');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const stripeClient = getStripe();
    if (!stripeClient) {
      logger.error('❌ Stripe not configured');
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // VERIFY WEBHOOK SIGNATURE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.error('❌ STRIPE_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    let event: any;
    try {
      event = stripeClient.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      logger.error('❌ Webhook signature verification failed:', err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    logger.info(`📥 Stripe webhook: ${event.type}`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ROUTE TO HANDLERS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    switch (event.type) {
      case 'invoice.paid':
        await handleInvoicePaid(event);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event);
        break;

      case 'invoice.payment_action_required':
        await handleInvoicePaymentActionRequired(event);
        break;

      default:
        logger.info(`  Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('❌ Stripe webhook handler error:', error);

    return NextResponse.json(
      {
        error: 'Webhook handler failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HANDLER: Invoice Paid
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function handleInvoicePaid(event: any) {
  const stripeInvoice = event.data.object;

  logger.info(`💰 Invoice paid: ${stripeInvoice.id}`);

  // Find invoice in database
  const invoice = await prisma.invoice.findUnique({
    where: { stripeInvoiceId: stripeInvoice.id },
    include: { creator: true },
  });

  if (!invoice) {
    logger.error(`❌ Invoice not found in database: ${stripeInvoice.id}`);
    return;
  }

  // Update invoice status
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: 'paid',
      paidAt: new Date(),
    },
  });

  logger.info(`✅ Invoice ${invoice.id} marked as paid for ${invoice.creator.companyName}`);

  // TODO: Send thank you email
  // await sendInvoicePaidEmail(invoice.creator, invoice);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HANDLER: Payment Failed
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function handleInvoicePaymentFailed(event: any) {
  const stripeInvoice = event.data.object;

  logger.info(`❌ Payment failed: ${stripeInvoice.id}`);

  const invoice = await prisma.invoice.findUnique({
    where: { stripeInvoiceId: stripeInvoice.id },
    include: { creator: true },
  });

  if (!invoice) {
    logger.error(`❌ Invoice not found: ${stripeInvoice.id}`);
    return;
  }

  // Update status
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { status: 'overdue' },
  });

  logger.info(`⚠️  Invoice ${invoice.id} marked as overdue`);

  // TODO: Send helpful (not aggressive) email
  // await sendPaymentFailedEmail(invoice.creator, invoice);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HANDLER: Payment Action Required
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function handleInvoicePaymentActionRequired(event: any) {
  const stripeInvoice = event.data.object;

  logger.info(`⚠️  Payment action required: ${stripeInvoice.id}`);

  const invoice = await prisma.invoice.findUnique({
    where: { stripeInvoiceId: stripeInvoice.id },
    include: { creator: true },
  });

  if (!invoice) {
    logger.error(`❌ Invoice not found: ${stripeInvoice.id}`);
    return;
  }

  // TODO: Send email with action needed
  // await sendPaymentActionRequiredEmail(invoice.creator, invoice);
  logger.info(`ℹ️  Action required email would be sent for invoice ${invoice.id}`);
}
