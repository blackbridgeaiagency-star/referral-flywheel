'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import {
  Copy,
  Check,
  Share2,
  Twitter,
  Mail,
  MessageCircle,
  QrCode,
  AlertCircle,
  RefreshCw,
  Users,
  MousePointerClick,
  Loader2,
} from 'lucide-react';
import logger from '../../lib/logger';

interface ReferralUrlGeneratorProps {
  memberId: string;
  referralCode: string;
  whopUsername?: string | null;
  onUsernameNeeded?: () => void;
}

interface ReferralUrlData {
  success: boolean;
  referralUrl: string;
  vanityUrl: string;
  copyText: string;
  whopUsername: string | null;
  needsUsernameSetup: boolean;
  stats: {
    clickCount: number;
    conversionCount: number;
  };
}

type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export function ReferralUrlGenerator({
  memberId,
  referralCode,
  whopUsername,
  onUsernameNeeded,
}: ReferralUrlGeneratorProps) {
  const [urlData, setUrlData] = useState<ReferralUrlData | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // Fetch referral URL data
  const fetchUrlData = useCallback(async () => {
    setLoadingState('loading');
    setError(null);

    try {
      const response = await fetch(`/api/referral/generate-url?memberId=${memberId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate URL');
      }

      setUrlData(data);
      setLoadingState('success');

      // Notify parent if username setup is needed
      if (data.needsUsernameSetup && onUsernameNeeded) {
        onUsernameNeeded();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setLoadingState('error');
      logger.error('Failed to fetch referral URL:', err);
    }
  }, [memberId, onUsernameNeeded]);

  // Initial fetch
  useEffect(() => {
    fetchUrlData();
  }, [fetchUrlData]);

  // Track share event
  const trackShare = async (platform: string) => {
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
      // Non-blocking - don't interrupt user action
      logger.error('Failed to track share:', error);
    }
  };

  // Copy URL to clipboard
  const handleCopy = async () => {
    if (!urlData) return;

    try {
      await navigator.clipboard.writeText(urlData.vanityUrl);
      setCopied(true);
      await trackShare('clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error('Failed to copy:', err);
    }
  };

  // Share via platform
  const handleShare = async (platform: 'twitter' | 'whatsapp' | 'email') => {
    if (!urlData) return;

    const url = encodeURIComponent(urlData.vanityUrl);
    const text = encodeURIComponent(urlData.copyText);

    let shareUrl = '';

    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${encodeURIComponent('Check this out!')}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${text}`;
        break;
      case 'email':
        const subject = encodeURIComponent('I thought you might like this');
        shareUrl = `mailto:?subject=${subject}&body=${text}`;
        break;
    }

    await trackShare(platform);
    window.open(shareUrl, '_blank');
  };

  // Native share (mobile)
  const handleNativeShare = async () => {
    if (!urlData || !navigator.share) return;

    try {
      await navigator.share({
        title: 'Join my community',
        text: urlData.copyText,
        url: urlData.vanityUrl,
      });
      await trackShare('native_share');
    } catch (err) {
      // User cancelled or error
      logger.error('Native share failed:', err);
    }
  };

  // Loading state
  if (loadingState === 'loading') {
    return (
      <Card className="bg-[#1A1A1A] border-[#2A2A2A] p-6">
        <div className="flex items-center justify-center gap-3 py-8">
          <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
          <span className="text-gray-400">Generating your referral link...</span>
        </div>
      </Card>
    );
  }

  // Error state
  if (loadingState === 'error') {
    return (
      <Card className="bg-[#1A1A1A] border-[#2A2A2A] p-6">
        <div className="flex flex-col items-center justify-center gap-4 py-6">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <p className="text-gray-400 text-center">{error || 'Failed to load referral link'}</p>
          <Button
            onClick={fetchUrlData}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  // Username setup required
  if (urlData?.needsUsernameSetup) {
    return (
      <Card className="bg-gradient-to-br from-amber-900/20 to-orange-900/20 border-amber-500/30 p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-amber-500 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-amber-200">Complete Your Setup</h3>
              <p className="text-sm text-amber-200/70 mt-1">
                Connect your Whop username to enable referral tracking. Without it, your referrals won't be credited to you.
              </p>
            </div>
          </div>

          {/* Still show the vanity URL for sharing */}
          <div className="bg-black/30 rounded-lg p-4 mt-2">
            <p className="text-xs text-gray-500 mb-2">Your referral link (preview)</p>
            <div className="flex items-center gap-2">
              <code className="text-purple-400 font-mono text-sm flex-1 truncate">
                {urlData.vanityUrl}
              </code>
              <Button
                onClick={handleCopy}
                size="sm"
                variant="ghost"
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <p className="text-xs text-amber-200/50 text-center">
            Set up your Whop username above to activate your referral link
          </p>
        </div>
      </Card>
    );
  }

  // Success state - show full UI
  return (
    <Card className="bg-[#1A1A1A] border-[#2A2A2A] p-4">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white text-sm">Your Referral Link</h3>
          {copied && (
            <span className="text-xs font-medium text-green-400 animate-in fade-in slide-in-from-right-2">
              Copied!
            </span>
          )}
        </div>

        {/* URL Display - High contrast */}
        <div className="bg-[#0F0F0F] border border-[#333] rounded-lg p-3">
          <div className="flex items-center gap-2">
            <code className="text-white font-mono text-sm flex-1 truncate font-medium">
              {urlData?.vanityUrl}
            </code>
            <Button
              onClick={handleCopy}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 shrink-0 h-8 px-3"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Stats Row - Compact */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[#0F0F0F] border border-[#333] rounded-lg p-2 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <MousePointerClick className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <p className="text-base font-bold text-white">{urlData?.stats.clickCount || 0}</p>
              <p className="text-[10px] text-gray-400">Clicks</p>
            </div>
          </div>
          <div className="bg-[#0F0F0F] border border-[#333] rounded-lg p-2 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <Users className="h-4 w-4 text-green-400" />
            </div>
            <div>
              <p className="text-base font-bold text-white">{urlData?.stats.conversionCount || 0}</p>
              <p className="text-[10px] text-gray-400">Joined</p>
            </div>
          </div>
        </div>

        {/* Share Buttons - Compact */}
        <div className="space-y-2">
          <p className="text-xs text-gray-400">Share via</p>
          <div className="flex flex-wrap gap-1.5">
            {/* Native Share (mobile) */}
            {'share' in navigator && (
              <Button
                onClick={handleNativeShare}
                variant="outline"
                size="sm"
                className="gap-2 border-gray-700 hover:bg-gray-800"
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            )}

            {/* Twitter/X */}
            <Button
              onClick={() => handleShare('twitter')}
              variant="outline"
              size="sm"
              className="gap-2 border-gray-700 hover:bg-gray-800"
            >
              <Twitter className="h-4 w-4" />
              Twitter
            </Button>

            {/* WhatsApp */}
            <Button
              onClick={() => handleShare('whatsapp')}
              variant="outline"
              size="sm"
              className="gap-2 border-gray-700 hover:bg-gray-800"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>

            {/* Email */}
            <Button
              onClick={() => handleShare('email')}
              variant="outline"
              size="sm"
              className="gap-2 border-gray-700 hover:bg-gray-800"
            >
              <Mail className="h-4 w-4" />
              Email
            </Button>

            {/* QR Code Toggle */}
            <Button
              onClick={() => setShowQR(!showQR)}
              variant="outline"
              size="sm"
              className={`gap-2 border-gray-700 hover:bg-gray-800 ${showQR ? 'bg-gray-800' : ''}`}
            >
              <QrCode className="h-4 w-4" />
              QR
            </Button>
          </div>
        </div>

        {/* QR Code Section */}
        {showQR && urlData && (
          <div className="bg-white rounded-lg p-4 flex flex-col items-center gap-3">
            {/* Simple QR code using Google Charts API */}
            <img
              src={`https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encodeURIComponent(urlData.vanityUrl)}&choe=UTF-8`}
              alt="Referral QR Code"
              className="w-48 h-48"
            />
            <p className="text-xs text-gray-600 text-center">
              Scan to visit referral link
            </p>
          </div>
        )}

        {/* Copy Text Button */}
        <Button
          onClick={async () => {
            if (!urlData) return;
            await navigator.clipboard.writeText(urlData.copyText);
            await trackShare('clipboard');
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          variant="ghost"
          size="sm"
          className="w-full text-gray-400 hover:text-white hover:bg-gray-800/50 h-8 text-xs"
        >
          <Copy className="h-3 w-3 mr-1.5" />
          Copy Shareable Message
        </Button>
      </div>
    </Card>
  );
}

export default ReferralUrlGenerator;
