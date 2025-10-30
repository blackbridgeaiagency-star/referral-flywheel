// app/page.tsx
/**
 * Main entry point for the Referral Flywheel app
 *
 * This page determines whether the user is a:
 * 1. Creator (community owner) - routes to creator dashboard
 * 2. Member (referral partner) - routes to member dashboard
 * 3. New visitor - shows landing page
 */

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { headers } from 'next/headers';

async function getUserContext() {
  // Check for Whop context in headers
  const headersList = headers();

  // Whop passes these when users access the app
  const userId = headersList.get('whop-user-id');
  const companyId = headersList.get('whop-company-id');
  const membershipId = headersList.get('whop-membership-id');

  return {
    userId,
    companyId,
    membershipId
  };
}

export default async function HomePage({
  searchParams
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  // Get user context from Whop
  const context = await getUserContext();

  // Check URL params as fallback (Whop passes context in URL)
  const urlCompanyId = searchParams.company_id as string;
  const urlUserId = searchParams.user_id as string;
  const urlMembershipId = searchParams.membership_id as string;
  const urlExperienceId = searchParams.experience_id as string;
  const urlIsOwner = searchParams.is_owner === 'true' || searchParams.role === 'owner';

  const companyId = context.companyId || urlCompanyId || urlExperienceId;
  const userId = context.userId || urlUserId;
  const membershipId = context.membershipId || urlMembershipId;

  console.log('🔍 App Entry Context:', {
    companyId,
    userId,
    membershipId,
    isOwner: urlIsOwner,
    searchParams
  });

  // If no context, show landing page
  if (!companyId && !userId && !membershipId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-black text-white">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Referral Flywheel
            </h1>
            <p className="text-2xl mb-8 text-gray-300">
              Turn every member into a growth engine with 10% lifetime commissions
            </p>

            <div className="bg-black/50 backdrop-blur-lg rounded-2xl p-8 mb-8">
              <h2 className="text-3xl font-bold mb-6">How It Works</h2>

              <div className="grid md:grid-cols-2 gap-6 text-left">
                <div className="bg-purple-900/20 p-6 rounded-xl">
                  <h3 className="text-xl font-bold mb-3 text-purple-400">For Creators</h3>
                  <ul className="space-y-2 text-gray-300">
                    <li>✓ Install the app in your Whop community</li>
                    <li>✓ Every member gets a unique referral link</li>
                    <li>✓ Members earn 10% lifetime commissions</li>
                    <li>✓ You keep 70% of all revenue</li>
                    <li>✓ Watch your community grow virally</li>
                  </ul>
                </div>

                <div className="bg-pink-900/20 p-6 rounded-xl">
                  <h3 className="text-xl font-bold mb-3 text-pink-400">For Members</h3>
                  <ul className="space-y-2 text-gray-300">
                    <li>✓ Get your unique referral code instantly</li>
                    <li>✓ Share with friends and followers</li>
                    <li>✓ Earn 10% on every payment, forever</li>
                    <li>✓ Track earnings in real-time</li>
                    <li>✓ Compete on the leaderboard</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-1 rounded-xl">
              <a
                href={`https://whop.com/apps/${process.env.NEXT_PUBLIC_WHOP_APP_ID || 'referral-flywheel'}/install`}
                className="block bg-black hover:bg-gray-900 text-white py-4 px-8 rounded-xl font-bold text-xl transition-colors"
              >
                Install on Whop →
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // CRITICAL: Determine if user is creator or member
  try {
    // Check if this is the creator/owner
    if (urlIsOwner && companyId) {
      console.log('👑 Owner detected, checking creator status...');

      // Check if creator exists
      const creator = await prisma.creator.findUnique({
        where: { companyId: companyId }
      });

      if (!creator) {
        console.log('🆕 New creator, creating account...');
        // First time setup - create creator and redirect to onboarding
        const newCreator = await prisma.creator.create({
          data: {
            companyId: companyId,
            companyName: searchParams.company_name as string || companyId,
            productId: searchParams.product_id as string || '',
            isActive: true,
            onboardingCompleted: false
          }
        });

        // Redirect to onboarding wizard
        redirect(`/seller-product/${companyId}/onboarding`);
      }

      // Check if onboarding is complete
      if (!creator.onboardingCompleted) {
        console.log('📝 Onboarding incomplete, redirecting...');
        redirect(`/seller-product/${companyId}/onboarding`);
      }

      console.log('✅ Creator verified, redirecting to dashboard...');
      // Redirect to creator dashboard
      redirect(`/seller-product/${companyId}`);
    }

    // Check if this is a member by membership ID
    if (membershipId) {
      console.log('🔍 Checking membership:', membershipId);
      const member = await prisma.member.findUnique({
        where: { membershipId },
        include: { creator: true }
      });

      if (member) {
        console.log('✅ Member found, redirecting to dashboard...');
        // Redirect to member dashboard
        redirect(`/customer/${member.creator.companyId}`);
      }
    }

    // Try to find member by userId
    if (userId && companyId) {
      console.log('🔍 Checking user:', userId);
      const member = await prisma.member.findFirst({
        where: {
          userId,
          creator: { companyId }
        },
        include: { creator: true }
      });

      if (member) {
        console.log('✅ Member found by user ID, redirecting...');
        redirect(`/customer/${member.creator.companyId}`);
      }

      // User exists but no member record - they might need to be created
      // Check if creator exists first
      const creator = await prisma.creator.findUnique({
        where: { companyId }
      });

      if (!creator) {
        console.log('❌ No creator found for company:', companyId);
        // Show error - app not installed properly
        return (
          <div className="min-h-screen bg-black text-white flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-4 text-red-500">App Not Configured</h1>
              <p className="text-gray-400">
                This community hasn't set up Referral Flywheel yet.
              </p>
              <p className="text-sm text-gray-500 mt-4">
                Please ask the community owner to install the app.
              </p>
            </div>
          </div>
        );
      }

      // Creator exists but no member - redirect to customer page
      // The page will handle member creation if needed
      console.log('📋 No member record, redirecting to customer page for creation...');
      redirect(`/customer/${companyId}?user_id=${userId}`);
    }

    // Default case - show waiting page
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Connecting to Whop...</h1>
          <p className="text-gray-400">
            Please access this app through your Whop dashboard.
          </p>
          <p className="text-sm text-gray-500 mt-4">
            If you're a creator, install the app from the Whop marketplace.
            <br />
            If you're a member, access it through your community.
          </p>
        </div>
      </div>
    );

  } catch (error) {
    console.error('❌ Error routing user:', error);

    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4 text-red-500">Error</h1>
          <p className="text-gray-400">
            Unable to load your account. Please try again or contact support.
          </p>
          <pre className="text-xs text-gray-600 mt-4 text-left max-w-md">
            {JSON.stringify({ companyId, userId, membershipId }, null, 2)}
          </pre>
        </div>
      </div>
    );
  }
}
