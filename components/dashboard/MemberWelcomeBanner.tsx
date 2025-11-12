'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, Copy, Check } from 'lucide-react';
import logger from '../../lib/logger';


interface MemberWelcomeBannerProps {
  memberName: string;
  creatorName: string;
  referralLink: string;
  memberId: string;
}

export function MemberWelcomeBanner({
  memberName,
  creatorName,
  referralLink,
  memberId
}: MemberWelcomeBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the banner before
    const dismissed = localStorage.getItem(`member_welcome_dismissed_${memberId}`);
    if (!dismissed) {
      setIsVisible(true);
    }
  }, [memberId]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(`member_welcome_dismissed_${memberId}`, 'true');
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

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/40 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 relative overflow-hidden">
      {/* Animated background effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 to-blue-600/5 animate-pulse" />

      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors z-10"
        aria-label="Dismiss welcome message"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="relative z-10">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
              Welcome, {memberName}! 🎉
            </h3>
            <p className="text-gray-300 text-sm sm:text-base mb-4">
              You're now part of <strong>{creatorName}</strong>. Start earning <strong className="text-purple-400">10% lifetime commission</strong> by sharing your unique referral link!
            </p>

            {/* Referral Link Card */}
            <div className="bg-black/30 backdrop-blur-sm rounded-lg p-4 mb-4">
              <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Your Referral Link</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={referralLink}
                  readOnly
                  className="flex-1 px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-purple-500 transition-colors"
                />
                <button
                  onClick={handleCopy}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors text-sm sm:text-base"
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

            {/* Quick Tips */}
            <div className="bg-black/20 backdrop-blur-sm rounded-lg p-4">
              <p className="text-sm font-semibold text-purple-400 mb-2">💡 How it works:</p>
              <ul className="space-y-1 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">→</span>
                  <span>Share your link with friends and followers</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">→</span>
                  <span>They join and you earn 10% every month they stay</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">→</span>
                  <span>Compete on the leaderboard for exclusive rewards</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
