'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, Award, Zap, Info } from 'lucide-react';
import { formatRateAsPercent } from '@/lib/utils/tiered-commission';

// ============================================
// REWARD TIERS (Creator-customizable)
// ============================================
export type RewardTierName = 'bronze' | 'silver' | 'gold' | 'platinum';

export const REWARD_TIER_DISPLAY = {
  bronze: {
    name: 'Bronze',
    icon: '🥉',
    color: 'amber',
    bgClass: 'bg-amber-900/30',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-500/30',
  },
  silver: {
    name: 'Silver',
    icon: '🥈',
    color: 'gray',
    bgClass: 'bg-gray-500/30',
    textClass: 'text-gray-300',
    borderClass: 'border-gray-400/30',
  },
  gold: {
    name: 'Gold',
    icon: '🥇',
    color: 'yellow',
    bgClass: 'bg-yellow-900/30',
    textClass: 'text-yellow-400',
    borderClass: 'border-yellow-500/30',
  },
  platinum: {
    name: 'Platinum',
    icon: '💎',
    color: 'purple',
    bgClass: 'bg-purple-900/30',
    textClass: 'text-purple-400',
    borderClass: 'border-purple-500/30',
  },
} as const;

// ============================================
// COMMISSION TIERS (Platform-controlled)
// ============================================
export type CommissionTierName = 'starter' | 'ambassador' | 'elite';

export const COMMISSION_TIER_DISPLAY = {
  starter: {
    name: 'Starter',
    icon: '🚀',
    rate: 0.10,
    bgClass: 'bg-blue-900/30',
    textClass: 'text-blue-400',
    borderClass: 'border-blue-500/30',
    description: '10% commission on referrals',
  },
  ambassador: {
    name: 'Ambassador',
    icon: '⭐',
    rate: 0.15,
    bgClass: 'bg-yellow-900/30',
    textClass: 'text-yellow-400',
    borderClass: 'border-yellow-500/30',
    description: '15% commission (50+ paid referrals)',
  },
  elite: {
    name: 'Elite',
    icon: '👑',
    rate: 0.18,
    bgClass: 'bg-purple-900/30',
    textClass: 'text-purple-400',
    borderClass: 'border-purple-500/30',
    description: '18% commission (100+ paid referrals)',
  },
} as const;

// ============================================
// MEMBER IDENTITY CARD
// ============================================
interface MemberIdentityCardProps {
  username: string;
  avatarUrl?: string;
  rewardTier: RewardTierName;       // Creator-customizable (bronze/silver/gold/platinum)
  commissionTier: CommissionTierName; // Platform-controlled (starter/ambassador/elite)
  commissionRate: number;
  totalReferrals: number;
  paidReferrals: number;
  lifetimeEarnings: number;
  communityName?: string;
}

