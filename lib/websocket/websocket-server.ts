// lib/websocket/websocket-server.ts
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { prisma } from '@/lib/db/prisma';
import { cache } from '@/lib/cache/redis';

/**
 * Notification types
 */
export enum NotificationType {
  COMMISSION_EARNED = 'commission_earned',
  NEW_REFERRAL = 'new_referral',
  MILESTONE_REACHED = 'milestone_reached',
  RANK_CHANGED = 'rank_changed',
  REWARD_AVAILABLE = 'reward_available',
  PAYMENT_RECEIVED = 'payment_received',
  SYSTEM_MESSAGE = 'system_message',
  ACHIEVEMENT_UNLOCKED = 'achievement_unlocked',
}

/**
 * Notification priority
 */
export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Notification interface
 */
export interface Notification {
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

/**
 * WebSocket events
 */
export enum SocketEvent {
  // Client -> Server
  JOIN_ROOM = 'join_room',
  LEAVE_ROOM = 'leave_room',
  MARK_READ = 'mark_read',
  MARK_ALL_READ = 'mark_all_read',
  REQUEST_HISTORY = 'request_history',
  SUBSCRIBE_UPDATES = 'subscribe_updates',
  UNSUBSCRIBE_UPDATES = 'unsubscribe_updates',

  // Server -> Client
  NOTIFICATION = 'notification',
  NOTIFICATION_BATCH = 'notification_batch',
  STATS_UPDATE = 'stats_update',
  LEADERBOARD_UPDATE = 'leaderboard_update',
  COMMISSION_UPDATE = 'commission_update',
  ACHIEVEMENT_UNLOCKED = 'achievement_unlocked',
  REAL_TIME_ACTIVITY = 'real_time_activity',
  CONNECTION_STATUS = 'connection_status',
}

/**
 * WebSocket Server Manager
 */
export class WebSocketServer {
  private io: SocketIOServer | null = null;
  private connectedUsers: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds
  private socketToUser: Map<string, string> = new Map(); // socketId -> userId

  /**
   * Initialize WebSocket server
   */
  initialize(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupEventHandlers();
    this.startHeartbeat();

    console.log('✅ WebSocket server initialized');
  }

