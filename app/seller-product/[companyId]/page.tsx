// app/seller-product/[experienceId]/page.tsx
import { Suspense } from 'react';
import { prisma } from '../../../lib/db/prisma';
import { getCompleteCreatorDashboardData } from '../../../lib/data/centralized-queries';
import { createCreatorWithWhopData } from '../../../lib/whop/sync-creator';
import { RevenueMetrics } from '../../../components/dashboard/RevenueMetrics';
import { TopPerformersTable } from '../../../components/dashboard/TopPerformersTable';
import { CommunityStatsGrid } from '../../../components/dashboard/CommunityStatsGrid';
import { RewardManagementForm } from '../../../components/dashboard/RewardManagementForm';
import { CreatorOnboardingBanner } from '../../../components/dashboard/CreatorOnboardingBanner';
import { formatCurrency } from '../../../lib/utils/commission';
import { getWhopContext, canAccessCreatorDashboard } from '../../../lib/whop/simple-auth';
import logger from '../../../lib/logger';


interface CreatorDashboardPageProps {
  params: {
    companyId: string;
  };
}

export default async function CreatorDashboardPage({ params }: CreatorDashboardPageProps) {
  const { companyId: experienceId } = params;  // Use companyId but alias to experienceId for compatibility

  // ========================================
  // SIMPLIFIED AUTHENTICATION
  // ========================================
  // Whop handles authentication in their iframe
  // We just need to check if they're allowed to access
  const canAccess = await canAccessCreatorDashboard(experienceId);

  // Get Whop context for user info (optional)
  const whopContext = await getWhopContext();
  const authenticatedUserId = whopContext.userId;

  try {
    // ========================================
    // P0 CRITICAL: Handle both companyId and productId
    // Whop Dashboard View passes companyId (biz_*)
    // Direct access uses productId (prod_*)
    // ========================================
    const isCompanyId = experienceId.startsWith('biz_');
    const isProductId = experienceId.startsWith('prod_');

    if (!isCompanyId && !isProductId) {
      throw new Error(`Invalid ID format: ${experienceId}. Expected biz_* or prod_*`);
    }

    // ========================================
    // P0 CRITICAL: Automatic Creator Onboarding
    // Auto-create creator record if it doesn't exist
    // This ensures new app installations work immediately
    // ========================================

    // When we have authenticated user, we could enhance lookup to also check whopUserId
    // This would allow finding creator even if accessing with different company/product ID
    let creator = await prisma.creator.findFirst({
    where: isCompanyId ? { companyId: experienceId } : { productId: experienceId },
    select: {
      id: true,
      companyName: true,
      productId: true,
      onboardingCompleted: true,
      tier1Count: true,
      tier1Reward: true,
      tier2Count: true,
      tier2Reward: true,
      tier3Count: true,
      tier3Reward: true,
      tier4Count: true,
      tier4Reward: true,
      autoApproveRewards: true,
      welcomeMessage: true,
      customRewardEnabled: true,
      customRewardTimeframe: true,
      customRewardType: true,
      customReward1st: true,
      customReward2nd: true,
      customReward3rd: true,
      customReward4th: true,
      customReward5th: true,
      customReward6to10: true,
    },
  });

  // Auto-create creator if this is their first time accessing the app
  if (!creator) {
    logger.info(`Auto-creating creator for ${isCompanyId ? 'company' : 'product'}: ${experienceId}`);

    try {
      // ✨ NEW: Fetch real company data from Whop API
      const creatorData = await createCreatorWithWhopData({
        companyId: experienceId,
        productId: experienceId,
      });

      // Fetch the newly created creator with all fields
      creator = await prisma.creator.findUnique({
        where: { id: creatorData.creatorId },
        select: {
          id: true,
          companyName: true,
          productId: true,
          onboardingCompleted: true,
          tier1Count: true,
          tier1Reward: true,
          tier2Count: true,
          tier2Reward: true,
          tier3Count: true,
          tier3Reward: true,
          tier4Count: true,
          tier4Reward: true,
          autoApproveRewards: true,
          welcomeMessage: true,
          customRewardEnabled: true,
          customRewardTimeframe: true,
          customRewardType: true,
          customReward1st: true,
          customReward2nd: true,
          customReward3rd: true,
          customReward4th: true,
          customReward5th: true,
          customReward6to10: true,
        },
      });

      logger.info(`Creator auto-created with Whop data: ${creatorData.companyName} (${creatorData.creatorId})`);
    } catch (error) {
      logger.error('❌ Failed to create creator with Whop data, using fallback:', error);

      // Fallback: Create with defaults if Whop API fails
      creator = await prisma.creator.create({
        data: {
          productId: experienceId,
          companyId: experienceId,
          companyName: experienceId, // Use experienceId as fallback - will show actual ID instead of generic name
          tier1Count: 3,
          tier1Reward: 'Early Supporter Badge',
          tier2Count: 5,
          tier2Reward: 'Community Champion Badge',
          tier3Count: 10,
          tier3Reward: 'VIP Access',
          tier4Count: 25,
          tier4Reward: 'Lifetime Pro Access',
          autoApproveRewards: false,
          welcomeMessage: 'Welcome to our referral program! Share your unique link to earn rewards.',
          customRewardEnabled: false,
          customRewardTimeframe: 'monthly',
          customRewardType: 'top_earners',
        },
        select: {
          id: true,
          companyName: true,
          productId: true,
          tier1Count: true,
          tier1Reward: true,
          tier2Count: true,
          tier2Reward: true,
          tier3Count: true,
          tier3Reward: true,
          tier4Count: true,
          tier4Reward: true,
          autoApproveRewards: true,
          welcomeMessage: true,
          customRewardEnabled: true,
          customRewardTimeframe: true,
          customRewardType: true,
          customReward1st: true,
          customReward2nd: true,
          customReward3rd: true,
          customReward4th: true,
          customReward5th: true,
          customReward6to10: true,
        },
      });

      logger.info(`Creator auto-created with fallback data: ${creator.id}`);
    }
  }

  // ========================================
  // P0 CRITICAL: Safety check after auto-creation
  // ========================================
  if (!creator) {
    throw new Error('Failed to create or find creator. Please contact support.');
  }

  // ========================================
  // P0 CRITICAL: Performance Optimization
  // Fetch dashboard data using productId from creator record
  // This works for both companyId and productId access
  // ========================================
  const dashboardData = await getCompleteCreatorDashboardData(creator.productId);

  return (
    <div className="min-h-screen bg-[#0F0F0F]">
      {/* Header */}
      <header className="bg-[#1A1A1A] border-b border-[#2A2A2A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1 sm:mb-2">
                {creator.companyName} Affiliate Dashboard
              </h1>
              <p className="text-gray-400 text-sm sm:text-base">
                Monitor your referral program performance and manage rewards
              </p>
            </div>
            <div className="w-full sm:w-auto">
              <a
                href="https://whop.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-full sm:w-auto px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm sm:text-base rounded-lg transition-colors"
              >
                Back to Whop
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="space-y-8">
          {/* First-Time Creator Onboarding */}
          <CreatorOnboardingBanner
            showOnboarding={!creator.onboardingCompleted}
            creatorId={creator.id}
            currentName={creator.companyName}
          />

          {/* Revenue Metrics - ✅ USING CENTRALIZED DATA */}
          <Suspense fallback={<LoadingCard />}>
            <RevenueMetrics
              revenueBreakdown={{
                totalRevenue: dashboardData.revenueStats.totalRevenue,
                totalMonthlyRevenue: dashboardData.revenueStats.monthlyRecurringRevenue,
                referralContribution: dashboardData.revenueStats.referralContribution,
                activeSubscriptions: dashboardData.revenueStats.referredCount, // Use referred count as active subscriptions
                totalActiveClicks: dashboardData.revenueStats.totalActiveClicks,
                convertedActiveClicks: dashboardData.revenueStats.convertedClicks,
                organicCount: dashboardData.revenueStats.organicCount,
                referredCount: dashboardData.revenueStats.referredCount,
                totalMembers: dashboardData.revenueStats.totalMembers,
              }}
            />
          </Suspense>

          {/* Community Stats - ✅ USING CENTRALIZED DATA + TOP 10 FIX */}
          <Suspense fallback={<LoadingCard />}>
            <CommunityStatsGrid
              stats={{
                totalMembers: dashboardData.revenueStats.totalMembers,
                avgReferralsPerMember: dashboardData.revenueStats.totalMembers > 0
                  ? (dashboardData.revenueStats.referredCount / dashboardData.revenueStats.totalMembers)
                  : 0,
                avgEarningsPerMember: dashboardData.revenueStats.totalRevenue / Math.max(dashboardData.revenueStats.totalMembers, 1),
                totalClicks: dashboardData.revenueStats.totalActiveClicks,
                convertedClicks: dashboardData.revenueStats.convertedClicks,
                organicSignups: dashboardData.revenueStats.organicCount,
                attributionRate: dashboardData.revenueStats.totalMembers > 0
                  ? (dashboardData.revenueStats.referredCount / dashboardData.revenueStats.totalMembers) * 100
                  : 0,
                totalReferrals: dashboardData.revenueStats.referredCount,
                totalRevenue: dashboardData.revenueStats.totalRevenue,
                monthlyRevenue: dashboardData.revenueStats.monthlyRevenue,
                totalSharesSent: dashboardData.revenueStats.totalShares,
                topPerformerContribution: dashboardData.topPerformerContribution.topPerformerContribution,
                topPerformerTotal: dashboardData.topPerformerContribution.topEarnersTotal,
                // 🎮 GAMIFICATION METRICS
                globalRevenueRank: dashboardData.revenueStats.globalRevenueRank,
                globalReferralRank: dashboardData.revenueStats.globalReferralRank,
                totalCreators: dashboardData.revenueStats.totalCreators,
                referralMomentum: dashboardData.revenueStats.referralMomentum,
                membersWithReferrals: dashboardData.revenueStats.membersWithReferrals,
                // ✅ NEW GAMIFICATION METRICS
                shareToConversionRate: dashboardData.revenueStats.shareToConversionRate,
                monthlyGrowthRate: dashboardData.revenueStats.monthlyGrowthRate,
                thisMonthReferrals: dashboardData.revenueStats.thisMonthReferrals,
                lastMonthReferrals: dashboardData.revenueStats.lastMonthReferrals,
              }}
              organicCount={dashboardData.revenueStats.organicCount}
              referredCount={dashboardData.revenueStats.referredCount}
            />
          </Suspense>

          {/* Top Referrers - ✅ USING CENTRALIZED DATA */}
          <Suspense fallback={<LoadingCard />}>
            <TopPerformersTable
              performers={dashboardData.topReferrers}
              totalRevenue={dashboardData.revenueStats.totalRevenue}
            />
          </Suspense>

          {/* Reward Management (includes tier rewards + custom competitions) */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">Reward Management</h2>
            <Suspense fallback={<LoadingCard />}>
              <RewardManagementForm
                creatorId={creator.id}
                initialTiers={{
                  tier1: { count: creator.tier1Count, reward: creator.tier1Reward },
                  tier2: { count: creator.tier2Count, reward: creator.tier2Reward },
                  tier3: { count: creator.tier3Count, reward: creator.tier3Reward },
                  tier4: { count: creator.tier4Count, reward: creator.tier4Reward },
                }}
                autoApproveRewards={creator.autoApproveRewards}
                welcomeMessage={creator.welcomeMessage}
                customRewardEnabled={creator.customRewardEnabled}
                customRewardTimeframe={creator.customRewardTimeframe}
                customRewardType={creator.customRewardType}
                customReward1st={creator.customReward1st}
                customReward2nd={creator.customReward2nd}
                customReward3rd={creator.customReward3rd}
                customReward4th={creator.customReward4th}
                customReward5th={creator.customReward5th}
                customReward6to10={creator.customReward6to10}
              />
            </Suspense>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#1A1A1A] border-t border-[#2A2A2A] mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-gray-500 text-sm">
            Powered by Referral Flywheel • Built for Whop Communities
          </p>
        </div>
      </footer>
    </div>
  );
  } catch (error) {
    logger.error('Error loading creator dashboard:', error);

    // Determine error type and provide specific guidance
    let errorTitle = "Dashboard Loading Error";
    let errorDetails = [];
    let troubleshootingSteps = [];
    let errorCode = "UNKNOWN";

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes("Can't reach database server")) {
      errorTitle = "Database Connection Failed";
      errorCode = "DB_UNREACHABLE";
      errorDetails = [
        "Cannot connect to the database server",
        "The Supabase project may be paused or inactive",
        "Database credentials may be incorrect"
      ];
      troubleshootingSteps = [
        "Check if your Supabase project is active at supabase.com",
        "Verify DATABASE_URL is correctly set in Vercel environment variables",
        "Ensure password is properly URL-encoded if it contains special characters",
        "Use pooling connection (port 6543) with ?pgbouncer=true"
      ];
    } else if (errorMessage.includes("P1001") || errorMessage.includes("timeout")) {
      errorTitle = "Database Connection Timeout";
      errorCode = "DB_TIMEOUT";
      errorDetails = [
        "Database server is unreachable",
        "Network connection issues",
        "Firewall or security group blocking connection"
      ];
      troubleshootingSteps = [
        "Check Supabase dashboard for any ongoing issues",
        "Verify network connectivity from Vercel",
        "Check if IP allowlist is configured in Supabase"
      ];
    } else if (errorMessage.includes("authentication failed") || errorMessage.includes("P1000")) {
      errorTitle = "Database Authentication Failed";
      errorCode = "DB_AUTH";
      errorDetails = [
        "Invalid database credentials",
        "Password may have changed",
        "User permissions issue"
      ];
      troubleshootingSteps = [
        "Verify database password in Supabase settings",
        "Update DATABASE_URL in Vercel with correct password",
        "Check if password contains special characters that need encoding"
      ];
    } else if (errorMessage.includes("P1003")) {
      errorTitle = "Database Not Found";
      errorCode = "DB_NOT_FOUND";
      errorDetails = [
        "The specified database does not exist",
        "Wrong database name in connection string"
      ];
      troubleshootingSteps = [
        "Verify database name in DATABASE_URL",
        "Check Supabase project settings for correct database name",
        "Ensure using 'postgres' as the database name"
      ];
    } else if (errorMessage.includes("relation") && errorMessage.includes("does not exist")) {
      errorTitle = "Database Schema Issue";
      errorCode = "DB_SCHEMA";
      errorDetails = [
        "Database tables are missing",
        "Migrations have not been run",
        "Schema out of sync"
      ];
      troubleshootingSteps = [
        "Run 'npx prisma db push' to create tables",
        "Verify Prisma schema matches database",
        "Check if migrations need to be applied"
      ];
    } else {
      errorDetails = [
        "An unexpected error occurred",
        "This might be a temporary issue",
        "Please check the error details below"
      ];
      troubleshootingSteps = [
        "Check Vercel function logs for more details",
        "Verify all environment variables are set",
        "Try accessing /api/health for system status",
        "Test database connection at /api/debug/db-test"
      ];
    }

    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-[#1A1A1A] border border-red-500/30 rounded-xl p-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-red-400 mb-2">{errorTitle}</h1>
              <span className="inline-block px-2 py-1 bg-red-900/30 text-red-400 text-xs rounded font-mono">
                ERROR: {errorCode}
              </span>
            </div>
            <div className="text-right">
              <p className="text-gray-500 text-xs">{experienceId.startsWith('biz_') ? 'Company ID' : 'Product ID'}</p>
              <p className="text-purple-400 font-mono text-sm">{experienceId}</p>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-gray-300 mb-3 font-semibold">What went wrong:</p>
            <ul className="list-disc list-inside text-gray-400 space-y-2">
              {errorDetails.map((detail, i) => (
                <li key={i}>{detail}</li>
              ))}
            </ul>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded p-4 mb-6">
            <p className="text-xs text-gray-500 mb-1">Error Message:</p>
            <p className="text-sm font-mono text-red-300 break-all">
              {errorMessage}
            </p>
          </div>

          <div className="mb-6">
            <p className="text-gray-300 mb-3 font-semibold">Troubleshooting Steps:</p>
            <ol className="list-decimal list-inside text-gray-400 space-y-2">
              {troubleshootingSteps.map((step, i) => (
                <li key={i} className="text-sm">{step}</li>
              ))}
            </ol>
          </div>

          <div className="flex gap-3">
            <a
              href="/api/health"
              target="_blank"
              className="inline-block px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors text-sm"
            >
              Check System Health
            </a>
            <a
              href="/api/debug/db-test"
              target="_blank"
              className="inline-block px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors text-sm"
            >
              Test Database
            </a>
            <a
              href="https://whop.com/dashboard"
              className="inline-block px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors text-sm"
            >
              Back to Whop Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }
}

/**
 * Loading skeleton for cards
 */
function LoadingCard() {
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-6 animate-pulse">
      <div className="h-8 bg-gray-800 rounded w-1/3 mb-4"></div>
      <div className="h-4 bg-gray-800 rounded w-2/3 mb-2"></div>
      <div className="h-4 bg-gray-800 rounded w-1/2"></div>
    </div>
  );
}
