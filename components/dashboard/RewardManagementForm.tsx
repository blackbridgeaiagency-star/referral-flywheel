'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Gift, Save, Trophy, Clock } from 'lucide-react';
import { Badge } from '../ui/badge';
import logger from '../../lib/logger';


interface RewardTier {
  count: number;
  reward: string;
}

interface RewardManagementFormProps {
  creatorId: string;
  initialTiers: {
    tier1: RewardTier;
    tier2: RewardTier;
    tier3: RewardTier;
    tier4: RewardTier;
  };
  autoApproveRewards: boolean;
  welcomeMessage?: string | null;
  customRewardEnabled: boolean;
  customRewardTimeframe: string | null;
  customRewardType: string | null;
  customReward1st: string | null;
  customReward2nd: string | null;
  customReward3rd: string | null;
  customReward4th: string | null;
  customReward5th: string | null;
  customReward6to10: string | null;
}

export function RewardManagementForm({
  creatorId,
  initialTiers,
  autoApproveRewards: initialAutoApprove,
  welcomeMessage: initialWelcomeMessage,
  customRewardEnabled: initialCustomEnabled,
  customRewardTimeframe: initialTimeframe,
  customRewardType: initialType,
  customReward1st: initial1st,
  customReward2nd: initial2nd,
  customReward3rd: initial3rd,
  customReward4th: initial4th,
  customReward5th: initial5th,
  customReward6to10: initial6to10,
}: RewardManagementFormProps) {
  const [tiers, setTiers] = useState(initialTiers);
  const [autoApprove, setAutoApprove] = useState(initialAutoApprove);
  const [welcomeMessage, setWelcomeMessage] = useState(initialWelcomeMessage || '');

  // Custom competition state - disabled by default
  const [customEnabled, setCustomEnabled] = useState(initialCustomEnabled ?? false);
  const [timeframe, setTimeframe] = useState(initialTimeframe || 'monthly');
  const [rewardType, setRewardType] = useState(initialType || 'top3');
  const [reward1st, setReward1st] = useState(initial1st || '');
  const [reward2nd, setReward2nd] = useState(initial2nd || '');
  const [reward3rd, setReward3rd] = useState(initial3rd || '');
  const [reward4th, setReward4th] = useState(initial4th || '');
  const [reward5th, setReward5th] = useState(initial5th || '');
  const [reward6to10, setReward6to10] = useState(initial6to10 || '');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [flashingField, setFlashingField] = useState<string | null>(null);

  const handleTierChange = (tierKey: keyof typeof tiers, field: 'count' | 'reward', value: string | number) => {
    if (field === 'count') {
      const numValue = Number(value);

      // Define constraints based on tier
      const constraints = {
        tier1: { min: 1, max: 10000 },
        tier2: { min: tiers.tier1.count + 1, max: 10000 },
        tier3: { min: tiers.tier2.count + 1, max: 10000 },
        tier4: { min: tiers.tier3.count + 1, max: 10000 },
      };

      const { min, max } = constraints[tierKey];

      // Check if value is out of bounds
      if (numValue < min || numValue > max || isNaN(numValue)) {
        // Flash red and revert to previous value
        setFlashingField(tierKey);
        setTimeout(() => setFlashingField(null), 500);
        return; // Don't update the state
      }

      // Clear validation errors when user makes valid changes
      setValidationErrors({});
    }

    const newTiers = {
      ...tiers,
      [tierKey]: {
        ...tiers[tierKey],
        [field]: field === 'count' ? Number(value) : value,
      },
    };

    setTiers(newTiers);
  };

  // Validate tier counts are in ascending order
  const validateTierCounts = (): boolean => {
    const errors: Record<string, string> = {};

    if (tiers.tier1.count >= tiers.tier2.count) {
      errors.tier2 = `Must be greater than Bronze (${tiers.tier1.count})`;
    }
    if (tiers.tier2.count >= tiers.tier3.count) {
      errors.tier3 = `Must be greater than Silver (${tiers.tier2.count})`;
    }
    if (tiers.tier3.count >= tiers.tier4.count) {
      errors.tier4 = `Must be greater than Gold (${tiers.tier3.count})`;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    // Validate tier counts first
    if (!validateTierCounts()) {
      setError('Please fix the tier count validation errors before saving');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      // Prepare data and ensure numbers are properly parsed
      const payload = {
        creatorId,
        tier1Count: Number(tiers.tier1.count),
        tier1Reward: tiers.tier1.reward || '',
        tier2Count: Number(tiers.tier2.count),
        tier2Reward: tiers.tier2.reward || '',
        tier3Count: Number(tiers.tier3.count),
        tier3Reward: tiers.tier3.reward || '',
        tier4Count: Number(tiers.tier4.count),
        tier4Reward: tiers.tier4.reward || '',
        autoApproveRewards: autoApprove,
        welcomeMessage: welcomeMessage || null,
      };

      logger.info(' Saving reward settings:', payload);

      // Save tier rewards
      const rewardsResponse = await fetch('/api/creator/rewards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const rewardsData = await rewardsResponse.json();

      if (!rewardsResponse.ok) {
        logger.error('❌ Reward settings validation failed:', rewardsData);
        const errorMessage = rewardsData.error || 'Failed to save reward settings';
        const errorDetails = rewardsData.details
          ? '\n' + rewardsData.details.map((d: any) => `• ${d.path.join('.')}: ${d.message}`).join('\n')
          : '';
        throw new Error(errorMessage + errorDetails);
      }

      // Save custom competition rewards
      const customResponse = await fetch('/api/creator/custom-rewards-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creatorId,
          customRewardEnabled: customEnabled,
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

      const customData = await customResponse.json();

      if (!customResponse.ok) {
        throw new Error(customData.error || 'Failed to save custom competition settings');
      }

      setSaveSuccess(true);
      logger.info('All reward settings saved successfully');

      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      logger.error('❌ Error saving reward settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <Card className="bg-gradient-to-br from-[#1A1A1A] to-[#151515] border-[#2A2A2A] shadow-2xl">
      <CardHeader className="border-b border-gray-800/50 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-3 text-2xl">
              <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30">
                <Gift className="w-6 h-6 text-purple-400" />
              </div>
              Reward Management
            </CardTitle>
            <CardDescription className="text-gray-400 mt-2">
              Configure milestone rewards, competitions, and program settings
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8 pt-6">
        {/* Reward Tiers Section */}
        <div className="space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-800/50">
            <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/30">
              <Gift className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-xl font-bold text-white">
              Milestone Rewards
            </h3>
          </div>
          <div className="space-y-4">
          {/* Tier 1 - Bronze */}
          <TierInput
            label="Bronze"
            tierName="Bronze Tier"
            tierKey="tier1"
            tier={tiers.tier1}
            onChange={handleTierChange}
            color="from-amber-700/10 to-amber-900/10"
            badgeColor="bg-amber-700/20"
            textColor="text-amber-300"
            minCount={1}
            maxCount={10000}
            isFlashing={flashingField === 'tier1'}
          />

          {/* Tier 2 - Silver */}
          <TierInput
            label="Silver"
            tierName="Silver Tier"
            tierKey="tier2"
            tier={tiers.tier2}
            onChange={handleTierChange}
            color="from-gray-400/10 to-gray-600/10"
            badgeColor="bg-gray-400/20"
            textColor="text-gray-300"
            error={validationErrors.tier2}
            minCount={tiers.tier1.count + 1}
            maxCount={10000}
            isFlashing={flashingField === 'tier2'}
          />

          {/* Tier 3 - Gold */}
          <TierInput
            label="Gold"
            tierName="Gold Tier"
            tierKey="tier3"
            tier={tiers.tier3}
            onChange={handleTierChange}
            color="from-yellow-500/10 to-yellow-600/10"
            badgeColor="bg-yellow-500/20"
            textColor="text-yellow-300"
            error={validationErrors.tier3}
            minCount={tiers.tier2.count + 1}
            maxCount={10000}
            isFlashing={flashingField === 'tier3'}
          />

          {/* Tier 4 - Platinum */}
          <TierInput
            label="Platinum"
            tierName="Platinum Tier"
            tierKey="tier4"
            tier={tiers.tier4}
            onChange={handleTierChange}
            color="from-purple-500/10 to-purple-600/10"
            badgeColor="bg-purple-500/20"
            textColor="text-purple-300"
            error={validationErrors.tier4}
            minCount={tiers.tier3.count + 1}
            maxCount={10000}
            isFlashing={flashingField === 'tier4'}
          />
          </div>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-8">
          <div className="border-t border-gray-800 flex-grow"></div>
          <div className="px-4 text-xs text-gray-500 font-medium">ADVANCED</div>
          <div className="border-t border-gray-800 flex-grow"></div>
        </div>

        {/* Custom Competition Rewards Section */}
        <div className="space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-800/50">
            <div className="p-2 rounded-lg bg-yellow-500/20 border border-yellow-500/30">
              <Trophy className="w-5 h-5 text-yellow-400" />
            </div>
            <h3 className="text-xl font-bold text-white">
              Competition Rewards
            </h3>
          </div>

          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-5 bg-gradient-to-r from-gray-900/80 to-gray-800/50 rounded-xl border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300">
            <div className="flex flex-col gap-1">
              <Label htmlFor="custom-rewards-enabled" className="text-white font-semibold cursor-pointer flex items-center gap-2">
                Enable Competition Mode
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold transition-all duration-300 ${
                  customEnabled
                    ? 'bg-green-600/20 text-green-400 border border-green-500/50'
                    : 'bg-gray-700/50 text-gray-400 border border-gray-600/50'
                }`}>
                  {customEnabled ? 'Active' : 'Disabled'}
                </span>
              </Label>
              <p className="text-xs text-gray-400">
                Run time-limited competitions with exclusive prizes for top performers
              </p>
            </div>
            <Switch
              id="custom-rewards-enabled"
              checked={customEnabled}
              onCheckedChange={setCustomEnabled}
              className="data-[state=checked]:bg-yellow-500"
            />
          </div>

          {customEnabled && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-500">
              {/* Competition Configuration - Horizontal Layout */}
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Timeframe Selection */}
                <div className="flex-1 space-y-2">
                  <Label className="text-white flex items-center gap-2 text-sm font-semibold">
                    <Clock className="w-4 h-4" />
                    Competition Period
                  </Label>
                  <Select value={timeframe} onValueChange={setTimeframe}>
                    <SelectTrigger className="bg-[#0F0F0F] border-gray-700 text-white h-11 hover:border-gray-600 transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1A1A] border-gray-700">
                      <SelectItem value="daily" className="text-white hover:bg-gray-800 cursor-pointer">
                        Daily (24 hours)
                      </SelectItem>
                      <SelectItem value="weekly" className="text-white hover:bg-gray-800 cursor-pointer">
                        Weekly (7 days)
                      </SelectItem>
                      <SelectItem value="monthly" className="text-white hover:bg-gray-800 cursor-pointer">
                        Monthly (30 days)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Competition Type Selection */}
                <div className="flex-1 space-y-2">
                  <Label className="text-white text-sm font-semibold flex items-center gap-2">
                    <Trophy className="w-4 h-4" />
                    Competition Size
                  </Label>
                  <Select value={rewardType} onValueChange={setRewardType}>
                    <SelectTrigger className="bg-[#0F0F0F] border-gray-700 text-white h-11 hover:border-gray-600 transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1A1A] border-gray-700">
                      <SelectItem value="top3" className="text-white hover:bg-gray-800 cursor-pointer">
                        Top 3 Winners
                      </SelectItem>
                      <SelectItem value="top5" className="text-white hover:bg-gray-800 cursor-pointer">
                        Top 5 Winners
                      </SelectItem>
                      <SelectItem value="top10" className="text-white hover:bg-gray-800 cursor-pointer">
                        Top 10 Winners
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Individual Prize Fields */}
              <div className="space-y-5 border-t border-gray-800/50 pt-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-yellow-500 to-amber-600 rounded-full"></div>
                  <h3 className="text-white font-bold text-lg">Individual Prize Settings</h3>
                </div>

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
                        placeholder="e.g., MacBook Pro M3, $5000 Cash"
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
                        placeholder="e.g., iPad Pro, $2000 Cash"
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
                        placeholder="e.g., AirPods Pro, $1000 Cash"
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
                            placeholder="e.g., Apple Watch, $500 Gift Card"
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
                            placeholder="e.g., Gaming Headset, $250 Credit"
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
                          placeholder="e.g., $100 Amazon Gift Card"
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
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-8">
          <div className="border-t border-gray-800 flex-grow"></div>
          <div className="px-4 text-xs text-gray-500 font-medium">PROGRAM SETTINGS</div>
          <div className="border-t border-gray-800 flex-grow"></div>
        </div>

        {/* Settings Section */}
        <div className="space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-800/50">
            <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white">
              Additional Settings
            </h3>
          </div>
          {/* Auto-Approve Toggle */}
          <div className="flex items-center justify-between p-5 bg-gradient-to-r from-gray-900/80 to-gray-800/50 rounded-xl border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300">
            <div>
              <label className="text-sm font-semibold text-white flex items-center gap-2">
                Auto-Approve Rewards
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  autoApprove
                    ? 'bg-purple-600/20 text-purple-400 border border-purple-500/50'
                    : 'bg-gray-700/50 text-gray-400 border border-gray-600/50'
                }`}>
                  {autoApprove ? 'Enabled' : 'Disabled'}
                </span>
              </label>
              <p className="text-xs text-gray-400 mt-1.5">
                Automatically grant rewards when members hit milestones
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoApprove}
                onChange={(e) => setAutoApprove(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          {/* Welcome Message */}
          <div className="p-5 bg-gradient-to-r from-gray-900/80 to-gray-800/50 rounded-xl border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300">
            <label className="text-sm font-semibold text-white block mb-3">
              Welcome Message (Optional)
            </label>
            <textarea
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="Enter a custom welcome message for new members..."
              className="w-full h-28 px-4 py-3 bg-[#0F0F0F] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none transition-all duration-300"
              maxLength={500}
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-500">
                Send a personalized message to new referral program members
              </p>
              <p className="text-xs text-gray-400 font-mono">
                {welcomeMessage.length}/500
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800/50 my-6"></div>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-2 pb-2">
          <div className="flex-1">
            {saveSuccess && (
              <div className="flex items-center gap-2 text-green-400 animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <p className="text-sm font-medium">All settings saved successfully!</p>
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 text-red-400 animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="px-10 py-6 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold shadow-xl hover:shadow-2xl hover:shadow-purple-900/50 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3" />
                <span className="text-base">Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-3" />
                <span className="text-base">Save All Changes</span>
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TierInput({
  label,
  tierName,
  tierKey,
  tier,
  onChange,
  color,
  badgeColor,
  textColor,
  error,
  minCount,
  maxCount,
  isFlashing,
}: {
  label: string;
  tierName: string;
  tierKey: 'tier1' | 'tier2' | 'tier3' | 'tier4';
  tier: RewardTier;
  onChange: (tierKey: 'tier1' | 'tier2' | 'tier3' | 'tier4', field: 'count' | 'reward', value: string | number) => void;
  color: string;
  badgeColor: string;
  textColor: string;
  error?: string;
  minCount: number;
  maxCount: number;
  isFlashing?: boolean;
}) {
  return (
    <div className={`p-5 rounded-xl bg-gradient-to-r ${color} ${error ? 'ring-2 ring-red-500' : ''} transition-all duration-300 border border-gray-700/30 hover:border-gray-600/50`}>
      <div className="flex items-center gap-3 mb-4">
        <Badge
          variant="outline"
          className={`${badgeColor} ${textColor} border-none px-3 py-1.5 text-sm font-bold shadow-lg`}
        >
          {label}
        </Badge>
        <label className="text-sm font-medium text-gray-300">{tierName}</label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-gray-400 block mb-2">
            Referrals Required (Min: {minCount}, Max: {maxCount})
          </label>
          <input
            type="number"
            value={tier.count}
            onChange={(e) => onChange(tierKey, 'count', e.target.value)}
            min={minCount}
            max={maxCount}
            className={`w-full px-3 py-2.5 bg-gray-900/50 border rounded-lg text-white focus:outline-none focus:ring-2 transition-all duration-300 ${
              isFlashing
                ? 'border-red-500 bg-red-900/30 animate-pulse'
                : error
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-800 focus:ring-purple-500'
            }`}
          />
          {error && (
            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
              <span>⚠️</span>
              {error}
            </p>
          )}
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-2">Reward</label>
          <input
            type="text"
            value={tier.reward}
            onChange={(e) => onChange(tierKey, 'reward', e.target.value)}
            placeholder="e.g., 1 month free"
            maxLength={100}
            className="w-full px-3 py-2.5 bg-gray-900/50 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>
    </div>
  );
}