  /**
   * Setup socket event handlers
   */
  private setupEventHandlers() {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      console.log(`👤 User connected: ${socket.id}`);

      // Send connection confirmation
      socket.emit(SocketEvent.CONNECTION_STATUS, {
        connected: true,
        socketId: socket.id,
        timestamp: new Date(),
      });

      // Join user's personal room
      socket.on(SocketEvent.JOIN_ROOM, async (data: { userId: string }) => {
        const { userId } = data;

        // Store user connection
        if (!this.connectedUsers.has(userId)) {
          this.connectedUsers.set(userId, new Set());
        }
        this.connectedUsers.get(userId)?.add(socket.id);
        this.socketToUser.set(socket.id, userId);

        // Join rooms
        socket.join(`user:${userId}`);
        socket.join('global'); // Global notifications

        // Get user's creator for community notifications
        const member = await prisma.member.findUnique({
          where: { id: userId },
          select: { creatorId: true },
        });

        if (member?.creatorId) {
          socket.join(`creator:${member.creatorId}`);
        }

        // Send any pending notifications
        await this.sendPendingNotifications(userId, socket.id);

        console.log(`✅ User ${userId} joined room`);
      });

      // Leave room
      socket.on(SocketEvent.LEAVE_ROOM, (data: { userId: string }) => {
        const { userId } = data;
        socket.leave(`user:${userId}`);
        this.connectedUsers.get(userId)?.delete(socket.id);
        console.log(`👋 User ${userId} left room`);
      });

      // Mark notification as read
      socket.on(SocketEvent.MARK_READ, async (data: { notificationId: string }) => {
        await this.markNotificationRead(data.notificationId);
      });

      // Mark all as read
      socket.on(SocketEvent.MARK_ALL_READ, async (data: { userId: string }) => {
        await this.markAllNotificationsRead(data.userId);
      });

      // Request notification history
      socket.on(SocketEvent.REQUEST_HISTORY, async (data: { userId: string; limit?: number }) => {
        const notifications = await this.getNotificationHistory(data.userId, data.limit);
        socket.emit(SocketEvent.NOTIFICATION_BATCH, notifications);
      });

      // Subscribe to real-time updates
      socket.on(SocketEvent.SUBSCRIBE_UPDATES, (data: { types: string[] }) => {
        data.types.forEach(type => socket.join(`update:${type}`));
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        const userId = this.socketToUser.get(socket.id);
        if (userId) {
          this.connectedUsers.get(userId)?.delete(socket.id);
          if (this.connectedUsers.get(userId)?.size === 0) {
            this.connectedUsers.delete(userId);
          }
          this.socketToUser.delete(socket.id);
        }
        console.log(`👋 User disconnected: ${socket.id}`);
      });
    });
  }

  /**
   * Send notification to user(s)
   */
  async sendNotification(
    userId: string | string[],
    notification: Omit<Notification, 'id' | 'timestamp' | 'read'>
  ) {
    if (!this.io) return;

    const notif: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false,
    };

    // Store notification in cache
    await this.storeNotification(notif, userId);

    // Send to user(s)
    const userIds = Array.isArray(userId) ? userId : [userId];

    userIds.forEach(uid => {
      // Send to all connected sockets for this user
      this.io?.to(`user:${uid}`).emit(SocketEvent.NOTIFICATION, notif);

      // Send push notification if user has push enabled
      this.sendPushNotification(uid, notif);
    });

    return notif;
  }

  /**
   * Broadcast notification to all users
   */
  async broadcastNotification(
    notification: Omit<Notification, 'id' | 'timestamp' | 'read'>
  ) {
    if (!this.io) return;

    const notif: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false,
    };

    // Broadcast to all connected users
    this.io.to('global').emit(SocketEvent.NOTIFICATION, notif);

    return notif;
  }

  /**
   * Send stats update to user
   */
  async sendStatsUpdate(userId: string, stats: any) {
    if (!this.io) return;

    this.io.to(`user:${userId}`).emit(SocketEvent.STATS_UPDATE, {
      ...stats,
      timestamp: new Date(),
    });
  }

  /**
   * Send leaderboard update
   */
  async sendLeaderboardUpdate(creatorId?: string) {
    if (!this.io) return;

    const room = creatorId ? `creator:${creatorId}` : 'global';

    // Fetch latest leaderboard data
    const leaderboard = await this.getLatestLeaderboard(creatorId);

    this.io.to(room).emit(SocketEvent.LEADERBOARD_UPDATE, {
      leaderboard,
      timestamp: new Date(),
    });
  }

  /**
   * Send commission update
   */
  async sendCommissionUpdate(memberId: string, commission: any) {
    await this.sendNotification(memberId, {
      type: NotificationType.COMMISSION_EARNED,
      priority: NotificationPriority.HIGH,
      title: 'Commission Earned! 💰',
      message: `You've earned $${commission.memberShare.toFixed(2)} from a referral!`,
      data: commission,
      actionUrl: '/customer',
      actionText: 'View Dashboard',
      icon: '💰',
    });

    // Also send stats update
    const stats = await this.getMemberStats(memberId);
    await this.sendStatsUpdate(memberId, stats);
  }

  /**
   * Send achievement notification
   */
  async sendAchievementNotification(memberId: string, achievement: any) {
    await this.sendNotification(memberId, {
      type: NotificationType.ACHIEVEMENT_UNLOCKED,
      priority: NotificationPriority.MEDIUM,
      title: 'Achievement Unlocked! 🏆',
      message: achievement.description,
      data: achievement,
      actionUrl: '/customer/achievements',
      actionText: 'View Achievements',
      icon: '🏆',
    });

    // Emit special achievement event
    this.io?.to(`user:${memberId}`).emit(SocketEvent.ACHIEVEMENT_UNLOCKED, achievement);
  }

  /**
   * Send real-time activity feed
   */
  async sendActivityUpdate(activity: {
    type: string;
    message: string;
    userId?: string;
    data?: any;
  }) {
    if (!this.io) return;

    this.io.to('global').emit(SocketEvent.REAL_TIME_ACTIVITY, {
      ...activity,
      timestamp: new Date(),
    });
  }

  /**
   * Helper: Store notification
   */
  private async storeNotification(
    notification: Notification,
    userId: string | string[]
  ) {
    const userIds = Array.isArray(userId) ? userId : [userId];

    for (const uid of userIds) {
      const key = `notifications:${uid}`;
      const notifications = await cache.get<Notification[]>(key) || [];

      // Add new notification at the beginning
      notifications.unshift(notification);

      // Keep only last 100 notifications
      if (notifications.length > 100) {
        notifications.pop();
      }

      await cache.set(key, notifications, 86400 * 7); // 7 days TTL
    }
  }

  /**
   * Helper: Get notification history
   */
  private async getNotificationHistory(
    userId: string,
    limit: number = 20
  ): Promise<Notification[]> {
    const key = `notifications:${userId}`;
    const notifications = await cache.get<Notification[]>(key) || [];
    return notifications.slice(0, limit);
  }

  /**
   * Helper: Send pending notifications
   */
  private async sendPendingNotifications(userId: string, socketId: string) {
    const notifications = await this.getNotificationHistory(userId, 10);
    const unread = notifications.filter(n => !n.read);

    if (unread.length > 0) {
      this.io?.to(socketId).emit(SocketEvent.NOTIFICATION_BATCH, unread);
    }
  }

  /**
   * Helper: Mark notification as read
   */
  private async markNotificationRead(notificationId: string) {
    // In production, update in database
    console.log(`Marked notification ${notificationId} as read`);
  }

  /**
   * Helper: Mark all notifications as read
   */
  private async markAllNotificationsRead(userId: string) {
    const key = `notifications:${userId}`;
    const notifications = await cache.get<Notification[]>(key) || [];

    const updatedNotifications = notifications.map(n => ({
      ...n,
      read: true,
    }));

    await cache.set(key, updatedNotifications, 86400 * 7);
  }

  /**
   * Helper: Get latest leaderboard
   */
  private async getLatestLeaderboard(creatorId?: string) {
    const where = creatorId ? { creatorId } : {};

    const members = await prisma.member.findMany({
      where,
      orderBy: { totalReferred: 'desc' },
      take: 10,
      select: {
        id: true,
        username: true,
        referralCode: true,
        totalReferred: true,
        lifetimeEarnings: true,
      },
    });

    return members.map((member, index) => ({
      ...member,
      rank: index + 1,
    }));
  }

  /**
   * Helper: Get member stats
   */
  private async getMemberStats(memberId: string) {
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        lifetimeEarnings: true,
        monthlyEarnings: true,
        totalReferred: true,
        monthlyReferred: true,
        globalEarningsRank: true,
        globalReferralsRank: true,
      },
    });

    return member;
  }

  /**
   * Helper: Send push notification
   */
  private async sendPushNotification(userId: string, notification: Notification) {
    // Check if user has push subscription
    const subscription = await cache.get(`push:${userId}`);

    if (subscription) {
      // Send via web push API
      try {
        await fetch('/api/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            notification: {
              title: notification.title,
              body: notification.message,
              icon: notification.icon,
              data: notification.data,
              tag: notification.id,
            },
          }),
        });
      } catch (error) {
        console.error('Failed to send push notification:', error);
      }
    }
  }

  /**
   * Start heartbeat to keep connections alive
   */
  private startHeartbeat() {
    setInterval(() => {
      if (this.io) {
        this.io.emit('ping', { timestamp: Date.now() });
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  /**
   * Get online users count
   */
  getOnlineUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Get all online users
   */
  getOnlineUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  /**
   * Disconnect user
   */
  disconnectUser(userId: string) {
    const socketIds = this.connectedUsers.get(userId);
    if (socketIds && this.io) {
      socketIds.forEach(socketId => {
        this.io?.sockets.sockets.get(socketId)?.disconnect();
      });
    }
  }
}

// Export singleton instance
export const websocketServer = new WebSocketServer();