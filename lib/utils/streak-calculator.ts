/**
 * Streak Calculator Utilities (F5)
 *
 * UTC-based streak calculations for consistent timezone handling.
 * All date comparisons use UTC midnight boundaries to ensure:
 * - Users in different timezones get consistent behavior
 * - No edge cases around DST transitions
 * - Server timezone doesn't affect calculations
 */

/**
 * Get UTC midnight timestamp for a given date
 *
 * @param date - The date to get midnight for
 * @returns Timestamp in milliseconds for UTC midnight of that date
 */
export function getUtcMidnight(date: Date): number {
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    0, 0, 0, 0
  );
}

/**
 * Get today's UTC midnight timestamp
 *
 * @returns Timestamp in milliseconds for today's UTC midnight
 */
export function getTodayUtcMidnight(): number {
  return getUtcMidnight(new Date());
}

/**
 * Check if this is a new referral day (for incrementing referral count)
 *
 * A new day means the current UTC date is different from the last referral date.
 * This is used to determine if a referral should count towards daily stats.
 *
 * @param lastReferralDate - The date of the last referral, or null if no referrals yet
 * @returns true if today is a new day since the last referral
 *
 * @example
 * if (isNewReferralDay(member.lastReferralDate)) {
 *   // This is a new day - update daily counters
 * }
 */
export function isNewReferralDay(lastReferralDate: Date | null): boolean {
  // No previous referral - definitely a new day
  if (!lastReferralDate) {
    return true;
  }

  const todayMidnight = getTodayUtcMidnight();
  const lastMidnight = getUtcMidnight(new Date(lastReferralDate));

  // Different UTC days
  return todayMidnight > lastMidnight;
}

/**
 * Check if a referral date is the consecutive day after the last referral
 *
 * A consecutive day means exactly 1 UTC day has passed since the last referral.
 * This is used to determine if a streak should continue or reset.
 *
 * @param lastReferralDate - The date of the last referral, or null if no referrals yet
 * @returns true if the last referral was exactly yesterday (consecutive)
 *
 * @example
 * if (isConsecutiveDay(member.lastReferralDate)) {
 *   // Continue the streak
 *   member.currentStreak += 1;
 * } else {
 *   // Streak broken - reset to 1
 *   member.currentStreak = 1;
 * }
 */
export function isConsecutiveDay(lastReferralDate: Date | null): boolean {
  // No previous referral - can't be consecutive
  if (!lastReferralDate) {
    return false;
  }

  const todayMidnight = getTodayUtcMidnight();
  const lastMidnight = getUtcMidnight(new Date(lastReferralDate));

  const oneDayMs = 24 * 60 * 60 * 1000;

  // Exactly 1 day difference (yesterday)
  return (todayMidnight - lastMidnight) === oneDayMs;
}

/**
 * Check if a referral was made today (same UTC day)
 *
 * @param referralDate - The date to check
 * @returns true if the referral was made today (UTC)
 *
 * @example
 * if (isToday(member.lastReferralDate)) {
 *   // Already made a referral today
 * }
 */
export function isToday(referralDate: Date | null): boolean {
  if (!referralDate) {
    return false;
  }

  const todayMidnight = getTodayUtcMidnight();
  const dateMidnight = getUtcMidnight(new Date(referralDate));

  return todayMidnight === dateMidnight;
}

/**
 * Calculate the number of days since the last referral
 *
 * @param lastReferralDate - The date of the last referral, or null if no referrals
 * @returns Number of full UTC days since the last referral, or null if no previous referral
 *
 * @example
 * const daysSince = daysSinceLastReferral(member.lastReferralDate);
 * if (daysSince !== null && daysSince > 1) {
 *   // Streak is broken
 * }
 */
export function daysSinceLastReferral(lastReferralDate: Date | null): number | null {
  if (!lastReferralDate) {
    return null;
  }

  const todayMidnight = getTodayUtcMidnight();
  const lastMidnight = getUtcMidnight(new Date(lastReferralDate));

  const oneDayMs = 24 * 60 * 60 * 1000;

  return Math.floor((todayMidnight - lastMidnight) / oneDayMs);
}

