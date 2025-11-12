#!/usr/bin/env tsx
/**
 * Setup and refresh materialized views
 * Run with: npm run db:setup-views
 *
 * This script:
 * 1. Creates materialized views for expensive queries
 * 2. Refreshes existing views with latest data
 * 3. Can be run manually or via cron every 5 minutes
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import logger from '../lib/logger';


const prisma = new PrismaClient();

async function setupViews() {
  logger.info(' Setting up materialized views...\n');

  try {
    // Read SQL files
    const memberStatsSQL = readFileSync(
      join(__dirname, '../lib/db/views/member-stats.sql'),
      'utf-8'
    );
    const creatorAnalyticsSQL = readFileSync(
      join(__dirname, '../lib/db/views/creator-analytics.sql'),
      'utf-8'
    );

    // Create member stats view
    logger.info(' Creating member_stats_mv...');
    await prisma.$executeRawUnsafe(memberStatsSQL);
    logger.info('member_stats_mv created successfully\n');

    // Create creator analytics view
    logger.info(' Creating creator_analytics_mv...');
    await prisma.$executeRawUnsafe(creatorAnalyticsSQL);
    logger.info('creator_analytics_mv created successfully\n');

    logger.info(' All materialized views created!');
  } catch (error) {
    logger.error('❌ Error setting up views:', error);
    throw error;
  }
}

async function refreshViews() {
  logger.info(' Refreshing materialized views...\n');

  try {
    const startTime = Date.now();

    // Refresh member stats view
    logger.info(' Refreshing member_stats_mv...');
    await prisma.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY member_stats_mv`;
    logger.info('member_stats_mv refreshed\n');

    // Refresh creator analytics view
    logger.info(' Refreshing creator_analytics_mv...');
    await prisma.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY creator_analytics_mv`;
    logger.info('creator_analytics_mv refreshed\n');

    const duration = Date.now() - startTime;
    logger.info(' All views refreshed in ${duration}ms');
  } catch (error) {
    logger.error('❌ Error refreshing views:', error);
    throw error;
  }
}

async function dropViews() {
  logger.info('️  Dropping materialized views...\n');

  try {
    await prisma.$executeRaw`DROP MATERIALIZED VIEW IF EXISTS member_stats_mv CASCADE`;
    logger.info('member_stats_mv dropped\n');

    await prisma.$executeRaw`DROP MATERIALIZED VIEW IF EXISTS creator_analytics_mv CASCADE`;
    logger.info('creator_analytics_mv dropped\n');

    logger.info(' All views dropped successfully');
  } catch (error) {
    logger.error('❌ Error dropping views:', error);
    throw error;
  }
}

async function getViewStats() {
  logger.info(' Materialized view statistics:\n');

  try {
    // Get view sizes and row counts
    const stats = await prisma.$queryRaw<Array<{
      schemaname: string;
      matviewname: string;
      size: string;
      rows: bigint;
    }>>`
      SELECT
        schemaname,
        matviewname,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) AS size,
        (SELECT count(*) FROM pg_class WHERE relname = matviewname) as rows
      FROM pg_matviews
      WHERE matviewname IN ('member_stats_mv', 'creator_analytics_mv')
      ORDER BY matviewname;
    `;

    if (stats.length === 0) {
      logger.warn('  No materialized views found. Run with --setup first.');
      return;
    }

    console.table(stats);

    // Get last refresh time (approximate)
    const lastRefresh = await prisma.$queryRaw<Array<{
      viewname: string;
      last_refresh: Date | null;
    }>>`
      SELECT
        matviewname as viewname,
        MAX(pg_stat_get_last_vacuum_time(oid)) as last_refresh
      FROM pg_matviews
      JOIN pg_class ON pg_class.relname = pg_matviews.matviewname
      WHERE matviewname IN ('member_stats_mv', 'creator_analytics_mv')
      GROUP BY matviewname;
    `;

    logger.debug('\nLast refresh times:');
    console.table(lastRefresh);

  } catch (error) {
    logger.error('❌ Error getting view stats:', error);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'refresh';

  try {
    switch (command) {
      case 'setup':
      case '--setup':
        await setupViews();
        break;

      case 'refresh':
      case '--refresh':
        await refreshViews();
        break;

      case 'drop':
      case '--drop':
        await dropViews();
        break;

      case 'stats':
      case '--stats':
        await getViewStats();
        break;

      case 'reset':
      case '--reset':
        logger.info(' Resetting views (drop + setup)...\n');
        await dropViews();
        logger.debug('\n');
        await setupViews();
        logger.debug('\n');
        await refreshViews();
        break;

      default:
        logger.debug(`
Usage: npm run db:views [command]

Commands:
  setup    Create materialized views (first-time setup)
  refresh  Refresh existing views with latest data (default)
  drop     Drop all materialized views
  stats    Show view statistics and last refresh time
  reset    Drop, recreate, and refresh all views

Examples:
  npm run db:views setup     # First-time setup
  npm run db:views           # Refresh views (run via cron every 5 min)
  npm run db:views stats     # Check view health
        `);
        process.exit(1);
    }
  } catch (error) {
    logger.error('\n❌ Command failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
