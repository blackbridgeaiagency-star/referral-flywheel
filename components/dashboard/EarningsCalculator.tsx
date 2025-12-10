'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Calculator, TrendingUp, DollarSign, Target, Sparkles, ChevronRight } from 'lucide-react';
import {
  calculateEarningsProjection,
  getBreakEvenReferrals,
  getMotivationalMessage,
  formatEarningsDisplay,
  type CalculatorInput,
} from '@/lib/utils/earnings-calculator';
import {
  TIER_DISPLAY,
  formatRateAsPercent,
  COMMISSION_TIERS,
  type CommissionTierName,
} from '@/lib/utils/tiered-commission';

interface EarningsCalculatorProps {
  avgSubscriptionPrice: number;
  userSubscriptionPrice?: number;
  currentReferrals?: number;
  communityName?: string;
  compact?: boolean;
}

export function EarningsCalculator({
  avgSubscriptionPrice,
  userSubscriptionPrice = avgSubscriptionPrice,
  currentReferrals = 0,
  communityName = 'this community',
  compact = false,
}: EarningsCalculatorProps) {
  const [referralCount, setReferralCount] = useState(currentReferrals || 10);

  const input: CalculatorInput = useMemo(() => ({
    avgSubscriptionPrice,
    userSubscriptionPrice,
  }), [avgSubscriptionPrice, userSubscriptionPrice]);

  const projection = useMemo(
    () => calculateEarningsProjection(referralCount, input),
    [referralCount, input]
  );

  const breakEven = useMemo(
    () => getBreakEvenReferrals(input),
    [input]
  );

  const motivationalMessage = useMemo(
    () => getMotivationalMessage(referralCount, input),
    [referralCount, input]
  );

  const earningsDisplay = useMemo(
    () => formatEarningsDisplay(projection),
    [projection]
  );

  const tierDisplay = TIER_DISPLAY[projection.tier as CommissionTierName];

  // Compact version for share pages
  if (compact) {
    const quickCalc = (refs: number) => {
      const proj = calculateEarningsProjection(refs, input);
      return proj.monthlyEarnings.toFixed(0);
    };

    return (
      <div className="p-4 rounded-lg bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30">
        <p className="text-gray-400 text-sm mb-3 flex items-center gap-2">
          <Calculator className="w-4 h-4" />
          Quick Earnings Preview
        </p>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[5, 10, 25].map(refs => (
            <div key={refs} className="p-2 rounded bg-black/30">
              <p className="text-xs text-gray-400">{refs} refs</p>
              <p className="text-green-400 font-bold">${quickCalc(refs)}/mo</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-500 text-center">
          {breakEven} referrals = FREE membership
        </p>
      </div>
    );
  }

  return (
    <Card className="bg-[#1A1A1A] border-[#2A2A2A] overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 pb-3">
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <Calculator className="w-4 h-4 text-purple-400" />
          Earnings Calculator
        </CardTitle>
        <p className="text-gray-400 text-xs">
          See how much you could earn in {communityName}
        </p>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Slider input */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm text-gray-400">Number of Referrals</label>
            <span className="text-white font-bold text-lg">{referralCount}</span>
          </div>
          <Slider
            value={[referralCount]}
            onValueChange={([value]) => setReferralCount(value)}
            min={0}
            max={100}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0</span>
            <span>25</span>
            <span>50</span>
            <span>75</span>
            <span>100</span>
          </div>
        </div>

        {/* Tier indicator */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-800/50">
          <div className="flex items-center gap-2">
            <span className="text-xl">{tierDisplay.icon}</span>
            <div>
              <p className={`font-semibold text-sm ${tierDisplay.textClass}`}>{tierDisplay.name} Tier</p>
              <p className="text-gray-400 text-xs">Commission Rate</p>
            </div>
          </div>
          <Badge className={`${tierDisplay.bgClass} ${tierDisplay.textClass} text-base px-2.5`}>
            {formatRateAsPercent(projection.commissionRate)}
          </Badge>
        </div>

        {/* Earnings display */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-green-900/20 border border-green-500/30">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-green-400" />
              <span className="text-gray-400 text-sm">Monthly</span>
            </div>
            <p className="text-2xl font-bold text-green-400">
              ${projection.monthlyEarnings.toFixed(0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {referralCount} x ${avgSubscriptionPrice.toFixed(0)} x {formatRateAsPercent(projection.commissionRate)}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-purple-900/20 border border-purple-500/30">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <span className="text-gray-400 text-sm">Yearly</span>
            </div>
            <p className="text-2xl font-bold text-purple-400">
              ${projection.yearlyEarnings.toFixed(0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Passive income annually
            </p>
          </div>
        </div>

        {/* Motivational message */}
        <div className={`p-3 rounded-lg border ${
          motivationalMessage.type === 'success'
            ? 'bg-green-900/30 border-green-500/30'
            : motivationalMessage.type === 'close'
            ? 'bg-yellow-900/30 border-yellow-500/30'
            : 'bg-blue-900/30 border-blue-500/30'
        }`}>
          <div className="flex items-center gap-2.5">
            {motivationalMessage.type === 'success' ? (
              <Sparkles className="w-6 h-6 text-green-400" />
            ) : (
              <Target className="w-6 h-6 text-yellow-400" />
            )}
            <div>
              <p className={`font-semibold text-sm ${
                motivationalMessage.type === 'success' ? 'text-green-400' :
                motivationalMessage.type === 'close' ? 'text-yellow-400' : 'text-blue-400'
              }`}>
                {motivationalMessage.title}
              </p>
              <p className="text-gray-400 text-xs">{motivationalMessage.subtitle}</p>
            </div>
          </div>
        </div>

        {/* Tier progression overview */}
        <div className="pt-4 border-t border-gray-800">
          <p className="text-gray-400 text-xs mb-3 text-center">Commission Tiers - Earn More as You Refer</p>
          <div className="grid grid-cols-3 gap-2 w-full">
            {COMMISSION_TIERS.map((tier) => {
              const display = TIER_DISPLAY[tier.tierName];
              const isCurrentTier = tier.tierName === projection.tier;
              const isUnlocked = referralCount >= tier.minReferrals;

              return (
                <div
                  key={tier.tierName}
                  className={`
                    p-2 rounded text-center text-xs transition-all
                    ${isCurrentTier
                      ? `${display.bgClass} ${display.textClass} ring-2 ring-offset-2 ring-offset-[#1A1A1A] ring-${display.color}-500`
                      : isUnlocked
                        ? 'bg-gray-800 text-gray-300'
                        : 'bg-gray-900 text-gray-600'
                    }
                  `}
                >
                  <div className="text-lg">{display.icon}</div>
                  <div className="font-medium">{formatRateAsPercent(tier.memberRate)}</div>
                  <div className="opacity-70">{tier.minReferrals}+ refs</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Break-even highlight */}
        <div className="text-center text-sm text-gray-400">
          <span className="text-white font-medium">{breakEven} referrals</span>
          {' '}= Your ${userSubscriptionPrice.toFixed(0)}/mo membership is FREE
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Mini calculator for inline use in share pages
 */
export function MiniEarningsCalculator({
  avgPrice,
  onExpand,
}: {
  avgPrice: number;
  onExpand?: () => void;
}) {
  const quickCalc = (refs: number) => {
    const projection = calculateEarningsProjection(refs, { avgSubscriptionPrice: avgPrice });
    return projection.monthlyEarnings.toFixed(0);
  };

  return (
    <div className="p-4 rounded-lg bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30">
      <p className="text-gray-400 text-sm mb-3">Quick Earnings Preview</p>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[5, 10, 25].map(refs => (
          <div key={refs} className="p-2 rounded bg-black/30">
            <p className="text-xs text-gray-400">{refs} refs</p>
            <p className="text-green-400 font-bold">${quickCalc(refs)}/mo</p>
          </div>
        ))}
      </div>
      {onExpand && (
        <button
          onClick={onExpand}
          className="mt-3 text-sm text-purple-400 flex items-center gap-1 hover:underline w-full justify-center"
        >
          See full calculator <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
