'use client';

import { useState, useEffect, useCallback } from 'react';
import { RevenueMetrics } from './RevenueMetrics';
import { CommunityStatsGrid } from './CommunityStatsGrid';
import { TopPerformersTable } from './TopPerformersTable';

interface RevenueStats {
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  referralContribution: number;
  referredCount: number;
  totalActiveClicks: number;
  convertedClicks: number;
  organicCount: number;
  totalMembers: number;
  monthlyRevenue: number;
  totalShares: number;
  globalRevenueRank: number;
  globalReferralRank: number;
  totalCreators: number;
  referralMomentum: number;
  membersWithReferrals: number;
  shareToConversionRate: number;
  monthlyGrowthRate: number;
  thisMonthReferrals: number;
  lastMonthReferrals: number;
}

interface TopPerformer {
  id: string;
  username: string;
  email: string;
  referralCode: string;
  lifetimeEarnings: number;
  monthlyEarnings: number;
  totalReferred: number;
  monthlyReferred: number;
  currentTier: string;
  revenueGenerated: number;
  createdAt: Date;
}

interface CreatorDashboardClientProps {
  companyId: string;
  creatorId: string;
  initialRevenueStats: RevenueStats;
  initialTopReferrers: TopPerformer[];
  initialTopPerformerContribution: {
    topPerformerContribution: number;
    topEarnersTotal: number;
  };
}

export function CreatorDashboardClient({
  companyId,
  creatorId,
  initialRevenueStats,
  initialTopReferrers,
  initialTopPerformerContribution,
}: CreatorDashboardClientProps) {
  const [revenueStats, setRevenueStats] = useState(initialRevenueStats);
  const [topReferrers, setTopReferrers] = useState(initialTopReferrers);
  const [topPerformerContribution, setTopPerformerContribution] = useState(initialTopPerformerContribution);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/creator/${companyId}/stats`);
      if (response.ok) {
        const result = await response.json();
        if (result.ok && result.data) {
          // Check if data changed
          const hasChanged =
            result.data.revenueStats.totalRevenue !== revenueStats.totalRevenue ||
            result.data.revenueStats.totalMembers !== revenueStats.totalMembers ||
            result.data.revenueStats.referredCount !== revenueStats.referredCount;

          if (hasChanged) {
            setIsUpdating(true);
            setTimeout(() => setIsUpdating(false), 2000);
          }

          setRevenueStats(result.data.revenueStats);
          setTopReferrers(result.data.topReferrers);
          setTopPerformerContribution(result.data.topPerformerContribution);
        }
      }
    } catch (error) {
      console.error('Error fetching creator stats:', error);
    }
  }, [companyId, revenueStats.totalRevenue, revenueStats.totalMembers, revenueStats.referredCount]);

  // Poll every 30 seconds
  useEffect(() => {
    const pollInterval = setInterval(fetchStats, 30000);
    return () => clearInterval(pollInterval);
  }, [fetchStats]);

  return (
    <div className={`space-y-8 transition-all duration-300 ${isUpdating ? 'ring-2 ring-green-500/30 rounded-xl' : ''}`}>
      {/* Revenue Metrics */}
      <RevenueMetrics
        revenueBreakdown={{
          totalRevenue: revenueStats.totalRevenue,
          totalMonthlyRevenue: revenueStats.monthlyRecurringRevenue,
          referralContribution: revenueStats.referralContribution,
          activeSubscriptions: revenueStats.referredCount,
          totalActiveClicks: revenueStats.totalActiveClicks,
          convertedActiveClicks: revenueStats.convertedClicks,
          organicCount: revenueStats.organicCount,
          referredCount: revenueStats.referredCount,
          totalMembers: revenueStats.totalMembers,
        }}
      />

      {/* Community Stats */}
      <CommunityStatsGrid
        stats={{
          totalMembers: revenueStats.totalMembers,
          avgReferralsPerMember: revenueStats.totalMembers > 0
            ? (revenueStats.referredCount / revenueStats.totalMembers)
            : 0,
          avgEarningsPerMember: revenueStats.totalRevenue / Math.max(revenueStats.totalMembers, 1),
          totalClicks: revenueStats.totalActiveClicks,
          convertedClicks: revenueStats.convertedClicks,
          organicSignups: revenueStats.organicCount,
          attributionRate: revenueStats.totalMembers > 0
            ? (revenueStats.referredCount / revenueStats.totalMembers) * 100
            : 0,
          totalReferrals: revenueStats.referredCount,
          totalRevenue: revenueStats.totalRevenue,
          monthlyRevenue: revenueStats.monthlyRevenue,
          totalSharesSent: revenueStats.totalShares,
          topPerformerContribution: topPerformerContribution.topPerformerContribution,
          topPerformerTotal: topPerformerContribution.topEarnersTotal,
          globalRevenueRank: revenueStats.globalRevenueRank,
          globalReferralRank: revenueStats.globalReferralRank,
          totalCreators: revenueStats.totalCreators,
          referralMomentum: revenueStats.referralMomentum,
          membersWithReferrals: revenueStats.membersWithReferrals,
          shareToConversionRate: revenueStats.shareToConversionRate,
          monthlyGrowthRate: revenueStats.monthlyGrowthRate,
          thisMonthReferrals: revenueStats.thisMonthReferrals,
          lastMonthReferrals: revenueStats.lastMonthReferrals,
        }}
        organicCount={revenueStats.organicCount}
        referredCount={revenueStats.referredCount}
      />

      {/* Top Referrers */}
      <TopPerformersTable
        performers={topReferrers}
        totalRevenue={revenueStats.totalRevenue}
        creatorId={creatorId}
      />
    </div>
  );
}
