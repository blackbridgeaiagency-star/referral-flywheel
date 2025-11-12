// app/analytics/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import logger from '../../lib/logger';
import {
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  Target,
  Award,
  Clock,
  Filter,
  Download,
  RefreshCw,
  Calendar,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

interface AnalyticsData {
  overview: {
    totalRevenue: number;
    totalMembers: number;
    totalReferrals: number;
    avgConversionRate: number;
    revenueGrowth: number;
    memberGrowth: number;
  };
  revenueTimeline: Array<{
    date: string;
    revenue: number;
    commissions: number;
    refunds: number;
  }>;
  memberGrowth: Array<{
    date: string;
    total: number;
    organic: number;
    referred: number;
  }>;
  topPerformers: Array<{
    username: string;
    earnings: number;
    referrals: number;
    conversionRate: number;
  }>;
  conversionFunnel: Array<{
    stage: string;
    value: number;
    percentage: number;
  }>;
  geographicData: Array<{
    country: string;
    members: number;
    revenue: number;
  }>;
  retentionCohorts: Array<{
    cohort: string;
    month1: number;
    month2: number;
    month3: number;
    month6: number;
    month12: number;
  }>;
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [metric, setMetric] = useState<'revenue' | 'members' | 'referrals'>('revenue');
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/analytics?range=${timeRange}`);
      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      }
    } catch (error) {
      logger.error('Failed to fetch analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();

    if (autoRefresh) {
      const interval = setInterval(fetchAnalytics, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [timeRange, autoRefresh]);

  // Mock data for demonstration
  const mockData: AnalyticsData = {
    overview: {
      totalRevenue: 125430.50,
      totalMembers: 2847,
      totalReferrals: 8541,
      avgConversionRate: 23.5,
      revenueGrowth: 18.2,
      memberGrowth: 24.8,
    },
    revenueTimeline: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: Math.random() * 5000 + 3000,
      commissions: Math.random() * 500 + 300,
      refunds: Math.random() * 100,
    })),
    memberGrowth: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      total: Math.floor(2847 - (29 - i) * 20 + Math.random() * 40),
      organic: Math.floor(1000 - (29 - i) * 5 + Math.random() * 20),
      referred: Math.floor(1847 - (29 - i) * 15 + Math.random() * 30),
    })),
    topPerformers: [
      { username: 'JohnDoe', earnings: 4520.30, referrals: 145, conversionRate: 28.5 },
      { username: 'JaneSmith', earnings: 3890.20, referrals: 132, conversionRate: 25.3 },
      { username: 'BobJohnson', earnings: 3200.50, referrals: 98, conversionRate: 31.2 },
      { username: 'AliceWilliams', earnings: 2950.80, referrals: 87, conversionRate: 29.8 },
      { username: 'CharlieB', earnings: 2750.40, referrals: 76, conversionRate: 27.1 },
    ],
    conversionFunnel: [
      { stage: 'Link Clicks', value: 25420, percentage: 100 },
      { stage: 'Sign-ups', value: 8920, percentage: 35.1 },
      { stage: 'Trial Started', value: 5980, percentage: 23.5 },
      { stage: 'Paid Conversion', value: 2847, percentage: 11.2 },
      { stage: 'Retained (3mo)', value: 2134, percentage: 8.4 },
    ],
    geographicData: [
      { country: 'United States', members: 1250, revenue: 62500 },
      { country: 'United Kingdom', members: 450, revenue: 22500 },
      { country: 'Canada', members: 380, revenue: 19000 },
      { country: 'Australia', members: 290, revenue: 14500 },
      { country: 'Germany', members: 180, revenue: 9000 },
    ],
    retentionCohorts: [
      { cohort: 'Jan 2024', month1: 100, month2: 85, month3: 72, month6: 58, month12: 45 },
      { cohort: 'Feb 2024', month1: 100, month2: 82, month3: 70, month6: 55, month12: 0 },
      { cohort: 'Mar 2024', month1: 100, month2: 88, month3: 75, month6: 0, month12: 0 },
      { cohort: 'Apr 2024', month1: 100, month2: 90, month3: 0, month6: 0, month12: 0 },
      { cohort: 'May 2024', month1: 100, month2: 0, month3: 0, month6: 0, month12: 0 },
    ],
  };

  const displayData = data || mockData;

  // Chart colors
  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Analytics Dashboard</h1>
        <p className="text-gray-400">Comprehensive insights into your referral program performance</p>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2">
          {(['7d', '30d', '90d', '1y'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                timeRange === range
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {range === '7d' ? '7 Days' :
               range === '30d' ? '30 Days' :
               range === '90d' ? '90 Days' : '1 Year'}
            </button>
          ))}
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              autoRefresh
                ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto-refreshing' : 'Auto-refresh'}
          </button>

          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>

          <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-green-400" />
              {displayData.overview.revenueGrowth > 0 ? (
                <div className="flex items-center text-green-400 text-sm">
                  <ChevronUp className="w-4 h-4" />
                  {displayData.overview.revenueGrowth}%
                </div>
              ) : (
                <div className="flex items-center text-red-400 text-sm">
                  <ChevronDown className="w-4 h-4" />
                  {Math.abs(displayData.overview.revenueGrowth)}%
                </div>
              )}
            </div>
            <p className="text-2xl font-bold text-white">
              ${displayData.overview.totalRevenue.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400">Total Revenue</p>
          </CardContent>
        </Card>

        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-blue-400" />
              <div className="flex items-center text-green-400 text-sm">
                <ChevronUp className="w-4 h-4" />
                {displayData.overview.memberGrowth}%
              </div>
            </div>
            <p className="text-2xl font-bold text-white">
              {displayData.overview.totalMembers.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400">Total Members</p>
          </CardContent>
        </Card>

        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-8 h-8 text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-white">
              {displayData.overview.totalReferrals.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400">Total Referrals</p>
          </CardContent>
        </Card>

        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-8 h-8 text-yellow-400" />
            </div>
            <p className="text-2xl font-bold text-white">
              {displayData.overview.avgConversionRate}%
            </p>
            <p className="text-xs text-gray-400">Conversion Rate</p>
          </CardContent>
        </Card>

        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Award className="w-8 h-8 text-orange-400" />
            </div>
            <p className="text-2xl font-bold text-white">
              ${(displayData.overview.totalRevenue / displayData.overview.totalMembers).toFixed(2)}
            </p>
            <p className="text-xs text-gray-400">Avg Revenue/Member</p>
          </CardContent>
        </Card>

        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-cyan-400" />
            </div>
            <p className="text-2xl font-bold text-white">
              {(displayData.overview.totalReferrals / displayData.overview.totalMembers).toFixed(1)}
            </p>
            <p className="text-xs text-gray-400">Avg Referrals/Member</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Timeline */}
        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Revenue Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={displayData.revenueTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                  labelStyle={{ color: '#9CA3AF' }}
                />
                <Legend />
                <Area type="monotone" dataKey="revenue" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                <Area type="monotone" dataKey="commissions" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Member Growth */}
        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Member Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={displayData.memberGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                  labelStyle={{ color: '#9CA3AF' }}
                />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#8b5cf6" strokeWidth={2} />
                <Line type="monotone" dataKey="organic" stroke="#10b981" strokeWidth={2} />
                <Line type="monotone" dataKey="referred" stroke="#f59e0b" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={displayData.conversionFunnel} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9CA3AF" />
                <YAxis dataKey="stage" type="category" stroke="#9CA3AF" width={100} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                  labelStyle={{ color: '#9CA3AF' }}
                />
                <Bar dataKey="value" fill="#8b5cf6">
                  {displayData.conversionFunnel.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Geographic Distribution */}
        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Geographic Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={displayData.geographicData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.country}: ${entry.members}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="members"
                >
                  {displayData.geographicData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                  labelStyle={{ color: '#9CA3AF' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Retention Cohorts */}
      <Card className="bg-[#1A1A1A] border-gray-800 mb-8">
        <CardHeader>
          <CardTitle className="text-white">Retention Cohorts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-2 px-4 text-gray-400">Cohort</th>
                  <th className="text-center py-2 px-4 text-gray-400">Month 1</th>
                  <th className="text-center py-2 px-4 text-gray-400">Month 2</th>
                  <th className="text-center py-2 px-4 text-gray-400">Month 3</th>
                  <th className="text-center py-2 px-4 text-gray-400">Month 6</th>
                  <th className="text-center py-2 px-4 text-gray-400">Month 12</th>
                </tr>
              </thead>
              <tbody>
                {displayData.retentionCohorts.map((cohort, index) => (
                  <tr key={index} className="border-b border-gray-800">
                    <td className="py-2 px-4 text-white font-medium">{cohort.cohort}</td>
                    <td className={`text-center py-2 px-4 ${getRetentionColor(cohort.month1)}`}>
                      {cohort.month1 > 0 ? `${cohort.month1}%` : '-'}
                    </td>
                    <td className={`text-center py-2 px-4 ${getRetentionColor(cohort.month2)}`}>
                      {cohort.month2 > 0 ? `${cohort.month2}%` : '-'}
                    </td>
                    <td className={`text-center py-2 px-4 ${getRetentionColor(cohort.month3)}`}>
                      {cohort.month3 > 0 ? `${cohort.month3}%` : '-'}
                    </td>
                    <td className={`text-center py-2 px-4 ${getRetentionColor(cohort.month6)}`}>
                      {cohort.month6 > 0 ? `${cohort.month6}%` : '-'}
                    </td>
                    <td className={`text-center py-2 px-4 ${getRetentionColor(cohort.month12)}`}>
                      {cohort.month12 > 0 ? `${cohort.month12}%` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Top Performers */}
      <Card className="bg-[#1A1A1A] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Top Performers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {displayData.topPerformers.map((performer, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                    index === 0 ? 'bg-yellow-500' :
                    index === 1 ? 'bg-gray-400' :
                    index === 2 ? 'bg-orange-600' : 'bg-gray-600'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-white font-medium">{performer.username}</p>
                    <p className="text-xs text-gray-400">
                      {performer.referrals} referrals • {performer.conversionRate}% conversion
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-green-400">
                    ${performer.earnings.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400">Total Earnings</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getRetentionColor(value: number): string {
  if (value === 0) return 'text-gray-600';
  if (value >= 80) return 'text-green-400';
  if (value >= 60) return 'text-yellow-400';
  if (value >= 40) return 'text-orange-400';
  return 'text-red-400';
}