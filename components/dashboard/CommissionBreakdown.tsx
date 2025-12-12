'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { formatCurrency } from '../../lib/utils/commission';

interface CommissionBreakdownProps {
  commissionByTier: {
    starter: number;
    ambassador: number;
    elite: number;
  };
  totalPaid: number;
  pendingCommissions: number;
}

const TIER_COLORS = {
  starter: '#3B82F6',    // Blue
  ambassador: '#EAB308', // Yellow
  elite: '#A855F7',      // Purple
};

const TIER_LABELS = {
  starter: 'Starter (10%)',
  ambassador: 'Ambassador (15%)',
  elite: 'Elite (18%)',
};

export function CommissionBreakdown({
  commissionByTier,
  totalPaid,
  pendingCommissions,
}: CommissionBreakdownProps) {
  // Prepare data for pie chart
  const pieData = Object.entries(commissionByTier)
    .filter(([_, value]) => value > 0)
    .map(([tier, value]) => ({
      name: TIER_LABELS[tier as keyof typeof TIER_LABELS],
      value,
      tier,
      color: TIER_COLORS[tier as keyof typeof TIER_COLORS],
    }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.value / totalPaid) * 100).toFixed(1);
      return (
        <div className="bg-[#1A1A1A] border border-gray-700 rounded-lg p-3 shadow-xl">
          <p className="text-white font-semibold">{data.name}</p>
          <p className="text-gray-400 text-sm">
            {formatCurrency(data.value)} ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom legend
  const renderLegend = () => (
    <div className="flex flex-col gap-3 mt-4">
      {pieData.map((entry) => {
        const percentage = totalPaid > 0
          ? ((entry.value / totalPaid) * 100).toFixed(1)
          : '0';
        return (
          <div key={entry.tier} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-400 text-sm">{entry.name}</span>
            </div>
            <div className="text-right">
              <span className="text-white font-medium">
                {formatCurrency(entry.value)}
              </span>
              <span className="text-gray-500 text-xs ml-2">({percentage}%)</span>
            </div>
          </div>
        );
      })}
    </div>
  );

  // Empty state
  if (totalPaid === 0 && pendingCommissions === 0) {
    return (
      <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
        <CardHeader>
          <CardTitle className="text-white">Commission Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="text-5xl mb-3">💸</div>
            <h3 className="text-lg font-semibold text-gray-300 mb-2">
              No commissions yet
            </h3>
            <p className="text-gray-500 text-sm">
              Commission breakdown will appear once affiliates start earning.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
      <CardHeader>
        <CardTitle className="text-white">Commission Breakdown</CardTitle>
        <p className="text-gray-400 text-sm">
          Distribution of commissions by affiliate tier
        </p>
      </CardHeader>
      <CardContent>
        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-[#0F0F0F] rounded-lg p-4 border border-green-500/20">
            <p className="text-gray-400 text-xs mb-1">Total Paid</p>
            <p className="text-green-400 text-2xl font-bold">
              {formatCurrency(totalPaid)}
            </p>
          </div>
          <div className="bg-[#0F0F0F] rounded-lg p-4 border border-yellow-500/20">
            <p className="text-gray-400 text-xs mb-1">Pending</p>
            <p className="text-yellow-400 text-2xl font-bold">
              {formatCurrency(pendingCommissions)}
            </p>
          </div>
        </div>

        {/* Pie chart */}
        {pieData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  animationDuration={1000}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Custom legend */}
            {renderLegend()}
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">
              All commissions are pending or no tier data available.
            </p>
          </div>
        )}

        {/* Tier explanation */}
        <div className="mt-6 p-4 bg-[#0F0F0F] rounded-lg border border-gray-800">
          <p className="text-gray-400 text-xs mb-2 font-medium">
            How Commission Tiers Work
          </p>
          <div className="space-y-1 text-xs text-gray-500">
            <p>
              <span className="text-blue-400 font-medium">Starter:</span> 0-49 referrals = 10% commission
            </p>
            <p>
              <span className="text-yellow-400 font-medium">Ambassador:</span> 50-99 referrals = 15% commission
            </p>
            <p>
              <span className="text-purple-400 font-medium">Elite:</span> 100+ referrals = 18% commission
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
