'use client';

/**
 * Partnership Impact Card
 *
 * Shows creators the VALUE they're getting from the referral program:
 * - Extra revenue generated
 * - ROI on platform fee
 * - Net benefit
 * - Next invoice preview
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { TrendingUp, DollarSign } from 'lucide-react';
import { format, startOfMonth, addMonths } from 'date-fns';

interface PartnershipImpactCardProps {
  creatorId: string;
}

interface ValueMetrics {
  organicSalesCount: number;
  organicRevenue: number;
  referredSalesCount: number;
  referredRevenue: number;
  totalSalesCount: number;
  totalRevenue: number;
  organicRevenueKept: number;
  referredRevenueKept: number;
  totalRevenueKept: number;
  revenueWithoutApp: number;
  revenueWithApp: number;
  additionalRevenueGenerated: number;
  percentageGrowth: number;
  platformFeesOwed: number;
  platformFeeAsPercentOfGain: number;
  netBenefit: number;
  roiOnPlatformFee: number;
  averageOrderValue: number;
  referralRate: number;
  shouldInvoice: boolean;
}

export function PartnershipImpactCard({ creatorId }: PartnershipImpactCardProps) {
  const [metrics, setMetrics] = useState<ValueMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/creator/${creatorId}/value-metrics`)
      .then((res) => res.json())
      .then((data) => {
        setMetrics(data.currentMonth);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to fetch value metrics:', error);
        setLoading(false);
      });
  }, [creatorId]);

  if (loading) {
    return <PartnershipImpactCardSkeleton />;
  }

  if (!metrics) {
    return null;
  }

  const hasReferrals = metrics.referredSalesCount > 0;

  return (
    <Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Partnership Impact</CardTitle>
            <CardDescription className="text-base mt-1">
              Value from your referral program this month
            </CardDescription>
          </div>

          {hasReferrals && metrics.additionalRevenueGenerated > 0 && (
            <Badge className="text-lg px-4 py-2 bg-green-100 text-green-700 border-green-300">
              <TrendingUp className="w-5 h-5 mr-2" />
              +{metrics.percentageGrowth.toFixed(1)}% Growth
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {hasReferrals ? (
          <ReferralValueDisplay metrics={metrics} />
        ) : (
          <NoReferralsDisplay metrics={metrics} />
        )}
      </CardContent>
    </Card>
  );
}

function ReferralValueDisplay({ metrics }: { metrics: ValueMetrics }) {
  return (
    <>
      {/* The Big Win - Extra Revenue Generated */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border-2 border-green-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-slate-600 mb-1">
              Extra revenue this month
            </div>
            <div className="text-4xl font-bold text-green-600">
              +${metrics.additionalRevenueGenerated.toLocaleString()}
            </div>
            <div className="text-sm text-slate-600 mt-2">
              Revenue that wouldn't exist without referrals
            </div>
          </div>
          <div className="text-6xl">🎉</div>
        </div>
      </div>

      {/* Without vs With Comparison */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-50 p-4 rounded-lg">
          <div className="text-xs font-medium text-slate-500 mb-2">
            Without Referrals
          </div>
          <div className="text-2xl font-bold text-slate-700">
            ${metrics.revenueWithoutApp.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {metrics.organicSalesCount} organic only
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
          <div className="text-xs font-medium text-green-700 mb-2">
            With Referrals
          </div>
          <div className="text-2xl font-bold text-green-700">
            ${metrics.revenueWithApp.toLocaleString()}
          </div>
          <div className="text-xs text-green-600 mt-1">
            +{metrics.referredSalesCount} referred
          </div>
        </div>
      </div>

      {/* Revenue Share Breakdown */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-slate-700">Revenue Share Breakdown</h4>

        {/* Referred Sales Total */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded">
          <span className="text-sm font-medium">Referred Sales</span>
          <span className="text-sm font-bold">
            ${metrics.referredRevenue.toLocaleString()}
          </span>
        </div>

        {/* Member Commission */}
        <div className="flex items-center justify-between p-2 bg-blue-50 rounded ml-4 border-l-4 border-blue-300">
          <div>
            <div className="text-sm font-medium text-blue-700">Member Commission (10%)</div>
            <div className="text-xs text-blue-600">Paid by Whop</div>
          </div>
          <span className="text-sm font-bold text-blue-700">
            ${(metrics.referredRevenue * 0.1).toLocaleString()}
          </span>
        </div>

        {/* You Keep */}
        <div className="flex items-center justify-between p-2 bg-green-50 rounded ml-4 border-l-4 border-green-400">
          <div>
            <div className="text-sm font-medium text-green-700">You Keep (70%)</div>
            <div className="text-xs text-green-600">Your share</div>
          </div>
          <span className="text-sm font-bold text-green-700">
            ${metrics.referredRevenueKept.toLocaleString()}
          </span>
        </div>

        {/* Platform Share */}
        <div className="flex items-center justify-between p-2 bg-slate-100 rounded ml-4 border-l-4 border-slate-400">
          <div>
            <div className="text-sm font-medium text-slate-700">Platform Share (20%)</div>
            <div className="text-xs text-slate-600">Our revenue share</div>
          </div>
          <span className="text-sm font-bold text-slate-700">
            ${metrics.platformFeesOwed.toLocaleString()}
          </span>
        </div>
      </div>

      {/* ROI on Platform Fee */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Your ROI on Our Fee</h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">Extra revenue:</span>
                <span className="font-medium">
                  ${metrics.additionalRevenueGenerated.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Platform share:</span>
                <span className="font-medium">
                  ${metrics.platformFeesOwed.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between border-t pt-1 mt-1">
                <span className="text-slate-600 font-medium">Net benefit:</span>
                <span className="font-bold text-green-600">
                  ${metrics.netBenefit.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          <div className="text-center ml-4">
            <div className="text-3xl font-bold text-blue-600">
              {metrics.roiOnPlatformFee.toFixed(1)}x
            </div>
            <div className="text-xs text-blue-700">ROI</div>
          </div>
        </div>
      </div>

      {/* Invoice Preview */}
      {metrics.shouldInvoice && (
        <div className="border-2 border-slate-200 rounded-lg p-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold">Next Invoice</h4>
            <Badge variant="outline" className="text-xs">
              Due {format(startOfMonth(addMonths(new Date(), 1)), 'MMM 1')}
            </Badge>
          </div>
          <div className="bg-slate-50 p-3 rounded">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-sm text-slate-600">Amount:</span>
              <span className="text-xl font-bold">
                ${metrics.platformFeesOwed.toLocaleString()}
              </span>
            </div>
            <div className="text-xs text-slate-600">
              20% revenue share on ${metrics.referredRevenue.toLocaleString()} in referred
              sales
            </div>
            <div className="mt-2 pt-2 border-t text-xs text-slate-500">
              💡 You're keeping ${metrics.netBenefit.toLocaleString()} more than without us
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function NoReferralsDisplay({ metrics }: { metrics: ValueMetrics }) {
  return (
    <div className="text-center py-8">
      <div className="text-6xl mb-4">🚀</div>
      <h3 className="text-xl font-semibold mb-2">Ready to grow?</h3>
      <p className="text-slate-600 mb-4">
        You have {metrics.organicSalesCount} organic members.
        <br />
        Turn them into your sales team!
      </p>
      <div className="bg-blue-50 p-4 rounded-lg inline-block max-w-md">
        <div className="text-sm text-slate-700">
          <strong>How it works:</strong>
          <br />
          Members refer → Earn 10% → You keep 70% → We take 20%
          <br />
          <span className="text-blue-600 font-medium">Zero risk. Pure upside.</span>
        </div>
      </div>
    </div>
  );
}

function PartnershipImpactCardSkeleton() {
  return (
    <Card className="border-2 border-slate-200">
      <CardHeader>
        <div className="h-8 bg-slate-200 rounded w-1/3 animate-pulse" />
        <div className="h-4 bg-slate-200 rounded w-1/2 mt-2 animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="h-24 bg-slate-200 rounded animate-pulse" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-20 bg-slate-200 rounded animate-pulse" />
            <div className="h-20 bg-slate-200 rounded animate-pulse" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
