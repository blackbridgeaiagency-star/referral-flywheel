'use client';

import { useState, useEffect } from 'react';
import { calculateMemberTier, type TierThresholds } from '../../lib/utils/tier-calculator';

// ============================================
// REWARD TIER BADGE WITH PROGRESSIVE GLOW
// 5 tiers: Unranked → Bronze → Silver → Gold → Platinum
// Progressive glow intensity matching leaderboard button at Platinum
// ============================================

type TierName = 'unranked' | 'bronze' | 'silver' | 'gold' | 'platinum';

interface TierConfig {
  tier: TierName;
  label: string;
  emoji: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
  glowIntensity: number; // 0-1 scale for brightness
  breatheScale: number;  // Scale multiplier for breathing animation
  animationDuration: string;
}

// Default tier thresholds (can be overridden by creator settings)
const DEFAULT_THRESHOLDS: TierThresholds = {
  tier1Count: 3,   // Bronze: 3+
  tier2Count: 10,  // Silver: 10+
  tier3Count: 25,  // Gold: 25+
  tier4Count: 100, // Platinum: 100+
};

/**
 * Get tier configuration based on total referrals
 * 5-tier system with progressive glow:
 * - Unranked (0-2): Faded outline, barely visible "dead" breathing
 * - Bronze (3-9): Slight warm glow, subtle animation
 * - Silver (10-24): Medium cool glow, gentle animation
 * - Gold (25-99): Strong golden glow, noticeable animation
 * - Platinum (100+): Maximum glow, same as leaderboard button
 */
function getTierConfig(totalReferred: number, thresholds: TierThresholds = DEFAULT_THRESHOLDS): TierConfig {
  const memberTier = calculateMemberTier(totalReferred, thresholds);

  switch (memberTier) {
    case 'Platinum':
      // Maximum brightness, same as leaderboard button
      return {
        tier: 'platinum',
        label: 'Platinum',
        emoji: '💎',
        textColor: 'text-purple-300',
        bgColor: 'bg-gradient-to-r from-purple-600 via-purple-500 to-purple-600',
        borderColor: 'border-purple-400',
        glowColor: 'rgba(168, 85, 247, 0.8)',
        glowIntensity: 1.0,
        breatheScale: 1.05,
        animationDuration: '3s',
      };

    case 'Gold':
      // Strong golden glow
      return {
        tier: 'gold',
        label: 'Gold',
        emoji: '🥇',
        textColor: 'text-yellow-300',
        bgColor: 'bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600',
        borderColor: 'border-yellow-400',
        glowColor: 'rgba(250, 204, 21, 0.7)',
        glowIntensity: 0.7,
        breatheScale: 1.04,
        animationDuration: '3.5s',
      };

    case 'Silver':
      // Medium cool glow
      return {
        tier: 'silver',
        label: 'Silver',
        emoji: '🥈',
        textColor: 'text-gray-300',
        bgColor: 'bg-gradient-to-r from-gray-500 via-gray-400 to-gray-500',
        borderColor: 'border-gray-400',
        glowColor: 'rgba(156, 163, 175, 0.5)',
        glowIntensity: 0.4,
        breatheScale: 1.025,
        animationDuration: '4s',
      };

    case 'Bronze':
      // Slight warm glow
      return {
        tier: 'bronze',
        label: 'Bronze',
        emoji: '🥉',
        textColor: 'text-amber-400',
        bgColor: 'bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700',
        borderColor: 'border-amber-500/70',
        glowColor: 'rgba(217, 119, 6, 0.35)',
        glowIntensity: 0.2,
        breatheScale: 1.015,
        animationDuration: '5s',
      };

    case 'Unranked':
    default:
      // Slight white glow, slow "gasping for air" animation to draw attention
      return {
        tier: 'unranked',
        label: 'Unranked',
        emoji: '⚪',
        textColor: 'text-gray-400',
        bgColor: 'bg-gray-800/30',
        borderColor: 'border-white/20',
        glowColor: 'rgba(255, 255, 255, 0.15)',
        glowIntensity: 0.12,
        breatheScale: 1.008,
        animationDuration: '6s',
      };
  }
}