/**
 * Streak update result
 */
export interface StreakUpdateResult {
  /** New current streak value */
  currentStreak: number;
  /** New longest streak value (may be same as current) */
  longestStreak: number;
  /** Whether the streak was continued (vs reset) */
  streakContinued: boolean;
  /** Whether this is a new longest streak record */
  newRecord: boolean;
}

/**
 * Calculate updated streak values when a new referral is made
 *
 * Call this when processing a successful referral to get the new streak values.
 *
 * @param lastReferralDate - The date of the member's last referral
 * @param currentStreak - The member's current streak count
 * @param longestStreak - The member's longest streak record
 * @returns Updated streak values
 *
 * @example
 * const streakUpdate = calculateStreakUpdate(
 *   member.lastReferralDate,
 *   member.currentStreak,
 *   member.longestStreak
 * );
 *
 * await prisma.member.update({
 *   where: { id: member.id },
 *   data: {
 *     currentStreak: streakUpdate.currentStreak,
 *     longestStreak: streakUpdate.longestStreak,
 *     lastReferralDate: new Date(),
 *   },
 * });
 */
export function calculateStreakUpdate(
  lastReferralDate: Date | null,
  currentStreak: number,
  longestStreak: number
): StreakUpdateResult {
  // Already referred today - no streak update needed
  if (isToday(lastReferralDate)) {
    return {
      currentStreak,
      longestStreak,
      streakContinued: true,
      newRecord: false,
    };
  }

  let newCurrentStreak: number;
  let streakContinued: boolean;

  if (isConsecutiveDay(lastReferralDate)) {
    // Yesterday - continue streak
    newCurrentStreak = currentStreak + 1;
    streakContinued = true;
  } else {
    // More than 1 day ago or first referral - reset to 1
    newCurrentStreak = 1;
    streakContinued = false;
  }

  // Check if new record
  const newLongestStreak = Math.max(newCurrentStreak, longestStreak);
  const newRecord = newCurrentStreak > longestStreak;

  return {
    currentStreak: newCurrentStreak,
    longestStreak: newLongestStreak,
    streakContinued,
    newRecord,
  };
}

/**
 * Check if a streak is at risk of breaking (no referral yesterday)
 *
 * Useful for sending reminder notifications.
 *
 * @param lastReferralDate - The date of the last referral
 * @param currentStreak - The current streak count
 * @returns true if the streak will break if no referral is made today
 *
 * @example
 * if (isStreakAtRisk(member.lastReferralDate, member.currentStreak)) {
 *   // Send reminder: "Your X-day streak is at risk!"
 * }
 */
export function isStreakAtRisk(
  lastReferralDate: Date | null,
  currentStreak: number
): boolean {
  // No streak to lose
  if (currentStreak < 2 || !lastReferralDate) {
    return false;
  }

  const daysSince = daysSinceLastReferral(lastReferralDate);

  // If exactly 1 day since last referral, streak is at risk
  // (will break if no referral made today)
  return daysSince === 1;
}

/**
 * Get streak status message for display
 *
 * @param currentStreak - The current streak count
 * @param lastReferralDate - The date of the last referral
 * @returns User-friendly status message
 */
export function getStreakStatusMessage(
  currentStreak: number,
  lastReferralDate: Date | null
): string {
  if (currentStreak === 0 || !lastReferralDate) {
    return 'Make your first referral to start a streak!';
  }

  if (isToday(lastReferralDate)) {
    if (currentStreak === 1) {
      return 'Great start! Refer again tomorrow to build your streak.';
    }
    return `${currentStreak}-day streak! Keep it going tomorrow.`;
  }

  if (isStreakAtRisk(lastReferralDate, currentStreak)) {
    return `Your ${currentStreak}-day streak is at risk! Refer today to continue.`;
  }

  // Streak already broken
  return 'Your streak has reset. Make a referral to start a new one!';
}
