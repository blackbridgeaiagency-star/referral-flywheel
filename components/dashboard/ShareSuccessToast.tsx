'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Sparkles, Target } from 'lucide-react';

interface ShareSuccessToastProps {
  membershipId: string;
  onClose: () => void;
}

export function ShareSuccessToast({ membershipId, onClose }: ShareSuccessToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [confettiPieces, setConfettiPieces] = useState<Array<{ id: number; x: number; color: string; delay: number; duration: number }>>([]);

  useEffect(() => {
    // Check if this is the first share
    const storageKey = `first_share_${membershipId}`;
    const hasSharedBefore = localStorage.getItem(storageKey);

    if (!hasSharedBefore) {
      // Mark as shared
      localStorage.setItem(storageKey, 'true');

      // Generate confetti
      const pieces = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: ['#a855f7', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'][Math.floor(Math.random() * 5)],
        delay: Math.random() * 0.3,
        duration: 1 + Math.random() * 0.5
      }));
      setConfettiPieces(pieces);
    }

    // Auto-hide after 5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [membershipId, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top duration-300">
      {/* Confetti overlay */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {confettiPieces.map((piece) => (
          <div
            key={piece.id}
            className="absolute w-2 h-2 rounded-full animate-fall"
            style={{
              left: `${piece.x}%`,
              backgroundColor: piece.color,
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
              boxShadow: `0 0 6px ${piece.color}`
            }}
          />
        ))}
      </div>

      {/* Toast card */}
      <div className="bg-gradient-to-r from-green-900/95 to-emerald-900/95 border-2 border-green-500/50 rounded-lg shadow-2xl shadow-green-900/50 p-4 max-w-sm backdrop-blur-sm">
        <div className="flex items-start gap-3">
          {/* Success icon */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-green-600/30 border-2 border-green-500 flex items-center justify-center animate-pulse">
              <CheckCircle2 className="w-6 h-6 text-green-400" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-white font-bold">Great Job! 🎉</h3>
              <Sparkles className="w-4 h-4 text-yellow-400" />
            </div>
            <p className="text-sm text-gray-200 mb-2">
              Link copied successfully! Now share it in <span className="text-green-400 font-medium">2 more places</span> for maximum momentum.
            </p>

            {/* Suggested places */}
            <div className="bg-black/30 rounded-md p-2 mt-2">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Target className="w-3 h-3 text-green-400" />
                <p className="text-xs font-medium text-green-400">Quick share ideas:</p>
              </div>
              <ul className="text-xs text-gray-300 space-y-0.5">
                <li>• Social media story</li>
                <li>• Group chat with friends</li>
                <li>• Email signature</li>
              </ul>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 animate-progress" style={{ animationDuration: '5s' }} />
        </div>
      </div>

      <style jsx>{`
        @keyframes fall {
          0% {
            transform: translateY(-100px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(400px) rotate(360deg);
            opacity: 0;
          }
        }
        .animate-fall {
          animation: fall linear forwards;
        }

        @keyframes progress {
          0% {
            width: 100%;
          }
          100% {
            width: 0%;
          }
        }
        .animate-progress {
          animation: progress linear forwards;
        }
      `}</style>
    </div>
  );
}
