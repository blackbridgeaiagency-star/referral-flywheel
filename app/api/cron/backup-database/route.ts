// app/api/cron/backup-database/route.ts
import { NextResponse } from 'next/server';
import { performBackup } from '@/scripts/backup/database-backup';
import { trackEvent, sendAlert } from '@/lib/monitoring/error-tracking';

/**
 * Database Backup Cron Job
 *
 * Runs daily at 2 AM UTC to create automated backups
 * Configurable through environment variables
 */
export async function GET(request: Request) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET) {
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        console.error('❌ Unauthorized backup cron request');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.log('🔄 Starting automated database backup...');

    // Determine backup type based on day of week/month
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday
    const dayOfMonth = now.getDate();

    let backupType: 'full' | 'incremental' | 'differential' = 'incremental';

    // Full backup on Sundays
    if (dayOfWeek === 0) {
      backupType = 'full';
    }

    // Full backup on 1st of each month
    if (dayOfMonth === 1) {
      backupType = 'full';
    }

    // Perform the backup
    const result = await performBackup({
      type: backupType,
      encrypt: process.env.NODE_ENV === 'production',
      compress: true,
      storage: process.env.NODE_ENV === 'production' ? 's3' : 'local',
      retention: {
        daily: 7,
        weekly: 4,
        monthly: 12,
      },
    });

    // Track successful backup
    trackEvent('database_backup_success', {
      category: 'maintenance',
      type: backupType,
      size: result.size,
      duration: result.duration,
      location: result.location,
    });

    // Send success notification for full backups
    if (backupType === 'full') {
      await sendAlert({
        title: 'Database Backup Complete',
        message: `Full database backup completed successfully (${(result.size / 1024 / 1024).toFixed(2)} MB)`,
        severity: 'info',
        context: result,
      });
    }

    console.log(`✅ Automated backup completed: ${result.location}`);

    return NextResponse.json({
      success: true,
      type: backupType,
      location: result.location,
      size: result.size,
      duration: result.duration,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Automated backup failed:', error);

    // Track and alert on failure
    await sendAlert({
      title: 'Database Backup Failed',
      message: `Database backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'critical',
      context: {
        error: error instanceof Error ? error.stack : error,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json(
      {
        error: 'Backup failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Manual backup trigger endpoint (for admin use)
 */
export async function POST(request: Request) {
  try {
    // Verify admin authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Allow manual backup with custom options
    const result = await performBackup({
      type: body.type || 'full',
      encrypt: body.encrypt !== false,
      compress: body.compress !== false,
      storage: body.storage || 'both',
    });

    return NextResponse.json({
      message: 'Manual backup completed',
      ...result,
    });

  } catch (error) {
    console.error('❌ Manual backup failed:', error);

    return NextResponse.json(
      {
        error: 'Manual backup failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}