'use client';

/**
 * MilestoneProgress Component
 *
 * Shows progress toward next milestone with:
 * - Current referral count
 * - Next milestone target
 * - Visual progress bar
 * - Milestone-specific rewards (if configured)
 * - Celebration animation when milestone is hit
 * - History of past milestones achieved
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

// Milestone configuration matching rank-updater.ts
const MILESTONES = [10, 25, 50, 100, 250, 500, 1000] as const;
type MilestoneValue = typeof MILESTONES[number];

// Milestone metadata with icons and rewards
const MILESTONE_CONFIG: Record<MilestoneValue, {
  icon: string;
  title: string;
  reward?: string;
  badge?: string;
  color: string;
  bgGradient: string;
}> = {
  10: {
    icon: '🎯',
    title: 'First Steps',
    reward: 'Great start!',
    color: 'text-blue-400',
    bgGradient: 'from-blue-500/20 to-blue-600/10',
  },
  25: {
    icon: '⭐',
    title: 'Rising Star',
    reward: 'You\'re on fire!',
    badge: 'Rising Star',
    color: 'text-cyan-400',
    bgGradient: 'from-cyan-500/20 to-cyan-600/10',
  },
  50: {
    icon: '🚀',
    title: 'Ambassador',
    reward: '15% commission unlocked!',
    badge: 'Ambassador',
    color: 'text-yellow-400',
    bgGradient: 'from-yellow-500/20 to-yellow-600/10',
  },
  100: {
    icon: '👑',
    title: 'Elite',
    reward: '18% commission unlocked!',
    badge: 'Elite',
    color: 'text-purple-400',
    bgGradient: 'from-purple-500/20 to-purple-600/10',
  },
  250: {
    icon: '💎',
    title: 'Legend',
    reward: 'Legend status!',
    badge: 'Legend',
    color: 'text-pink-400',
    bgGradient: 'from-pink-500/20 to-pink-600/10',
  },
  500: {
    icon: '🔥',
    title: 'Master',
    reward: 'Top performer!',
    badge: 'Master',
    color: 'text-orange-400',
    bgGradient: 'from-orange-500/20 to-orange-600/10',
  },
  1000: {
    icon: '🏆',
    title: 'Hall of Fame',
    reward: 'Hall of Fame!',
    badge: 'Hall of Fame',
    color: 'text-amber-400',
    bgGradient: 'from-amber-500/20 to-amber-600/10',
  },
};

interface MilestoneProgressProps {
  currentReferrals: number;
  showHistory?: boolean;
  compact?: boolean;
  onMilestoneReached?: (milestone: MilestoneValue) => void;
}

export function MilestoneProgress({
  currentReferrals,
  showHistory = false,
  compact = false,
  onMilestoneReached,
}: MilestoneProgressProps) {
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebratedMilestone, setCelebratedMilestone] = useState<MilestoneValue | null>(null);
  const [prevReferrals, setPrevReferrals] = useState(currentReferrals);

  // Calculate milestone progress
  const getNextMilestone = (): MilestoneValue | null => {
    return MILESTONES.find(m => m > currentReferrals) || null;
  };

  const getPreviousMilestone = (): MilestoneValue | number => {
    const passed = MILESTONES.filter(m => m <= currentReferrals);
    return passed.length > 0 ? passed[passed.length - 1] : 0;
  };

  const getAchievedMilestones = (): MilestoneValue[] => {
    return MILESTONES.filter(m => m <= currentReferrals) as MilestoneValue[];
  };

  const nextMilestone = getNextMilestone();
  const previousMilestone = getPreviousMilestone();
  const achievedMilestones = getAchievedMilestones();

  // Calculate progress percentage
  const calculateProgress = () => {
    if (!nextMilestone) return 100;

    const prevValue = typeof previousMilestone === 'number' ? previousMilestone : 0;
    const range = nextMilestone - prevValue;
    const progress = currentReferrals - prevValue;

    return Math.min(100, Math.max(0, Math.round((progress / range) * 100)));
  };

  const progressPercent = calculateProgress();
  const referralsToNext = nextMilestone ? nextMilestone - currentReferrals : 0;

  // Check for milestone achievement
  useEffect(() => {
    if (currentReferrals > prevReferrals) {
      // Check if we just crossed a milestone
      const newMilestone = MILESTONES.find(
        m => m <= currentReferrals && m > prevReferrals
      );

      if (newMilestone) {
        setCelebratedMilestone(newMilestone as MilestoneValue);
        setShowCelebration(true);

        // Trigger callback
        onMilestoneReached?.(newMilestone as MilestoneValue);

        // Clear celebration after 5 seconds
        setTimeout(() => {
          setShowCelebration(false);
          setCelebratedMilestone(null);
        }, 5000);
      }
    }

    setPrevReferrals(currentReferrals);
  }, [currentReferrals, prevReferrals, onMilestoneReached]);

  // Render celebration overlay
  const renderCelebration = () => {
    if (!showCelebration || !celebratedMilestone) return null;

    const config = MILESTONE_CONFIG[celebratedMilestone];

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div className="animate-bounce bg-gradient-to-br from-yellow-500/90 to-amber-600/90 rounded-2xl p-8 text-center shadow-2xl shadow-yellow-500/50">
          <div className="text-6xl mb-4 animate-pulse">{config.icon}</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {celebratedMilestone} Referrals!
          </h2>
          <p className="text-yellow-100 mb-4">{config.title}</p>
          {config.reward && (
            <Badge className="bg-white/20 text-white border-white/30">
              {config.reward}
            </Badge>
          )}

          {/* Confetti effect (CSS-only) */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 2}s`,
                }}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500'][
                      Math.floor(Math.random() * 5)
                    ]
                  }`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Compact version
  if (compact) {
    return (
      <>
        {renderCelebration()}

        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">
                {currentReferrals} / {nextMilestone || 'MAX'} referrals
              </span>
              {nextMilestone && (
                <span className={MILESTONE_CONFIG[nextMilestone].color}>
                  {MILESTONE_CONFIG[nextMilestone].icon} {referralsToNext} to go
                </span>
              )}
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </>
    );
  }

  // Full version
  return (
    <>
      {renderCelebration()}

      <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
        <CardHeader className="pb-2">
          <CardTitle className="text-white flex items-center justify-between">
            <span>Milestone Progress</span>
            <Badge variant="outline" className="text-purple-300 border-purple-500/50">
              {currentReferrals} referrals
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Next Milestone Card */}
          {nextMilestone ? (
            <div className={`p-4 rounded-lg bg-gradient-to-r ${MILESTONE_CONFIG[nextMilestone].bgGradient} border border-gray-800`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{MILESTONE_CONFIG[nextMilestone].icon}</span>
                  <div>
                    <p className={`font-semibold ${MILESTONE_CONFIG[nextMilestone].color}`}>
                      {MILESTONE_CONFIG[nextMilestone].title}
                    </p>
                    <p className="text-sm text-gray-400">
                      {nextMilestone} referrals
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-white">{referralsToNext}</p>
                  <p className="text-xs text-gray-400">to unlock</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${MILESTONE_CONFIG[nextMilestone].bgGradient.replace('/20', '')} transition-all duration-500 ease-out relative`}
                    style={{ width: `${progressPercent}%` }}
                  >
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                  </div>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">
                    {typeof previousMilestone === 'number' ? previousMilestone : 0}
                  </span>
                  <span className="text-gray-400">{progressPercent}%</span>
                  <span className="text-gray-500">{nextMilestone}</span>
                </div>
              </div>

              {/* Reward Preview */}
              {MILESTONE_CONFIG[nextMilestone].reward && (
                <div className="mt-3 pt-3 border-t border-gray-700/50">
                  <p className="text-xs text-gray-400">
                    Unlock: <span className={MILESTONE_CONFIG[nextMilestone].color}>
                      {MILESTONE_CONFIG[nextMilestone].reward}
                    </span>
                  </p>
                </div>
              )}
            </div>
          ) : (
            // All milestones achieved
            <div className="p-6 rounded-lg bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 text-center">
              <span className="text-4xl mb-2 block">🏆</span>
              <p className="text-xl font-bold text-amber-400">All Milestones Achieved!</p>
              <p className="text-sm text-gray-400 mt-1">
                You've reached legendary status with {currentReferrals} referrals
              </p>
            </div>
          )}

          {/* Milestone History */}
          {showHistory && achievedMilestones.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-800">
              <p className="text-sm text-gray-400 mb-3">Achievements Unlocked</p>
              <div className="flex flex-wrap gap-2">
                {achievedMilestones.map(milestone => (
                  <Badge
                    key={milestone}
                    className={`${MILESTONE_CONFIG[milestone].color} bg-gray-800/50 border-gray-700`}
                  >
                    {MILESTONE_CONFIG[milestone].icon} {milestone}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Milestones Preview */}
          {nextMilestone && (
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-2">Upcoming milestones</p>
              <div className="flex gap-1">
                {MILESTONES.filter(m => m > currentReferrals).slice(0, 4).map((milestone, index) => (
                  <div
                    key={milestone}
                    className={`flex-1 p-2 rounded text-center transition-opacity ${
                      index === 0 ? 'opacity-100' : `opacity-${60 - index * 15}`
                    }`}
                    style={{ opacity: 1 - index * 0.2 }}
                  >
                    <span className="text-sm">{MILESTONE_CONFIG[milestone as MilestoneValue].icon}</span>
                    <p className="text-xs text-gray-500 mt-0.5">{milestone}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add CSS for animations */}
      <style jsx global>{`
        @keyframes confetti {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        .animate-confetti {
          animation: confetti 3s ease-out forwards;
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </>
  );
}

export default MilestoneProgress;
