// lib/websocket/use-websocket.ts
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import { NotificationType, NotificationPriority, SocketEvent } from './websocket-server';

interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  data?: any;
  actionUrl?: string;
  actionText?: string;
  icon?: string;
  timestamp: Date;
  read: boolean;
}

interface WebSocketState {
  connected: boolean;
  notifications: Notification[];
  unreadCount: number;
  stats: any;
  leaderboard: any[];
  activity: any[];
}

interface WebSocketOptions {
  userId: string;
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

/**
 * WebSocket Hook
 */
export function useWebSocket(options: WebSocketOptions) {
  const { userId, autoConnect = true, reconnection = true } = options;

  const [state, setState] = useState<WebSocketState>({
    connected: false,
    notifications: [],
    unreadCount: 0,
    stats: null,
    leaderboard: [],
    activity: [],
  });

  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000', {
      transports: ['websocket', 'polling'],
      reconnection,
      reconnectionAttempts: options.reconnectionAttempts || 5,
      reconnectionDelay: options.reconnectionDelay || 1000,
    });

    // Connection events
    socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      setState(prev => ({ ...prev, connected: true }));

      // Join user room
      socket.emit(SocketEvent.JOIN_ROOM, { userId });

      // Request notification history
      socket.emit(SocketEvent.REQUEST_HISTORY, { userId, limit: 20 });

      // Subscribe to updates
      socket.emit(SocketEvent.SUBSCRIBE_UPDATES, {
        types: ['stats', 'leaderboard', 'activity'],
      });
    });

    socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      setState(prev => ({ ...prev, connected: false }));
    });

    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Notification events
    socket.on(SocketEvent.NOTIFICATION, (notification: Notification) => {
      setState(prev => ({
        ...prev,
        notifications: [notification, ...prev.notifications].slice(0, 50),
        unreadCount: prev.unreadCount + 1,
      }));

      // Show browser notification if permitted
      showBrowserNotification(notification);

      // Play notification sound
      playNotificationSound(notification.priority);
    });

    socket.on(SocketEvent.NOTIFICATION_BATCH, (notifications: Notification[]) => {
      setState(prev => ({
        ...prev,
        notifications: [...notifications, ...prev.notifications].slice(0, 50),
        unreadCount: notifications.filter(n => !n.read).length,
      }));
    });

    // Stats update
    socket.on(SocketEvent.STATS_UPDATE, (stats: any) => {
      setState(prev => ({ ...prev, stats }));
    });

    // Leaderboard update
    socket.on(SocketEvent.LEADERBOARD_UPDATE, ({ leaderboard }: { leaderboard: any[] }) => {
      setState(prev => ({ ...prev, leaderboard }));
    });

    // Real-time activity
    socket.on(SocketEvent.REAL_TIME_ACTIVITY, (activity: any) => {
      setState(prev => ({
        ...prev,
        activity: [activity, ...prev.activity].slice(0, 20),
      }));
    });

    // Achievement unlocked
    socket.on(SocketEvent.ACHIEVEMENT_UNLOCKED, (achievement: any) => {
      showAchievementAnimation(achievement);
    });

    // Commission update
    socket.on(SocketEvent.COMMISSION_UPDATE, (commission: any) => {
      showCommissionAnimation(commission);
    });

    // Connection status
    socket.on(SocketEvent.CONNECTION_STATUS, ({ connected }: { connected: boolean }) => {
      setState(prev => ({ ...prev, connected }));
    });

    // Ping/pong for keepalive
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    socketRef.current = socket;
  }, [userId, reconnection, options.reconnectionAttempts, options.reconnectionDelay]);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit(SocketEvent.LEAVE_ROOM, { userId });
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, [userId]);

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback((notificationId: string) => {
    if (!socketRef.current) return;

    socketRef.current.emit(SocketEvent.MARK_READ, { notificationId });

    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, prev.unreadCount - 1),
    }));
  }, []);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(() => {
    if (!socketRef.current) return;

    socketRef.current.emit(SocketEvent.MARK_ALL_READ, { userId });

    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  }, [userId]);

  /**
   * Send custom event
   */
  const sendEvent = useCallback((event: string, data: any) => {
    if (!socketRef.current) return;
    socketRef.current.emit(event, data);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Reconnect on focus
  useEffect(() => {
    const handleFocus = () => {
      if (!socketRef.current?.connected) {
        connect();
      }
    };

    const handleBlur = () => {
      // Optional: disconnect on blur to save resources
      // disconnect();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [connect]);

  return {
    ...state,
    socket: socketRef.current,
    connect,
    disconnect,
    markAsRead,
    markAllAsRead,
    sendEvent,
  };
}

/**
 * Show browser notification
 */
function showBrowserNotification(notification: Notification) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (document.hasFocus()) return; // Don't show if app is focused

  const options: NotificationOptions = {
    body: notification.message,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: notification.id,
    data: notification.data,
  };

  const browserNotif = new Notification(notification.title, options);

  browserNotif.onclick = () => {
    window.focus();
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
    browserNotif.close();
  };

  // Auto-close after 5 seconds
  setTimeout(() => browserNotif.close(), 5000);
}

/**
 * Play notification sound
 */
function playNotificationSound(priority: NotificationPriority) {
  try {
    const audio = new Audio('/sounds/notification.mp3');
    audio.volume = priority === NotificationPriority.URGENT ? 1.0 : 0.5;
    audio.play().catch(console.error);
  } catch (error) {
    console.error('Failed to play notification sound:', error);
  }
}

/**
 * Show achievement animation
 */
function showAchievementAnimation(achievement: any) {
  // Create achievement popup
  const popup = document.createElement('div');
  popup.className = 'achievement-popup';
  popup.innerHTML = `
    <div class="achievement-icon">🏆</div>
    <div class="achievement-content">
      <h3>${achievement.name}</h3>
      <p>${achievement.description}</p>
    </div>
  `;

  // Add styles
  popup.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    gap: 15px;
    animation: slideIn 0.5s ease-out;
    max-width: 350px;
  `;

  document.body.appendChild(popup);

  // Play achievement sound
  try {
    const audio = new Audio('/sounds/achievement.mp3');
    audio.play().catch(console.error);
  } catch (error) {
    console.error('Failed to play achievement sound:', error);
  }

  // Remove after 5 seconds
  setTimeout(() => {
    popup.style.animation = 'slideOut 0.5s ease-out';
    setTimeout(() => popup.remove(), 500);
  }, 5000);
}

/**
 * Show commission animation
 */
function showCommissionAnimation(commission: any) {
  // Create commission popup
  const popup = document.createElement('div');
  popup.className = 'commission-popup';
  popup.innerHTML = `
    <div class="commission-icon">💰</div>
    <div class="commission-amount">+$${commission.memberShare.toFixed(2)}</div>
    <div class="commission-message">Commission Earned!</div>
  `;

  // Add styles
  popup.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    text-align: center;
    animation: bounceIn 0.5s ease-out;
    min-width: 200px;
  `;

  document.body.appendChild(popup);

  // Play cash sound
  try {
    const audio = new Audio('/sounds/cash.mp3');
    audio.play().catch(console.error);
  } catch (error) {
    console.error('Failed to play cash sound:', error);
  }

  // Remove after 4 seconds
  setTimeout(() => {
    popup.style.animation = 'fadeOut 0.5s ease-out';
    setTimeout(() => popup.remove(), 500);
  }, 4000);
}

// Add global styles for animations
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
    @keyframes bounceIn {
      0% { transform: scale(0.3); opacity: 0; }
      50% { transform: scale(1.05); }
      70% { transform: scale(0.9); }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}