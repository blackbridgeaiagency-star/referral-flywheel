'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnalyticsKPICard } from './AnalyticsKPICard';
import { RevenueChart } from './RevenueChart';
import { CommissionBreakdown } from './CommissionBreakdown';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { formatCurrency } from '../../lib/utils/commission';
import {
  DollarSign,
  Users,
  TrendingUp,
  MousePointerClick,
  Award,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../ui/button';

interface CreatorAnalyticsProps {
  companyId: string;
  initialPeriod?: string;
}

interface AnalyticsData {
  totalRevenue: number;
  revenueGrowth: number;
  averageOrderValue: number;
  monthlyRevenue: number;
  totalReferrals: number;
  referralGrowth: number;
  conversionRate: number;
  totalClicks: number;
  topReferrers: Array<{
    memberId: string;
    username: string;
    referrals: number;
    revenue: number;
    commissionEarned: number;
    tier: string;
  }>;
  dailyRevenue: Array<{ date: string; amount: number }>;
  dailyReferrals: Array<{ date: string; count: number }>;
  totalCommissionsPaid: number;
  pendingCommissions: number;
  commissionByTier: {
    starter: number;
    ambassador: number;
    elite: number;
  };
  period: string;
  periodDays: number;
}

const TIER_BADGES: Record<string, { icon: string; color: string }> = {
  starter: { icon: '🚀', color: 'text-blue-400' },
  ambassador: { icon: '⭐', color: 'text-yellow-400' },
  elite: { icon: '👑', color: 'text-purple-400' },
};

export function CreatorAnalytics({
  companyId,
  initialPeriod = '30d',
}: CreatorAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState(initialPeriod);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await fetch(
        `/api/creator/analytics?companyId=${companyId}&period=${period}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [companyId, period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
  };

  const handleRefresh = () => {
    fetchAnalytics(true);
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
            <h2 className="text-2xl font-bold text-white">Analytics Dashboard</h2>
          </div>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          <span className="ml-3 text-gray-400">Loading analytics...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-gradient-to-b from-red-500 to-orange-500 rounded-full"></div>
          <h2 className="text-2xl font-bold text-white">Analytics Dashboard</h2>
        </div>
        <Card className="bg-[#1A1A1A] border-red-500/30">
          <CardContent className="p-8 text-center">
            <p className="text-red-400 mb-4">Failed to load analytics: {error}</p>
            <Button onClick={() => fetchAnalytics()} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
          <h2 className="text-2xl font-bold text-white">Analytics Dashboard</h2>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          disabled={refreshing}
          className="border-gray-700 hover:bg-gray-800"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnalyticsKPICard
          title="Total Revenue"
          value={formatCurrency(analytics.totalRevenue)}
          trend={analytics.revenueGrowth}
          trendLabel="vs prev"
          icon={<DollarSign className="w-5 h-5" />}
          variant="primary"
          subtitle={`Avg order: ${formatCurrency(analytics.averageOrderValue)}`}
        />

        <AnalyticsKPICard
          title="Total Referrals"
          value={analytics.totalReferrals.toLocaleString()}
          trend={analytics.referralGrowth}
          trendLabel="vs prev"
          icon={<Users className="w-5 h-5" />}
          variant="success"
          subtitle={`${analytics.monthlyRevenue > 0 ? formatCurrency(analytics.monthlyRevenue) : '$0'} this period`}
        />

        <AnalyticsKPICard
          title="Conversion Rate"
          value={`${analytics.conversionRate}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          variant="warning"
          subtitle={`${analytics.totalReferrals} / ${analytics.totalClicks} clicks`}
        />

        <AnalyticsKPICard
          title="Commissions Paid"
          value={formatCurrency(analytics.totalCommissionsPaid)}
          icon={<Award className="w-5 h-5" />}
          variant="default"
          subtitle={`${formatCurrency(analytics.pendingCommissions)} pending`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart (2/3 width) */}
        <div className="lg:col-span-2">
          <RevenueChart
            dailyRevenue={analytics.dailyRevenue}
            dailyReferrals={analytics.dailyReferrals}
            period={period}
            onPeriodChange={handlePeriodChange}
          />
        </div>

        {/* Commission Breakdown (1/3 width) */}
        <div>
          <CommissionBreakdown
            commissionByTier={analytics.commissionByTier}
            totalPaid={analytics.totalCommissionsPaid}
            pendingCommissions={analytics.pendingCommissions}
          />
        </div>
      </div>

      {/* Top Performers Table */}
      <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-400" />
            Top Performers
          </CardTitle>
          <p className="text-gray-400 text-sm">
            Your highest-earning affiliates by commission earned
          </p>
        </CardHeader>
        <CardContent>
          {analytics.topReferrers.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-3">🏆</div>
              <p className="text-gray-400">
                No affiliate activity yet. Your top performers will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">
                      Rank
                    </th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">
                      Affiliate
                    </th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">
                      Tier
                    </th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium text-sm">
                      Referrals
                    </th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium text-sm">
                      Revenue Generated
                    </th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium text-sm">
                      Commission Earned
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.topReferrers.map((performer, index) => {
                    const tierBadge = TIER_BADGES[performer.tier] || TIER_BADGES.starter;
                    return (
                      <tr
                        key={performer.memberId}
                        className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                      >
                        <td className="py-4 px-4">
                          <span
                            className={`
                              inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold
                              ${index === 0 ? 'bg-yellow-500/20 text-yellow-400' : ''}
                              ${index === 1 ? 'bg-gray-400/20 text-gray-300' : ''}
                              ${index === 2 ? 'bg-orange-500/20 text-orange-400' : ''}
                              ${index > 2 ? 'bg-gray-800 text-gray-400' : ''}
                            `}
                          >
                            {index + 1}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-white font-medium">
                            {performer.username}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`flex items-center gap-1 ${tierBadge.color}`}>
                            <span>{tierBadge.icon}</span>
                            <span className="capitalize text-sm">{performer.tier}</span>
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right text-white">
                          {performer.referrals}
                        </td>
                        <td className="py-4 px-4 text-right text-green-400 font-medium">
                          {formatCurrency(performer.revenue)}
                        </td>
                        <td className="py-4 px-4 text-right text-purple-400 font-medium">
                          {formatCurrency(performer.commissionEarned)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
