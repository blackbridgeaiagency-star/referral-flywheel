/**
 * Backfill Invoice Data Script
 *
 * Populates platformFeeInvoiced = false for all existing commissions.
 * This ensures existing sales are ready for the invoice system.
 *
 * Run with: npx tsx scripts/backfill-invoice-data.ts
 */

import { prisma } from '../lib/db/prisma';
import logger from '../lib/logger';

async function backfillInvoiceData() {
  console.log('🔄 Starting invoice data backfill...\n');

  try {
    // Get count of commissions needing backfill
    const totalCommissions = await prisma.commission.count();
    console.log(`Found ${totalCommissions} total commissions\n`);

    // Update all existing commissions
    // Set platformFeeInvoiced = false for all (since we haven't invoiced anyone yet)
    const result = await prisma.commission.updateMany({
      where: {
        // Only update commissions that haven't been set yet
        platformFeeInvoiced: undefined as any, // This will match null values
      },
      data: {
        platformFeeInvoiced: false,
        invoiceId: null,
      },
    });

    console.log(`✅ Updated ${result.count} commissions`);
    console.log(`   - platformFeeInvoiced set to false`);
    console.log(`   - invoiceId set to null\n`);

    // Show breakdown by creator
    const commissionsByCreator = await prisma.commission.groupBy({
      by: ['creatorId'],
      where: {
        status: 'paid',
      },
      _count: {
        id: true,
      },
      _sum: {
        platformShare: true,
      },
    });

    console.log('📊 Uninvoiced platform fees by creator:\n');

    for (const group of commissionsByCreator) {
      const creator = await prisma.creator.findUnique({
        where: { id: group.creatorId },
        select: { companyName: true },
      });

      const platformFees = group._sum.platformShare || 0;
      const commissionsCount = group._count.id;

      console.log(`  ${creator?.companyName || 'Unknown'}:`);
      console.log(`    ${commissionsCount} sales`);
      console.log(`    $${platformFees.toFixed(2)} in platform fees\n`);
    }

    const totalPlatformFees = commissionsByCreator.reduce(
      (sum, g) => sum + (g._sum.platformShare || 0),
      0
    );

    console.log(`💰 Total uninvoiced platform fees: $${totalPlatformFees.toFixed(2)}\n`);
    console.log('✅ Backfill complete!\n');

  } catch (error) {
    logger.error('❌ Backfill failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the backfill
backfillInvoiceData()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