export function MemberIdentityCard({
  username,
  avatarUrl,
  rewardTier,
  commissionTier,
  commissionRate,
  totalReferrals,
  paidReferrals,
  lifetimeEarnings,
  communityName,
}: MemberIdentityCardProps) {
  const rewardDisplay = REWARD_TIER_DISPLAY[rewardTier];
  const commissionDisplay = COMMISSION_TIER_DISPLAY[commissionTier];

  return (
    <Card className="bg-[#1A1A1A] border-[#2A2A2A] overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl font-bold text-white">
              {avatarUrl ? (
                <img src={avatarUrl} alt={username} className="w-full h-full rounded-full object-cover" />
              ) : (
                username.charAt(0).toUpperCase()
              )}
            </div>
            {/* Commission tier badge overlay */}
            <div className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full ${commissionDisplay.bgClass} border-2 border-[#1A1A1A] flex items-center justify-center text-sm`}>
              {commissionDisplay.icon}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-white">{username}</h2>
              <RewardTierBadge tier={rewardTier} size="sm" />
            </div>
            {communityName && (
              <p className="text-gray-400 text-sm">{communityName}</p>
            )}

            {/* Dual tier display */}
            <div className="flex items-center gap-3 mt-3">
              <CommissionTierIndicator
                tier={commissionTier}
                rate={commissionRate}
                paidReferrals={paidReferrals}
              />
            </div>
          </div>

          {/* Earnings highlight */}
          <div className="text-right">
            <p className="text-gray-400 text-xs">Lifetime Earnings</p>
            <p className="text-2xl font-bold text-green-400">
              ${lifetimeEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-gray-500 text-xs mt-1">
              {totalReferrals} referrals • {paidReferrals} paid
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// REWARD TIER BADGE (Creator tiers)
// ============================================
interface RewardTierBadgeProps {
  tier: RewardTierName;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function RewardTierBadge({ tier, size = 'md', showLabel = false }: RewardTierBadgeProps) {
  const display = REWARD_TIER_DISPLAY[tier];

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className={`inline-flex items-center gap-1 ${display.bgClass} ${display.textClass} rounded-full border ${display.borderClass} ${sizeClasses[size]}`}>
            <span>{display.icon}</span>
            {showLabel && <span className="font-medium">{display.name}</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{display.name} Tier</p>
          <p className="text-xs text-gray-400">Creator reward milestone</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================
// COMMISSION TIER INDICATOR
// ============================================
interface CommissionTierIndicatorProps {
  tier: CommissionTierName;
  rate: number;
  paidReferrals: number;
}

export function CommissionTierIndicator({ tier, rate, paidReferrals }: CommissionTierIndicatorProps) {
  const display = COMMISSION_TIER_DISPLAY[tier];

  // Calculate progress to next tier
  let nextTier: CommissionTierName | null = null;
  let progress = 0;
  let referralsToNext = 0;

  if (tier === 'starter') {
    nextTier = 'ambassador';
    progress = Math.min((paidReferrals / 50) * 100, 100);
    referralsToNext = Math.max(50 - paidReferrals, 0);
  } else if (tier === 'ambassador') {
    nextTier = 'elite';
    progress = Math.min(((paidReferrals - 50) / 50) * 100, 100);
    referralsToNext = Math.max(100 - paidReferrals, 0);
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className={`flex items-center gap-2 ${display.bgClass} ${display.textClass} rounded-lg border ${display.borderClass} px-3 py-2`}>
            <span className="text-lg">{display.icon}</span>
            <div className="text-left">
              <p className="font-semibold text-sm leading-tight">{display.name}</p>
              <p className="text-xs opacity-80">{formatRateAsPercent(rate)} commission</p>
            </div>
            {nextTier && (
              <div className="ml-2 w-16">
                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="font-medium">{display.name} Commission Tier</p>
            <p className="text-sm text-gray-300">{display.description}</p>
            {nextTier && referralsToNext > 0 && (
              <p className="text-xs text-green-400">
                {referralsToNext} more paid referrals to reach {COMMISSION_TIER_DISPLAY[nextTier].name}
              </p>
            )}
            {!nextTier && (
              <p className="text-xs text-purple-400">Maximum tier achieved!</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================
// COMPACT DUAL BADGE (For inline use)
// ============================================
interface DualTierBadgeProps {
  rewardTier: RewardTierName;
  commissionTier: CommissionTierName;
  commissionRate: number;
}

export function DualTierBadge({ rewardTier, commissionTier, commissionRate }: DualTierBadgeProps) {
  const rewardDisplay = REWARD_TIER_DISPLAY[rewardTier];
  const commissionDisplay = COMMISSION_TIER_DISPLAY[commissionTier];

  return (
    <div className="inline-flex items-center gap-1">
      {/* Reward tier */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <span className={`${rewardDisplay.bgClass} ${rewardDisplay.textClass} rounded-l-full px-2 py-0.5 text-xs border-r ${rewardDisplay.borderClass}`}>
              {rewardDisplay.icon}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{rewardDisplay.name} - Reward Tier</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Commission tier */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <span className={`${commissionDisplay.bgClass} ${commissionDisplay.textClass} rounded-r-full px-2 py-0.5 text-xs`}>
              {commissionDisplay.icon} {formatRateAsPercent(commissionRate)}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{commissionDisplay.name} - {formatRateAsPercent(commissionRate)} Commission</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

// ============================================
// MINI IDENTITY BADGE (For leaderboards, lists)
// ============================================
interface MiniIdentityBadgeProps {
  username: string;
  rewardTier: RewardTierName;
  commissionTier: CommissionTierName;
  showCommissionTier?: boolean;
}

export function MiniIdentityBadge({
  username,
  rewardTier,
  commissionTier,
  showCommissionTier = true
}: MiniIdentityBadgeProps) {
  const rewardDisplay = REWARD_TIER_DISPLAY[rewardTier];
  const commissionDisplay = COMMISSION_TIER_DISPLAY[commissionTier];

  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-white font-medium">{username}</span>
      <span className={`${rewardDisplay.textClass}`}>{rewardDisplay.icon}</span>
      {showCommissionTier && commissionTier !== 'starter' && (
        <span className={`${commissionDisplay.textClass} text-xs`}>
          {commissionDisplay.icon}
        </span>
      )}
    </div>
  );
}
