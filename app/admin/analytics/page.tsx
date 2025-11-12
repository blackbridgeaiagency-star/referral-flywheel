// app/admin/analytics/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/card';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Users,
  Target,
  BarChart3,
  PieChart,
  ArrowUp,
  ArrowDown,
  Minus,
  Calendar,
  Download,
  RefreshCw
} from 'lucide-react';
import { Line, Bar, Pie, Funnel } from 'recharts';
import logger from '../../../lib/logger';
import {
  LineChart,
  BarChart,
  PieChart as PieChartContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

interface AnalyticsData {
  revenue: {
    data: Array<{ date: string; value: number }>;
    total: number;
    change: number;
    trend: 'up' | 'down' | 'stable';
  };
  conversions: {
    data: Array<{ date: string; rate: number; count: number }>;
    rate: number;
    change: number;
  };
  growth: {
    data: Array<{ date: string; members: number; cumulative: number }>;
    total: number;
    monthlyGrowth: number;
  };
  retention: {
    cohorts: Array<{ week: string; retention: number }>;
    average: number;
  };
  funnel: {
    steps: Array<{ name: string; value: number; rate: number }>;
    overallConversion: number;
  };
  realtime: {
    activeUsers: number;
    revenueToday: number;
    conversionsToday: number;
    signupsToday: number;
  };
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    fetchAnalytics();

    if (autoRefresh) {
      const interval = setInterval(fetchAnalytics, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [period, autoRefresh]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/admin/analytics/comprehensive?period=${period}`, {
        headers: {
          'x-admin-token': 'e2e9e2ae1a4a7755111668aa55a22b59502f46eadd95705b0ad9f3882ef1a18d'
        }
      });
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      logger.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async () => {
    try {
      const response = await fetch(`/api/admin/analytics/export?period=${period}`, {
        headers: {
          'x-admin-token': 'e2e9e2ae1a4a7755111668aa55a22b59502f46eadd95705b0ad9f3882ef1a18d'
        }
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-report-${period}-${new Date().toISOString()}.pdf`;
      a.click();
    } catch (error) {
      logger.error('Export failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
          <p className="text-gray-400 mt-1">Comprehensive platform analytics and insights</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              autoRefresh
                ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto-refreshing' : 'Auto-refresh'}
          </button>

          {/* Period Selector */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>

          {/* Export Button */}
          <button
            onClick={exportReport}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition"
          >
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Real-time Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Users"
          value={analytics?.realtime.activeUsers || 0}
          icon={<Users className="w-5 h-5" />}
          color="blue"
          subtitle="Last 5 minutes"
        />
        <MetricCard
          title="Revenue Today"
          value={`$${analytics?.realtime.revenueToday.toFixed(2) || '0'}`}
          icon={<DollarSign className="w-5 h-5" />}
          color="green"
          subtitle="Platform share"
        />
        <MetricCard
          title="Conversions Today"
          value={analytics?.realtime.conversionsToday || 0}
          icon={<Target className="w-5 h-5" />}
          color="purple"
          subtitle="Referred to paid"
        />
        <MetricCard
          title="Signups Today"
          value={analytics?.realtime.signupsToday || 0}
          icon={<Users className="w-5 h-5" />}
          color="yellow"
          subtitle="New members"
        />
      </div>

      {/* Revenue Chart */}
      <Card className="p-6 bg-gray-900 border-gray-800">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-purple-400" />
            Revenue Analytics
          </h3>
          <div className="flex items-center gap-4">
            <span className="text-2xl font-bold text-white">
              ${analytics?.revenue.total.toLocaleString() || '0'}
            </span>
            <TrendIndicator
              value={analytics?.revenue.change || 0}
              trend={analytics?.revenue.trend || 'stable'}
            />
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={analytics?.revenue.data || []}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: 'none' }}
              labelStyle={{ color: '#9ca3af' }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#8b5cf6"
              fillOpacity={1}
              fill="url(#colorRevenue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Conversion Funnel */}
      <Card className="p-6 bg-gray-900 border-gray-800">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-400" />
            Conversion Funnel
          </h3>
          <span className="text-sm text-gray-400">
            Overall conversion: {analytics?.funnel.overallConversion.toFixed(2)}%
          </span>
        </div>

        <div className="space-y-4">
          {analytics?.funnel.steps.map((step, index) => (
            <div key={index} className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-300">{step.name}</span>
                <span className="text-white font-medium">{step.value.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-8 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full flex items-center justify-end px-3"
                  style={{ width: `${step.rate}%` }}
                >
                  <span className="text-xs text-white font-medium">
                    {step.rate.toFixed(1)}%
                  </span>
                </div>
              </div>
              {index < (analytics?.funnel.steps.length || 0) - 1 && (
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                  <ArrowDown className="w-4 h-4 text-gray-600" />
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Growth and Retention */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Member Growth */}
        <Card className="p-6 bg-gray-900 border-gray-800">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              Member Growth
            </h3>
            <span className="text-sm text-green-400">
              +{analytics?.growth.monthlyGrowth || 0}% this month
            </span>
          </div>

          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={analytics?.growth.data || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none' }}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Line
                type="monotone"
                dataKey="cumulative"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Retention Cohorts */}
        <Card className="p-6 bg-gray-900 border-gray-800">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-400" />
              Retention Analysis
            </h3>
            <span className="text-sm text-gray-400">
              Avg: {analytics?.retention.average.toFixed(1)}%
            </span>
          </div>

          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={analytics?.retention.cohorts || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="week" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none' }}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Bar dataKey="retention" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Conversion Rate */}
      <Card className="p-6 bg-gray-900 border-gray-800">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            Conversion Rate Trends
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Average:</span>
            <span className="text-white font-medium">
              {analytics?.conversions.rate.toFixed(2)}%
            </span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={analytics?.conversions.data || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: 'none' }}
              labelStyle={{ color: '#9ca3af' }}
            />
            <Line
              type="monotone"
              dataKey="rate"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ fill: '#f59e0b', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

// Metric Card Component
function MetricCard({
  title,
  value,
  icon,
  color,
  subtitle
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'yellow';
  subtitle?: string;
}) {
  const colorClasses = {
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-green-500/20 text-green-400',
    purple: 'bg-purple-500/20 text-purple-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
  };

  return (
    <Card className="p-6 bg-gray-900 border-gray-800">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {subtitle && (
            <p className="text-gray-500 text-xs mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

// Trend Indicator Component
function TrendIndicator({
  value,
  trend
}: {
  value: number;
  trend: 'up' | 'down' | 'stable';
}) {
  const icon = trend === 'up'
    ? <ArrowUp className="w-4 h-4" />
    : trend === 'down'
    ? <ArrowDown className="w-4 h-4" />
    : <Minus className="w-4 h-4" />;

  const color = trend === 'up'
    ? 'text-green-400'
    : trend === 'down'
    ? 'text-red-400'
    : 'text-gray-400';

  return (
    <div className={`flex items-center gap-1 ${color}`}>
      {icon}
      <span className="text-sm font-medium">
        {Math.abs(value).toFixed(1)}%
      </span>
    </div>
  );
}