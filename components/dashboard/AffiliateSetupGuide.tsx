'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, ExternalLink, Gift, Users, TrendingUp, ChevronRight, Info } from 'lucide-react';

interface AffiliateSetupGuideProps {
  creatorId: string;
  companyName: string;
  productId?: string;
  onComplete?: () => void;
}

/**
 * Step-by-step guide to help creators set up their 10% affiliate rate in Whop.
 * Shows on creator onboarding page.
 */
export function AffiliateSetupGuide({
  creatorId,
  companyName,
  productId,
  onComplete,
}: AffiliateSetupGuideProps) {
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [expanded, setExpanded] = useState(true);

  const steps = [
    {
      id: 1,
      title: 'Open Whop Affiliate Settings',
      description: 'Go to your Whop dashboard and find the Affiliates section',
      action: {
        label: 'Open Whop Dashboard',
        url: 'https://whop.com/dashboard/affiliates',
      },
    },
    {
      id: 2,
      title: 'Set Member Affiliate Rate to 10%',
      description: 'Under "Member affiliate rate", set the percentage to 10%. This is the commission your members earn for referrals.',
      tip: 'All your community members will automatically become affiliates and earn 10% on every referral!',
    },
    {
      id: 3,
      title: 'Enable Affiliate Tracking',
      description: 'Make sure affiliate tracking is enabled for your products',
      tip: 'This ensures we can attribute sales to the correct referrer.',
    },
    {
      id: 4,
      title: 'Done! Your flywheel is ready',
      description: 'Every member now has a unique referral link and earns 10% lifetime recurring commissions.',
    },
  ];

  const toggleStep = (stepId: number) => {
    if (completedSteps.includes(stepId)) {
      setCompletedSteps(prev => prev.filter(id => id !== stepId));
    } else {
      setCompletedSteps(prev => [...prev, stepId]);
    }
  };

  const allStepsCompleted = completedSteps.length === steps.length;

  return (
    <Card className="bg-[#1A1A1A] border-[#2A2A2A] overflow-hidden">
      {/* Header with gradient */}
      <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-400" />

      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Gift className="w-5 h-5 text-green-400" />
              Set Up Your Referral Program
            </CardTitle>
            <p className="text-gray-400 text-sm mt-1">
              Configure Whop to pay your members 10% commission on referrals
            </p>
          </div>
          {allStepsCompleted ? (
            <Badge className="bg-green-500/20 text-green-400">
              <Check className="w-3 h-3 mr-1" /> Complete
            </Badge>
          ) : (
            <Badge className="bg-yellow-500/20 text-yellow-400">
              {completedSteps.length}/{steps.length} steps
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Value proposition */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-lg p-4 text-center border border-green-500/20">
            <Users className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-white font-semibold">Every Member</p>
            <p className="text-gray-400 text-xs">becomes an affiliate</p>
          </div>
          <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 rounded-lg p-4 text-center border border-blue-500/20">
            <TrendingUp className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <p className="text-white font-semibold">10% Lifetime</p>
            <p className="text-gray-400 text-xs">recurring commission</p>
          </div>
          <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-lg p-4 text-center border border-purple-500/20">
            <Gift className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <p className="text-white font-semibold">Auto Payouts</p>
            <p className="text-gray-400 text-xs">handled by Whop</p>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.includes(step.id);
            const isLast = index === steps.length - 1;

            return (
              <div
                key={step.id}
                className={`
                  rounded-lg border transition-all
                  ${isCompleted
                    ? 'bg-green-900/20 border-green-500/30'
                    : 'bg-gray-800/50 border-gray-700'
                  }
                `}
              >
                <div
                  className="p-4 cursor-pointer flex items-start gap-3"
                  onClick={() => toggleStep(step.id)}
                >
                  {/* Step number / check */}
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                    ${isCompleted
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-700 text-gray-400'
                    }
                  `}>
                    {isCompleted ? <Check className="w-4 h-4" /> : step.id}
                  </div>

                  <div className="flex-1">
                    <p className={`font-medium ${isCompleted ? 'text-green-400' : 'text-white'}`}>
                      {step.title}
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      {step.description}
                    </p>

                    {step.tip && (
                      <div className="flex items-start gap-2 mt-2 text-xs text-blue-400 bg-blue-900/20 rounded p-2">
                        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        {step.tip}
                      </div>
                    )}

                    {step.action && (
                      <Button
                        size="sm"
                        className="mt-3 bg-blue-600 hover:bg-blue-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(step.action.url, '_blank');
                        }}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        {step.action.label}
                      </Button>
                    )}
                  </div>

                  <ChevronRight className={`w-5 h-5 text-gray-500 transition-transform ${isCompleted ? 'rotate-90' : ''}`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Complete button */}
        {allStepsCompleted && onComplete && (
          <Button
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold"
            onClick={onComplete}
          >
            <Check className="w-4 h-4 mr-2" />
            Complete Setup
          </Button>
        )}

        {/* Help text */}
        <p className="text-xs text-gray-500 text-center">
          Need help? Check out the{' '}
          <a href="https://docs.whop.com/manage-your-business/growth-marketing/affiliate-program" target="_blank" className="text-blue-400 hover:underline">
            Whop Affiliate Documentation
          </a>
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Compact version for showing in sidebar or quick access areas.
 */
export function AffiliateSetupButton({ onClick }: { onClick?: () => void }) {
  return (
    <Button
      className="w-full bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600"
      onClick={onClick}
    >
      <Gift className="w-4 h-4 mr-2" />
      Set Up 10% Affiliate Rate
      <ChevronRight className="w-4 h-4 ml-2" />
    </Button>
  );
}

/**
 * Commission breakdown explanation for creators.
 */
export function CommissionBreakdownCard() {
  return (
    <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
      <CardHeader>
        <CardTitle className="text-white text-lg">How Commission Works</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Visual breakdown */}
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-sm mb-3">For every $100 referred sale:</p>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-white">You (Creator)</span>
                </div>
                <span className="text-green-400 font-bold">$70 (70%)</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-white">Your Member</span>
                </div>
                <span className="text-blue-400 font-bold">$10 (10%)</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span className="text-white">Platform</span>
                </div>
                <span className="text-purple-400 font-bold">$20 (20%)</span>
              </div>
            </div>
          </div>

          {/* Key points */}
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-400 mt-0.5" />
              <span className="text-gray-300">Your 70% is guaranteed and never changes</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-400 mt-0.5" />
              <span className="text-gray-300">Members earn lifetime recurring commissions</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-400 mt-0.5" />
              <span className="text-gray-300">Whop handles all payouts automatically</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-400 mt-0.5" />
              <span className="text-gray-300">Top performers can earn up to 18% (from platform's share)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
