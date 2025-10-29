'use client';

import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';

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
  const [isUpdating, setIsUpdating] = useState(false);
  const [communityName, setCommunityName] = useState(currentName);

  if (!isVisible) return null;

  const handleUpdate = async () => {
    if (!communityName.trim() || communityName === currentName) return;

    setIsUpdating(true);
    try {
      const response = await fetch('/api/creator/update-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId,
          companyName: communityName
        })
      });

      if (response.ok) {
        // Refresh the page to show updated name
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to update community name:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSkip = () => {
    setIsVisible(false);
    // Store in localStorage that user dismissed this
    localStorage.setItem(`onboarding_dismissed_${creatorId}`, 'true');
  };

  return (
    <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8 relative">
      <button
        onClick={handleSkip}
        className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="flex items-start gap-3 sm:gap-4">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
            Welcome to Your Referral Program! 🎉
          </h3>
          <p className="text-gray-300 text-sm sm:text-base mb-4">
            Let's personalize your affiliate dashboard. What would you like to name your community?
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={communityName}
              onChange={(e) => setCommunityName(e.target.value)}
              placeholder="Enter your community name"
              className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors text-sm sm:text-base"
              maxLength={50}
            />
            <div className="flex gap-2">
              <button
                onClick={handleUpdate}
                disabled={isUpdating || !communityName.trim() || communityName === currentName}
                className="flex-1 sm:flex-initial px-4 sm:px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm sm:text-base"
              >
                {isUpdating ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleSkip}
                className="flex-1 sm:flex-initial px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors text-sm sm:text-base"
              >
                Skip
              </button>
            </div>
          </div>

          <div className="mt-4 text-xs sm:text-sm text-gray-400">
            <p className="mb-2"><strong>Quick tips:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Your members automatically earn 10% lifetime commission</li>
              <li>Customize reward tiers below to incentivize top performers</li>
              <li>Track all earnings and referrals in real-time</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
