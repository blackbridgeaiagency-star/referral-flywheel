// app/customer/[experienceId]/page.tsx
import { prisma } from '../../../lib/db/prisma';
import { CompactReferralLinkCard } from '../../../components/dashboard/CompactReferralLinkCard';
import { CustomCompetitionBanner } from '../../../components/dashboard/CustomCompetitionBanner';
import { StatsGrid } from '../../../components/dashboard/StatsGrid';
import { RewardProgress } from '../../../components/dashboard/RewardProgress';
import { EarningsChartWrapper } from '../../../components/dashboard/EarningsChartWrapper';
import { LeaderboardButton } from '../../../components/dashboard/LeaderboardButton';
import { MemberOnboardingModal } from '../../../components/dashboard/MemberOnboardingModal';
import { WhopUsernameSetup } from '../../../components/dashboard/WhopUsernameSetup';
import { EarningsCalculator } from '../../../components/dashboard/EarningsCalculator';
import { CommissionTierBadge } from '../../../components/dashboard/TierProgressCard';
import { formatCurrency } from '../../../lib/utils/commission';
import { getCompleteMemberDashboardData } from '../../../lib/data/centralized-queries';
import { getCommissionTier } from '../../../lib/utils/tiered-commission';
import { notFound } from 'next/navigation';
import { getWhopContext, canAccessMemberDashboard } from '../../../lib/whop/simple-auth';
import logger from '../../../lib/logger';


