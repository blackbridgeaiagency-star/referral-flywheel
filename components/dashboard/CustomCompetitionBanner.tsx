'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Trophy, Clock, Award, Gift, ChevronDown, ChevronUp, Target } from 'lucide-react';
import { Toast } from '../ui/toast';

interface CustomCompetitionBannerProps {
  isEnabled: boolean;
  timeframe: string | null;
  type: string | null;
  reward1st: string | null;
  reward2nd: string | null;
  reward3rd: string | null;
  reward4th: string | null;
  reward5th: string | null;
  reward6to10: string | null;
  currentRank?: number | null;
  memberId?: string;
  creatorId?: string;
}

const TIMEFRAME_LABELS = {
  daily: '24 Hours',
  weekly: '7 Days',
  monthly: '30 Days',
};

const TYPE_LABELS = {
  top3: 'Top 3',
  top5: 'Top 5',
  top10: 'Top 10',
};

export function CustomCompetitionBanner({
  isEnabled,
  timeframe,
  type,
  reward1st,
  reward2nd,
  reward3rd,
  reward4th,
  reward5th,
  reward6to10,
  currentRank,
  memberId,
  creatorId,
}: CustomCompetitionBannerProps) {
  const [claiming, setClaiming] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  if (!isEnabled) return null;

  const timeframeLabel = TIMEFRAME_LABELS[timeframe as keyof typeof TIMEFRAME_LABELS] || timeframe;
  const typeLabel = TYPE_LABELS[type as keyof typeof TYPE_LABELS] || type;

  // Calculate time remaining
  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date();
      let endTime = new Date();

      if (timeframe === 'daily') {
        endTime.setHours(23, 59, 59, 999);
      } else if (timeframe === 'weekly') {
        const dayOfWeek = now.getDay();
        const daysUntilSunday = 7 - dayOfWeek;
        endTime.setDate(now.getDate() + daysUntilSunday);
        endTime.setHours(23, 59, 59, 999);
      } else if (timeframe === 'monthly') {
        endTime = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      }

      const diff = endTime.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      return `${hours}h ${minutes}m ${seconds}s`;
    };

    setTimeRemaining(calculateTimeRemaining());
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining());
    }, 1000);

    return () => clearInterval(interval);
  }, [timeframe]);

  // Determine prizes to show based on competition type
  const prizes: { rank: string; rankNum: number; prize: string; icon: string; color: string }[] = [];
  if (reward1st) prizes.push({ rank: '1st', rankNum: 1, prize: reward1st, icon: '🥇', color: 'gold' });
  if (reward2nd) prizes.push({ rank: '2nd', rankNum: 2, prize: reward2nd, icon: '🥈', color: 'silver' });
  if (reward3rd) prizes.push({ rank: '3rd', rankNum: 3, prize: reward3rd, icon: '🥉', color: 'bronze' });
  if (type === 'top5' || type === 'top10') {
    if (reward4th) prizes.push({ rank: '4th', rankNum: 4, prize: reward4th, icon: '4️⃣', color: 'blue' });
    if (reward5th) prizes.push({ rank: '5th', rankNum: 5, prize: reward5th, icon: '5️⃣', color: 'purple' });
  }
  if (type === 'top10' && reward6to10) {
    prizes.push({ rank: '6-10', rankNum: 6, prize: reward6to10, icon: '🎁', color: 'gray' });
  }

  // Function to check if this prize matches the user's rank
  const isUserRank = (rankNum: number) => {
    if (!currentRank) return false;
    if (rankNum === 6) {
      return currentRank >= 6 && currentRank <= 10;
    }
    return currentRank === rankNum;
  };

  // Get prize colors
  const getPrizeColors = (color: string, isWinning: boolean) => {
    if (isWinning) {
      return 'bg-green-500/15 border border-green-400/40';
    }

    const colors: Record<string, string> = {
      gold: 'bg-yellow-500/10 border border-yellow-500/20',
      silver: 'bg-gray-400/10 border border-gray-400/20',
      bronze: 'bg-amber-600/10 border border-amber-600/20',
      blue: 'bg-blue-500/10 border border-blue-500/20',
      purple: 'bg-purple-500/10 border border-purple-500/20',
      gray: 'bg-gray-500/10 border border-gray-500/20',
    };
    return colors[color] || colors.gray;
  };

  // Handle claim reward
  const handleClaimReward = async (prize: { rank: string; prize: string }) => {
    if (!memberId || !creatorId) return;

    setClaiming(true);
    try {
      const response = await fetch('/api/rewards/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          creatorId,
          rank: currentRank,
          reward: prize.prize,
          timeframe,
        }),
      });

      if (response.ok) {
        setToast({
          message: `Claim request sent! The creator will review your ${prize.rank} place reward: ${prize.prize}`,
          type: 'success',
        });
      } else {
        setToast({
          message: 'Failed to send claim request. Please try again.',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Error claiming reward:', error);
      setToast({
        message: 'An error occurred. Please try again.',
        type: 'error',
      });
    } finally {
      setClaiming(false);
    }
  };

  // Calculate next rank info
  const getNextRankInfo = () => {
    if (!currentRank) return null;
    const nextRankNum = currentRank > 1 ? currentRank - 1 : null;
    if (!nextRankNum) return null;
    return prizes.find(p => p.rankNum === nextRankNum);
  };

  const nextRank = getNextRankInfo();

  return (
    <>
      <Card className="bg-[#1A1A1A] border-2 border-yellow-500/40 hover:border-yellow-500/60 transition-all overflow-hidden animate-glow-breath">
        <CardContent className="p-0">
          {/* Header - Always Visible */}
          <div
            className="relative flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gradient-to-r hover:from-yellow-900/20 hover:to-amber-900/20 transition-all duration-300 group overflow-hidden"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {/* Subtle shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="flex items-center gap-3 relative z-10">
              <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500/20 to-amber-600/20 text-yellow-400 border border-yellow-500/30 shadow-lg shadow-yellow-500/20 group-hover:shadow-yellow-500/40 transition-all duration-300 group-hover:scale-110">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">
                    🏆 Competition Active
                  </h3>
                  {currentRank && currentRank <= 10 && (
                    <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white text-[10px] font-bold shadow-lg shadow-green-500/30 animate-pulse">
                      #{currentRank}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <Clock className="w-3 h-3 text-yellow-500/70" />
                  <span className="text-[11px] text-yellow-500/90 font-medium">{timeRemaining}</span>
                </div>
              </div>
            </div>
            <button className="relative z-10 p-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 hover:text-yellow-300 transition-all duration-300 group-hover:rotate-180">
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Expanded Content */}
          {isExpanded && (
            <div className="px-4 pb-3 pt-1 space-y-2 border-t border-[#2A2A2A]">
              {/* Progress to Next Rank */}
              {nextRank && currentRank && (
                <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                  <Target className="w-3 h-3 text-purple-400/60" />
                  <span>Next: <span className="text-gray-400 font-medium">{nextRank.rank}</span> - {nextRank.prize}</span>
                </div>
              )}

              {/* Prizes - Ultra Compact */}
              <div className="space-y-1">
                {prizes.map((prize, index) => {
                  const isWinning = isUserRank(prize.rankNum);
                  return (
                    <div
                      key={index}
                      className={`flex items-center justify-between px-2 py-1.5 rounded transition-all ${
                        isWinning
                          ? 'bg-green-900/20 border border-green-500/30 cursor-pointer hover:bg-green-900/30'
                          : 'bg-gray-900/30 border border-gray-800/50'
                      }`}
                      onClick={() => isWinning && handleClaimReward(prize)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{prize.icon}</span>
                        <span className={`text-xs font-medium ${isWinning ? 'text-green-400' : 'text-gray-400'}`}>
                          {prize.rank}
                        </span>
                        <span className={`text-xs truncate ${isWinning ? 'text-green-100' : 'text-gray-300'}`}>
                          {prize.prize}
                        </span>
                      </div>
                      {isWinning && (
                        <span className="text-[10px] text-green-400 font-medium flex items-center gap-1">
                          <Gift className="w-3 h-3" />
                          {claiming ? 'Claiming...' : 'Claim'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Toast Notifications */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}
