// components/notifications/NotificationCenter.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { useWebSocket } from '../../lib/websocket/use-websocket';
import {
  Bell,
  X,
  Check,
  CheckCheck,
  DollarSign,
  Users,
  Trophy,
  Gift,
  TrendingUp,
  MessageSquare,
  Settings,
  Trash2,
  Filter,
  Clock,
  AlertCircle
} from 'lucide-react';
import { NotificationType, NotificationPriority } from '../../lib/websocket/websocket-server';

interface NotificationCenterProps {
  userId: string;
}

export default function NotificationCenter({ userId }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | NotificationType>('all');

  const {
    connected,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = useWebSocket({
    userId,
    autoConnect: true,
  });

  // Filter notifications
  const filteredNotifications = filter === 'all'
    ? notifications
    : notifications.filter(n => n.type === filter);

  // Get icon for notification type
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.COMMISSION_EARNED:
        return <DollarSign className="w-4 h-4" />;
      case NotificationType.NEW_REFERRAL:
        return <Users className="w-4 h-4" />;
      case NotificationType.MILESTONE_REACHED:
        return <Trophy className="w-4 h-4" />;
      case NotificationType.REWARD_AVAILABLE:
        return <Gift className="w-4 h-4" />;
      case NotificationType.RANK_CHANGED:
        return <TrendingUp className="w-4 h-4" />;
      case NotificationType.ACHIEVEMENT_UNLOCKED:
        return <Trophy className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  // Get priority color
  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case NotificationPriority.URGENT:
        return 'text-red-400 bg-red-500/20';
      case NotificationPriority.HIGH:
        return 'text-orange-400 bg-orange-500/20';
      case NotificationPriority.MEDIUM:
        return 'text-yellow-400 bg-yellow-500/20';
      default:
        return 'text-blue-400 bg-blue-500/20';
    }
  };

  // Format time ago
  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return time.toLocaleDateString();
  };

  return (
    <>
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-800 transition"
      >
        <Bell className="w-5 h-5 text-gray-400 hover:text-white" />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* Connection indicator */}
        <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ${
          connected ? 'bg-green-400' : 'bg-gray-400'
        }`} />
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="fixed top-16 right-4 z-50 w-96 max-h-[600px] flex flex-col">
            <Card className="bg-gray-900 border-gray-800 shadow-2xl">
              {/* Header */}
              <div className="p-4 border-b border-gray-800">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Bell className="w-5 h-5 text-purple-400" />
                    Notifications
                    {unreadCount > 0 && (
                      <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition"
                        title="Mark all as read"
                      >
                        <CheckCheck className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex gap-1 overflow-x-auto">
                  <FilterButton
                    active={filter === 'all'}
                    onClick={() => setFilter('all')}
                    label="All"
                  />
                  <FilterButton
                    active={filter === NotificationType.COMMISSION_EARNED}
                    onClick={() => setFilter(NotificationType.COMMISSION_EARNED)}
                    label="Commissions"
                    icon={<DollarSign className="w-3 h-3" />}
                  />
                  <FilterButton
                    active={filter === NotificationType.NEW_REFERRAL}
                    onClick={() => setFilter(NotificationType.NEW_REFERRAL)}
                    label="Referrals"
                    icon={<Users className="w-3 h-3" />}
                  />
                  <FilterButton
                    active={filter === NotificationType.ACHIEVEMENT_UNLOCKED}
                    onClick={() => setFilter(NotificationType.ACHIEVEMENT_UNLOCKED)}
                    label="Achievements"
                    icon={<Trophy className="w-3 h-3" />}
                  />
                </div>
              </div>

              {/* Notifications List */}
              <div className="overflow-y-auto max-h-[400px]">
                {filteredNotifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">No notifications yet</p>
                    <p className="text-gray-500 text-sm mt-1">
                      We'll notify you when something important happens
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-800">
                    {filteredNotifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onRead={() => markAsRead(notification.id)}
                        getIcon={getNotificationIcon}
                        getPriorityColor={getPriorityColor}
                        formatTimeAgo={formatTimeAgo}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="p-3 border-t border-gray-800">
                  <button className="w-full text-center text-sm text-purple-400 hover:text-purple-300 transition">
                    View all notifications
                  </button>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </>
  );
}

// Filter Button Component
function FilterButton({
  active,
  onClick,
  label,
  icon
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
        active
          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// Notification Item Component
function NotificationItem({
  notification,
  onRead,
  getIcon,
  getPriorityColor,
  formatTimeAgo
}: any) {
  return (
    <div
      className={`p-4 hover:bg-gray-800/50 transition cursor-pointer ${
        !notification.read ? 'bg-gray-800/30' : ''
      }`}
      onClick={onRead}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className={`p-2 rounded-lg ${getPriorityColor(notification.priority)}`}>
          {getIcon(notification.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-white font-medium text-sm">
                {notification.title}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                {notification.message}
              </p>
            </div>
            {!notification.read && (
              <span className="w-2 h-2 bg-blue-400 rounded-full mt-1.5" />
            )}
          </div>

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTimeAgo(notification.timestamp)}
            </span>

            {notification.actionUrl && (
              <a
                href={notification.actionUrl}
                className="text-xs text-purple-400 hover:text-purple-300 transition"
                onClick={(e) => e.stopPropagation()}
              >
                {notification.actionText || 'View'}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}