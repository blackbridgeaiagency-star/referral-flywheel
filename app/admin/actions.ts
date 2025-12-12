'use server';

/**
 * Admin Server Actions
 *
 * These server actions handle admin API calls securely.
 * The admin token is accessed server-side and never exposed to the client.
 */

import { getAdminHeaders } from '../../lib/utils/admin-auth';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Fetch admin stats
 */
export async function fetchAdminStats(timeRange: string) {
  try {
    const response = await fetch(`${APP_URL}/api/admin/stats?range=${timeRange}`, {
      headers: getAdminHeaders(),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch stats: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch admin stats:', error);
    return null;
  }
}

/**
 * Fetch admin activity
 */
export async function fetchAdminActivity(limit: number = 10) {
  try {
    const response = await fetch(`${APP_URL}/api/admin/activity?limit=${limit}`, {
      headers: getAdminHeaders(),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch activity: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch admin activity:', error);
    return [];
  }
}

/**
 * Fetch webhook stats
 */
export async function fetchWebhookStats(timeRange: string) {
  try {
    const response = await fetch(`${APP_URL}/api/admin/webhook-stats?range=${timeRange}`, {
      headers: getAdminHeaders(),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch webhook stats: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch webhook stats:', error);
    return { stats: null, events: [] };
  }
}

/**
 * Fetch analytics data
 */
export async function fetchAnalytics(period: string) {
  try {
    const response = await fetch(`${APP_URL}/api/admin/analytics/comprehensive?period=${period}`, {
      headers: getAdminHeaders(),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch analytics: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    return null;
  }
}

/**
 * Export analytics report
 */
export async function exportAnalyticsReport(period: string): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const response = await fetch(`${APP_URL}/api/admin/analytics/export?period=${period}`, {
      headers: getAdminHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`);
    }

    // For blob responses, we need to return base64 encoded data
    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    return { success: true, data: base64 };
  } catch (error) {
    console.error('Export failed:', error);
    return { success: false, error: 'Export failed' };
  }
}

/**
 * Fetch members list
 */
export async function fetchMembers(params: {
  page: number;
  limit: number;
  status: string;
  risk: string;
}) {
  try {
    const searchParams = new URLSearchParams({
      page: params.page.toString(),
      limit: params.limit.toString(),
      status: params.status,
      risk: params.risk,
    });

    const response = await fetch(`${APP_URL}/api/admin/members?${searchParams}`, {
      headers: getAdminHeaders(),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch members: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch members:', error);
    return { members: [], totalPages: 1 };
  }
}

/**
 * Export members data
 */
export async function exportMembersData(): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const response = await fetch(`${APP_URL}/api/admin/members/export`, {
      headers: getAdminHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`);
    }

    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    return { success: true, data: base64 };
  } catch (error) {
    console.error('Export failed:', error);
    return { success: false, error: 'Export failed' };
  }
}

/**
 * Update member status (suspend, ban, activate)
 */
export async function updateMemberStatus(memberId: string, action: 'suspend' | 'ban' | 'activate') {
  try {
    const response = await fetch(`${APP_URL}/api/admin/members/${memberId}`, {
      method: 'PATCH',
      headers: {
        ...getAdminHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action }),
    });

    if (!response.ok) {
      throw new Error(`Action failed: ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Member action failed:', error);
    return { success: false, error: 'Action failed' };
  }
}
