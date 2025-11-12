/**
 * Script to replace console.log statements with production-safe logger
 * Run: node scripts/replace-console-logs.js
 */

const fs = require('fs').promises;
const path = require('path');

// Patterns to replace
const replacements = [
  // console.log with emoji prefix
  {
    pattern: /console\.log\(['"`]([📦💳✅💰🔄📊🚀❌⚠️🎯🏆💸📈🔍ℹ️].*?)['"`](.*?)\)/g,
    replacement: (match, message, rest) => {
      // Determine log level based on emoji or content
      if (message.includes('❌') || message.includes('Error')) {
        return `logger.error('${message.substring(2)}'${rest})`;
      } else if (message.includes('⚠️') || message.includes('Warning')) {
        return `logger.warn('${message.substring(2)}'${rest})`;
      } else if (message.includes('📦') || message.includes('Webhook')) {
        return `logger.webhook('${message.substring(2)}'${rest})`;
      } else {
        return `logger.info('${message.substring(2)}'${rest})`;
      }
    }
  },
  // console.log without emoji
  {
    pattern: /console\.log\((?!['"`][📦💳✅💰🔄📊🚀❌⚠️🎯🏆💸📈🔍ℹ️])/g,
    replacement: 'logger.debug('
  },
  // console.warn
  {
    pattern: /console\.warn\(/g,
    replacement: 'logger.warn('
  },
  // console.error
  {
    pattern: /console\.error\(/g,
    replacement: 'logger.error('
  },
];

// Files to skip
const skipPatterns = [
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
  '.env',
  'package.json',
  'tsconfig.json',
  '.md',
  '.txt',
  '.log',
  'replace-console-logs.js', // Don't modify this script
  'logger.ts', // Don't modify the logger itself
];

// Files that need logger import
const needsImport = new Set();

/**
 * Check if file should be processed
 */
function shouldProcessFile(filePath) {
  return !skipPatterns.some(pattern => filePath.includes(pattern)) &&
    (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.js') || filePath.endsWith('.jsx'));
}

/**
 * Add logger import to file if needed
 */
function addLoggerImport(content, filePath) {
  // Check if already has logger import
  if (content.includes("from '../lib/logger'") ||
      content.includes("from '../../lib/logger'") ||
      content.includes("from '../../../lib/logger'") ||
      content.includes("from '../../../../lib/logger'") ||
      content.includes('import logger') ||
      content.includes('import { logger }')) {
    return content;
  }

  // Calculate relative path to logger
  const fileDir = path.dirname(filePath);
  const loggerPath = path.join(process.cwd(), 'lib', 'logger');
  let relativePath = path.relative(fileDir, loggerPath).replace(/\\/g, '/');

  // Ensure it starts with './' or '../'
  if (!relativePath.startsWith('.')) {
    relativePath = './' + relativePath;
  }

  // Add import at the top of the file
  const importStatement = `import logger from '${relativePath}';\n`;

  // Find the right place to add import
  if (content.includes('import ')) {
    // Add after the last import
    const lines = content.split('\n');
    let lastImportIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ')) {
        lastImportIndex = i;
      }
    }

    if (lastImportIndex >= 0) {
      lines.splice(lastImportIndex + 1, 0, importStatement);
      return lines.join('\n');
    }
  }

  // Add at the beginning if no imports found
  return importStatement + '\n' + content;
}

/**
 * Process a single file
 */
async function processFile(filePath) {
  try {
    let content = await fs.readFile(filePath, 'utf8');
    const originalContent = content;
    let modified = false;

    // Check if file has console statements
    if (content.includes('console.')) {
      // Apply replacements
      for (const { pattern, replacement } of replacements) {
        const newContent = content.replace(pattern,
          typeof replacement === 'function' ? replacement : replacement
        );

        if (newContent !== content) {
          content = newContent;
          modified = true;
        }
      }

      // Add logger import if modified
      if (modified) {
        content = addLoggerImport(content, filePath);
        needsImport.add(filePath);
      }
    }

    // Write back if modified
    if (modified) {
      await fs.writeFile(filePath, content, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
      return 1;
    }

    return 0;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return 0;
  }
}

/**
 * Walk directory recursively
 */
async function walkDirectory(dir) {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory() && !skipPatterns.some(p => entry.name.includes(p))) {
      files.push(...await walkDirectory(fullPath));
    } else if (entry.isFile() && shouldProcessFile(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 Scanning for console.log statements...\n');

  const rootDir = process.cwd();
  const files = await walkDirectory(rootDir);

  console.log(`Found ${files.length} files to check\n`);

  let updatedCount = 0;

  for (const file of files) {
    const result = await processFile(file);
    updatedCount += result;
  }

  console.log(`\n✨ Complete! Updated ${updatedCount} files`);

  if (needsImport.size > 0) {
    console.log('\nFiles with new logger imports:');
    for (const file of needsImport) {
      console.log(`  - ${file}`);
    }
  }
}

// Run the script
main().catch(console.error);