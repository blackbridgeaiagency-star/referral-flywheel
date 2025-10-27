'use client';

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { calculatePotentialEarnings } from '../../lib/constants/metrics';
import { Trophy } from 'lucide-react';

interface RewardTier {
  count: number;
  reward: string;
}

interface RewardProgressProps {
  currentReferrals: number;
  tiers: RewardTier[];
}

// Define rank names and styling
const RANK_INFO = {
  0: { name: 'Unranked', color: 'text-gray-400', bgColor: 'from-gray-700/20 to-gray-800/20', icon: '⚪' },
  1: { name: 'Bronze', color: 'text-amber-700', bgColor: 'from-amber-700/20 to-amber-900/20', icon: '🥉' },
  2: { name: 'Silver', color: 'text-gray-300', bgColor: 'from-gray-400/20 to-gray-600/20', icon: '🥈' },
  3: { name: 'Gold', color: 'text-yellow-400', bgColor: 'from-yellow-500/20 to-yellow-700/20', icon: '🥇' },
  4: { name: 'Platinum', color: 'text-purple-400', bgColor: 'from-purple-500/20 to-purple-700/20', icon: '💎' },
};

export function RewardProgress({ currentReferrals, tiers }: RewardProgressProps) {
  // Determine current rank based on referrals
  const getCurrentRank = () => {
    if (currentReferrals >= tiers[3]?.count) return 4; // Platinum
    if (currentReferrals >= tiers[2]?.count) return 3; // Gold
    if (currentReferrals >= tiers[1]?.count) return 2; // Silver
    if (currentReferrals >= tiers[0]?.count) return 1; // Bronze
    return 0; // Unranked
  };

  const currentRank = getCurrentRank();
  const currentRankInfo = RANK_INFO[currentRank as keyof typeof RANK_INFO];

  return (
    <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Rank Progress
            </CardTitle>
            <p className="text-gray-400 text-sm mt-1">
              Climb the ranks and unlock exclusive rewards
            </p>
          </div>
          {/* Current Rank Badge */}
          <div className={`px-4 py-2 rounded-lg bg-gradient-to-r ${currentRankInfo.bgColor} border border-current/20`}>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{currentRankInfo.icon}</span>
              <div>
                <p className="text-xs text-gray-400">Current Rank</p>
                <p className={`font-bold ${currentRankInfo.color}`}>{currentRankInfo.name}</p>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tiers.map((tier, index) => (
            <RewardTier
              key={index}
              count={tier.count}
              reward={tier.reward}
              current={currentReferrals}
              rankIndex={index + 1}
              isLast={index === tiers.length - 1}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RewardTier({ count, reward, current, rankIndex, isLast }: {
  count: number;
  reward: string;
  current: number;
  rankIndex: number;
  isLast: boolean;
}) {
  const progress = Math.min((current / count) * 100, 100);
  const isUnlocked = current >= count;
  const isNext = current < count && (isLast || current >= (count - 5));

  // Calculate potential monthly earnings using centralized constants (no hardcoded values!)
  const potentialMonthlyEarnings = calculatePotentialEarnings(count);

  // Get rank info
  const rankInfo = RANK_INFO[rankIndex as keyof typeof RANK_INFO];

  return (
    <div className={`p-4 rounded-lg bg-gradient-to-r ${rankInfo.bgColor} border ${isUnlocked ? 'border-green-500/50' : 'border-gray-700/30'}`}>
      <div className="space-y-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{rankInfo.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-bold text-lg ${rankInfo.color}`}>
                  {rankInfo.name}
                </span>
                {isUnlocked && (
                  <Badge className="bg-green-600 text-white text-xs">
                    ✓ Unlocked
                  </Badge>
                )}
                {isNext && !isUnlocked && (
                  <Badge variant="outline" className="text-yellow-500 border-yellow-500 text-xs">
                    🔥 Next Goal
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-sm ${isUnlocked ? 'text-green-400' : 'text-gray-400'}`}>
                  {count} referrals required
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-sm text-gray-300 font-medium">{reward}</span>
            <div className="text-xs text-green-400 font-semibold mt-1">
              💰 ~${potentialMonthlyEarnings}/mo
            </div>
          </div>
        </div>

        <div className="w-full bg-gray-800 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${
              isUnlocked ? 'bg-green-500' : isNext ? 'bg-yellow-500' : 'bg-purple-600'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex justify-between text-xs text-gray-500">
          <span>{current} / {count} referrals</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
      </div>
    </div>
  );
}
