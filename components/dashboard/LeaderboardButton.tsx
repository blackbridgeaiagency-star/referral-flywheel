'use client';

import { useState } from 'react';
import { Trophy } from 'lucide-react';
import { LeaderboardPanel } from './LeaderboardPanel';

interface LeaderboardButtonProps {
  memberId: string;
  creatorId: string;
}

export function LeaderboardButton({ memberId, creatorId }: LeaderboardButtonProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  return (
    <>
      {/* Trophy + Leaderboard button with breathing animation */}
      <button
        onClick={() => setIsPanelOpen(true)}
        className="group relative flex items-center gap-3 bg-gradient-to-r from-purple-600 via-purple-500 to-purple-600 hover:from-purple-700 hover:via-purple-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl shadow-2xl transition-all hover:scale-105 animate-pulse"
        aria-label="Open leaderboard"
        style={{
          animation: 'breathe 3s ease-in-out infinite',
          boxShadow: '0 0 30px rgba(147, 51, 234, 0.6), 0 0 60px rgba(147, 51, 234, 0.3)',
        }}
      >
        {/* Glow effect background */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-xl opacity-20 blur-xl group-hover:opacity-30 transition-opacity" />

        {/* Content */}
        <div className="relative flex items-center gap-3">
          <Trophy className="w-6 h-6 text-yellow-300 drop-shadow-lg animate-bounce" style={{ animationDuration: '2s' }} />
          <span className="text-base font-bold tracking-wide uppercase drop-shadow-lg">
            Leaderboard
          </span>
        </div>
      </button>

      {/* Sliding panel */}
      <LeaderboardPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        currentMemberId={memberId}
        creatorId={creatorId}
        type="referrals"
      />

      {/* Custom breathing animation */}
      <style jsx>{`
        @keyframes breathe {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 30px rgba(147, 51, 234, 0.6), 0 0 60px rgba(147, 51, 234, 0.3);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 40px rgba(147, 51, 234, 0.8), 0 0 80px rgba(147, 51, 234, 0.5);
          }
        }
      `}</style>
    </>
  );
}
