'use client';

import { useState, useEffect } from 'react';

interface WhopUsernameSetupProps {
  memberId: string;
  currentWhopUsername: string | null;
  referralCode: string;
}

export function WhopUsernameSetup({
  memberId,
  currentWhopUsername,
  referralCode,
}: WhopUsernameSetupProps) {
  const [username, setUsername] = useState(currentWhopUsername || '');
  const [isEditing, setIsEditing] = useState(!currentWhopUsername);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleSave = async () => {
    if (!username.trim()) {
      setError('Please enter your Whop username');
      return;
    }

    // Validate username format (alphanumeric and underscores only)
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/member/whop-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, whopUsername: username.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save username');
      }

      setIsEditing(false);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // If already set and not editing, show compact display
  if (currentWhopUsername && !isEditing) {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-green-400">Whop Username Connected:</span>
            <span className="font-mono font-bold text-white">@{currentWhopUsername}</span>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Edit
          </button>
        </div>
        <p className="text-sm text-gray-400 mt-2">
          Your referral link will credit your Whop account for all sales.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
      <h3 className="text-lg font-bold text-yellow-400 mb-2">
        Verify Your Whop Username
      </h3>
      <p className="text-sm text-gray-300 mb-4">
        We couldn't auto-detect your Whop username. Please enter it to activate your referral link ({referralCode}).
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">@</span>
          <input
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError(null);
            }}
            placeholder="your_whop_username"
            className="w-full bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg px-3 py-2 pl-8 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving || !username.trim()}
          className={`px-6 py-2 rounded-lg font-semibold transition-all ${
            isSaving || !username.trim()
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-yellow-500 text-black hover:bg-yellow-400'
          }`}
        >
          {isSaving ? 'Saving...' : 'Connect'}
        </button>
      </div>

      {error && (
        <p className="text-red-400 text-sm mt-2">{error}</p>
      )}

      {success && (
        <p className="text-green-400 text-sm mt-2">
          Username connected successfully! Your referral link is now active.
        </p>
      )}

      <div className="mt-4 p-3 bg-[#1A1A1A] rounded-lg">
        <p className="text-xs text-gray-400">
          <strong className="text-gray-300">Where to find your Whop username:</strong>
          <br />
          Go to whop.com, click your profile icon, and look for the username shown after the @ symbol.
        </p>
      </div>
    </div>
  );
}
