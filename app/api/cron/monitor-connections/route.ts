// app/api/cron/monitor-connections/route.ts
// Automated connection monitoring - can be called by Vercel Cron or external monitoring services

import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db/prisma';
import logger from '../../../../lib/logger';

// Store last alert time to prevent spam
let lastAlertTime: { [key: string]: Date } = {};

export async function GET(request: Request) {
  // Optional: Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get connection statistics
    const activeConnections = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as total
      FROM pg_stat_activity
      WHERE datname = current_database()
    `;

    const dbUrl = process.env.DATABASE_URL || '';
    const connectionLimit = parseInt(dbUrl.match(/connection_limit=(\d+)/)?.[1] || '60');
    const currentConnections = Number(activeConnections[0]?.total || 0);
    const usagePercentage = Math.round((currentConnections / connectionLimit) * 100);

    // Check for issues
    const alerts: any[] = [];

    // Critical: Over 90% usage
    if (usagePercentage >= 90) {
      const alertKey = 'critical_usage';
      if (shouldSendAlert(alertKey, 5)) { // Alert every 5 minutes max
        alerts.push({
          level: 'critical',
          message: `🚨 CRITICAL: Database connections at ${usagePercentage}% (${currentConnections}/${connectionLimit})`,
          action: 'Increase connection_limit immediately to prevent 500 errors',
          metric: {
            current: currentConnections,
            limit: connectionLimit,
            percentage: usagePercentage
          }
        });
        lastAlertTime[alertKey] = new Date();
        logger.error(`Critical connection usage: ${usagePercentage}%`);
      }
    }

    // Warning: Over 70% usage
    else if (usagePercentage >= 70) {
      const alertKey = 'high_usage';
      if (shouldSendAlert(alertKey, 15)) { // Alert every 15 minutes max
        alerts.push({
          level: 'warning',
          message: `⚠️ WARNING: Database connections at ${usagePercentage}% (${currentConnections}/${connectionLimit})`,
          action: 'Monitor closely. Consider increasing connection_limit if this persists.',
          metric: {
            current: currentConnections,
            limit: connectionLimit,
            percentage: usagePercentage
          }
        });
        lastAlertTime[alertKey] = new Date();
        logger.warn(`High connection usage: ${usagePercentage}%`);
      }
    }

    // Check for connection spikes (sudden increase)
    const recentHistory = await prisma.$queryRaw<any[]>`
      SELECT
        date_trunc('minute', query_start) as minute,
        COUNT(DISTINCT pid) as connections
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND query_start > now() - interval '5 minutes'
      GROUP BY minute
      ORDER BY minute DESC
      LIMIT 5
    `;

    if (recentHistory.length >= 2) {
      const current = Number(recentHistory[0]?.connections || 0);
      const previous = Number(recentHistory[1]?.connections || 0);
      const spikePercentage = previous > 0 ? ((current - previous) / previous) * 100 : 0;

      if (spikePercentage > 200) { // 200% increase
        const alertKey = 'connection_spike';
        if (shouldSendAlert(alertKey, 10)) {
          alerts.push({
            level: 'warning',
            message: `📈 Connection spike detected: ${Math.round(spikePercentage)}% increase`,
            action: 'Check for traffic surge or potential connection leak',
            metric: {
              previous,
              current,
              increase: `${Math.round(spikePercentage)}%`
            }
          });
          lastAlertTime[alertKey] = new Date();
        }
      }
    }

    // Check for long-running queries (potential connection hogs)
    const longQueries = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND state != 'idle'
        AND query_start < now() - interval '30 seconds'
    `;

    const longQueryCount = Number(longQueries[0]?.count || 0);
    if (longQueryCount > 5) {
      const alertKey = 'long_queries';
      if (shouldSendAlert(alertKey, 30)) {
        alerts.push({
          level: 'warning',
          message: `⏱️ ${longQueryCount} queries running over 30 seconds`,
          action: 'Investigate and optimize slow queries',
          metric: {
            count: longQueryCount
          }
        });
        lastAlertTime[alertKey] = new Date();
      }
    }

    // Send alerts (in production, integrate with your notification service)
    if (alerts.length > 0) {
      // TODO: Send to Discord, Slack, email, or monitoring service
      // For now, just log them
      for (const alert of alerts) {
        console.log(`[ALERT] ${alert.level.toUpperCase()}: ${alert.message}`);

        // Example: Send to Discord webhook (uncomment and add your webhook URL)
        // await sendDiscordAlert(alert);

        // Example: Send to Slack (uncomment and add your webhook URL)
        // await sendSlackAlert(alert);
      }
    }

    // Store metrics for historical tracking
    const metrics = {
      timestamp: new Date().toISOString(),
      connections: {
        current: currentConnections,
        limit: connectionLimit,
        percentage: usagePercentage
      },
      alerts: alerts.length,
      status: usagePercentage >= 90 ? 'critical' : usagePercentage >= 70 ? 'warning' : 'healthy'
    };

    // Log metrics for monitoring services to pick up
    logger.info('Connection monitor metrics', metrics);

    return NextResponse.json({
      success: true,
      metrics,
      alerts,
      nextCheck: new Date(Date.now() + 60000).toISOString() // Next check in 1 minute
    });

  } catch (error) {
    logger.error('Connection monitoring error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Monitoring failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function to prevent alert spam
function shouldSendAlert(key: string, cooldownMinutes: number): boolean {
  const lastAlert = lastAlertTime[key];
  if (!lastAlert) return true;

  const minutesSinceLastAlert = (Date.now() - lastAlert.getTime()) / 1000 / 60;
  return minutesSinceLastAlert >= cooldownMinutes;
}

// Example: Discord webhook integration
async function sendDiscordAlert(alert: any) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  const color = alert.level === 'critical' ? 0xff0000 : 0xffaa00;

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: alert.message,
          description: alert.action,
          color,
          fields: Object.entries(alert.metric || {}).map(([key, value]) => ({
            name: key.charAt(0).toUpperCase() + key.slice(1),
            value: String(value),
            inline: true
          })),
          timestamp: new Date().toISOString()
        }]
      })
    });
  } catch (error) {
    logger.error('Failed to send Discord alert:', error);
  }
}

// Example: Slack webhook integration
async function sendSlackAlert(alert: any) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: alert.message,
        attachments: [{
          color: alert.level === 'critical' ? 'danger' : 'warning',
          fields: [
            {
              title: 'Action Required',
              value: alert.action,
              short: false
            },
            ...Object.entries(alert.metric || {}).map(([key, value]) => ({
              title: key.charAt(0).toUpperCase() + key.slice(1),
              value: String(value),
              short: true
            }))
          ],
          footer: 'Connection Monitor',
          ts: Math.floor(Date.now() / 1000)
        }]
      })
    });
  } catch (error) {
    logger.error('Failed to send Slack alert:', error);
  }
}