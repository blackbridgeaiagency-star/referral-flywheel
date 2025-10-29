/**
 * Empty States Component Library
 *
 * Provides helpful empty state messages with illustrations
 * and clear calls-to-action
 */

import {
  Users,
  DollarSign,
  TrendingUp,
  Share2,
  Trophy,
  Search,
  Inbox,
  FileText,
  Zap,
} from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Base Empty State Component
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {/* Icon */}
      {icon && (
        <div className="w-20 h-20 rounded-full bg-gray-800/50 flex items-center justify-center mb-6 border border-gray-700">
          {icon}
        </div>
      )}

      {/* Title */}
      <h3 className="text-2xl font-bold text-white mb-3">{title}</h3>

      {/* Description */}
      <p className="text-gray-400 text-base max-w-md mb-8 leading-relaxed">
        {description}
      </p>

      {/* Actions */}
      <div className="flex gap-3">
        {action && (
          <button
            onClick={action.onClick}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold transition-all shadow-lg shadow-purple-600/30"
          >
            {action.label}
          </button>
        )}
        {secondaryAction && (
          <button
            onClick={secondaryAction.onClick}
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
          >
            {secondaryAction.label}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * No Referrals Empty State
 */
export function NoReferralsEmptyState({ onShare }: { onShare?: () => void }) {
  return (
    <EmptyState
      icon={<Users className="w-10 h-10 text-gray-500" />}
      title="No Referrals Yet"
      description="Start sharing your referral link to earn 10% lifetime commission on every member you refer!"
      action={
        onShare
          ? {
              label: 'Share Your Link',
              onClick: onShare,
            }
          : undefined
      }
      secondaryAction={{
        label: 'Learn How It Works',
        onClick: () => window.open('/docs/referrals', '_blank'),
      }}
    />
  );
}

/**
 * No Earnings Empty State
 */
export function NoEarningsEmptyState({ onShare }: { onShare?: () => void }) {
  return (
    <EmptyState
      icon={<DollarSign className="w-10 h-10 text-gray-500" />}
      title="No Earnings Yet"
      description="Your referrals haven't made any payments yet. Earnings will appear here once they subscribe!"
      action={
        onShare
          ? {
              label: 'Invite More People',
              onClick: onShare,
            }
          : undefined
      }
    />
  );
}

/**
 * No Members Empty State (for creator dashboard)
 */
export function NoMembersEmptyState() {
  return (
    <EmptyState
      icon={<Inbox className="w-10 h-10 text-gray-500" />}
      title="No Members Yet"
      description="Your community doesn't have any members yet. Share your product to start growing!"
      action={{
        label: 'Share Your Product',
        onClick: () => {
          // Copy product URL or open share dialog
          navigator.clipboard.writeText(window.location.origin);
        },
      }}
    />
  );
}

/**
 * No Top Performers Empty State
 */
export function NoTopPerformersEmptyState() {
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-12">
      <EmptyState
        icon={<Trophy className="w-10 h-10 text-gray-500" />}
        title="No Top Performers Yet"
        description="Once members start referring others, you'll see your top earners and referrers here."
      />
    </div>
  );
}

/**
 * No Communities Found (for discover page)
 */
export function NoCommunitiesEmptyState() {
  return (
    <EmptyState
      icon={<Search className="w-10 h-10 text-gray-500" />}
      title="No Communities Found"
      description="We couldn't find any communities matching your search. Try adjusting your filters or check back later!"
      action={{
        label: 'Clear Filters',
        onClick: () => window.location.reload(),
      }}
    />
  );
}

/**
 * No Data Available (generic)
 */
export function NoDataEmptyState({ title, description }: { title?: string; description?: string }) {
  return (
    <EmptyState
      icon={<FileText className="w-10 h-10 text-gray-500" />}
      title={title || 'No Data Available'}
      description={description || 'There is no data to display at this time.'}
    />
  );
}

/**
 * No Activity Empty State
 */
export function NoActivityEmptyState() {
  return (
    <EmptyState
      icon={<TrendingUp className="w-10 h-10 text-gray-500" />}
      title="No Activity Yet"
      description="Your activity chart will show up here once you start making referrals and earning commissions."
    />
  );
}

/**
 * Coming Soon Empty State
 */
export function ComingSoonEmptyState({ feature }: { feature: string }) {
  return (
    <EmptyState
      icon={<Zap className="w-10 h-10 text-purple-500" />}
      title={`${feature} Coming Soon!`}
      description="We're working hard to bring you this feature. Stay tuned for updates!"
    />
  );
}

/**
 * Error Empty State
 */
export function ErrorEmptyState({ error, onRetry }: { error?: string; onRetry?: () => void }) {
  return (
    <div className="bg-red-900/10 border border-red-500/20 rounded-lg p-12">
      <EmptyState
        icon={
          <div className="text-4xl mb-4">⚠️</div>
        }
        title="Something Went Wrong"
        description={error || 'We encountered an error loading this data. Please try again.'}
        action={
          onRetry
            ? {
                label: 'Try Again',
                onClick: onRetry,
              }
            : undefined
        }
        secondaryAction={{
          label: 'Contact Support',
          onClick: () => window.open('https://github.com/anthropics/claude-code/issues', '_blank'),
        }}
      />
    </div>
  );
}

/**
 * Empty List Item (for use in lists)
 */
export function EmptyListItem({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-12 text-gray-500 text-sm">
      <Inbox className="w-5 h-5 mr-2" />
      {message}
    </div>
  );
}

/**
 * First Time User Experience (FTUE) Empty State
 */
export function FirstTimeUserEmptyState({ userName }: { userName?: string }) {
  return (
    <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/10 border border-purple-500/30 rounded-xl p-12">
      <div className="text-center max-w-2xl mx-auto">
        <div className="text-6xl mb-6">🎉</div>
        <h2 className="text-3xl font-bold text-white mb-4">
          Welcome{userName ? `, ${userName}` : ''}!
        </h2>
        <p className="text-gray-300 text-lg mb-8 leading-relaxed">
          You're all set up! Here's how to get started earning:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#1A1A1A]/50 rounded-lg p-6 border border-gray-800">
            <div className="text-3xl mb-3">📋</div>
            <h3 className="font-semibold text-white mb-2">1. Copy Your Link</h3>
            <p className="text-sm text-gray-400">
              Copy your unique referral link from the card above
            </p>
          </div>

          <div className="bg-[#1A1A1A]/50 rounded-lg p-6 border border-gray-800">
            <div className="text-3xl mb-3">📢</div>
            <h3 className="font-semibold text-white mb-2">2. Share Everywhere</h3>
            <p className="text-sm text-gray-400">
              Post on social media, send to friends, add to your bio
            </p>
          </div>

          <div className="bg-[#1A1A1A]/50 rounded-lg p-6 border border-gray-800">
            <div className="text-3xl mb-3">💰</div>
            <h3 className="font-semibold text-white mb-2">3. Earn Forever</h3>
            <p className="text-sm text-gray-400">
              Get 10% commission every month they stay subscribed
            </p>
          </div>
        </div>

        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
          <p className="text-green-300 text-sm">
            💡 <strong>Pro Tip:</strong> The best time to share is right now! Don't wait - start earning today.
          </p>
        </div>
      </div>
    </div>
  );
}