interface RankBadgeProps {
  totalReferred: number;
  tierThresholds?: TierThresholds; // Creator-defined tier thresholds
  showAllTiers?: boolean; // Enable cycling through all tiers for showcase
}

// All tier levels for cycling display
const TIER_LEVELS = ['unranked', 'bronze', 'silver', 'gold', 'platinum'] as const;
const TIER_REFERRAL_COUNTS = [0, 3, 10, 25, 100]; // Referral count to trigger each tier

/**
 * Animated Tier Badge with progressive glow effects
 * 5-tier reward system with progressive glow:
 * - Unranked (0-2): Slight white glow, slow "gasping for air" animation
 * - Bronze (3-9): Slight warm glow, subtle animation
 * - Silver (10-24): Medium cool glow, gentle animation
 * - Gold (25-99): Strong golden glow, noticeable animation
 * - Platinum (100+): Maximum glow, same breathing effect as leaderboard button
 *
 * When showAllTiers=true, cycles through all tiers every 3 seconds
 */
export function RankBadge({ totalReferred, tierThresholds, showAllTiers = false }: RankBadgeProps) {
  const [cycleIndex, setCycleIndex] = useState(0);

  // Use creator's thresholds or defaults
  const thresholds = tierThresholds || DEFAULT_THRESHOLDS;

  // Cycle through tiers every 3 seconds when showAllTiers is enabled
  useEffect(() => {
    if (!showAllTiers) return;

    const interval = setInterval(() => {
      setCycleIndex(prev => (prev + 1) % TIER_LEVELS.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [showAllTiers]);

  // Use cycled tier or actual tier based on showAllTiers
  const displayReferralCount = showAllTiers
    ? TIER_REFERRAL_COUNTS[cycleIndex]
    : totalReferred;

  const config = getTierConfig(displayReferralCount, thresholds);
  const animationName = `breathe-${config.tier}`;

  // Tooltip text showing progress to next tier (uses creator's thresholds)
  const getTooltipText = () => {
    switch (config.tier) {
      case 'unranked':
        return `${totalReferred}/${thresholds.tier1Count} referrals to Bronze tier`;
      case 'bronze':
        return `${totalReferred}/${thresholds.tier2Count} referrals to Silver tier`;
      case 'silver':
        return `${totalReferred}/${thresholds.tier3Count} referrals to Gold tier`;
      case 'gold':
        return `${totalReferred}/${thresholds.tier4Count} referrals to Platinum tier`;
      case 'platinum':
        return `Platinum tier - Maximum rewards!`;
      default:
        return '';
    }
  };

  return (
    <>
      <div
        className={`
          relative inline-flex items-center gap-1.5 px-2 py-1 rounded-lg
          ${config.bgColor} border ${config.borderColor}
          transition-all duration-300
        `}
        style={{
          animation: `${animationName} ${config.animationDuration} ease-in-out infinite`,
          boxShadow: `0 0 ${15 * config.glowIntensity}px ${config.glowColor}, 0 0 ${30 * config.glowIntensity}px ${config.glowColor}`,
          opacity: config.tier === 'unranked' ? 0.75 : 1,
          filter: config.tier === 'unranked'
            ? 'brightness(0.8)'
            : `brightness(${0.85 + config.glowIntensity * 0.35})`,
        }}
        title={getTooltipText()}
      >
        {/* Glow effect background */}
        <div
          className="absolute inset-0 rounded-lg blur-xl transition-opacity"
          style={{
            background: config.glowColor,
            opacity: config.glowIntensity * 0.4,
          }}
        />

        {/* Content */}
        <div className="relative flex items-center gap-1">
          <span
            className="text-sm"
            style={{
              filter: config.tier === 'unranked' ? 'brightness(0.7) grayscale(0.3)' : 'none',
              opacity: config.tier === 'unranked' ? 0.8 : 1,
            }}
          >
            {config.emoji}
          </span>
          <span className={`font-semibold text-xs ${config.textColor}`}>
            {config.label}
          </span>
        </div>
      </div>

      {/* Custom breathing animations for each tier */}
      <style jsx>{`
        @keyframes breathe-platinum {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 15px rgba(168, 85, 247, 0.8), 0 0 30px rgba(168, 85, 247, 0.5);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 25px rgba(168, 85, 247, 1), 0 0 50px rgba(168, 85, 247, 0.7);
          }
        }
        @keyframes breathe-gold {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 12px rgba(250, 204, 21, 0.6), 0 0 24px rgba(250, 204, 21, 0.35);
          }
          50% {
            transform: scale(1.04);
            box-shadow: 0 0 20px rgba(250, 204, 21, 0.85), 0 0 40px rgba(250, 204, 21, 0.5);
          }
        }
        @keyframes breathe-silver {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 8px rgba(156, 163, 175, 0.4), 0 0 16px rgba(156, 163, 175, 0.2);
          }
          50% {
            transform: scale(1.025);
            box-shadow: 0 0 12px rgba(156, 163, 175, 0.55), 0 0 24px rgba(156, 163, 175, 0.3);
          }
        }
        @keyframes breathe-bronze {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 5px rgba(217, 119, 6, 0.25), 0 0 10px rgba(217, 119, 6, 0.12);
          }
          50% {
            transform: scale(1.015);
            box-shadow: 0 0 8px rgba(217, 119, 6, 0.4), 0 0 16px rgba(217, 119, 6, 0.2);
          }
        }
        @keyframes breathe-unranked {
          /* Gasping for air: slow fade in, hold, slow fade out */
          0% {
            transform: scale(1);
            box-shadow: 0 0 2px rgba(255, 255, 255, 0.05);
            opacity: 0.7;
          }
          /* Slow rise - the gasp */
          35% {
            transform: scale(1.012);
            box-shadow: 0 0 6px rgba(255, 255, 255, 0.18), 0 0 12px rgba(255, 255, 255, 0.08);
            opacity: 0.85;
          }
          /* Brief hold at peak */
          45% {
            transform: scale(1.012);
            box-shadow: 0 0 6px rgba(255, 255, 255, 0.18), 0 0 12px rgba(255, 255, 255, 0.08);
            opacity: 0.85;
          }
          /* Long slow exhale back down */
          100% {
            transform: scale(1);
            box-shadow: 0 0 2px rgba(255, 255, 255, 0.05);
            opacity: 0.7;
          }
        }
      `}</style>
    </>
  );
}

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
  size?: 'sm' | 'md' | 'lg';
  showLongest?: boolean;
}

/**
 * Compact streak display component
 * Shows current daily referral streak with fire emoji
 * Designed to be non-obtrusive, placed near member name
 */
export function StreakDisplay({
  currentStreak,
  longestStreak,
  size = 'md',
  showLongest = false,
}: StreakDisplayProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  // Animate when streak changes
  useEffect(() => {
    if (currentStreak > 0) {
      setIsAnimating(true);
      const timeout = setTimeout(() => setIsAnimating(false), 500);
      return () => clearTimeout(timeout);
    }
  }, [currentStreak]);

  // Determine streak tier for styling
  const getStreakTier = (streak: number) => {
    if (streak >= 90) return { label: 'LEGEND', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/50' };
    if (streak >= 60) return { label: 'Master', color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/50' };
    if (streak >= 30) return { label: 'Elite', color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/50' };
    if (streak >= 14) return { label: 'Pro', color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/50' };
    if (streak >= 7) return { label: 'Rising', color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/50' };
    if (streak >= 3) return { label: 'Active', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/50' };
    return { label: '', color: 'text-gray-400', bg: 'bg-gray-700/50', border: 'border-gray-600/50' };
  };

  const tier = getStreakTier(currentStreak);

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-3 py-1 gap-1.5',
    lg: 'text-base px-4 py-2 gap-2',
  };

  const fireEmojis = currentStreak >= 7 ? '🔥🔥' : currentStreak >= 3 ? '🔥' : '';

  if (currentStreak === 0) {
    return (
      <div
        className={`inline-flex items-center rounded-full ${tier.bg} ${tier.border} border ${sizeClasses[size]}`}
        title="Start a referral streak! Make a referral today."
      >
        <span className="text-gray-500">💤</span>
        <span className={`font-medium ${tier.color}`}>No streak</span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center rounded-full ${tier.bg} ${tier.border} border ${sizeClasses[size]} ${
        isAnimating ? 'animate-pulse' : ''
      }`}
      title={`${currentStreak}-day referral streak${longestStreak > currentStreak ? ` (Best: ${longestStreak} days)` : ''}`}
    >
      <span className={`${isAnimating ? 'animate-bounce' : ''}`}>{fireEmojis || '🔥'}</span>
      <span className={`font-bold ${tier.color}`}>{currentStreak}</span>
      <span className={`${tier.color}`}>day{currentStreak !== 1 ? 's' : ''}</span>
      {tier.label && (
        <span className={`${tier.color} font-semibold ml-1 uppercase text-[10px]`}>
          {tier.label}
        </span>
      )}
      {showLongest && longestStreak > currentStreak && (
        <span className="text-gray-500 text-xs ml-2">
          (Best: {longestStreak})
        </span>
      )}
    </div>
  );
}

/**
 * Compact streak card for dashboard section
 * Shows streak info with full-width progress bar
 * Includes animated tier badge on the right (based on totalReferred and creator's tier thresholds)
 */
export function StreakCard({
  currentStreak,
  longestStreak,
  totalReferred = 0,
  tierThresholds,
}: {
  currentStreak: number;
  longestStreak: number;
  totalReferred?: number;
  tierThresholds?: TierThresholds;
}) {
  const MILESTONES = [3, 7, 14, 30, 60, 90];
  const nextMilestone = MILESTONES.find(m => m > currentStreak) || 90;
  const progress = currentStreak > 0 ? (currentStreak / nextMilestone) * 100 : 0;

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3">
      {/* Top row: Streak info + Tier Badge + milestones */}
      <div className="flex items-center justify-between mb-2">
        {/* Streak info (left side) */}
        <div className="flex items-center gap-2">
          <span className="text-lg">🔥</span>
          <span className="text-base font-bold text-orange-400">{currentStreak}</span>
          <span className="text-xs text-gray-400">day streak</span>
          {longestStreak > currentStreak && (
            <span className="text-[10px] text-gray-500">(Best: {longestStreak})</span>
          )}
        </div>

        {/* Right side: Tier Badge + Milestones */}
        <div className="flex items-center gap-2">
          {/* Animated Tier Badge */}
          <RankBadge totalReferred={totalReferred} tierThresholds={tierThresholds} />

          {/* Milestone icons */}
          {currentStreak >= 90 ? (
            <span className="text-yellow-400 text-xs font-bold">🏆 LEGEND</span>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-500 mr-1">Next: {nextMilestone}d</span>
              {[3, 7, 14, 30, 60, 90].map((m) => (
                <div
                  key={m}
                  className={`text-xs ${currentStreak >= m ? 'opacity-100' : 'opacity-30 grayscale'}`}
                  title={`${m} days`}
                >
                  {m === 3 && '🔥'}{m === 7 && '⚡'}{m === 14 && '💪'}{m === 30 && '🚀'}{m === 60 && '👑'}{m === 90 && '🏆'}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Full-width progress bar */}
      {currentStreak < 90 && (
        <div className="w-full">
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
            <span>0</span>
            <span>{currentStreak}/{nextMilestone}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default StreakDisplay;
