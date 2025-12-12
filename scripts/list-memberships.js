// List memberships from your company to see field structure
require('dotenv').config({ path: '.env.local' });

const WHOP_API_KEY = process.env.WHOP_API_KEY;
const COMPANY_ID = 'biz_kkGoY7OvzWXRdK'; // Your company

async function listMemberships() {
  console.log('\n🔍 Fetching memberships from Whop API...\n');

  try {
    const response = await fetch(
      `https://api.whop.com/api/v2/memberships?company_id=${COMPANY_ID}&per=5`,
      {
        headers: {
          'Authorization': `Bearer ${WHOP_API_KEY}`,
          'Content-Type': 'application/json',
        }
      }
    );

    if (!response.ok) {
      console.log(`❌ Error: ${response.status}`);
      const text = await response.text();
      console.log(text);
      return;
    }

    const result = await response.json();
    const memberships = result.data || result;

    if (!memberships || memberships.length === 0) {
      console.log('No memberships found for this company.');
      console.log('\nTrying alternative endpoint...\n');

      // Try v5 API
      const v5Response = await fetch(
        `https://api.whop.com/api/v5/company/${COMPANY_ID}/memberships?per_page=5`,
        {
          headers: {
            'Authorization': `Bearer ${WHOP_API_KEY}`,
          }
        }
      );

      if (v5Response.ok) {
        const v5Data = await v5Response.json();
        console.log('V5 API response structure:', Object.keys(v5Data));
      }
      return;
    }

    console.log(`Found ${memberships.length} membership(s)\n`);

    for (const mem of memberships) {
      console.log('━'.repeat(50));
      console.log(`Membership: ${mem.id}`);
      console.log(`Status: ${mem.status}`);
      console.log(`User ID: ${mem.user_id}`);

      // KEY FIELDS WE'RE LOOKING FOR
      console.log('\n🎯 AFFILIATE FIELDS:');
      console.log(`  affiliate_username: ${mem.affiliate_username ?? 'FIELD NOT PRESENT'}`);
      console.log(`  affiliate_page_url: ${mem.affiliate_page_url ?? 'FIELD NOT PRESENT'}`);

      // Show all fields to see what's available
      console.log('\n📋 All fields:', Object.keys(mem).join(', '));
    }

    console.log('\n' + '━'.repeat(50));
    console.log('\n✅ If you see "affiliate_username" in the fields list,');
    console.log('   Strategy B is VALIDATED - the field exists!\n');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

if (!WHOP_API_KEY) {
  console.log('❌ WHOP_API_KEY not found!');
  process.exit(1);
}

listMemberships();
