const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('='.repeat(80));
  console.log('💰 EXACT REVENUE CALCULATION VERIFICATION');
  console.log('='.repeat(80));
  console.log('');

  // Get FitnessHub creator
  const creator = await prisma.creator.findFirst({
    where: { companyName: 'FitnessHub' },
    select: { id: true, companyName: true }
  });

  console.log(`Creator: ${creator.companyName}`);
  console.log(`Creator ID: ${creator.id}`);
  console.log('');

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

  console.log('─'.repeat(80));
  console.log('STEP 1: FETCH ALL PAID COMMISSIONS');
  console.log('─'.repeat(80));
  console.log(`Query: SELECT * FROM Commission WHERE creatorId = '${creator.id}' AND status = 'paid'`);
  console.log(`Result: ${allCommissions.length} commissions found`);
  console.log('');

  // Show first 5 as examples
  console.log('Sample of first 5 commissions:');
  allCommissions.slice(0, 5).forEach((comm, i) => {
    console.log(`  ${i + 1}. saleAmount: $${comm.saleAmount.toFixed(2)} | type: ${comm.paymentType}`);
  });
  console.log('  ...');
  console.log('');

  console.log('─'.repeat(80));
  console.log('STEP 2: SUM ALL saleAmount VALUES');
  console.log('─'.repeat(80));
  console.log('JavaScript code:');
  console.log('  const totalRevenue = allCommissions.reduce(');
  console.log('    (sum, comm) => sum + comm.saleAmount,');
  console.log('    0');
  console.log('  );');
  console.log('');

  // Calculate total revenue (the actual calculation!)
  const totalRevenue = allCommissions.reduce(
    (sum, comm) => sum + comm.saleAmount,
    0
  );

  console.log(`Result: $${totalRevenue.toFixed(2)}`);
  console.log('');

  console.log('─'.repeat(80));
  console.log('STEP 3: CALCULATE SPLITS');
  console.log('─'.repeat(80));

  const totalCreatorShare = allCommissions.reduce((sum, c) => sum + c.creatorShare, 0);
  const totalMemberShare = allCommissions.reduce((sum, c) => sum + c.memberShare, 0);
  const totalPlatformShare = allCommissions.reduce((sum, c) => sum + c.platformShare, 0);

  console.log(`Total Revenue (100%):    $${totalRevenue.toFixed(2)}`);
  console.log(`├─ Member Share (10%):   $${totalMemberShare.toFixed(2)}`);
  console.log(`├─ Creator Share (70%):  $${totalCreatorShare.toFixed(2)} ← Creator takes home`);
  console.log(`└─ Platform Share (20%): $${totalPlatformShare.toFixed(2)}`);
  console.log('');

  // Verify the math
  const calculatedTotal = totalMemberShare + totalCreatorShare + totalPlatformShare;
  const difference = Math.abs(totalRevenue - calculatedTotal);

  console.log('Verification (sum of splits should equal total):');
  console.log(`  $${totalMemberShare.toFixed(2)} + $${totalCreatorShare.toFixed(2)} + $${totalPlatformShare.toFixed(2)}`);
  console.log(`  = $${calculatedTotal.toFixed(2)}`);
  console.log(`  Difference: $${difference.toFixed(2)} ${difference < 0.01 ? '✅ CORRECT!' : '❌ ERROR!'}`);
  console.log('');

  console.log('─'.repeat(80));
  console.log('STEP 4: PAYMENT TYPE BREAKDOWN');
  console.log('─'.repeat(80));

  const initialCommissions = allCommissions.filter(c => c.paymentType === 'initial');
  const recurringCommissions = allCommissions.filter(c => c.paymentType === 'recurring');

  const initialRevenue = initialCommissions.reduce((sum, c) => sum + c.saleAmount, 0);
  const recurringRevenue = recurringCommissions.reduce((sum, c) => sum + c.saleAmount, 0);

  console.log(`Initial Payments:    ${initialCommissions.length} × ~$49.99 = $${initialRevenue.toFixed(2)} (${(initialRevenue/totalRevenue*100).toFixed(1)}%)`);
  console.log(`Recurring Payments:  ${recurringCommissions.length} × ~$49.99 = $${recurringRevenue.toFixed(2)} (${(recurringRevenue/totalRevenue*100).toFixed(1)}%)`);
  console.log(`Total:               ${allCommissions.length} payments = $${totalRevenue.toFixed(2)}`);
  console.log('');

  console.log('='.repeat(80));
  console.log('🎯 FINAL RESULT: THIS IS WHAT THE DASHBOARD SHOWS');
  console.log('='.repeat(80));
  console.log('');
  console.log(`💰 Total Revenue: $${totalRevenue.toFixed(2)}`);
  console.log('');
  console.log('This number represents:');
  console.log('  ✅ Sum of ALL paid commission saleAmount fields');
  console.log('  ✅ GROSS revenue (100% of subscription price)');
  console.log('  ✅ Before any splits (creator keeps 70% = $' + totalCreatorShare.toFixed(2) + ')');
  console.log('  ✅ Calculated in real-time from Commission table');
  console.log('  ✅ Includes both initial and recurring payments');
  console.log('');

  await prisma.$disconnect();
}

main().catch(console.error);
