'use client';

/**
 * ShareKit Component
 * Comprehensive sharing toolkit for members
 *
 * Features:
 * - 8+ platform integrations
 * - One-click sharing
 * - Copy link with animation
 * - QR code generation
 * - Share tracking
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Twitter,
  Facebook,
  Linkedin,
  MessageCircle,
  Mail,
  Copy,
  Check,
  QrCode,
  Share2,
  Send,
} from 'lucide-react';

interface ShareKitProps {
  referralLink: string;
  message?: string;
  communityName: string;
  memberName: string;
  earnings?: number;
  onShare?: (platform: string) => void; // Track shares
}

export function ShareKit({
  referralLink,
  message,
  communityName,
  memberName,
  earnings,
  onShare,
}: ShareKitProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const defaultMessage = message || `Join ${communityName} and start earning!`;
  const shareText = `🚀 ${defaultMessage}\n\nUse my link to join: ${referralLink}`;
  const earningsText = earnings
    ? `\n\n💰 I've earned $${earnings.toFixed(2)} so far!`
    : '';

  // URL encode for sharing
  const encodedText = encodeURIComponent(shareText + earningsText);
  const encodedLink = encodeURIComponent(referralLink);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      onShare?.('clipboard');

      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleShare = (platform: string, url: string) => {
    onShare?.(platform);
    window.open(url, '_blank', 'width=600,height=400');
  };

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodedText}`,

    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedLink}&quote=${encodedText}`,

    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedLink}`,

    whatsapp: `https://wa.me/?text=${encodedText}`,

    telegram: `https://t.me/share/url?url=${encodedLink}&text=${encodedText}`,

    reddit: `https://reddit.com/submit?url=${encodedLink}&title=${encodeURIComponent(defaultMessage)}`,

    email: `mailto:?subject=${encodeURIComponent(`Join ${communityName}`)}&body=${encodedText}`,

    sms: `sms:?&body=${encodedText}`,
  };

  const platforms = [
    { name: 'Twitter', icon: Twitter, url: shareLinks.twitter, color: 'hover:bg-[#1DA1F2]/10 hover:text-[#1DA1F2]' },
    { name: 'Facebook', icon: Facebook, url: shareLinks.facebook, color: 'hover:bg-[#1877F2]/10 hover:text-[#1877F2]' },
    { name: 'LinkedIn', icon: Linkedin, url: shareLinks.linkedin, color: 'hover:bg-[#0A66C2]/10 hover:text-[#0A66C2]' },
    { name: 'WhatsApp', icon: MessageCircle, url: shareLinks.whatsapp, color: 'hover:bg-[#25D366]/10 hover:text-[#25D366]' },
    { name: 'Telegram', icon: Send, url: shareLinks.telegram, color: 'hover:bg-[#0088cc]/10 hover:text-[#0088cc]' },
    { name: 'Reddit', icon: Share2, url: shareLinks.reddit, color: 'hover:bg-[#FF4500]/10 hover:text-[#FF4500]' },
    { name: 'Email', icon: Mail, url: shareLinks.email, color: 'hover:bg-purple-500/10 hover:text-purple-400' },
    { name: 'SMS', icon: MessageCircle, url: shareLinks.sms, color: 'hover:bg-green-500/10 hover:text-green-400' },
  ];

  return (
    <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
      <CardContent className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">Share Your Referral Link</h3>
          <p className="text-sm text-gray-400">
            Share on your favorite platform and start earning 10% commission
          </p>
        </div>

        {/* Copy Link Section */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Your Referral Link</label>
          <div className="flex gap-2">
            <div className="flex-1 bg-[#0F0F0F] border border-[#2A2A2A] rounded-md px-4 py-2 text-sm text-gray-300 font-mono overflow-x-auto">
              {referralLink}
            </div>
            <Button
              onClick={handleCopy}
              className={`${
                copied
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-purple-600 hover:bg-purple-700'
              } text-white transition-colors`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Platform Share Buttons */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Share On</label>
          <div className="grid grid-cols-4 gap-3">
            {platforms.map((platform) => {
              const Icon = platform.icon;
              return (
                <button
                  key={platform.name}
                  onClick={() => handleShare(platform.name.toLowerCase(), platform.url)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] transition-colors ${platform.color}`}
                  title={`Share on ${platform.name}`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{platform.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* QR Code Section */}
        <div>
          <Button
            variant="outline"
            onClick={() => setShowQR(!showQR)}
            className="w-full border-[#2A2A2A] text-gray-300 hover:bg-[#2A2A2A]"
          >
            <QrCode className="w-4 h-4 mr-2" />
            {showQR ? 'Hide QR Code' : 'Show QR Code'}
          </Button>

          {showQR && (
            <div className="mt-4 p-6 bg-white rounded-lg flex flex-col items-center">
              <div className="text-center mb-4">
                <p className="text-sm text-gray-600 mb-2">Scan to visit your referral link</p>
              </div>
              {/* QR Code using Google Charts API (simple, no dependencies) */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedLink}`}
                alt="QR Code"
                className="w-48 h-48"
              />
              <p className="mt-4 text-xs text-gray-500 text-center max-w-xs">
                Perfect for in-person sharing or adding to your social media bio
              </p>
            </div>
          )}
        </div>

        {/* Share Stats (if earnings are provided) */}
        {earnings !== undefined && earnings > 0 && (
          <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-green-400">
              <Share2 className="w-4 h-4" />
              <p className="text-sm font-medium">
                You've earned ${earnings.toFixed(2)} from sharing!
              </p>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Keep sharing to increase your passive income
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
