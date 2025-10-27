'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Trophy, Clock, Save } from 'lucide-react';

interface CustomRewardsFormProps {
  creatorId: string;
  initialData: {
    customRewardEnabled: boolean;
    customRewardTimeframe: string | null;
    customRewardTop3: string | null;
    customRewardTop5: string | null;
    customRewardTop10: string | null;
  };
}

export function CustomRewardsForm({ creatorId, initialData }: CustomRewardsFormProps) {
  const [enabled, setEnabled] = useState(initialData.customRewardEnabled);
  const [timeframe, setTimeframe] = useState(initialData.customRewardTimeframe || 'monthly');
  const [rewardTop3, setRewardTop3] = useState(initialData.customRewardTop3 || '');
  const [rewardTop5, setRewardTop5] = useState(initialData.customRewardTop5 || '');
  const [rewardTop10, setRewardTop10] = useState(initialData.customRewardTop10 || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const response = await fetch('/api/creator/custom-rewards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creatorId,
          customRewardEnabled: enabled,
          customRewardTimeframe: timeframe,
          customRewardTop3: rewardTop3 || null,
          customRewardTop5: rewardTop5 || null,
          customRewardTop10: rewardTop10 || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save custom rewards');
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving custom rewards:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Custom Competition Rewards
        </CardTitle>
        <CardDescription className="text-gray-400">
          Set time-based competitions with special rewards for your top performers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Label htmlFor="custom-rewards-enabled" className="text-white cursor-pointer">
              Enable Custom Rewards
            </Label>
            <span className="text-xs text-gray-400">
              {enabled ? 'Active' : 'Inactive'}
            </span>
          </div>
          <Switch
            id="custom-rewards-enabled"
            checked={enabled}
            onCheckedChange={setEnabled}
            className="data-[state=checked]:bg-yellow-500"
          />
        </div>

        {enabled && (
          <>
            {/* Timeframe Selection */}
            <div className="space-y-2">
              <Label className="text-white flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Competition Period
              </Label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="bg-[#0F0F0F] border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-gray-700">
                  <SelectItem value="daily" className="text-white hover:bg-gray-800">
                    Daily (Resets every 24 hours)
                  </SelectItem>
                  <SelectItem value="weekly" className="text-white hover:bg-gray-800">
                    Weekly (Resets every Monday)
                  </SelectItem>
                  <SelectItem value="monthly" className="text-white hover:bg-gray-800">
                    Monthly (Resets on the 1st)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Top 3 Reward */}
            <div className="space-y-2">
              <Label htmlFor="top3" className="text-white flex items-center gap-2">
                🥇 Top 3 Reward
              </Label>
              <Input
                id="top3"
                value={rewardTop3}
                onChange={(e) => setRewardTop3(e.target.value)}
                placeholder="e.g., MacBook Pro, $1000 Cash, Premium Lifetime Access"
                className="bg-[#0F0F0F] border-gray-700 text-white placeholder:text-gray-500"
              />
              <p className="text-xs text-gray-400">
                Reward for members ranked #1, #2, and #3 in the {timeframe} leaderboard
              </p>
            </div>

            {/* Top 5 Reward */}
            <div className="space-y-2">
              <Label htmlFor="top5" className="text-white flex items-center gap-2">
                🥈 Top 5 Reward
              </Label>
              <Input
                id="top5"
                value={rewardTop5}
                onChange={(e) => setRewardTop5(e.target.value)}
                placeholder="e.g., iPad Pro, $500 Gift Card, 1 Year Free"
                className="bg-[#0F0F0F] border-gray-700 text-white placeholder:text-gray-500"
              />
              <p className="text-xs text-gray-400">
                Reward for members ranked #4 and #5 (if not already in top 3)
              </p>
            </div>

            {/* Top 10 Reward */}
            <div className="space-y-2">
              <Label htmlFor="top10" className="text-white flex items-center gap-2">
                🥉 Top 10 Reward
              </Label>
              <Input
                id="top10"
                value={rewardTop10}
                onChange={(e) => setRewardTop10(e.target.value)}
                placeholder="e.g., AirPods, $100 Credit, 3 Months Free"
                className="bg-[#0F0F0F] border-gray-700 text-white placeholder:text-gray-500"
              />
              <p className="text-xs text-gray-400">
                Reward for members ranked #6 through #10 (if not already in top 5)
              </p>
            </div>
          </>
        )}

        {/* Save Button */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-800">
          <div>
            {saveSuccess && (
              <p className="text-sm text-green-500">✅ Settings saved successfully!</p>
            )}
            {error && (
              <p className="text-sm text-red-500">❌ {error}</p>
            )}
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            {isSaving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Custom Rewards
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}