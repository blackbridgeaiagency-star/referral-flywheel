import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '../../../../../lib/db/prisma';
import { generateReferralCode } from '../../../../../lib/utils/referral-code';
import { getCompany } from '../../../../../lib/whop/api-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface WhopMember {
  id: string;
  user: {
    id: string;
    username?: string;
    email?: string;
  };
  plan: {
    id: string;
    amount: number;
  };
  status: string;
}

export async function POST(request: Request) {
  try {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 1. VALIDATE WEBHOOK SIGNATURE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const body = await request.text();
    const signature = request.headers.get('whop-signature');
    const secret = process.env.WHOP_WEBHOOK_SECRET!;

    // Only validate signature if present
    if (signature) {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');

      if (signature !== expectedSignature) {
        console.error('❌ Invalid webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } else {
      console.log('⚠️  No signature (test webhook)');
    }

    const payload = JSON.parse(body);
    console.log('📦 Install webhook received:', payload.action);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 2. HANDLE APP INSTALL EVENT
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (payload.action === 'app.installed') {
      const { data } = payload;

      if (!data || !data.company_id || !data.product_id) {
        console.error('❌ Missing required install webhook data:', { data });
        return NextResponse.json(
          { error: 'Missing required install data' },
          { status: 400 }
        );
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 3. FETCH COMPANY DETAILS FROM WHOP API
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      let companyData = {
        name: data.company_name || 'New Community',
        logoUrl: null as string | null,
        description: null as string | null,
      };

      try {
        console.log(`📡 Fetching company details from Whop API...`);
        const whopCompany = await getCompany(data.company_id);
        companyData = {
          name: whopCompany.name || companyData.name,
          logoUrl: whopCompany.image_url || null,
          description: whopCompany.description || null,
        };
        console.log(`✅ Company data fetched: ${companyData.name}`);
      } catch (apiError) {
        console.warn(`⚠️ Could not fetch company details from Whop:`, apiError);
        // Continue with default data
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 4. CREATE OR UPDATE CREATOR
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      let creator = await prisma.creator.findUnique({
        where: { companyId: data.company_id }
      });

      if (creator) {
        console.log(`✅ Creator already exists: ${creator.companyName}`);
        // Update with latest Whop data
        creator = await prisma.creator.update({
          where: { companyId: data.company_id },
          data: {
            companyName: companyData.name,
            logoUrl: companyData.logoUrl,
            description: companyData.description,
          }
        });
        console.log(`✅ Creator updated with latest Whop data`);
      } else {
        creator = await prisma.creator.create({
          data: {
            companyId: data.company_id,
            companyName: companyData.name,
            productId: data.product_id,
            logoUrl: companyData.logoUrl,
            description: companyData.description,
            welcomeMessage: 'Welcome! You can now earn 10% commissions by referring friends.',
            isActive: true,
          }
        });
        console.log(`✅ Creator created: ${creator.companyName}`);
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 4. FETCH EXISTING MEMBERS FROM WHOP API
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const whopApiKey = process.env.WHOP_API_KEY;
      if (!whopApiKey) {
        console.error('❌ WHOP_API_KEY not configured');
        return NextResponse.json(
          { error: 'Whop API not configured' },
          { status: 500 }
        );
      }

      try {
        console.log('📥 Fetching existing members from Whop...');

        // Fetch members from Whop API
        const membersResponse = await fetch(
          `https://api.whop.com/api/v2/memberships?company_id=${data.company_id}`,
          {
            headers: {
              'Authorization': `Bearer ${whopApiKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!membersResponse.ok) {
          console.error('❌ Failed to fetch members from Whop:', membersResponse.status);
          // Continue without members import - creator can add them manually
          return NextResponse.json({
            ok: true,
            creator: { id: creator.id },
            warning: 'Creator created but member import failed'
          });
        }

        const membersData = await membersResponse.json();
        const members: WhopMember[] = membersData.data || [];

        console.log(`📊 Found ${members.length} existing members to import`);

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // 5. IMPORT MEMBERS IN BATCH
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        const importedCount = await importMembers(members, creator.id);

        console.log(`✅ Imported ${importedCount} members successfully`);

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // 6. SEND WELCOME MESSAGES TO ALL MEMBERS
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // TODO: Phase 2 - Send welcome emails
        console.log('📧 Welcome messages will be sent via email service (Phase 2)');

        return NextResponse.json({
          ok: true,
          creator: {
            id: creator.id,
            companyName: creator.companyName
          },
          membersImported: importedCount
        });

      } catch (apiError) {
        console.error('❌ Error fetching members from Whop:', apiError);
        // Return success for creator creation even if import fails
        return NextResponse.json({
          ok: true,
          creator: { id: creator.id },
          warning: 'Creator created but member import failed'
        });
      }
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('❌ Install webhook error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INSTALL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPER: Import members in batch with proper error handling
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function importMembers(members: WhopMember[], creatorId: string): Promise<number> {
  let importedCount = 0;

  for (const whopMember of members) {
    try {
      // Skip if member already exists
      const existingMember = await prisma.member.findUnique({
        where: { membershipId: whopMember.id }
      });

      if (existingMember) {
        console.log(`⏭️  Skipping existing member: ${whopMember.id}`);
        continue;
      }

      // Get username for display (but not for the referral code)
      let username = 'member';
      if (whopMember.user.username) {
        username = whopMember.user.username;
      } else if (whopMember.user.email) {
        username = whopMember.user.email.split('@')[0];
      }

      // Generate privacy-safe referral code (no PII)
      const referralCode = generateReferralCode();
      const subscriptionPrice = whopMember.plan.amount / 100; // Convert cents to dollars

      // Create member record
      await prisma.member.create({
        data: {
          userId: whopMember.user.id,
          membershipId: whopMember.id,
          email: whopMember.user.email || `${username}@example.com`,
          username,
          referralCode,
          subscriptionPrice,
          memberOrigin: 'organic', // All existing members are organic
          creatorId,
        }
      });

      importedCount++;
      console.log(`✅ Imported: ${username} → ${referralCode}`);

    } catch (memberError) {
      console.error(`❌ Failed to import member ${whopMember.id}:`, memberError);
      // Continue with next member instead of failing entire import
      continue;
    }
  }

  return importedCount;
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'Install webhook endpoint is alive',
    timestamp: new Date().toISOString()
  });
}
