/**
 * Export Invoices to CSV
 *
 * Exports invoice records from database to CSV for manual invoicing.
 *
 * Usage:
 *   npx tsx scripts/export-invoices.ts              # Export all invoices
 *   npx tsx scripts/export-invoices.ts 2025-11      # Export specific month
 *   npx tsx scripts/export-invoices.ts pending      # Export only pending
 */

import { prisma } from '../lib/db/prisma';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import fs from 'fs';
import path from 'path';

async function exportInvoices(monthFilter?: string, statusFilter?: string) {
  console.log('📄 Exporting invoices to CSV...\n');

  // Build where clause
  const where: any = {};

  if (monthFilter && monthFilter !== 'pending') {
    // Parse month filter (e.g., "2025-11")
    const [year, month] = monthFilter.split('-').map(Number);
    const monthStart = new Date(year, month - 1, 1);

    where.periodStart = {
      gte: startOfMonth(monthStart),
      lte: endOfMonth(monthStart),
    };

    console.log(`📅 Filter: ${format(monthStart, 'MMMM yyyy')}`);
  } else if (statusFilter === 'pending' || monthFilter === 'pending') {
    where.status = 'pending';
    console.log(`🔍 Filter: Status = pending`);
  }

  // Fetch invoices
  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      creator: {
        select: {
          companyName: true,
          companyId: true,
        },
      },
    },
    orderBy: [
      { periodStart: 'desc' },
      { creator: { companyName: 'asc' } },
    ],
  });

  if (invoices.length === 0) {
    console.log('⚠️  No invoices found matching filters\n');
    return;
  }

  console.log(`✅ Found ${invoices.length} invoices\n`);

  // Calculate totals
  const totalAmount = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
  const totalValueToCreators = invoices.reduce(
    (sum, inv) => sum + Number(inv.creatorGainFromReferrals || inv.additionalRevenue),
    0
  );

  // Create CSV content
  const csvRows: string[] = [];

  // Header row
  csvRows.push([
    'Creator',
    'Company ID',
    'Period',
    'Amount Due',
    'Referred Sales',
    'Creator Gained',
    'Net Benefit',
    'ROI',
    'Status',
    'Invoice ID',
  ].join(','));

  // Data rows
  for (const inv of invoices) {
    const creatorGain = Number(inv.creatorGainFromReferrals || inv.additionalRevenue);
    const amount = Number(inv.totalAmount);
    const netBenefit = creatorGain - amount;
    const roi = amount > 0 ? (creatorGain / amount).toFixed(1) : '0.0';

    csvRows.push([
      `"${inv.creator.companyName.replace(/"/g, '""')}"`, // Escape quotes
      inv.creator.companyId,
      format(inv.periodStart, 'MMM yyyy'),
      `$${amount.toFixed(2)}`,
      `${inv.salesCount} sales`,
      `$${creatorGain.toFixed(2)}`,
      `$${netBenefit.toFixed(2)}`,
      `${roi}x`,
      inv.status,
      inv.id,
    ].join(','));
  }

  const csvContent = csvRows.join('\n');

  // Generate filename
  const timestamp = format(new Date(), 'yyyy-MM-dd');
  const filterSuffix = monthFilter && monthFilter !== 'pending'
    ? `-${monthFilter}`
    : statusFilter === 'pending' || monthFilter === 'pending'
    ? '-pending'
    : '';
  const filename = `invoices${filterSuffix}-${timestamp}.csv`;

  // Save to file
  const filepath = path.join(process.cwd(), filename);
  fs.writeFileSync(filepath, csvContent, 'utf-8');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SUMMARY
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('='.repeat(60));
  console.log('📊 EXPORT SUMMARY');
  console.log('='.repeat(60));
  console.log(`📄 File: ${filename}`);
  console.log(`📍 Location: ${filepath}`);
  console.log(`📦 Invoices: ${invoices.length}`);
  console.log(`💰 Total amount: $${totalAmount.toFixed(2)}`);
  console.log(`🎉 Total value to creators: $${totalValueToCreators.toFixed(2)}`);
  console.log('='.repeat(60));

  // Show preview
  console.log('\n📋 Preview (first 5 rows):\n');
  console.log(csvRows.slice(0, 6).join('\n'));

  if (invoices.length > 5) {
    console.log(`\n... and ${invoices.length - 5} more rows`);
  }

  console.log('\n✅ Export complete!\n');

  // Show status breakdown
  const statusCounts = invoices.reduce((acc, inv) => {
    acc[inv.status] = (acc[inv.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('📊 By status:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`   ${status}: ${count}`);
  });

  console.log('\n💡 Next steps:');
  console.log('   1. Open the CSV file');
  console.log('   2. Create invoices manually in Stripe (or your invoicing tool)');
  console.log('   3. Update invoice status when paid\n');
}

// Parse command line args
const arg = process.argv[2];
exportInvoices(arg).catch((error) => {
  console.error('❌ Export failed:', error);
  process.exit(1);
});
