/**
 * Monthly Invoice Generator
 *
 * Automatically generates invoices for all creators with referred sales.
 * Integrates with Stripe for payment processing.
 *
 * Run monthly via cron: /api/cron/generate-invoices
 */

import { calculateValueMetrics } from './value-calculator';
import { prisma } from '../db/prisma';
import logger from '../logger';
import { startOfMonth, endOfMonth, subMonths, addDays, format } from 'date-fns';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STRIPE SETUP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Lazy-load Stripe to avoid import issues if not configured
let Stripe: any;
let stripe: any;

function getStripe() {
  if (!stripe && process.env.STRIPE_SECRET_KEY) {
    // Dynamically import Stripe only when needed
    Stripe = require('stripe').default;
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia' as any,
    });
  }
  return stripe;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN INVOICE GENERATION FUNCTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface InvoiceResults {
  invoiced: Array<{
    creatorId: string;
    name: string;
    amount: number;
    netBenefit: number;
    invoiceId: string;
  }>;
  skipped: Array<{
    creatorId: string;
    name: string;
    reason: string;
    referredSales: number;
    amount: number;
  }>;
  errors: Array<{
    creatorId: string;
    name: string;
    error: string;
  }>;
}

/**
 * Generate monthly invoices for all active creators
 *
 * Automatically runs on the 1st of each month to invoice for previous month.
 */
