'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Megaphone, Send, CheckCircle, Users, Bell, MessageSquare } from 'lucide-react';

interface CreatorAnnouncementFormProps {
  creatorId: string;
}

// Pre-made announcement templates
const TEMPLATES = [
  {
    id: 'new-prizes',
    name: 'New Competition Prizes',
    title: 'New Prizes Announced!',
    content: `We've updated our referral competition prizes!

Check out the new rewards:
- 1st Place: [Your Prize]
- 2nd Place: [Your Prize]
- 3rd Place: [Your Prize]

The competition resets [weekly/monthly]. Start referring now to climb the leaderboard!

Good luck!`,
  },
  {
    id: 'competition-start',
    name: 'Competition Starting',
    title: 'Referral Competition Starts Now!',
    content: `The referral competition is officially ON!

Here's how to win:
1. Share your unique referral link
2. Get friends to join
3. Climb the leaderboard
4. Win amazing prizes!

Top performers will be announced [at end of week/month].

May the best referrer win!`,
  },
  {
    id: 'leaderboard-update',
    name: 'Leaderboard Update',
    title: 'Leaderboard Update - Check Your Position!',
    content: `Quick update on the referral competition!

The leaderboard is heating up. Here's a snapshot:
- Current leader has [X] referrals
- You might be closer to the top than you think!

Don't miss your chance to win. Keep sharing your link!

Check your position now in your dashboard.`,
  },
  {
    id: 'thank-you',
    name: 'Thank You Message',
    title: 'Thank You for Being Amazing!',
    content: `Just wanted to say THANK YOU!

Your referrals are helping our community grow, and we truly appreciate your support.

Keep up the amazing work - every referral makes a difference!

As a reminder, you earn 10% lifetime commission on everyone you refer. That's passive income for life!`,
  },
  {
    id: 'custom',
    name: 'Custom Message',
    title: '',
    content: '',
  },
];

export function CreatorAnnouncementForm({ creatorId }: CreatorAnnouncementFormProps) {
  const [selectedTemplate, setSelectedTemplate] = useState('custom');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [sendPush, setSendPush] = useState(true);
  const [sendDM, setSendDM] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{ totalMembers: number; pushSent: number; dmSent: number } | null>(null);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = TEMPLATES.find(t => t.id === templateId);
    if (template && templateId !== 'custom') {
      setTitle(template.title);
      setContent(template.content);
    }
  };

  const handleSend = async () => {
    if (!title.trim() || !content.trim()) {
      setError('Please enter both a title and message content.');
      return;
    }

    if (!sendPush && !sendDM) {
      setError('Please select at least one delivery method (Push or DM).');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);
    setResults(null);

    try {
      const response = await fetch('/api/creator/announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId,
          title,
          content,
          sendPush,
          sendDM,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send announcement');
      }

      setSuccess(true);
      setResults(data.results);

      // Reset form after successful send
      setTimeout(() => {
        setTitle('');
        setContent('');
        setSelectedTemplate('custom');
        setSuccess(false);
        setResults(null);
      }, 5000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send announcement');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-500/20 rounded-lg">
          <Megaphone className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Broadcast Announcement</h3>
          <p className="text-gray-400 text-sm">Send a message to all your community members</p>
        </div>
      </div>

      {/* Template Selection */}
      <div className="mb-6">
        <Label className="text-white mb-2 block">Quick Templates</Label>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => handleTemplateChange(template.id)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                selectedTemplate === template.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {template.name}
            </button>
          ))}
        </div>
      </div>

      {/* Title Input */}
      <div className="mb-4">
        <Label htmlFor="announcement-title" className="text-white mb-2 block">
          Announcement Title
        </Label>
        <Input
          id="announcement-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., New Competition Prizes!"
          className="bg-gray-900 border-gray-700 text-white"
        />
      </div>

      {/* Content Textarea */}
      <div className="mb-4">
        <Label htmlFor="announcement-content" className="text-white mb-2 block">
          Message Content
        </Label>
        <Textarea
          id="announcement-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your announcement here..."
          rows={8}
          className="bg-gray-900 border-gray-700 text-white"
        />
        <p className="text-xs text-gray-500 mt-1">
          This message will be sent to all members in your community.
        </p>
      </div>

      {/* Delivery Options */}
      <div className="mb-6">
        <Label className="text-white mb-3 block">Delivery Method</Label>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sendPush}
              onChange={(e) => setSendPush(e.target.checked)}
              className="w-4 h-4 rounded bg-gray-800 border-gray-600 text-purple-600 focus:ring-purple-500"
            />
            <Bell className="w-4 h-4 text-gray-400" />
            <span className="text-gray-300">Push Notification</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sendDM}
              onChange={(e) => setSendDM(e.target.checked)}
              className="w-4 h-4 rounded bg-gray-800 border-gray-600 text-purple-600 focus:ring-purple-500"
            />
            <MessageSquare className="w-4 h-4 text-gray-400" />
            <span className="text-gray-300">Direct Message</span>
          </label>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Push notifications appear as alerts. DMs go directly to each member's inbox.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && results && (
        <div className="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-green-400 font-semibold">Announcement Sent!</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-300">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {results.totalMembers} members
            </span>
            {results.pushSent > 0 && (
              <span className="flex items-center gap-1">
                <Bell className="w-4 h-4" />
                {results.pushSent} push sent
              </span>
            )}
            {results.dmSent > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquare className="w-4 h-4" />
                {results.dmSent} DMs sent
              </span>
            )}
          </div>
        </div>
      )}

      {/* Send Button */}
      <Button
        onClick={handleSend}
        disabled={isLoading || !title.trim() || !content.trim()}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
      >
        {isLoading ? (
          <>
            <span className="animate-spin mr-2">...</span>
            Sending to all members...
          </>
        ) : (
          <>
            <Send className="w-4 h-4 mr-2" />
            Push to All Members
          </>
        )}
      </Button>

      <p className="text-xs text-gray-500 mt-3 text-center">
        This will immediately notify all members in your community.
      </p>
    </div>
  );
}

export default CreatorAnnouncementForm;
