// app/customer/[experienceId]/page.tsx
import { prisma } from '../../../lib/db/prisma';
import { CompactReferralLinkCard } from '../../../components/dashboard/CompactReferralLinkCard';
import { ReferralUrlGenerator } from '../../../components/dashboard/ReferralUrlGenerator';
import { CustomCompetitionBanner } from '../../../components/dashboard/CustomCompetitionBanner';
import { StatsGrid } from '../../../components/dashboard/StatsGrid';
import { RewardProgress } from '../../../components/dashboard/RewardProgress';
import { EarningsChartWrapper } from '../../../components/dashboard/EarningsChartWrapper';
import { LeaderboardButton } from '../../../components/dashboard/LeaderboardButton';
import { MemberOnboardingModal } from '../../../components/dashboard/MemberOnboardingModal';
import { WhopUsernameSetup } from '../../../components/dashboard/WhopUsernameSetup';
import { EarningsCalculator } from '../../../components/dashboard/EarningsCalculator';
import { CommissionTierBadge } from '../../../components/dashboard/TierProgressCard';
import { StreakDisplay, StreakCard } from '../../../components/dashboard/StreakDisplay';
import { formatCurrency } from '../../../lib/utils/commission';
import { getCompleteMemberDashboardData } from '../../../lib/data/centralized-queries';
import { getCommissionTier } from '../../../lib/utils/tiered-commission';
import { notFound } from 'next/navigation';
import { getWhopContext, canAccessMemberDashboard } from '../../../lib/whop/simple-auth';
import { getExperienceById, findMembershipByExperienceAndUser, listMembershipsByCompany, getUserById, getMembershipById } from '../../../lib/whop';
import { createCreatorWithWhopData } from '../../../lib/whop/sync-creator';
import { generateReferralCode } from '../../../lib/utils/referral-code';
import logger from '../../../lib/logger';


