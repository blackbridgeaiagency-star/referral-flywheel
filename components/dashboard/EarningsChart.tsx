'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { formatCurrency } from '../../lib/utils/commission';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface EarningsChartProps {
  data: Array<{
    date: string;
    earnings: number;
    count: number;
  }>;
  timeRange: '7' | '30' | '90' | 'year' | 'custom';
  onTimeRangeChange: (range: '7' | '30' | '90' | 'year' | 'custom') => void;
  customStartDate: string;
  customEndDate: string;
  onCustomStartDateChange: (date: string) => void;
  onCustomEndDateChange: (date: string) => void;
}

export function EarningsChart({
  data,
  timeRange,
  onTimeRangeChange,
  customStartDate,
  customEndDate,
  onCustomStartDateChange,
  onCustomEndDateChange
}: EarningsChartProps) {
  // Date range options
  const dateRanges = {
    '7': 'Last 7 days',
    '30': 'Last 30 days',
    '90': 'Last 90 days',
    'year': 'Last year',
    'custom': 'Custom range'
  };

  // Empty state
  if (!data || data.length === 0 || data.every(d => d.earnings === 0)) {
    return (
      <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
        <CardHeader>
          <CardTitle className="text-white">📈 Earnings Chart</CardTitle>
          <div className="flex flex-wrap gap-2">
            {Object.entries(dateRanges).map(([key, label]) => (
              <Button
                key={key}
                variant={timeRange === key ? "default" : "outline"}
                size="sm"
                onClick={() => onTimeRangeChange(key as typeof timeRange)}
                className={timeRange === key ? "bg-purple-600 hover:bg-purple-700" : "border-gray-700 hover:bg-gray-800"}
              >
                {label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-6xl mb-4">💰</div>
            <h3 className="text-lg font-semibold text-gray-300 mb-2">
              No earnings yet!
            </h3>
            <p className="text-gray-500 text-sm max-w-md">
              Share your referral link to start earning 10% lifetime commissions on every sale.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format data for chart
  const chartData = data.map(item => {
    const itemDate = new Date(item.date);
    // For year view (monthly), show month name
    const isMonthlyData = timeRange === 'year';

    return {
      ...item,
      displayDate: isMonthlyData
        ? format(itemDate, 'MMM yyyy')
        : format(itemDate, 'MMM d'),
      fullDate: format(itemDate, 'MMMM d, yyyy')
    };
  });

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#1A1A1A] border border-purple-600/50 rounded-lg p-3 shadow-xl shadow-purple-900/20 backdrop-blur-sm">
          <p className="text-gray-400 text-xs mb-1">{data.fullDate}</p>
          <p className="text-white font-bold text-lg">{formatCurrency(data.earnings)}</p>
          <p className="text-gray-500 text-xs mt-1">
            {data.count} {data.count === 1 ? 'transaction' : 'transactions'}
          </p>
        </div>
      );
    }
    return null;
  };

  const maxEarnings = Math.max(...chartData.map(d => d.earnings));
  const hasEarnings = maxEarnings > 0;
  const totalEarnings = chartData.reduce((sum, item) => sum + item.earnings, 0);

  // Calculate interval for X-axis labels to show ~7 labels
  const xAxisInterval = Math.max(Math.floor(chartData.length / 7), 0);

  return (
    <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-white">📈 Earnings Chart</CardTitle>
            <p className="text-gray-400 text-sm mt-1">
              {dateRanges[timeRange]} • Total: {formatCurrency(totalEarnings)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {Object.entries(dateRanges).map(([key, label]) => (
              <Button
                key={key}
                variant={timeRange === key ? "default" : "outline"}
                size="sm"
                onClick={() => onTimeRangeChange(key as typeof timeRange)}
                className={timeRange === key ? "bg-purple-600 hover:bg-purple-700" : "border-gray-700 hover:bg-gray-800"}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Custom date range inputs */}
        {timeRange === 'custom' && (
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-400">Start Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => onCustomStartDateChange(e.target.value)}
                className="bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-white text-sm focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-400">End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => onCustomEndDateChange(e.target.value)}
                className="bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-white text-sm focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <ResponsiveContainer width="100%" height={300} className="sm:h-[300px] h-[250px]">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
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
              stroke="#6B7280"
              style={{ fontSize: '12px' }}
              tickLine={false}
              tickFormatter={(value) => `$${value}`}
              width={50}
            />

            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#8B5CF6', strokeWidth: 1 }} />

            <Area
              type="monotone"
              dataKey="earnings"
              stroke="#8B5CF6"
              strokeWidth={2}
              fill="url(#earningsGradient)"
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>

        {hasEarnings && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-600"></div>
              <span className="text-gray-400">{timeRange === 'year' ? 'Monthly' : 'Daily'} Earnings</span>
            </div>
            <div className="text-gray-500">
              Peak: {formatCurrency(maxEarnings)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
