// app/admin/webhook-monitor/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import logger from '../../../lib/logger';
import { fetchWebhookStats } from '../actions';
import {
Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Filter,
} from 'lucide-react';

interface WebhookEvent {
  id: string;
  timestamp: Date;
  action: string;
  status: 'success' | 'failed' | 'pending';
  duration: number;
  paymentId?: string;
  membershipId?: string;
  amount?: number;
  error?: string;
  retryCount?: number;
}

interface WebhookStats {
  total: number;
  successful: number;
  failed: number;
  pending: number;
  avgDuration: number;
  successRate: number;
  totalRevenue: number;
  recentEvents: WebhookEvent[];
  hourlyStats: Array<{
    hour: string;
    count: number;
    success: number;
    failed: number;
  }>;
}

export default function WebhookMonitor() {
  const [stats, setStats] = useState<WebhookStats | null>(null);
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed' | 'pending'>('all');
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  // Fetch webhook stats using server action
  const loadStats = async () => {
    try {
      const data = await fetchWebhookStats(timeRange);
      if (data.stats) {
        setStats(data.stats);
        setEvents(data.events || []);
      }
    } catch (error) {
      logger.error('Failed to fetch webhook stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh every 5 seconds
  useEffect(() => {
    loadStats();

    if (autoRefresh) {
      const interval = setInterval(loadStats, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, timeRange]);

  // Filter events
  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    return event.status === filter;
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Webhook Monitor</h1>
        <p className="text-gray-400">Real-time monitoring of Whop payment webhooks</p>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2">
          {['1h', '24h', '7d', '30d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range as any)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                timeRange === range
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {range}
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
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={loadStats}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
          >
            Refresh Now
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Webhooks */}
          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-400">Total Webhooks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-white">{stats.total.toLocaleString()}</span>
                <Activity className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          {/* Success Rate */}
          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-400">Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-white">
                  {stats.successRate.toFixed(1)}%
                </span>
                {stats.successRate >= 95 ? (
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                ) : stats.successRate >= 90 ? (
                  <AlertCircle className="w-8 h-8 text-yellow-400" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-400" />
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {stats.successful} successful / {stats.failed} failed
              </p>
            </CardContent>
          </Card>

          {/* Average Duration */}
          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-400">Avg Processing Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-white">
                  {stats.avgDuration.toFixed(0)}ms
                </span>
                <Clock className="w-8 h-8 text-purple-400" />
              </div>
              {stats.avgDuration > 1000 && (
                <p className="text-xs text-yellow-400 mt-2">
                  ⚠️ Processing time is high
                </p>
              )}
            </CardContent>
          </Card>

          {/* Total Revenue Processed */}
          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-400">Revenue Processed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-white">
                  ${stats.totalRevenue.toLocaleString()}
                </span>
                <TrendingUp className="w-8 h-8 text-green-400" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                From {stats.successful} payments
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Hourly Chart */}
      {stats?.hourlyStats && (
        <Card className="bg-[#1A1A1A] border-gray-800 mb-8">
          <CardHeader>
            <CardTitle className="text-white">Hourly Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end gap-2">
              {stats.hourlyStats.map((hour, i) => {
                const maxCount = Math.max(...stats.hourlyStats.map(h => h.count));
                const height = (hour.count / maxCount) * 100;

                return (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-t relative group"
                      style={{ height: `${height}%` }}
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        <div>{hour.count} total</div>
                        <div className="text-green-400">{hour.success} success</div>
                        {hour.failed > 0 && (
                          <div className="text-red-400">{hour.failed} failed</div>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 mt-2">{hour.hour}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Events */}
      <Card className="bg-[#1A1A1A] border-gray-800">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-white">Recent Events</CardTitle>
            <div className="flex gap-2">
              {['all', 'success', 'failed', 'pending'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    filter === f
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredEvents.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No events found</p>
            ) : (
              filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg hover:bg-gray-900 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Status Icon */}
                    {event.status === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    ) : event.status === 'failed' ? (
                      <XCircle className="w-5 h-5 text-red-400" />
                    ) : (
                      <Clock className="w-5 h-5 text-yellow-400 animate-pulse" />
                    )}

                    {/* Event Info */}
                    <div>
                      <p className="text-white font-medium">{event.action}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                      {event.error && (
                        <p className="text-xs text-red-400 mt-1">{event.error}</p>
                      )}
                    </div>
                  </div>

                  {/* Event Details */}
                  <div className="flex items-center gap-6">
                    {event.amount && (
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Amount</p>
                        <p className="text-white font-medium">${event.amount.toFixed(2)}</p>
                      </div>
                    )}

                    <div className="text-right">
                      <p className="text-sm text-gray-400">Duration</p>
                      <p className="text-white font-medium">{event.duration}ms</p>
                    </div>

                    {event.retryCount && event.retryCount > 0 && (
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Retries</p>
                        <p className="text-yellow-400 font-medium">{event.retryCount}</p>
                      </div>
                    )}

                    {/* View Details Button */}
                    <button className="px-3 py-1 bg-gray-800 text-white text-sm rounded hover:bg-gray-700">
                      Details
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}