// Disable caching to always fetch fresh creator settings
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MemberDashboard({
  params,
  searchParams
}: {
  params: { experienceId: string }
  searchParams: { welcome?: string }
}) {
  // Check if ?welcome=true is in URL (from program launch DM)
  const forceShowOnboarding = searchParams.welcome === 'true';
  try {
    // ========================================
    // SIMPLIFIED AUTHENTICATION
    // ========================================
    // Whop handles authentication in their iframe
    const canAccess = await canAccessMemberDashboard(params.experienceId);

    // Get Whop context for user info
    const whopContext = await getWhopContext();
    const authenticatedUserId = whopContext.userId;

    // ========================================
    // P0 FIX: Whop passes experienceId (exp_*), NOT membershipId (mem_*)
    // We use FOUR strategies to find the member, using official @whop/sdk
    // ========================================

    let member: { id: string; membershipId: string } | null = null;

    // Strategy 1: If URL param is already a membershipId (mem_*), use it directly
    if (params.experienceId.startsWith('mem_')) {
      member = await prisma.member.findUnique({
        where: { membershipId: params.experienceId },
        select: { id: true, membershipId: true }
      });
      if (member) {
        logger.info(`[AUTH] ✅ Strategy 1: Found member by membershipId (direct): ${params.experienceId}`);
      }
    }

    // Strategy 2: Look up by userId from JWT token (most common case)
    if (!member && authenticatedUserId) {
      member = await prisma.member.findUnique({
        where: { userId: authenticatedUserId },
        select: { id: true, membershipId: true }
      });
      if (member) {
        logger.info(`[AUTH] ✅ Strategy 2: Found member by userId: ${authenticatedUserId}`);
      }
    }

    // Strategy 3: Use @whop/sdk to find membership via experience → company → memberships
    if (!member && params.experienceId.startsWith('exp_') && authenticatedUserId) {
      logger.info(`[AUTH] Strategy 3: Using @whop/sdk to find membership`);
      try {
        const whopMembership = await findMembershipByExperienceAndUser(
          params.experienceId,
          authenticatedUserId
        );

        if (whopMembership) {
          member = await prisma.member.findUnique({
            where: { membershipId: whopMembership.id },
            select: { id: true, membershipId: true }
          });

          if (member) {
            logger.info(`[AUTH] ✅ Strategy 3: Found member via SDK: ${whopMembership.id}`);
          }
        }
      } catch (error) {
        logger.error(`[AUTH] Strategy 3 failed:`, error);
      }
    }

    // Strategy 4: Get experience's company_id and find member by creator association
    // This is the fallback using our database relationships
    if (!member && params.experienceId.startsWith('exp_')) {
      logger.info(`[AUTH] Strategy 4: Trying experience -> company -> creator lookup`);
      try {
        const experience = await getExperienceById(params.experienceId);
        // SDK returns nested company object: experience.company.id
        const companyId = experience?.company?.id;
        if (companyId && authenticatedUserId) {
          // Find the creator for this company
          const creator = await prisma.creator.findUnique({
            where: { companyId: companyId },
            select: { id: true }
          });

          if (creator) {
            // Find the member for this user and creator
            member = await prisma.member.findFirst({
              where: {
                userId: authenticatedUserId,
                creatorId: creator.id
              },
              select: { id: true, membershipId: true }
            });

            if (member) {
              logger.info(`[AUTH] ✅ Strategy 4: Found member by userId + creatorId: ${member.membershipId}`);
            }
          }
        }
      } catch (error) {
        logger.error(`[AUTH] Strategy 4 failed:`, error);
      }
    }

    // ========================================
    // STRATEGY 5: Auto-create member on page load
    // If user has valid Whop access but no local member record,
    // create one automatically. This handles cases where:
    // - Webhooks didn't fire (common during initial setup)
    // - Webhook processing failed
    // - User was manually added by creator
    // ========================================
    if (!member && canAccess && authenticatedUserId && params.experienceId.startsWith('exp_')) {
      logger.info(`[AUTH] Strategy 5: Attempting auto-create member for authenticated user`);

      try {
        // Get experience to find company
        const experience = await getExperienceById(params.experienceId);
        const companyId = experience?.company?.id;

        if (companyId) {
          // Find or create the creator for this company
          let creator = await prisma.creator.findUnique({
            where: { companyId },
            select: { id: true, companyName: true }
          });

          if (!creator) {
            // Auto-create creator (just like seller dashboard does)
            logger.info(`[AUTH] Auto-creating creator for company: ${companyId}`);
            try {
              const creatorData = await createCreatorWithWhopData({
                companyId,
                productId: companyId, // Will be updated later if needed
              });
              creator = await prisma.creator.findUnique({
                where: { id: creatorData.creatorId },
                select: { id: true, companyName: true }
              });
            } catch (createError) {
              logger.error(`[AUTH] Failed to auto-create creator:`, createError);
            }
          }

          if (creator) {
            // Get the user's membership from Whop
            const whopMembership = await findMembershipByExperienceAndUser(
              params.experienceId,
              authenticatedUserId
            );

            if (whopMembership) {
              // Get user details from Whop for username
              let username = 'Member';
              let whopUsername: string | null = null;
              try {
                const whopUser = await getUserById(authenticatedUserId);
                if (whopUser) {
                  username = whopUser.username || whopUser.name || 'Member';
                  whopUsername = whopUser.username || null;
                }
              } catch (userError) {
                logger.warn(`[AUTH] Could not fetch user details:`, userError);
              }

              // Generate unique referral code
              const referralCode = generateReferralCode();

              // Create the member record
              const newMember = await prisma.member.create({
                data: {
                  userId: authenticatedUserId,
                  membershipId: whopMembership.id,
                  email: `${authenticatedUserId}@whop.member`, // Placeholder, will be updated by webhook
                  username,
                  whopUsername,
                  referralCode,
                  creatorId: creator.id,
                  memberOrigin: 'auto_page_load',
                  subscriptionPrice: 49.99, // Default, will be updated by webhook
                },
              });

              // Create lifecycle record
              await prisma.memberLifecycle.create({
                data: {
                  memberId: newMember.id,
                  convertedAt: new Date(),
                  currentStatus: 'active',
                },
              });

              logger.info(`[AUTH] ✅ Strategy 5: Auto-created member ${referralCode} for user ${authenticatedUserId}`);
              member = { id: newMember.id, membershipId: newMember.membershipId };
            }
          }
        }
      } catch (autoCreateError) {
        logger.error(`[AUTH] Strategy 5 auto-create failed:`, autoCreateError);
      }
    }

    // If member still doesn't exist after all strategies including auto-create
    if (!member) {
      logger.warn(`[SECURITY] Member not found after all strategies (including auto-create)`, {
        experienceId: params.experienceId,
        idType: params.experienceId.startsWith('exp_') ? 'experience' : params.experienceId.startsWith('mem_') ? 'membership' : 'unknown',
        userId: whopContext.userId,
        isAuthenticated: whopContext.isAuthenticated,
        canAccess,
        strategies: 'membershipId lookup, userId lookup, Whop API lookup, creator association, auto-create'
      });

      // Return a helpful error page with more diagnostic info
      return (
        <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#1A1A1A] border border-yellow-500/30 rounded-xl p-8 text-center">
            <div className="text-yellow-400 text-6xl mb-4">⏳</div>
            <h1 className="text-2xl font-bold text-white mb-2">Account Setup In Progress</h1>
            <p className="text-gray-400 mb-6">
              Your membership is being set up. This usually happens automatically when you first purchase.
            </p>
            <p className="text-gray-500 text-sm mb-6">
              If you just purchased, please wait a moment and refresh this page.
              If this persists, please contact the community owner.
            </p>
            <div className="space-y-2">
              <a
                href={`/customer/${params.experienceId}`}
                className="inline-block w-full px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
              >
                Refresh Page
              </a>
              <p className="text-gray-600 text-xs mt-4">
                Debug: exp={params.experienceId.substring(0, 12)}... |
                auth={whopContext.isAuthenticated ? 'yes' : 'no'} |
                access={canAccess ? 'yes' : 'no'}
              </p>
            </div>
          </div>
        </div>
      );
    }

    // ========================================
    // ✅ USING CENTRALIZED QUERY LAYER
    // Single source of truth for ALL data
    // Use member.membershipId (not params.experienceId which is exp_*)
    // ========================================
    const data = await getCompleteMemberDashboardData(member.membershipId);

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
      {/* Header with integrated Leaderboard button and streak */}
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
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold">
                  Welcome to {creator.companyName}'s Community
                </h1>
                {/* Streak Display - Compact badge near title */}
                <StreakDisplay
                  currentStreak={data.currentStreak}
                  longestStreak={data.longestStreak}
                  size="sm"
                />
              </div>
              <p className="text-gray-400 text-xs sm:text-sm">
                Earn 10% lifetime commission on every referral
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Member Onboarding Modal - Shows as popup for new members or when ?welcome=true */}
        <MemberOnboardingModal
          memberName={data.username}
          creatorName={creator.companyName}
          referralLink={referralUrl}
          memberId={data.memberId}
          forceShow={forceShowOnboarding}
        />

        {/* Whop Username Setup - Required for affiliate link to work (Strategy B) */}
        {!data.whopUsername && (
          <WhopUsernameSetup
            memberId={data.memberId}
            currentWhopUsername={data.whopUsername}
            referralCode={data.referralCode}
          />
        )}

        {/* Streak Card - Compact daily referral streak (above referral link) */}
        <StreakCard
          currentStreak={data.currentStreak}
          longestStreak={data.longestStreak}
          totalReferred={data.totalReferred}
          tierThresholds={{
            tier1Count: creator.tier1Count,
            tier2Count: creator.tier2Count,
            tier3Count: creator.tier3Count,
            tier4Count: creator.tier4Count,
          }}
        />

        {/* Enhanced Referral URL Generator - With sharing options and stats */}
        <ReferralUrlGenerator
          memberId={data.memberId}
          referralCode={data.referralCode}
          whopUsername={data.whopUsername}
        />

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

        {/* Reward Progress - Creator-defined reward tiers */}
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
