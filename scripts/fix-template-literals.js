/**
 * Fix template literal issues (single quotes with ${} interpolation)
 */

const fs = require('fs').promises;
const path = require('path');

const filesToFix = [
  'app/api/webhooks/whop/route.ts',
  'app/api/setup/complete/route.ts',
  'app/api/webhooks/whop/install/route.ts',
  'app/api/share/track/route.ts',
  'app/customer/[experienceId]/page.tsx',
  'app/api/cron/weekly-digest/route.ts',
  'app/seller-product/[experienceId]/page.tsx',
];

// Additional files with more template literal issues
const additionalFiles = [
  'app/api/cron/reset-monthly-stats/route.ts',
  'app/api/member/update-code/route.ts',
  'app/api/creator/sync-whop/route.ts',
  'app/api/creator/onboarding/route.ts',
  'app/api/creator/rewards/route.ts',
  'app/api/leaderboard/route.ts',
  'lib/whop/sync-creator.ts',
];

async function fixTemplateLiterals(filePath) {
  try {
    let content = await fs.readFile(filePath, 'utf8');
    let modified = false;

    // Fix template literals with single quotes
    // Pattern: logger.method('...${...}...')
    const pattern = /logger\.(info|warn|error|debug|webhook)\('([^']*?)\$\{([^}]+)\}([^']*?)'\)/g;

    const newContent = content.replace(pattern, (match, method, before, variable, after) => {
      modified = true;
      // Handle nested quotes in the after part
      const cleanAfter = after.replace(/`$/, ''); // Remove trailing backtick if present
      return `logger.${method}(\`${before}\${${variable}}${cleanAfter}\`)`;
    });

    // Fix more complex patterns with multiple interpolations
    const multiPattern = /logger\.(info|warn|error|debug|webhook)\('([^']*?)(\$\{[^}]+\}[^']*?)+'\)/g;

    const finalContent = newContent.replace(multiPattern, (match) => {
      // Replace outer single quotes with backticks
      const withBackticks = match.replace(
        /logger\.(info|warn|error|debug|webhook)\('(.*?)'\)/,
        (m, method, content) => `logger.${method}(\`${content}\`)`
      );

      if (withBackticks !== match) {
        modified = true;
      }

      return withBackticks;
    });

    if (modified) {
      await fs.writeFile(filePath, finalContent, 'utf8');
      console.log(`✅ Fixed: ${filePath}`);
      return 1;
    }

    return 0;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return 0;
  }
}

async function main() {
  console.log('🔍 Fixing template literal issues...\n');

  const allFiles = [...filesToFix, ...additionalFiles];
  let fixedCount = 0;

  for (const file of allFiles) {
    const result = await fixTemplateLiterals(file);
    fixedCount += result;
  }

  // Also look for any remaining files
  const moreFiles = [
    'app/api/cron/monthly-digest/route.ts',
    'app/api/admin/validate-consistency/route.ts',
    'app/api/creator/export/route.ts',
    'lib/whop/api-client.ts',
    'lib/whop/messaging.ts',
  ];

  for (const file of moreFiles) {
    try {
      const result = await fixTemplateLiterals(file);
      fixedCount += result;
    } catch (e) {
      // File might not exist
    }
  }

  console.log(`\n✨ Complete! Fixed ${fixedCount} files`);
}

main().catch(console.error);