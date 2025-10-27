// components/dashboard/CommunityStatsGrid.tsx
import { Card, CardContent } from '@/components/ui/card';
import { Users, Target, TrendingUp, UserPlus } from 'lucide-react';

interface CommunityStatsGridProps {
  stats: {
    totalMembers: number;
    avgReferralsPerMember: number;
    avgEarningsPerMember: number;
    totalClicks: number;
    convertedClicks: number;
    organicSignups: number;
    attributionRate: number;
    totalReferrals: number;
    totalRevenue: number;
    monthlyRevenue: number;
    totalSharesSent?: number; // 🆕 OPTIONAL - total share actions by members
    topPerformerContribution?: number; // Percentage contribution from top 10 earners
    topPerformerTotal?: number; // ✅ DOLLAR AMOUNT from top 10
  };
  organicCount: number;
  referredCount: number;
}

export function CommunityStatsGrid({ stats, organicCount, referredCount }: CommunityStatsGridProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full"></div>
        <h2 className="text-3xl font-bold text-white">Community Health</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Users className="w-6 h-6" />}
          title="Active Members"
          value={stats.totalMembers.toLocaleString()}
          subtitle={`${organicCount} Organic, ${referredCount} referred`}
          iconColor="text-blue-400"
          bgColor="bg-blue-500/20"
          borderColor="border-blue-500/30"
          bgGradient="from-blue-600/15 via-blue-900/20 to-transparent"
        />

        <StatCard
          icon={<Target className="w-6 h-6" />}
          title="Total Shares Sent"
          value={(stats.totalSharesSent || 0).toLocaleString()}
          subtitle="Members shared their links"
          iconColor="text-purple-400"
          bgColor="bg-purple-500/20"
          borderColor="border-purple-500/30"
          bgGradient="from-purple-600/15 via-purple-900/20 to-transparent"
        />

        <StatCard
          icon={<TrendingUp className="w-6 h-6" />}
          title="Monthly Growth"
          value={`+${Math.round((stats.monthlyRevenue / Math.max(stats.totalRevenue - stats.monthlyRevenue, 1)) * 100)}%`}
          subtitle={`$${stats.monthlyRevenue.toFixed(2)} this month`}
          iconColor="text-green-400"
          bgColor="bg-green-500/20"
          borderColor="border-green-500/30"
          bgGradient="from-green-600/15 via-green-900/20 to-transparent"
        />

        <StatCard
          icon={<UserPlus className="w-6 h-6" />}
          title="Avg Earnings/Member"
          value={`$${stats.avgEarningsPerMember.toFixed(2)}`}
          subtitle="Lifetime per member"
          iconColor="text-yellow-400"
          bgColor="bg-yellow-500/20"
          borderColor="border-yellow-500/30"
          bgGradient="from-yellow-600/15 via-yellow-900/20 to-transparent"
        />
      </div>

      {/* Additional insights row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <InsightCard
          label="Attribution Clicks"
          value={`${stats.totalClicks.toLocaleString()} clicks`}
          description="People clicked referral links"
        />
        <InsightCard
          label="Conversion Quality"
          value={stats.totalClicks > 0 ? `${((stats.convertedClicks / stats.totalClicks) * 100).toFixed(1)}%` : '0%'}
          description="Clicks that converted to sales"
        />
        <InsightCard
          label="Revenue from Top 10"
          value={stats.topPerformerTotal !== undefined
            ? `$${stats.topPerformerTotal.toFixed(2)}`
            : 'N/A'}
          description={stats.topPerformerContribution !== undefined
            ? `${stats.topPerformerContribution.toFixed(1)}% of total revenue`
            : 'Top performers total earnings'}
        />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  title,
  value,
  subtitle,
  iconColor,
  bgColor,
  borderColor,
  bgGradient,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  bgGradient: string;
}) {
  return (
    <Card className={`bg-[#1A1A1A] border ${borderColor} overflow-hidden relative transition-all duration-300 hover:border-opacity-100 hover:shadow-lg group`}>
      {/* Background gradient effect */}
      <div className={`absolute inset-0 bg-gradient-to-br ${bgGradient} transition-opacity duration-300 group-hover:opacity-100`} />

      <CardContent className="p-6 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`${iconColor} ${bgColor} p-3 rounded-xl border ${borderColor}`}>
            {icon}
          </div>
        </div>
        <p className="text-sm text-gray-400 mb-2 font-medium">{title}</p>
        <p className="text-3xl font-bold text-white mb-2">{value}</p>
        <p className="text-xs text-gray-500 leading-relaxed">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function InsightCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="bg-[#1A1A1A] border border-gray-800 hover:border-gray-700 rounded-xl p-5 transition-all duration-300 hover:shadow-lg group">
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-semibold">{label}</p>
      <p className="text-2xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">{value}</p>
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}
