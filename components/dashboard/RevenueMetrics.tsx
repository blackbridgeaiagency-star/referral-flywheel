// components/dashboard/RevenueMetrics.tsx
import { Card, CardContent } from '../ui/card';
import { formatCurrency } from '../../lib/utils/commission';
import { TrendingUp, DollarSign, MousePointerClick, Percent } from 'lucide-react';

interface RevenueMetricsProps {
  revenueBreakdown: {
    totalRevenue: number;
    totalMonthlyRevenue: number;
    referralContribution: number;
    activeSubscriptions: number;
    organicCount: number;
    referredCount: number;
    totalMembers: number;
    totalActiveClicks: number;
    convertedActiveClicks: number;
  };
}

export function RevenueMetrics({ revenueBreakdown }: RevenueMetricsProps) {
  // Calculate conversion rate
  const conversionRate = revenueBreakdown.totalActiveClicks > 0
    ? (revenueBreakdown.convertedActiveClicks / revenueBreakdown.totalActiveClicks) * 100
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-1 h-8 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
        <h2 className="text-3xl font-bold text-white">Revenue Overview</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue */}
        <MetricCard
          icon={<DollarSign className="w-6 h-6" />}
          title="Total Revenue"
          value={formatCurrency(revenueBreakdown.totalRevenue)}
          subtitle="Since downloading this app"
          iconColor="text-purple-400"
          iconBg="bg-purple-500/20"
          bgGradient="from-purple-600/20 via-purple-900/30 to-transparent"
          borderColor="border-purple-500/30"
          isPrimary={true}
        />

        {/* Monthly Revenue */}
        <MetricCard
          icon={<TrendingUp className="w-6 h-6" />}
          title="Monthly Revenue"
          value={formatCurrency(revenueBreakdown.totalMonthlyRevenue)}
          subtitle={`+${formatCurrency(revenueBreakdown.referralContribution)} from referrals`}
          iconColor="text-green-400"
          iconBg="bg-green-500/20"
          bgGradient="from-green-600/20 via-green-900/30 to-transparent"
          borderColor="border-green-500/30"
          isPrimary={true}
        />

        {/* Total Referral Links Clicked */}
        <MetricCard
          icon={<MousePointerClick className="w-6 h-6" />}
          title="Total Referral Links Clicked"
          value={revenueBreakdown.totalActiveClicks.toLocaleString()}
          subtitle="All members combined"
          iconColor="text-blue-400"
          iconBg="bg-blue-500/20"
          bgGradient="from-blue-600/15 via-blue-900/20 to-transparent"
          borderColor="border-blue-500/20"
        />

        {/* Conversion Quality */}
        <MetricCard
          icon={<Percent className="w-6 h-6" />}
          title="Conversion Quality"
          value={`${conversionRate.toFixed(1)}%`}
          subtitle={`${revenueBreakdown.convertedActiveClicks} / ${revenueBreakdown.totalActiveClicks} clicks`}
          iconColor="text-yellow-400"
          iconBg="bg-yellow-500/20"
          bgGradient="from-yellow-600/15 via-yellow-900/20 to-transparent"
          borderColor="border-yellow-500/20"
        />
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  title,
  value,
  subtitle,
  iconColor,
  iconBg,
  bgGradient,
  borderColor,
  isPrimary = false,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  iconColor: string;
  iconBg: string;
  bgGradient: string;
  borderColor: string;
  isPrimary?: boolean;
}) {
  return (
    <Card className={`bg-[#1A1A1A] border ${borderColor} overflow-hidden relative transition-all duration-300 hover:border-opacity-100 hover:shadow-xl ${isPrimary ? 'hover:scale-105' : 'hover:scale-102'} group`}>
      {/* Background gradient effect */}
      <div className={`absolute inset-0 bg-gradient-to-br ${bgGradient} transition-opacity duration-300 group-hover:opacity-100`} />

      {/* Glow effect on hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${bgGradient} blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-300`} />

      <CardContent className={`${isPrimary ? 'p-8' : 'p-6'} relative z-10`}>
        <div className="flex items-center justify-between mb-4">
          <div className={`${iconColor} ${iconBg} ${isPrimary ? 'p-3' : 'p-2'} rounded-xl border ${borderColor} backdrop-blur`}>
            {icon}
          </div>
        </div>
        <p className="text-sm text-gray-400 mb-2 font-medium">{title}</p>
        <p className={`${isPrimary ? 'text-4xl' : 'text-3xl'} font-bold text-white mb-2 transition-all`}>{value}</p>
        <p className="text-xs text-gray-500 leading-relaxed">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
