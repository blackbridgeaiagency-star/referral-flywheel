'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, TrendingUp, Users, Calendar } from 'lucide-react';

interface RealTimeStatsWrapperProps {
  memberId: string;
  initialStats: {
    lifetimeEarnings: number;
    monthlyEarnings: number;
    monthlyTrend: number;
    totalReferred: number;
    monthlyReferred: number;
  };
}

export function RealTimeStatsWrapper({
  memberId,
  initialStats,
}: RealTimeStatsWrapperProps) {
  const [stats, setStats] = useState(initialStats);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/member/stats?memberId=${memberId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.stats) {
          // Check if stats changed - flash update indicator
          if (
            data.stats.lifetimeEarnings !== stats.lifetimeEarnings ||
            data.stats.totalReferred !== stats.totalReferred
          ) {
            setIsUpdating(true);
            setTimeout(() => setIsUpdating(false), 1000);
          }
          setStats(data.stats);
        }
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [memberId, stats.lifetimeEarnings, stats.totalReferred]);

  // Real-time polling every 30 seconds
  useEffect(() => {
    const pollInterval = setInterval(fetchStats, 30000);
    return () => clearInterval(pollInterval);
  }, [fetchStats]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const statsItems = [
    {
      label: 'Lifetime Earnings',
      value: formatCurrency(stats.lifetimeEarnings),
      icon: DollarSign,
      color: 'text-green-400',
      bgColor: 'bg-green-900/20',
      borderColor: 'border-green-500/30',
    },
    {
      label: 'This Month',
      value: formatCurrency(stats.monthlyEarnings),
      subtext: stats.monthlyTrend > 0 ? `+${stats.monthlyTrend.toFixed(0)}%` : `${stats.monthlyTrend.toFixed(0)}%`,
      subtextColor: stats.monthlyTrend >= 0 ? 'text-green-400' : 'text-red-400',
      icon: TrendingUp,
      color: 'text-purple-400',
      bgColor: 'bg-purple-900/20',
      borderColor: 'border-purple-500/30',
    },
    {
      label: 'Total Referrals',
      value: stats.totalReferred.toString(),
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/20',
      borderColor: 'border-blue-500/30',
    },
    {
      label: 'This Month',
      value: stats.monthlyReferred.toString(),
      subtext: 'referrals',
      icon: Calendar,
      color: 'text-orange-400',
      bgColor: 'bg-orange-900/20',
      borderColor: 'border-orange-500/30',
    },
  ];

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 transition-all ${isUpdating ? 'ring-2 ring-green-500/50 rounded-lg' : ''}`}>
      {statsItems.map((item, index) => (
        <Card
          key={index}
          className={`${item.bgColor} border ${item.borderColor} transition-all hover:scale-[1.02]`}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <item.icon className={`w-4 h-4 ${item.color}`} />
              <span className="text-gray-400 text-xs">{item.label}</span>
            </div>
            <p className={`text-xl md:text-2xl font-bold ${item.color}`}>
              {item.value}
            </p>
            {item.subtext && (
              <p className={`text-xs ${item.subtextColor || 'text-gray-500'} mt-1`}>
                {item.subtext}
              </p>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Real-time indicator */}
      <div className="col-span-2 md:col-span-4 flex items-center justify-center gap-2 text-xs text-gray-500">
        <div className={`w-2 h-2 rounded-full ${isUpdating ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
        <span>Live updates every 30s</span>
      </div>
    </div>
  );
}
