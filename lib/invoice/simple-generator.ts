/**
 * SIMPLIFIED Invoice Generator (Database Only - No Stripe)
 *
 * Creates invoice records in the database for manual invoicing.
 * Use this for MVP until you're ready to automate with Stripe.
 *
 * Run monthly: npx tsx scripts/generate-invoices.ts
 * Then export: npx tsx scripts/export-invoices.ts
 */

import { calculateValueMetrics } from './value-calculator';
import { prisma } from '../db/prisma';
import logger from '../logger';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export interface SimpleInvoiceResult {
  creator: string;
  companyId: string;
  amount: number;
  netBenefit: number;
  roi: string;
  sales: number;
  invoiceId: string;
}

export interface SimpleInvoiceResults {
  invoiced: SimpleInvoiceResult[];
  skipped: Array<{
    creator: string;
    reason: string;
    referredSales: number;
    amount: number;
  }>;
}

/**
 * Generate monthly invoice records (database only, no Stripe)
 *
 * This creates Invoice records that you can use to manually bill creators.
 * Export results to CSV using the export-invoices.ts script.
 */
export async function generateSimpleInvoices(): Promise<SimpleInvoiceResults> {
  console.log('📊 Generating invoice records (database only)...\n');
  console.log('💡 Stripe integration skipped - manual invoicing required\n');

  // Calculate last month's period
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

  const results: SimpleInvoiceResults = {
    invoiced: [],
    skipped: [],
  };

  try {
    // Get all active creators
    const creators = await prisma.creator.findMany({
      where: { isActive: true },
      select: {
        id: true,
        companyName: true,
        companyId: true,
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
        console.log(`  ROI: ${metrics.roiOnPlatformFee.toFixed(1)}x`);
        console.log(`  Should invoice: ${metrics.shouldInvoice}`);

        // Skip if shouldn't invoice
        if (!metrics.shouldInvoice) {
          const reason =
            metrics.referredSalesCount === 0
              ? 'No referred sales this month'
              : `Amount below minimum ($${metrics.platformFeesOwed.toFixed(2)} < $10)`;

          console.log(`  ⏭️  Skipping - ${reason}`);

          results.skipped.push({
            creator: creator.companyName,
            reason,
            referredSales: metrics.referredSalesCount,
            amount: metrics.platformFeesOwed,
          });

          continue;
        }

        // CREATE DATABASE INVOICE RECORD
        console.log(`  💾 Creating database invoice record...`);

        const invoice = await prisma.invoice.create({
          data: {
            creatorId: creator.id,
            periodStart: lastMonth.start,
            periodEnd: lastMonth.end,
            status: 'pending',
            totalAmount: metrics.platformFeesOwed,
            salesCount: metrics.referredSalesCount,
            referredSalesTotal: metrics.referredRevenue,
            organicSalesTotal: metrics.organicRevenue,
            creatorGainFromReferrals: metrics.additionalRevenueGenerated,
            totalRevenueWithApp: metrics.revenueWithApp,
            totalRevenueWithoutApp: metrics.revenueWithoutApp,
            additionalRevenue: metrics.additionalRevenueGenerated,
            percentageGrowth: metrics.percentageGrowth,
            // No Stripe fields - manual invoicing
            stripeInvoiceId: null,
            stripeInvoiceUrl: null,
            dueDate: null,
          },
        });

        // MARK SALES AS INVOICED
        console.log(`  📝 Marking sales as invoiced...`);

        // Get all referred members for this creator in this period
        const referredMembers = await prisma.member.findMany({
          where: {
            creatorId: creator.id,
            memberOrigin: 'referred',
            createdAt: {
              gte: lastMonth.start,
              lte: lastMonth.end,
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
              gte: lastMonth.start,
              lte: lastMonth.end,
            },
          },
          data: {
            platformFeeInvoiced: true,
            invoiceId: invoice.id,
          },
        });

        console.log(`  ✓ Marked ${updatedSales.count} sales as invoiced`);

        // Add to results
        results.invoiced.push({
          creator: creator.companyName,
          companyId: creator.companyId,
          amount: metrics.platformFeesOwed,
          netBenefit: metrics.netBenefit,
          roi: metrics.roiOnPlatformFee.toFixed(1),
          sales: metrics.referredSalesCount,
          invoiceId: invoice.id,
        });

        console.log(`  ✅ Invoice record created: ${invoice.id}`);
      } catch (error: any) {
        console.error(`  ❌ Error:`, error.message);
        logger.error('Failed to generate invoice for creator', error, creator.companyName);
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // SUMMARY
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n' + '='.repeat(60));
    console.log('📈 INVOICE GENERATION SUMMARY');
    console.log('='.repeat(60));

    if (results.invoiced.length > 0) {
      console.log(`\n✅ ${results.invoiced.length} creators invoiced:\n`);
      console.table(results.invoiced);

      const totalFees = results.invoiced.reduce((sum, i) => sum + i.amount, 0);
      const totalValue = results.invoiced.reduce((sum, i) => sum + i.netBenefit, 0);

      console.log(`\n💰 Total platform revenue: $${totalFees.toFixed(2)}`);
      console.log(`🎉 Total value to creators: $${totalValue.toFixed(2)}`);
    } else {
      console.log('\n⏭️  No invoices generated this month');
    }

    if (results.skipped.length > 0) {
      console.log(`\n⏭️  ${results.skipped.length} creators skipped:`);
      results.skipped.forEach(s => {
        console.log(`   - ${s.creator}: ${s.reason}`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ DONE - Invoice records saved to database');
    console.log('='.repeat(60));
    console.log('\n💡 Next step: Export to CSV with:');
    console.log('   npx tsx scripts/export-invoices.ts\n');

    return results;
  } catch (error) {
    logger.error('❌ Invoice generation failed:', error);
    throw error;
  }
}
