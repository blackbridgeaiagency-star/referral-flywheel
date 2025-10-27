// Manual Business Logic Testing Script
import { calculateCommission } from '../lib/utils/commission';
import { generateReferralCode, isValidReferralCode } from '../lib/utils/referral-code';

console.log('🧪 BUSINESS LOGIC TESTING\n');
console.log('=' . repeat(60));

// Test 1: Commission Calculation
console.log('\n📊 TEST 1: Commission Calculation (10/70/20 split)');
console.log('─'.repeat(60));

const testSales = [49.99, 99.99, 29.99, 199.99];

testSales.forEach(saleAmount => {
  const result = calculateCommission(saleAmount);
  const totalPercent = ((result.memberShare + result.creatorShare + result.platformShare) / saleAmount) * 100;

  console.log(`\nSale Amount: $${saleAmount.toFixed(2)}`);
  console.log(`  Member (10%):   $${result.memberShare.toFixed(2)} (${((result.memberShare/saleAmount)*100).toFixed(2)}%)`);
  console.log(`  Creator (70%):  $${result.creatorShare.toFixed(2)} (${((result.creatorShare/saleAmount)*100).toFixed(2)}%)`);
  console.log(`  Platform (20%): $${result.platformShare.toFixed(2)} (${((result.platformShare/saleAmount)*100).toFixed(2)}%)`);
  console.log(`  Total:          $${result.total.toFixed(2)} (${totalPercent.toFixed(2)}%)`);

  // Validation
  const isValid = Math.abs(result.total - saleAmount) < 0.01;
  console.log(`  ✅ Valid: ${isValid ? 'YES' : 'NO'}`);
});

// Test 2: Referral Code Generation
console.log('\n\n🔗 TEST 2: Referral Code Generation');
console.log('─'.repeat(60));

const testNames = [
  'Jessica Garcia',
  'Mike O\'Connor',
  'user@example.com',
  'Alice',
  '123Invalid',
  'José María',
  'a b c d e f g h i j k l m n o p' // Very long name
];

testNames.forEach(name => {
  const code = generateReferralCode(name);
  const isValid = isValidReferralCode(code);
  console.log(`\nInput: "${name}"`);
  console.log(`  Generated: ${code}`);
  console.log(`  Valid: ${isValid ? '✅' : '❌'}`);
  console.log(`  Format: ${/^[A-Z]+-[A-Z0-9]{6}$/.test(code) ? '✅' : '❌'}`);
});

// Test 3: Referral Code Validation
console.log('\n\n✔️  TEST 3: Referral Code Validation');
console.log('─'.repeat(60));

const testCodes = [
  { code: 'JESSICA-NSZP83', expected: true },
  { code: 'MIKE-A2X9K7', expected: true },
  { code: 'USER-123456', expected: true },
  { code: 'jessica-nszp83', expected: false }, // lowercase
  { code: 'JESSICA-NSZ', expected: false }, // too short
  { code: 'JESSICA-NSZP834', expected: false }, // too long
  { code: 'JESSICA_NSZP83', expected: false }, // wrong separator
  { code: 'NSZP83', expected: false }, // missing prefix
  { code: 'JESSICA-NSZ P83', expected: false }, // space
  { code: 'JESSICA-NSZ!83', expected: false }, // special char
];

testCodes.forEach(({ code, expected }) => {
  const result = isValidReferralCode(code);
  const status = result === expected ? '✅' : '❌';
  console.log(`${status} "${code}" → ${result} (expected: ${expected})`);
});

// Test 4: Edge Cases
console.log('\n\n⚠️  TEST 4: Edge Cases');
console.log('─'.repeat(60));

console.log('\nEdge Case 1: Zero sale amount');
try {
  const result = calculateCommission(0);
  console.log(`  $0.00 → Member: $${result.memberShare}, Creator: $${result.creatorShare}, Platform: $${result.platformShare}`);
  console.log(`  ✅ Handled gracefully`);
} catch (error) {
  console.log(`  ❌ Error: ${error.message}`);
}

console.log('\nEdge Case 2: Negative sale amount');
try {
  const result = calculateCommission(-10);
  console.log(`  -$10.00 → Member: $${result.memberShare}, Creator: $${result.creatorShare}, Platform: $${result.platformShare}`);
  console.log(`  ⚠️  Warning: Negative amounts allowed (may need validation)`);
} catch (error) {
  console.log(`  ❌ Error: ${error.message}`);
}

console.log('\nEdge Case 3: Very large sale amount');
try {
  const result = calculateCommission(999999.99);
  console.log(`  $999,999.99 → Total: $${result.total.toFixed(2)}`);
  console.log(`  ✅ Handled gracefully`);
} catch (error) {
  console.log(`  ❌ Error: ${error.message}`);
}

console.log('\nEdge Case 4: Empty name for referral code');
try {
  const code = generateReferralCode('');
  const isValid = isValidReferralCode(code);
  console.log(`  Empty string → "${code}" (Valid: ${isValid})`);
  console.log(`  ${isValid ? '✅' : '❌'} Handled gracefully`);
} catch (error) {
  console.log(`  ❌ Error: ${error.message}`);
}

// Test 5: Business Rule Validation
console.log('\n\n📋 TEST 5: Business Rules Validation');
console.log('─'.repeat(60));

console.log('\n✅ LOCKED BUSINESS RULES:');
console.log('  - Member Commission: 10% (lifetime recurring)');
console.log('  - Creator Commission: 70%');
console.log('  - Platform Commission: 20%');
console.log('  - Attribution Window: 30 days');
console.log('  - Referral Code Format: FIRSTNAME-ABC123');

// Validate with sample sale
const sampleSale = 49.99;
const { memberShare, creatorShare, platformShare } = calculateCommission(sampleSale);
const memberPercent = (memberShare / sampleSale) * 100;
const creatorPercent = (creatorShare / sampleSale) * 100;
const platformPercent = (platformShare / sampleSale) * 100;

console.log('\n🔍 Validation Results:');
console.log(`  Member %: ${memberPercent.toFixed(2)}% ${Math.abs(memberPercent - 10) < 0.5 ? '✅' : '❌'}`);
console.log(`  Creator %: ${creatorPercent.toFixed(2)}% ${Math.abs(creatorPercent - 70) < 0.5 ? '✅' : '❌'}`);
console.log(`  Platform %: ${platformPercent.toFixed(2)}% ${Math.abs(platformPercent - 20) < 0.5 ? '✅' : '❌'}`);

console.log('\n' + '='.repeat(60));
console.log('✅ ALL BUSINESS LOGIC TESTS COMPLETED');
console.log('='.repeat(60) + '\n');
