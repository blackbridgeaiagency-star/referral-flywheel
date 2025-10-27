// components/dashboard/TodayStatsCard.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, TrendingUp, MousePointer, DollarSign } from 'lucide-react';

interface TodayStatsProps {
  creatorId: string;
}

interface TodayStatsData {
  newReferrals: number;
  todayClicks: number;
  todayRevenue: number;
}

export function TodayStatsCard({ creatorId }: TodayStatsProps) {
  const [stats, setStats] = useState<TodayStatsData>({
    newReferrals: 0,
    todayClicks: 0,
    todayRevenue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch today's stats
  const fetchStats = async () => {
    try {
      // In a real implementation, you would call an API endpoint
      // For now, we'll import the function directly
      const { getTodayStats } = await import('@/lib/queries/creator');
      const data = await getTodayStats(creatorId);
      setStats(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching today stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch and auto-refresh every 30 seconds
  useEffect(() => {
    fetchStats();

    const interval = setInterval(() => {
      fetchStats();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [creatorId]);

  return (
    <Card className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border-purple-700/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Activity className="w-4 h-4 text-green-400" />
            Live Today
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
          </CardTitle>
          <p className="text-xs text-gray-400">
            Updated {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
            Loading...
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-4 text-sm">
            {/* New Referrals */}
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-white font-bold">{stats.newReferrals}</span>
              <span className="text-gray-400">new referral{stats.newReferrals !== 1 ? 's' : ''}</span>
            </div>

            <span className="text-gray-600">•</span>

            {/* Clicks */}
            <div className="flex items-center gap-2">
              <MousePointer className="w-4 h-4 text-blue-400" />
              <span className="text-white font-bold">{stats.todayClicks}</span>
              <span className="text-gray-400">click{stats.todayClicks !== 1 ? 's' : ''}</span>
            </div>

            <span className="text-gray-600">•</span>

            {/* Revenue */}
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-yellow-400" />
              <span className="text-white font-bold">
                ${stats.todayRevenue.toFixed(2)}
              </span>
              <span className="text-gray-400">revenue</span>
            </div>
          </div>
        )}

        {/* Progress indicator */}
        {!isLoading && (
          <div className="mt-3 pt-3 border-t border-purple-700/30">
            <p className="text-xs text-gray-400">
              {stats.newReferrals > 0 ? (
                <span className="text-green-400">
                  🎉 Great day! {stats.newReferrals} conversion{stats.newReferrals !== 1 ? 's' : ''} so far
                </span>
              ) : stats.todayClicks > 0 ? (
                <span className="text-blue-400">
                  📊 {stats.todayClicks} click{stats.todayClicks !== 1 ? 's' : ''} today - keep sharing!
                </span>
              ) : (
                <span className="text-gray-400">
                  📢 Share your referral links to start getting traffic
                </span>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
