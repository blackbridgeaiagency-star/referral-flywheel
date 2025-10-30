// components/dashboard/CommunityStatsGrid.tsx
import { Card, CardContent } from '../ui/card';
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
    totalSharesSent?: number; // Total share actions by members
    topPerformerContribution?: number; // Percentage contribution from top 10 earners
    topPerformerTotal?: number; // DOLLAR AMOUNT from top 10
    // 🎮 GAMIFICATION METRICS
    globalRevenueRank?: number; // Global rank by revenue
    globalReferralRank?: number; // Global rank by referrals
    totalCreators?: number; // Total number of creators (for context)
    referralMomentum?: number; // % of members who have made at least 1 referral
    membersWithReferrals?: number; // Count of members who have made referrals
    // ✅ NEW GAMIFICATION METRICS
    shareToConversionRate?: number; // Quality: % of shares that convert to referrals
    monthlyGrowthRate?: number; // Growth: % growth this month vs last month
    thisMonthReferrals?: number; // Context for growth rate
    lastMonthReferrals?: number; // Context for growth rate
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

      {/* 🎮 Gamification insights row - BALANCED MIX */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        {/* ✅ GROWTH METRIC: Referral Momentum */}
        <InsightCard
          label="🔥 Referral Momentum"
          value={stats.referralMomentum !== undefined ? `${stats.referralMomentum.toFixed(1)}%` : 'N/A'}
          description={stats.membersWithReferrals !== undefined
            ? `${stats.membersWithReferrals} of ${stats.totalMembers} members referring`
            : 'Members making referrals'}
          isHighlight={!!(stats.referralMomentum && stats.referralMomentum > 30)}
          highlightThreshold="Good if >30%"
        />

        {/* ✅ QUALITY METRIC: Share-to-Conversion Rate */}
        <InsightCard
          label="⚡ Share Effectiveness"
          value={stats.shareToConversionRate !== undefined ? `${stats.shareToConversionRate.toFixed(1)}%` : 'N/A'}
          description={stats.totalSharesSent && stats.totalReferrals
            ? `${stats.totalReferrals} referrals from ${stats.totalSharesSent} shares`
            : 'How effective are member shares?'}
          isHighlight={!!(stats.shareToConversionRate && stats.shareToConversionRate > 20)}
          highlightThreshold="Excellent if >20%"
        />

        {/* ✅ COMPETITIVE METRIC: Monthly Growth Velocity */}
        <InsightCard
          label="📈 Monthly Growth"
          value={stats.monthlyGrowthRate !== undefined
            ? `${stats.monthlyGrowthRate > 0 ? '+' : ''}${stats.monthlyGrowthRate.toFixed(1)}%`
            : 'N/A'}
          description={stats.thisMonthReferrals !== undefined && stats.lastMonthReferrals !== undefined
            ? `${stats.thisMonthReferrals} referrals this month (${stats.lastMonthReferrals} last month)`
            : 'Growth vs last month'}
          isHighlight={!!(stats.monthlyGrowthRate && stats.monthlyGrowthRate > 30)}
          highlightThreshold="Strong if >30%"
          showTrend={stats.monthlyGrowthRate !== undefined}
          trendDirection={stats.monthlyGrowthRate && stats.monthlyGrowthRate > 0 ? 'up' : 'down'}
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
  isHighlight = false,
  highlightThreshold,
  showTrend = false,
  trendDirection,
}: {
  label: string;
  value: string;
  description: string;
  isHighlight?: boolean;
  highlightThreshold?: string;
  showTrend?: boolean;
  trendDirection?: 'up' | 'down';
}) {
  return (
    <div className={`bg-[#1A1A1A] border rounded-xl p-5 transition-all duration-300 hover:shadow-lg group relative overflow-hidden ${
      isHighlight
        ? 'border-yellow-500/50 hover:border-yellow-400 shadow-yellow-500/20 shadow-lg'
        : 'border-gray-800 hover:border-gray-700'
    }`}>
      {/* 🎮 Top Performer Highlight Effect */}
      {isHighlight && (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-600/10 via-yellow-900/5 to-transparent" />
          <div className="absolute top-2 right-2">
            <span className="text-xs font-bold text-yellow-400 bg-yellow-500/20 px-2 py-1 rounded-full border border-yellow-500/30">
              🔥 TOP
            </span>
          </div>
        </>
      )}

      <p className={`text-xs uppercase tracking-wider mb-3 font-semibold relative z-10 ${
        isHighlight ? 'text-yellow-400' : 'text-gray-400'
      }`}>
        {label}
      </p>
      <div className="flex items-center gap-2 mb-2 relative z-10">
        <p className={`text-2xl font-bold transition-colors ${
          isHighlight
            ? 'text-yellow-300 group-hover:text-yellow-200'
            : 'text-white group-hover:text-purple-400'
        }`}>
          {value}
        </p>
        {showTrend && trendDirection && (
          <span className={`text-lg ${trendDirection === 'up' ? 'text-green-400' : 'text-red-400'}`}>
            {trendDirection === 'up' ? '↑' : '↓'}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 leading-relaxed relative z-10 mb-1">{description}</p>
      {highlightThreshold && (
        <p className="text-[10px] text-gray-600 relative z-10 italic">{highlightThreshold}</p>
      )}
    </div>
  );
}
