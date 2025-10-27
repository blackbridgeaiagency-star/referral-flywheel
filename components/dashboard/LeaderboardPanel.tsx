'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Trophy, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils/commission';

interface LeaderboardEntry {
  id: string;
  username: string;
  referralCode: string;
  totalReferred?: number;
  lifetimeEarnings?: number;
  rank: number;
}

interface LeaderboardPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentMemberId: string;
  creatorId: string;
  type: 'referrals' | 'earnings';
}

export function LeaderboardPanel({
  isOpen,
  onClose,
  currentMemberId,
  creatorId,
  type
}: LeaderboardPanelProps) {
  const [activeTab, setActiveTab] = useState<'community' | 'global'>('community');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const userRowRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Fetch leaderboard data
  useEffect(() => {
    if (!isOpen) return;

    const fetchLeaderboard = async () => {
      setIsLoading(true);
      try {
        const scope = activeTab === 'community' ? 'community' : 'global';
        const url = `/api/leaderboard?type=${type}&scope=${scope}&creatorId=${creatorId}&limit=100&memberId=${currentMemberId}`;

        console.log('🔍 Fetching leaderboard:', url);
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Leaderboard data received:', {
            leaderboardCount: data.leaderboard?.length || 0,
            userRank: data.userRank,
            totalMembers: data.totalMembers
          });
          setLeaderboard(data.leaderboard || []);
          setUserRank(data.userRank || null);
        } else {
          console.error('❌ API response not OK:', response.status);
        }
      } catch (error) {
        console.error('❌ Error fetching leaderboard:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, [isOpen, activeTab, type, creatorId, currentMemberId]);

  // Auto-scroll to user's position
  useEffect(() => {
    if (userRowRef.current && leaderboard.length > 0) {
      setTimeout(() => {
        userRowRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 300);
    }
  }, [leaderboard]);

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const scrollToBottom = () => {
    scrollContainerRef.current?.scrollTo({
      top: scrollContainerRef.current.scrollHeight,
      behavior: 'smooth'
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay backdrop - more solid and dark */}
      <div
        className="fixed inset-0 bg-black/90 backdrop-blur-md z-40 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Sliding panel - more prominent */}
      <div
        className="fixed left-0 top-0 h-screen w-full sm:w-[650px] md:w-[750px] bg-[#1A1A1A] border-r-4 border-purple-600/50 z-50 shadow-2xl shadow-purple-900/50 animate-in slide-in-from-left duration-300 flex flex-col"
      >
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-[#1A0F2E] via-[#0F0F0F] to-[#1A0F2E] border-b-2 border-purple-600/30 p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400 drop-shadow-lg" />
              <h2 className="text-lg font-bold text-white drop-shadow-lg">
                Leaderboard
              </h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-white h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-3">
            <Button
              variant={activeTab === 'community' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('community')}
              className={`flex-1 h-8 text-sm ${activeTab === 'community' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'border-gray-700 hover:bg-gray-800 text-gray-300'}`}
            >
              Community
            </Button>
            <Button
              variant={activeTab === 'global' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('global')}
              className={`flex-1 h-8 text-sm ${activeTab === 'global' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'border-gray-700 hover:bg-gray-800 text-gray-300'}`}
            >
              Global
            </Button>
          </div>

          {/* User's rank indicator */}
          {userRank && (
            <div className="bg-purple-900/20 border border-purple-600/30 rounded-lg p-2">
              <p className="text-xs text-gray-400">Your Rank</p>
              <p className="text-xl font-bold text-white">#{userRank}</p>
            </div>
          )}
        </div>

        {/* Leaderboard list */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-2"
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2 text-white">
                <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                <span>Loading...</span>
              </div>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>No members yet!</p>
              <p className="text-xs mt-2">Debug: leaderboard.length = {leaderboard.length}</p>
            </div>
          ) : (
            leaderboard.map((entry) => {
              const isCurrentUser = entry.id === currentMemberId;
              const isTopThree = entry.rank <= 3;

              return (
                <div
                  key={entry.id}
                  ref={isCurrentUser ? userRowRef : null}
                  className={`p-3 rounded-lg transition-all ${
                    isCurrentUser
                      ? 'bg-purple-900/30 border-2 border-purple-600 shadow-lg'
                      : isTopThree
                      ? 'bg-gradient-to-r from-yellow-900/20 to-amber-900/20 border border-yellow-600/30'
                      : 'bg-gray-900/50 border border-gray-800 hover:bg-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Rank badge */}
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-base font-bold ${
                        entry.rank === 1
                          ? 'bg-yellow-500 text-black'
                          : entry.rank === 2
                          ? 'bg-gray-400 text-black'
                          : entry.rank === 3
                          ? 'bg-amber-600 text-black'
                          : 'bg-gray-700 text-gray-300'
                      }`}
                    >
                      {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                    </div>

                    {/* Member info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">
                          {entry.username}
                        </p>
                        {isCurrentUser && (
                          <Badge className="bg-purple-600 text-white text-xs px-1 py-0">You</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{entry.referralCode}</p>
                    </div>

                    {/* Stats */}
                    <div className="text-right">
                      <p className={`text-base font-bold ${activeTab === 'global' ? 'text-green-400' : 'text-white'}`}>
                        {activeTab === 'global'
                          ? formatCurrency(entry.lifetimeEarnings || 0)
                          : entry.totalReferred}
                      </p>
                      <p className="text-xs text-gray-400">
                        {activeTab === 'global' ? 'earned' : 'referrals'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Jump buttons */}
        {leaderboard.length > 10 && (
          <div className="absolute bottom-6 right-6 flex flex-col gap-2">
            <Button
              size="sm"
              onClick={scrollToTop}
              className="bg-gray-800 hover:bg-gray-700 text-white rounded-full w-10 h-10 p-0"
            >
              <ArrowUp className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              onClick={scrollToBottom}
              className="bg-gray-800 hover:bg-gray-700 text-white rounded-full w-10 h-10 p-0"
            >
              <ArrowDown className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
