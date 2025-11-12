/**
 * Comprehensive fix for all import and template string issues
 */

const fs = require('fs').promises;
const path = require('path');
const glob = require('glob');

async function findFilesWithIssues() {
  const patterns = [
    'app/**/*.{tsx,ts}',
    'lib/**/*.{ts,tsx}',
    'components/**/*.{tsx,ts}'
  ];

  const files = [];
  for (const pattern of patterns) {
    const matches = glob.sync(pattern);
    files.push(...matches);
  }

  return files;
}

async function fixFile(filePath) {
  try {
    let content = await fs.readFile(filePath, 'utf8');
    let modified = false;

    // Fix 1: Import inside import block
    const importPattern = /import\s+\{\s*import\s+logger\s+from\s+['"](.*?)['"];?\s*/g;
    if (importPattern.test(content)) {
      content = content.replace(importPattern, (match, loggerPath) => {
        return `import logger from '${loggerPath}';\nimport {\n`;
      });
      modified = true;
    }

    // Fix 2: Broken template literals (using wrong quotes)
    // Look for logger calls with broken template literals
    const brokenTemplatePattern = /logger\.(info|warn|error|debug|webhook)\(['"]([^'"]*)\$\{([^}]*)\}([^'"]*)['"]\)/g;
    if (brokenTemplatePattern.test(content)) {
      content = content.replace(brokenTemplatePattern, (match, method, before, variable, after) => {
        // Convert to backticks for template literals
        return `logger.${method}(\`${before}\${${variable}}${after}\`)`;
      });
      modified = true;
    }

    // Fix 3: Another pattern of broken templates
    const anotherPattern = /logger\.(info|warn|error|debug|webhook)\('\s*([^']*)\$\{/g;
    if (anotherPattern.test(content)) {
      content = content.replace(anotherPattern, (match, method, before) => {
        return `logger.${method}(\`${before}\${`;
      });
      // Also fix the closing
      content = content.replace(/\}([^'`]*)`\)/g, '}$1\`)');
      modified = true;
    }

    if (modified) {
      await fs.writeFile(filePath, content, 'utf8');
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
  console.log('🔍 Scanning for files with import/template issues...\n');

  const files = await findFilesWithIssues();
  console.log(`Found ${files.length} files to check\n`);

  let fixedCount = 0;

  for (const file of files) {
    const result = await fixFile(file);
    fixedCount += result;
  }

  console.log(`\n✨ Complete! Fixed ${fixedCount} files`);
}

main().catch(console.error);