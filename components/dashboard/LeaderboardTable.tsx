'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils/commission';

interface LeaderboardEntry {
  id: string;
  username: string;
  referralCode: string;
  lifetimeEarnings: number;
  monthlyEarnings: number;
  totalReferred: number;
  monthlyReferred: number;
  globalEarningsRank?: number;
  globalReferralsRank?: number;
  communityRank?: number;
}

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  type: 'earnings' | 'referrals';
  scope: 'global' | 'community';
}

export function LeaderboardTable({ entries, type, scope }: LeaderboardTableProps) {
  const getRank = (entry: LeaderboardEntry) => {
    if (scope === 'community') {
      return entry.communityRank;
    }
    return type === 'earnings' ? entry.globalEarningsRank : entry.globalReferralsRank;
  };

  const getValue = (entry: LeaderboardEntry) => {
    return type === 'earnings' 
      ? formatCurrency(entry.lifetimeEarnings)
      : entry.totalReferred.toString();
  };

  const getSubValue = (entry: LeaderboardEntry) => {
    return type === 'earnings'
      ? `${entry.monthlyReferred} this month`
      : formatCurrency(entry.monthlyEarnings);
  };

  return (
    <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
      <CardHeader>
        <CardTitle className="text-white">
          🏆 {scope === 'global' ? 'Global' : 'Community'} Leaderboard
        </CardTitle>
        <p className="text-gray-400 text-sm">
          Ranked by {type === 'earnings' ? 'earnings' : 'referrals'}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {entries.map((entry, index) => {
            const rank = getRank(entry);
            const isTopThree = rank && rank <= 3;
            const isFirst = rank === 1;
            const isSecond = rank === 2;
            const isThird = rank === 3;

            return (
              <div
                key={entry.id}
                className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200 hover:scale-[1.02] ${
                  isFirst
                    ? 'bg-gradient-to-r from-yellow-900/20 via-yellow-800/15 to-amber-900/20 border border-yellow-700/30 shadow-lg shadow-yellow-900/10'
                    : isSecond
                    ? 'bg-gradient-to-r from-gray-700/20 via-gray-600/15 to-gray-700/20 border border-gray-600/30 shadow-lg shadow-gray-800/10'
                    : isThird
                    ? 'bg-gradient-to-r from-orange-900/20 via-orange-800/15 to-amber-900/20 border border-orange-700/30 shadow-lg shadow-orange-900/10'
                    : 'bg-gray-900/50 border border-gray-800/50 hover:bg-gray-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-md ${
                    isFirst ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black shadow-yellow-500/50' :
                    isSecond ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-black shadow-gray-400/50' :
                    isThird ? 'bg-gradient-to-br from-orange-400 to-amber-600 text-black shadow-orange-500/50' :
                    'bg-gray-700 text-gray-300'
                  }`}>
                    {rank || '?'}
                  </div>
                  <div>
                    <p className={`font-medium ${
                      isFirst ? 'text-yellow-200' :
                      isSecond ? 'text-gray-200' :
                      isThird ? 'text-orange-200' :
                      'text-white'
                    }`}>
                      {entry.username}
                    </p>
                    <p className="text-xs text-gray-400">{entry.referralCode}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className={`font-bold ${
                    isFirst ? 'text-yellow-200' :
                    isSecond ? 'text-gray-200' :
                    isThird ? 'text-orange-200' :
                    'text-white'
                  }`}>
                    {getValue(entry)}
                  </p>
                  <p className="text-xs text-gray-400">{getSubValue(entry)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
