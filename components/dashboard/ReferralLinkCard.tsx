'use client';

import { useState } from 'react';
import { Copy, Check, Twitter, Share2, Linkedin, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ReferralLinkCardProps {
  code: string;
  url: string;
  memberId: string;
}

export function ReferralLinkCard({ code, url, memberId }: ReferralLinkCardProps) {
  const [copied, setCopied] = useState(false);

  // Helper function to track shares
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
      console.log(`📤 Tracked share: ${platform}`);
    } catch (error) {
      console.error('Failed to track share:', error);
      // Don't block user action if tracking fails
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    // Track share event
    await trackShare('clipboard');
  };

  const shareToTwitter = async () => {
    const text = encodeURIComponent(
      `Just joined an amazing community! Join me and start earning 👇\n${url}`
    );

    // Track share event BEFORE opening window
    await trackShare('twitter');

    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  const shareToLinkedIn = async () => {
    // Track share event
    await trackShare('linkedin');

    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
  };

  const shareToDiscord = async () => {
    // Track share event
    await trackShare('clipboard'); // Discord uses clipboard

    // Copy to clipboard and show Discord tip
    await navigator.clipboard.writeText(url);
    alert('Link copied! Paste it into your Discord server or DM 💬');
  };
  
  return (
    <Card className="bg-gradient-to-br from-purple-600/20 via-purple-900/40 to-pink-900/20 border-2 border-purple-500/50 backdrop-blur shadow-2xl shadow-purple-900/30 animate-in fade-in duration-500">
      <CardContent className="p-8 space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-600/30 border-2 border-purple-500 mb-4 animate-pulse">
            <Share2 className="w-8 h-8 text-purple-300" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">
            💰 Your Referral Link
          </h3>
          <p className="text-gray-300 text-base">
            Share this link and earn <span className="text-green-400 font-bold">10% on every sale, forever</span>
          </p>
        </div>

        {/* Link Display */}
        <div className="flex items-center gap-3 bg-black/50 rounded-xl p-5 border border-purple-500/30 hover:border-purple-500/60 transition-all">
          <code className="flex-1 text-purple-300 font-mono text-base truncate font-semibold">
            {url}
          </code>
          <Button
            onClick={handleCopy}
            variant="ghost"
            size="sm"
            className="shrink-0 hover:bg-purple-600/20"
          >
            {copied ? (
              <Check className="h-5 w-5 text-green-400" />
            ) : (
              <Copy className="h-5 w-5 text-purple-300" />
            )}
          </Button>
        </div>

        {/* Share Buttons */}
        <div className="space-y-3">
          <Button
            onClick={handleCopy}
            size="lg"
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-lg shadow-purple-900/50 hover:shadow-purple-900/70 transition-all"
          >
            <Copy className="h-5 w-5 mr-2" />
            {copied ? 'Copied!' : 'Copy Link'}
          </Button>

          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={shareToTwitter}
              size="sm"
              variant="outline"
              className="border-2 border-blue-500/50 hover:bg-blue-600/20 hover:border-blue-500 text-white"
              title="Share on Twitter"
            >
              <Twitter className="h-4 w-4" />
            </Button>
            <Button
              onClick={shareToLinkedIn}
              size="sm"
              variant="outline"
              className="border-2 border-blue-600/50 hover:bg-blue-700/20 hover:border-blue-600 text-white"
              title="Share on LinkedIn"
            >
              <Linkedin className="h-4 w-4" />
            </Button>
            <Button
              onClick={shareToDiscord}
              size="sm"
              variant="outline"
              className="border-2 border-indigo-500/50 hover:bg-indigo-600/20 hover:border-indigo-500 text-white"
              title="Share on Discord"
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Quick Tip */}
        <div className="bg-purple-900/20 border border-purple-500/20 rounded-lg p-4">
          <p className="text-xs text-purple-200 text-center">
            💡 <span className="font-semibold">Pro Tip:</span> Share in 3 places for best results: Social media, Discord, and your email signature
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
