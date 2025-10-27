// app/admin/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import {
  Users,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Activity,
  Server,
  Database,
  Shield,
  Settings,
  Bell,
  ChevronUp,
  ChevronDown,
  MoreVertical,
  Search,
  Filter,
  Download,
  RefreshCw,
  Lock,
  Unlock,
  Ban,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
} from 'lucide-react';

interface AdminStats {
  platform: {
    totalRevenue: number;
    monthlyRevenue: number;
    totalCommissions: number;
    pendingPayouts: number;
    platformFees: number;
    revenueGrowth: number;
  };
  users: {
    totalMembers: number;
    activeMembers: number;
    totalCreators: number;
    newToday: number;
    churned: number;
    suspended: number;
  };
  system: {
    webhookSuccessRate: number;
    apiResponseTime: number;
    databaseSize: number;
    cacheHitRate: number;
    errorRate: number;
    uptime: number;
  };
  fraud: {
    flaggedAccounts: number;
    blockedTransactions: number;
    suspiciousActivity: number;
    riskScore: number;
  };
  creators: Array<{
    id: string;
    name: string;
    revenue: number;
    members: number;
    status: 'active' | 'suspended' | 'pending';
    riskLevel: 'low' | 'medium' | 'high';
  }>;
  recentActivity: Array<{
    id: string;
    type: 'payment' | 'signup' | 'fraud' | 'error' | 'admin';
    message: string;
    timestamp: Date;
    severity: 'info' | 'warning' | 'error' | 'critical';
  }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCreator, setSelectedCreator] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'suspended'>('all');
  const [showFraudAlert, setShowFraudAlert] = useState(false);

  // Mock data for demonstration
  const mockStats: AdminStats = {
    platform: {
      totalRevenue: 1250430.50,
      monthlyRevenue: 125430.50,
      totalCommissions: 875301.35,
      pendingPayouts: 12540.25,
      platformFees: 250086.10,
      revenueGrowth: 23.5,
    },
    users: {
      totalMembers: 28470,
      activeMembers: 21453,
      totalCreators: 247,
      newToday: 142,
      churned: 389,
      suspended: 23,
    },
    system: {
      webhookSuccessRate: 99.2,
      apiResponseTime: 45,
      databaseSize: 2.4,
      cacheHitRate: 87.5,
      errorRate: 0.03,
      uptime: 99.99,
    },
    fraud: {
      flaggedAccounts: 12,
      blockedTransactions: 3,
      suspiciousActivity: 27,
      riskScore: 15,
    },
    creators: [
      { id: '1', name: 'TechAcademy Pro', revenue: 45230.50, members: 1250, status: 'active', riskLevel: 'low' },
      { id: '2', name: 'FitnessHub Elite', revenue: 38920.30, members: 987, status: 'active', riskLevel: 'low' },
      { id: '3', name: 'CryptoMasters', revenue: 32100.20, members: 765, status: 'active', riskLevel: 'medium' },
      { id: '4', name: 'ArtistCollective', revenue: 28450.80, members: 654, status: 'suspended', riskLevel: 'high' },
      { id: '5', name: 'BusinessGrowth', revenue: 25320.40, members: 543, status: 'active', riskLevel: 'low' },
    ],
    recentActivity: [
      { id: '1', type: 'payment', message: 'Payment of $4,250 processed for TechAcademy Pro', timestamp: new Date(), severity: 'info' },
      { id: '2', type: 'fraud', message: 'Suspicious activity detected from IP 192.168.1.1', timestamp: new Date(), severity: 'warning' },
      { id: '3', type: 'signup', message: '15 new members joined in the last hour', timestamp: new Date(), severity: 'info' },
      { id: '4', type: 'error', message: 'Webhook processing failed for payment_123', timestamp: new Date(), severity: 'error' },
      { id: '5', type: 'admin', message: 'Creator "ArtistCollective" suspended for policy violation', timestamp: new Date(), severity: 'critical' },
    ],
  };

  useEffect(() => {
    // Fetch admin stats
    setTimeout(() => {
      setStats(mockStats);
      setIsLoading(false);

      // Check for fraud alerts
      if (mockStats.fraud.riskScore > 20) {
        setShowFraudAlert(true);
      }
    }, 1000);
  }, []);

  const handleCreatorAction = (creatorId: string, action: 'suspend' | 'activate' | 'delete') => {
    console.log(`Action ${action} for creator ${creatorId}`);
    // Implement action logic
  };

  const filteredCreators = mockStats.creators.filter(creator => {
    const matchesSearch = creator.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || creator.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white p-8">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-gray-400">Platform management and monitoring</p>
        </div>

        <div className="flex gap-4">
          <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Security Center
          </button>
          <button className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </div>

      {/* Fraud Alert */}
      {showFraudAlert && (
        <div className="mb-6 p-4 bg-red-600/20 border border-red-600 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <div>
              <p className="font-medium text-red-400">Security Alert</p>
              <p className="text-sm text-gray-300">
                {mockStats.fraud.suspiciousActivity} suspicious activities detected. Review immediately.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowFraudAlert(false)}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Review
          </button>
        </div>
      )}

      {/* Platform Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-400 flex items-center justify-between">
              Platform Revenue
              <DollarSign className="w-4 h-4 text-green-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">
              ${mockStats.platform.totalRevenue.toLocaleString()}
            </p>
            <div className="flex items-center mt-2">
              {mockStats.platform.revenueGrowth > 0 ? (
                <>
                  <ChevronUp className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 text-sm">
                    {mockStats.platform.revenueGrowth}% this month
                  </span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 text-red-400" />
                  <span className="text-red-400 text-sm">
                    {Math.abs(mockStats.platform.revenueGrowth)}% this month
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Platform fees: ${mockStats.platform.platformFees.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-400 flex items-center justify-between">
              User Metrics
              <Users className="w-4 h-4 text-blue-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">
              {mockStats.users.totalMembers.toLocaleString()}
            </p>
            <div className="flex items-center mt-2">
              <span className="text-green-400 text-sm">
                +{mockStats.users.newToday} today
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div>
                <p className="text-xs text-gray-500">Active</p>
                <p className="text-sm font-medium text-white">
                  {mockStats.users.activeMembers.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Creators</p>
                <p className="text-sm font-medium text-white">
                  {mockStats.users.totalCreators}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-400 flex items-center justify-between">
              System Health
              <Activity className="w-4 h-4 text-purple-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">
              {mockStats.system.uptime}%
            </p>
            <div className="flex items-center mt-2">
              <span className="text-green-400 text-sm">Operational</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div>
                <p className="text-xs text-gray-500">API Response</p>
                <p className="text-sm font-medium text-white">
                  {mockStats.system.apiResponseTime}ms
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Success Rate</p>
                <p className="text-sm font-medium text-white">
                  {mockStats.system.webhookSuccessRate}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-400 flex items-center justify-between">
              Security Status
              <Shield className="w-4 h-4 text-red-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">
              {mockStats.fraud.flaggedAccounts}
            </p>
            <div className="flex items-center mt-2">
              <span className="text-yellow-400 text-sm">Accounts flagged</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div>
                <p className="text-xs text-gray-500">Blocked</p>
                <p className="text-sm font-medium text-white">
                  {mockStats.fraud.blockedTransactions}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Risk Score</p>
                <p className={`text-sm font-medium ${
                  mockStats.fraud.riskScore < 20 ? 'text-green-400' :
                  mockStats.fraud.riskScore < 50 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {mockStats.fraud.riskScore}/100
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="bg-[#1A1A1A] border-gray-800 lg:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-white">Creator Management</CardTitle>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search creators..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredCreators.map((creator) => (
                <div
                  key={creator.id}
                  className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg hover:bg-gray-900 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-8 rounded-full ${
                      creator.status === 'active' ? 'bg-green-400' :
                      creator.status === 'suspended' ? 'bg-red-400' : 'bg-yellow-400'
                    }`} />
                    <div>
                      <p className="text-white font-medium">{creator.name}</p>
                      <p className="text-xs text-gray-400">
                        {creator.members} members • ${creator.revenue.toLocaleString()} revenue
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      creator.riskLevel === 'low' ? 'bg-green-600/20 text-green-400' :
                      creator.riskLevel === 'medium' ? 'bg-yellow-600/20 text-yellow-400' :
                      'bg-red-600/20 text-red-400'
                    }`}>
                      {creator.riskLevel} risk
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedCreator(creator.id)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleCreatorAction(creator.id,
                          creator.status === 'active' ? 'suspend' : 'activate'
                        )}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                        title={creator.status === 'active' ? 'Suspend' : 'Activate'}
                      >
                        {creator.status === 'active' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleCreatorAction(creator.id, 'delete')}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockStats.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={`mt-1 w-2 h-2 rounded-full ${
                    activity.severity === 'info' ? 'bg-blue-400' :
                    activity.severity === 'warning' ? 'bg-yellow-400' :
                    activity.severity === 'error' ? 'bg-red-400' : 'bg-purple-400'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm text-gray-300">{activity.message}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700">
              View All Activity
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-[#1A1A1A] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="p-4 bg-gray-900/50 rounded-lg hover:bg-gray-900 transition-colors">
              <Database className="w-6 h-6 text-blue-400 mb-2" />
              <p className="text-sm text-white">Backup Database</p>
            </button>
            <button className="p-4 bg-gray-900/50 rounded-lg hover:bg-gray-900 transition-colors">
              <Download className="w-6 h-6 text-green-400 mb-2" />
              <p className="text-sm text-white">Export Reports</p>
            </button>
            <button className="p-4 bg-gray-900/50 rounded-lg hover:bg-gray-900 transition-colors">
              <Bell className="w-6 h-6 text-yellow-400 mb-2" />
              <p className="text-sm text-white">Send Notifications</p>
            </button>
            <button className="p-4 bg-gray-900/50 rounded-lg hover:bg-gray-900 transition-colors">
              <RefreshCw className="w-6 h-6 text-purple-400 mb-2" />
              <p className="text-sm text-white">Clear Cache</p>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}