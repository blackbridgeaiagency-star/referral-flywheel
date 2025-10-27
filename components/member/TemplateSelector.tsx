'use client';

/**
 * Template Selector Component
 * Browse and use pre-written message templates for sharing
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  MESSAGE_TEMPLATES,
  fillTemplate,
  getTemplatesByPlatform,
  type MessageTemplate,
} from '../../lib/templates/message-templates';
import { Copy, Check } from 'lucide-react';

interface TemplateSelectorProps {
  referralLink: string;
  memberName: string;
  communityName: string;
  earnings?: number;
  referrals?: number;
}

export function TemplateSelector({
  referralLink,
  memberName,
  communityName,
  earnings = 0,
  referrals = 0,
}: TemplateSelectorProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const platforms = [
    'all',
    'twitter',
    'facebook',
    'linkedin',
    'whatsapp',
    'telegram',
    'discord',
    'slack',
    'reddit',
    'email',
    'sms',
  ];

  const filteredTemplates =
    selectedPlatform === 'all'
      ? MESSAGE_TEMPLATES
      : getTemplatesByPlatform(selectedPlatform as any);

  const handleCopy = async (template: MessageTemplate) => {
    const filled = fillTemplate(template, {
      name: memberName.split(' ')[0], // First name only
      link: referralLink,
      community: communityName,
      earnings: earnings.toFixed(2),
      referrals: referrals.toString(),
    });

    try {
      await navigator.clipboard.writeText(filled);
      setCopiedId(template.id);

      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      casual: 'bg-blue-500/20 text-blue-400',
      professional: 'bg-purple-500/20 text-purple-400',
      excited: 'bg-orange-500/20 text-orange-400',
      testimonial: 'bg-green-500/20 text-green-400',
      urgency: 'bg-red-500/20 text-red-400',
      value: 'bg-yellow-500/20 text-yellow-400',
      'social-proof': 'bg-pink-500/20 text-pink-400',
    };
    return colors[category] || 'bg-gray-500/20 text-gray-400';
  };

  return (
    <div className="space-y-6">
      {/* Platform Filter */}
      <div className="flex flex-wrap gap-2">
        {platforms.map((platform) => (
          <button
            key={platform}
            onClick={() => setSelectedPlatform(platform)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedPlatform === platform
                ? 'bg-purple-600 text-white'
                : 'bg-[#1A1A1A] text-gray-300 hover:bg-[#2A2A2A] border border-[#2A2A2A]'
            }`}
          >
            {platform.charAt(0).toUpperCase() + platform.slice(1)}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTemplates.map((template) => {
          const filled = fillTemplate(template, {
            name: memberName.split(' ')[0],
            link: referralLink,
            community: communityName,
            earnings: earnings.toFixed(2),
            referrals: referrals.toString(),
          });

          return (
            <Card key={template.id} className="bg-[#1A1A1A] border-[#2A2A2A]">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-white text-base">
                      {template.name}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Badge
                        variant="outline"
                        className="text-xs border-[#2A2A2A] text-gray-400"
                      >
                        {template.platform}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-xs border-0 ${getCategoryColor(template.category)}`}
                      >
                        {template.category}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleCopy(template)}
                    className={`${
                      copiedId === template.id
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-purple-600 hover:bg-purple-700'
                    } text-white`}
                  >
                    {copiedId === template.id ? (
                      <>
                        <Check className="w-3 h-3 mr-1" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {template.subject && (
                  <div className="mb-3 pb-3 border-b border-[#2A2A2A]">
                    <p className="text-xs text-gray-500 mb-1">Subject:</p>
                    <p className="text-sm text-gray-300">
                      {fillTemplate(
                        { ...template, message: template.subject },
                        {
                          name: memberName.split(' ')[0],
                          link: referralLink,
                          community: communityName,
                          earnings: earnings.toFixed(2),
                          referrals: referrals.toString(),
                        }
                      )}
                    </p>
                  </div>
                )}
                <div className="bg-[#0F0F0F] rounded-md p-3 border border-[#2A2A2A]">
                  <p className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                    {filled}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">
            No templates found for {selectedPlatform}.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Try selecting a different platform or use "all" to see everything.
          </p>
        </div>
      )}
    </div>
  );
}
