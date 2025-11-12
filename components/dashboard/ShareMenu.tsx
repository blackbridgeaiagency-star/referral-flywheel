'use client';

import { useState } from 'react';
import {
  Share2,
  Twitter,
  Facebook,
  MessageCircle,
  Send,
  Mail,
  Copy,
  QrCode,
  X,
} from 'lucide-react';
import { useToast } from '../ui/toast-provider';
import logger from '../../lib/logger';


interface ShareMenuProps {
  referralUrl: string;
  referralCode: string;
  memberId?: string;
  communityName?: string;
}

export function ShareMenu({ referralUrl, referralCode, memberId, communityName = 'our community' }: ShareMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const { showToast } = useToast();

  const shareMessage = `🚀 Join ${communityName} with my referral link and let's grow together!`;

  const trackShare = async (platform: string) => {
    if (!memberId) return;

    try {
      await fetch('/api/share/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          platform,
          shareType: 'link',
        }),
      });
    } catch (error) {
      logger.error('Failed to track share:', error);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralUrl);
    showToast('Link copied to clipboard!', 'success');
    await trackShare('clipboard');
    setIsOpen(false);
  };

  const handleShare = async (platform: string) => {
    await trackShare(platform);

    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}&url=${encodeURIComponent(referralUrl)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralUrl)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(shareMessage + ' ' + referralUrl)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent(shareMessage)}`,
      email: `mailto:?subject=${encodeURIComponent('Join me on ' + communityName)}&body=${encodeURIComponent(shareMessage + '\n\n' + referralUrl)}`,
    };

    const url = urls[platform as keyof typeof urls];
    if (url) {
      window.open(url, '_blank', 'width=600,height=400');
      showToast(`Shared via ${platform}!`, 'success');
    }

    setIsOpen(false);
  };

  const handleQR = () => {
    setShowQR(true);
    trackShare('qr_code');
  };

  return (
    <>
      {/* Share Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-medium transition-all shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50 flex items-center gap-2"
      >
        <Share2 className="w-4 h-4" />
        Share Link
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 mt-2 w-72 bg-[#1A1A1A] border border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 bg-gradient-to-r from-purple-900/20 to-pink-900/20">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                Share Your Referral Link
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Earn 10% commission on every referral!
              </p>
            </div>

            {/* Share Options */}
            <div className="p-2">
              {/* Copy Link */}
              <button
                onClick={handleCopy}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 rounded-lg transition-colors text-left group"
              >
                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center group-hover:bg-purple-600 transition-colors">
                  <Copy className="w-5 h-5 text-gray-400 group-hover:text-white" />
                </div>
                <div>
                  <div className="font-medium text-white text-sm">Copy Link</div>
                  <div className="text-xs text-gray-500">Quick share anywhere</div>
                </div>
              </button>

              {/* Twitter */}
              <button
                onClick={() => handleShare('twitter')}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 rounded-lg transition-colors text-left group"
              >
                <div className="w-10 h-10 rounded-full bg-[#1DA1F2]/20 flex items-center justify-center group-hover:bg-[#1DA1F2] transition-colors">
                  <Twitter className="w-5 h-5 text-[#1DA1F2] group-hover:text-white" />
                </div>
                <div>
                  <div className="font-medium text-white text-sm">Twitter / X</div>
                  <div className="text-xs text-gray-500">Post to your followers</div>
                </div>
              </button>

              {/* WhatsApp */}
              <button
                onClick={() => handleShare('whatsapp')}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 rounded-lg transition-colors text-left group"
              >
                <div className="w-10 h-10 rounded-full bg-[#25D366]/20 flex items-center justify-center group-hover:bg-[#25D366] transition-colors">
                  <MessageCircle className="w-5 h-5 text-[#25D366] group-hover:text-white" />
                </div>
                <div>
                  <div className="font-medium text-white text-sm">WhatsApp</div>
                  <div className="text-xs text-gray-500">Send to contacts</div>
                </div>
              </button>

              {/* Telegram */}
              <button
                onClick={() => handleShare('telegram')}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 rounded-lg transition-colors text-left group"
              >
                <div className="w-10 h-10 rounded-full bg-[#0088cc]/20 flex items-center justify-center group-hover:bg-[#0088cc] transition-colors">
                  <Send className="w-5 h-5 text-[#0088cc] group-hover:text-white" />
                </div>
                <div>
                  <div className="font-medium text-white text-sm">Telegram</div>
                  <div className="text-xs text-gray-500">Share in groups</div>
                </div>
              </button>

              {/* Facebook */}
              <button
                onClick={() => handleShare('facebook')}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 rounded-lg transition-colors text-left group"
              >
                <div className="w-10 h-10 rounded-full bg-[#1877F2]/20 flex items-center justify-center group-hover:bg-[#1877F2] transition-colors">
                  <Facebook className="w-5 h-5 text-[#1877F2] group-hover:text-white" />
                </div>
                <div>
                  <div className="font-medium text-white text-sm">Facebook</div>
                  <div className="text-xs text-gray-500">Post to timeline</div>
                </div>
              </button>

              {/* Email */}
              <button
                onClick={() => handleShare('email')}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 rounded-lg transition-colors text-left group"
              >
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center group-hover:bg-purple-600 transition-colors">
                  <Mail className="w-5 h-5 text-gray-400 group-hover:text-white" />
                </div>
                <div>
                  <div className="font-medium text-white text-sm">Email</div>
                  <div className="text-xs text-gray-500">Send via email</div>
                </div>
              </button>

              {/* QR Code */}
              <button
                onClick={handleQR}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 rounded-lg transition-colors text-left group"
              >
                <div className="w-10 h-10 rounded-full bg-purple-900/30 flex items-center justify-center group-hover:bg-purple-600 transition-colors">
                  <QrCode className="w-5 h-5 text-purple-400 group-hover:text-white" />
                </div>
                <div>
                  <div className="font-medium text-white text-sm">QR Code</div>
                  <div className="text-xs text-gray-500">Show in person</div>
                </div>
              </button>
            </div>

            {/* Footer Tip */}
            <div className="p-4 border-t border-gray-800 bg-gradient-to-r from-green-900/10 to-emerald-900/10">
              <p className="text-xs text-gray-400">
                💡 <span className="text-green-400 font-medium">Pro Tip:</span> Share on multiple
                platforms to maximize your earnings!
              </p>
            </div>
          </div>
        </>
      )}

      {/* QR Code Modal */}
      {showQR && (
        <QRCodeModal
          referralUrl={referralUrl}
          referralCode={referralCode}
          onClose={() => setShowQR(false)}
        />
      )}
    </>
  );
}

function QRCodeModal({ referralUrl, referralCode, onClose }: {
  referralUrl: string;
  referralCode: string;
  onClose: () => void;
}) {
  // Using QR Code API (you can also use a library like qrcode.react)
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(referralUrl)}`;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">QR Code</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl mb-4">
          <img
            src={qrCodeUrl}
            alt="QR Code"
            className="w-full h-auto"
          />
        </div>

        <div className="text-center space-y-2">
          <p className="font-mono text-purple-400 text-sm">
            {referralCode}
          </p>
          <p className="text-xs text-gray-400">
            Scan this code to visit your referral link
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
