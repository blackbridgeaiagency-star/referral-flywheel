'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Check, Share2, Edit2, X, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface CompactReferralLinkCardProps {
  code: string;
  url: string;
  memberId?: string;
}

export function CompactReferralLinkCard({ code, url, memberId }: CompactReferralLinkCardProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newCode, setNewCode] = useState(code);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to track shares
  const trackShare = async (platform: string) => {
    if (!memberId) return; // Skip if no memberId

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

  const handleCopy = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const currentUrl = url.replace(`/r/${code}`, `/r/${newCode}`);
    await navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    // Track share event
    await trackShare('clipboard');
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentUrl = url.replace(`/r/${code}`, `/r/${newCode}`);
    const shareData = {
      title: 'Join our community',
      text: 'Use my referral link to get started!',
      url: currentUrl
    };

    // Track share event
    const platform = 'share' in navigator ? 'native_share' : 'twitter';
    await trackShare(platform);

    if ('share' in navigator && navigator.share) {
      navigator.share(shareData);
    } else {
      window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(currentUrl)}`, '_blank');
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setError(null);
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(false);
    setNewCode(code);
    setError(null);
  };

  const handleSaveCode = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Validate code format
    const codeRegex = /^[A-Z0-9-]{3,20}$/;
    if (!codeRegex.test(newCode)) {
      setError('Code must be 3-20 characters (letters, numbers, hyphens only)');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/member/update-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, newCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update code');
      }

      setIsEditing(false);
      // Refresh page to get new code
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update code');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card
      onClick={isEditing ? undefined : () => handleCopy()}
      className={`bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border-purple-500/30 backdrop-blur p-4 transition-all duration-150 ${
        isEditing
          ? ''
          : 'cursor-pointer hover:scale-[1.01] active:scale-[0.99] hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/20'
      }`}
    >
      <div className="flex items-center justify-between gap-4 pointer-events-none">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-gray-300">Your Referral Link</h3>
            {copied && !isEditing && (
              <span className="text-xs font-semibold text-green-400 animate-in fade-in slide-in-from-left-2 duration-200">
                ✓ Copied!
              </span>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-2 pointer-events-auto">
              <div className="flex items-center gap-2">
                <span className="text-purple-400 font-mono text-sm">/r/</span>
                <Input
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  onClick={(e) => e.stopPropagation()}
                  className="h-8 bg-gray-900/50 border-purple-500/50 text-purple-400 font-mono text-sm"
                  placeholder="YOUR-CODE"
                  maxLength={20}
                />
              </div>
              {error && (
                <p className="text-xs text-red-400">{error}</p>
              )}
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSaveCode}
                  disabled={isSaving || newCode === code}
                  size="sm"
                  className="h-7 bg-green-600 hover:bg-green-700 text-white text-xs"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  onClick={handleCancelEdit}
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs hover:bg-white/10"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <code className="font-mono text-sm truncate" style={{ color: '#8B5CF6' }}>
                /r/{newCode}
              </code>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs font-semibold text-black">
                Earn 10% Lifetime!
              </span>
            </div>
          )}
        </div>

        {!isEditing && (
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={handleEditClick}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-600/40 hover:bg-purple-600/60 border border-purple-500/30 transition-colors"
              title="Customize code"
            >
              <Edit2 className="h-3.5 w-3.5 text-black" />
            </button>

            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-500/20">
              {copied ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4 text-purple-400" />
              )}
            </div>

            <Button
              onClick={handleShare}
              size="sm"
              variant="ghost"
              className="hover:bg-white/10"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}