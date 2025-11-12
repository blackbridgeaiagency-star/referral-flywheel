import logger from './lib/logger';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  logger.debug('='.repeat(80));
  logger.info(' EXACT REVENUE CALCULATION VERIFICATION');
  logger.debug('='.repeat(80));
  logger.debug('');

  // Get FitnessHub creator
  const creator = await prisma.creator.findFirst({
    where: { companyName: 'FitnessHub' },
    select: { id: true, companyName: true }
  });

  logger.debug(`Creator: ${creator.companyName}`);
  logger.debug(`Creator ID: ${creator.id}`);
  logger.debug('');

  // Get ALL paid commissions
  const allCommissions = await prisma.commission.findMany({
    where: {
      creatorId: creator.id,
      status: 'paid',
    },
    select: {
      saleAmount: true,
      creatorShare: true,
      memberShare: true,
      platformShare: true,
      paymentType: true,
    },
  });

  logger.debug('─'.repeat(80));
  logger.debug('STEP 1: FETCH ALL PAID COMMISSIONS');
  logger.debug('─'.repeat(80));
  logger.debug(`Query: SELECT * FROM Commission WHERE creatorId = '${creator.id}' AND status = 'paid'`);
  logger.debug(`Result: ${allCommissions.length} commissions found`);
  logger.debug('');

  // Show first 5 as examples
  logger.debug('Sample of first 5 commissions:');
  allCommissions.slice(0, 5).forEach((comm, i) => {
    logger.debug(`  ${i + 1}. saleAmount: $${comm.saleAmount.toFixed(2)} | type: ${comm.paymentType}`);
  });
  logger.debug('  ...');
  logger.debug('');

  logger.debug('─'.repeat(80));
  logger.debug('STEP 2: SUM ALL saleAmount VALUES');
  logger.debug('─'.repeat(80));
  logger.debug('JavaScript code:');
  logger.debug('  const totalRevenue = allCommissions.reduce(');
  logger.debug('    (sum, comm) => sum + comm.saleAmount,');
  logger.debug('    0');
  logger.debug('  );');
  logger.debug('');

  // Calculate total revenue (the actual calculation!)
  const totalRevenue = allCommissions.reduce(
    (sum, comm) => sum + comm.saleAmount,
    0
  );

  logger.debug(`Result: $${totalRevenue.toFixed(2)}`);
  logger.debug('');

  logger.debug('─'.repeat(80));
  logger.debug('STEP 3: CALCULATE SPLITS');
  logger.debug('─'.repeat(80));

  const totalCreatorShare = allCommissions.reduce((sum, c) => sum + c.creatorShare, 0);
  const totalMemberShare = allCommissions.reduce((sum, c) => sum + c.memberShare, 0);
  const totalPlatformShare = allCommissions.reduce((sum, c) => sum + c.platformShare, 0);

  logger.debug(`Total Revenue (100%):    $${totalRevenue.toFixed(2)}`);
  logger.debug(`├─ Member Share (10%):   $${totalMemberShare.toFixed(2)}`);
  logger.debug(`├─ Creator Share (70%):  $${totalCreatorShare.toFixed(2)} ← Creator takes home`);
  logger.debug(`└─ Platform Share (20%): $${totalPlatformShare.toFixed(2)}`);
  logger.debug('');

  // Verify the math
  const calculatedTotal = totalMemberShare + totalCreatorShare + totalPlatformShare;
  const difference = Math.abs(totalRevenue - calculatedTotal);

  logger.debug('Verification (sum of splits should equal total):');
  logger.debug(`  $${totalMemberShare.toFixed(2)} + $${totalCreatorShare.toFixed(2)} + $${totalPlatformShare.toFixed(2)}`);
  logger.debug(`  = $${calculatedTotal.toFixed(2)}`);
  logger.debug(`  Difference: $${difference.toFixed(2)} ${difference < 0.01 ? '✅ CORRECT!' : '❌ ERROR!'}`);
  logger.debug('');

  logger.debug('─'.repeat(80));
  logger.debug('STEP 4: PAYMENT TYPE BREAKDOWN');
  logger.debug('─'.repeat(80));

  const initialCommissions = allCommissions.filter(c => c.paymentType === 'initial');
  const recurringCommissions = allCommissions.filter(c => c.paymentType === 'recurring');

  const initialRevenue = initialCommissions.reduce((sum, c) => sum + c.saleAmount, 0);
  const recurringRevenue = recurringCommissions.reduce((sum, c) => sum + c.saleAmount, 0);

  logger.debug(`Initial Payments:    ${initialCommissions.length} × ~$49.99 = $${initialRevenue.toFixed(2)} (${(initialRevenue/totalRevenue*100).toFixed(1)}%)`);
  logger.debug(`Recurring Payments:  ${recurringCommissions.length} × ~$49.99 = $${recurringRevenue.toFixed(2)} (${(recurringRevenue/totalRevenue*100).toFixed(1)}%)`);
  logger.debug(`Total:               ${allCommissions.length} payments = $${totalRevenue.toFixed(2)}`);
  logger.debug('');

  logger.debug('='.repeat(80));
  logger.info(' FINAL RESULT: THIS IS WHAT THE DASHBOARD SHOWS');
  logger.debug('='.repeat(80));
  logger.debug('');
  logger.info(' Total Revenue: $${totalRevenue.toFixed(2)}');
  logger.debug('');
  logger.debug('This number represents:');
  logger.debug('  ✅ Sum of ALL paid commission saleAmount fields');
  logger.debug('  ✅ GROSS revenue (100% of subscription price)');
  logger.debug('  ✅ Before any splits (creator keeps 70% = $' + totalCreatorShare.toFixed(2) + ')');
  logger.debug('  ✅ Calculated in real-time from Commission table');
  logger.debug('  ✅ Includes both initial and recurring payments');
  logger.debug('');

  await prisma.$disconnect();
}

main().catch(console.error);
