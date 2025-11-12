'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, Copy, Check, ArrowRight, Gift, TrendingUp, Users } from 'lucide-react';
import logger from '../../lib/logger';

interface MemberOnboardingModalProps {
  memberName: string;
  creatorName: string;
  referralLink: string;
  memberId: string;
}

export function MemberOnboardingModal({
  memberName,
  creatorName,
  referralLink,
  memberId
}: MemberOnboardingModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Check if user has seen the onboarding before
    const hasSeenOnboarding = localStorage.getItem(`member_onboarding_completed_${memberId}`);

    // Show the modal after a short delay for better UX
    if (!hasSeenOnboarding) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [memberId]);

  const handleSkip = () => {
    // Just close the modal, don't save to localStorage
    // This way it will show again next time
    setIsVisible(false);
  };

  const handleComplete = () => {
    // Only save to localStorage when they complete the full walkthrough
    setIsVisible(false);
    localStorage.setItem(`member_onboarding_completed_${memberId}`, 'true');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      logger.error('Failed to copy:', error);
    }
  };

  const steps = [
    {
      title: "Welcome to Your Referral Dashboard!",
      icon: <Sparkles className="w-8 h-8" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-300 text-lg">
            Hey <span className="text-white font-semibold">{memberName}</span>! Welcome to{' '}
            <span className="text-purple-400 font-semibold">{creatorName}'s</span> community.
          </p>
          <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-xl p-4 border border-purple-500/30">
            <p className="text-white font-medium mb-2">🎉 You're now part of something special!</p>
            <p className="text-gray-300 text-sm">
              As a member, you get exclusive access to our referral program where top contributors earn real rewards.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "How Referral Rewards Work",
      icon: <TrendingUp className="w-8 h-8" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-300 text-lg">
            Here's how you can start earning rewards:
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                1
              </div>
              <div>
                <p className="text-white font-medium">Share Your Link</p>
                <p className="text-gray-400 text-sm">Send your unique referral link to friends</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                2
              </div>
              <div>
                <p className="text-white font-medium">We Track Everything</p>
                <p className="text-gray-400 text-sm">See your referral count grow in real-time</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                3
              </div>
              <div>
                <p className="text-white font-medium">{creatorName} Rewards Top Performers</p>
                <p className="text-gray-400 text-sm">Get cash, free months, VIP access, and exclusive perks!</p>
              </div>
            </div>
          </div>
          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
            <p className="text-green-400 text-sm font-medium">
              💰 Top performers in similar communities earn $500-2,000/month in rewards!
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Your Referral Link",
      icon: <Gift className="w-8 h-8" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-300 text-lg">
            This is your money-making link. Share it everywhere!
          </p>
          <div className="bg-black/30 backdrop-blur-sm rounded-lg p-4 border border-purple-500/30">
            <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Your Unique Referral Link</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={referralLink}
                readOnly
                className="flex-1 px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-purple-500 transition-colors"
              />
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
              <Users className="w-6 h-6 text-purple-400 mx-auto mb-1" />
              <p className="text-xs text-gray-400">Share on Social</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
              <TrendingUp className="w-6 h-6 text-green-400 mx-auto mb-1" />
              <p className="text-xs text-gray-400">Track Earnings</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
              <Gift className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
              <p className="text-xs text-gray-400">Win Rewards</p>
            </div>
          </div>
        </div>
      )
    }
  ];

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-purple-500/30 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="relative p-6 pb-0">
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            aria-label="Close onboarding"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
              {steps[currentStep].icon}
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white text-center mb-2">
            {steps[currentStep].title}
          </h2>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-6">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? 'w-8 bg-gradient-to-r from-purple-600 to-pink-600'
                    : index < currentStep
                    ? 'w-2 bg-purple-600'
                    : 'w-2 bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 pt-0">
          {steps[currentStep].content}
        </div>

        {/* Footer */}
        <div className="p-6 pt-0 flex justify-between items-center">
          {currentStep > 0 ? (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              Back
            </button>
          ) : (
            <button
              onClick={handleSkip}
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              Skip
            </button>
          )}

          {currentStep < steps.length - 1 ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all font-medium flex items-center gap-2"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all font-medium flex items-center gap-2"
            >
              Start Earning
              <Check className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}