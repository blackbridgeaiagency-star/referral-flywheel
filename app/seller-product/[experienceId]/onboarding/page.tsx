// app/seller-product/[experienceId]/onboarding/page.tsx
/**
 * Creator Onboarding Wizard
 *
 * Guides new creators through setting up their referral program
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Check, ArrowRight, Trophy, DollarSign, MessageSquare, Rocket } from 'lucide-react';

interface OnboardingData {
  companyName: string;
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

export default function CreatorOnboardingPage({
  params
}: {
  params: { experienceId: string }
}) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [data, setData] = useState<OnboardingData>({
    companyName: '',
    welcomeMessage: `Welcome to {creatorName}!

You now have a unique referral link that pays you 10% LIFETIME commission on every person you refer!

Your link: {referralLink}

Share your link with friends and followers. Every time they pay, you earn 10% - forever!

Start sharing and earning today!`,
    tier1Count: 5,
    tier1Reward: 'Bronze Badge + Shoutout',
    tier2Count: 10,
    tier2Reward: 'Silver Badge + Exclusive Content',
    tier3Count: 25,
    tier3Reward: 'Gold Badge + 1-on-1 Call',
    tier4Count: 50,
    tier4Reward: 'Diamond Badge + Lifetime VIP Access',
  });

  const updateData = (field: keyof OnboardingData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      // Update creator with onboarding data
      const response = await fetch(`/api/creator/${params.experienceId}/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        // Redirect to dashboard
        router.push(`/seller-product/${params.experienceId}`);
      } else {
        alert('Failed to save settings. Please try again.');
      }
    } catch (error) {
      console.error('Onboarding error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-black p-4">
      <div className="max-w-4xl mx-auto py-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-2xl font-bold text-white">Welcome to Referral Flywheel!</h1>
            <span className="text-sm text-gray-400">Step {currentStep} of 4</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Welcome */}
        {currentStep === 1 && (
          <Card className="bg-black/50 backdrop-blur-lg border-purple-800">
            <CardHeader>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-purple-900/50 rounded-lg">
                  <Rocket className="w-8 h-8 text-purple-400" />
                </div>
              </div>
              <CardTitle className="text-3xl text-white">Turn Your Community Into a Growth Engine</CardTitle>
              <CardDescription className="text-gray-400 text-lg mt-4">
                Every member becomes an automatic affiliate earning 10% lifetime commissions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-purple-900/20 p-6 rounded-xl">
                <h3 className="text-xl font-bold text-white mb-4">How It Works:</h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Every member gets a unique referral code automatically</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>They earn 10% on every payment from their referrals - forever</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>You keep 70% of all revenue (20% goes to platform)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Track everything with real-time dashboards</span>
                  </li>
                </ul>
              </div>

              <div className="bg-pink-900/20 p-6 rounded-xl">
                <h3 className="text-xl font-bold text-white mb-4">Revenue Split:</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-300">
                    <span>Member Commission:</span>
                    <span className="font-bold text-green-400">10%</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Your Revenue:</span>
                    <span className="font-bold text-purple-400">70%</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Platform Fee:</span>
                    <span className="font-bold text-gray-400">20%</span>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => setCurrentStep(2)}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                Get Started <ArrowRight className="ml-2" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 2: Basic Info */}
        {currentStep === 2 && (
          <Card className="bg-black/50 backdrop-blur-lg border-purple-800">
            <CardHeader>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-purple-900/50 rounded-lg">
                  <DollarSign className="w-8 h-8 text-purple-400" />
                </div>
              </div>
              <CardTitle className="text-2xl text-white">Community Details</CardTitle>
              <CardDescription className="text-gray-400">
                Tell us about your community
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="companyName" className="text-white">Community Name</Label>
                <Input
                  id="companyName"
                  value={data.companyName}
                  onChange={(e) => updateData('companyName', e.target.value)}
                  placeholder="e.g., Alpha Trading Academy"
                  className="bg-gray-900 border-gray-700 text-white"
                />
                <p className="text-sm text-gray-500 mt-1">
                  This will be shown to your members
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(1)}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={() => setCurrentStep(3)}
                disabled={!data.companyName}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                Continue <ArrowRight className="ml-2" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 3: Rewards */}
        {currentStep === 3 && (
          <Card className="bg-black/50 backdrop-blur-lg border-purple-800">
            <CardHeader>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-purple-900/50 rounded-lg">
                  <Trophy className="w-8 h-8 text-purple-400" />
                </div>
              </div>
              <CardTitle className="text-2xl text-white">Set Up Leaderboard Rewards</CardTitle>
              <CardDescription className="text-gray-400">
                Motivate members with rewards for top performers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Tier 1 - Bronze</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      type="number"
                      value={data.tier1Count}
                      onChange={(e) => updateData('tier1Count', parseInt(e.target.value))}
                      className="w-20 bg-gray-900 border-gray-700 text-white"
                    />
                    <Input
                      value={data.tier1Reward}
                      onChange={(e) => updateData('tier1Reward', e.target.value)}
                      placeholder="Reward"
                      className="flex-1 bg-gray-900 border-gray-700 text-white"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-white">Tier 2 - Silver</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      type="number"
                      value={data.tier2Count}
                      onChange={(e) => updateData('tier2Count', parseInt(e.target.value))}
                      className="w-20 bg-gray-900 border-gray-700 text-white"
                    />
                    <Input
                      value={data.tier2Reward}
                      onChange={(e) => updateData('tier2Reward', e.target.value)}
                      placeholder="Reward"
                      className="flex-1 bg-gray-900 border-gray-700 text-white"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-white">Tier 3 - Gold</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      type="number"
                      value={data.tier3Count}
                      onChange={(e) => updateData('tier3Count', parseInt(e.target.value))}
                      className="w-20 bg-gray-900 border-gray-700 text-white"
                    />
                    <Input
                      value={data.tier3Reward}
                      onChange={(e) => updateData('tier3Reward', e.target.value)}
                      placeholder="Reward"
                      className="flex-1 bg-gray-900 border-gray-700 text-white"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-white">Tier 4 - Diamond</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      type="number"
                      value={data.tier4Count}
                      onChange={(e) => updateData('tier4Count', parseInt(e.target.value))}
                      className="w-20 bg-gray-900 border-gray-700 text-white"
                    />
                    <Input
                      value={data.tier4Reward}
                      onChange={(e) => updateData('tier4Reward', e.target.value)}
                      placeholder="Reward"
                      className="flex-1 bg-gray-900 border-gray-700 text-white"
                    />
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-500">
                Members will see these rewards on the leaderboard. Make them exciting!
              </p>
            </CardContent>
            <CardFooter className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(2)}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={() => setCurrentStep(4)}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                Continue <ArrowRight className="ml-2" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 4: Welcome Message */}
        {currentStep === 4 && (
          <Card className="bg-black/50 backdrop-blur-lg border-purple-800">
            <CardHeader>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-purple-900/50 rounded-lg">
                  <MessageSquare className="w-8 h-8 text-purple-400" />
                </div>
              </div>
              <CardTitle className="text-2xl text-white">Customize Welcome Message</CardTitle>
              <CardDescription className="text-gray-400">
                This message is sent to new members with their referral code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="welcomeMessage" className="text-white">Welcome Message</Label>
                <Textarea
                  id="welcomeMessage"
                  value={data.welcomeMessage}
                  onChange={(e) => updateData('welcomeMessage', e.target.value)}
                  rows={10}
                  className="bg-gray-900 border-gray-700 text-white font-mono"
                />
                <div className="text-sm text-gray-500 mt-2">
                  <p className="font-bold mb-1">Available variables:</p>
                  <code className="text-purple-400">{'{memberName}'}</code> - Member's name<br />
                  <code className="text-purple-400">{'{creatorName}'}</code> - Your community name<br />
                  <code className="text-purple-400">{'{referralLink}'}</code> - Member's unique referral link
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(3)}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleComplete}
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
              >
                {isLoading ? 'Setting up...' : 'Complete Setup'}
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}