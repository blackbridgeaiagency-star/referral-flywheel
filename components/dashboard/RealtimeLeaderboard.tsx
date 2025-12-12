'use client';

/**
 * RealtimeLeaderboard Component
 *
 * Features:
 * 1. Auto-refreshing leaderboard (polls every 10-30s based on activity)
 * 2. Highlights current user's position with "You" badge
 * 3. Shows rank change animations (arrows up/down)
 * 4. Displays: rank, avatar placeholder, name, referrals, earnings
 * 5. Collapses after top 10, shows "You're #X" if user is below
 * 6. Smooth transitions and celebratory effects for rank ups
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { formatCurrency } from '../../lib/utils/commission';

// Types
interface LeaderboardEntry {
  id: string;
  username: string;
  referralCode: string;
  totalReferred: number;
  lifetimeEarnings: number;
  rank: number;
  previousRank?: number;
  rankChange?: 'up' | 'down' | 'same' | 'new';
}

interface RankChange {
  memberId: string;
  username: string;
  oldRank: number;
  newRank: number;
  direction: 'up' | 'down';
}

interface PollResponse {
  leaderboard: LeaderboardEntry[];
  userPosition: {
    rank: number;
    entry: LeaderboardEntry | null;
    isInTop10: boolean;
  } | null;
  changes: RankChange[];
  lastUpdated: string;
  totalMembers: number;
  pollInterval: number;
}

interface RealtimeLeaderboardProps {
  experienceId: string;
  currentMemberId: string;
  initialData?: LeaderboardEntry[];
  showHeader?: boolean;
  maxVisible?: number;
}

// Animation keyframes for rank changes
const rankUpAnimation = 'animate-pulse bg-green-500/20';
const rankDownAnimation = 'animate-pulse bg-red-500/20';
const newEntryAnimation = 'animate-pulse bg-blue-500/20';

export function RealtimeLeaderboard({
  experienceId,
  currentMemberId,
  initialData = [],
  showHeader = true,
  maxVisible = 10,
}: RealtimeLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(initialData);
  const [userPosition, setUserPosition] = useState<PollResponse['userPosition']>(null);
  const [totalMembers, setTotalMembers] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(initialData.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [recentChanges, setRecentChanges] = useState<Map<string, 'up' | 'down' | 'new'>>(new Map());
  const [isExpanded, setIsExpanded] = useState(false);

  const pollIntervalRef = useRef<number>(30000);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch leaderboard data
  const fetchLeaderboard = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        experienceId,
        memberId: currentMemberId,
        limit: maxVisible.toString(),
      });

      if (lastUpdated) {
        params.set('since', lastUpdated);
      }

      const response = await fetch(`/api/leaderboard/poll?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }

      const data: PollResponse = await response.json();

      // Track rank changes for animations
      const newChanges = new Map<string, 'up' | 'down' | 'new'>();
      data.leaderboard.forEach(entry => {
        if (entry.rankChange === 'up' || entry.rankChange === 'down' || entry.rankChange === 'new') {
          newChanges.set(entry.id, entry.rankChange);
        }
      });

      // If there were changes, highlight them briefly
      if (newChanges.size > 0) {
        setRecentChanges(newChanges);
        // Clear animations after 3 seconds
        setTimeout(() => setRecentChanges(new Map()), 3000);
      }

      setLeaderboard(data.leaderboard);
      setUserPosition(data.userPosition);
      setTotalMembers(data.totalMembers);
      setLastUpdated(data.lastUpdated);
      pollIntervalRef.current = data.pollInterval;
      setError(null);

    } catch (err) {
      console.error('Leaderboard fetch error:', err);
      setError('Unable to load leaderboard');
    } finally {
      setIsLoading(false);
    }
  }, [experienceId, currentMemberId, maxVisible, lastUpdated]);

  // Initial fetch and polling setup
  useEffect(() => {
    fetchLeaderboard();

    // Set up polling
    const startPolling = () => {
      pollTimeoutRef.current = setTimeout(() => {
        fetchLeaderboard().then(startPolling);
      }, pollIntervalRef.current);
    };

    startPolling();

    // Cleanup on unmount
    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, [fetchLeaderboard]);

  // Render rank badge with medal styling
  const renderRankBadge = (rank: number) => {
    const isFirst = rank === 1;
    const isSecond = rank === 2;
    const isThird = rank === 3;

    const baseClasses = 'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-md transition-all duration-300';

    if (isFirst) {
      return (
        <div className={`${baseClasses} bg-gradient-to-br from-yellow-400 to-yellow-600 text-black shadow-yellow-500/50`}>
          {rank}
        </div>
      );
    }
    if (isSecond) {
      return (
        <div className={`${baseClasses} bg-gradient-to-br from-gray-300 to-gray-500 text-black shadow-gray-400/50`}>
          {rank}
        </div>
      );
    }
    if (isThird) {
      return (
        <div className={`${baseClasses} bg-gradient-to-br from-orange-400 to-amber-600 text-black shadow-orange-500/50`}>
          {rank}
        </div>
      );
    }

    return (
      <div className={`${baseClasses} bg-gray-700 text-gray-300`}>
        {rank}
      </div>
    );
  };

  // Render rank change indicator
  const renderRankChange = (entry: LeaderboardEntry) => {
    const change = recentChanges.get(entry.id) || entry.rankChange;

    if (!change || change === 'same') return null;

    if (change === 'up') {
      return (
        <span className="text-green-400 text-xs font-medium flex items-center gap-0.5 animate-bounce">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          {entry.previousRank !== undefined && entry.previousRank - entry.rank}
        </span>
      );
    }

    if (change === 'down') {
      return (
        <span className="text-red-400 text-xs font-medium flex items-center gap-0.5">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          {entry.previousRank !== undefined && entry.rank - entry.previousRank}
        </span>
      );
    }

    if (change === 'new') {
      return (
        <Badge variant="outline" className="text-xs bg-blue-500/20 text-blue-300 border-blue-500/50">
          NEW
        </Badge>
      );
    }

    return null;
  };

  // Get animation class for entry
  const getAnimationClass = (entry: LeaderboardEntry) => {
    const change = recentChanges.get(entry.id);
    if (change === 'up') return rankUpAnimation;
    if (change === 'down') return rankDownAnimation;
    if (change === 'new') return newEntryAnimation;
    return '';
  };

  // Render single leaderboard entry
  const renderEntry = (entry: LeaderboardEntry, isCurrentUser: boolean) => {
    const isTopThree = entry.rank <= 3;
    const isFirst = entry.rank === 1;
    const isSecond = entry.rank === 2;
    const isThird = entry.rank === 3;
    const animationClass = getAnimationClass(entry);

    return (
      <div
        key={entry.id}
        className={`flex items-center justify-between p-3 rounded-lg transition-all duration-300 ${animationClass} ${
          isCurrentUser
            ? 'bg-gradient-to-r from-purple-900/30 via-purple-800/20 to-purple-900/30 border-2 border-purple-500/50 shadow-lg shadow-purple-900/20'
            : isFirst
            ? 'bg-gradient-to-r from-yellow-900/20 via-yellow-800/15 to-amber-900/20 border border-yellow-700/30 shadow-lg shadow-yellow-900/10'
            : isSecond
            ? 'bg-gradient-to-r from-gray-700/20 via-gray-600/15 to-gray-700/20 border border-gray-600/30 shadow-lg shadow-gray-800/10'
            : isThird
            ? 'bg-gradient-to-r from-orange-900/20 via-orange-800/15 to-amber-900/20 border border-orange-700/30 shadow-lg shadow-orange-900/10'
            : 'bg-gray-900/50 border border-gray-800/50 hover:bg-gray-800/50'
        }`}
      >
        <div className="flex items-center gap-3">
          {renderRankBadge(entry.rank)}

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <p className={`font-medium ${
                isCurrentUser ? 'text-purple-200' :
                isFirst ? 'text-yellow-200' :
                isSecond ? 'text-gray-200' :
                isThird ? 'text-orange-200' :
                'text-white'
              }`}>
                {entry.username}
              </p>
              {isCurrentUser && (
                <Badge className="bg-purple-500/30 text-purple-200 border-purple-500/50 text-xs">
                  You
                </Badge>
              )}
              {renderRankChange(entry)}
            </div>
            <p className="text-xs text-gray-400">{entry.referralCode}</p>
          </div>
        </div>

        <div className="text-right">
          <p className={`font-bold ${
            isCurrentUser ? 'text-purple-200' :
            isFirst ? 'text-yellow-200' :
            isSecond ? 'text-gray-200' :
            isThird ? 'text-orange-200' :
            'text-white'
          }`}>
            {entry.totalReferred} referrals
          </p>
          <p className="text-xs text-gray-400">{formatCurrency(entry.lifetimeEarnings)}</p>
        </div>
      </div>
    );
  };

  // Render user's position if not in visible list
  const renderUserPositionCard = () => {
    if (!userPosition || userPosition.isInTop10 || !userPosition.entry) return null;

    return (
      <div className="mt-4 pt-4 border-t border-gray-800">
        <p className="text-gray-400 text-sm mb-2 text-center">Your Position</p>
        {renderEntry(userPosition.entry, true)}
      </div>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
        {showHeader && (
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <span className="animate-pulse">Loading leaderboard...</span>
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-900/50 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-gray-700" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-700 rounded w-24 mb-1" />
                  <div className="h-3 bg-gray-800 rounded w-16" />
                </div>
                <div className="text-right">
                  <div className="h-4 bg-gray-700 rounded w-16 mb-1" />
                  <div className="h-3 bg-gray-800 rounded w-12" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error && leaderboard.length === 0) {
    return (
      <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
        {showHeader && (
          <CardHeader>
            <CardTitle className="text-white">Community Leaderboard</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setIsLoading(true);
                fetchLeaderboard();
              }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Determine which entries to show
  const visibleEntries = isExpanded ? leaderboard : leaderboard.slice(0, maxVisible);
  const hasMore = leaderboard.length > maxVisible;

  return (
    <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
      {showHeader && (
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <span>Community Leaderboard</span>
              <span className="text-xs text-gray-500 font-normal">
                ({totalMembers} members)
              </span>
            </CardTitle>
            {lastUpdated && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Live
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm">Ranked by referrals</p>
        </CardHeader>
      )}

      <CardContent>
        <div className="space-y-2">
          {visibleEntries.map(entry =>
            renderEntry(entry, entry.id === currentMemberId)
          )}

          {/* Show expand/collapse button if there are more entries */}
          {hasMore && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              {isExpanded ? 'Show less' : `Show ${leaderboard.length - maxVisible} more`}
            </button>
          )}

          {/* Show user's position if not in top 10 */}
          {!isExpanded && renderUserPositionCard()}
        </div>
      </CardContent>
    </Card>
  );
}

export default RealtimeLeaderboard;
