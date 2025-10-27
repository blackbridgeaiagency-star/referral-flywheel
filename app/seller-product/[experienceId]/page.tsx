// app/seller-product/[experienceId]/page.tsx
import { Suspense } from 'react';
import { prisma } from '@/lib/db/prisma';
import { getCompleteCreatorDashboardData } from '@/lib/data/centralized-queries';
import { RevenueMetrics } from '@/components/dashboard/RevenueMetrics';
import { TopPerformersTable } from '@/components/dashboard/TopPerformersTable';
import { CommunityStatsGrid } from '@/components/dashboard/CommunityStatsGrid';
import { RewardManagementForm } from '@/components/dashboard/RewardManagementForm';
import { formatCurrency } from '@/lib/utils/commission';

interface CreatorDashboardPageProps {
  params: {
    experienceId: string;
  };
}

export default async function CreatorDashboardPage({ params }: CreatorDashboardPageProps) {
  const { experienceId } = params;

  // ========================================
  // P0 CRITICAL: Performance Optimization
  // Batch queries in parallel to reduce load time from 6.1s to <3s
  // ========================================
  const [creator, dashboardData] = await Promise.all([
    // Creator lookup
    prisma.creator.findFirst({
      where: { productId: experienceId },
      select: {
        id: true,
        companyName: true,
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
    }),

    // Dashboard data (all metrics in parallel internally)
    getCompleteCreatorDashboardData(experienceId),
  ]);

  if (!creator) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Creator Not Found</h1>
          <p className="text-gray-400 mb-6">
            This referral program doesn't exist or hasn't been set up yet.
          </p>
          <a
            href="https://whop.com/dashboard"
            className="text-purple-500 hover:text-purple-400 underline"
          >
            Go to Whop Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F]">
      {/* Header */}
      <header className="bg-[#1A1A1A] border-b border-[#2A2A2A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {creator.companyName} Dashboard
              </h1>
              <p className="text-gray-400">
                Monitor your referral program performance and manage rewards
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <a
                href="https://whop.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Back to Whop
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
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
                topPerformerContribution: dashboardData.topPerformerContribution.topPerformerContribution,
                topPerformerTotal: dashboardData.topPerformerContribution.topEarnersTotal, // ✅ DOLLAR AMOUNT!
              }}
              organicCount={dashboardData.revenueStats.organicCount}
              referredCount={dashboardData.revenueStats.referredCount}
            />
          </Suspense>

          {/* Top Referrers - ✅ USING CENTRALIZED DATA */}
          <Suspense fallback={<LoadingCard />}>
            <TopPerformersTable
              performers={dashboardData.topReferrers}
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
