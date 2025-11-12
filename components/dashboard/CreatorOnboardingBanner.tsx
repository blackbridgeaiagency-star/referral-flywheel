'use client';

import { useState } from 'react';
import { X, Sparkles, Rocket } from 'lucide-react';
import { OnboardingWizard } from '../onboarding/OnboardingWizard';
import logger from '../../lib/logger';


interface CreatorOnboardingBannerProps {
  showOnboarding: boolean;
  creatorId: string;
  currentName: string;
}

export function CreatorOnboardingBanner({
  showOnboarding,
  creatorId,
  currentName
}: CreatorOnboardingBannerProps) {
  const [isVisible, setIsVisible] = useState(showOnboarding);
  const [showWizard, setShowWizard] = useState(false);

  if (!isVisible) return null;

  const handleComplete = () => {
    // Wizard already saved to database via POST /api/creator/onboarding
    // We just need to save to localStorage and refresh
    localStorage.setItem(`onboarding_dismissed_${creatorId}`, 'true');
    setShowWizard(false);
    setIsVisible(false);
    // Refresh to show updated settings
    window.location.reload();
  };

  const handleSkip = () => {
    // Just close the modal/wizard, don't save anything
    // This way it will show again next time
    setIsVisible(false);
    setShowWizard(false);
  };

  const handleStartWizard = () => {
    setShowWizard(true);
  };

  return (
    <>
      <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8 relative overflow-hidden">
        <button
          onClick={handleSkip}
          className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Animated background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl animate-pulse" />

        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 relative z-10">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-600/50">
              <Rocket className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
              🎉 Welcome to Referral Flywheel!
            </h3>
            <p className="text-gray-300 text-sm sm:text-base mb-4 leading-relaxed">
              You're 2 minutes away from turning <span className="text-purple-400 font-semibold">{currentName}</span> into
              a viral growth engine. Let's set up your referral program!
            </p>

            {/* Feature highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <div className="text-2xl mb-1">🎁</div>
                <div className="text-xs font-medium text-white">Reward Tiers</div>
                <div className="text-xs text-gray-400">Motivate members</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <div className="text-2xl mb-1">🏆</div>
                <div className="text-xs font-medium text-white">Competitions</div>
                <div className="text-xs text-gray-400">Monthly prizes</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <div className="text-2xl mb-1">💌</div>
                <div className="text-xs font-medium text-white">Auto Messages</div>
                <div className="text-xs text-gray-400">Welcome new members</div>
              </div>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleStartWizard}
                className="flex-1 sm:flex-initial px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold transition-all shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Start Setup (&lt;2 min)
              </button>
              <button
                onClick={handleSkip}
                className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg font-medium transition-colors"
              >
                Skip for now
              </button>
            </div>

            <p className="mt-3 text-xs text-gray-500">
              💡 You can always change these settings later. Takes less than 2 minutes!
            </p>
          </div>
        </div>
      </div>

      {/* Onboarding Wizard Modal */}
      {showWizard && (
        <OnboardingWizard
          creatorId={creatorId}
          currentName={currentName}
          onComplete={handleComplete}
          onSkip={handleSkip}
        />
      )}
    </>
  );
}
