#!/usr/bin/env tsx
/**
 * Cache Warming Script
 * Pre-populates cache with frequently accessed data
 *
 * Run with: npm run cache:warm
 *
 * This script:
 * 1. Warms top 100 member dashboards
 * 2. Warms all creator analytics
 * 3. Warms global and community leaderboards
 * 4. Can be run on deploy or via cron
 */

import { getMemberStats, getCreatorAnalytics, getGlobalLeaderboard, getCreatorLeaderboard, getAllCreatorAnalytics } from '../lib/db/queries-optimized';
import { setCache, CACHE_CONFIG } from '../lib/cache';
import { PrismaClient } from '@prisma/client';
import logger from '../lib/logger';


const prisma = new PrismaClient();

interface WarmStats {
  membersWarmed: number;
  creatorsWarmed: number;
  leaderboardsWarmed: number;
  errors: number;
  duration: number;
}

async function warmMemberCaches(limit: number = 100): Promise<number> {
  logger.info(' Warming top ${limit} member caches...');

  try {
    // Get top members by earnings
    const topMembers = await prisma.member.findMany({
      orderBy: { lifetimeEarnings: 'desc' },
      take: limit,
      select: { userId: true },
    });

    let warmed = 0;
    for (const member of topMembers) {
      try {
        const stats = await getMemberStats(member.userId);
        if (stats) {
          await setCache(`member-stats:${member.userId}`, stats, CACHE_CONFIG.SHORT);
          warmed++;
        }
      } catch (error) {
        logger.error(`  ❌ Failed to warm member ${member.userId}:`, error);
      }
    }

    logger.debug(`  ✅ Warmed ${warmed}/${topMembers.length} member caches`);
    return warmed;
  } catch (error) {
    logger.error('❌ Failed to warm member caches:', error);
    return 0;
  }
}

async function warmCreatorCaches(): Promise<number> {
  logger.info(' Warming creator analytics caches...');

  try {
    const creators = await prisma.creator.findMany({
      where: { isActive: true },
      select: { companyId: true },
    });

    let warmed = 0;
    for (const creator of creators) {
      try {
        const analytics = await getCreatorAnalytics(creator.companyId);
        if (analytics) {
          await setCache(`creator-analytics:${creator.companyId}`, analytics, CACHE_CONFIG.LONG);
          warmed++;
        }
      } catch (error) {
        logger.error(`  ❌ Failed to warm creator ${creator.companyId}:`, error);
      }
    }

    logger.debug(`  ✅ Warmed ${warmed}/${creators.length} creator caches`);
    return warmed;
  } catch (error) {
    logger.error('❌ Failed to warm creator caches:', error);
    return 0;
  }
}

async function warmLeaderboardCaches(): Promise<number> {
  logger.info(' Warming leaderboard caches...');

  let warmed = 0;

  try {
    // Warm global leaderboards
    logger.debug('  🌍 Global leaderboards...');
    const globalEarnings = await getGlobalLeaderboard('earnings', 100);
    await setCache('leaderboard:global:earnings:100', globalEarnings, CACHE_CONFIG.MEDIUM);
    warmed++;

    const globalReferrals = await getGlobalLeaderboard('referrals', 100);
    await setCache('leaderboard:global:referrals:100', globalReferrals, CACHE_CONFIG.MEDIUM);
    warmed++;

    // Warm community leaderboards
    logger.debug('  🏘️  Community leaderboards...');
    const creators = await prisma.creator.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    for (const creator of creators) {
      try {
        const types: Array<'earnings' | 'referrals' | 'weekly' | 'monthly'> = ['earnings', 'referrals', 'weekly', 'monthly'];

        for (const type of types) {
          const leaderboard = await getCreatorLeaderboard(creator.id, type, 100);
          await setCache(`leaderboard:${creator.id}:${type}:100`, leaderboard, CACHE_CONFIG.MEDIUM);
          warmed++;
        }
      } catch (error) {
        logger.error(`  ❌ Failed to warm leaderboard for creator ${creator.id}:`, error);
      }
    }

    logger.debug(`  ✅ Warmed ${warmed} leaderboard caches`);
    return warmed;
  } catch (error) {
    logger.error('❌ Failed to warm leaderboard caches:', error);
    return warmed;
  }
}

async function warmAllCaches(): Promise<WarmStats> {
  const startTime = Date.now();

  logger.info(' Starting cache warming process...\n');

  const membersWarmed = await warmMemberCaches(100);
  logger.debug('');

  const creatorsWarmed = await warmCreatorCaches();
  logger.debug('');

  const leaderboardsWarmed = await warmLeaderboardCaches();
  logger.debug('');

  const duration = Date.now() - startTime;

  const stats: WarmStats = {
    membersWarmed,
    creatorsWarmed,
    leaderboardsWarmed,
    errors: 0,
    duration,
  };

  logger.debug('═══════════════════════════════════════');
  logger.info(' Cache Warming Complete!');
  logger.debug('═══════════════════════════════════════');
  logger.debug(`Members warmed:      ${stats.membersWarmed}`);
  logger.debug(`Creators warmed:     ${stats.creatorsWarmed}`);
  logger.debug(`Leaderboards warmed: ${stats.leaderboardsWarmed}`);
  logger.debug(`Total duration:      ${(stats.duration / 1000).toFixed(2)}s`);
  logger.debug('═══════════════════════════════════════\n');

  return stats;
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'all';

  try {
    switch (command) {
      case 'all':
      case '--all':
        await warmAllCaches();
        break;

      case 'members':
      case '--members':
        const limit = parseInt(args[1] || '100');
        await warmMemberCaches(limit);
        break;

      case 'creators':
      case '--creators':
        await warmCreatorCaches();
        break;

      case 'leaderboards':
      case '--leaderboards':
        await warmLeaderboardCaches();
        break;

      default:
        logger.debug(`
Usage: npm run cache:warm [command] [options]

Commands:
  all           Warm all caches (default)
  members [n]   Warm top n member caches (default: 100)
  creators      Warm all creator analytics caches
  leaderboards  Warm all leaderboard caches

Examples:
  npm run cache:warm              # Warm all caches
  npm run cache:warm members 50   # Warm top 50 members only
  npm run cache:warm creators     # Warm creator analytics only
        `);
        process.exit(1);
    }
  } catch (error) {
    logger.error('\n❌ Cache warming failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
