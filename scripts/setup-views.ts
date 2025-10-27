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

const prisma = new PrismaClient();

async function setupViews() {
  console.log('🔧 Setting up materialized views...\n');

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
    console.log('📊 Creating member_stats_mv...');
    await prisma.$executeRawUnsafe(memberStatsSQL);
    console.log('✅ member_stats_mv created successfully\n');

    // Create creator analytics view
    console.log('📈 Creating creator_analytics_mv...');
    await prisma.$executeRawUnsafe(creatorAnalyticsSQL);
    console.log('✅ creator_analytics_mv created successfully\n');

    console.log('🎉 All materialized views created!');
  } catch (error) {
    console.error('❌ Error setting up views:', error);
    throw error;
  }
}

async function refreshViews() {
  console.log('🔄 Refreshing materialized views...\n');

  try {
    const startTime = Date.now();

    // Refresh member stats view
    console.log('📊 Refreshing member_stats_mv...');
    await prisma.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY member_stats_mv`;
    console.log('✅ member_stats_mv refreshed\n');

    // Refresh creator analytics view
    console.log('📈 Refreshing creator_analytics_mv...');
    await prisma.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY creator_analytics_mv`;
    console.log('✅ creator_analytics_mv refreshed\n');

    const duration = Date.now() - startTime;
    console.log(`🎉 All views refreshed in ${duration}ms`);
  } catch (error) {
    console.error('❌ Error refreshing views:', error);
    throw error;
  }
}

async function dropViews() {
  console.log('🗑️  Dropping materialized views...\n');

  try {
    await prisma.$executeRaw`DROP MATERIALIZED VIEW IF EXISTS member_stats_mv CASCADE`;
    console.log('✅ member_stats_mv dropped\n');

    await prisma.$executeRaw`DROP MATERIALIZED VIEW IF EXISTS creator_analytics_mv CASCADE`;
    console.log('✅ creator_analytics_mv dropped\n');

    console.log('🎉 All views dropped successfully');
  } catch (error) {
    console.error('❌ Error dropping views:', error);
    throw error;
  }
}

async function getViewStats() {
  console.log('📊 Materialized view statistics:\n');

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
      console.log('⚠️  No materialized views found. Run with --setup first.');
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

    console.log('\nLast refresh times:');
    console.table(lastRefresh);

  } catch (error) {
    console.error('❌ Error getting view stats:', error);
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
        console.log('🔄 Resetting views (drop + setup)...\n');
        await dropViews();
        console.log('\n');
        await setupViews();
        console.log('\n');
        await refreshViews();
        break;

      default:
        console.log(`
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
    console.error('\n❌ Command failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
