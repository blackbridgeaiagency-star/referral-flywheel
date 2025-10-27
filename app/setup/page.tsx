'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowRight, ArrowLeft, Sparkles, Trophy, Users, MessageSquare } from 'lucide-react';

interface SetupState {
  welcomeMessage: string;
  tier1Count: number;
  tier1Reward: string;
  tier2Count: number;
  tier2Reward: string;
  tier3Count: number;
  tier3Reward: string;
  tier4Count: number;
  tier4Reward: string;
}

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [setupData, setSetupData] = useState<SetupState>({
    welcomeMessage: "Welcome to our community! 🎉 You now have access to exclusive content AND the opportunity to earn 10% lifetime commissions by referring friends. Check your dashboard to get your unique referral link!",
    tier1Count: 5,
    tier1Reward: "Exclusive Discord role + shoutout",
    tier2Count: 10,
    tier2Reward: "$50 bonus + premium content access",
    tier3Count: 25,
    tier3Reward: "$150 bonus + 1-on-1 coaching call",
    tier4Count: 100,
    tier4Reward: "$500 bonus + lifetime VIP status"
  });

  const updateField = (field: keyof SetupState, value: string | number) => {
    setSetupData(prev => ({ ...prev, [field]: value }));
  };

  const completeSetup = async () => {
    setIsLoading(true);
    try {
      // Get productId from URL params or local storage
      const params = new URLSearchParams(window.location.search);
      const productId = params.get('productId') || localStorage.getItem('whop_product_id');

      if (!productId) {
        alert('Error: No product ID found. Please install the app from Whop.');
        return;
      }

      const response = await fetch('/api/setup/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          ...setupData
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Store completion flag
        localStorage.setItem('setup_complete', 'true');
        // Redirect to creator dashboard
        router.push(`/seller-product/${productId}`);
      } else {
        const error = await response.json();
        alert(`Setup failed: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Setup error:', error);
      alert('Setup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-600/20 border-2 border-purple-600 mb-4">
                <MessageSquare className="w-8 h-8 text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Welcome Message</h2>
              <p className="text-gray-400">
                This message will be sent to all members when they join your community
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Welcome Message
              </label>
              <textarea
                value={setupData.welcomeMessage}
                onChange={(e) => updateField('welcomeMessage', e.target.value)}
                rows={6}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-600"
                placeholder="Enter your welcome message..."
              />
              <p className="text-xs text-gray-500 mt-2">
                Tip: Mention the referral program to encourage members to share their links!
              </p>
            </div>

            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
              <p className="text-xs font-medium text-gray-400 mb-2">PREVIEW</p>
              <p className="text-sm text-white">{setupData.welcomeMessage}</p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-600/20 border-2 border-purple-600 mb-4">
                <Trophy className="w-8 h-8 text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Reward Milestones</h2>
              <p className="text-gray-400">
                Set up rewards to motivate members to refer more friends
              </p>
            </div>

            <div className="space-y-4">
              {/* Tier 1 */}
              <Card className="bg-gray-900 border-gray-700 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Badge className="bg-blue-600 text-white">Tier 1</Badge>
                  <span className="text-white font-medium">First milestone</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Referrals needed</label>
                    <Input
                      type="number"
                      value={setupData.tier1Count}
                      onChange={(e) => updateField('tier1Count', parseInt(e.target.value))}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Reward</label>
                    <Input
                      value={setupData.tier1Reward}
                      onChange={(e) => updateField('tier1Reward', e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white"
                      placeholder="e.g., Discord role"
                    />
                  </div>
                </div>
              </Card>

              {/* Tier 2 */}
              <Card className="bg-gray-900 border-gray-700 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Badge className="bg-green-600 text-white">Tier 2</Badge>
                  <span className="text-white font-medium">Growing momentum</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Referrals needed</label>
                    <Input
                      type="number"
                      value={setupData.tier2Count}
                      onChange={(e) => updateField('tier2Count', parseInt(e.target.value))}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Reward</label>
                    <Input
                      value={setupData.tier2Reward}
                      onChange={(e) => updateField('tier2Reward', e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white"
                      placeholder="e.g., $50 bonus"
                    />
                  </div>
                </div>
              </Card>

              {/* Tier 3 */}
              <Card className="bg-gray-900 border-gray-700 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Badge className="bg-yellow-600 text-white">Tier 3</Badge>
                  <span className="text-white font-medium">Power referrer</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Referrals needed</label>
                    <Input
                      type="number"
                      value={setupData.tier3Count}
                      onChange={(e) => updateField('tier3Count', parseInt(e.target.value))}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Reward</label>
                    <Input
                      value={setupData.tier3Reward}
                      onChange={(e) => updateField('tier3Reward', e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white"
                      placeholder="e.g., $150 + coaching"
                    />
                  </div>
                </div>
              </Card>

              {/* Tier 4 */}
              <Card className="bg-gray-900 border-gray-700 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Badge className="bg-purple-600 text-white">Tier 4</Badge>
                  <span className="text-white font-medium">Elite ambassador</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Referrals needed</label>
                    <Input
                      type="number"
                      value={setupData.tier4Count}
                      onChange={(e) => updateField('tier4Count', parseInt(e.target.value))}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Reward</label>
                    <Input
                      value={setupData.tier4Reward}
                      onChange={(e) => updateField('tier4Reward', e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white"
                      placeholder="e.g., $500 + VIP status"
                    />
                  </div>
                </div>
              </Card>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-600/20 border-2 border-green-600 mb-4">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Review & Launch</h2>
              <p className="text-gray-400">
                Your referral program is ready! Review and launch when ready.
              </p>
            </div>

            <Card className="bg-gray-900 border-gray-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                What happens next?
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Automatic Member Import</p>
                    <p className="text-sm text-gray-400">
                      All existing members will be imported and receive referral codes
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Welcome Messages Sent</p>
                    <p className="text-sm text-gray-400">
                      Members will receive your custom welcome message
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Commission Tracking Begins</p>
                    <p className="text-sm text-gray-400">
                      10% lifetime commissions will be tracked automatically
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Dashboard Access</p>
                    <p className="text-sm text-gray-400">
                      View analytics, top performers, and manage rewards
                    </p>
                  </div>
                </li>
              </ul>
            </Card>

            <Card className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border-purple-600/30 p-6">
              <div className="flex items-start gap-3">
                <Sparkles className="w-6 h-6 text-purple-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-bold mb-2">Pro Tip</h3>
                  <p className="text-sm text-gray-300">
                    Announce your referral program in your community! Post a message explaining that members can now earn 10% lifetime commissions by sharing your community with friends. The more you promote it, the more referrals you'll see.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Referral Flywheel
            </span>
          </h1>
          <p className="text-lg text-gray-400">Turn your community into a growth engine</p>
        </div>

        {/* Progress indicator */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex items-center ${s < 3 ? 'flex-1' : ''}`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    s < step
                      ? 'bg-green-600 text-white'
                      : s === step
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {s < step ? <Check className="w-5 h-5" /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      s < step ? 'bg-green-600' : 'bg-gray-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className={step === 1 ? 'text-purple-400 font-medium' : ''}>Welcome</span>
            <span className={step === 2 ? 'text-purple-400 font-medium' : ''}>Rewards</span>
            <span className={step === 3 ? 'text-purple-400 font-medium' : ''}>Review</span>
          </div>
        </div>

        {/* Step content */}
        <div className="mb-8">
          {renderStep()}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1 || isLoading}
            className={`${
              step === 1
                ? 'border-gray-800 text-gray-600 cursor-not-allowed'
                : 'border-purple-500/50 hover:bg-purple-600/10 hover:border-purple-500 text-white font-medium'
            }`}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
              disabled={isLoading}
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={completeSetup}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white font-bold"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Launching...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Launch Referral Program
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
