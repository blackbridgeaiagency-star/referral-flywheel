// lib/utils/logger.ts

/**
 * Detailed Calculation Logger
 *
 * Use this to log all metric calculations for debugging and verification.
 * Helps ensure data accuracy by showing exactly how each value is computed.
 */

export interface CalculationLog {
  metric: string;
  inputs: Record<string, any>;
  result: any;
  timestamp: string;
}

/**
 * Log a calculation with its inputs and result
 *
 * @example
 * logCalculation('Conversion Rate', {
 *   referredMembers: 10,
 *   totalClicks: 80,
 * }, '12.5%');
 */
export function logCalculation(
  metric: string,
  inputs: Record<string, any>,
  result: any
): void {
  const timestamp = new Date().toISOString();

  console.log(`
═══════════════════════════════════════════════════════════════
📊 CALCULATION: ${metric}
───────────────────────────────────────────────────────────────
TIMESTAMP: ${timestamp}
───────────────────────────────────────────────────────────────
INPUTS:
${formatObject(inputs, 2)}
───────────────────────────────────────────────────────────────
RESULT: ${formatValue(result)}
═══════════════════════════════════════════════════════════════
  `);

  // Store in global log if in development
  if (process.env.NODE_ENV === 'development') {
    if (typeof global !== 'undefined') {
      (global as any).calculationLogs = (global as any).calculationLogs || [];
      (global as any).calculationLogs.push({
        metric,
        inputs,
        result,
        timestamp,
      } as CalculationLog);
    }
  }
}

/**
 * Log a data consistency check
 *
 * @example
 * logConsistencyCheck('Total Referrals Match', {
 *   creatorTotal: 50,
 *   memberSum: 50,
 *   match: true,
 * });
 */
export function logConsistencyCheck(
  checkName: string,
  data: Record<string, any>
): void {
  const passed = data.match === true || data.passed === true;
  const icon = passed ? '✅' : '❌';

  console.log(`
${icon} CONSISTENCY CHECK: ${checkName}
───────────────────────────────────────────────────────────────
${formatObject(data, 2)}
═══════════════════════════════════════════════════════════════
  `);
}

/**
 * Log a commission split verification
 *
 * @example
 * logCommissionSplit({
 *   saleAmount: 49.99,
 *   memberShare: 4.999,
 *   creatorShare: 34.993,
 *   platformShare: 9.998,
 *   total: 49.99,
 *   valid: true,
 * });
 */
export function logCommissionSplit(data: {
  saleAmount: number;
  memberShare: number;
  creatorShare: number;
  platformShare: number;
  total: number;
  valid: boolean;
}): void {
  const icon = data.valid ? '✅' : '❌';

  console.log(`
${icon} COMMISSION SPLIT VERIFICATION
───────────────────────────────────────────────────────────────
Sale Amount:      $${data.saleAmount.toFixed(2)}
───────────────────────────────────────────────────────────────
Member Share:     $${data.memberShare.toFixed(2)} (${((data.memberShare / data.saleAmount) * 100).toFixed(1)}%)
Creator Share:    $${data.creatorShare.toFixed(2)} (${((data.creatorShare / data.saleAmount) * 100).toFixed(1)}%)
Platform Share:   $${data.platformShare.toFixed(2)} (${((data.platformShare / data.saleAmount) * 100).toFixed(1)}%)
───────────────────────────────────────────────────────────────
Total:            $${data.total.toFixed(2)}
Valid:            ${data.valid ? 'YES' : 'NO'}
═══════════════════════════════════════════════════════════════
  `);
}

/**
 * Get all stored calculation logs (development only)
 */
export function getCalculationLogs(): CalculationLog[] {
  if (typeof global !== 'undefined' && (global as any).calculationLogs) {
    return (global as any).calculationLogs;
  }
  return [];
}

/**
 * Clear all stored calculation logs
 */
export function clearCalculationLogs(): void {
  if (typeof global !== 'undefined') {
    (global as any).calculationLogs = [];
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPER FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function formatObject(obj: Record<string, any>, indent: number = 0): string {
  const spaces = ' '.repeat(indent);
  return Object.entries(obj)
    .map(([key, value]) => {
      const formattedValue = formatValue(value);
      return `${spaces}${key}: ${formattedValue}`;
    })
    .join('\n');
}

function formatValue(value: any): string {
  if (typeof value === 'number') {
    // Format numbers with commas and 2 decimals if needed
    if (value % 1 === 0) {
      return value.toLocaleString();
    } else {
      return value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
  } else if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  } else if (value === null || value === undefined) {
    return 'null';
  } else if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}
