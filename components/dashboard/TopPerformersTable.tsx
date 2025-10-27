// components/dashboard/TopPerformersTable.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';

interface TopPerformer {
  id: string;
  username: string;
  email: string;
  referralCode: string;
  lifetimeEarnings: number;
  monthlyEarnings: number;
  totalReferred: number;
  monthlyReferred: number;
  currentTier: string;
  createdAt: Date;
}

interface TopPerformersTableProps {
  performers: TopPerformer[];
}

export function TopPerformersTable({ performers }: TopPerformersTableProps) {
  if (performers.length === 0) {
    return (
      <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            Top Referrers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-400">
            <p>No members yet. Share your referral program to get started!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Users className="w-5 h-5" />
          Top Referrers
        </CardTitle>
        <p className="text-gray-400 text-sm">
          Top 10 members ranked by total referrals
        </p>
      </CardHeader>
      <CardContent>
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider py-3 px-4">
                  Rank
                </th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider py-3 px-4">
                  Member
                </th>
                <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider py-3 px-4">
                  Total Referrals
                </th>
                <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider py-3 px-4">
                  This Month
                </th>
                <th className="text-center text-xs font-medium text-gray-400 uppercase tracking-wider py-3 px-4">
                  Tier
                </th>
              </tr>
            </thead>
            <tbody>
              {performers.map((performer, index) => {
                const rank = index + 1;
                const isTopThree = rank <= 3;

                return (
                  <tr
                    key={performer.id}
                    className={`border-b border-gray-800/50 hover:bg-gray-900/30 transition-colors ${
                      isTopThree ? 'bg-purple-900/10' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          rank === 1
                            ? 'bg-yellow-500 text-black'
                            : rank === 2
                            ? 'bg-gray-400 text-black'
                            : rank === 3
                            ? 'bg-amber-600 text-black'
                            : 'bg-gray-700 text-gray-300'
                        }`}
                      >
                        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-white">{performer.username}</p>
                        <p className="text-xs text-gray-400">{performer.referralCode}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <p className="font-bold text-white">{performer.totalReferred}</p>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <p className="text-sm text-gray-400">{performer.monthlyReferred}</p>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        variant="outline"
                        className={`${getTierColor(performer.currentTier)} border-none`}
                      >
                        {performer.currentTier}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {performers.map((performer, index) => {
            const rank = index + 1;
            const isTopThree = rank <= 3;

            return (
              <div
                key={performer.id}
                className={`p-4 rounded-lg ${
                  isTopThree ? 'bg-gradient-to-r from-purple-900/20 to-indigo-900/20' : 'bg-gray-900/50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                        rank === 1
                          ? 'bg-yellow-500 text-black'
                          : rank === 2
                          ? 'bg-gray-400 text-black'
                          : rank === 3
                          ? 'bg-amber-600 text-black'
                          : 'bg-gray-700 text-gray-300'
                      }`}
                    >
                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                    </div>
                    <div>
                      <p className="font-medium text-white">{performer.username}</p>
                      <p className="text-xs text-gray-400">{performer.referralCode}</p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`${getTierColor(performer.currentTier)} border-none`}
                  >
                    {performer.currentTier}
                  </Badge>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Total Referrals</p>
                    <p className="text-xl font-bold text-white">{performer.totalReferred}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 mb-1">This Month</p>
                    <p className="text-sm text-gray-300">{performer.monthlyReferred}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function getTierColor(tier: string): string {
  switch (tier.toLowerCase()) {
    case 'platinum':
    case 'diamond':
      return 'bg-purple-500/20 text-purple-300';
    case 'gold':
      return 'bg-yellow-500/20 text-yellow-300';
    case 'silver':
      return 'bg-gray-400/20 text-gray-300';
    case 'bronze':
    default:
      return 'bg-amber-700/20 text-amber-300';
  }
}
