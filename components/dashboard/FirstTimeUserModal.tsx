'use client';

import { useEffect, useState } from 'react';
import { X, Sparkles, Link2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface FirstTimeUserModalProps {
  membershipId: string;
  onClose: () => void;
  onViewReferralLink: () => void;
}

export function FirstTimeUserModal({
  membershipId,
  onClose,
  onViewReferralLink
}: FirstTimeUserModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Check if user has seen the welcome message
    const storageKey = `welcome_seen_${membershipId}`;
    const hasSeenWelcome = localStorage.getItem(storageKey);

    if (!hasSeenWelcome) {
      // Show modal after a short delay for better UX
      setTimeout(() => setIsVisible(true), 500);
    }
  }, [membershipId]);

  const handleClose = () => {
    setIsClosing(true);
    const storageKey = `welcome_seen_${membershipId}`;
    localStorage.setItem(storageKey, 'true');

    setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 300);
  };

  const handleViewLink = () => {
    handleClose();
    // Scroll to referral link card
    onViewReferralLink();
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <Card
          className={`
            bg-gradient-to-br from-purple-900/95 via-gray-900/95 to-black/95
            border-2 border-purple-500/50
            max-w-md w-full
            shadow-2xl shadow-purple-900/50
            pointer-events-auto
            transition-all duration-300
            ${isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}
          `}
        >
          <div className="p-6 relative">
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Animated icon */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-purple-600/20 border-2 border-purple-500 flex items-center justify-center animate-pulse">
                  <Sparkles className="w-8 h-8 text-purple-400" />
                </div>
                {/* Orbiting sparkles */}
                <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
                  <div className="absolute -top-1 left-1/2 w-2 h-2 bg-yellow-400 rounded-full" />
                  <div className="absolute top-1/2 -right-1 w-2 h-2 bg-pink-400 rounded-full" />
                  <div className="absolute -bottom-1 left-1/2 w-2 h-2 bg-blue-400 rounded-full" />
                  <div className="absolute top-1/2 -left-1 w-2 h-2 bg-green-400 rounded-full" />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">
                Welcome to Your Referral Dashboard! 🎉
              </h2>
              <p className="text-gray-300 text-sm leading-relaxed">
                You can now earn <span className="text-purple-400 font-bold">10% lifetime commissions</span> by sharing this community with friends. Get started in seconds!
              </p>
            </div>

            {/* Feature highlights */}
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3 bg-black/30 rounded-lg p-3">
                <div className="w-8 h-8 rounded-full bg-green-600/20 border border-green-600 flex items-center justify-center flex-shrink-0">
                  <Link2 className="w-4 h-4 text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">Your Unique Link</p>
                  <p className="text-xs text-gray-400">Share with anyone, anywhere</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-black/30 rounded-lg p-3">
                <div className="w-8 h-8 rounded-full bg-yellow-600/20 border border-yellow-600 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-4 h-4 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">Automatic Tracking</p>
                  <p className="text-xs text-gray-400">No setup needed - just share!</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-black/30 rounded-lg p-3">
                <div className="w-8 h-8 rounded-full bg-purple-600/20 border border-purple-600 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">Milestone Rewards</p>
                  <p className="text-xs text-gray-400">Unlock bonuses as you refer</p>
                </div>
              </div>
            </div>

            {/* CTA buttons */}
            <div className="space-y-2">
              <Button
                onClick={handleViewLink}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold"
              >
                Get My Referral Link
              </Button>
              <Button
                onClick={handleClose}
                variant="ghost"
                className="w-full text-gray-400 hover:text-white hover:bg-white/5"
              >
                I'll check it out later
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
