/**
 * Date Formatting Utilities
 *
 * Centralized date formatting functions to avoid duplication.
 * Uses date-fns for consistent, reliable formatting.
 */

import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';

/**
 * Parse a date from various input formats
 */
function parseDate(date: Date | string | number): Date {
  if (date instanceof Date) {
    return date;
  }
  if (typeof date === 'number') {
    return new Date(date);
  }
  // Try ISO parsing first, fall back to Date constructor
  const parsed = parseISO(date);
  return isValid(parsed) ? parsed : new Date(date);
}

/**
 * Format date as "Dec 11, 2024"
 */
export function formatDate(date: Date | string | number): string {
  try {
    return format(parseDate(date), 'MMM d, yyyy');
  } catch {
    return 'Invalid date';
  }
}

/**
 * Format date with time as "Dec 11, 2024 3:45 PM"
 */
export function formatDateTime(date: Date | string | number): string {
  try {
    return format(parseDate(date), 'MMM d, yyyy h:mm a');
  } catch {
    return 'Invalid date';
  }
}

/**
 * Format as relative time "2 hours ago", "3 days ago"
 */
export function formatRelative(date: Date | string | number): string {
  try {
    return formatDistanceToNow(parseDate(date), { addSuffix: true });
  } catch {
    return 'Unknown time';
  }
}

/**
 * Format date as short format "12/11/24"
 */
export function formatDateShort(date: Date | string | number): string {
  try {
    return format(parseDate(date), 'MM/dd/yy');
  } catch {
    return 'Invalid date';
  }
}

/**
 * Format date for charts "Dec 11"
 */
export function formatDateChart(date: Date | string | number): string {
  try {
    return format(parseDate(date), 'MMM d');
  } catch {
    return '';
  }
}

/**
 * Format time only "3:45 PM"
 */
export function formatTime(date: Date | string | number): string {
  try {
    return format(parseDate(date), 'h:mm a');
  } catch {
    return 'Invalid time';
  }
}

/**
 * Format as ISO string for APIs
 */
export function formatISO(date: Date | string | number): string {
  try {
    return parseDate(date).toISOString();
  } catch {
    return '';
  }
}

/**
 * Format date for file names "2024-12-11"
 */
export function formatDateFileName(date: Date | string | number): string {
  try {
    return format(parseDate(date), 'yyyy-MM-dd');
  } catch {
    return 'invalid-date';
  }
}

/**
 * Format month and year "December 2024"
 */
export function formatMonthYear(date: Date | string | number): string {
  try {
    return format(parseDate(date), 'MMMM yyyy');
  } catch {
    return 'Invalid date';
  }
}

/**
 * Get relative time description without "ago" suffix
 * Useful for: "2 hours", "3 days"
 */
export function formatDuration(date: Date | string | number): string {
  try {
    return formatDistanceToNow(parseDate(date));
  } catch {
    return 'Unknown';
  }
}

/**
 * Check if a date is valid
 */
export function isValidDate(date: unknown): boolean {
  if (!date) return false;
  try {
    const parsed = date instanceof Date ? date : new Date(date as string | number);
    return isValid(parsed);
  } catch {
    return false;
  }
}

/**
 * Constants for date calculations
 */
export const DATE_CONSTANTS = {
  MS_PER_SECOND: 1000,
  MS_PER_MINUTE: 60 * 1000,
  MS_PER_HOUR: 60 * 60 * 1000,
  MS_PER_DAY: 24 * 60 * 60 * 1000,
  MS_PER_WEEK: 7 * 24 * 60 * 60 * 1000,
  DAYS_PER_MONTH: 30,
  DAYS_PER_YEAR: 365,
} as const;