export async function generateMonthlyInvoices(): Promise<InvoiceResults> {
  console.log('🔄 Starting monthly invoice generation...\n');

  // Last month's period
  const lastMonth = {
    start: startOfMonth(subMonths(new Date(), 1)),
    end: endOfMonth(subMonths(new Date(), 1)),
  };

  console.log(
    `📅 Invoice period: ${format(lastMonth.start, 'MMM d, yyyy')} - ${format(
      lastMonth.end,
      'MMM d, yyyy'
    )}\n`
  );

  const results: InvoiceResults = {
    invoiced: [],
    skipped: [],
    errors: [],
  };

  try {
    // Get all active creators
    const creators = await prisma.creator.findMany({
      where: {
        isActive: true,
        invoicingEnabled: true,
      },
      select: {
        id: true,
        companyName: true,
        stripeCustomerId: true,
        pendingRefundCredit: true,
      },
    });

    console.log(`📊 Processing ${creators.length} creators...\n`);

    // Process each creator
    for (const creator of creators) {
      try {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Processing: ${creator.companyName}`);
        console.log('='.repeat(60));

        // Calculate value metrics for last month
        const metrics = await calculateValueMetrics(
          creator.id,
          lastMonth.start,
          lastMonth.end
        );

        // Log metrics
        console.log(`  Organic: ${metrics.organicSalesCount} sales → $${metrics.organicRevenue.toFixed(2)}`);
        console.log(`  Referred: ${metrics.referredSalesCount} sales → $${metrics.referredRevenue.toFixed(2)}`);
        console.log(`  Creator gained: $${metrics.additionalRevenueGenerated.toFixed(2)}`);
        console.log(`  Platform fee: $${metrics.platformFeesOwed.toFixed(2)}`);
        console.log(`  Net benefit: $${metrics.netBenefit.toFixed(2)}`);
        console.log(`  Should invoice: ${metrics.shouldInvoice}`);

        // Skip if shouldn't invoice
        if (!metrics.shouldInvoice) {
          const reason =
            metrics.referredSalesCount === 0
              ? 'No referred sales this month'
              : `Amount below minimum ($${metrics.platformFeesOwed.toFixed(2)} < $10)`;

          console.log(`  ⏭️  Skipping - ${reason}`);

          results.skipped.push({
            creatorId: creator.id,
            name: creator.companyName,
            reason,
            referredSales: metrics.referredSalesCount,
            amount: metrics.platformFeesOwed,
          });

          continue;
        }

        // CREATE INVOICE
        console.log(`  💰 Creating invoice for $${metrics.platformFeesOwed.toFixed(2)}...`);

        const invoice = await createInvoiceForCreator(
          creator,
          metrics,
          lastMonth
        );

        results.invoiced.push({
          creatorId: creator.id,
          name: creator.companyName,
          amount: metrics.platformFeesOwed,
          netBenefit: metrics.netBenefit,
          invoiceId: invoice.id,
        });

        console.log(`  ✅ Invoice created: ${invoice.stripeInvoiceId || 'DB only'}`);
      } catch (error: any) {
        console.error(`  ❌ Error:`, error.message);
        results.errors.push({
          creatorId: creator.id,
          name: creator.companyName,
          error: error.message,
        });
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // SUMMARY
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n' + '='.repeat(60));
    console.log('📈 INVOICE GENERATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Invoiced: ${results.invoiced.length} creators`);

    if (results.invoiced.length > 0) {
      const totalFees = results.invoiced.reduce((sum, i) => sum + i.amount, 0);
      const totalValue = results.invoiced.reduce((sum, i) => sum + i.netBenefit, 0);
      console.log(`   Total fees: $${totalFees.toFixed(2)}`);
      console.log(`   Total value to creators: $${totalValue.toFixed(2)}`);
    }

    console.log(`⏭️  Skipped: ${results.skipped.length} creators`);
    console.log(`❌ Errors: ${results.errors.length} creators\n`);

    return results;
  } catch (error) {
    logger.error('❌ Invoice generation failed:', error);
    throw error;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CREATE INVOICE FOR INDIVIDUAL CREATOR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function createInvoiceForCreator(
  creator: {
    id: string;
    companyName: string;
    stripeCustomerId: string | null;
    pendingRefundCredit: number;
  },
  metrics: Awaited<ReturnType<typeof calculateValueMetrics>>,
  period: { start: Date; end: Date }
) {
  const stripeClient = getStripe();

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. ENSURE STRIPE CUSTOMER EXISTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  let stripeCustomerId = creator.stripeCustomerId;
  let stripeInvoiceId: string | undefined;
  let stripeInvoiceUrl: string | undefined;

  if (stripeClient && !stripeCustomerId) {
    console.log(`  📝 Creating Stripe customer...`);

    const stripeCustomer = await stripeClient.customers.create({
      name: creator.companyName,
      metadata: {
        creatorId: creator.id,
        source: 'referral-flywheel',
      },
    });

    stripeCustomerId = stripeCustomer.id;

    // Save to database
    await prisma.creator.update({
      where: { id: creator.id },
      data: { stripeCustomerId },
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. CREATE STRIPE INVOICE (if Stripe is configured)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (stripeClient && stripeCustomerId) {
    const monthName = format(period.start, 'MMMM yyyy');

    const stripeInvoice = await stripeClient.invoices.create({
      customer: stripeCustomerId,
      collection_method: 'send_invoice',
      days_until_due: 7,
      description: `Referral Flywheel Revenue Share - ${monthName}`,
      metadata: {
        creatorId: creator.id,
        periodStart: period.start.toISOString(),
        periodEnd: period.end.toISOString(),
        referredSales: metrics.referredSalesCount.toString(),
        valueGenerated: metrics.additionalRevenueGenerated.toFixed(2),
        netBenefit: metrics.netBenefit.toFixed(2),
        roiMultiple: metrics.roiOnPlatformFee.toFixed(1),
      },
    });

    // Add line item
    await stripeClient.invoiceItems.create({
      customer: stripeCustomerId,
      invoice: stripeInvoice.id,
      amount: Math.round(metrics.platformFeesOwed * 100), // Cents
      currency: 'usd',
      description: `Revenue Share: 20% of ${metrics.referredSalesCount} referred sales\n\nValue to you:\n• Referred revenue: $${metrics.referredRevenue.toFixed(2)}\n• You kept (70%): $${metrics.referredRevenueKept.toFixed(2)}\n• Extra revenue: +$${metrics.additionalRevenueGenerated.toFixed(2)}\n• Net benefit: $${metrics.netBenefit.toFixed(2)}\n• ROI: ${metrics.roiOnPlatformFee.toFixed(1)}x`,
    });

    // Apply refund credits if any
    if (creator.pendingRefundCredit > 0) {
      await stripeClient.invoiceItems.create({
        customer: stripeCustomerId,
        invoice: stripeInvoice.id,
        amount: -Math.round(Number(creator.pendingRefundCredit) * 100),
        currency: 'usd',
        description: 'Credit for refunded sales from previous invoices',
      });

      // Clear the credit
      await prisma.creator.update({
        where: { id: creator.id },
        data: { pendingRefundCredit: 0 },
      });
    }

    // Finalize and send
    await stripeClient.invoices.finalizeInvoice(stripeInvoice.id);
    await stripeClient.invoices.sendInvoice(stripeInvoice.id);

    stripeInvoiceId = stripeInvoice.id;
    stripeInvoiceUrl = stripeInvoice.hosted_invoice_url;

    console.log(`  📧 Invoice sent via Stripe`);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. SAVE TO DATABASE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const invoice = await prisma.invoice.create({
    data: {
      creatorId: creator.id,
      periodStart: period.start,
      periodEnd: period.end,
      status: stripeInvoiceId ? 'sent' : 'pending',
      totalAmount: metrics.platformFeesOwed,
      salesCount: metrics.referredSalesCount,
      referredSalesTotal: metrics.referredRevenue,
      organicSalesTotal: metrics.organicRevenue,
      creatorGainFromReferrals: metrics.additionalRevenueGenerated,
      totalRevenueWithApp: metrics.revenueWithApp,
      totalRevenueWithoutApp: metrics.revenueWithoutApp,
      additionalRevenue: metrics.additionalRevenueGenerated,
      percentageGrowth: metrics.percentageGrowth,
      stripeInvoiceId,
      stripeInvoiceUrl,
      dueDate: stripeInvoiceId ? addDays(new Date(), 7) : null,
    },
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. MARK SALES AS INVOICED
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Get all referred members for this creator
  const referredMembers = await prisma.member.findMany({
    where: {
      creatorId: creator.id,
      memberOrigin: 'referred',
      createdAt: {
        gte: period.start,
        lte: period.end,
      },
    },
    select: { membershipId: true },
  });

  const membershipIds = referredMembers.map((m) => m.membershipId);

  const updatedSales = await prisma.commission.updateMany({
    where: {
      whopMembershipId: { in: membershipIds },
      platformFeeInvoiced: false,
      status: 'paid',
      createdAt: {
        gte: period.start,
        lte: period.end,
      },
    },
    data: {
      platformFeeInvoiced: true,
      invoiceId: invoice.id,
    },
  });

  console.log(`  ✓ Marked ${updatedSales.count} sales as invoiced`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 5. UPDATE CREATOR LIFETIME STATS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  await prisma.creator.update({
    where: { id: creator.id },
    data: {
      firstInvoiceDate: creator.stripeCustomerId ? undefined : new Date(),
      lifetimeInvoiced: {
        increment: metrics.platformFeesOwed,
      },
      lifetimeReferred: {
        increment: metrics.referredRevenue,
      },
    },
  });

  return invoice;
}
