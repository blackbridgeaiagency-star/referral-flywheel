'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Gift, Clock, CheckCircle, XCircle, Sparkles, PartyPopper, DollarSign } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { FIRST_REFERRAL_BONUS_CONFIG } from '@/lib/utils/first-referral-bonus';

type BonusStatus = 'eligible' | 'pending' | 'confirmed' | 'paid' | 'revoked';

interface FirstReferralBonusCardProps {
  status: BonusStatus;
  bonusAmount?: number;
  confirmAt?: Date | string;
  paidAt?: Date | string;
  onShare?: () => void;
}

export function FirstReferralBonusCard({
  status,
  bonusAmount = FIRST_REFERRAL_BONUS_CONFIG.FIXED_AMOUNT,
  confirmAt,
  paidAt,
  onShare,
}: FirstReferralBonusCardProps) {
  const confirmDate = confirmAt ? new Date(confirmAt) : undefined;
  const paidDate = paidAt ? new Date(paidAt) : undefined;

  const statusConfig = {
    eligible: {
      icon: <Gift className="w-6 h-6" />,
      iconBg: 'bg-yellow-500/20 text-yellow-400',
      title: `Earn $${bonusAmount} Bonus!`,
      subtitle: 'Make your first referral to unlock',
      badge: { text: 'Available', class: 'bg-yellow-500/20 text-yellow-400' },
      cardBg: 'from-yellow-900/30 to-orange-900/30',
      borderColor: 'border-yellow-500/30',
      showCTA: true,
    },
    pending: {
      icon: <Clock className="w-6 h-6" />,
      iconBg: 'bg-blue-500/20 text-blue-400',
      title: `$${bonusAmount} Bonus Pending`,
      subtitle: confirmDate
        ? `Confirms ${formatDistanceToNow(confirmDate, { addSuffix: true })}`
        : 'Confirming...',
      badge: { text: 'Pending', class: 'bg-blue-500/20 text-blue-400' },
      cardBg: 'from-blue-900/30 to-indigo-900/30',
      borderColor: 'border-blue-500/30',
      showCTA: false,
    },
    confirmed: {
      icon: <Sparkles className="w-6 h-6" />,
      iconBg: 'bg-green-500/20 text-green-400',
      title: `$${bonusAmount} Bonus Confirmed!`,
      subtitle: 'Ready to be paid out',
      badge: { text: 'Confirmed', class: 'bg-green-500/20 text-green-400' },
      cardBg: 'from-green-900/30 to-emerald-900/30',
      borderColor: 'border-green-500/30',
      showCTA: false,
    },
    paid: {
      icon: <CheckCircle className="w-6 h-6" />,
      iconBg: 'bg-green-500/20 text-green-400',
      title: `$${bonusAmount} Bonus Paid!`,
      subtitle: paidDate
        ? `Paid ${formatDistanceToNow(paidDate, { addSuffix: true })}`
        : 'Bonus received',
      badge: { text: 'Paid', class: 'bg-green-500/20 text-green-400' },
      cardBg: 'from-green-900/30 to-teal-900/30',
      borderColor: 'border-green-500/30',
      showCTA: false,
    },
    revoked: {
      icon: <XCircle className="w-6 h-6" />,
      iconBg: 'bg-red-500/20 text-red-400',
      title: 'Bonus Revoked',
      subtitle: 'Referral was refunded',
      badge: { text: 'Revoked', class: 'bg-red-500/20 text-red-400' },
      cardBg: 'from-gray-900/30 to-gray-800/30',
      borderColor: 'border-gray-500/30',
      showCTA: false,
    },
  };

  const config = statusConfig[status];

  // Don't show revoked status
  if (status === 'revoked') return null;

  return (
    <Card className={`bg-gradient-to-r ${config.cardBg} ${config.borderColor} border overflow-hidden`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${config.iconBg}`}>
              {config.icon}
            </div>
            <div>
              <h3 className="text-white font-semibold">{config.title}</h3>
              <p className="text-gray-400 text-sm">{config.subtitle}</p>
            </div>
          </div>
          <Badge className={config.badge.class}>
            {config.badge.text}
          </Badge>
        </div>

        {/* CTA for eligible status */}
        {status === 'eligible' && onShare && (
          <div className="mt-4">
            <Button
              onClick={onShare}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-semibold"
            >
              <Gift className="w-4 h-4 mr-2" />
              Share Now & Earn ${bonusAmount}
            </Button>
            <p className="text-xs text-gray-500 text-center mt-2">
              Get ${bonusAmount} extra on top of your regular commission!
            </p>
          </div>
        )}

        {/* Info box for pending status */}
        {status === 'pending' && (
          <div className="mt-4 p-3 rounded bg-black/30">
            <p className="text-sm text-gray-300">
              <span className="text-blue-400 font-semibold">Why 30 days?</span>{' '}
              We wait for the refund window to pass to ensure your bonus is secure.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Celebration modal when first referral is made
 */
interface FirstReferralCelebrationProps {
  isOpen: boolean;
  onClose: () => void;
  bonusAmount: number;
  commissionAmount: number;
  confirmDate: Date;
}

export function FirstReferralCelebration({
  isOpen,
  onClose,
  bonusAmount,
  commissionAmount,
  confirmDate,
}: FirstReferralCelebrationProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      // Dynamically import and fire confetti
      import('canvas-confetti').then((confetti) => {
        const duration = 3000;
        const end = Date.now() + duration;

        const colors = ['#10b981', '#22c55e', '#a855f7', '#fbbf24'];

        (function frame() {
          confetti.default({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors,
          });
          confetti.default({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors,
          });

          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        })();
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalEarned = bonusAmount + commissionAmount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8 max-w-md w-full mx-4 text-center animate-in zoom-in-95 duration-300">
        {/* Celebration icon */}
        <div className="mb-6">
          <PartyPopper className="w-24 h-24 mx-auto text-yellow-400" />
        </div>

        <h2 className="text-3xl font-bold text-white mb-2">
          First Referral!
        </h2>

        <p className="text-gray-400 mb-6">
          Congratulations! You've made your first successful referral!
        </p>

        {/* Earnings breakdown */}
        <div className="space-y-3 mb-6">
          <div className="p-3 rounded-lg bg-green-900/30 border border-green-500/30 flex justify-between">
            <span className="text-gray-300">Commission earned</span>
            <span className="text-green-400 font-bold">${commissionAmount.toFixed(2)}</span>
          </div>

          <div className="p-3 rounded-lg bg-yellow-900/30 border border-yellow-500/30 flex justify-between">
            <div className="flex items-center gap-2">
              <span className="text-gray-300">First referral bonus</span>
              <span className="text-xs text-yellow-400 font-semibold">(+BONUS!)</span>
            </div>
            <span className="text-yellow-400 font-bold">${bonusAmount.toFixed(2)}</span>
          </div>

          <div className="p-3 rounded-lg bg-purple-900/30 border border-purple-500/30 flex justify-between">
            <span className="text-white font-semibold">Total earned</span>
            <span className="text-purple-400 font-bold text-xl">${totalEarned.toFixed(2)}</span>
          </div>
        </div>

        {/* Bonus confirmation note */}
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mb-6">
          <Clock className="w-4 h-4" />
          <span>Bonus confirms on {confirmDate.toLocaleDateString()}</span>
        </div>

        <Button
          onClick={onClose}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
        >
          Keep the momentum going!
        </Button>
      </div>
    </div>
  );
}
