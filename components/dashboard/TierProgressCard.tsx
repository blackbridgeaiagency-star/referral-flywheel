'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, TrendingUp, Zap } from 'lucide-react';
import {
  TIER_DISPLAY,
  COMMISSION_TIERS,
  formatRateAsPercent,
  getNextTierInfo,
  type CommissionTierName,
} from '@/lib/utils/tiered-commission';

interface TierProgressCardProps {
  currentTier: CommissionTierName;
  currentRate: number;
  totalReferrals: number;
}

export function TierProgressCard({
  currentTier,
  currentRate,
  totalReferrals,
}: TierProgressCardProps) {
  const tierInfo = getNextTierInfo(totalReferrals);
  const currentDisplay = TIER_DISPLAY[currentTier];
  const nextDisplay = tierInfo.nextTier ? TIER_DISPLAY[tierInfo.nextTier.tierName] : null;

  const isMaxTier = !tierInfo.nextTier;

  return (
    <Card className="bg-[#1A1A1A] border-[#2A2A2A] overflow-hidden">
      {/* Gradient header based on current tier */}
      <div className={`h-2 bg-gradient-to-r ${currentDisplay.gradientFrom} ${currentDisplay.gradientTo}`} />

      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Commission Tier
            </CardTitle>
            <p className="text-gray-400 text-sm mt-1">
              Earn more as you refer more
            </p>
          </div>
          <div className={`inline-flex items-center gap-2 ${currentDisplay.bgClass} ${currentDisplay.textClass} rounded-lg border ${currentDisplay.borderClass}/30 px-3 py-2`}>
            <span className="text-xl">{currentDisplay.icon}</span>
            <span className="font-semibold">{currentDisplay.name}</span>
            <span className="opacity-80">({formatRateAsPercent(currentRate)})</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current earnings rate highlight */}
        <div className="p-4 rounded-lg bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Your Commission Rate</p>
              <p className="text-3xl font-bold text-green-400">
                {formatRateAsPercent(currentRate)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-sm">On every sale</p>
              <p className="text-white">
                {totalReferrals} referrals
              </p>
            </div>
          </div>
        </div>

        {/* Progress to next tier */}
        {!isMaxTier && tierInfo.nextTier && nextDisplay && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Progress to {nextDisplay.name}</span>
              <span className={nextDisplay.textClass}>
                {nextDisplay.icon} {formatRateAsPercent(tierInfo.nextTier.memberRate)} commission
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${nextDisplay.gradientFrom} ${nextDisplay.gradientTo} transition-all duration-500`}
                style={{ width: `${tierInfo.progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-xs">
                {tierInfo.progressPercent}% complete
              </span>
              <span className="text-white text-sm font-medium flex items-center gap-1">
                <ArrowUp className="w-4 h-4 text-green-400" />
                {tierInfo.referralsToNextTier} more referrals to unlock
              </span>
            </div>
          </div>
        )}

        {/* Max tier celebration */}
        {isMaxTier && (
          <div className="p-4 rounded-lg bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 text-center">
            <p className="text-purple-300 font-semibold">
              You've reached the highest tier!
            </p>
            <p className="text-gray-400 text-sm mt-1">
              Enjoy maximum {formatRateAsPercent(currentRate)} commission on all referrals
            </p>
          </div>
        )}

        {/* All tiers overview */}
        <div className="pt-4 border-t border-gray-800">
          <p className="text-gray-400 text-xs mb-3">Commission Tiers (based on paid referrals)</p>
          <div className="grid grid-cols-3 gap-3">
            {COMMISSION_TIERS.map((tier) => {
              const display = TIER_DISPLAY[tier.tierName];
              const isCurrentTier = tier.tierName === currentTier;
              const isUnlocked = totalReferrals >= tier.minReferrals;

              return (
                <div
                  key={tier.tierName}
                  className={`
                    p-3 rounded-lg text-center text-sm transition-all
                    ${isCurrentTier
                      ? `${display.bgClass} ${display.textClass} ring-2 ring-offset-2 ring-offset-[#1A1A1A]`
                      : isUnlocked
                        ? 'bg-gray-800 text-gray-300'
                        : 'bg-gray-900 text-gray-600'
                    }
                  `}
                  style={isCurrentTier ? { '--tw-ring-color': `var(--${display.color}-500)` } as any : {}}
                >
                  <div className="text-2xl mb-1">{display.icon}</div>
                  <div className="font-bold">{display.name}</div>
                  <div className="text-lg font-semibold">{formatRateAsPercent(tier.memberRate)}</div>
                  <div className="opacity-70 text-xs">
                    {tier.minReferrals === 0 ? 'Start here' : `${tier.minReferrals}+ paid refs`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Compact tier badge for inline display
 */
export function CommissionTierBadge({
  tier,
  rate,
  showRate = true,
  size = 'md',
}: {
  tier: CommissionTierName;
  rate: number;
  showRate?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const display = TIER_DISPLAY[tier];

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2',
  };

  return (
    <div className={`inline-flex items-center gap-2 ${display.bgClass} ${display.textClass} rounded-lg border ${display.borderClass}/30 ${sizeClasses[size]}`}>
      <span>{display.icon}</span>
      <span className="font-semibold">{display.name}</span>
      {showRate && (
        <span className="opacity-80">({formatRateAsPercent(rate)})</span>
      )}
    </div>
  );
}
