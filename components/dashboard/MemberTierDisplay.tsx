'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Award, Zap, ChevronRight } from 'lucide-react';

// ============================================
// REWARD TIER DISPLAY (Creator-customizable)
// ============================================
const REWARD_TIERS = {
  Unranked: { icon: '❓', color: 'text-gray-400', bg: 'bg-gray-600/20' },
  Bronze: { icon: '🥉', color: 'text-amber-400', bg: 'bg-amber-900/30' },
  Silver: { icon: '🥈', color: 'text-gray-300', bg: 'bg-gray-500/30' },
  Gold: { icon: '🥇', color: 'text-yellow-400', bg: 'bg-yellow-900/30' },
  Platinum: { icon: '💎', color: 'text-purple-400', bg: 'bg-purple-900/30' },
} as const;

// ============================================
// COMMISSION TIER DISPLAY (Platform-controlled)
// ============================================
const COMMISSION_TIERS = {
  starter: {
    name: 'Starter',
    icon: '🚀',
    rate: '10%',
    color: 'text-blue-400',
    bg: 'bg-blue-900/30',
    border: 'border-blue-500/30',
    nextTier: 'ambassador',
    nextAt: 50,
  },
  ambassador: {
    name: 'Ambassador',
    icon: '⭐',
    rate: '15%',
    color: 'text-yellow-400',
    bg: 'bg-yellow-900/30',
    border: 'border-yellow-500/30',
    nextTier: 'elite',
    nextAt: 100,
  },
  elite: {
    name: 'Elite',
    icon: '👑',
    rate: '18%',
    color: 'text-purple-400',
    bg: 'bg-purple-900/30',
    border: 'border-purple-500/30',
    nextTier: null,
    nextAt: null,
  },
} as const;

type CommissionTierKey = keyof typeof COMMISSION_TIERS;

interface MemberTierDisplayProps {
  username: string;
  rewardTier: string;           // Bronze/Silver/Gold/Platinum (creator tiers)
  commissionTier: string;       // starter/ambassador/elite (platform tiers)
  commissionRate: number;       // 0.10, 0.15, or 0.18
  paidReferralCount: number;    // For progress to next commission tier
  totalReferrals: number;       // Total referrals (for reward tier display)
}

export function MemberTierDisplay({
  username,
  rewardTier,
  commissionTier,
  commissionRate,
  paidReferralCount,
  totalReferrals,
}: MemberTierDisplayProps) {
  // Normalize tier names (handle case sensitivity)
  const normalizedRewardTier = rewardTier.charAt(0).toUpperCase() + rewardTier.slice(1).toLowerCase();
  const rewardDisplay = REWARD_TIERS[normalizedRewardTier as keyof typeof REWARD_TIERS] || REWARD_TIERS.Unranked;

  const commissionKey = commissionTier.toLowerCase() as CommissionTierKey;
  const commissionDisplay = COMMISSION_TIERS[commissionKey] || COMMISSION_TIERS.starter;

  // Calculate progress to next commission tier
  let progress = 0;
  let referralsToNext = 0;
  if (commissionDisplay.nextTier && commissionDisplay.nextAt) {
    const currentMin = commissionKey === 'starter' ? 0 : (commissionKey === 'ambassador' ? 50 : 100);
    const range = commissionDisplay.nextAt - currentMin;
    progress = Math.min(((paidReferralCount - currentMin) / range) * 100, 100);
    referralsToNext = Math.max(commissionDisplay.nextAt - paidReferralCount, 0);
  }

  return (
    <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Member identity with reward tier */}
          <div className="flex items-center gap-3">
            {/* Avatar with reward tier icon */}
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xl font-bold text-white">
                {username.charAt(0).toUpperCase()}
              </div>
              <div className={`absolute -bottom-1 -right-1 text-lg`}>
                {rewardDisplay.icon}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">{username}</span>
                <Badge className={`${rewardDisplay.bg} ${rewardDisplay.color} text-xs`}>
                  {rewardDisplay.icon} {normalizedRewardTier}
                </Badge>
              </div>
              <p className="text-gray-400 text-xs">
                {totalReferrals} referrals • {paidReferralCount} paid
              </p>
            </div>
          </div>

          {/* Right: Commission tier with progress */}
          <div className={`flex items-center gap-3 ${commissionDisplay.bg} ${commissionDisplay.border} border rounded-lg px-4 py-2`}>
            <div className="text-center">
              <div className="flex items-center gap-1">
                <span className="text-xl">{commissionDisplay.icon}</span>
                <span className={`font-bold ${commissionDisplay.color}`}>{commissionDisplay.name}</span>
              </div>
              <p className={`text-lg font-bold ${commissionDisplay.color}`}>
                {(commissionRate * 100).toFixed(0)}% commission
              </p>
            </div>

            {/* Progress to next tier */}
            {commissionDisplay.nextTier && referralsToNext > 0 && (
              <div className="border-l border-gray-600 pl-3 ml-1">
                <div className="w-20">
                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden mb-1">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-400"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    {referralsToNext} to {COMMISSION_TIERS[commissionDisplay.nextTier as CommissionTierKey]?.name}
                  </p>
                </div>
              </div>
            )}

            {/* Max tier indicator */}
            {!commissionDisplay.nextTier && (
              <div className="border-l border-gray-600 pl-3 ml-1">
                <p className="text-xs text-purple-400 font-medium">MAX TIER</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Compact inline version for header/nav
 */
export function MemberTierBadges({
  rewardTier,
  commissionTier,
  commissionRate,
}: {
  rewardTier: string;
  commissionTier: string;
  commissionRate: number;
}) {
  const normalizedRewardTier = rewardTier.charAt(0).toUpperCase() + rewardTier.slice(1).toLowerCase();
  const rewardDisplay = REWARD_TIERS[normalizedRewardTier as keyof typeof REWARD_TIERS] || REWARD_TIERS.Unranked;

  const commissionKey = commissionTier.toLowerCase() as CommissionTierKey;
  const commissionDisplay = COMMISSION_TIERS[commissionKey] || COMMISSION_TIERS.starter;

  return (
    <div className="flex items-center gap-2">
      {/* Reward tier badge */}
      <Badge className={`${rewardDisplay.bg} ${rewardDisplay.color}`}>
        {rewardDisplay.icon} {normalizedRewardTier}
      </Badge>

      {/* Commission tier badge (only show if above starter) */}
      {commissionKey !== 'starter' && (
        <Badge className={`${commissionDisplay.bg} ${commissionDisplay.color}`}>
          {commissionDisplay.icon} {(commissionRate * 100).toFixed(0)}%
        </Badge>
      )}
    </div>
  );
}
