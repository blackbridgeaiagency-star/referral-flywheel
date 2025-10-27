import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, TrendingUp, DollarSign } from 'lucide-react';

interface CommunityCardProps {
  name: string;
  productId: string;
  memberCount: number;
  totalReferrals: number;
  avgEarnings: number;
  topEarner: { earnings: number; referrals: number } | null;
}

export function CommunityCard({
  name,
  productId,
  memberCount,
  totalReferrals,
  avgEarnings,
  topEarner,
}: CommunityCardProps) {
  return (
    <Card className="bg-gray-900 border-gray-700 p-6 hover:border-purple-600 transition-all duration-200 hover:shadow-lg hover:shadow-purple-900/20">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-xl font-bold text-white mb-2">{name}</h3>
          <Badge className="bg-purple-600 text-white">{totalReferrals} Referrals</Badge>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4 flex-1">
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-400">Members</span>
            </div>
            <p className="text-lg font-bold text-white">{memberCount}</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-400">Avg Earnings</span>
            </div>
            <p className="text-lg font-bold text-green-400">${avgEarnings.toFixed(0)}</p>
          </div>
        </div>

        {/* Top Earner */}
        {topEarner && (
          <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-600/30 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-yellow-400">Top Earner</span>
            </div>
            <p className="text-sm text-white">
              <span className="font-bold">${topEarner.earnings.toFixed(0)}</span>
              <span className="text-gray-400"> • {topEarner.referrals} referrals</span>
            </p>
          </div>
        )}

        {/* CTA */}
        <Button
          onClick={() => window.open(`https://whop.com/products/${productId}`, '_blank')}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold"
        >
          Join & Start Earning →
        </Button>
      </div>
    </Card>
  );
}
