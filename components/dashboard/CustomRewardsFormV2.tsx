'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Trophy, Clock, Save } from 'lucide-react';

interface CustomRewardsFormProps {
  creatorId: string;
  initialData: {
    customRewardEnabled: boolean;
    customRewardTimeframe: string | null;
    customRewardType: string | null;
    customReward1st: string | null;
    customReward2nd: string | null;
    customReward3rd: string | null;
    customReward4th: string | null;
    customReward5th: string | null;
    customReward6to10: string | null;
  };
}

export function CustomRewardsFormV2({ creatorId, initialData }: CustomRewardsFormProps) {
  const [enabled, setEnabled] = useState(initialData.customRewardEnabled);
  const [timeframe, setTimeframe] = useState(initialData.customRewardTimeframe || 'monthly');
  const [rewardType, setRewardType] = useState(initialData.customRewardType || 'top3');
  const [reward1st, setReward1st] = useState(initialData.customReward1st || '');
  const [reward2nd, setReward2nd] = useState(initialData.customReward2nd || '');
  const [reward3rd, setReward3rd] = useState(initialData.customReward3rd || '');
  const [reward4th, setReward4th] = useState(initialData.customReward4th || '');
  const [reward5th, setReward5th] = useState(initialData.customReward5th || '');
  const [reward6to10, setReward6to10] = useState(initialData.customReward6to10 || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const response = await fetch('/api/creator/custom-rewards-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creatorId,
          customRewardEnabled: enabled,
          customRewardTimeframe: timeframe,
          customRewardType: rewardType,
          customReward1st: reward1st || null,
          customReward2nd: reward2nd || null,
          customReward3rd: reward3rd || null,
          customReward4th: reward4th || null,
          customReward5th: reward5th || null,
          customReward6to10: reward6to10 || null,
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
          Set time-based competitions with individual prizes for top performers
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
            {/* Competition Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      Daily (24 hours)
                    </SelectItem>
                    <SelectItem value="weekly" className="text-white hover:bg-gray-800">
                      Weekly (7 days)
                    </SelectItem>
                    <SelectItem value="monthly" className="text-white hover:bg-gray-800">
                      Monthly (30 days)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Competition Type Selection */}
              <div className="space-y-2">
                <Label className="text-white">Competition Size</Label>
                <Select value={rewardType} onValueChange={setRewardType}>
                  <SelectTrigger className="bg-[#0F0F0F] border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1A1A] border-gray-700">
                    <SelectItem value="top3" className="text-white hover:bg-gray-800">
                      Top 3 Winners
                    </SelectItem>
                    <SelectItem value="top5" className="text-white hover:bg-gray-800">
                      Top 5 Winners
                    </SelectItem>
                    <SelectItem value="top10" className="text-white hover:bg-gray-800">
                      Top 10 Winners
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Individual Prize Fields */}
            <div className="space-y-4 border-t border-gray-800 pt-4">
              <h3 className="text-white font-semibold">Individual Prize Settings</h3>

              {/* Always show 1st, 2nd, 3rd */}
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <span className="text-xl">🥇</span>
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="1st" className="text-white mb-1 block">1st Place Prize</Label>
                    <Input
                      id="1st"
                      value={reward1st}
                      onChange={(e) => setReward1st(e.target.value)}
                      placeholder="e.g., MacBook Pro M3, $5000 Cash, Premium Lifetime"
                      className="bg-[#0F0F0F] border-gray-700 text-white placeholder:text-gray-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gray-400/20 flex items-center justify-center">
                    <span className="text-xl">🥈</span>
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="2nd" className="text-white mb-1 block">2nd Place Prize</Label>
                    <Input
                      id="2nd"
                      value={reward2nd}
                      onChange={(e) => setReward2nd(e.target.value)}
                      placeholder="e.g., iPad Pro, $2000 Cash, 1 Year Free"
                      className="bg-[#0F0F0F] border-gray-700 text-white placeholder:text-gray-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-amber-600/20 flex items-center justify-center">
                    <span className="text-xl">🥉</span>
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="3rd" className="text-white mb-1 block">3rd Place Prize</Label>
                    <Input
                      id="3rd"
                      value={reward3rd}
                      onChange={(e) => setReward3rd(e.target.value)}
                      placeholder="e.g., AirPods Pro, $1000 Cash, 6 Months Free"
                      className="bg-[#0F0F0F] border-gray-700 text-white placeholder:text-gray-500"
                    />
                  </div>
                </div>

                {/* Show 4th and 5th if top5 or top10 selected */}
                {(rewardType === 'top5' || rewardType === 'top10') && (
                  <>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <span className="text-lg font-bold text-purple-400">4th</span>
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="4th" className="text-white mb-1 block">4th Place Prize</Label>
                        <Input
                          id="4th"
                          value={reward4th}
                          onChange={(e) => setReward4th(e.target.value)}
                          placeholder="e.g., Apple Watch, $500 Gift Card, 3 Months Free"
                          className="bg-[#0F0F0F] border-gray-700 text-white placeholder:text-gray-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <span className="text-lg font-bold text-blue-400">5th</span>
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="5th" className="text-white mb-1 block">5th Place Prize</Label>
                        <Input
                          id="5th"
                          value={reward5th}
                          onChange={(e) => setReward5th(e.target.value)}
                          placeholder="e.g., Gaming Headset, $250 Credit, 2 Months Free"
                          className="bg-[#0F0F0F] border-gray-700 text-white placeholder:text-gray-500"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Show 6th-10th if top10 selected */}
                {rewardType === 'top10' && (
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-green-400">6-10</span>
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="6to10" className="text-white mb-1 block">6th-10th Place Prize</Label>
                      <Input
                        id="6to10"
                        value={reward6to10}
                        onChange={(e) => setReward6to10(e.target.value)}
                        placeholder="e.g., $100 Amazon Gift Card, 1 Month Free, Exclusive Badge"
                        className="bg-[#0F0F0F] border-gray-700 text-white placeholder:text-gray-500"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Same prize for all members ranked 6th through 10th
                      </p>
                    </div>
                  </div>
                )}
              </div>
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
                Save Competition Settings
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}