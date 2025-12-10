'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, ExternalLink, ChevronDown, ChevronUp, Star, Crown } from 'lucide-react';

interface TierUpgrade {
  historyId: string;
  memberId: string;
  username: string;
  email: string;
  previousTier: string;
  newTier: string;
  newRate: number;
  referralCount: number;
  createdAt: string;
  newTierDisplay: {
    name: string;
    icon: string;
    rateDisplay: string;
  };
  whopInstructions: {
    step1: string;
    step2: string;
    step3: string;
    dashboardUrl: string;
  };
}

interface TierUpgradeNotificationsProps {
  creatorId: string;
}

export function TierUpgradeNotifications({ creatorId }: TierUpgradeNotificationsProps) {
  const [upgrades, setUpgrades] = useState<TierUpgrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchUpgrades();
  }, [creatorId]);

  const fetchUpgrades = async () => {
    try {
      const response = await fetch(`/api/creator/tier-upgrades?creatorId=${creatorId}`);
      const data = await response.json();
      if (data.success) {
        setUpgrades(data.upgrades);
      }
    } catch (error) {
      console.error('Failed to fetch tier upgrades:', error);
    } finally {
      setLoading(false);
    }
  };

  const markCompleted = async (historyId: string) => {
    setCompletingId(historyId);
    try {
      const response = await fetch('/api/creator/tier-upgrades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ historyId }),
      });

      if (response.ok) {
        setUpgrades(prev => prev.filter(u => u.historyId !== historyId));
      }
    } catch (error) {
      console.error('Failed to mark upgrade as completed:', error);
    } finally {
      setCompletingId(null);
    }
  };

  if (loading) {
    return (
      <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
        <CardContent className="p-6">
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-4 py-1">
              <div className="h-4 bg-gray-700 rounded w-3/4"></div>
              <div className="h-4 bg-gray-700 rounded w-1/2"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (upgrades.length === 0) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border-yellow-500/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-400" />
            Action Required: Tier Upgrades
          </CardTitle>
          <Badge className="bg-yellow-500/20 text-yellow-400">
            {upgrades.length} pending
          </Badge>
        </div>
        <p className="text-gray-400 text-sm">
          These top performers have earned higher commission rates. Update their rates in Whop.
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {upgrades.map((upgrade) => (
          <div
            key={upgrade.historyId}
            className="bg-black/30 rounded-lg border border-gray-700 overflow-hidden"
          >
            {/* Header - Always visible */}
            <div
              className="p-4 cursor-pointer flex items-center justify-between"
              onClick={() => setExpandedId(expandedId === upgrade.historyId ? null : upgrade.historyId)}
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl">
                  {upgrade.newTier === 'elite' ? <Crown className="w-8 h-8 text-purple-400" /> : <Star className="w-8 h-8 text-yellow-400" />}
                </div>
                <div>
                  <p className="text-white font-semibold">{upgrade.username}</p>
                  <p className="text-gray-400 text-sm">
                    {upgrade.referralCount} paid referrals → {upgrade.newTierDisplay.name} ({upgrade.newTierDisplay.rateDisplay})
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={upgrade.newTier === 'elite' ? 'bg-purple-500/20 text-purple-400' : 'bg-yellow-500/20 text-yellow-400'}>
                  {upgrade.newTierDisplay.icon} {upgrade.newTierDisplay.name}
                </Badge>
                {expandedId === upgrade.historyId ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>

            {/* Expanded content */}
            {expandedId === upgrade.historyId && (
              <div className="px-4 pb-4 border-t border-gray-700 pt-4 space-y-4">
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3">Update in Whop Dashboard:</h4>
                  <ol className="text-gray-300 text-sm space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-400 font-bold">1.</span>
                      {upgrade.whopInstructions.step1}
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-400 font-bold">2.</span>
                      {upgrade.whopInstructions.step2}
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-400 font-bold">3.</span>
                      {upgrade.whopInstructions.step3}
                    </li>
                  </ol>
                </div>

                <div className="flex gap-3">
                  <Button
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
                    onClick={() => window.open(upgrade.whopInstructions.dashboardUrl, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Whop Dashboard
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600"
                    onClick={() => markCompleted(upgrade.historyId)}
                    disabled={completingId === upgrade.historyId}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {completingId === upgrade.historyId ? 'Completing...' : 'Mark as Done'}
                  </Button>
                </div>

                <p className="text-xs text-gray-500 text-center">
                  Note: Your platform fee is reduced to {upgrade.newTier === 'elite' ? '12%' : '15%'} for this member.
                  You still receive your full 70% of every sale.
                </p>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * Summary badge showing pending tier upgrades count.
 * Use in navigation or header to alert creators.
 */
export function TierUpgradesBadge({ creatorId }: { creatorId: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const response = await fetch(`/api/creator/tier-upgrades?creatorId=${creatorId}`);
        const data = await response.json();
        if (data.success) {
          setCount(data.pendingCount);
        }
      } catch (error) {
        console.error('Failed to fetch tier upgrades count:', error);
      }
    };

    fetchCount();
  }, [creatorId]);

  if (count === 0) return null;

  return (
    <Badge className="bg-yellow-500 text-black font-bold animate-pulse">
      {count}
    </Badge>
  );
}
