'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { formatCurrency } from '../../lib/utils/commission';
import {
  Search,
  Award,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle,
  User,
  TrendingUp,
  Info,
} from 'lucide-react';

interface CustomRateManagerProps {
  creatorId: string;
  companyId: string;
}

interface MemberWithCustomRate {
  id: string;
  username: string;
  referralCode: string;
  customRate: number;
  setAt: string;
  reason: string | null;
  totalReferred: number;
  lifetimeEarnings: number;
}

interface SearchResult {
  id: string;
  username: string;
  referralCode: string;
  totalReferred: number;
  lifetimeEarnings: number;
  currentRate: number;
  rateSource: 'custom' | 'tier';
  tierName?: string;
}

const RATE_PRESETS = [
  { rate: 0.10, label: '10%', description: 'Standard Starter rate' },
  { rate: 0.15, label: '15%', description: 'Ambassador rate' },
  { rate: 0.18, label: '18%', description: 'Elite rate' },
  { rate: 0.20, label: '20%', description: 'VIP rate' },
  { rate: 0.25, label: '25%', description: 'Super VIP rate' },
  { rate: 0.30, label: '30%', description: 'Max custom rate' },
];

export function CustomRateManager({ creatorId, companyId }: CustomRateManagerProps) {
  // State
  const [membersWithCustomRates, setMembersWithCustomRates] = useState<MemberWithCustomRate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedMember, setSelectedMember] = useState<SearchResult | null>(null);
  const [customRate, setCustomRate] = useState(0.15);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch members with custom rates
  const fetchCustomRates = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/creator/custom-rates?companyId=${companyId}`
      );
      if (!response.ok) throw new Error('Failed to fetch custom rates');
      const data = await response.json();
      setMembersWithCustomRates(data.members || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchCustomRates();
  }, [fetchCustomRates]);

  // Search members
  const searchMembers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const response = await fetch(
        `/api/creator/custom-rates/search?companyId=${companyId}&q=${encodeURIComponent(searchQuery)}`
      );
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      setSearchResults(data.members || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  // Set custom rate
  const handleSetCustomRate = async () => {
    if (!selectedMember) return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/creator/custom-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          memberId: selectedMember.id,
          rate: customRate,
          reason: reason || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to set custom rate');
      }

      setSuccess(`Custom rate of ${(customRate * 100).toFixed(0)}% set for ${selectedMember.username}`);
      setSelectedMember(null);
      setSearchQuery('');
      setSearchResults([]);
      setReason('');
      setCustomRate(0.15);
      fetchCustomRates();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set rate');
    } finally {
      setSaving(false);
    }
  };

  // Remove custom rate
  const handleRemoveCustomRate = async (memberId: string, username: string) => {
    if (!confirm(`Remove custom rate for ${username}? They will revert to tier-based commission.`)) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/creator/custom-rates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          memberId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove custom rate');
      }

      setSuccess(`Custom rate removed for ${username}`);
      fetchCustomRates();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove rate');
    } finally {
      setSaving(false);
    }
  };

  // Select member from search
  const selectMember = (member: SearchResult) => {
    setSelectedMember(member);
    setSearchResults([]);
    setSearchQuery('');
    // Start with their current rate or a reasonable default
    setCustomRate(member.currentRate || 0.15);
  };

  return (
    <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
      <CardHeader className="pb-2">
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <Award className="w-4 h-4 text-yellow-400" />
          VIP Affiliate Rates
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {/* Alerts */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto hover:text-red-300">
              x
            </button>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{success}</span>
          </div>
        )}

        {/* Search Section */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-300">
            Search Affiliate
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchMembers()}
                placeholder="Search by username or referral code..."
                className="w-full pl-10 pr-4 py-2 bg-[#0F0F0F] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              />
            </div>
            <Button
              onClick={searchMembers}
              disabled={searching || !searchQuery.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </Button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="border border-gray-700 rounded-lg overflow-hidden">
              {searchResults.map((member) => (
                <button
                  key={member.id}
                  onClick={() => selectMember(member)}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-800 transition-colors text-left border-b border-gray-700 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <User className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{member.username}</p>
                      <p className="text-gray-500 text-xs">{member.referralCode}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-300 text-sm">
                      {member.totalReferred} referrals
                    </p>
                    <p className="text-gray-500 text-xs">
                      {member.rateSource === 'custom' ? 'Custom' : member.tierName} ({(member.currentRate * 100).toFixed(0)}%)
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Member & Rate Configuration */}
        {selectedMember && (
          <div className="p-4 bg-[#0F0F0F] border border-purple-500/30 rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-white font-medium">{selectedMember.username}</p>
                  <p className="text-gray-500 text-sm">
                    {selectedMember.totalReferred} referrals | {formatCurrency(selectedMember.lifetimeEarnings)} earned
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMember(null)}
                className="text-gray-500 hover:text-white"
              >
                x
              </button>
            </div>

            {/* Rate Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">
                  Custom Commission Rate
                </label>
                <span className="text-2xl font-bold text-purple-400">
                  {(customRate * 100).toFixed(0)}%
                </span>
              </div>

              <Slider
                value={[customRate * 100]}
                onValueChange={(value) => setCustomRate(value[0] / 100)}
                min={10}
                max={30}
                step={1}
                className="py-4"
              />

              {/* Preset Buttons */}
              <div className="flex flex-wrap gap-2">
                {RATE_PRESETS.map((preset) => (
                  <button
                    key={preset.rate}
                    onClick={() => setCustomRate(preset.rate)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                      customRate === preset.rate
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                    title={preset.description}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Earnings Preview */}
            <div className="p-3 bg-gray-800/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-sm text-gray-400">Earnings Preview (on $100 sale)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-sm">
                  Current ({selectedMember.rateSource === 'custom' ? 'Custom' : selectedMember.tierName}):
                </span>
                <span className="text-gray-300">
                  ${(100 * selectedMember.currentRate).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-purple-400 text-sm font-medium">New Custom Rate:</span>
                <span className="text-purple-400 font-bold">
                  ${(100 * customRate).toFixed(2)}
                </span>
              </div>
              {customRate !== selectedMember.currentRate && (
                <div className="flex items-center justify-between mt-1 pt-1 border-t border-gray-700">
                  <span className="text-gray-500 text-xs">Difference:</span>
                  <span className={customRate > selectedMember.currentRate ? 'text-green-400' : 'text-red-400'}>
                    {customRate > selectedMember.currentRate ? '+' : ''}
                    ${((100 * customRate) - (100 * selectedMember.currentRate)).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Reason Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Reason (optional)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Top performer Q4 2024, VIP partner..."
                className="w-full px-4 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              />
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSetCustomRate}
              disabled={saving || customRate === selectedMember.currentRate}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Award className="w-4 h-4 mr-2" />
                  Set Custom Rate
                </>
              )}
            </Button>
          </div>
        )}

        {/* Current Custom Rates List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-300">
              Affiliates with Custom Rates
            </h3>
            <span className="text-xs text-gray-500">
              {membersWithCustomRates.length} total
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            </div>
          ) : membersWithCustomRates.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-gray-700 rounded-lg">
              <Info className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">
                No custom rates set yet. Search for an affiliate above to set their custom rate.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {membersWithCustomRates.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-[#0F0F0F] border border-gray-700 rounded-lg hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                      <Award className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{member.username}</p>
                      <p className="text-gray-500 text-xs">
                        {member.totalReferred} referrals | {formatCurrency(member.lifetimeEarnings)} earned
                      </p>
                      {member.reason && (
                        <p className="text-purple-400 text-xs mt-0.5">
                          "{member.reason}"
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xl font-bold text-yellow-400">
                        {(member.customRate * 100).toFixed(0)}%
                      </p>
                      <p className="text-gray-500 text-xs">
                        Custom rate
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveCustomRate(member.id, member.username)}
                      disabled={saving}
                      className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Remove custom rate"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Box - Compact */}
        <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-3 h-3 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-gray-400">
              <span className="text-blue-400">Custom rates (10-30%)</span> come from your 70% share. Platform keeps 20%. Example: 20% rate = affiliate 20%, you 60%, platform 20%.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
