// app/admin/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import {
  DollarSign,
  Users,
  TrendingUp,
  AlertTriangle,
  Activity,
  CreditCard,
  Shield,
  Clock
} from 'lucide-react';

interface PlatformStats {
  totalRevenue: number;
  monthlyRevenue: number;
  totalMembers: number;
  activeMembers: number;
  totalCommissions: number;
  pendingPayouts: number;
  fraudAlerts: number;
  systemHealth: 'healthy' | 'degraded' | 'down';
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    fetchStats();
  }, [timeRange]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/admin/stats?range=${timeRange}`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
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
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-gray-400 mt-1">Platform overview and management</p>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2">
          {['24h', '7d', '30d', '90d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                timeRange === range
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* System Health Alert */}
      {stats?.systemHealth !== 'healthy' && (
        <div className={`p-4 rounded-lg border ${
          stats?.systemHealth === 'degraded'
            ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400'
            : 'bg-red-500/10 border-red-500/50 text-red-400'
        }`}>
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">
              System Status: {stats?.systemHealth === 'degraded' ? 'Degraded Performance' : 'System Down'}
            </span>
          </div>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <Card className="p-6 bg-gray-900 border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Platform Revenue</p>
              <p className="text-2xl font-bold text-white mt-1">
                ${stats?.totalRevenue?.toLocaleString() || '0'}
              </p>
              <p className="text-green-400 text-sm mt-2">
                +${stats?.monthlyRevenue?.toLocaleString() || '0'} this month
              </p>
            </div>
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <DollarSign className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </Card>

        {/* Active Members */}
        <Card className="p-6 bg-gray-900 border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Active Members</p>
              <p className="text-2xl font-bold text-white mt-1">
                {stats?.activeMembers?.toLocaleString() || '0'}
              </p>
              <p className="text-gray-500 text-sm mt-2">
                {stats?.totalMembers?.toLocaleString() || '0'} total
              </p>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </Card>

        {/* Pending Payouts */}
        <Card className="p-6 bg-gray-900 border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Pending Payouts</p>
              <p className="text-2xl font-bold text-white mt-1">
                ${stats?.pendingPayouts?.toLocaleString() || '0'}
              </p>
              <p className="text-yellow-400 text-sm mt-2">
                {stats?.totalCommissions || '0'} commissions
              </p>
            </div>
            <div className="p-3 bg-yellow-500/20 rounded-lg">
              <CreditCard className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
        </Card>

        {/* Fraud Alerts */}
        <Card className="p-6 bg-gray-900 border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Fraud Alerts</p>
              <p className="text-2xl font-bold text-white mt-1">
                {stats?.fraudAlerts || '0'}
              </p>
              <p className="text-red-400 text-sm mt-2">
                Requires review
              </p>
            </div>
            <div className="p-3 bg-red-500/20 rounded-lg">
              <Shield className="w-6 h-6 text-red-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="p-6 bg-gray-900 border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            Recent Activity
          </h3>
          <div className="space-y-3">
            <ActivityItem
              type="payment"
              message="New payment processed: $49.99"
              time="2 minutes ago"
            />
            <ActivityItem
              type="member"
              message="New member signup: john_doe"
              time="5 minutes ago"
            />
            <ActivityItem
              type="commission"
              message="Commission paid: $4.99 to alice_smith"
              time="10 minutes ago"
            />
            <ActivityItem
              type="fraud"
              message="Suspicious activity detected for user_123"
              time="15 minutes ago"
            />
          </div>
        </Card>

        {/* System Status */}
        <Card className="p-6 bg-gray-900 border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-400" />
            System Status
          </h3>
          <div className="space-y-3">
            <StatusItem
              service="Database"
              status="operational"
              latency="12ms"
            />
            <StatusItem
              service="Redis Cache"
              status="operational"
              latency="2ms"
            />
            <StatusItem
              service="Webhook Processing"
              status="operational"
              latency="45ms"
            />
            <StatusItem
              service="Fraud Detection"
              status="operational"
              latency="18ms"
            />
          </div>
        </Card>
      </div>

      {/* Revenue Chart Placeholder */}
      <Card className="p-6 bg-gray-900 border-gray-800">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-400" />
          Revenue Trends
        </h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          <p>Revenue chart will be displayed here</p>
        </div>
      </Card>
    </div>
  );
}

// Activity Item Component
function ActivityItem({
  type,
  message,
  time
}: {
  type: 'payment' | 'member' | 'commission' | 'fraud';
  message: string;
  time: string;
}) {
  const icons = {
    payment: <DollarSign className="w-4 h-4" />,
    member: <Users className="w-4 h-4" />,
    commission: <CreditCard className="w-4 h-4" />,
    fraud: <AlertTriangle className="w-4 h-4" />,
  };

  const colors = {
    payment: 'text-green-400',
    member: 'text-blue-400',
    commission: 'text-purple-400',
    fraud: 'text-red-400',
  };

  return (
    <div className="flex items-start gap-3">
      <div className={`p-2 rounded-lg bg-gray-800 ${colors[type]}`}>
        {icons[type]}
      </div>
      <div className="flex-1">
        <p className="text-gray-300 text-sm">{message}</p>
        <p className="text-gray-500 text-xs mt-1 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {time}
        </p>
      </div>
    </div>
  );
}

// Status Item Component
function StatusItem({
  service,
  status,
  latency
}: {
  service: string;
  status: 'operational' | 'degraded' | 'down';
  latency: string;
}) {
  const statusColors = {
    operational: 'bg-green-500',
    degraded: 'bg-yellow-500',
    down: 'bg-red-500',
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
        <span className="text-gray-300">{service}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-gray-500 text-sm">{latency}</span>
        <span className={`text-xs px-2 py-1 rounded ${
          status === 'operational'
            ? 'bg-green-500/20 text-green-400'
            : status === 'degraded'
            ? 'bg-yellow-500/20 text-yellow-400'
            : 'bg-red-500/20 text-red-400'
        }`}>
          {status}
        </span>
      </div>
    </div>
  );
}