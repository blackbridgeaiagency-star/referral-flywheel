// Fetch membership from Whop API to check affiliate_username field
require('dotenv').config({ path: '.env.local' });

const WHOP_API_KEY = process.env.WHOP_API_KEY;

async function fetchMembershipDetails(membershipId) {
  console.log(`\n🔍 Fetching membership: ${membershipId}\n`);

  try {
    const response = await fetch(
      `https://api.whop.com/api/v2/memberships/${membershipId}`,
      {
        headers: {
          'Authorization': `Bearer ${WHOP_API_KEY}`,
          'Content-Type': 'application/json',
        }
      }
    );

    if (!response.ok) {
      console.log(`❌ Error: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.log(text);
      return;
    }

    const data = await response.json();

    console.log('✅ Membership fetched successfully!\n');
    console.log('All fields:', Object.keys(data).join(', '));

    // Check for affiliate fields
    console.log('\n🎯 AFFILIATE FIELDS:');
    console.log(`  affiliate_username: ${data.affiliate_username || 'NOT PRESENT'}`);
    console.log(`  affiliate_page_url: ${data.affiliate_page_url || 'NOT PRESENT'}`);

    // Show some context
    console.log('\n📋 Membership context:');
    console.log(`  id: ${data.id}`);
    console.log(`  status: ${data.status}`);
    console.log(`  user_id: ${data.user_id}`);
    console.log(`  created_at: ${data.created_at}`);

    if (data.affiliate_username) {
      console.log('\n🎉 SUCCESS! Whop API returns affiliate_username!');
      console.log('Strategy B is VALIDATED - we can read affiliate data from API.');
    } else {
      console.log('\n⚠️  No affiliate_username on this membership.');
      console.log('   This means either:');
      console.log('   1. This member was NOT referred by anyone');
      console.log('   2. Purchase was made without ?a=username parameter');
      console.log('   3. Member affiliate program was not enabled');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Get membership ID from command line or use from recent webhooks
const membershipId = process.argv[2] || 'mem_nePhZvdqdLOKsZ'; // From your webhook

console.log('═'.repeat(60));
console.log('WHOP MEMBERSHIP AFFILIATE CHECK');
console.log('═'.repeat(60));
console.log(`\nUsage: node scripts/fetch-membership-affiliate.js <membership_id>`);
console.log(`Example: node scripts/fetch-membership-affiliate.js mem_ABC123\n`);

if (!WHOP_API_KEY) {
  console.log('❌ WHOP_API_KEY not found in environment!');
  process.exit(1);
}

fetchMembershipDetails(membershipId);
