#!/usr/bin/env tsx
/**
 * Generate Monthly Invoices (Simplified MVP)
 *
 * Run this script on the 1st of each month to generate invoice records.
 * This creates database records only - no Stripe integration yet.
 *
 * Usage:
 *   npx tsx scripts/generate-invoices.ts
 *
 * After running, export to CSV with:
 *   npx tsx scripts/export-invoices.ts
 */

// CRITICAL: Load env BEFORE any imports that use process.env
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') });

import { generateSimpleInvoices } from '../lib/invoice/simple-generator';

async function main() {
  console.log('🚀 Starting simplified invoice generation...\n');
  console.log('💡 This is the MVP version (database only, no Stripe)\n');

  try {
    const results = await generateSimpleInvoices();

    // Exit with appropriate code
    if (results.invoiced.length > 0) {
      console.log('🎉 Success! Invoice records created.');
      process.exit(0);
    } else {
      console.log('⚠️  No invoices generated this month.');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Invoice generation failed:', error);
    process.exit(1);
  }
}

main();
