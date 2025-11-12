/**
 * Fix import statement issues caused by console.log replacement
 */

const fs = require('fs').promises;
const path = require('path');

const filesToFix = [
  'app/admin/members/page.tsx',
  'app/admin/page.tsx',
  'app/admin/webhook-monitor/page.tsx',
];

async function fixImport(filePath) {
  try {
    let content = await fs.readFile(filePath, 'utf8');

    // Fix the pattern where logger import was inserted inside an import block
    const pattern = /import\s+\{\s*import\s+logger\s+from\s+['"](.*?)['"];?\s*/g;

    content = content.replace(pattern, (match, loggerPath) => {
      return `import logger from '${loggerPath}';\nimport {\n`;
    });

    await fs.writeFile(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${filePath}`);
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
}

async function main() {
  console.log('Fixing import statements...\n');

  for (const file of filesToFix) {
    await fixImport(file);
  }

  console.log('\n✨ Import fixes complete!');
}

main().catch(console.error);