'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '../ui/card';
import { formatCurrency } from '../../lib/utils/commission';
import { DollarSign, TrendingUp, Users, Trophy, TrendingDown, ArrowDown, ArrowUp } from 'lucide-react';

interface StatsGridProps {
  stats: {
    monthlyEarnings: number;
    lifetimeEarnings: number;
    totalReferred: number;
    monthlyReferred: number;
    monthlyTrend?: number; // Calculated month-over-month growth
    globalEarningsRank?: number | null; // Rank by earnings across ALL creators
    globalReferralsRank?: number | null; // Rank by referrals across ALL creators
    communityRank?: number | null; // Rank by referrals within creator
  };
  memberId?: string; // Optional memberId for real-time polling
  note?: string;  // Optional note about data source
}

export function StatsGrid({ stats: initialStats, memberId }: StatsGridProps) {
  const [stats, setStats] = useState(initialStats);
  const [showCommunityRank, setShowCommunityRank] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Update stats when initialStats change (e.g., page navigation)
  useEffect(() => {
    setStats(initialStats);
  }, [initialStats]);

  // Fetch updated stats from API
  const fetchStats = useCallback(async () => {
    if (!memberId) return;

    try {
      const response = await fetch(`/api/member/stats?memberId=${memberId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.stats) {
          // Check if stats changed - show update indicator
          const hasChanged =
            data.stats.lifetimeEarnings !== stats.lifetimeEarnings ||
            data.stats.totalReferred !== stats.totalReferred ||
            data.stats.monthlyEarnings !== stats.monthlyEarnings;

          if (hasChanged) {
            setIsUpdating(true);
            setTimeout(() => setIsUpdating(false), 2000);
          }

          setStats(prev => ({
            ...prev,
            monthlyEarnings: data.stats.monthlyEarnings,
            lifetimeEarnings: data.stats.lifetimeEarnings,
            totalReferred: data.stats.totalReferred,
            monthlyReferred: data.stats.monthlyReferred,
            monthlyTrend: data.stats.monthlyTrend,
          }));
          setLastUpdated(new Date());
        }
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [memberId, stats.lifetimeEarnings, stats.totalReferred, stats.monthlyEarnings]);

  // Real-time polling every 30 seconds
  useEffect(() => {
    if (!memberId) return;

    const pollInterval = setInterval(fetchStats, 30000);
    return () => clearInterval(pollInterval);
  }, [memberId, fetchStats]);

  // Format trend with arrow
  const trendFormatted = stats.monthlyTrend !== undefined
    ? {
        value: `${Math.abs(stats.monthlyTrend).toFixed(1)}%`,
        isPositive: stats.monthlyTrend >= 0
      }
    : undefined;

  return (
    <div className="space-y-2">
      <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 transition-all duration-300 ${isUpdating ? 'ring-2 ring-green-500/50 rounded-lg' : ''}`}>
        <StatCard
          title="Monthly Earnings"
          value={formatCurrency(stats.monthlyEarnings)}
          subtitle="This month"
          trend={trendFormatted}
          icon={<DollarSign className="w-5 h-5" />}
          iconColor="text-green-400"
          iconBg="bg-green-900/20"
          isUpdating={isUpdating}
        />
        <StatCard
          title="Lifetime Earnings"
          value={formatCurrency(stats.lifetimeEarnings)}
          subtitle="All time"
          icon={<TrendingUp className="w-5 h-5" />}
          iconColor="text-purple-400"
          iconBg="bg-purple-900/20"
          isUpdating={isUpdating}
        />
        <StatCard
          title="Total Referrals"
          value={stats.totalReferred.toString()}
          subtitle={`${stats.monthlyReferred} this month`}
          icon={<Users className="w-5 h-5" />}
          iconColor="text-blue-400"
          iconBg="bg-blue-900/20"
          isUpdating={isUpdating}
        />
        <FlippableRankCard
          globalRank={stats.globalEarningsRank}
          communityRank={stats.communityRank}
          isFlipped={showCommunityRank}
          onFlip={() => setShowCommunityRank(!showCommunityRank)}
        />
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, trend, icon, iconColor, iconBg, isUpdating }: {
  title: string;
  value: string;
  subtitle: string;
  trend?: { value: string; isPositive: boolean };
  icon?: React.ReactNode;
  iconColor?: string;
  iconBg?: string;
  isUpdating?: boolean;
}) {
  return (
    <Card className="bg-[#1A1A1A] border-[#2A2A2A] hover:border-purple-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-purple-900/10 group overflow-hidden relative">
      {/* Subtle background gradient on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 via-transparent to-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <CardContent className="p-5 relative z-10">
        <div className="flex items-start justify-between mb-3">
          <p className="text-sm text-gray-400 font-medium">{title}</p>
          {icon && (
            <div className={`p-2 rounded-lg ${iconBg} ${iconColor} border border-current/20 backdrop-blur-sm transition-transform duration-200 group-hover:scale-110`}>
              {icon}
            </div>
          )}
        </div>
        {/* High contrast white text for value with gradient shine effect */}
        <p className="text-3xl font-bold text-white mb-2 drop-shadow-lg bg-gradient-to-r from-white to-gray-200 bg-clip-text">{value}</p>
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">{subtitle}</p>
          {trend && (
            <span className={`text-xs font-semibold flex items-center gap-1 px-2 py-1 rounded transition-all duration-200 ${
              trend.isPositive
                ? 'text-green-400 bg-green-900/20 border border-green-500/20'
                : 'text-red-400 bg-red-900/20 border border-red-500/20'
            }`}>
              {trend.isPositive ? (
                <ArrowUp className="w-3 h-3 animate-pulse" />
              ) : (
                <ArrowDown className="w-3 h-3 animate-pulse" />
              )}
              {trend.value}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FlippableRankCard({
  globalRank,
  communityRank,
  isFlipped,
  onFlip
}: {
  globalRank: number | null | undefined;
  communityRank: number | null | undefined;
  isFlipped: boolean;
  onFlip: () => void;
}) {
  return (
    <div
      className="relative cursor-pointer perspective-1000"
      onClick={onFlip}
      style={{ perspective: '1000px' }}
    >
      <div
        className="relative transition-transform duration-500 preserve-3d"
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}
      >
        {/* Front - Global Rank */}
        <div
          className="backface-hidden"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <Card className="bg-[#1A1A1A] border-[#2A2A2A] hover:border-purple-500/30 transition-all">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <p className="text-sm text-gray-400">Global Rank</p>
                <div className={`p-2 rounded-lg bg-yellow-900/20 text-yellow-400 border border-current/20`}>
                  <Trophy className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-bold text-white mb-2 drop-shadow-lg">
                {globalRank ? `#${globalRank}` : 'N/A'}
              </p>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">By earnings</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Back - Community Rank */}
        <div
          className="absolute top-0 left-0 w-full backface-hidden"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          <Card className="bg-[#1A1A1A] border-[#2A2A2A] hover:border-purple-500/30 transition-all">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <p className="text-sm text-gray-400">Community Rank</p>
                <div className={`p-2 rounded-lg bg-yellow-900/20 text-yellow-400 border border-current/20`}>
                  <Trophy className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-bold text-white mb-2 drop-shadow-lg">
                {communityRank ? `#${communityRank}` : 'N/A'}
              </p>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">In your community</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