// Disable caching to always fetch fresh creator settings
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MemberDashboard({
  params
}: {
  params: { experienceId: string }
}) {
  try {
    // ========================================
    // SIMPLIFIED AUTHENTICATION
    // ========================================
    // Whop handles authentication in their iframe
    const canAccess = await canAccessMemberDashboard(params.experienceId);

    // Get Whop context for user info (optional)
    const whopContext = await getWhopContext();
    const authenticatedUserId = whopContext.userId;
    // ========================================
    // P0 CRITICAL: Auto-create member if doesn't exist
    // Whop passes membershipId as experienceId
    // ========================================

    // When we have authenticated user, we could enhance lookup to also check whopUserId
    // This would allow finding member even if accessing with different experience ID
    let member = await prisma.member.findUnique({
      where: { membershipId: params.experienceId },
      select: { id: true }
    });

    // If member doesn't exist, we need to create them
    // But we need creator info first - try to find via Whop API or use default
    if (!member) {
      logger.info(` Auto-creating member for membership: ${params.experienceId}`);

      // For now, we'll need the creator to be set up first
      // In production, this would come from Whop webhook or API call
      const defaultCreator = await prisma.creator.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { id: true, companyId: true }
      });

      if (!defaultCreator) {
        throw new Error('No creator found. Please set up your creator account first.');
      }

      // Create member with minimal data
      // In production, get this from Whop API
      const { generateReferralCode } = await import('../../../lib/utils/referral-code');
      const referralCode = generateReferralCode(); // Privacy-safe code with no PII

      member = await prisma.member.create({
        data: {
          membershipId: params.experienceId,
          userId: `user_${params.experienceId}`, // Temporary - updated by webhook
          email: `member@${params.experienceId}.temp`, // Temporary - updated by webhook
          username: 'New Member', // Temporary - updated by webhook
          referralCode: referralCode,
          creatorId: defaultCreator.id,
          subscriptionPrice: 49.99, // Default - updated by webhook
        },
        select: { id: true }
      });

      logger.info(`Member auto-created: ${member.id}`);
    }

    // ========================================
    // ✅ USING CENTRALIZED QUERY LAYER
    // Single source of truth for ALL data
    // ========================================
    const data = await getCompleteMemberDashboardData(params.experienceId);

    // Get creator info for reward tiers and custom rewards
    const creator = await prisma.creator.findUnique({
      where: { id: data.creatorId },
      select: {
        companyName: true,
        defaultSubscriptionPrice: true,  // Creator's actual subscription price
        tier1Count: true,
        tier1Reward: true,
        tier2Count: true,
        tier2Reward: true,
        tier3Count: true,
        tier3Reward: true,
        tier4Count: true,
        tier4Reward: true,
        customRewardEnabled: true,
        customRewardTimeframe: true,
        customRewardType: true,
        customReward1st: true,
        customReward2nd: true,
        customReward3rd: true,
        customReward4th: true,
        customReward5th: true,
        customReward6to10: true,
      },
    });

    if (!creator) {
      notFound();
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const referralUrl = `${appUrl}/r/${data.referralCode}`;

    // Prepare reward tiers (legacy creator-defined tiers)
    const rewardTiers = [
      { count: creator.tier1Count, reward: creator.tier1Reward },
      { count: creator.tier2Count, reward: creator.tier2Reward },
      { count: creator.tier3Count, reward: creator.tier3Reward },
      { count: creator.tier4Count, reward: creator.tier4Reward },
    ];

    // ========================================
    // TIERED COMMISSION SYSTEM
    // Calculate member's current tier based on paid referrals
    // ========================================
    const tierConfig = getCommissionTier(data.totalReferred);

    // Get actual subscription price - priority: creator's price > member's price > default
    // Creator's defaultSubscriptionPrice is auto-captured from first payment webhook
    const actualSubscriptionPrice = creator.defaultSubscriptionPrice || data.subscriptionPrice || 49.99;

    // ========================================
    // ✅ ALL DATA FROM CENTRALIZED SOURCE
    // No webhook dependencies!
    // All calculations done from Commission records!
    // ========================================

    return (
      <div className="min-h-screen bg-[#0F0F0F] text-white">
      {/* Header with integrated Leaderboard button */}
      <header className="border-b border-gray-800 bg-[#1A1A1A]/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            {/* Leaderboard Button */}
            <div className="w-full sm:w-auto">
              <LeaderboardButton
                memberId={data.memberId}
                creatorId={data.creatorId}
              />
            </div>

            {/* Header Text */}
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold">
                Welcome to {creator.companyName}'s Community
              </h1>
              <p className="text-gray-400 text-xs sm:text-sm">
                Earn 10% lifetime commission on every referral
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Member Onboarding Modal - Shows as popup for new members */}
        <MemberOnboardingModal
          memberName={data.username}
          creatorName={creator.companyName}
          referralLink={referralUrl}
          memberId={data.memberId}
        />

        {/* Whop Username Setup - Required for affiliate link to work (Strategy B) */}
        {!data.whopUsername && (
          <WhopUsernameSetup
            memberId={data.memberId}
            currentWhopUsername={data.whopUsername}
            referralCode={data.referralCode}
          />
        )}

        {/* Compact Referral Link Card - MOVED TO TOP FOR PROMINENCE */}
        <CompactReferralLinkCard code={data.referralCode} url={referralUrl} memberId={data.memberId} />

        {/* Custom Competition Banner - Shows when creator enables competition */}
        <CustomCompetitionBanner
          isEnabled={creator.customRewardEnabled || false}
          timeframe={creator.customRewardTimeframe}
          type={creator.customRewardType}
          reward1st={creator.customReward1st}
          reward2nd={creator.customReward2nd}
          reward3rd={creator.customReward3rd}
          reward4th={creator.customReward4th}
          reward5th={creator.customReward5th}
          reward6to10={creator.customReward6to10}
          currentRank={data.communityRank}
          memberId={data.memberId}
          creatorId={data.creatorId}
        />

        {/* Stats Grid - ✅ USING CENTRALIZED DATA with REAL-TIME UPDATES */}
        <StatsGrid
          memberId={data.memberId}
          stats={{
            monthlyEarnings: data.monthlyEarnings,
            lifetimeEarnings: data.lifetimeEarnings,
            totalReferred: data.totalReferred,
            monthlyReferred: data.monthlyReferred,
            monthlyTrend: data.monthlyTrend, // ✅ Calculated, not hardcoded!
            globalEarningsRank: data.globalEarningsRank,
            globalReferralsRank: data.globalReferralsRank,
            communityRank: data.communityRank,
          }}
        />

        {/* Earnings Chart - ✅ USING CENTRALIZED DATA */}
        <EarningsChartWrapper
          memberId={data.memberId}
          initialData={data.earningsHistory.map(e => ({
            date: typeof e.date === 'string' ? e.date.split('T')[0] : new Date(e.date).toISOString().split('T')[0],
            earnings: e.earnings,
            count: 1  // Default count for backwards compatibility
          }))}
        />

        {/* Earnings Calculator - Interactive slider */}
        <EarningsCalculator
          avgSubscriptionPrice={actualSubscriptionPrice}
          userSubscriptionPrice={actualSubscriptionPrice}
          currentReferrals={data.totalReferred}
          communityName={creator.companyName}
        />

        {/* Reward Progress */}
        <RewardProgress
          currentReferrals={data.totalReferred}
          tiers={rewardTiers}
        />

        {/* Recent Referrals - ✅ USING CENTRALIZED DATA */}
        {data.referrals.length > 0 && (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-6">
            <h2 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
              📊 Your Recent Referrals
              <span className="text-sm font-normal text-gray-500">
                ({data.referrals.length} total)
              </span>
            </h2>
            <div className="space-y-1">
              {data.referrals.map((referral, i) => (
                <div key={i} className="flex justify-between items-center py-3 px-4 rounded-lg hover:bg-gray-800/50 transition-colors border-b border-gray-800 last:border-0">
                  <div className="flex-1">
                    <span className="text-gray-200 font-medium">{referral.username}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {referral.paymentCount} payment{referral.paymentCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-green-400 font-bold">
                        {formatCurrency(referral.totalEarnings)}
                      </div>
                      <div className="text-xs text-gray-500">
                        earned
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-gray-400">
                        {new Date(referral.firstPaymentDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: new Date(referral.firstPaymentDate).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Commission Tier - Compact badge at bottom */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-sm">Your Commission Tier:</span>
              <CommissionTierBadge
                tier={tierConfig.tierName}
                rate={tierConfig.memberRate}
                size="md"
              />
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Earn per referral</div>
              <div className="text-green-400 font-semibold">
                {formatCurrency(actualSubscriptionPrice * tierConfig.memberRate)}/mo
              </div>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500">
            {tierConfig.tierName === 'starter' && (
              <span>Reach 50 referrals to unlock Ambassador tier (15% commission)</span>
            )}
            {tierConfig.tierName === 'ambassador' && (
              <span>Reach 100 referrals to unlock Elite tier (18% commission)</span>
            )}
            {tierConfig.tierName === 'elite' && (
              <span>🏆 You've reached the highest tier! Maximum commission rate.</span>
            )}
          </div>
        </div>
      </main>
    </div>
  );
  } catch (error) {
    logger.error('❌ Error loading member dashboard:', error);
    notFound();
  }
}
