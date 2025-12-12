'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useState } from 'react';

interface RevenueChartProps {
  dailyRevenue: Array<{ date: string; amount: number }>;
  dailyReferrals: Array<{ date: string; count: number }>;
  period: string;
  onPeriodChange?: (period: string) => void;
}

type ChartMode = 'revenue' | 'referrals' | 'combined';

export function RevenueChart({
  dailyRevenue,
  dailyReferrals,
  period,
  onPeriodChange,
}: RevenueChartProps) {
  const [chartMode, setChartMode] = useState<ChartMode>('revenue');

  const periods = [
    { key: '7d', label: '7 Days' },
    { key: '30d', label: '30 Days' },
    { key: '90d', label: '90 Days' },
    { key: 'all', label: 'All Time' },
  ];

  // Combine data for chart
  const combinedData = dailyRevenue.map((rev, i) => ({
    date: rev.date,
    revenue: rev.amount,
    referrals: dailyReferrals[i]?.count || 0,
    displayDate: format(parseISO(rev.date), 'MMM d'),
    fullDate: format(parseISO(rev.date), 'MMMM d, yyyy'),
  }));

  // Calculate totals
  const totalRevenue = dailyRevenue.reduce((sum, d) => sum + d.amount, 0);
  const totalReferrals = dailyReferrals.reduce((sum, d) => sum + d.count, 0);
  const maxRevenue = Math.max(...dailyRevenue.map(d => d.amount), 1);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#1A1A1A] border border-purple-600/50 rounded-lg p-3 shadow-xl shadow-purple-900/20 backdrop-blur-sm">
          <p className="text-gray-400 text-xs mb-2">{data.fullDate}</p>
          {(chartMode === 'revenue' || chartMode === 'combined') && (
            <p className="text-white font-bold text-lg">
              ${data.revenue.toFixed(2)}
              <span className="text-gray-500 text-xs ml-1">revenue</span>
            </p>
          )}
          {(chartMode === 'referrals' || chartMode === 'combined') && (
            <p className="text-green-400 font-bold text-lg">
              {data.referrals}
              <span className="text-gray-500 text-xs ml-1">referrals</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // X-axis interval for cleaner labels
  const xAxisInterval = Math.max(Math.floor(combinedData.length / 7), 0);

  // Empty state
  if (combinedData.length === 0 || (totalRevenue === 0 && totalReferrals === 0)) {
    return (
      <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
        <CardHeader>
          <CardTitle className="text-white">Revenue & Referrals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-gray-300 mb-2">
              No data yet
            </h3>
            <p className="text-gray-500 text-sm max-w-md">
              Once your affiliates start generating referrals and revenue, you'll see detailed charts here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-white">Revenue & Referrals</CardTitle>
            <p className="text-gray-400 text-sm mt-1">
              Total: ${totalRevenue.toFixed(2)} revenue | {totalReferrals} referrals
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Chart mode toggle */}
            <div className="flex rounded-lg overflow-hidden border border-gray-700">
              <button
                onClick={() => setChartMode('revenue')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  chartMode === 'revenue'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                Revenue
              </button>
              <button
                onClick={() => setChartMode('referrals')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  chartMode === 'referrals'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                Referrals
              </button>
              <button
                onClick={() => setChartMode('combined')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  chartMode === 'combined'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                Both
              </button>
            </div>

            {/* Period selector */}
            {onPeriodChange && (
              <div className="flex gap-1">
                {periods.map((p) => (
                  <Button
                    key={p.key}
                    variant={period === p.key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onPeriodChange(p.key)}
                    className={
                      period === p.key
                        ? 'bg-purple-600 hover:bg-purple-700 text-xs'
                        : 'border-gray-700 hover:bg-gray-800 text-xs'
                    }
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          {chartMode === 'referrals' ? (
            // Bar chart for referrals
            <BarChart
              data={combinedData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#2A2A2A"
                vertical={false}
              />
              <XAxis
                dataKey="displayDate"
                stroke="#6B7280"
                style={{ fontSize: '12px' }}
                tickLine={false}
                interval={xAxisInterval}
              />
              <YAxis
                stroke="#6B7280"
                style={{ fontSize: '12px' }}
                tickLine={false}
                allowDecimals={false}
                width={40}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }} />
              <Bar
                dataKey="referrals"
                fill="#22c55e"
                radius={[4, 4, 0, 0]}
                animationDuration={1000}
              />
            </BarChart>
          ) : (
            // Area chart for revenue (and combined)
            <AreaChart
              data={combinedData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="referralsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#2A2A2A"
                vertical={false}
              />
              <XAxis
                dataKey="displayDate"
                stroke="#6B7280"
                style={{ fontSize: '12px' }}
                tickLine={false}
                interval={xAxisInterval}
              />
              <YAxis
                yAxisId="revenue"
                stroke="#6B7280"
                style={{ fontSize: '12px' }}
                tickLine={false}
                tickFormatter={(value) => `$${value}`}
                width={50}
              />
              {chartMode === 'combined' && (
                <YAxis
                  yAxisId="referrals"
                  orientation="right"
                  stroke="#22c55e"
                  style={{ fontSize: '12px' }}
                  tickLine={false}
                  allowDecimals={false}
                  width={30}
                />
              )}
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: '#8B5CF6', strokeWidth: 1 }}
              />

              {(chartMode === 'revenue' || chartMode === 'combined') && (
                <Area
                  yAxisId="revenue"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                  animationDuration={1000}
                />
              )}

              {chartMode === 'combined' && (
                <Area
                  yAxisId="referrals"
                  type="monotone"
                  dataKey="referrals"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="url(#referralsGradient)"
                  animationDuration={1000}
                />
              )}
            </AreaChart>
          )}
        </ResponsiveContainer>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-6 text-sm">
          {(chartMode === 'revenue' || chartMode === 'combined') && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-600"></div>
              <span className="text-gray-400">Revenue</span>
            </div>
          )}
          {(chartMode === 'referrals' || chartMode === 'combined') && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-gray-400">Referrals</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
